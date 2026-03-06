/**
 * RAG Reranker Module
 * Переранжирование результатов по релевантности
 */

export interface RankedResult {
  content: string
  source: string
  type: 'wikipedia' | 'arxiv' | 'book' | 'web' | 'vector'
  url?: string
  score: number // 0-1, где 1 = максимальная релевантность
  originalRank?: number
}

interface RerankerOptions {
  query: string
  topK?: number // сколько результатов оставить
  minScore?: number // минимальный порог релевантности
  boostFactors?: {
    wikipedia?: number
    arxiv?: number
    book?: number
    web?: number
    vector?: number
  }
}

// Стоп-слова для русского и английского
const STOP_WORDS = new Set([
  // Русские
  'и', 'в', 'на', 'с', 'по', 'для', 'от', 'из', 'к', 'о', 'об', 'за', 'при',
  'что', 'как', 'это', 'так', 'же', 'но', 'а', 'или', 'не', 'ни', 'да', 'нет',
  'он', 'она', 'оно', 'они', 'мы', 'вы', 'я', 'ты', 'его', 'её', 'их', 'наш',
  'который', 'которая', 'которое', 'которые', 'этот', 'эта', 'эти', 'тот', 'та',
  'быть', 'был', 'была', 'было', 'были', 'есть', 'будет', 'будут',
  'можно', 'нужно', 'надо', 'должен', 'может', 'могут',
  'очень', 'более', 'менее', 'также', 'только', 'уже', 'ещё', 'еще',
  // Английские
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of',
  'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
  'we', 'you', 'he', 'she', 'i', 'my', 'your', 'his', 'her', 'our'
])

/**
 * Извлечение ключевых слов из текста
 */
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\sа-яё]/gi, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word))
}

/**
 * Вычисление TF (Term Frequency)
 */
function computeTF(words: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  const total = words.length
  
  for (const word of words) {
    tf.set(word, (tf.get(word) || 0) + 1)
  }
  
  // Нормализуем
  const keys = Array.from(tf.keys())
  for (const word of keys) {
    const count = tf.get(word) || 0
    tf.set(word, count / total)
  }
  
  return tf
}

/**
 * Вычисление BM25-подобного скора релевантности
 */
function computeRelevanceScore(
  queryKeywords: string[],
  contentKeywords: string[],
  k1: number = 1.5,
  b: number = 0.75
): number {
  if (queryKeywords.length === 0 || contentKeywords.length === 0) {
    return 0
  }
  
  const contentTF = computeTF(contentKeywords)
  const avgDocLength = 200 // средняя длина документа в словах
  const docLength = contentKeywords.length
  
  let score = 0
  
  for (const queryWord of queryKeywords) {
    const tf = contentTF.get(queryWord) || 0
    if (tf > 0) {
      // Упрощённая BM25 формула
      const numerator = tf * (k1 + 1)
      const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength))
      score += numerator / denominator
    }
  }
  
  // Нормализуем к 0-1
  const maxPossibleScore = queryKeywords.length * (k1 + 1) / (1 + k1 * (1 - b))
  return Math.min(score / maxPossibleScore, 1)
}

/**
 * Вычисление Jaccard similarity
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 || set2.size === 0) return 0
  
  let intersection = 0
  const arr1 = Array.from(set1)
  for (const item of arr1) {
    if (set2.has(item)) intersection++
  }
  
  const union = set1.size + set2.size - intersection
  return intersection / union
}

/**
 * Проверка качества контента
 */
function assessContentQuality(content: string): number {
  let quality = 0.5 // базовый скор
  
  // Длина контента
  if (content.length > 500) quality += 0.1
  if (content.length > 1000) quality += 0.1
  if (content.length < 100) quality -= 0.2
  
  // Наличие структуры (списки, заголовки)
  if (/[-•*]\s/.test(content)) quality += 0.05 // списки
  if (/#{1,3}\s/.test(content)) quality += 0.05 // заголовки
  if (/\d+\.\s/.test(content)) quality += 0.05 // нумерованные списки
  
  // Наличие примеров кода
  if (/```[\s\S]*?```/.test(content)) quality += 0.1
  
  // Наличие ссылок
  if (/https?:\/\//.test(content)) quality += 0.05
  
  // Штраф за слишком много спецсимволов (мусор)
  const specialCharsRatio = (content.match(/[^\w\sа-яё.,!?:;()\-]/gi) || []).length / content.length
  if (specialCharsRatio > 0.1) quality -= 0.2
  
  return Math.max(0, Math.min(1, quality))
}

/**
 * Главная функция переранжирования
 */
export function rerankResults(
  results: RankedResult[],
  options: RerankerOptions
): RankedResult[] {
  const { 
    query, 
    topK = 10, 
    minScore = 0.1,
    boostFactors = {
      vector: 1.3,    // Векторный поиск уже релевантен
      wikipedia: 1.2, // Надёжный источник
      arxiv: 1.1,     // Научные статьи
      book: 1.0,      // Книги
      web: 0.9        // Веб менее надёжен
    }
  } = options
  
  if (results.length === 0) return []
  
  const queryKeywords = extractKeywords(query)
  const queryKeywordsSet = new Set(queryKeywords)
  
  // Вычисляем скоры для каждого результата
  const scoredResults = results.map((result, index) => {
    const contentKeywords = extractKeywords(result.content)
    const contentKeywordsSet = new Set(contentKeywords)
    
    // 1. BM25-подобный скор
    const bm25Score = computeRelevanceScore(queryKeywords, contentKeywords)
    
    // 2. Jaccard similarity
    const jaccardScore = jaccardSimilarity(queryKeywordsSet, contentKeywordsSet)
    
    // 3. Качество контента
    const qualityScore = assessContentQuality(result.content)
    
    // 4. Буст по типу источника
    const typeBoost = boostFactors[result.type] || 1.0
    
    // 5. Позиционный буст (первые результаты обычно лучше)
    const positionBoost = 1 - (index * 0.02) // -2% за каждую позицию
    
    // Комбинированный скор
    const combinedScore = (
      bm25Score * 0.4 +
      jaccardScore * 0.2 +
      qualityScore * 0.2 +
      (result.score || 0.5) * 0.2 // оригинальный скор если есть
    ) * typeBoost * Math.max(0.8, positionBoost)
    
    return {
      ...result,
      score: combinedScore,
      originalRank: index
    }
  })
  
  // Сортируем по скору
  scoredResults.sort((a, b) => b.score - a.score)
  
  // Фильтруем по минимальному скору и дедуплицируем
  const seen = new Set<string>()
  const filtered: RankedResult[] = []
  
  for (const result of scoredResults) {
    if (result.score < minScore) continue
    
    // Дедупликация по первым 100 символам
    const contentKey = result.content.slice(0, 100).toLowerCase().replace(/\s+/g, '')
    if (seen.has(contentKey)) continue
    seen.add(contentKey)
    
    filtered.push(result)
    
    if (filtered.length >= topK) break
  }
  
  return filtered
}

/**
 * Форматирование переранжированных результатов для промпта
 */
export function formatRankedResultsForPrompt(
  results: RankedResult[],
  maxLength: number = 4000
): string {
  if (results.length === 0) return ''
  
  const parts: string[] = []
  let currentLength = 0
  
  for (const result of results) {
    const sourceLabel = {
      wikipedia: '📚 Wikipedia',
      arxiv: '🔬 arXiv',
      book: '📖 Книга',
      web: '🌐 Web',
      vector: '💾 База знаний'
    }[result.type] || '📄 Источник'
    
    const entry = `[${sourceLabel}] (релевантность: ${(result.score * 100).toFixed(0)}%)\n${result.content.slice(0, 500)}${result.content.length > 500 ? '...' : ''}\n`
    
    if (currentLength + entry.length > maxLength) break
    
    parts.push(entry)
    currentLength += entry.length
  }
  
  return parts.join('\n---\n')
}
