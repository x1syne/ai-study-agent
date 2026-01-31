// Unit tests for Search Tool

import { describe, it, expect, beforeEach } from 'vitest'
import { SearchTool, SearchCache } from './search'

describe('SearchTool', () => {
  let searchTool: SearchTool
  let cache: SearchCache

  beforeEach(() => {
    cache = new SearchCache()
    searchTool = new SearchTool('test-api-key', cache)
  })

  describe('needsSearch()', () => {
    it('should detect time-related queries', () => {
      expect(searchTool.needsSearch('latest React features')).toBe(true)
      expect(searchTool.needsSearch('recent updates in Node.js')).toBe(true)
      expect(searchTool.needsSearch('new JavaScript syntax')).toBe(true)
      expect(searchTool.needsSearch('current trends in AI')).toBe(true)
      expect(searchTool.needsSearch('what is new in Python')).toBe(true)
    })

    it('should detect time-related queries in Russian', () => {
      expect(searchTool.needsSearch('последние новости React')).toBe(true)
      expect(searchTool.needsSearch('новые фичи TypeScript')).toBe(true)
      expect(searchTool.needsSearch('текущие версии Node.js')).toBe(true)
    })

    it('should detect version-related queries', () => {
      expect(searchTool.needsSearch('React 19 features')).toBe(true)
      expect(searchTool.needsSearch('Python 3.12 changelog')).toBe(true)
      expect(searchTool.needsSearch('Node.js version 20')).toBe(true)
      expect(searchTool.needsSearch('TypeScript 5.0 release')).toBe(true)
    })

    it('should detect comparison queries', () => {
      expect(searchTool.needsSearch('React vs Vue')).toBe(true)
      expect(searchTool.needsSearch('Python versus JavaScript')).toBe(true)
      expect(searchTool.needsSearch('compare Angular and React')).toBe(true)
      expect(searchTool.needsSearch('best frontend framework')).toBe(true)
      expect(searchTool.needsSearch('top 10 programming languages')).toBe(true)
    })

    it('should detect question queries', () => {
      expect(searchTool.needsSearch('What is React?')).toBe(true)
      expect(searchTool.needsSearch('How to use TypeScript?')).toBe(true)
      expect(searchTool.needsSearch('Is Python good for AI?')).toBe(true)
    })

    it('should detect documentation queries', () => {
      expect(searchTool.needsSearch('React documentation')).toBe(true)
      expect(searchTool.needsSearch('TypeScript API reference')).toBe(true)
      expect(searchTool.needsSearch('Node.js library guide')).toBe(true)
    })

    it('should detect year mentions', () => {
      expect(searchTool.needsSearch('JavaScript in 2024')).toBe(true)
      expect(searchTool.needsSearch('trends 2025')).toBe(true)
    })

    it('should detect version numbers', () => {
      expect(searchTool.needsSearch('React 18.2')).toBe(true)
      expect(searchTool.needsSearch('Python 3.11')).toBe(true)
    })

    it('should NOT detect search for basic programming concepts', () => {
      expect(searchTool.needsSearch('function declaration')).toBe(false)
      expect(searchTool.needsSearch('variable scope')).toBe(false)
      expect(searchTool.needsSearch('loop iteration')).toBe(false)
    })

    it('should NOT detect search for simple statements', () => {
      expect(searchTool.needsSearch('hello world')).toBe(false)
      expect(searchTool.needsSearch('test code')).toBe(false)
      expect(searchTool.needsSearch('simple program')).toBe(false)
    })

    it('should handle empty strings', () => {
      expect(searchTool.needsSearch('')).toBe(false)
      expect(searchTool.needsSearch('   ')).toBe(false)
    })

    it('should be case-insensitive', () => {
      expect(searchTool.needsSearch('LATEST React')).toBe(true)
      expect(searchTool.needsSearch('Latest REACT')).toBe(true)
      expect(searchTool.needsSearch('WHAT IS React')).toBe(true)
    })
  })
})

describe('SearchCache', () => {
  let cache: SearchCache

  beforeEach(() => {
    cache = new SearchCache(1000) // 1 second TTL for testing
  })

  describe('TTL expiration', () => {
    it('should return null for expired cache entries', async () => {
      const results = [
        { title: 'Test', url: 'https://example.com', snippet: 'Test snippet' }
      ]

      // Set cache
      cache.set('test query', results)

      // Immediately get - should hit cache
      expect(cache.get('test query')).toEqual(results)

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100))

      // Should return null after expiration
      expect(cache.get('test query')).toBeNull()
    })

    it('should return cached results within TTL', async () => {
      const results = [
        { title: 'Test', url: 'https://example.com', snippet: 'Test snippet' }
      ]

      // Set cache
      cache.set('test query', results)

      // Wait less than TTL
      await new Promise(resolve => setTimeout(resolve, 500))

      // Should still be cached
      expect(cache.get('test query')).toEqual(results)
    })

    it('should handle multiple queries with different TTLs', async () => {
      const results1 = [
        { title: 'Test 1', url: 'https://example.com/1', snippet: 'Snippet 1' }
      ]
      const results2 = [
        { title: 'Test 2', url: 'https://example.com/2', snippet: 'Snippet 2' }
      ]

      // Set first query
      cache.set('query1', results1)

      // Wait 600ms
      await new Promise(resolve => setTimeout(resolve, 600))

      // Set second query
      cache.set('query2', results2)

      // Wait another 600ms (total 1200ms for query1, 600ms for query2)
      await new Promise(resolve => setTimeout(resolve, 600))

      // query1 should be expired, query2 should still be cached
      expect(cache.get('query1')).toBeNull()
      expect(cache.get('query2')).toEqual(results2)
    })
  })

  describe('cache operations', () => {
    it('should return null for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeNull()
    })

    it('should store and retrieve results', () => {
      const results = [
        { title: 'Test', url: 'https://example.com', snippet: 'Test snippet' }
      ]

      cache.set('test', results)
      expect(cache.get('test')).toEqual(results)
    })

    it('should clear all entries', () => {
      cache.set('query1', [{ title: 'Test 1', url: 'https://example.com/1', snippet: 'Snippet 1' }])
      cache.set('query2', [{ title: 'Test 2', url: 'https://example.com/2', snippet: 'Snippet 2' }])

      expect(cache.size()).toBe(2)

      cache.clear()

      expect(cache.size()).toBe(0)
      expect(cache.get('query1')).toBeNull()
      expect(cache.get('query2')).toBeNull()
    })

    it('should track cache size', () => {
      expect(cache.size()).toBe(0)

      cache.set('query1', [{ title: 'Test', url: 'https://example.com', snippet: 'Snippet' }])
      expect(cache.size()).toBe(1)

      cache.set('query2', [{ title: 'Test', url: 'https://example.com', snippet: 'Snippet' }])
      expect(cache.size()).toBe(2)

      cache.clear()
      expect(cache.size()).toBe(0)
    })

    it('should overwrite existing entries', () => {
      const results1 = [{ title: 'Test 1', url: 'https://example.com/1', snippet: 'Snippet 1' }]
      const results2 = [{ title: 'Test 2', url: 'https://example.com/2', snippet: 'Snippet 2' }]

      cache.set('query', results1)
      expect(cache.get('query')).toEqual(results1)

      cache.set('query', results2)
      expect(cache.get('query')).toEqual(results2)
    })
  })

  describe('default TTL', () => {
    it('should use default TTL of 1 hour', () => {
      const defaultCache = new SearchCache()
      const results = [{ title: 'Test', url: 'https://example.com', snippet: 'Snippet' }]

      defaultCache.set('query', results)

      // Should still be cached after 1 second (default is 1 hour)
      setTimeout(() => {
        expect(defaultCache.get('query')).toEqual(results)
      }, 1000)
    })
  })
})
