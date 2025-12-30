/**
 * RAG Search Module
 * Retrieval-Augmented Generation - поиск актуальной информации для улучшения генерации
 */

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

  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        q: query, 
        num,
        gl: 'ru', // Россия
        hl: 'ru'  // Русский язык
      })
    })

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
  } catch (e) {
    console.error('Serper search error:', e)
    return []
  }
}

/**
 * Поиск в Wikipedia (бесплатно, без API ключа)
 */
export async function searchWikipedia(query: string, lang: string = 'ru'): Promise<WikipediaResult | null> {
  try {
    // Сначала ищем статью
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
    const searchRes = await fetch(searchUrl)
    const searchData = await searchRes.json()
    
    const firstResult = searchData.query?.search?.[0]
    if (!firstResult) return null

    // Получаем содержимое статьи
    const contentUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(firstResult.title)}&format=json&origin=*`
    const contentRes = await fetch(contentUrl)
    const contentData = await contentRes.json()
    
    const pages = contentData.query?.pages
    const page = pages ? Object.values(pages)[0] as any : null
    
    if (!page?.extract) return null

    return {
      title: page.title,
      extract: page.extract.slice(0, 2000) // Ограничиваем размер
    }
  } catch (e) {
    console.error('Wikipedia search error:', e)
    return null
  }
}

/**
 * Поиск образовательных ресурсов через DuckDuckGo (бесплатно)
 */
export async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    const res = await fetch(url)
    const data = await res.json()
    
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
  } catch (e) {
    console.error('DuckDuckGo search error:', e)
    return []
  }
}

/**
 * Комбинированный поиск контекста для RAG
 * Собирает информацию из нескольких источников
 */
export async function getRAGContext(
  topicName: string, 
  courseName: string
): Promise<string> {
  const searchQuery = `${topicName} ${courseName} обучение tutorial`
  
  // Параллельный поиск из разных источников
  const [wikiResult, ddgResults, serperResults] = await Promise.all([
    searchWikipedia(topicName),
    searchDuckDuckGo(topicName),
    searchSerper(searchQuery, 3)
  ])

  const contextParts: string[] = []

  // Wikipedia
  if (wikiResult) {
    contextParts.push(`📚 WIKIPEDIA - ${wikiResult.title}:\n${wikiResult.extract}`)
  }

  // Web Search Results
  const webResults = [...serperResults, ...ddgResults].slice(0, 5)
  if (webResults.length > 0) {
    const webContext = webResults
      .map(r => `• ${r.title}: ${r.snippet}`)
      .join('\n')
    contextParts.push(`🌐 ВЕБ-ИСТОЧНИКИ:\n${webContext}`)
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
