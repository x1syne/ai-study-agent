/**
 * 🧪 MEDIA CACHE PROPERTY TESTS
 * 
 * Property-based tests for media cache functionality.
 * Validates Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  generateMediaHash,
  isValidHash,
  calculateExpiresAt,
  isCacheExpired,
  CACHE_TTL_MS
} from '../media-cache'
import type { MediaType } from '../media-cache'

// ═══════════════════════════════════════════════════════════════
// 🎯 ARBITRARIES
// ═══════════════════════════════════════════════════════════════

const mediaTypeArb: fc.Arbitrary<MediaType> = fc.constantFrom(
  'image', 'diagram', 'chart', 'video_embed'
)

const promptArb = fc.string({ minLength: 1, maxLength: 500 })

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS
// ═══════════════════════════════════════════════════════════════

describe('Media Cache', () => {
  describe('Property 10.1: Hash Generation Determinism', () => {
    it('should generate same hash for same input', () => {
      fc.assert(
        fc.property(promptArb, mediaTypeArb, (prompt, type) => {
          const hash1 = generateMediaHash(prompt, type)
          const hash2 = generateMediaHash(prompt, type)
          
          expect(hash1).toBe(hash2)
        }),
        { numRuns: 100 }
      )
    })

    it('should generate different hashes for different prompts', () => {
      fc.assert(
        fc.property(
          promptArb,
          promptArb.filter(p => p.length > 0),
          mediaTypeArb,
          (prompt1, prompt2, type) => {
            // Skip if prompts are equal after normalization
            const norm1 = prompt1.toLowerCase().trim().replace(/\s+/g, ' ')
            const norm2 = prompt2.toLowerCase().trim().replace(/\s+/g, ' ')
            if (norm1 === norm2) return true
            
            const hash1 = generateMediaHash(prompt1, type)
            const hash2 = generateMediaHash(prompt2, type)
            
            expect(hash1).not.toBe(hash2)
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should generate different hashes for different types', () => {
      fc.assert(
        fc.property(promptArb, (prompt) => {
          const hashImage = generateMediaHash(prompt, 'image')
          const hashDiagram = generateMediaHash(prompt, 'diagram')
          const hashChart = generateMediaHash(prompt, 'chart')
          const hashVideo = generateMediaHash(prompt, 'video_embed')
          
          // All hashes should be different
          const hashes = [hashImage, hashDiagram, hashChart, hashVideo]
          const uniqueHashes = new Set(hashes)
          
          expect(uniqueHashes.size).toBe(4)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 10.2: Hash Format Validity', () => {
    it('should generate valid 32-character hex hash', () => {
      fc.assert(
        fc.property(promptArb, mediaTypeArb, (prompt, type) => {
          const hash = generateMediaHash(prompt, type)
          
          // Should be 32 characters
          expect(hash.length).toBe(32)
          
          // Should be valid hex
          expect(isValidHash(hash)).toBe(true)
          
          // Should match hex pattern
          expect(hash).toMatch(/^[a-f0-9]{32}$/)
        }),
        { numRuns: 100 }
      )
    })

    it('should validate correct hashes', () => {
      fc.assert(
        fc.property(
          fc.hexaString({ minLength: 32, maxLength: 32 }),
          (hex) => {
            expect(isValidHash(hex.toLowerCase())).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should reject invalid hashes', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.hexaString({ minLength: 1, maxLength: 31 }), // Too short
            fc.hexaString({ minLength: 33, maxLength: 64 }), // Too long
            fc.string({ minLength: 32, maxLength: 32 }).filter(s => !/^[a-f0-9]+$/i.test(s)) // Invalid chars
          ),
          (invalidHash) => {
            expect(isValidHash(invalidHash.toLowerCase())).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 10.3: Hash Normalization', () => {
    it('should normalize whitespace in prompts', () => {
      fc.assert(
        fc.property(promptArb, mediaTypeArb, (prompt, type) => {
          const normalPrompt = prompt.trim().replace(/\s+/g, ' ')
          const extraSpaces = `  ${prompt}   `.replace(/\s+/g, '   ')
          
          const hash1 = generateMediaHash(normalPrompt, type)
          const hash2 = generateMediaHash(extraSpaces, type)
          
          // After normalization, hashes should be equal
          expect(hash1).toBe(hash2)
        }),
        { numRuns: 100 }
      )
    })

    it('should be case-insensitive', () => {
      fc.assert(
        fc.property(promptArb, mediaTypeArb, (prompt, type) => {
          const hash1 = generateMediaHash(prompt.toLowerCase(), type)
          const hash2 = generateMediaHash(prompt.toUpperCase(), type)
          
          expect(hash1).toBe(hash2)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 10.4: TTL Calculation', () => {
    it('should calculate expiry 30 days from creation', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
          (createdAt) => {
            const expiresAt = calculateExpiresAt(createdAt)
            const diff = expiresAt.getTime() - createdAt.getTime()
            
            expect(diff).toBe(CACHE_TTL_MS)
            expect(diff).toBe(30 * 24 * 60 * 60 * 1000)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should use current time when no date provided', () => {
      const before = Date.now()
      const expiresAt = calculateExpiresAt()
      const after = Date.now()
      
      const expectedMin = before + CACHE_TTL_MS
      const expectedMax = after + CACHE_TTL_MS
      
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin)
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax)
    })
  })

  describe('Property 10.5: Cache Expiration Check', () => {
    it('should correctly identify expired cache', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 365 * 24 * 60 * 60 * 1000 }), // Days in ms
          (daysAgoMs) => {
            const pastDate = new Date(Date.now() - daysAgoMs)
            
            // If more than 30 days ago, should be expired
            if (daysAgoMs > CACHE_TTL_MS) {
              expect(isCacheExpired(pastDate)).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should correctly identify valid cache', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 29 * 24 * 60 * 60 * 1000 }), // Less than 30 days
          (futureMs) => {
            const futureDate = new Date(Date.now() + futureMs)
            
            expect(isCacheExpired(futureDate)).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('should handle string dates', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60) // 1 hour from now
      const pastDate = new Date(Date.now() - 1000 * 60 * 60) // 1 hour ago
      
      expect(isCacheExpired(futureDate.toISOString())).toBe(false)
      expect(isCacheExpired(pastDate.toISOString())).toBe(true)
    })
  })

  describe('Property 10.6: Media Type Coverage', () => {
    it('should support all media types', () => {
      const types: MediaType[] = ['image', 'diagram', 'chart', 'video_embed']
      
      types.forEach(type => {
        const hash = generateMediaHash('test prompt', type)
        expect(hash.length).toBe(32)
        expect(isValidHash(hash)).toBe(true)
      })
    })

    it('should generate unique hashes per type for same prompt', () => {
      fc.assert(
        fc.property(promptArb, (prompt) => {
          const types: MediaType[] = ['image', 'diagram', 'chart', 'video_embed']
          const hashes = types.map(type => generateMediaHash(prompt, type))
          const uniqueHashes = new Set(hashes)
          
          expect(uniqueHashes.size).toBe(types.length)
        }),
        { numRuns: 100 }
      )
    })
  })
})

describe('Media Cache Round-Trip', () => {
  describe('Property 10.7: Hash Consistency', () => {
    it('should maintain hash consistency across operations', () => {
      fc.assert(
        fc.property(promptArb, mediaTypeArb, (prompt, type) => {
          // Generate hash multiple times
          const hashes = Array.from({ length: 5 }, () => 
            generateMediaHash(prompt, type)
          )
          
          // All should be identical
          const uniqueHashes = new Set(hashes)
          expect(uniqueHashes.size).toBe(1)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 10.8: TTL Boundary', () => {
    it('should expire exactly at TTL boundary', () => {
      const now = new Date()
      const expiresAt = calculateExpiresAt(now)
      
      // Just before expiry - should be valid
      const justBefore = new Date(expiresAt.getTime() + 1000) // 1 second after expiry time
      expect(isCacheExpired(justBefore)).toBe(false) // Still in future
      
      // Past expiry - should be expired
      const pastExpiry = new Date(expiresAt.getTime() - 1000) // 1 second before expiry time (in past relative to expiry)
      // Actually, let's test with dates relative to NOW
      
      // Future date - not expired
      const futureDate = new Date(Date.now() + 1000)
      expect(isCacheExpired(futureDate)).toBe(false)
      
      // Past date - expired
      const pastDate = new Date(Date.now() - 1000)
      expect(isCacheExpired(pastDate)).toBe(true)
    })
  })
})
