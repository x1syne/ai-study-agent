/**
 * AI CACHE SYSTEM - LRU кэш для сгенерированного контента
 */

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
