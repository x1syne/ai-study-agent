/**
 * RAG Search Module
 * Retrieval-Augmented Generation - поиск актуальной информации для улучшения генерации
 */

import { getVectorContext, indexRAGContent } from './embeddings'
import { withCache, cacheKey, CACHE_TTL } from './rag/cache'
import { searchArxiv, formatArxivForContext } from './arxiv'

interface SearchResult {
  title: string
  snippet: string
  link: string
}

interface WikipediaResult {
  title: string
  extract: string
}

/**
 * Поиск через Serper.dev (Google Search API)
 * 2500 запросов/месяц бесплатно
 */
export async function searchSerper(query: string, num: number = 5): Promise<SearchResult[]> {
  const apiKey = process.env.SERPER_API_KEY
  if (!apiKey) {
    console.log('SERPER_API_KEY not set, skipping web search')
    return []
  }

  const key = cacheKey('serper', query, String(num))
  
  return withCache(key, async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout
      
      const res = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          q: query, 
          num,
          gl: 'ru',
          hl: 'ru'
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!res.ok) {
        console.error('Serper search failed:', res.status)
        return []
      }

      const data = await res.json()
      return (data.organic || []).map((r: any) => ({
        title: r.title,
        snippet: r.snippet,
        link: r.link
      }))
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn('Serper search timeout')
      } else {
        console.error('Serper search error:', e)
      }
      return []
    }
  }, { ttl: CACHE_TTL.WEB_SEARCH })
}

/**
 * Поиск в Wikipedia (бесплатно, без API ключа)
 */
export async function searchWikipedia(query: string, lang: string = 'ru'): Promise<WikipediaResult | null> {
  const key = cacheKey('wiki', query, lang)
  
  return withCache(key, async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout
      
      // Сначала ищем статью
      const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
      const searchRes = await fetch(searchUrl, { signal: controller.signal })
      const searchData = await searchRes.json()
      
      const firstResult = searchData.query?.search?.[0]
      if (!firstResult) {
        clearTimeout(timeoutId)
        return null
      }

      // Получаем содержимое статьи
      const contentUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(firstResult.title)}&format=json&origin=*`
      const contentRes = await fetch(contentUrl, { signal: controller.signal })
      const contentData = await contentRes.json()
      
      clearTimeout(timeoutId)
      
      const pages = contentData.query?.pages
      const page = pages ? Object.values(pages)[0] as any : null
      
      if (!page?.extract) return null

      return {
        title: page.title,
        extract: page.extract.slice(0, 2000)
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn('Wikipedia search timeout')
      } else {
        console.error('Wikipedia search error:', e)
      }
      return null
    }
  }, { ttl: CACHE_TTL.WIKIPEDIA })
}

/**
 * Поиск образовательных ресурсов через DuckDuckGo (бесплатно)
 */
export async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const key = cacheKey('ddg', query)
  
  return withCache(key, async () => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout
      
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
      const res = await fetch(url, { signal: controller.signal })
      const data = await res.json()
      
      clearTimeout(timeoutId)
      
      const results: SearchResult[] = []
      
      // Основной результат
      if (data.AbstractText) {
        results.push({
          title: data.Heading || query,
          snippet: data.AbstractText,
          link: data.AbstractURL || ''
        })
      }
      
      // Связанные темы
      if (data.RelatedTopics) {
        for (const topic of data.RelatedTopics.slice(0, 3)) {
          if (topic.Text) {
            results.push({
              title: topic.Text.split(' - ')[0] || '',
              snippet: topic.Text,
              link: topic.FirstURL || ''
            })
          }
        }
      }
      
      return results
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn('DuckDuckGo search timeout')
      } else {
        console.error('DuckDuckGo search error:', e)
      }
      return []
    }
  }, { ttl: CACHE_TTL.WEB_SEARCH })
}

/**
 * Комбинированный поиск контекста для RAG
 * Собирает информацию из нескольких источников + векторный поиск
 * С ранжированием: векторная база → Wikipedia → arXiv → Web
 */
export async function getRAGContext(
  topicName: string, 
  courseName: string
): Promise<string> {
  const key = cacheKey('rag', topicName, courseName)
  
  return withCache(key, async () => {
    const searchQuery = `${topicName} ${courseName} обучение tutorial`
    
    // Параллельный поиск из всех источников с таймаутом
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000))
    
    const [vectorContext, wikiResult, arxivResult, ddgResults, serperResults] = await Promise.all([
      Promise.race([getVectorContext(topicName, courseName), timeoutPromise]).catch(() => ''),
      Promise.race([searchWikipedia(topicName), timeoutPromise]).catch(() => null),
      Promise.race([searchArxiv(topicName, 2), timeoutPromise]).catch(() => ({ papers: [], totalResults: 0, query: topicName })),
      Promise.race([searchDuckDuckGo(topicName), timeoutPromise]).catch(() => []),
      Promise.race([searchSerper(searchQuery, 3), timeoutPromise]).catch(() => [])
    ])

    const contextParts: string[] = []

    // 1. ПРИОРИТЕТ: Векторный поиск (из базы знаний)
    if (vectorContext) {
      contextParts.push(vectorContext as string)
    }

    // 2. Wikipedia (надёжный источник)
    if (wikiResult) {
      contextParts.push(`📚 WIKIPEDIA - ${wikiResult.title}:\n${wikiResult.extract}`)
      
      // Индексируем Wikipedia контент
      indexRAGContent(wikiResult.extract, {
        source: 'wikipedia',
        topic: topicName,
        type: 'wikipedia',
        url: `https://ru.wikipedia.org/wiki/${encodeURIComponent(wikiResult.title)}`
      }).catch(() => {})
    }

    // 3. arXiv (научные статьи)
    if (arxivResult && arxivResult.papers && arxivResult.papers.length > 0) {
      const arxivContext = formatArxivForContext(arxivResult)
      if (arxivContext) {
        contextParts.push(arxivContext)
        
        // Индексируем научные статьи
        for (const paper of arxivResult.papers) {
          if (paper.summary && paper.summary.length > 100) {
            indexRAGContent(paper.summary, {
              source: 'arxiv',
              topic: topicName,
              type: 'arxiv',
              url: paper.link
            }).catch(() => {})
          }
        }
      }
    }

    // 4. Web Search Results (дополнительно)
    const webResults = [...(serperResults || []), ...(ddgResults || [])].slice(0, 5)
    if (webResults.length > 0) {
      const webContext = webResults
        .map(r => `• ${r.title}: ${r.snippet}`)
        .join('\n')
      contextParts.push(`🌐 ВЕБ-ИСТОЧНИКИ:\n${webContext}`)
      
      // Индексируем веб-результаты (только качественные)
      for (const result of webResults.slice(0, 3)) {
        if (result.snippet && result.snippet.length > 100) {
          indexRAGContent(result.snippet, {
            source: result.link || 'web',
            topic: topicName,
            type: 'web',
            url: result.link
          }).catch(() => {})
        }
      }
    }

    if (contextParts.length === 0) {
      return ''
    }

    return `
═══════════════════════════════════════════════════════════════
                    RAG КОНТЕКСТ (актуальная информация)
═══════════════════════════════════════════════════════════════

${contextParts.join('\n\n')}

═══════════════════════════════════════════════════════════════
ИНСТРУКЦИЯ: Используй эту актуальную информацию как основу.
Цитируй факты, упоминай источники, создавай точный контент.
═══════════════════════════════════════════════════════════════
`
  }, { ttl: CACHE_TTL.RAG_CONTEXT })
}

/**
 * Анализ темы для определения сложности и типа контента
 */
export async function analyzeTopicWithAI(
  topicName: string,
  courseName: string,
  generateCompletion: (system: string, user: string, opts?: any) => Promise<string>
): Promise<{
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  type: 'technical' | 'theoretical' | 'practical'
  prerequisites: string[]
  keyTerms: string[]
}> {
  try {
    const prompt = `Проанализируй тему "${topicName}" в контексте курса "${courseName}".

Верни JSON:
{
  "difficulty": "beginner" | "intermediate" | "advanced",
  "type": "technical" | "theoretical" | "practical",
  "prerequisites": ["список предварительных знаний"],
  "keyTerms": ["ключевые термины темы"]
}

Только JSON, без пояснений.`

    const response = await generateCompletion(
      'Ты аналитик образовательного контента. Отвечай только валидным JSON.',
      prompt,
      { json: true, temperature: 0.3, maxTokens: 500 }
    )

    return JSON.parse(response)
  } catch (e) {
    console.error('Topic analysis failed:', e)
    return {
      difficulty: 'intermediate',
      type: 'theoretical',
      prerequisites: [],
      keyTerms: [topicName]
    }
  }
}
