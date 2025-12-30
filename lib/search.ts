/**
 * 🔍 SEARCH UTILITIES - Wikipedia & Serper Fallback
 * 
 * Бесплатные источники для RAG когда Tavily недоступен:
 * - Wikipedia API (бесплатно, без лимитов)
 * - Serper API (100 free queries/month)
 */

// ═══════════════════════════════════════════════════════════════
// 📚 WIKIPEDIA SEARCH
// ═══════════════════════════════════════════════════════════════

interface WikipediaSearchResult {
  title: string
  pageid: number
  snippet: string
}

interface WikipediaPageResult {
  title: string
  extract: string
  pageid: number
}

/**
 * Search Wikipedia for a topic
 */
export async function searchWikipedia(
  query: string,
  lang: string = 'ru'
): Promise<WikipediaPageResult | null> {
  try {
    // First, search for the page
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: '1',
      format: 'json',
      origin: '*'
    })

    const searchResponse = await fetch(searchUrl)
    if (!searchResponse.ok) return null

    const searchData = await searchResponse.json()
    const searchResults: WikipediaSearchResult[] = searchData.query?.search || []

    if (searchResults.length === 0) {
      // Try English Wikipedia as fallback
      if (lang !== 'en') {
        return searchWikipedia(query, 'en')
      }
      return null
    }

    const pageId = searchResults[0].pageid

    // Get the page extract
    const extractUrl = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({
      action: 'query',
      pageids: String(pageId),
      prop: 'extracts',
      exintro: 'true',
      explaintext: 'true',
      format: 'json',
      origin: '*'
    })

    const extractResponse = await fetch(extractUrl)
    if (!extractResponse.ok) return null

    const extractData = await extractResponse.json()
    const page = extractData.query?.pages?.[pageId]

    if (!page || !page.extract) return null

    return {
      title: page.title,
      extract: page.extract,
      pageid: pageId
    }
  } catch (error) {
    console.error('[Wikipedia] Search error:', error)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔎 SERPER SEARCH (Google Search API)
// ═══════════════════════════════════════════════════════════════

interface SerperResult {
  title: string
  link: string
  snippet: string
  position: number
}

interface SerperResponse {
  organic: SerperResult[]
  searchParameters: {
    q: string
  }
}

/**
 * Search using Serper API (Google Search)
 * Free tier: 100 queries/month
 */
export async function searchSerper(
  query: string,
  maxResults: number = 5
): Promise<SerperResult[]> {
  const apiKey = process.env.SERPER_API_KEY

  if (!apiKey) {
    console.log('[Serper] API key not set, skipping search')
    return []
  }

  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        q: query,
        num: maxResults,
        gl: 'ru',
        hl: 'ru'
      })
    })

    if (!response.ok) {
      console.error('[Serper] Search failed:', response.status)
      return []
    }

    const data: SerperResponse = await response.json()
    return data.organic || []
  } catch (error) {
    console.error('[Serper] Search error:', error)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎓 EDUCATIONAL SEARCH
// ═══════════════════════════════════════════════════════════════

interface EducationalSource {
  title: string
  url: string
  snippet: string
  source: string
  relevance: number
}

/**
 * Search for educational content from multiple sources
 */
export async function searchEducationalContent(
  topic: string,
  maxResults: number = 10
): Promise<EducationalSource[]> {
  const results: EducationalSource[] = []

  // Search Wikipedia
  const wikiResult = await searchWikipedia(topic)
  if (wikiResult) {
    results.push({
      title: wikiResult.title,
      url: `https://ru.wikipedia.org/wiki/${encodeURIComponent(wikiResult.title)}`,
      snippet: wikiResult.extract.slice(0, 500),
      source: 'Wikipedia',
      relevance: 0.8
    })
  }

  // Search Serper for course outlines
  const serperResults = await searchSerper(
    `${topic} course outline tutorial guide`,
    maxResults - results.length
  )

  for (const result of serperResults) {
    // Determine source quality
    let relevance = 0.5
    const url = result.link.toLowerCase()

    if (url.includes('harvard.edu') || url.includes('mit.edu') || url.includes('stanford.edu')) {
      relevance = 0.95
    } else if (url.includes('coursera.org') || url.includes('edx.org')) {
      relevance = 0.9
    } else if (url.includes('khanacademy.org') || url.includes('freecodecamp.org')) {
      relevance = 0.85
    } else if (url.includes('.edu')) {
      relevance = 0.8
    } else if (url.includes('geeksforgeeks.org') || url.includes('realpython.com')) {
      relevance = 0.75
    }

    results.push({
      title: result.title,
      url: result.link,
      snippet: result.snippet,
      source: extractDomain(result.link),
      relevance
    })
  }

  // Sort by relevance
  return results.sort((a, b) => b.relevance - a.relevance).slice(0, maxResults)
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return 'unknown'
  }
}

// ═══════════════════════════════════════════════════════════════
// 📖 COURSE OUTLINE EXTRACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Extract course structure from search results
 */
export function extractCourseStructure(sources: EducationalSource[]): string[] {
  const modules: string[] = []
  const seen = new Set<string>()

  for (const source of sources) {
    // Look for numbered items in snippets
    const numberedPattern = /(?:\d+[\.\)]\s*|[-•]\s*)([A-ZА-Я][^.\n]{5,50})/g
    let match

    while ((match = numberedPattern.exec(source.snippet)) !== null) {
      const module = match[1].trim()
      const normalized = module.toLowerCase()

      if (!seen.has(normalized) && module.length > 5) {
        seen.add(normalized)
        modules.push(module)
      }
    }
  }

  return modules.slice(0, 10)
}


// ═══════════════════════════════════════════════════════════════
// 🔍 RAG CONTEXT (для совместимости с lesson route)
// ═══════════════════════════════════════════════════════════════

/**
 * Get RAG context for a topic (combines Wikipedia + Serper)
 */
export async function getRAGContext(
  topicName: string,
  courseTitle: string
): Promise<string> {
  try {
    const query = `${topicName} ${courseTitle} tutorial guide explanation`
    
    // Get Wikipedia context
    const wikiResult = await searchWikipedia(topicName)
    
    // Get Serper results
    const serperResults = await searchSerper(query, 3)
    
    const parts: string[] = []
    
    if (wikiResult) {
      parts.push(`[Wikipedia] ${wikiResult.title}:\n${wikiResult.extract.slice(0, 1000)}`)
    }
    
    for (const result of serperResults) {
      parts.push(`[${extractDomain(result.link)}] ${result.title}:\n${result.snippet}`)
    }
    
    if (parts.length === 0) {
      return ''
    }
    
    return parts.join('\n\n---\n\n')
  } catch (error) {
    console.error('[RAG] Context error:', error)
    return ''
  }
}
