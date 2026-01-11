// arXiv API Integration - 100% бесплатно
// Документация: https://info.arxiv.org/help/api/index.html
// Используется для обогащения AI контекста научными материалами

export interface ArxivPaper {
  id: string
  title: string
  summary: string
  authors: string[]
  published: string
  link: string
  categories: string[]
}

export interface ArxivSearchResult {
  papers: ArxivPaper[]
  totalResults: number
  query: string
}

export interface EnrichedContext {
  arxivContext: string
  papers: ArxivPaper[]
  searchQuery: string
}

/**
 * Базовый перевод научных терминов для arXiv
 */
function translateForArxiv(query: string): string {
  const terms: Record<string, string> = {
    'квантовая механика': 'quantum mechanics',
    'квантовый': 'quantum',
    'механика': 'mechanics',
    'термодинамика': 'thermodynamics',
    'электромагнетизм': 'electromagnetism',
    'оптика': 'optics',
    'ядерная физика': 'nuclear physics',
    'физика': 'physics',
    'математика': 'mathematics',
    'алгебра': 'algebra',
    'геометрия': 'geometry',
    'анализ': 'analysis',
    'теорема': 'theorem',
    'интеграл': 'integral',
    'производная': 'derivative',
    'химия': 'chemistry',
    'биология': 'biology',
    'нейронные сети': 'neural networks',
    'машинное обучение': 'machine learning',
    'глубокое обучение': 'deep learning',
    'искусственный интеллект': 'artificial intelligence',
    'теория': 'theory',
    'закон': 'law',
    'формула': 'formula',
    'эксперимент': 'experiment',
    'исследование': 'research',
    'статья': 'paper'
  }
  
  let result = query.toLowerCase()
  for (const [ru, en] of Object.entries(terms)) {
    result = result.replace(new RegExp(ru, 'gi'), en)
  }
  
  // Транслитерация оставшихся русских слов
  if (/[а-яА-ЯёЁ]/.test(result)) {
    const translit: Record<string, string> = {
      'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
      'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
      'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
      'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
      'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    }
    result = result.split('').map(c => translit[c] || c).join('')
  }
  
  return result
}

// Поиск научных статей на arXiv
export async function searchArxiv(query: string, maxResults: number = 3): Promise<ArxivSearchResult> {
  try {
    // Переводим русский запрос на английский
    const searchQuery = /[а-яА-ЯёЁ]/.test(query) ? translateForArxiv(query) : query
    
    // Формируем запрос к arXiv API
    const encodedQuery = encodeURIComponent(searchQuery)
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodedQuery}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AI-Study-Agent/1.0 (Educational Purpose)'
      }
    })
    
    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status}`)
    }
    
    const xmlText = await response.text()
    const papers = parseArxivXML(xmlText)
    
    return {
      papers,
      totalResults: papers.length,
      query
    }
  } catch (error) {
    console.error('arXiv search error:', error)
    return { papers: [], totalResults: 0, query }
  }
}

// Парсинг XML ответа от arXiv
function parseArxivXML(xml: string): ArxivPaper[] {
  const papers: ArxivPaper[] = []
  
  // Простой парсинг XML без внешних библиотек
  const entries = xml.split('<entry>').slice(1)
  
  for (const entry of entries) {
    try {
      const id = extractTag(entry, 'id')?.split('/abs/')[1] || ''
      const title = extractTag(entry, 'title')?.replace(/\s+/g, ' ').trim() || ''
      const summary = extractTag(entry, 'summary')?.replace(/\s+/g, ' ').trim() || ''
      const published = extractTag(entry, 'published')?.split('T')[0] || ''
      
      // Извлекаем авторов
      const authorMatches = entry.match(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g) || []
      const authors = authorMatches.map(a => {
        const nameMatch = a.match(/<name>(.*?)<\/name>/)
        return nameMatch ? nameMatch[1] : ''
      }).filter(Boolean)
      
      // Извлекаем категории
      const categoryMatches = entry.match(/term="([^"]+)"/g) || []
      const categories = categoryMatches.map(c => c.replace('term="', '').replace('"', ''))
      
      // Ссылка на статью
      const link = `https://arxiv.org/abs/${id}`
      
      if (id && title) {
        papers.push({ id, title, summary, authors, published, link, categories })
      }
    } catch (e) {
      console.error('Error parsing arXiv entry:', e)
    }
  }
  
  return papers
}

function extractTag(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
  const match = xml.match(regex)
  return match ? match[1] : null
}

// Форматирование результатов для AI контекста
export function formatArxivForContext(result: ArxivSearchResult): string {
  if (result.papers.length === 0) {
    return ''
  }
  
  let context = `\n📚 Найдены научные статьи по теме "${result.query}":\n\n`
  
  for (const paper of result.papers) {
    context += `📄 **${paper.title}**\n`
    context += `   Авторы: ${paper.authors.slice(0, 3).join(', ')}${paper.authors.length > 3 ? ' и др.' : ''}\n`
    context += `   Дата: ${paper.published}\n`
    context += `   Краткое содержание: ${paper.summary.slice(0, 300)}...\n`
    context += `   Ссылка: ${paper.link}\n\n`
  }
  
  return context
}

// Определяем, нужен ли поиск научных статей
export function shouldSearchArxiv(message: string): boolean {
  const scientificKeywords = [
    'исследование', 'научн', 'статья', 'публикация', 'теория', 'доказательство',
    'эксперимент', 'гипотеза', 'формула', 'алгоритм', 'машинное обучение',
    'нейронн', 'deep learning', 'ai', 'ml', 'data science', 'математик',
    'физик', 'химия', 'биология', 'квантов', 'research', 'paper', 'study',
    'научная работа', 'диссертация', 'arxiv', 'последние исследования'
  ]
  
  const lowerMessage = message.toLowerCase()
  return scientificKeywords.some(keyword => lowerMessage.includes(keyword))
}

// Извлекаем ключевые слова для поиска
export function extractSearchQuery(message: string): string {
  // Убираем стоп-слова и оставляем ключевые термины
  const stopWords = [
    'что', 'как', 'где', 'когда', 'почему', 'какой', 'какая', 'какие',
    'расскажи', 'объясни', 'покажи', 'найди', 'про', 'это', 'такое',
    'мне', 'нужно', 'хочу', 'можно', 'есть', 'будет', 'был', 'была'
  ]
  
  const words = message.toLowerCase()
    .replace(/[^\w\sа-яё]/gi, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
  
  // Берем первые 3-4 значимых слова
  return words.slice(0, 4).join(' ')
}

// ==================== УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ДЛЯ ВСЕХ AI ====================
// Используй эту функцию везде где нужен AI контекст

/**
 * Обогащает контекст научными материалами из arXiv
 * Используется для: генерации уроков, создания курсов, чата, диагностики, повторения
 */
export async function enrichContextWithArxiv(
  topic: string,
  options: {
    maxPapers?: number
    forceSearch?: boolean // Искать даже без научных ключевых слов
  } = {}
): Promise<EnrichedContext> {
  const { maxPapers = 2, forceSearch = false } = options
  
  // Проверяем нужен ли поиск
  if (!forceSearch && !shouldSearchArxiv(topic)) {
    return { arxivContext: '', papers: [], searchQuery: '' }
  }
  
  const searchQuery = extractSearchQuery(topic)
  if (!searchQuery) {
    return { arxivContext: '', papers: [], searchQuery: '' }
  }
  
  try {
    const result = await searchArxiv(searchQuery, maxPapers)
    const arxivContext = formatArxivForContext(result)
    
    return {
      arxivContext,
      papers: result.papers,
      searchQuery
    }
  } catch (error) {
    console.error('enrichContextWithArxiv error:', error)
    return { arxivContext: '', papers: [], searchQuery }
  }
}

/**
 * Форматирует научный контекст для промпта AI
 * Компактная версия для добавления в системный промпт
 * ВАЖНО: Это ВСПОМОГАТЕЛЬНЫЙ источник, не основной!
 */
export function formatArxivForPrompt(papers: ArxivPaper[]): string {
  if (papers.length === 0) return ''
  
  let prompt = '\n\n[СПРАВОЧНЫЕ НАУЧНЫЕ МАТЕРИАЛЫ - используй ТОЛЬКО как дополнение к своим знаниям]\n'
  
  for (const paper of papers) {
    prompt += `• "${paper.title}" (${paper.published})\n`
    prompt += `  ${paper.summary.slice(0, 200)}...\n`
  }
  
  prompt += '\nЭто вспомогательная информация. Генерируй контент на основе своих знаний, а научные источники используй только для уточнения фактов и терминов. Объясняй простым языком.\n'
  
  return prompt
}

/**
 * Быстрый поиск для конкретной темы курса
 * Оптимизирован для генерации учебных материалов
 */
export async function getScientificContext(topicName: string, goalTitle?: string): Promise<string> {
  const query = goalTitle ? `${topicName} ${goalTitle}` : topicName
  const result = await enrichContextWithArxiv(query, { maxPapers: 2, forceSearch: true })
  return result.arxivContext
}
