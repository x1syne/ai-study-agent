/**
 * RAG Cache Module
 * Двухуровневое кэширование: память + Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ==================== ТИПЫ ====================

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // время жизни в мс
}

interface CacheOptions {
  ttl?: number // время жизни в мс (по умолчанию 1 час)
  persistent?: boolean // сохранять в Supabase
}

// ==================== IN-MEMORY CACHE ====================

const memoryCache = new Map<string, CacheEntry<any>>()

// Очистка устаревших записей каждые 5 минут
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now()
    const keys = Array.from(memoryCache.keys())
    for (const key of keys) {
      const entry = memoryCache.get(key)
      if (entry && now > entry.timestamp + entry.ttl) {
        memoryCache.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

// ==================== SUPABASE CACHE ====================

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) return null
  
  _supabase = createClient(url, key)
  return _supabase
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Генерация ключа кэша
 */
export function cacheKey(prefix: string, ...parts: string[]): string {
  const normalized = parts.map(p => p.toLowerCase().trim()).join(':')
  return `${prefix}:${normalized}`
}

/**
 * Получение из кэша
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  // 1. Проверяем память
  const memEntry = memoryCache.get(key)
  if (memEntry) {
    if (Date.now() < memEntry.timestamp + memEntry.ttl) {
      console.log(`[Cache] HIT (memory): ${key}`)
      return memEntry.data as T
    }
    memoryCache.delete(key)
  }
  
  // 2. Проверяем Supabase
  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('rag_cache')
        .select('data, expires_at')
        .eq('key', key)
        .single()
      
      if (!error && data && new Date(data.expires_at) > new Date()) {
        console.log(`[Cache] HIT (supabase): ${key}`)
        // Сохраняем в память для быстрого доступа
        memoryCache.set(key, {
          data: data.data,
          timestamp: Date.now(),
          ttl: 60 * 60 * 1000 // 1 час в памяти
        })
        return data.data as T
      }
    } catch (e) {
      // Игнорируем ошибки кэша
    }
  }
  
  console.log(`[Cache] MISS: ${key}`)
  return null
}

/**
 * Сохранение в кэш
 */
export async function cacheSet<T>(
  key: string, 
  data: T, 
  options: CacheOptions = {}
): Promise<void> {
  const { ttl = 60 * 60 * 1000, persistent = true } = options // 1 час по умолчанию
  
  // 1. Сохраняем в память
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
  
  // 2. Сохраняем в Supabase (если нужно)
  if (persistent) {
    const supabase = getSupabase()
    if (supabase) {
      try {
        const expiresAt = new Date(Date.now() + ttl).toISOString()
        
        await supabase
          .from('rag_cache')
          .upsert({
            key,
            data,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
      } catch (e) {
        // Игнорируем ошибки кэша
      }
    }
  }
}

/**
 * Удаление из кэша
 */
export async function cacheDelete(key: string): Promise<void> {
  memoryCache.delete(key)
  
  const supabase = getSupabase()
  if (supabase) {
    try {
      await supabase.from('rag_cache').delete().eq('key', key)
    } catch (e) {
      // Игнорируем
    }
  }
}

/**
 * Очистка устаревших записей в Supabase
 */
export async function cacheCleanup(): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0
  
  try {
    const { error } = await supabase
      .from('rag_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
    
    return error ? 0 : 1
  } catch (e) {
    return 0
  }
}

// ==================== ХЕЛПЕРЫ ДЛЯ RAG ====================

// TTL для разных типов данных
export const CACHE_TTL = {
  WIKIPEDIA: 24 * 60 * 60 * 1000,    // 24 часа
  ARXIV: 7 * 24 * 60 * 60 * 1000,    // 7 дней (научные статьи редко меняются)
  WEB_SEARCH: 6 * 60 * 60 * 1000,    // 6 часов
  BOOKS: 30 * 24 * 60 * 60 * 1000,   // 30 дней
  EMBEDDINGS: 24 * 60 * 60 * 1000,   // 24 часа
  RAG_CONTEXT: 60 * 60 * 1000,       // 1 час (полный контекст)
  VECTOR_SEARCH: 2 * 60 * 60 * 1000, // 2 часа (векторный/гибридный поиск)
}

/**
 * Обёртка для кэширования функций
 */
export async function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  // Пробуем получить из кэша
  const cached = await cacheGet<T>(key)
  if (cached !== null) {
    return cached
  }
  
  // Выполняем функцию
  const result = await fn()
  
  // Сохраняем в кэш (только если результат не пустой)
  if (result !== null && result !== undefined) {
    await cacheSet(key, result, options)
  }
  
  return result
}
