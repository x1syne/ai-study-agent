// Property-based tests for Search Tool

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { SearchTool, SearchCache, SearchResult } from './search'

// Mock fetch for testing
global.fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
  const urlString = url.toString()
  const urlObj = new URL(urlString)
  const query = urlObj.searchParams.get('q') || ''
  const count = parseInt(urlObj.searchParams.get('count') || '5')

  // Simulate API response
  const mockResults = Array.from({ length: Math.min(count, 5) }, (_, i) => ({
    title: `Result ${i + 1} for ${query}`,
    url: `https://example.com/result-${i + 1}`,
    description: `This is a snippet for result ${i + 1} about ${query}`,
    age: i % 2 === 0 ? '2024-01-15' : undefined
  }))

  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      web: {
        results: mockResults
      }
    })
  } as Response
}

describe('Search Tool Properties', () => {
  let searchTool: SearchTool
  let cache: SearchCache

  beforeEach(() => {
    cache = new SearchCache()
    searchTool = new SearchTool('test-api-key', cache)
  })

  // Feature: mcp-integration, Property 2: Search Result Formatting
  it('Property 2: Search result formatting', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), // query
        fc.integer({ min: 1, max: 10 }), // count
        async (query, count) => {
          // Perform search
          const results = await searchTool.search({ query, count })

          // Property 1: All results should have valid URLs
          for (const result of results) {
            expect(result.url).toBeTruthy()
            expect(result.url).toMatch(/^https?:\/\//)
          }

          // Property 2: Results should be limited to requested count or less
          expect(results.length).toBeLessThanOrEqual(count)
          expect(results.length).toBeLessThanOrEqual(5) // API limit in mock

          // Property 3: All results should have required fields
          for (const result of results) {
            expect(result).toHaveProperty('title')
            expect(result).toHaveProperty('url')
            expect(result).toHaveProperty('snippet')
            expect(typeof result.title).toBe('string')
            expect(typeof result.url).toBe('string')
            expect(typeof result.snippet).toBe('string')
          }

          // Property 4: Title and snippet should not be empty
          for (const result of results) {
            expect(result.title.length).toBeGreaterThan(0)
            expect(result.snippet.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2b: Search results contain source attribution', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), // query
        async (query) => {
          // Perform search
          const results = await searchTool.search({ query, count: 5 })

          // Property: Each result should have a URL that serves as source attribution
          for (const result of results) {
            expect(result.url).toBeTruthy()
            expect(result.url).toMatch(/^https?:\/\/[^\s]+/)
            
            // URL should be a valid source
            expect(result.url).toContain('.')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2c: Search handles various query types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }), // regular string
          fc.constant('React 19 features'), // specific query
          fc.constant('how to use TypeScript'), // question
          fc.constant('Python vs JavaScript'), // comparison
          fc.constant('latest Node.js version') // version query
        ).filter(s => s.trim().length > 0),
        async (query) => {
          // Should not throw for any valid query
          const results = await searchTool.search({ query, count: 3 })
          
          // Property: Should return array (may be empty but should not throw)
          expect(Array.isArray(results)).toBe(true)
          
          // Property: If results exist, they should be properly formatted
          if (results.length > 0) {
            expect(results[0]).toHaveProperty('title')
            expect(results[0]).toHaveProperty('url')
            expect(results[0]).toHaveProperty('snippet')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2d: Empty query throws error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('', '   ', '\t', '\n'), // empty/whitespace queries
        async (emptyQuery) => {
          // Property: Empty queries should throw error
          await expect(
            searchTool.search({ query: emptyQuery })
          ).rejects.toThrow(/cannot be empty/)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 2e: Count parameter limits results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // query
        fc.integer({ min: 1, max: 20 }), // count
        async (query, count) => {
          const results = await searchTool.search({ query, count })
          
          // Property: Results should never exceed requested count
          expect(results.length).toBeLessThanOrEqual(count)
          
          // Property: Results should never exceed API limit (5 in mock)
          expect(results.length).toBeLessThanOrEqual(5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 2f: Published date is optional but valid when present', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // query
        async (query) => {
          const results = await searchTool.search({ query, count: 5 })
          
          // Property: publishedDate is optional
          for (const result of results) {
            if (result.publishedDate !== undefined) {
              // If present, should be a string
              expect(typeof result.publishedDate).toBe('string')
              expect(result.publishedDate.length).toBeGreaterThan(0)
            }
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Search Cache Properties', () => {
  let searchTool: SearchTool
  let cache: SearchCache
  let fetchCallCount: number

  beforeEach(() => {
    fetchCallCount = 0
    
    // Override global fetch to count calls
    global.fetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      fetchCallCount++
      
      const urlString = url.toString()
      const urlObj = new URL(urlString)
      const query = urlObj.searchParams.get('q') || ''
      const count = parseInt(urlObj.searchParams.get('count') || '5')

      // Simulate API response - respect the count parameter
      const mockResults = Array.from({ length: Math.min(count, 5) }, (_, i) => ({
        title: `Result ${i + 1} for ${query}`,
        url: `https://example.com/result-${i + 1}`,
        description: `This is a snippet for result ${i + 1} about ${query}`,
        age: i % 2 === 0 ? '2024-01-15' : undefined
      }))

      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          web: {
            results: mockResults
          }
        })
      } as Response
    }
    
    cache = new SearchCache()
    searchTool = new SearchTool('test-api-key', cache)
  })

  // Feature: mcp-integration, Property 3: Search Caching
  it('Property 3: Search caching within TTL', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // query
        fc.integer({ min: 2, max: 5 }), // number of repeated searches
        async (query, repeatCount) => {
          // Clear cache before each property test iteration
          cache.clear()
          
          // Reset fetch call count
          fetchCallCount = 0
          
          // Perform first search
          const firstResults = await searchTool.search({ query, count: 5 })
          const firstFetchCount = fetchCallCount
          
          // Property 1: First search should make API call
          expect(firstFetchCount).toBe(1)
          
          // Perform repeated searches with same query
          for (let i = 0; i < repeatCount; i++) {
            const cachedResults = await searchTool.search({ query, count: 5 })
            
            // Property 2: Cached results should match first results
            expect(cachedResults).toEqual(firstResults)
          }
          
          // Property 3: No additional API calls should be made (all from cache)
          expect(fetchCallCount).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 3b: Cache isolation per query', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0), // query1
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0), // query2
        async (query1, query2) => {
          // Skip if queries are the same
          if (query1 === query2) return
          
          // Clear cache before each property test iteration
          cache.clear()
          
          // Reset fetch call count
          fetchCallCount = 0
          
          // Search for query1
          const results1 = await searchTool.search({ query: query1, count: 3 })
          
          // Search for query2
          const results2 = await searchTool.search({ query: query2, count: 3 })
          
          // Property 1: Each unique query should make its own API call
          expect(fetchCallCount).toBe(2)
          
          // Property 2: Results should be different (different queries)
          expect(results1).not.toEqual(results2)
          
          // Search for query1 again
          const results1Cached = await searchTool.search({ query: query1, count: 3 })
          
          // Property 3: Second search for query1 should use cache
          expect(fetchCallCount).toBe(2) // Still 2, no new call
          expect(results1Cached).toEqual(results1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 3c: Cache TTL expiration', async () => {
    // Use short TTL for testing
    const shortTTLCache = new SearchCache(100) // 100ms TTL
    const shortTTLTool = new SearchTool('test-api-key', shortTTLCache)
    
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // query
        async (query) => {
          // Reset fetch call count
          fetchCallCount = 0
          
          // First search
          await shortTTLTool.search({ query, count: 3 })
          expect(fetchCallCount).toBe(1)
          
          // Immediate second search (within TTL)
          await shortTTLTool.search({ query, count: 3 })
          expect(fetchCallCount).toBe(1) // Still cached
          
          // Wait for TTL to expire
          await new Promise(resolve => setTimeout(resolve, 150))
          
          // Third search (after TTL)
          await shortTTLTool.search({ query, count: 3 })
          
          // Property: After TTL expires, new API call should be made
          expect(fetchCallCount).toBe(2)
        }
      ),
      { numRuns: 50 }
    )
  }, 30000)

  it('Property 3d: Cache clear removes all entries', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.string({ minLength: 1, maxLength: 30 }).filter(s => s.trim().length > 0),
          { minLength: 1, maxLength: 5 }
        ), // array of queries
        async (queries) => {
          // Reset fetch call count
          fetchCallCount = 0
          
          // Search for all queries
          for (const query of queries) {
            await searchTool.search({ query, count: 3 })
          }
          
          const callsBeforeClear = fetchCallCount
          
          // Property 1: Each unique query should make one API call
          const uniqueQueries = new Set(queries)
          expect(callsBeforeClear).toBe(uniqueQueries.size)
          
          // Clear cache
          cache.clear()
          
          // Property 2: Cache should be empty
          expect(cache.size()).toBe(0)
          
          // Search for first query again
          if (queries.length > 0) {
            await searchTool.search({ query: queries[0], count: 3 })
            
            // Property 3: After clear, new API call should be made
            expect(fetchCallCount).toBe(callsBeforeClear + 1)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 3e: Cache respects count parameter', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0), // query
        fc.integer({ min: 1, max: 5 }), // count1
        fc.integer({ min: 1, max: 5 }), // count2
        async (query, count1, count2) => {
          // Clear cache before each property test iteration
          cache.clear()
          
          // Reset fetch call count
          fetchCallCount = 0
          
          // First search with count1
          const results1 = await searchTool.search({ query, count: count1 })
          expect(fetchCallCount).toBe(1)
          
          // Second search with count2 (same query)
          const results2 = await searchTool.search({ query, count: count2 })
          
          // Property 1: Cache should be used (no new API call)
          expect(fetchCallCount).toBe(1)
          
          // Property 2: Results should be sliced to requested count
          expect(results1.length).toBeLessThanOrEqual(count1)
          expect(results2.length).toBeLessThanOrEqual(count2)
          
          // Property 3: If count2 <= count1 and we have enough results, results2 should be subset of results1
          if (count2 <= count1 && results1.length >= count2 && results1.length > 0) {
            expect(results2).toEqual(results1.slice(0, count2))
          }
          
          // Property 4: Both results should come from same cached data
          if (results1.length > 0 && results2.length > 0) {
            // First result should be the same if both have results
            expect(results2[0]).toEqual(results1[0])
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
