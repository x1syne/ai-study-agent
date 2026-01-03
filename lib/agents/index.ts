/**
 * 🎯 AI COURSE AGENTS - Main Orchestrator
 * 
 * Цепочка агентов: Analyst → Constructor → Generator
 * 
 * Генерирует курсы уровня Harvard/MIT для ЛЮБОЙ темы:
 * - OOP Python → код, примеры, Codewars-задачи
 * - Ядерная физика → формулы, расчёты, симуляции
 * - Кулинария → пошаговые рецепты, таймеры, чек-листы
 * 
 * Использует:
 * - Groq LLM (primary) + HuggingFace (fallback)
 * - Tavily RAG для поиска лучших course outlines
 * - Кэширование в Supabase (TTL 1 week)
 * - Visual mode для интерактивных курсов с геймификацией
 */

import { analyzeTopic } from './analyst'
import { buildCourseStructure } from './constructor'
import { generateAllModules, generateModuleContent } from './generator'
import type {
  TopicAnalysisResult,
  CourseStructure,
  GeneratedModuleContent,
  CachedCourse
} from './types'

// Re-export types
export * from './types'

// Re-export individual agents
export { analyzeTopic } from './analyst'
export { 
  buildCourseStructure, 
  buildCourseStructureWithLessons,
  getAllLessons,
  getLessonById,
  getNextLesson,
  getPreviousLesson
} from './constructor'
export { generateAllModules, generateModuleContent } from './generator'
export { 
  splitModuleIntoLessons, 
  extractKeyTerms, 
  calculateReadingTime 
} from './lesson-generator'

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COURSE GENERATION
// ═══════════════════════════════════════════════════════════════

export interface CourseGenerationResult {
  success: boolean
  course?: {
    analysis: TopicAnalysisResult
    structure: CourseStructure
    modules: GeneratedModuleContent[]
  }
  error?: string
  cached?: boolean
  generationTime?: number
}

export interface GenerationProgress {
  stage: 'analyzing' | 'structuring' | 'generating' | 'complete' | 'error'
  progress: number // 0-100
  message: string
  currentModule?: string
}

/**
 * Generate a complete course from a topic query
 * 
 * @param query - User's topic (e.g., "ООП в Python", "Квантовая физика")
 * @param onProgress - Progress callback
 * @returns Complete course with theory and practice
 * 
 * @example
 * const result = await generateCourse("ООП в Python", (progress) => {
 *   console.log(`${progress.stage}: ${progress.progress}%`)
 * })
 */
export async function generateCourse(
  query: string,
  onProgress?: (progress: GenerationProgress) => void
): Promise<CourseGenerationResult> {
  const startTime = Date.now()
  
  try {
    // ═══════════════════════════════════════════════════════════════
    // STAGE 1: ANALYST - Topic Classification & RAG
    // ═══════════════════════════════════════════════════════════════
    
    onProgress?.({
      stage: 'analyzing',
      progress: 10,
      message: 'Анализируем тему и ищем лучшие источники...'
    })
    
    console.log('[CourseGen] Stage 1: Analyzing topic...')
    const analysis = await analyzeTopic(query)
    
    console.log(`[CourseGen] Analysis complete: type=${analysis.type}, concepts=${analysis.keyConcepts.length}`)
    
    onProgress?.({
      stage: 'analyzing',
      progress: 25,
      message: `Тема: ${analysis.normalizedTopic} (${analysis.type})`
    })
    
    // ═══════════════════════════════════════════════════════════════
    // STAGE 2: CONSTRUCTOR - Course Structure
    // ═══════════════════════════════════════════════════════════════
    
    onProgress?.({
      stage: 'structuring',
      progress: 30,
      message: 'Строим структуру курса...'
    })
    
    console.log('[CourseGen] Stage 2: Building structure...')
    const structure = await buildCourseStructure(analysis)
    
    console.log(`[CourseGen] Structure complete: ${structure.modules.length} modules`)
    
    onProgress?.({
      stage: 'structuring',
      progress: 40,
      message: `Структура: ${structure.modules.length} модулей`
    })
    
    // ═══════════════════════════════════════════════════════════════
    // STAGE 3: GENERATOR - Content Generation
    // ═══════════════════════════════════════════════════════════════
    
    onProgress?.({
      stage: 'generating',
      progress: 45,
      message: 'Генерируем контент модулей...'
    })
    
    console.log('[CourseGen] Stage 3: Generating modules...')
    
    const modules = await generateAllModules(structure, (completed, total) => {
      const progress = 45 + Math.round((completed / total) * 50)
      onProgress?.({
        stage: 'generating',
        progress,
        message: `Генерация модуля ${completed}/${total}`,
        currentModule: structure.modules[completed - 1]?.name
      })
    })
    
    console.log(`[CourseGen] Generation complete: ${modules.length} modules`)
    
    // ═══════════════════════════════════════════════════════════════
    // COMPLETE
    // ═══════════════════════════════════════════════════════════════
    
    const generationTime = Date.now() - startTime
    
    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: `Курс готов за ${Math.round(generationTime / 1000)}с`
    })
    
    console.log(`[CourseGen] Course generated in ${generationTime}ms`)
    
    return {
      success: true,
      course: {
        analysis,
        structure,
        modules
      },
      generationTime
    }
    
  } catch (error: any) {
    console.error('[CourseGen] Generation failed:', error)
    
    onProgress?.({
      stage: 'error',
      progress: 0,
      message: `Ошибка: ${error.message}`
    })
    
    return {
      success: false,
      error: error.message || 'Unknown error'
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 💾 CACHING
// ═══════════════════════════════════════════════════════════════

/**
 * Generate cache key from query
 */
export function generateCacheKey(query: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ')
  
  // Simple hash function
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  
  return `course_${Math.abs(hash).toString(36)}`
}

/**
 * Check if course is cached
 */
export async function getCachedCourse(query: string): Promise<CachedCourse | null> {
  const { getCachedCourse: getFromCache } = await import('../cache')
  const cached = await getFromCache(query)
  
  if (cached) {
    return {
      id: cached.id,
      query: cached.query,
      queryHash: cached.query_hash,
      analysis: cached.analysis,
      structure: cached.structure,
      modules: cached.modules,
      createdAt: cached.created_at,
      expiresAt: cached.expires_at,
      accessCount: cached.access_count,
      lastAccessedAt: cached.last_accessed_at
    }
  }
  
  return null
}

/**
 * Save course to cache
 */
export async function cacheCourse(
  query: string,
  course: CourseGenerationResult['course']
): Promise<void> {
  if (!course) return
  
  const { cacheCourse: saveToCache } = await import('../cache')
  await saveToCache(query, course)
}

// ═══════════════════════════════════════════════════════════════
// 🔧 UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Estimate generation time based on topic complexity
 */
export function estimateGenerationTime(query: string): number {
  const wordCount = query.split(/\s+/).length
  const baseTime = 30 // seconds
  const perWordTime = 2 // seconds per word
  
  return baseTime + (wordCount * perWordTime)
}

/**
 * Validate query before generation
 */
export function validateQuery(query: string): { valid: boolean; error?: string } {
  if (!query || query.trim().length === 0) {
    return { valid: false, error: 'Запрос не может быть пустым' }
  }
  
  if (query.length < 3) {
    return { valid: false, error: 'Запрос слишком короткий' }
  }
  
  if (query.length > 500) {
    return { valid: false, error: 'Запрос слишком длинный (макс. 500 символов)' }
  }
  
  // Check for potentially harmful content
  const harmfulPatterns = /hack|crack|exploit|malware|virus|ddos|injection/i
  if (harmfulPatterns.test(query)) {
    return { valid: false, error: 'Запрос содержит недопустимый контент' }
  }
  
  return { valid: true }
}

/**
 * Sanitize user input
 */
export function sanitizeQuery(query: string): string {
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .slice(0, 500) // Limit length
}
