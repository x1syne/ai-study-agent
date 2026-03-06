/**
 * StackExchange API Integration (StackOverflow)
 * 100% бесплатно: 300 req/day без ключа, 10,000/day с ключом
 * Документация: https://api.stackexchange.com/docs
 */

import { withCache, cacheKey, CACHE_TTL } from './rag/cache'

// ==================== ТИПЫ ====================

export interface StackOverflowQuestion {
  id: number
  title: string
  body: string           // HTML контент
  bodyMarkdown: string   // Очищенный текст
  link: string
  score: number
  answerCount: number
  isAnswered: boolean
  tags: string[]
  acceptedAnswerId?: number
}

export interface StackOverflowAnswer {
  id: number
  body: string
  bodyMarkdown: string
  score: number
  isAccepted: boolean
  questionId: number
}

export interface StackOverflowResult {
  questions: StackOverflowQuestion[]
  totalResults: number
  query: string
  hasMore: boolean
}

// ==================== УТИЛИТЫ ====================

/**
 * Очистка HTML от тегов
 */
function stripHtml(html: string): string {
  return html
    // Заменяем code блоки на markdown
    .replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '\n```\n$1\n```\n')
    .replace(/<code>(.*?)<\/code>/gi, '`$1`')
    // Заменяем списки
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/?[uo]l>/gi, '\n')
    // Заменяем параграфы и переносы
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p>/gi, '')
    // Заменяем заголовки
    .replace(/<h([1-6])>/gi, (_, level) => '#'.repeat(parseInt(level)) + ' ')
    .replace(/<\/h[1-6]>/gi, '\n')
    // Жирный и курсив
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    // Ссылки
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // Удаляем остальные теги
    .replace(/<[^>]+>/g, '')
    // Декодируем HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Убираем лишние пробелы
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Определение сайта StackExchange по теме
 */
function getSiteForTopic(topic: string): string {
  const topicLower = topic.toLowerCase()
  
  // Специализированные сайты
  if (/python|django|flask|pandas|numpy/.test(topicLower)) return 'stackoverflow'
  if (/javascript|react|vue|angular|node|typescript/.test(topicLower)) return 'stackoverflow'
  if (/sql|database|mysql|postgres|mongodb/.test(topicLower)) return 'dba'
  if (/linux|ubuntu|bash|shell|terminal/.test(topicLower)) return 'unix'
  if (/server|nginx|apache|docker|kubernetes/.test(topicLower)) return 'serverfault'
  if (/math|calculus|algebra|geometry/.test(topicLower)) return 'math'
  if (/physics|quantum|mechanics/.test(topicLower)) return 'physics'
  
  return 'stackoverflow' // По умолчанию
}

// ==================== API ФУНКЦИИ ====================

/**
 * Поиск вопросов на StackOverflow
 */
export async function searchStackOverflow(
  query: string,
  options: {
    maxResults?: number
    site?: string
    tagged?: string[]
    sort?: 'relevance' | 'votes' | 'activity'
  } = {}
): Promise<StackOverflowResult> {
  const {
    maxResults = 5,
    site = getSiteForTopic(query),
    tagged = [],
    sort = 'relevance'
  } = options
  
  const key = cacheKey('stackoverflow', query, site, String(maxResults))
  
  return withCache(key, async () => {
    try {
      const params = new URLSearchParams({
        order: 'desc',
        sort,
        q: query,
        site,
        filter: '!nNPvSNdWme', // Включает body
        pagesize: String(maxResults)
      })
      
      if (tagged.length > 0) {
        params.set('tagged', tagged.join(';'))
      }
      
      // Добавляем API ключ если есть
      const apiKey = process.env.STACKEXCHANGE_API_KEY
      if (apiKey) {
        params.set('key', apiKey)
      }
      
      const url = `https://api.stackexchange.com/2.3/search/advanced?${params}`
      
      const response = await fetch(url, {
        headers: {
          'Accept-Encoding': 'gzip', // API требует сжатие
          'User-Agent': 'AI-Study-Agent/1.0'
        }
      })
      
      if (!response.ok) {
        console.error('[StackOverflow] API error:', response.status)
        return { questions: [], totalResults: 0, query, hasMore: false }
      }
      
      const data = await response.json()
      
      // Проверяем квоту
      if (data.quota_remaining !== undefined) {
        console.log(`[StackOverflow] Quota remaining: ${data.quota_remaining}`)
      }
      
      const questions: StackOverflowQuestion[] = (data.items || []).map((item: any) => ({
        id: item.question_id,
        title: item.title,
        body: item.body || '',
        bodyMarkdown: stripHtml(item.body || ''),
        link: item.link,
        score: item.score,
        answerCount: item.answer_count,
        isAnswered: item.is_answered,
        tags: item.tags || [],
        acceptedAnswerId: item.accepted_answer_id
      }))
      
      return {
        questions,
        totalResults: data.total || questions.length,
        query,
        hasMore: data.has_more || false
      }
    } catch (error) {
      console.error('[StackOverflow] Search error:', error)
      return { questions: [], totalResults: 0, query, hasMore: false }
    }
  }, { ttl: CACHE_TTL.WEB_SEARCH })
}

/**
 * Получение ответов на вопрос
 */
export async function getAnswers(
  questionId: number,
  options: { site?: string; maxResults?: number } = {}
): Promise<StackOverflowAnswer[]> {
  const { site = 'stackoverflow', maxResults = 3 } = options
  
  const key = cacheKey('so-answers', String(questionId), site)
  
  return withCache(key, async () => {
    try {
      const params = new URLSearchParams({
        order: 'desc',
        sort: 'votes',
        site,
        filter: '!nNPvSNdWme',
        pagesize: String(maxResults)
      })
      
      const apiKey = process.env.STACKEXCHANGE_API_KEY
      if (apiKey) {
        params.set('key', apiKey)
      }
      
      const url = `https://api.stackexchange.com/2.3/questions/${questionId}/answers?${params}`
      
      const response = await fetch(url, {
        headers: {
          'Accept-Encoding': 'gzip',
          'User-Agent': 'AI-Study-Agent/1.0'
        }
      })
      
      if (!response.ok) return []
      
      const data = await response.json()
      
      return (data.items || []).map((item: any) => ({
        id: item.answer_id,
        body: item.body || '',
        bodyMarkdown: stripHtml(item.body || ''),
        score: item.score,
        isAccepted: item.is_accepted || false,
        questionId: item.question_id
      }))
    } catch (error) {
      console.error('[StackOverflow] Get answers error:', error)
      return []
    }
  }, { ttl: CACHE_TTL.WEB_SEARCH })
}

// ==================== ФОРМАТИРОВАНИЕ ====================

/**
 * Форматирование результатов для AI контекста
 */
export function formatStackOverflowForContext(result: StackOverflowResult): string {
  if (result.questions.length === 0) return ''
  
  let context = `\n💻 Найдено ${result.questions.length} вопросов на StackOverflow по "${result.query}":\n\n`
  
  for (const q of result.questions) {
    context += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    context += `❓ **${q.title}**\n`
    context += `   Рейтинг: ${q.score} | Ответов: ${q.answerCount} | ${q.isAnswered ? '✅ Решено' : '⏳ Открыт'}\n`
    context += `   Теги: ${q.tags.slice(0, 5).join(', ')}\n`
    context += `   ${q.link}\n\n`
    
    // Добавляем краткое содержание вопроса
    const shortBody = q.bodyMarkdown.slice(0, 500)
    if (shortBody) {
      context += `   ${shortBody}${q.bodyMarkdown.length > 500 ? '...' : ''}\n\n`
    }
  }
  
  return context
}

/**
 * Форматирование для промпта (компактная версия)
 */
export function formatStackOverflowForPrompt(
  questions: StackOverflowQuestion[],
  answers: StackOverflowAnswer[] = []
): string {
  if (questions.length === 0) return ''
  
  let prompt = '\n[STACKOVERFLOW - практические решения]\n'
  
  for (const q of questions.slice(0, 3)) {
    prompt += `\nQ: ${q.title} (рейтинг: ${q.score})\n`
    prompt += `${q.bodyMarkdown.slice(0, 300)}...\n`
    
    // Добавляем лучший ответ если есть
    const qAnswers = answers.filter(a => a.questionId === q.id)
    const bestAnswer = qAnswers.find(a => a.isAccepted) || qAnswers[0]
    
    if (bestAnswer) {
      prompt += `\nA (${bestAnswer.isAccepted ? '✅ принят' : `рейтинг: ${bestAnswer.score}`}):\n`
      prompt += `${bestAnswer.bodyMarkdown.slice(0, 400)}...\n`
    }
  }
  
  prompt += '\nИспользуй эти практические примеры для объяснения концепций.\n'
  
  return prompt
}

// ==================== ГЛАВНАЯ ФУНКЦИЯ ====================

/**
 * Получение контекста из StackOverflow для темы
 */
export async function getStackOverflowContext(
  topic: string,
  options: { includeAnswers?: boolean; maxQuestions?: number } = {}
): Promise<string> {
  const { includeAnswers = true, maxQuestions = 3 } = options
  
  const result = await searchStackOverflow(topic, { maxResults: maxQuestions })
  
  if (result.questions.length === 0) return ''
  
  // Получаем ответы для вопросов с высоким рейтингом
  let answers: StackOverflowAnswer[] = []
  
  if (includeAnswers) {
    const topQuestions = result.questions
      .filter(q => q.isAnswered && q.score > 0)
      .slice(0, 2)
    
    const answerPromises = topQuestions.map(q => getAnswers(q.id, { maxResults: 1 }))
    const answerResults = await Promise.all(answerPromises)
    answers = answerResults.flat()
  }
  
  return formatStackOverflowForPrompt(result.questions, answers)
}

/**
 * Проверка, нужен ли StackOverflow для темы
 */
export function shouldUseStackOverflow(topic: string): boolean {
  const programmingKeywords = [
    'программ', 'код', 'функци', 'класс', 'метод', 'алгоритм',
    'python', 'javascript', 'java', 'react', 'sql', 'api',
    'ошибк', 'error', 'bug', 'debug', 'exception',
    'массив', 'array', 'list', 'dict', 'object',
    'цикл', 'loop', 'for', 'while', 'if', 'else',
    'import', 'export', 'module', 'package', 'library'
  ]
  
  const topicLower = topic.toLowerCase()
  return programmingKeywords.some(kw => topicLower.includes(kw))
}
