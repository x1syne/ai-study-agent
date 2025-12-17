import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateCompletion } from '@/lib/groq'
import { SYSTEM_PROMPTS, getCodeReviewPrompt } from '@/lib/ai/prompts'
import { addXP, updateStreak, checkAchievement, checkTaskAchievements, XP_REWARDS } from '@/lib/gamification'

export const dynamic = 'force-dynamic'

// POST /api/topics/[id]/submit - Submit code solution for review
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
    const { code, lessonId } = body

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    // Get lesson and topic
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        topicId: params.id,
      },
      include: {
        topic: true,
      },
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Get task details from lesson content
    const taskContent = lesson.content as any
    const taskDescription = taskContent?.description || lesson.title || ''
    const solution = lesson.solution || taskContent?.solution || ''

    // Review code using AI
    let review: any
    try {
      const prompt = getCodeReviewPrompt(taskDescription, code, solution)
      const response = await generateCompletion(
        SYSTEM_PROMPTS.codeReview,
        prompt,
        { json: true, temperature: 0.5 }
      )
      review = JSON.parse(response)
    } catch {
      review = {
        isCorrect: false,
        score: 50,
        feedback: 'Не удалось проанализировать код. Попробуйте ещё раз.',
        issues: [],
        suggestions: [],
        encouragement: 'Продолжайте практиковаться!',
      }
    }

    // Update progress
    const progress = await prisma.topicProgress.findFirst({
      where: {
        topicId: params.id,
        userId: user.id,
      },
    })

    if (progress) {
      const newMastery = Math.min(
        progress.masteryLevel + (review.isCorrect ? 40 : 10),
        100
      )
      const newStatus = newMastery >= 70 ? 'COMPLETED' : progress.status

      await prisma.topicProgress.update({
        where: { id: progress.id },
        data: {
          practiceScore: review.score,
          masteryLevel: newMastery,
          status: newStatus,
          completedAt: newStatus === 'COMPLETED' ? new Date() : null,
        },
      })

      // If topic completed, unlock dependent topics
      if (newStatus === 'COMPLETED') {
        const topic = await prisma.topic.findUnique({
          where: { id: params.id },
          include: {
            goal: {
              include: {
                topics: true,
              },
            },
          },
        })

        if (topic) {
          // Find topics that have this topic as prerequisite
          const dependentTopics = topic.goal.topics.filter((t: { prerequisiteIds: string[] }) =>
            t.prerequisiteIds.includes(topic.id)
          )

          for (const depTopic of dependentTopics) {
            // Check if all prerequisites are completed
            const prereqProgress = await prisma.topicProgress.findMany({
              where: {
                userId: user.id,
                topicId: { in: depTopic.prerequisiteIds },
              },
            })

            const allPrereqsCompleted = prereqProgress.every(
              (p: { status: string }) => p.status === 'COMPLETED' || p.status === 'MASTERED'
            )

            if (allPrereqsCompleted) {
              await prisma.topicProgress.updateMany({
                where: {
                  userId: user.id,
                  topicId: depTopic.id,
                  status: 'LOCKED',
                },
                data: { status: 'AVAILABLE' },
              })
            }
          }
        }
      }
    }

    // Update or create user stats
    const existingStats = await prisma.userStats.findUnique({
      where: { userId: user.id },
    })

    if (existingStats) {
      await prisma.userStats.update({
        where: { userId: user.id },
        data: {
          totalTasks: { increment: 1 },
          correctAnswers: review.isCorrect ? { increment: 1 } : undefined,
          lastActiveDate: new Date(),
        },
      })
    } else {
      await prisma.userStats.create({
        data: {
          userId: user.id,
          totalTasks: 1,
          correctAnswers: review.isCorrect ? 1 : 0,
          lastActiveDate: new Date(),
        },
      })
    }

    // Create review card for spaced repetition if correct
    if (review.isCorrect) {
      const topic = await prisma.topic.findUnique({
        where: { id: params.id },
      })

      if (topic) {
        await prisma.reviewCard.create({
          data: {
            userId: user.id,
            front: taskDescription,
            back: solution,
            topicSlug: topic.slug,
          },
        })
      }

      // Add XP for completing task
      const xpResult = await addXP(user.id, XP_REWARDS.COMPLETE_TASK, 'task_complete')
      
      // Update streak
      await updateStreak(user.id)
      
      // Check achievements
      await checkTaskAchievements(user.id)
      
      // Check first lesson achievement
      await checkAchievement(user.id, 'FIRST_LESSON')
      
      // Check perfect quiz achievement
      if (review.score === 100) {
        await checkAchievement(user.id, 'PERFECT_QUIZ')
      }
      
      // Add XP info to response
      review.xpEarned = xpResult.added
    }

    return NextResponse.json(review)
  } catch (error) {
    console.error('Error submitting code:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
