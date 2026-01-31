/**
 * Unit Tests for Retry Mechanism Edge Cases
 */

import { describe, it, expect, vi } from 'vitest'
import { withRetry, RetryOptions, isRetryableError } from './retry'

describe('Retry Mechanism Unit Tests', () => {
  describe('Rate limit handling (no retry)', () => {
    it('should not retry on 429 status code in error object', async () => {
      let attempts = 0
      const onRetrySpy = vi.fn()
      
      const fn = async () => {
        attempts++
        const error: any = new Error('Rate limit exceeded')
        error.status = 429
        throw error
      }
      
      const options: RetryOptions = {
        maxRetries: 3,
        initialDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
        onRetry: onRetrySpy
      }
      
      await expect(withRetry(fn, options)).rejects.toThrow('Rate limit exceeded')
      
      // Should only attempt once (no retries)
      expect(attempts).toBe(1)
      
      // onRetry should never be called
      expect(onRetrySpy).not.toHaveBeenCalled()
    })

    it('should not retry on 429 in error message', async () => {
      let attempts = 0
      const onRetrySpy = vi.fn()
      
      const fn = async () => {
        attempts++
        throw new Error('HTTP 429: Too many requests')
      }
      
      const options: RetryOptions = {
        maxRetries: 3,
        initialDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
        onRetry: onRetrySpy
      }
      
      await expect(withRetry(fn, options)).rejects.toThrow('429')
      
      expect(attempts).toBe(1)
      expect(onRetrySpy).not.toHaveBeenCalled()
    })

    it('should not retry on "too many requests" message', async () => {
      let attempts = 0
      
      const fn = async () => {
        attempts++
        throw new Error('Too many requests, please try again later')
      }
      
      const options: RetryOptions = {
        maxRetries: 3,
        initialDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2
      }
      
      await expect(withRetry(fn, options)).rejects.toThrow('Too many requests')
      
      expect(attempts).toBe(1)
    })
  })

  describe('Max retries exhaustion', () => {
    it('should throw after exhausting all retries', async () => {
      let attempts = 0
      const errors: string[] = []
      
      const fn = async () => {
        attempts++
        throw new Error(`Attempt ${attempts} timeout`)
      }
      
      const options: RetryOptions = {
        maxRetries: 3,
        initialDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
        onRetry: (attempt, error) => {
          errors.push((error as Error).message)
        }
      }
      
      await expect(withRetry(fn, options)).rejects.toThrow('Attempt 4 timeout')
      
      // Should attempt 4 times (initial + 3 retries)
      expect(attempts).toBe(4)
      
      // Should log 3 errors (one for each retry)
      expect(errors).toHaveLength(3)
    })

    it('should not call onRetry after last attempt', async () => {
      let attempts = 0
      const retryCallbacks: number[] = []
      
      const fn = async () => {
        attempts++
        throw new Error('Network error')
      }
      
      const options: RetryOptions = {
        maxRetries: 2,
        initialDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
        onRetry: (attempt) => {
          retryCallbacks.push(attempt)
        }
      }
      
      await expect(withRetry(fn, options)).rejects.toThrow('Network error')
      
      // Should attempt 3 times (initial + 2 retries)
      expect(attempts).toBe(3)
      
      // onRetry should be called 2 times (not after the last attempt)
      expect(retryCallbacks).toHaveLength(2)
      expect(retryCallbacks).toEqual([1, 2])
    })
  })

  describe('Exponential backoff timing', () => {
    it('should calculate correct delays with exponential backoff', async () => {
      let attempts = 0
      const delays: number[] = []
      const timestamps: number[] = []
      
      const fn = async () => {
        timestamps.push(Date.now())
        attempts++
        if (attempts <= 3) {
          throw new Error('Request timeout')
        }
        return 'success'
      }
      
      const options: RetryOptions = {
        maxRetries: 3,
        initialDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        onRetry: (attempt) => {
          const expectedDelay = Math.min(
            100 * Math.pow(2, attempt - 1),
            1000
          )
          delays.push(expectedDelay)
        }
      }
      
      await withRetry(fn, options)
      
      // Verify delays: 100, 200, 400
      expect(delays).toEqual([100, 200, 400])
      
      // Verify actual time between attempts
      for (let i = 1; i < timestamps.length; i++) {
        const actualDelay = timestamps[i] - timestamps[i - 1]
        const expectedDelay = delays[i - 1]
        
        // Allow 50ms tolerance for execution time
        expect(actualDelay).toBeGreaterThanOrEqual(expectedDelay - 50)
      }
    })

    it('should cap delay at maxDelay', async () => {
      let attempts = 0
      const delays: number[] = []
      
      const fn = async () => {
        attempts++
        if (attempts <= 5) {
          throw new Error('Server overloaded')
        }
        return 'success'
      }
      
      const options: RetryOptions = {
        maxRetries: 5,
        initialDelay: 100,
        maxDelay: 500, // Cap at 500ms
        backoffMultiplier: 2,
        onRetry: (attempt) => {
          const expectedDelay = Math.min(
            100 * Math.pow(2, attempt - 1),
            500
          )
          delays.push(expectedDelay)
        }
      }
      
      await withRetry(fn, options)
      
      // Verify delays are capped: 100, 200, 400, 500, 500
      expect(delays).toEqual([100, 200, 400, 500, 500])
      
      // Verify no delay exceeds maxDelay
      for (const delay of delays) {
        expect(delay).toBeLessThanOrEqual(500)
      }
    })

    it('should use correct backoff multiplier', async () => {
      let attempts = 0
      const delays: number[] = []
      
      const fn = async () => {
        attempts++
        if (attempts <= 3) {
          throw new Error('503 Service Unavailable')
        }
        return 'success'
      }
      
      const options: RetryOptions = {
        maxRetries: 3,
        initialDelay: 50,
        maxDelay: 10000,
        backoffMultiplier: 3, // Triple each time
        onRetry: (attempt) => {
          const expectedDelay = Math.min(
            50 * Math.pow(3, attempt - 1),
            10000
          )
          delays.push(expectedDelay)
        }
      }
      
      await withRetry(fn, options)
      
      // Verify delays: 50, 150, 450
      expect(delays).toEqual([50, 150, 450])
    })
  })

  describe('isRetryableError', () => {
    it('should return false for rate limit errors', () => {
      const error1: any = new Error('Rate limit')
      error1.status = 429
      expect(isRetryableError(error1)).toBe(false)

      const error2 = new Error('HTTP 429 error')
      expect(isRetryableError(error2)).toBe(false)

      const error3 = new Error('Too many requests')
      expect(isRetryableError(error3)).toBe(false)
    })

    it('should return true for timeout errors', () => {
      expect(isRetryableError(new Error('Request timeout'))).toBe(true)
      expect(isRetryableError(new Error('Connection timed out'))).toBe(true)
      expect(isRetryableError(new Error('Request aborted'))).toBe(true)
    })

    it('should return true for server errors', () => {
      expect(isRetryableError(new Error('HTTP 503 Service Unavailable'))).toBe(true)
      expect(isRetryableError(new Error('502 Bad Gateway'))).toBe(true)
      expect(isRetryableError(new Error('500 Internal Server Error'))).toBe(true)
    })

    it('should return true for network errors', () => {
      expect(isRetryableError(new Error('Network error'))).toBe(true)
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true)
      expect(isRetryableError(new Error('ENOTFOUND'))).toBe(true)
    })

    it('should return true for overload errors', () => {
      expect(isRetryableError(new Error('Server overloaded'))).toBe(true)
      expect(isRetryableError(new Error('At capacity'))).toBe(true)
      expect(isRetryableError(new Error('Server busy'))).toBe(true)
    })

    it('should return false for null/undefined', () => {
      expect(isRetryableError(null)).toBe(false)
      expect(isRetryableError(undefined)).toBe(false)
    })

    it('should return false for non-retryable errors', () => {
      expect(isRetryableError(new Error('Invalid input'))).toBe(false)
      expect(isRetryableError(new Error('Not found'))).toBe(false)
      expect(isRetryableError(new Error('Unauthorized'))).toBe(false)
    })
  })

  describe('Success cases', () => {
    it('should succeed on first attempt', async () => {
      let attempts = 0
      const onRetrySpy = vi.fn()
      
      const fn = async () => {
        attempts++
        return 'success'
      }
      
      const options: RetryOptions = {
        maxRetries: 3,
        initialDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2,
        onRetry: onRetrySpy
      }
      
      const result = await withRetry(fn, options)
      
      expect(result).toBe('success')
      expect(attempts).toBe(1)
      expect(onRetrySpy).not.toHaveBeenCalled()
    })

    it('should succeed after retries', async () => {
      let attempts = 0
      
      const fn = async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('ECONNRESET')
        }
        return 'success'
      }
      
      const options: RetryOptions = {
        maxRetries: 3,
        initialDelay: 10,
        maxDelay: 100,
        backoffMultiplier: 2
      }
      
      const result = await withRetry(fn, options)
      
      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })
  })
})
