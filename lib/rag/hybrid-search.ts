/**
 * Hybrid Search Module
 * Комбинированный поиск: векторный (семантика) + keyword (точные термины)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { generateEmbedding, DocumentChunk } from '../embeddings'
import { withCache, cacheKey, CACHE_TTL } from './cache'

let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) return null
  
  _supabase = createClient(url, key)
  return _supabase
}

export interface HybridSearchResult {
  id: string
  content: string
  metadata: Record<string, any>
  score: number
  vectorScore: number
  keywordScore: number
}

export interface HybridSearchOptions {
  limit?: number
  vectorWeight?: number
  keywordWeight?: number
  threshold?: number
  topic?: string
}

/**
 * Keyword поиск (полнотекстовый)
 */
export async function searchKeyword(
  query: string,
  options: { limit?: number } = {}
): Promise<DocumentChunk[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  
  const { limit = 10 } = options
  
  try {
    const { data, error } = await supabase.rpc('search_documents_keyword', {
      search_query: query,
      match_count: limit
    })
    
    if (error) {
      // Функция не существует — нужно выполнить миграцию
      if (error.code === '42883') {
        console.warn('[Hybrid] Keyword search not configured. Run add_hybrid_search.sql')
        return []
      }
      console.error('[Hybrid] Keyword search error:', error)
      return []
    }
    
    return (data || []).map((doc: any) => ({
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata,
      similarity: doc.rank
    }))
  } catch (e) {
    console.error('[Hybrid] Keyword search error:', e)
    return []
  }
}


/**
 * Гибридный поиск (векторный + keyword)
 * Использует SQL функцию hybrid_search
 */
export async function hybridSearch(
  query: string,
  options: HybridSearchOptions = {}
): Promise<HybridSearchResult[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  
  const {
    limit = 10,
    vectorWeight = 0.7,
    keywordWeight = 0.3,
    threshold = 0.3
  } = options
  
  const key = cacheKey('hybrid', query, String(limit), String(vectorWeight))
  
  return withCache(key, async () => {
    try {
      // Генерируем эмбеддинг для векторного поиска
      const embedding = await generateEmbedding(query)
      
      const { data, error } = await supabase.rpc('hybrid_search', {
        query_text: query,
        query_embedding: embedding,
        match_count: limit,
        vector_weight: vectorWeight,
        keyword_weight: keywordWeight,
        match_threshold: threshold
      })
      
      if (error) {
        // Функция не существует — fallback на обычный поиск
        if (error.code === '42883') {
          console.warn('[Hybrid] hybrid_search not configured. Run add_hybrid_search.sql')
          return fallbackSearch(query, options)
        }
        console.error('[Hybrid] Search error:', error)
        return fallbackSearch(query, options)
      }
      
      return (data || []).map((doc: any) => ({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata || {},
        score: doc.score,
        vectorScore: doc.vector_score,
        keywordScore: doc.keyword_score
      }))
    } catch (e) {
      console.error('[Hybrid] Search error:', e)
      return fallbackSearch(query, options)
    }
  }, { ttl: CACHE_TTL.VECTOR_SEARCH })
}

/**
 * Fallback: простое объединение результатов
 * Используется если SQL функция не настроена
 */
async function fallbackSearch(
  query: string,
  options: HybridSearchOptions = {}
): Promise<HybridSearchResult[]> {
  const { limit = 10, vectorWeight = 0.7, keywordWeight = 0.3 } = options
  
  // Импортируем динамически чтобы избежать циклических зависимостей
  const { searchSimilar } = await import('../embeddings')
  
  // Параллельно: векторный + keyword
  const [vectorResults, keywordResults] = await Promise.all([
    searchSimilar(query, { limit: limit * 2, threshold: 0.3 }),
    searchKeyword(query, { limit: limit * 2 })
  ])
  
  // Объединяем результаты
  const resultsMap = new Map<string, HybridSearchResult>()
  
  // Добавляем векторные результаты
  for (const doc of vectorResults) {
    if (doc.id) {
      resultsMap.set(doc.id, {
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        score: (doc.similarity || 0) * vectorWeight,
        vectorScore: doc.similarity || 0,
        keywordScore: 0
      })
    }
  }
  
  // Добавляем/обновляем keyword результаты
  for (const doc of keywordResults) {
    if (doc.id) {
      const existing = resultsMap.get(doc.id)
      if (existing) {
        existing.keywordScore = doc.similarity || 0
        existing.score += (doc.similarity || 0) * keywordWeight
      } else {
        resultsMap.set(doc.id, {
          id: doc.id,
          content: doc.content,
          metadata: doc.metadata,
          score: (doc.similarity || 0) * keywordWeight,
          vectorScore: 0,
          keywordScore: doc.similarity || 0
        })
      }
    }
  }
  
  // Сортируем по score и возвращаем top N
  return Array.from(resultsMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/**
 * Умный поиск: выбирает лучшую стратегию
 */
export async function smartSearch(
  query: string,
  options: HybridSearchOptions = {}
): Promise<HybridSearchResult[]> {
  // Определяем тип запроса
  const hasCode = /[{}\[\]();=<>]|function|const|let|var|import|export/.test(query)
  const hasExactTerms = /["'].*["']/.test(query)
  const isShortQuery = query.split(/\s+/).length <= 2
  
  // Для кода и точных терминов — больше веса keyword
  if (hasCode || hasExactTerms) {
    return hybridSearch(query, { ...options, vectorWeight: 0.4, keywordWeight: 0.6 })
  }
  
  // Для коротких запросов — больше веса keyword
  if (isShortQuery) {
    return hybridSearch(query, { ...options, vectorWeight: 0.5, keywordWeight: 0.5 })
  }
  
  // По умолчанию — больше веса семантике
  return hybridSearch(query, options)
}
