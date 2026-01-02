/**
 * 💾 MEDIA CACHE
 * 
 * Кэширование медиа-контента для визуальных курсов:
 * - Генерация hash для промптов
 * - Кэширование в Supabase
 * - TTL 30 дней
 * - Hit count tracking
 */

import { createHash } from 'crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ═══════════════════════════════════════════════════════════════
// 🔌 SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════

let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn('[MediaCache] Supabase credentials not set')
    return null
  }

  supabaseClient = createClient(url, key)
  return supabaseClient
}

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

export type MediaType = 'image' | 'diagram' | 'chart' | 'video_embed'

export interface CachedMedia {
  id: string
  promptHash: string
  mediaType: MediaType
  contentUrl?: string
  contentData?: string
  createdAt: string
  expiresAt: string
  hitCount: number
}

export interface MediaCacheEntry {
  prompt: string
  type: MediaType
  url?: string
  data?: string
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HASH GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Генерирует hash для медиа-промпта
 * Используется для идентификации кэшированного контента
 */
export function generateMediaHash(prompt: string, type: MediaType): string {
  const normalized = prompt.toLowerCase().trim().replace(/\s+/g, ' ')
  const input = `${type}:${normalized}`
  
  return createHash('sha256')
    .update(input)
    .digest('hex')
    .substring(0, 32) // Используем первые 32 символа
}

/**
 * Валидирует hash
 */
export function isValidHash(hash: string): boolean {
  return /^[a-f0-9]{32}$/.test(hash)
}

// ═══════════════════════════════════════════════════════════════
// 💾 CACHE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * TTL для кэша в миллисекундах (30 дней)
 */
export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Вычисляет дату истечения кэша
 */
export function calculateExpiresAt(createdAt: Date = new Date()): Date {
  return new Date(createdAt.getTime() + CACHE_TTL_MS)
}

/**
 * Проверяет, истёк ли кэш
 */
export function isCacheExpired(expiresAt: string | Date): boolean {
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt
  return expiry.getTime() < Date.now()
}

/**
 * Кэширует медиа-контент
 */
export async function cacheMedia(
  prompt: string,
  type: MediaType,
  content: { url?: string; data?: string }
): Promise<CachedMedia | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return null
    
    const hash = generateMediaHash(prompt, type)
    const now = new Date()
    const expiresAt = calculateExpiresAt(now)
    
    const entry: Omit<CachedMedia, 'id'> = {
      promptHash: hash,
      mediaType: type,
      contentUrl: content.url,
      contentData: content.data,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      hitCount: 0
    }
    
    const { data, error } = await supabase
      .from('media_cache')
      .upsert({
        prompt_hash: entry.promptHash,
        media_type: entry.mediaType,
        content_url: entry.contentUrl,
        content_data: entry.contentData,
        created_at: entry.createdAt,
        expires_at: entry.expiresAt,
        hit_count: entry.hitCount
      }, {
        onConflict: 'prompt_hash'
      })
      .select()
      .single()
    
    if (error) {
      console.error('[MediaCache] Cache error:', error)
      return null
    }
    
    return {
      id: data.id,
      promptHash: data.prompt_hash,
      mediaType: data.media_type,
      contentUrl: data.content_url,
      contentData: data.content_data,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      hitCount: data.hit_count
    }
  } catch (error) {
    console.error('[MediaCache] Cache error:', error)
    return null
  }
}

/**
 * Получает кэшированный медиа-контент
 */
export async function getCachedMedia(
  prompt: string,
  type: MediaType
): Promise<CachedMedia | null> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return null
    
    const hash = generateMediaHash(prompt, type)
    
    const { data, error } = await supabase
      .from('media_cache')
      .select('*')
      .eq('prompt_hash', hash)
      .single()
    
    if (error || !data) {
      return null
    }
    
    // Проверяем истечение
    if (isCacheExpired(data.expires_at)) {
      // Удаляем истёкший кэш
      await supabase
        .from('media_cache')
        .delete()
        .eq('prompt_hash', hash)
      return null
    }
    
    // Увеличиваем hit_count
    await supabase
      .from('media_cache')
      .update({ hit_count: data.hit_count + 1 })
      .eq('prompt_hash', hash)
    
    return {
      id: data.id,
      promptHash: data.prompt_hash,
      mediaType: data.media_type,
      contentUrl: data.content_url,
      contentData: data.content_data,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
      hitCount: data.hit_count + 1
    }
  } catch (error) {
    console.error('[MediaCache] Get error:', error)
    return null
  }
}

/**
 * Удаляет кэшированный медиа-контент
 */
export async function deleteCachedMedia(hash: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return false
    
    const { error } = await supabase
      .from('media_cache')
      .delete()
      .eq('prompt_hash', hash)
    
    return !error
  } catch (error) {
    console.error('[MediaCache] Delete error:', error)
    return false
  }
}

/**
 * Очищает истёкший кэш
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return 0
    
    const { data, error } = await supabase
      .from('media_cache')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id')
    
    if (error) {
      console.error('[MediaCache] Cleanup error:', error)
      return 0
    }
    
    return data?.length || 0
  } catch (error) {
    console.error('[MediaCache] Cleanup error:', error)
    return 0
  }
}

/**
 * Получает статистику кэша
 */
export async function getCacheStats(): Promise<{
  totalEntries: number
  totalHits: number
  byType: Record<MediaType, number>
}> {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) {
      return { totalEntries: 0, totalHits: 0, byType: {} as Record<MediaType, number> }
    }
    
    const { data, error } = await supabase
      .from('media_cache')
      .select('media_type, hit_count')
    
    if (error || !data) {
      return { totalEntries: 0, totalHits: 0, byType: {} as Record<MediaType, number> }
    }
    
    const byType: Record<MediaType, number> = {
      image: 0,
      diagram: 0,
      chart: 0,
      video_embed: 0
    }
    
    let totalHits = 0
    
    for (const entry of data) {
      byType[entry.media_type as MediaType]++
      totalHits += entry.hit_count
    }
    
    return {
      totalEntries: data.length,
      totalHits,
      byType
    }
  } catch (error) {
    console.error('[MediaCache] Stats error:', error)
    return { totalEntries: 0, totalHits: 0, byType: {} as Record<MediaType, number> }
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Кэширует или получает медиа (cache-through pattern)
 */
export async function getOrCacheMedia(
  prompt: string,
  type: MediaType,
  generator: () => Promise<{ url?: string; data?: string }>
): Promise<{ url?: string; data?: string; cached: boolean }> {
  // Пробуем получить из кэша
  const cached = await getCachedMedia(prompt, type)
  
  if (cached) {
    return {
      url: cached.contentUrl,
      data: cached.contentData,
      cached: true
    }
  }
  
  // Генерируем новый контент
  const content = await generator()
  
  // Кэшируем
  await cacheMedia(prompt, type, content)
  
  return {
    ...content,
    cached: false
  }
}
