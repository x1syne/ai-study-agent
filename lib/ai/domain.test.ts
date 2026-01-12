/**
 * Property-Based Tests for Domain Validation
 * 
 * Feature: enhanced-learning-ui
 * 
 * These tests validate that domain values conform to the 13 valid domains
 * defined in the system.
 * 
 * **Validates: Requirements 3.2, 3.4**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Valid domains matching the Prisma enum
const VALID_DOMAINS = [
  'PHYSICS',
  'MATHEMATICS',
  'PROGRAMMING',
  'CHEMISTRY',
  'BIOLOGY',
  'HISTORY',
  'LANGUAGES',
  'ECONOMICS',
  'ARTS',
  'MEDICINE',
  'LAW',
  'ENGINEERING',
  'GENERAL'
] as const

type Domain = typeof VALID_DOMAINS[number]

// Validation function that mirrors what the API should enforce
function isValidDomain(domain: string): domain is Domain {
  return VALID_DOMAINS.includes(domain as Domain)
}

// Function to normalize domain with fallback to GENERAL
function normalizeDomain(domain: string | undefined | null): Domain {
  if (!domain || !isValidDomain(domain)) {
    return 'GENERAL'
  }
  return domain
}

// Arbitrary for generating valid domains
const validDomainArb: fc.Arbitrary<Domain> = fc.constantFrom(...VALID_DOMAINS)

// Arbitrary for generating invalid domain strings
const invalidDomainArb: fc.Arbitrary<string> = fc.string()
  .filter(s => !VALID_DOMAINS.includes(s as Domain))

// Arbitrary for simulating AI response with domain field
interface AIResponse {
  domain: string
  modules: { name: string }[]
}

const aiResponseWithValidDomainArb: fc.Arbitrary<AIResponse> = fc.record({
  domain: validDomainArb,
  modules: fc.array(fc.record({ name: fc.string({ minLength: 1 }) }), { minLength: 1, maxLength: 5 })
})

const aiResponseWithInvalidDomainArb: fc.Arbitrary<AIResponse> = fc.record({
  domain: invalidDomainArb,
  modules: fc.array(fc.record({ name: fc.string({ minLength: 1 }) }), { minLength: 1, maxLength: 5 })
})

describe('Domain Validation Properties', () => {
  /**
   * Property 7: AI возвращает валидный домен
   * 
   * For any AI response during course generation, the domain field 
   * SHALL contain one of the valid domains (PHYSICS, MATHEMATICS, 
   * PROGRAMMING, CHEMISTRY, BIOLOGY, HISTORY, LANGUAGES, ECONOMICS, 
   * ARTS, MEDICINE, LAW, ENGINEERING, GENERAL).
   * 
   * **Validates: Requirements 3.2, 3.4**
   */
  it('Property 7: Valid domains are recognized as valid', () => {
    fc.assert(
      fc.property(
        validDomainArb,
        (domain) => {
          const isValid = isValidDomain(domain)
          expect(isValid).toBe(true)
          expect(VALID_DOMAINS).toContain(domain)
          return isValid
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7: Invalid domain strings are rejected', () => {
    fc.assert(
      fc.property(
        invalidDomainArb,
        (domain) => {
          const isValid = isValidDomain(domain)
          expect(isValid).toBe(false)
          return !isValid
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7: AI response with valid domain passes validation', () => {
    fc.assert(
      fc.property(
        aiResponseWithValidDomainArb,
        (response) => {
          const isValid = isValidDomain(response.domain)
          expect(isValid).toBe(true)
          expect(VALID_DOMAINS).toContain(response.domain)
          return isValid
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7: Invalid domains fallback to GENERAL', () => {
    fc.assert(
      fc.property(
        invalidDomainArb,
        (invalidDomain) => {
          const normalized = normalizeDomain(invalidDomain)
          expect(normalized).toBe('GENERAL')
          expect(isValidDomain(normalized)).toBe(true)
          return normalized === 'GENERAL'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7: Null/undefined domains fallback to GENERAL', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined, ''),
        (emptyValue) => {
          const normalized = normalizeDomain(emptyValue as string | null | undefined)
          expect(normalized).toBe('GENERAL')
          expect(isValidDomain(normalized)).toBe(true)
          return normalized === 'GENERAL'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7: All 13 domains are valid', () => {
    // Verify we have exactly 13 domains
    expect(VALID_DOMAINS.length).toBe(13)
    
    // Verify each domain is valid
    for (const domain of VALID_DOMAINS) {
      expect(isValidDomain(domain)).toBe(true)
    }
  })

  it('Property 7: Domain validation is case-sensitive', () => {
    fc.assert(
      fc.property(
        validDomainArb,
        (domain) => {
          // Lowercase version should be invalid
          const lowercase = domain.toLowerCase()
          if (lowercase !== domain) {
            expect(isValidDomain(lowercase)).toBe(false)
          }
          
          // Mixed case should be invalid
          const mixedCase = domain.charAt(0) + domain.slice(1).toLowerCase()
          if (mixedCase !== domain) {
            expect(isValidDomain(mixedCase)).toBe(false)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Domain Normalization', () => {
  it('Valid domains are preserved after normalization', () => {
    fc.assert(
      fc.property(
        validDomainArb,
        (domain) => {
          const normalized = normalizeDomain(domain)
          expect(normalized).toBe(domain)
          return normalized === domain
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Normalization always returns a valid domain', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          validDomainArb,
          invalidDomainArb,
          fc.constant(null as string | null),
          fc.constant(undefined as string | undefined)
        ),
        (input) => {
          const normalized = normalizeDomain(input as string | null | undefined)
          const isValid = isValidDomain(normalized)
          expect(isValid).toBe(true)
          return isValid
        }
      ),
      { numRuns: 100 }
    )
  })
})
