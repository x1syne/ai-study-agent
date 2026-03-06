/**
 * RAG Content Quality Filter
 * Фильтрация контента по качеству
 */

export interface ContentQualityResult {
  isValid: boolean
  score: number // 0-1
  issues: string[]
  language: 'ru' | 'en' | 'mixed' | 'unknown'
}

interface FilterOptions {
  minLength?: number
  maxLength?: number
  minScore?: number
  allowedLanguages?: ('ru' | 'en' | 'mixed')[]
  requireStructure?: boolean
}

const DEFAULT_OPTIONS: FilterOptions = {
  minLength: 50,
  maxLength: 50000,
  minScore: 0.3,
  allowedLanguages: ['ru', 'en', 'mixed'],
  requireStructure: false
}

// Паттерны для определения языка
const CYRILLIC_PATTERN = /[а-яёА-ЯЁ]/g
const LATIN_PATTERN = /[a-zA-Z]/g

// Паттерны мусорного контента
const SPAM_PATTERNS = [
  /купить|заказать|скидка|акция|бесплатно|срочно/gi,
  /click here|buy now|free|discount|limited offer/gi,
  /\b(xxx|porn|casino|viagra|cialis)\b/gi,
  /(.)\1{5,}/g, // повторяющиеся символы
  /[!?]{3,}/g, // много восклицательных/вопросительных
]

// Паттерны качественного контента
const QUALITY_PATTERNS = {
  hasDefinition: /это|является|представляет собой|называется|определяется как|is a|refers to|defined as/i,
  hasExamples: /например|к примеру|пример:|for example|such as|e\.g\./i,
  hasStructure: /^[-•*\d]+\.|#{1,3}\s|<h[1-6]>/m,
  hasCode: /```[\s\S]*?```|`[^`]+`|<code>|<pre>/,
  hasReferences: /\[\d+\]|\[источник\]|\[citation\]|https?:\/\//,
  hasNumbers: /\d+%|\d+\.\d+|\d{4}г\.?|\d{4}年/,
}

/**
 * Определение языка текста
 */
export function detectLanguage(text: string): 'ru' | 'en' | 'mixed' | 'unknown' {
  const cyrillicMatches = (text.match(CYRILLIC_PATTERN) || []).length
  const latinMatches = (text.match(LATIN_PATTERN) || []).length
  const total = cyrillicMatches + latinMatches

  if (total < 10) return 'unknown'

  const cyrillicRatio = cyrillicMatches / total
  const latinRatio = latinMatches / total

  if (cyrillicRatio > 0.7) return 'ru'
  if (latinRatio > 0.7) return 'en'
  if (cyrillicRatio > 0.3 && latinRatio > 0.3) return 'mixed'
  
  return cyrillicRatio > latinRatio ? 'ru' : 'en'
}

/**
 * Проверка на спам/мусор
 */
function checkForSpam(text: string): { isSpam: boolean; patterns: string[] } {
  const foundPatterns: string[] = []
  
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      foundPatterns.push(pattern.source)
    }
  }

  return {
    isSpam: foundPatterns.length > 0,
    patterns: foundPatterns
  }
}

/**
 * Оценка качества контента
 */
function calculateQualityScore(text: string): number {
  let score = 0.5 // базовый скор

  // Длина контента
  const length = text.length
  if (length >= 200) score += 0.1
  if (length >= 500) score += 0.1
  if (length >= 1000) score += 0.05
  if (length < 100) score -= 0.2

  // Качественные паттерны
  if (QUALITY_PATTERNS.hasDefinition.test(text)) score += 0.1
  if (QUALITY_PATTERNS.hasExamples.test(text)) score += 0.1
  if (QUALITY_PATTERNS.hasStructure.test(text)) score += 0.05
  if (QUALITY_PATTERNS.hasCode.test(text)) score += 0.1
  if (QUALITY_PATTERNS.hasReferences.test(text)) score += 0.05
  if (QUALITY_PATTERNS.hasNumbers.test(text)) score += 0.05

  // Разнообразие слов (уникальные слова / всего слов)
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const uniqueWords = new Set(words)
  const diversity = words.length > 0 ? uniqueWords.size / words.length : 0
  if (diversity > 0.5) score += 0.1
  if (diversity < 0.2) score -= 0.1

  // Штраф за слишком много спецсимволов
  const specialChars = (text.match(/[^\w\sа-яёА-ЯЁ.,!?:;()\-"']/g) || []).length
  const specialRatio = specialChars / text.length
  if (specialRatio > 0.15) score -= 0.2

  // Штраф за слишком много CAPS
  const capsRatio = (text.match(/[A-ZА-ЯЁ]/g) || []).length / text.length
  if (capsRatio > 0.3) score -= 0.1

  return Math.max(0, Math.min(1, score))
}


/**
 * Главная функция оценки качества контента
 */
export function assessContentQuality(
  content: string,
  options: FilterOptions = {}
): ContentQualityResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const issues: string[] = []

  // 1. Проверка длины
  if (content.length < opts.minLength!) {
    issues.push(`Слишком короткий контент (${content.length} < ${opts.minLength})`)
  }
  if (content.length > opts.maxLength!) {
    issues.push(`Слишком длинный контент (${content.length} > ${opts.maxLength})`)
  }

  // 2. Определение языка
  const language = detectLanguage(content)
  if (language === 'unknown') {
    issues.push('Не удалось определить язык')
  } else if (!opts.allowedLanguages!.includes(language)) {
    issues.push(`Недопустимый язык: ${language}`)
  }

  // 3. Проверка на спам
  const spamCheck = checkForSpam(content)
  if (spamCheck.isSpam) {
    issues.push(`Обнаружен спам: ${spamCheck.patterns.join(', ')}`)
  }

  // 4. Оценка качества
  const qualityScore = calculateQualityScore(content)
  if (qualityScore < opts.minScore!) {
    issues.push(`Низкое качество контента (${(qualityScore * 100).toFixed(0)}% < ${(opts.minScore! * 100).toFixed(0)}%)`)
  }

  // 5. Проверка структуры (опционально)
  if (opts.requireStructure && !QUALITY_PATTERNS.hasStructure.test(content)) {
    issues.push('Отсутствует структура (списки, заголовки)')
  }

  return {
    isValid: issues.length === 0,
    score: qualityScore,
    issues,
    language
  }
}

/**
 * Фильтрация массива контента
 */
export function filterContentByQuality<T extends { content: string }>(
  items: T[],
  options: FilterOptions = {}
): T[] {
  return items.filter(item => {
    const result = assessContentQuality(item.content, options)
    return result.isValid
  })
}

/**
 * Очистка контента от мусора
 */
export function cleanContent(content: string): string {
  let cleaned = content

  // Удаляем множественные пробелы
  cleaned = cleaned.replace(/\s{3,}/g, '  ')

  // Удаляем множественные переносы строк
  cleaned = cleaned.replace(/\n{4,}/g, '\n\n\n')

  // Удаляем HTML теги (кроме code/pre)
  cleaned = cleaned.replace(/<(?!\/?(code|pre))[^>]+>/gi, '')

  // Удаляем URL-параметры отслеживания
  cleaned = cleaned.replace(/\?utm_[^&\s]+(&[^&\s]+)*/g, '')

  // Нормализуем кавычки
  cleaned = cleaned.replace(/[«»„"]/g, '"')
  cleaned = cleaned.replace(/['']/g, "'")

  return cleaned.trim()
}

/**
 * Извлечение ключевой информации из контента
 */
export function extractKeyInfo(content: string): {
  definitions: string[]
  examples: string[]
  facts: string[]
} {
  const definitions: string[] = []
  const examples: string[] = []
  const facts: string[] = []

  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20)

  for (const sentence of sentences) {
    // Определения
    if (QUALITY_PATTERNS.hasDefinition.test(sentence)) {
      definitions.push(sentence)
    }
    // Примеры
    else if (QUALITY_PATTERNS.hasExamples.test(sentence)) {
      examples.push(sentence)
    }
    // Факты (с числами)
    else if (QUALITY_PATTERNS.hasNumbers.test(sentence)) {
      facts.push(sentence)
    }
  }

  return {
    definitions: definitions.slice(0, 5),
    examples: examples.slice(0, 5),
    facts: facts.slice(0, 5)
  }
}
