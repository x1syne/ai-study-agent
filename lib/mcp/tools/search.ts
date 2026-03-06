// Search Tool - MCP wrapper for web search operations using Brave Search API

export interface SearchParams {
  query: string
  count?: number
}

export interface SearchResult {
  title: string
  url: string
  snippet: string
  publishedDate?: string
}

interface CachedSearch {
  results: SearchResult[]
  timestamp: number
}

/**
 * SearchCache class for caching search results
 */
export class SearchCache {
  private cache: Map<string, CachedSearch>
  private ttl: number

  constructor(ttl: number = 3600000) { // Default 1 hour
    this.cache = new Map()
    this.ttl = ttl
  }

  /**
   * Get cached search results
   */
  get(query: string): SearchResult[] | null {
    const cached = this.cache.get(query)
    
    if (!cached) {
      return null
    }

    // Check if cache is expired
    const now = Date.now()
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(query)
      return null
    }

    console.log(`[SearchCache] Cache hit for query: ${query}`)
    return cached.results
  }

  /**
   * Set search results in cache
   */
  set(query: string, results: SearchResult[]): void {
    this.cache.set(query, {
      results,
      timestamp: Date.now()
    })
    console.log(`[SearchCache] Cached results for query: ${query}`)
  }

  /**
   * Clear all cached results
   */
  clear(): void {
    this.cache.clear()
    console.log(`[SearchCache] Cache cleared`)
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }
}

/**
 * SearchTool class for web search operations
 */
export class SearchTool {
  private apiKey: string
  private cache: SearchCache
  private baseUrl: string = 'https://api.search.brave.com/res/v1/web/search'

  constructor(apiKey: string, cache?: SearchCache) {
    this.apiKey = apiKey
    this.cache = cache || new SearchCache()
  }

  /**
   * Perform web search using Brave Search API
   */
  async search(params: SearchParams): Promise<SearchResult[]> {
    const { query, count = 5 } = params

    // Validate query
    if (!query || query.trim() === '') {
      throw new Error('Search query cannot be empty')
    }

    // Check cache first
    const cached = this.cache.get(query)
    if (cached) {
      return cached.slice(0, count)
    }

    try {
      // Make API request
      const url = new URL(this.baseUrl)
      url.searchParams.append('q', query)
      url.searchParams.append('count', Math.min(count, 20).toString())

      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey
        }
      })

      if (!response.ok) {
        throw new Error(`Brave Search API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Parse results
      const results: SearchResult[] = []
      
      if (data.web && data.web.results) {
        for (const item of data.web.results) {
          results.push({
            title: item.title || '',
            url: item.url || '',
            snippet: item.description || '',
            publishedDate: item.age || undefined
          })
        }
      }

      // Cache full results (before slicing by count)
      this.cache.set(query, results)

      console.log(`[SearchTool] Found ${results.length} results for query: ${query}`)

      // Return sliced results based on requested count
      return results.slice(0, count)
    } catch (error) {
      console.error(`[SearchTool] Search error:`, error)
      throw new Error(`Failed to perform search: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Detect if a query needs web search
   */
  needsSearch(query: string): boolean {
    // Keywords that indicate need for current information
    const searchIndicators = [
      // Time-related
      'latest', 'recent', 'new', 'current', 'today', 'now', 'this year',
      'последние', 'новые', 'текущие', 'сегодня', 'сейчас', 'этом году',
      
      // Version-related
      'version', 'release', 'update', 'changelog',
      'версия', 'релиз', 'обновление',
      
      // Comparison and trends
      'vs', 'versus', 'compare', 'comparison', 'best', 'top',
      'против', 'сравнить', 'сравнение', 'лучший', 'топ',
      
      // News and events
      'news', 'announcement', 'event', 'conference',
      'новости', 'анонс', 'событие', 'конференция',
      
      // Specific queries
      'what is', 'how to', 'tutorial', 'guide', 'example',
      'что такое', 'как', 'туториал', 'руководство', 'пример',
      
      // Technology-specific
      'features', 'documentation', 'api', 'library', 'framework',
      'фичи', 'документация', 'библиотека', 'фреймворк'
    ]

    const lowerQuery = query.toLowerCase()

    // Check for search indicators
    for (const indicator of searchIndicators) {
      if (lowerQuery.includes(indicator)) {
        return true
      }
    }

    // Check for year mentions (e.g., "React 19", "Python 3.12")
    if (/\d{4}|\d+\.\d+/.test(query)) {
      return true
    }

    // Check for question marks
    if (query.includes('?')) {
      return true
    }

    return false
  }

  /**
   * Get cache instance
   */
  getCache(): SearchCache {
    return this.cache
  }
}
