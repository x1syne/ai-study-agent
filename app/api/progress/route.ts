/**
 * 📊 PROGRESS API - Save and load user progress
 * 
 * POST /api/progress - Save lesson progress
 * GET /api/progress?userId=...&courseId=... - Load course progress
 */

import { NextRequest, NextResponse } from 'next/server'
import type { LessonStatus, CourseProgress, ModuleProgress, LessonProgress } from '@/lib/agents/types'

// ═══════════════════════════════════════════════════════════════
// 📝 TYPES
// ═══════════════════════════════════════════════════════════════

interface SaveProgressBody {
  userId: string
  courseId: string
  lessonId: string
  status: LessonStatus
}

// Try to import prisma, but handle if it's not available
let prisma: any = null
try {
  prisma = require('@/lib/prisma').prisma
} catch {
  console.warn('[Progress API] Prisma not available, using localStorage only')
}

// ═══════════════════════════════════════════════════════════════
// 💾 POST - Save Progress
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SaveProgressBody
    
    // Validate input
    if (!body.userId || !body.courseId || !body.lessonId || !body.status) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, courseId, lessonId, status' },
        { status: 400 }
      )
    }
    
    // Validate status
    const validStatuses: LessonStatus[] = ['not_started', 'theory_done', 'practice_done', 'completed']
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }
    
    // Check if prisma is available and has the model
    if (!prisma || !prisma.courseLessonProgress) {
      // Fallback: just return success (progress saved in localStorage on client)
      return NextResponse.json({ success: true, source: 'local' })
    }
    
    // Upsert progress record
    const progress = await prisma.courseLessonProgress.upsert({
      where: {
        lessonId_userId: {
          lessonId: body.lessonId,
          userId: body.userId
        }
      },
      update: {
        status: body.status,
        completedAt: body.status === 'completed' ? new Date() : null,
        updatedAt: new Date()
      },
      create: {
        lessonId: body.lessonId,
        userId: body.userId,
        courseId: body.courseId,
        status: body.status,
        completedAt: body.status === 'completed' ? new Date() : null
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      source: 'database',
      progress: {
        lessonId: progress.lessonId,
        status: progress.status,
        completedAt: progress.completedAt?.toISOString()
      }
    })
    
  } catch (error) {
    console.error('[Progress API] POST error:', error)
    
    // If database error, still return success (client has localStorage backup)
    return NextResponse.json({ 
      success: true, 
      source: 'local',
      warning: 'Database unavailable, progress saved locally'
    })
  }
}

// ═══════════════════════════════════════════════════════════════
// 📖 GET - Load Progress
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const courseId = searchParams.get('courseId')
    
    // Validate input
    if (!userId || !courseId) {
      return NextResponse.json(
        { error: 'Missing required params: userId, courseId' },
        { status: 400 }
      )
    }
    
    // Check if prisma is available and has the model
    if (!prisma || !prisma.courseLessonProgress) {
      return NextResponse.json(
        { error: 'Database not available' },
        { status: 404 }
      )
    }
    
    // Load all progress for this course and user
    const progressRecords = await prisma.courseLessonProgress.findMany({
      where: {
        userId,
        courseId
      }
    })
    
    if (progressRecords.length === 0) {
      return NextResponse.json(
        { error: 'No progress found' },
        { status: 404 }
      )
    }
    
    // Group by module (extract moduleId from lessonId format: moduleId-lesson-N)
    const lessonsByModule: Record<string, LessonProgress[]> = {}
    let lastAccessedLessonId = ''
    let lastAccessedTime = new Date(0)
    
    for (const record of progressRecords) {
      // Extract moduleId from lessonId
      const moduleId = record.lessonId.split('-lesson-')[0]
      
      if (!lessonsByModule[moduleId]) {
        lessonsByModule[moduleId] = []
      }
      
      lessonsByModule[moduleId].push({
        lessonId: record.lessonId,
        status: record.status as LessonStatus,
        completedAt: record.completedAt?.toISOString()
      })
      
      // Track last accessed
      if (record.updatedAt > lastAccessedTime) {
        lastAccessedTime = record.updatedAt
        lastAccessedLessonId = record.lessonId
      }
    }
    
    // Build CourseProgress
    const modules: ModuleProgress[] = []
    let totalLessons = 0
    let completedLessons = 0
    
    for (const moduleId of Object.keys(lessonsByModule)) {
      const lessons = lessonsByModule[moduleId]
      const completed = lessons.filter((l: LessonProgress) => l.status === 'completed').length
      totalLessons += lessons.length
      completedLessons += completed
      
      modules.push({
        moduleId,
        lessons,
        completionPercent: lessons.length > 0 
          ? Math.round((completed / lessons.length) * 100)
          : 0
      })
    }
    
    const courseProgress: CourseProgress = {
      courseId,
      modules,
      lastAccessedLessonId,
      overallPercent: totalLessons > 0 
        ? Math.round((completedLessons / totalLessons) * 100)
        : 0
    }
    
    return NextResponse.json(courseProgress)
    
  } catch (error) {
    console.error('[Progress API] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load progress' },
      { status: 500 }
    )
  }
}
