/**
 * AI CACHE SYSTEM - LRU кэш для сгенерированного контента
 * 
 * Включает:
 * - LRU кэш с TTL
 * - Валидация контента перед кэшированием
 * - Умные функции setCachedLessonSmart / setCachedTasksSmart
 */

import { 
  validateTheoryContent, 
  validateTasks, 
  canCacheContent, 
  canCacheTasks,
  type ValidationResult 
} from './ai/validators/content-validator'

interface CacheEntry<T> {
  data: T
  timestamp: number
  hits: number
}

class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private maxSize: number
  private ttlMs: number

  constructor(maxSize = 100, ttlMs = 1000 * 60 * 60 * 12) {
    this.maxSize = maxSize
    this.ttlMs = ttlMs
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.ttlMs
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return null
    }
    entry.hits++
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.data
  }

  set(key: string, data: T): void {
    if (this.cache.has(key)) this.cache.delete(key)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) this.cache.delete(firstKey)
    }
    this.cache.set(key, { data, timestamp: Date.now(), hits: 0 })
  }

  getStats() {
    let totalHits = 0
    this.cache.forEach(e => { totalHits += e.hits })
    return { size: this.cache.size, maxSize: this.maxSize, hitRate: this.cache.size > 0 ? totalHits / this.cache.size : 0 }
  }

  clear(): void { this.cache.clear() }
}

function generateCacheKey(topic: string, courseName: string, type: string): string {
  const normalized = `${topic.toLowerCase().trim()}:${courseName.toLowerCase().trim()}:${type}`
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i)
    hash = hash & hash
  }
  return `${type}_${Math.abs(hash).toString(36)}`
}

// Глобальные кэши
export const lessonCache = new LRUCache<string>(50, 1000 * 60 * 60 * 12)
export const tasksCache = new LRUCache<any[]>(100, 1000 * 60 * 60 * 6)
export const analysisCache = new LRUCache<any>(200, 1000 * 60 * 60 * 24)

export function getCachedLesson(topic: string, courseName: string): string | null {
  return lessonCache.get(generateCacheKey(topic, courseName, 'lesson'))
}

export function setCachedLesson(topic: string, courseName: string, content: string): void {
  lessonCache.set(generateCacheKey(topic, courseName, 'lesson'), content)
}

export function getCachedTasks(topic: string, courseName: string): any[] | null {
  return tasksCache.get(generateCacheKey(topic, courseName, 'tasks'))
}

export function setCachedTasks(topic: string, courseName: string, tasks: any[]): void {
  tasksCache.set(generateCacheKey(topic, courseName, 'tasks'), tasks)
}

export function getCachedAnalysis(topic: string, courseName: string): any | null {
  return analysisCache.get(generateCacheKey(topic, courseName, 'analysis'))
}

export function setCachedAnalysis(topic: string, courseName: string, analysis: any): void {
  analysisCache.set(generateCacheKey(topic, courseName, 'analysis'), analysis)
}

export function getCacheStats() {
  return { lessons: lessonCache.getStats(), tasks: tasksCache.getStats(), analysis: analysisCache.getStats() }
}

export function clearAllCaches(): void {
  lessonCache.clear()
  tasksCache.clear()
  analysisCache.clear()
}

// ==================== УМНОЕ КЭШИРОВАНИЕ С ВАЛИДАЦИЕЙ ====================

export interface SmartCacheResult {
  cached: boolean
  validation: ValidationResult
}

/**
 * Умное кэширование урока с валидацией
 * Кэширует только если контент прошёл проверку качества
 */
export function setCachedLessonSmart(
  topic: string, 
  courseName: string, 
  content: string,
  domain?: string
): SmartCacheResult {
  // Быстрая проверка
  if (!canCacheContent(content)) {
    return {
      cached: false,
      validation: {
        isValid: false,
        score: 0,
        issues: ['Контент не прошёл быструю проверку (длина или структура)'],
        suggestions: ['Проверить генерацию контента']
      }
    }
  }

  // Полная валидация
  const validation = validateTheoryContent(content, domain)
  
  if (validation.isValid) {
    setCachedLesson(topic, courseName, content)
    console.log(`[SmartCache] ✅ Lesson cached: "${topic}" (score: ${validation.score})`)
  } else {
    console.warn(`[SmartCache] ❌ Lesson NOT cached: "${topic}"`)
    console.warn(`[SmartCache] Issues:`, validation.issues)
  }
  
  return { cached: validation.isValid, validation }
}

/**
 * Умное кэширование заданий с валидацией
 * Кэширует только если задания прошли проверку
 */
export function setCachedTasksSmart(
  topic: string,
  courseName: string,
  tasks: unknown[]
): SmartCacheResult {
  // Быстрая проверка
  if (!canCacheTasks(tasks)) {
    return {
      cached: false,
      validation: {
        isValid: false,
        score: 0,
        issues: ['Задания не прошли быструю проверку'],
        suggestions: ['Проверить генерацию заданий']
      }
    }
  }

  // Полная валидация
  const validation = validateTasks(tasks)
  
  if (validation.isValid) {
    setCachedTasks(topic, courseName, tasks as any[])
    console.log(`[SmartCache] ✅ Tasks cached: "${topic}" (${tasks.length} tasks, score: ${validation.score})`)
  } else {
    console.warn(`[SmartCache] ❌ Tasks NOT cached: "${topic}"`)
    console.warn(`[SmartCache] Issues:`, validation.issues)
  }
  
  return { cached: validation.isValid, validation }
}

/**
 * Получить статистику валидации для отладки
 */
export function validateAndReport(
  content: string,
  tasks: unknown[],
  topic: string
): { theory: ValidationResult; tasks: ValidationResult } {
  const theoryValidation = validateTheoryContent(content)
  const tasksValidation = validateTasks(tasks)
  
  console.log(`\n[Validation Report] Topic: "${topic}"`)
  console.log(`  Theory: ${theoryValidation.score}/100 (${theoryValidation.isValid ? 'PASS' : 'FAIL'})`)
  if (theoryValidation.issues.length > 0) {
    theoryValidation.issues.forEach(i => console.log(`    - ${i}`))
  }
  console.log(`  Tasks: ${tasksValidation.score}/100 (${tasksValidation.isValid ? 'PASS' : 'FAIL'})`)
  if (tasksValidation.issues.length > 0) {
    tasksValidation.issues.forEach(i => console.log(`    - ${i}`))
  }
  
  return { theory: theoryValidation, tasks: tasksValidation }
}
