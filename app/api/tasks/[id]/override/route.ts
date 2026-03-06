/**
 * API endpoint for manual task difficulty overrides
 * Requirements: 6.4 - Allow manual override when task is misclassified
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/tasks/[id]/override
 * Manually override a task's difficulty classification
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { difficulty } = body

    // Validate difficulty
    if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty. Must be easy, medium, or hard' },
        { status: 400 }
      )
    }

    // Find the lesson that contains this task
    const lessonId = params.id
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        topic: {
          include: {
            module: {
              include: {
                goal: true
              }
            }
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Check if user owns this lesson
    if (lesson.topic.module.goal.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the task from lesson content
    const content = lesson.content as any
    if (!content || !content.tasks || !Array.isArray(content.tasks)) {
      return NextResponse.json({ error: 'Invalid lesson content' }, { status: 400 })
    }

    const { taskId } = body
    if (typeof taskId !== 'number') {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Find and update the task
    const taskIndex = content.tasks.findIndex((t: any) => t.id === taskId)
    if (taskIndex === -1) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const originalDifficulty = content.tasks[taskIndex].difficulty
    content.tasks[taskIndex].difficulty = difficulty
    content.tasks[taskIndex].manualOverride = true
    content.tasks[taskIndex].originalDifficulty = originalDifficulty

    // Update the lesson
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { content }
    })

    console.log(`[API] Task ${taskId} difficulty overridden: ${originalDifficulty} -> ${difficulty}`)

    return NextResponse.json({
      success: true,
      taskId,
      originalDifficulty,
      newDifficulty: difficulty
    })
  } catch (error) {
    console.error('Error overriding task difficulty:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tasks/[id]/override
 * Get all manual overrides for a lesson
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lessonId = params.id
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        topic: {
          include: {
            module: {
              include: {
                goal: true
              }
            }
          }
        }
      }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Check if user owns this lesson
    if (lesson.topic.module.goal.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get tasks with manual overrides
    const content = lesson.content as any
    if (!content || !content.tasks || !Array.isArray(content.tasks)) {
      return NextResponse.json({ overrides: [] })
    }

    const overrides = content.tasks
      .filter((t: any) => t.manualOverride)
      .map((t: any) => ({
        taskId: t.id,
        difficulty: t.difficulty,
        originalDifficulty: t.originalDifficulty
      }))

    return NextResponse.json({ overrides })
  } catch (error) {
    console.error('Error fetching task overrides:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
