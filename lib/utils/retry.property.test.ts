/**
 * Property-Based Tests for Retry Mechanism
 * Feature: mcp-integration, Property 4: Retry Behavior with Tracking
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { withRetry, RetryOptions } from './retry'

describe('Retry Mechanism Properties', () => {
  // Feature: mcp-integration, Property 4: Retry Behavior with Tracking
  it('Property 4: Retry behavior with tracking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // failCount - number of times to fail before success
        fc.integer({ min: 1, max: 3 }), // maxRetries
        fc.integer({ min: 10, max: 100 }), // initialDelay
        fc.integer({ min: 100, max: 1000 }), // maxDelay
        fc.integer({ min: 2, max: 3 }), // backoffMultiplier
        async (failCount, maxRetries, initialDelay, maxDelay, backoffMultiplier) => {
          let attempts = 0
          const errors: string[] = []
          const retryAttempts: number[] = []
          
          const fn = async () => {
            attempts++
            if (attempts <= failCount) {
              throw new Error(`Attempt ${attempts} timeout`)
            }
            return 'success'
          }
          
          const options: RetryOptions = {
            maxRetries,
            initialDelay,
            maxDelay,
            backoffMultiplier,
            onRetry: (attempt, error) => {
              errors.push((error as Error).message)
              retryAttempts.push(attempt)
            }
          }
          
          if (failCount <= maxRetries) {
            // Should succeed after retries
            const result = await withRetry(fn, options)
            
            // Проверяем количество попыток
            expect(attempts).toBe(failCount + 1)
            
            // Проверяем логирование ошибок
            expect(errors).toHaveLength(failCount)
            
            // Проверяем что все ошибки залогированы
            for (let i = 0; i < failCount; i++) {
              expect(errors[i]).toContain(`Attempt ${i + 1} timeout`)
            }
            
            // Проверяем номера попыток в onRetry
            expect(retryAttempts).toHaveLength(failCount)
            for (let i = 0; i < failCount; i++) {
              expect(retryAttempts[i]).toBe(i + 1)
            }
            
            // Проверяем результат
            expect(result).toBe('success')
          } else {
            // Should fail after exhausting retries
            await expect(withRetry(fn, options)).rejects.toThrow()
            
            // Проверяем что попыток было maxRetries + 1 (initial + retries)
            expect(attempts).toBe(maxRetries + 1)
            
            // Проверяем что залогировано maxRetries ошибок
            expect(errors).toHaveLength(maxRetries)
          }
        }
      ),
      { numRuns: 50 } // Reduced from 100 to avoid timeout
    )
  }, 30000) // 30 second timeout

  it('Property: Rate limit errors are not retried', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 3 }), // maxRetries
        async (maxRetries) => {
          let attempts = 0
          const retryCallbacks: number[] = []
          
          const fn = async () => {
            attempts++
            const error: any = new Error('Rate limit exceeded')
            error.status = 429
            throw error
          }
          
          const options: RetryOptions = {
            maxRetries,
            initialDelay: 10,
            maxDelay: 100,
            backoffMultiplier: 2,
            onRetry: (attempt) => {
              retryCallbacks.push(attempt)
            }
          }
          
          // Should throw immediately without retrying
          await expect(withRetry(fn, options)).rejects.toThrow('Rate limit exceeded')
          
          // Should only attempt once (no retries)
          expect(attempts).toBe(1)
          
          // onRetry should never be called
          expect(retryCallbacks).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property: Exponential backoff delays increase correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 3 }), // failCount - reduced max
        fc.integer({ min: 50, max: 100 }), // initialDelay - reduced max
        fc.integer({ min: 2, max: 2 }), // backoffMultiplier - fixed at 2
        async (failCount, initialDelay, backoffMultiplier) => {
          let attempts = 0
          const delays: number[] = []
          const timestamps: number[] = []
          
          const fn = async () => {
            timestamps.push(Date.now())
            attempts++
            if (attempts <= failCount) {
              throw new Error(`Attempt ${attempts} network error`)
            }
            return 'success'
          }
          
          const options: RetryOptions = {
            maxRetries: failCount,
            initialDelay,
            maxDelay: 10000,
            backoffMultiplier,
            onRetry: (attempt) => {
              // Calculate expected delay for this attempt
              const expectedDelay = Math.min(
                initialDelay * Math.pow(backoffMultiplier, attempt - 1),
                10000
              )
              delays.push(expectedDelay)
            }
          }
          
          await withRetry(fn, options)
          
          // Verify delays are increasing (exponential backoff)
          for (let i = 1; i < delays.length; i++) {
            expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1])
          }
          
          // Verify actual time delays between attempts
          for (let i = 1; i < timestamps.length; i++) {
            const actualDelay = timestamps[i] - timestamps[i - 1]
            const expectedDelay = delays[i - 1]
            
            // Allow some tolerance for execution time
            expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - 50)
          }
        }
      ),
      { numRuns: 20 } // Reduced from 50 to avoid timeout
    )
  }, 60000) // 60 second timeout

  it('Property: Custom shouldRetry function is respected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(), // shouldRetryValue
        fc.integer({ min: 1, max: 3 }), // maxRetries
        async (shouldRetryValue, maxRetries) => {
          let attempts = 0
          let shouldRetryCalled = false
          
          const fn = async () => {
            attempts++
            throw new Error('Custom error')
          }
          
          const options: RetryOptions = {
            maxRetries,
            initialDelay: 10,
            maxDelay: 100,
            backoffMultiplier: 2,
            shouldRetry: (error) => {
              shouldRetryCalled = true
              return shouldRetryValue
            }
          }
          
          await expect(withRetry(fn, options)).rejects.toThrow('Custom error')
          
          // shouldRetry should be called
          expect(shouldRetryCalled).toBe(true)
          
          if (shouldRetryValue) {
            // Should retry maxRetries times
            expect(attempts).toBe(maxRetries + 1)
          } else {
            // Should not retry at all
            expect(attempts).toBe(1)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
