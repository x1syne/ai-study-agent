/**
 * 💾 COURSE CACHE - Supabase Integration
 * 
 * Кэширование курсов для экономии LLM токенов
 * TTL: 1 неделя
 * 
 * Экономия: 50-70% запросов через кэширование
 * 
 * Supabase free tier:
 * - 500K rows
 * - 5GB storage
 * - Хватит на ~10K курсов
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { 
  TopicAnalysisResult, 
  CourseStructure, 
  GeneratedModuleContent 
} from './agents/types'

// ═══════════════════════════════════════════════════════════════
// 🔧 TYPES
// ═══════════════════════════════════════════════════════════════

export interface CachedCourse {
  id: string
  query: string
  query_hash: string
  analysis: TopicAnalysisResult
  structure: CourseStructure
  modules: GeneratedModuleContent[]
  created_at: string
  expires_at: string
  access_count: number
  last_accessed_at: string
}

interface CacheStats {
  totalCourses: number
  hitRate: number
  savedTokens: number
}

// ═══════════════════════════════════════════════════════════════
// 🔌 SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════

let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.warn('[Cache] Supabase credentials not set')
    return null
  }

  supabaseClient = createClient(url, key)
  return supabaseClient
}

// ═══════════════════════════════════════════════════════════════
// 🔑 HASH GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate cache key from query
 */
export function generateCacheKey(query: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ')
  
  // Simple hash function (djb2)
  let hash = 5381
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash) + normalized.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  
  return `course_${Math.abs(hash).toString(36)}`
}

/**
 * Normalize query for better cache hits
 */
export function normalizeQuery(query: string): string {
  return query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\wа-яё\s]/gi, '') // Remove special chars except cyrillic
}

// ═══════════════════════════════════════════════════════════════
// 💾 CACHE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get cached course by query
 */
export async function getCachedCourse(query: string): Promise<CachedCourse | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const queryHash = generateCacheKey(query)
  const now = new Date().toISOString()

  try {
    const { data, error } = await supabase
      .from('course_cache')
      .select('*')
      .eq('query_hash', queryHash)
      .gt('expires_at', now)
      .single()

    if (error || !data) {
      console.log(`[Cache] Miss for "${query.slice(0, 30)}..."`)
      return null
    }

    // Update access stats
    await supabase
      .from('course_cache')
      .update({
        access_count: (data.access_count || 0) + 1,
        last_accessed_at: now
      })
      .eq('id', data.id)

    console.log(`[Cache] Hit for "${query.slice(0, 30)}..." (accessed ${data.access_count + 1} times)`)
    
    return {
      id: data.id,
      query: data.query,
      query_hash: data.query_hash,
      analysis: data.analysis,
      structure: data.structure,
      modules: data.modules,
      created_at: data.created_at,
      expires_at: data.expires_at,
      access_count: data.access_count + 1,
      last_accessed_at: now
    }
  } catch (error) {
    console.error('[Cache] Get error:', error)
    return null
  }
}

/**
 * Save course to cache
 */
export async function cacheCourse(
  query: string,
  course: {
    analysis: TopicAnalysisResult
    structure: CourseStructure
    modules: GeneratedModuleContent[]
  }
): Promise<boolean> {
  const supabase = getSupabaseClient()
  if (!supabase) {
    console.log('[Cache] Supabase not available, skipping cache')
    return false
  }

  const queryHash = generateCacheKey(query)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week

  try {
    const { error } = await supabase
      .from('course_cache')
      .upsert({
        query_hash: queryHash,
        query: query,
        analysis: course.analysis,
        structure: course.structure,
        modules: course.modules,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        access_count: 0,
        last_accessed_at: now.toISOString()
      }, {
        onConflict: 'query_hash'
      })

    if (error) {
      console.error('[Cache] Save error:', error)
      return false
    }

    console.log(`[Cache] Saved "${query.slice(0, 30)}..." (expires ${expiresAt.toLocaleDateString()})`)
    return true
  } catch (error) {
    console.error('[Cache] Save error:', error)
    return false
  }
}

/**
 * Delete expired cache entries
 */
export async function cleanupExpiredCache(): Promise<number> {
  const supabase = getSupabaseClient()
  if (!supabase) return 0

  const now = new Date().toISOString()

  try {
    const { data, error } = await supabase
      .from('course_cache')
      .delete()
      .lt('expires_at', now)
      .select('id')

    if (error) {
      console.error('[Cache] Cleanup error:', error)
      return 0
    }

    const count = data?.length || 0
    if (count > 0) {
      console.log(`[Cache] Cleaned up ${count} expired entries`)
    }
    return count
  } catch (error) {
    console.error('[Cache] Cleanup error:', error)
    return 0
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<CacheStats | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('course_cache')
      .select('access_count')

    if (error || !data) return null

    const totalCourses = data.length
    const totalAccesses = data.reduce((sum, row) => sum + (row.access_count || 0), 0)
    
    // Estimate: each course generation uses ~10K tokens
    // Each cache hit saves those tokens
    const savedTokens = totalAccesses * 10000

    return {
      totalCourses,
      hitRate: totalCourses > 0 ? totalAccesses / totalCourses : 0,
      savedTokens
    }
  } catch (error) {
    console.error('[Cache] Stats error:', error)
    return null
  }
}

// ═══════════════════════════════════════════════════════════════
// 🗄️ DATABASE SCHEMA
// ═══════════════════════════════════════════════════════════════

/**
 * SQL to create the cache table in Supabase:
 * 
 * CREATE TABLE course_cache (
 *   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
 *   query_hash TEXT UNIQUE NOT NULL,
 *   query TEXT NOT NULL,
 *   analysis JSONB NOT NULL,
 *   structure JSONB NOT NULL,
 *   modules JSONB NOT NULL,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   expires_at TIMESTAMPTZ NOT NULL,
 *   access_count INTEGER DEFAULT 0,
 *   last_accessed_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * CREATE INDEX idx_course_cache_hash ON course_cache(query_hash);
 * CREATE INDEX idx_course_cache_expires ON course_cache(expires_at);
 * 
 * -- Enable RLS
 * ALTER TABLE course_cache ENABLE ROW LEVEL SECURITY;
 * 
 * -- Allow public read
 * CREATE POLICY "Allow public read" ON course_cache
 *   FOR SELECT USING (true);
 * 
 * -- Allow service role write
 * CREATE POLICY "Allow service write" ON course_cache
 *   FOR ALL USING (auth.role() = 'service_role');
 */

export const CACHE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS course_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  query_hash TEXT UNIQUE NOT NULL,
  query TEXT NOT NULL,
  analysis JSONB NOT NULL,
  structure JSONB NOT NULL,
  modules JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_course_cache_hash ON course_cache(query_hash);
CREATE INDEX IF NOT EXISTS idx_course_cache_expires ON course_cache(expires_at);
`
