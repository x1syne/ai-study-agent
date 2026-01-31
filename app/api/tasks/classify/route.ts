/**
 * API endpoint for task classification and manual overrides
 * Requirements: 6.4 - Allow manual override when task is misclassified
 */

import { NextRequest, NextResponse } from 'next/server'
import { TaskClassifier } from '@/lib/ai/task-classifier'

// Global classifier instance to maintain overrides across requests
const globalClassifier = new TaskClassifier()

/**
 * POST /api/tasks/classify
 * Classify tasks or apply manual overrides
 */
export async function POST(req: NextRequest) {
  try {
    // TODO: Re-enable authentication when next-auth is configured
    // const session = await getServerSession(authOptions)
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await req.json()
    const { action, tasks, taskId, difficulty } = body

    if (action === 'classify') {
      // Classify a batch of tasks
      if (!tasks || !Array.isArray(tasks)) {
        return NextResponse.json({ error: 'Tasks array required' }, { status: 400 })
      }

      console.log(`[API] Classifying ${tasks.length} tasks...`)
      
      const classifications = await globalClassifier.classifyBatch(tasks)
      const isValidDistribution = globalClassifier.validateDistribution(classifications)

      // Apply classifications to tasks
      const classifiedTasks = tasks.map((task, index) => ({
        ...task,
        difficulty: classifications[index].difficulty,
        classificationConfidence: classifications[index].confidence,
        classificationFactors: classifications[index].factors
      }))

      return NextResponse.json({
        success: true,
        tasks: classifiedTasks,
        classifications,
        distribution: {
          valid: isValidDistribution,
          counts: {
            easy: classifications.filter(c => c.difficulty === 'easy').length,
            medium: classifications.filter(c => c.difficulty === 'medium').length,
            hard: classifications.filter(c => c.difficulty === 'hard').length
          }
        }
      })
    } else if (action === 'override') {
      // Apply manual override
      // Requirement 6.4: Allow manual override
      if (typeof taskId !== 'number' || !difficulty) {
        return NextResponse.json({ error: 'taskId and difficulty required' }, { status: 400 })
      }

      if (!['easy', 'medium', 'hard'].includes(difficulty)) {
        return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 })
      }

      console.log(`[API] Manual override: task ${taskId} -> ${difficulty}`)
      
      globalClassifier.override(taskId, difficulty as 'easy' | 'medium' | 'hard')

      return NextResponse.json({
        success: true,
        message: `Task ${taskId} difficulty overridden to ${difficulty}`,
        overrides: Array.from(globalClassifier.getOverrides().entries()).map(([id, diff]) => ({
          taskId: id,
          difficulty: diff
        }))
      })
    } else if (action === 'clearOverrides') {
      // Clear all manual overrides
      console.log('[API] Clearing all manual overrides')
      
      globalClassifier.clearOverrides()

      return NextResponse.json({
        success: true,
        message: 'All overrides cleared'
      })
    } else if (action === 'getOverrides') {
      // Get current overrides
      const overrides = Array.from(globalClassifier.getOverrides().entries()).map(([id, diff]) => ({
        taskId: id,
        difficulty: diff
      }))

      return NextResponse.json({
        success: true,
        overrides
      })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('[API] Task classification error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tasks/classify
 * Get current overrides
 */
export async function GET(req: NextRequest) {
  try {
    // TODO: Re-enable authentication when next-auth is configured
    // const session = await getServerSession(authOptions)
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const overrides = Array.from(globalClassifier.getOverrides().entries()).map(([id, diff]) => ({
      taskId: id,
      difficulty: diff
    }))

    return NextResponse.json({
      success: true,
      overrides
    })
  } catch (error) {
    console.error('[API] Get overrides error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
