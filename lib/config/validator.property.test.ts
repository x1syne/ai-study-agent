/**
 * Property-Based Tests for Configuration Validator
 * Feature: mcp-integration, Property 6: Startup Validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { ConfigValidator } from './validator'

describe('ConfigValidator Properties', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  // Feature: mcp-integration, Property 6: Startup Validation
  it('Property 6: Startup validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          GROQ_API_KEY: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
          DATABASE_URL: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined }),
          NEXT_PUBLIC_SUPABASE_URL: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
          NEXT_PUBLIC_SUPABASE_ANON_KEY: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
        }),
        async (envVars) => {
          // Set up environment
          process.env = { ...originalEnv }
          
          if (envVars.GROQ_API_KEY) process.env.GROQ_API_KEY = envVars.GROQ_API_KEY
          else delete process.env.GROQ_API_KEY
          
          if (envVars.DATABASE_URL) process.env.DATABASE_URL = envVars.DATABASE_URL
          else delete process.env.DATABASE_URL
          
          if (envVars.NEXT_PUBLIC_SUPABASE_URL) process.env.NEXT_PUBLIC_SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL
          else delete process.env.NEXT_PUBLIC_SUPABASE_URL
          
          if (envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY) process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
          else delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

          const validator = new ConfigValidator()
          const result = validator.validate()

          // Property 1: Validate all required environment variables
          const requiredKeys = ['GROQ_API_KEY', 'DATABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']
          const missingKeys = requiredKeys.filter(key => !envVars[key as keyof typeof envVars])

          // If any required key is missing, validation should fail
          if (missingKeys.length > 0) {
            expect(result.valid).toBe(false)
            expect(result.errors.length).toBeGreaterThan(0)
            
            // Each missing key should have an error
            for (const key of missingKeys) {
              const hasError = result.errors.some(err => err.includes(key))
              expect(hasError).toBe(true)
            }
          } else {
            // If all required keys are present, validation should pass (no errors)
            expect(result.errors.length).toBe(0)
          }

          // Property 2: Display configuration status in console
          // This should not throw
          expect(() => validator.displayStatus(result)).not.toThrow()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6b: Groq connection test', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
        async (apiKey) => {
          // Set up environment
          process.env = { ...originalEnv }
          
          if (apiKey) {
            process.env.GROQ_API_KEY = apiKey
          } else {
            delete process.env.GROQ_API_KEY
          }

          const validator = new ConfigValidator()
          
          // Property: If no API key, connection test should return false
          if (!apiKey) {
            const result = await validator.testGroqConnection()
            expect(result).toBe(false)
          }
          // Note: We can't test actual API connectivity in property tests
          // as it would require valid API keys and make real network calls
        }
      ),
      { numRuns: 100 }
    )
  })
})
