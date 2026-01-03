/**
 * 📊 PROGRESS TRACKER - Track user progress through courses
 * 
 * Сохраняет и загружает прогресс пользователя:
 * - localStorage для неавторизованных
 * - API/DB для авторизованных
 * - Синхронизация при авторизации
 */

import type { 
  LessonStatus, 
  CourseProgress, 
  ModuleProgress, 
  LessonProgress 
} from './agents/types'

// ═══════════════════════════════════════════════════════════════
// 🔧 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'course_progress'
const STORAGE_VERSION = 1

// ═══════════════════════════════════════════════════════════════
// 📝 LOCAL STORAGE TYPES
// ═══════════════════════════════════════════════════════════════

interface LocalProgressData {
  version: number
  courses: {
    [courseId: string]: {
      lastAccessed: string
      lastLessonId: string
      lessons: {
        [lessonId: string]: {
          status: LessonStatus
          completedAt?: string
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 💾 LOCAL STORAGE OPERATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get progress data from localStorage
 */
function getLocalProgress(): LocalProgressData {
  if (typeof window === 'undefined') {
    return { version: STORAGE_VERSION, courses: {} }
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return { version: STORAGE_VERSION, courses: {} }
    }
    
    const data = JSON.parse(stored) as LocalProgressData
    
    // Migration if needed
    if (data.version !== STORAGE_VERSION) {
      return migrateLocalProgress(data)
    }
    
    return data
  } catch (error) {
    console.error('[ProgressTracker] Failed to read localStorage:', error)
    return { version: STORAGE_VERSION, courses: {} }
  }
}

/**
 * Save progress data to localStorage
 */
function setLocalProgress(data: LocalProgressData): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('[ProgressTracker] Failed to write localStorage:', error)
    
    // Try to clear old data if storage is full
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      clearOldProgress(data)
    }
  }
}

/**
 * Migrate old progress data format
 */
function migrateLocalProgress(data: LocalProgressData): LocalProgressData {
  // For now, just update version
  return { ...data, version: STORAGE_VERSION }
}

/**
 * Clear old progress to free up space
 */
function clearOldProgress(data: LocalProgressData): void {
  const courseIds = Object.keys(data.courses)
  
  // Sort by last accessed, remove oldest half
  const sorted = courseIds.sort((a, b) => {
    const aTime = new Date(data.courses[a].lastAccessed).getTime()
    const bTime = new Date(data.courses[b].lastAccessed).getTime()
    return aTime - bTime
  })
  
  const toRemove = sorted.slice(0, Math.ceil(sorted.length / 2))
  toRemove.forEach(id => delete data.courses[id])
  
  setLocalProgress(data)
}

// ═══════════════════════════════════════════════════════════════
// 📊 PROGRESS TRACKER API
// ═══════════════════════════════════════════════════════════════

/**
 * Save lesson progress
 */
export async function saveLessonProgress(
  userId: string | null,
  courseId: string,
  lessonId: string,
  status: LessonStatus
): Promise<void> {
  console.log(`[ProgressTracker] Saving progress: ${lessonId} -> ${status}`)
  
  // Always save to localStorage first
  const localData = getLocalProgress()
  
  if (!localData.courses[courseId]) {
    localData.courses[courseId] = {
      lastAccessed: new Date().toISOString(),
      lastLessonId: lessonId,
      lessons: {}
    }
  }
  
  localData.courses[courseId].lastAccessed = new Date().toISOString()
  localData.courses[courseId].lastLessonId = lessonId
  localData.courses[courseId].lessons[lessonId] = {
    status,
    completedAt: status === 'completed' ? new Date().toISOString() : undefined
  }
  
  setLocalProgress(localData)
  
  // If user is logged in, also save to API
  if (userId) {
    try {
      await saveProgressToAPI(userId, courseId, lessonId, status)
    } catch (error) {
      console.error('[ProgressTracker] Failed to save to API:', error)
      // Progress is still saved locally, will sync later
    }
  }
}

/**
 * Load course progress
 */
export async function loadCourseProgress(
  userId: string | null,
  courseId: string,
  moduleIds: string[],
  lessonsByModule: Record<string, string[]>
): Promise<CourseProgress> {
  console.log(`[ProgressTracker] Loading progress for course: ${courseId}`)
  
  // Try to load from API first if user is logged in
  if (userId) {
    try {
      const apiProgress = await loadProgressFromAPI(userId, courseId)
      if (apiProgress) {
        return apiProgress
      }
    } catch (error) {
      console.error('[ProgressTracker] Failed to load from API:', error)
    }
  }
  
  // Fall back to localStorage
  const localData = getLocalProgress()
  const courseData = localData.courses[courseId]
  
  if (!courseData) {
    // Return empty progress
    return createEmptyProgress(courseId, moduleIds, lessonsByModule)
  }
  
  // Build progress from local data
  return buildProgressFromLocal(courseId, courseData, moduleIds, lessonsByModule)
}

/**
 * Get last accessed lesson for a course
 */
export function getLastAccessedLesson(courseId: string): string | null {
  const localData = getLocalProgress()
  return localData.courses[courseId]?.lastLessonId || null
}

/**
 * Sync local progress to server when user logs in
 */
export async function syncLocalProgress(userId: string): Promise<void> {
  console.log('[ProgressTracker] Syncing local progress to server')
  
  const localData = getLocalProgress()
  
  for (const [courseId, courseData] of Object.entries(localData.courses)) {
    for (const [lessonId, lessonData] of Object.entries(courseData.lessons)) {
      try {
        await saveProgressToAPI(userId, courseId, lessonId, lessonData.status)
      } catch (error) {
        console.error(`[ProgressTracker] Failed to sync ${lessonId}:`, error)
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create empty progress structure
 */
function createEmptyProgress(
  courseId: string,
  moduleIds: string[],
  lessonsByModule: Record<string, string[]>
): CourseProgress {
  const modules: ModuleProgress[] = moduleIds.map(moduleId => ({
    moduleId,
    lessons: (lessonsByModule[moduleId] || []).map(lessonId => ({
      lessonId,
      status: 'not_started' as LessonStatus
    })),
    completionPercent: 0
  }))
  
  return {
    courseId,
    modules,
    lastAccessedLessonId: lessonsByModule[moduleIds[0]]?.[0] || '',
    overallPercent: 0
  }
}

/**
 * Build progress from local storage data
 */
function buildProgressFromLocal(
  courseId: string,
  courseData: LocalProgressData['courses'][string],
  moduleIds: string[],
  lessonsByModule: Record<string, string[]>
): CourseProgress {
  const modules: ModuleProgress[] = moduleIds.map(moduleId => {
    const lessonIds = lessonsByModule[moduleId] || []
    
    const lessons: LessonProgress[] = lessonIds.map(lessonId => ({
      lessonId,
      status: courseData.lessons[lessonId]?.status || 'not_started',
      completedAt: courseData.lessons[lessonId]?.completedAt
    }))
    
    const completedCount = lessons.filter(l => l.status === 'completed').length
    const completionPercent = lessonIds.length > 0 
      ? Math.round((completedCount / lessonIds.length) * 100)
      : 0
    
    return {
      moduleId,
      lessons,
      completionPercent
    }
  })
  
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)
  const completedLessons = modules.reduce(
    (sum, m) => sum + m.lessons.filter(l => l.status === 'completed').length,
    0
  )
  const overallPercent = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0
  
  return {
    courseId,
    modules,
    lastAccessedLessonId: courseData.lastLessonId,
    overallPercent
  }
}

/**
 * Calculate module completion percentage
 */
export function calculateModuleCompletion(lessons: LessonProgress[]): number {
  if (lessons.length === 0) return 0
  const completed = lessons.filter(l => l.status === 'completed').length
  return Math.round((completed / lessons.length) * 100)
}

/**
 * Calculate overall course completion
 */
export function calculateCourseCompletion(modules: ModuleProgress[]): number {
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)
  if (totalLessons === 0) return 0
  
  const completedLessons = modules.reduce(
    (sum, m) => sum + m.lessons.filter(l => l.status === 'completed').length,
    0
  )
  
  return Math.round((completedLessons / totalLessons) * 100)
}

// ═══════════════════════════════════════════════════════════════
// 🌐 API OPERATIONS (stubs - implement with actual API)
// ═══════════════════════════════════════════════════════════════

async function saveProgressToAPI(
  userId: string,
  courseId: string,
  lessonId: string,
  status: LessonStatus
): Promise<void> {
  const response = await fetch('/api/progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, courseId, lessonId, status })
  })
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }
}

async function loadProgressFromAPI(
  userId: string,
  courseId: string
): Promise<CourseProgress | null> {
  const response = await fetch(`/api/progress?userId=${userId}&courseId=${courseId}`)
  
  if (!response.ok) {
    if (response.status === 404) return null
    throw new Error(`API error: ${response.status}`)
  }
  
  return response.json()
}
