/**
 * RAG Search Module
 * Retrieval-Augmented Generation - поиск актуальной информации для улучшения генерации
 */

import { indexRAGContent } from './embeddings'
import { withCache, cacheKey, CACHE_TTL } from './rag/cache'
import { searchArxiv } from './arxiv'
import { rerankResults, formatRankedResultsForPrompt, RankedResult } from './rag/reranker'
import { assessContentQuality, cleanContent } from './rag/content-filter'
import { smartSearch } from './rag/hybrid-search'
import { logRAGMetrics, createRAGMetrics } from './rag/metrics'
import { 
  getDomainBoostFactors, 
  optimizeSearchQuery, 
  shouldUseArxiv,
  shouldUseStackOverflow,
  shouldUseGitHub,
  shouldUseWikidata,
  getMinRelevanceThreshold,
  getMaxResults,
  getSearchLanguages
} from './rag/domain-sources'
import { DomainType } from '@/lib/ai/domain-prompts'
import { getStackOverflowContext } from './stackoverflow'
import { getGitHubContext } from './github'
import { getWikidataContext } from './wikidata'

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
 * + Reranking по релевантности
 */
export async function getRAGContext(
  topicName: string, 
  courseName: string
): Promise<string> {
  const key = cacheKey('rag', topicName, courseName)
  const startTime = Date.now()
  let cacheHit = false
  
  return withCache(key, async () => {
    const searchQuery = `${topicName} ${courseName}`
    const fullQuery = `${topicName} ${courseName} обучение tutorial`
    
    // Параллельный поиск из всех источников с таймаутом
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000))
    
    const [hybridResults, wikiResult, arxivResult, ddgResults, serperResults] = await Promise.all([
      Promise.race([smartSearch(searchQuery, { limit: 8, threshold: 0.25 }), timeoutPromise]).catch(() => []),
      Promise.race([searchWikipedia(topicName), timeoutPromise]).catch(() => null),
      Promise.race([searchArxiv(topicName, 3), timeoutPromise]).catch(() => ({ papers: [], totalResults: 0, query: topicName })),
      Promise.race([searchDuckDuckGo(topicName), timeoutPromise]).catch(() => []),
      Promise.race([searchSerper(fullQuery, 3), timeoutPromise]).catch(() => [])
    ])

    // Собираем все результаты в единый формат для reranking
    const allResults: RankedResult[] = []

    // Функция проверки качества контента
    const isQualityContent = (content: string, minLength: number = 50): boolean => {
      const quality = assessContentQuality(content, { minLength, minScore: 0.25 })
      return quality.isValid
    }

    // 1. Hybrid Search результаты (векторный + keyword)
    if (hybridResults && Array.isArray(hybridResults)) {
      for (const doc of hybridResults) {
        if (doc.content && isQualityContent(doc.content, 50)) {
          allResults.push({
            content: cleanContent(doc.content),
            source: doc.metadata?.source || 'vector',
            type: 'vector',
            url: doc.metadata?.url,
            score: doc.score || 0.5
          })
        }
      }
    }

    // 2. Wikipedia
    if (wikiResult && isQualityContent(wikiResult.extract, 100)) {
      allResults.push({
        content: cleanContent(wikiResult.extract),
        source: 'wikipedia',
        type: 'wikipedia',
        url: `https://ru.wikipedia.org/wiki/${encodeURIComponent(wikiResult.title)}`,
        score: 0.8 // Wikipedia обычно релевантна
      })
      
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
      for (const paper of arxivResult.papers) {
        const paperContent = `${paper.title}\n\n${paper.summary}`
        if (paper.summary && isQualityContent(paperContent, 100)) {
          allResults.push({
            content: cleanContent(paperContent),
            source: 'arxiv',
            type: 'arxiv',
            url: paper.link,
            score: 0.7
          })
          
          // Индексируем научные статьи
          indexRAGContent(paper.summary, {
            source: 'arxiv',
            topic: topicName,
            type: 'arxiv',
            url: paper.link
          }).catch(() => {})
        }
      }
    }

    // 4. Web Search Results
    const webResults = [...(serperResults || []), ...(ddgResults || [])]
    for (const result of webResults) {
      const webContent = `${result.title}\n\n${result.snippet}`
      if (result.snippet && isQualityContent(webContent, 50)) {
        allResults.push({
          content: cleanContent(webContent),
          source: result.link || 'web',
          type: 'web',
          url: result.link,
          score: 0.5
        })
        
        // Индексируем веб-результаты (только качественные)
        if (result.snippet.length > 100) {
          indexRAGContent(result.snippet, {
            source: result.link || 'web',
            topic: topicName,
            type: 'web',
            url: result.link
          }).catch(() => {})
        }
      }
    }

    if (allResults.length === 0) {
      // Логируем пустой результат
      const searchTimeMs = Date.now() - startTime
      const metrics = createRAGMetrics(searchQuery, [], searchTimeMs, cacheHit, 0)
      logRAGMetrics(metrics)
      return ''
    }

    // RERANKING: переранжируем по релевантности
    const rankedResults = rerankResults(allResults, {
      query: searchQuery,
      topK: 8,
      minScore: 0.15,
      boostFactors: {
        vector: 1.3,
        wikipedia: 1.2,
        arxiv: 1.1,
        book: 1.0,
        web: 0.9
      }
    })

    if (rankedResults.length === 0) {
      // Логируем пустой результат после reranking
      const searchTimeMs = Date.now() - startTime
      const metrics = createRAGMetrics(searchQuery, [], searchTimeMs, cacheHit, 0)
      logRAGMetrics(metrics)
      return ''
    }

    // Форматируем результаты
    const formattedContext = formatRankedResultsForPrompt(rankedResults, 4000)

    // Логируем метрики
    const searchTimeMs = Date.now() - startTime
    const metrics = createRAGMetrics(
      searchQuery,
      rankedResults.map(r => ({ score: r.score, type: r.type })),
      searchTimeMs,
      cacheHit,
      formattedContext.length
    )
    logRAGMetrics(metrics)

    return `
═══════════════════════════════════════════════════════════════
                    RAG КОНТЕКСТ (актуальная информация)
                    Найдено ${rankedResults.length} релевантных источников
═══════════════════════════════════════════════════════════════

${formattedContext}

═══════════════════════════════════════════════════════════════
ИНСТРУКЦИЯ: Используй эту актуальную информацию как основу.
Цитируй факты, упоминай источники, создавай точный контент.
Приоритет: источники с высокой релевантностью.
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

/**
 * Domain-specific RAG контекст
 * Оптимизирует источники и параметры поиска под конкретный домен
 */
export async function getDomainRAGContext(
  topicName: string,
  courseName: string,
  domain: DomainType
): Promise<string> {
  const key = cacheKey('rag-domain', topicName, courseName, domain)
  const startTime = Date.now()
  
  return withCache(key, async () => {
    // Оптимизируем запрос под домен
    const baseQuery = `${topicName} ${courseName}`
    const searchQuery = optimizeSearchQuery(baseQuery, domain)
    const fullQuery = `${searchQuery} обучение tutorial`
    
    // Получаем параметры для домена
    const boostFactors = getDomainBoostFactors(domain)
    const minThreshold = getMinRelevanceThreshold(domain)
    const maxResults = getMaxResults(domain)
    const useArxiv = shouldUseArxiv(domain)
    const useStackOverflow = shouldUseStackOverflow(domain)
    const useGitHub = shouldUseGitHub(domain)
    const useWikidata = shouldUseWikidata(domain)
    const languages = getSearchLanguages(domain)
    
    console.log(`[RAG] Domain: ${domain}, arXiv: ${useArxiv}, SO: ${useStackOverflow}, GH: ${useGitHub}, WD: ${useWikidata}`)
    
    // Параллельный поиск с таймаутом
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000))
    
    // Формируем список промисов в зависимости от домена
    const searchPromises: Promise<any>[] = [
      Promise.race([smartSearch(searchQuery, { limit: maxResults, threshold: minThreshold }), timeoutPromise]).catch(() => []),
      Promise.race([searchWikipedia(topicName, languages[0] || 'ru'), timeoutPromise]).catch(() => null),
      Promise.race([searchDuckDuckGo(topicName), timeoutPromise]).catch(() => []),
      Promise.race([searchSerper(fullQuery, 3), timeoutPromise]).catch(() => [])
    ]
    
    // arXiv только для научных доменов
    if (useArxiv) {
      searchPromises.push(
        Promise.race([searchArxiv(topicName, 3), timeoutPromise]).catch(() => ({ papers: [], totalResults: 0, query: topicName }))
      )
    }
    
    // StackOverflow для программирования
    if (useStackOverflow) {
      searchPromises.push(
        Promise.race([getStackOverflowContext(topicName, { maxQuestions: 3 }), timeoutPromise]).catch(() => '')
      )
    }
    
    // GitHub для программирования
    if (useGitHub) {
      searchPromises.push(
        Promise.race([getGitHubContext(topicName, { maxRepos: 2 }), timeoutPromise]).catch(() => '')
      )
    }
    
    // Wikidata для истории и искусства
    if (useWikidata) {
      searchPromises.push(
        Promise.race([getWikidataContext(topicName, { maxEntities: 2 }), timeoutPromise]).catch(() => '')
      )
    }
    
    const results = await Promise.all(searchPromises)
    
    const hybridResults = results[0] || []
    const wikiResult = results[1]
    const ddgResults = results[2] || []
    const serperResults = results[3] || []
    
    // Индексы зависят от включённых источников
    let resultIndex = 4
    const arxivResult = useArxiv ? results[resultIndex++] : null
    const stackOverflowContext = useStackOverflow ? results[resultIndex++] : ''
    const githubContext = useGitHub ? results[resultIndex++] : ''
    const wikidataContext = useWikidata ? results[resultIndex++] : ''

    // Собираем все результаты
    const allResults: RankedResult[] = []

    const isQualityContent = (content: string, minLength: number = 50): boolean => {
      const quality = assessContentQuality(content, { minLength, minScore: 0.25 })
      return quality.isValid
    }

    // 1. Hybrid Search
    if (hybridResults && Array.isArray(hybridResults)) {
      for (const doc of hybridResults) {
        if (doc.content && isQualityContent(doc.content, 50)) {
          allResults.push({
            content: cleanContent(doc.content),
            source: doc.metadata?.source || 'vector',
            type: 'vector',
            url: doc.metadata?.url,
            score: doc.score || 0.5
          })
        }
      }
    }

    // 2. Wikipedia
    if (wikiResult && isQualityContent(wikiResult.extract, 100)) {
      allResults.push({
        content: cleanContent(wikiResult.extract),
        source: 'wikipedia',
        type: 'wikipedia',
        url: `https://${languages[0] || 'ru'}.wikipedia.org/wiki/${encodeURIComponent(wikiResult.title)}`,
        score: 0.8
      })
      
      indexRAGContent(wikiResult.extract, {
        source: 'wikipedia',
        topic: topicName,
        type: 'wikipedia',
        url: `https://${languages[0] || 'ru'}.wikipedia.org/wiki/${encodeURIComponent(wikiResult.title)}`
      }).catch(() => {})
    }

    // 3. arXiv (если включён для домена)
    if (arxivResult && arxivResult.papers && arxivResult.papers.length > 0) {
      for (const paper of arxivResult.papers) {
        const paperContent = `${paper.title}\n\n${paper.summary}`
        if (paper.summary && isQualityContent(paperContent, 100)) {
          allResults.push({
            content: cleanContent(paperContent),
            source: 'arxiv',
            type: 'arxiv',
            url: paper.link,
            score: 0.7
          })
          
          indexRAGContent(paper.summary, {
            source: 'arxiv',
            topic: topicName,
            type: 'arxiv',
            url: paper.link
          }).catch(() => {})
        }
      }
    }

    // 4. Web Search
    const webResults = [...(serperResults || []), ...(ddgResults || [])]
    for (const result of webResults) {
      const webContent = `${result.title}\n\n${result.snippet}`
      if (result.snippet && isQualityContent(webContent, 50)) {
        allResults.push({
          content: cleanContent(webContent),
          source: result.link || 'web',
          type: 'web',
          url: result.link,
          score: 0.5
        })
        
        if (result.snippet.length > 100) {
          indexRAGContent(result.snippet, {
            source: result.link || 'web',
            topic: topicName,
            type: 'web',
            url: result.link
          }).catch(() => {})
        }
      }
    }

    if (allResults.length === 0) {
      const searchTimeMs = Date.now() - startTime
      const metrics = createRAGMetrics(searchQuery, [], searchTimeMs, false, 0)
      logRAGMetrics(metrics)
      return ''
    }

    // RERANKING с domain-specific boost factors
    const rankedResults = rerankResults(allResults, {
      query: searchQuery,
      topK: maxResults,
      minScore: minThreshold,
      boostFactors
    })

    if (rankedResults.length === 0) {
      const searchTimeMs = Date.now() - startTime
      const metrics = createRAGMetrics(searchQuery, [], searchTimeMs, false, 0)
      logRAGMetrics(metrics)
      return ''
    }

    const formattedContext = formatRankedResultsForPrompt(rankedResults, 4000)
    
    // Добавляем специализированные контексты
    const stackOverflowSection = stackOverflowContext ? `\n${stackOverflowContext}` : ''
    const githubSection = githubContext ? `\n${githubContext}` : ''
    const wikidataSection = wikidataContext ? `\n${wikidataContext}` : ''

    const searchTimeMs = Date.now() - startTime
    const metrics = createRAGMetrics(
      searchQuery,
      rankedResults.map(r => ({ score: r.score, type: r.type })),
      searchTimeMs,
      false,
      formattedContext.length + stackOverflowSection.length + githubSection.length + wikidataSection.length
    )
    logRAGMetrics(metrics)

    return `
═══════════════════════════════════════════════════════════════
              RAG КОНТЕКСТ [${domain.toUpperCase()}]
              Найдено ${rankedResults.length} релевантных источников
═══════════════════════════════════════════════════════════════

${formattedContext}
${stackOverflowSection}
${githubSection}
${wikidataSection}
═══════════════════════════════════════════════════════════════
ИНСТРУКЦИЯ: Используй эту информацию для создания точного контента.
Домен: ${domain} | Приоритет источников настроен под предметную область.
═══════════════════════════════════════════════════════════════
`
  }, { ttl: CACHE_TTL.RAG_CONTEXT })
}
