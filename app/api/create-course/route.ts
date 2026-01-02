/**
 * 🎓 CREATE COURSE API
 * 
 * POST /api/create-course
 * 
 * Генерирует полный курс по любой теме используя цепочку агентов:
 * Analyst → Constructor → Generator
 * 
 * Поддерживает:
 * - Любые темы (programming, scientific, creative, practical, etc.)
 * - Кэширование в Supabase (TTL 1 week)
 * - Streaming progress updates
 * - Rate limiting
 * - Визуальные интерактивные курсы (visual mode)
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  generateCourse, 
  generateVisualCourse,
  validateQuery, 
  sanitizeQuery,
  getCachedCourse,
  cacheCourse,
  generateCacheKey
} from '@/lib/agents'
import { getUsageStats } from '@/lib/llm'
import type {
  VisualIdentity,
  ModuleVisualSpec,
  VisualSection,
  InteractivityLevel
} from '@/lib/agents/types'

// ═══════════════════════════════════════════════════════════════
// 🔧 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const MAX_REQUESTS_PER_HOUR = 10 // Per IP
const requestCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = requestCounts.get(ip)
  
  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + 3600000 }) // 1 hour
    return true
  }
  
  if (record.count >= MAX_REQUESTS_PER_HOUR) {
    return false
  }
  
  record.count++
  return true
}

// ═══════════════════════════════════════════════════════════════
// 📝 REQUEST/RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════

interface CreateCourseRequest {
  query: string
  useCache?: boolean
  visualMode?: boolean // Enable visual interactive course generation
}

interface VisualModuleResponse {
  id: string
  name: string
  description: string
  duration: number
  difficulty: string
  theory: {
    markdown: string
    wordCount: number
  }
  practice: {
    tasksCount: number
    tasks: Array<{
      id: string
      title: string
      description: string
      difficulty: string
      type: string
      points: number
    }>
  }
  // Visual fields (only present in visual mode)
  visualSpec?: ModuleVisualSpec
  sections?: VisualSection[]
}

interface CreateCourseResponse {
  success: boolean
  data?: {
    id: string
    title: string
    subtitle: string
    description: string
    topicType: string
    difficulty: string
    totalDuration: number
    modulesCount: number
    objectives: string[]
    modules: VisualModuleResponse[]
    metadata: {
      generatedAt: string
      generationTime: number
      cached: boolean
      ragSourcesUsed: number
      // Visual metadata (only present in visual mode)
      visualIdentity?: VisualIdentity
      interactivityLevel?: InteractivityLevel
    }
  }
  error?: string
  usage?: {
    requestsToday: number
    tokensToday: number
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 POST HANDLER
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest): Promise<NextResponse<CreateCourseResponse>> {
  const startTime = Date.now()
  
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown'
    
    // Check rate limit
    if (!checkRateLimit(ip)) {
      return NextResponse.json({
        success: false,
        error: 'Превышен лимит запросов. Попробуйте через час.'
      }, { status: 429 })
    }
    
    // Parse request body
    const body: CreateCourseRequest = await request.json()
    const { query, useCache = true, visualMode = false } = body
    
    // Validate query
    const validation = validateQuery(query)
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error
      }, { status: 400 })
    }
    
    // Sanitize query
    const sanitizedQuery = sanitizeQuery(query)
    
    console.log(`[API] Creating ${visualMode ? 'VISUAL ' : ''}course for: "${sanitizedQuery}"`)
    
    // Check cache first (with visual mode suffix)
    const cacheKey = visualMode ? `${sanitizedQuery}:visual` : sanitizedQuery
    if (useCache) {
      const cached = await getCachedCourse(cacheKey)
      if (cached) {
        console.log('[API] Returning cached course')
        return NextResponse.json({
          success: true,
          data: formatCourseResponse(cached, true, visualMode),
          usage: getUsageStats()
        })
      }
    }
    
    // Generate new course (visual or standard)
    const result = visualMode 
      ? await generateVisualCourse(sanitizedQuery)
      : await generateCourse(sanitizedQuery)
    
    if (!result.success || !result.course) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Не удалось сгенерировать курс'
      }, { status: 500 })
    }
    
    // Cache the result
    if (useCache) {
      await cacheCourse(cacheKey, result.course).catch(err => {
        console.error('[API] Failed to cache course:', err)
      })
    }
    
    // Format response based on mode
    const response: CreateCourseResponse = visualMode
      ? formatVisualCourseResponse(result, startTime)
      : formatStandardCourseResponse(result, startTime)
    
    console.log(`[API] ${visualMode ? 'Visual ' : ''}Course created in ${Date.now() - startTime}ms`)
    
    return NextResponse.json(response)
    
  } catch (error: any) {
    console.error('[API] Create course error:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Внутренняя ошибка сервера'
    }, { status: 500 })
  }
}

// ═══════════════════════════════════════════════════════════════
// 📊 GET HANDLER - Usage Stats
// ═══════════════════════════════════════════════════════════════

export async function GET(): Promise<NextResponse> {
  const usage = getUsageStats()
  
  return NextResponse.json({
    success: true,
    usage,
    limits: {
      requestsPerHour: MAX_REQUESTS_PER_HOUR,
      groqDailyRequests: 14400,
      groqDailyTokens: 500000
    }
  })
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Format standard course response
 */
function formatStandardCourseResponse(result: any, startTime: number): CreateCourseResponse {
  return {
    success: true,
    data: {
      id: generateCacheKey(result.course.analysis.query),
      title: result.course.structure.title,
      subtitle: result.course.structure.subtitle,
      description: result.course.structure.description,
      topicType: result.course.analysis.type,
      difficulty: result.course.analysis.difficulty,
      totalDuration: result.course.structure.totalDuration,
      modulesCount: result.course.structure.modules.length,
      objectives: result.course.structure.objectives,
      modules: result.course.modules.map((m: any, i: number) => ({
        id: m.moduleId,
        name: result.course.structure.modules[i].name,
        description: result.course.structure.modules[i].description,
        duration: result.course.structure.modules[i].duration,
        difficulty: result.course.structure.modules[i].difficulty,
        theory: {
          markdown: m.theory.markdown,
          wordCount: m.theory.wordCount
        },
        practice: {
          tasksCount: m.practice.tasks.length,
          tasks: m.practice.tasks.map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            difficulty: t.difficulty,
            type: t.type,
            points: t.points
          }))
        }
      })),
      metadata: {
        generatedAt: new Date().toISOString(),
        generationTime: result.generationTime || (Date.now() - startTime),
        cached: false,
        ragSourcesUsed: result.course.analysis.metadata.ragSourcesUsed
      }
    },
    usage: getUsageStats()
  }
}

/**
 * Format visual course response with visual identity and sections
 */
function formatVisualCourseResponse(result: any, startTime: number): CreateCourseResponse {
  const course = result.course
  const structure = course.structure
  
  return {
    success: true,
    data: {
      id: generateCacheKey(course.analysis.query),
      title: structure.title,
      subtitle: structure.subtitle,
      description: structure.description,
      topicType: course.analysis.type,
      difficulty: course.analysis.difficulty,
      totalDuration: structure.totalDuration,
      modulesCount: structure.modules.length,
      objectives: structure.objectives,
      modules: course.modules.map((m: any, i: number) => {
        const structModule = structure.modules[i]
        return {
          id: m.moduleId,
          name: structModule.name,
          description: structModule.description,
          duration: structModule.duration,
          difficulty: structModule.difficulty,
          theory: {
            markdown: m.theory.markdown,
            wordCount: m.theory.wordCount
          },
          practice: {
            tasksCount: m.practice.tasks.length,
            tasks: m.practice.tasks.map((t: any) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              difficulty: t.difficulty,
              type: t.type,
              points: t.points
            }))
          },
          // Visual fields
          visualSpec: m.visualSpec || structModule.visualSpec,
          sections: m.sections || []
        }
      }),
      metadata: {
        generatedAt: new Date().toISOString(),
        generationTime: result.generationTime || (Date.now() - startTime),
        cached: false,
        ragSourcesUsed: course.analysis.metadata.ragSourcesUsed,
        // Visual metadata
        visualIdentity: structure.metadata?.visualIdentity,
        interactivityLevel: structure.metadata?.interactivityLevel
      }
    },
    usage: getUsageStats()
  }
}

function formatCourseResponse(cached: any, isCached: boolean, visualMode: boolean = false): CreateCourseResponse['data'] {
  // Format cached course to match response structure
  const baseResponse = {
    id: cached.id,
    title: cached.structure?.title || cached.title,
    subtitle: cached.structure?.subtitle || '',
    description: cached.structure?.description || '',
    topicType: cached.analysis?.type || 'programming',
    difficulty: cached.analysis?.difficulty || 'intermediate',
    totalDuration: cached.structure?.totalDuration || 60,
    modulesCount: cached.modules?.length || 0,
    objectives: cached.structure?.objectives || [],
    modules: (cached.modules || []).map((m: any, i: number) => {
      const moduleResponse: VisualModuleResponse = {
        id: m.moduleId || `module-${i + 1}`,
        name: cached.structure?.modules?.[i]?.name || `Module ${i + 1}`,
        description: cached.structure?.modules?.[i]?.description || '',
        duration: cached.structure?.modules?.[i]?.duration || 10,
        difficulty: cached.structure?.modules?.[i]?.difficulty || 'intermediate',
        theory: {
          markdown: m.theory?.markdown || '',
          wordCount: m.theory?.wordCount || 0
        },
        practice: {
          tasksCount: m.practice?.tasks?.length || 0,
          tasks: (m.practice?.tasks || []).map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            difficulty: t.difficulty,
            type: t.type,
            points: t.points
          }))
        }
      }
      
      // Add visual fields if in visual mode
      if (visualMode) {
        moduleResponse.visualSpec = m.visualSpec || cached.structure?.modules?.[i]?.visualSpec
        moduleResponse.sections = m.sections || []
      }
      
      return moduleResponse
    }),
    metadata: {
      generatedAt: cached.createdAt || new Date().toISOString(),
      generationTime: 0,
      cached: isCached,
      ragSourcesUsed: cached.analysis?.metadata?.ragSourcesUsed || 0,
      // Visual metadata if in visual mode
      ...(visualMode && {
        visualIdentity: cached.structure?.metadata?.visualIdentity,
        interactivityLevel: cached.structure?.metadata?.interactivityLevel
      })
    }
  }
  
  return baseResponse
}
