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
    const { code, lessonId, score: directScore } = body

    if (!code && directScore === undefined) {
      return NextResponse.json({ error: 'Code or score is required' }, { status: 400 })
    }

    // Get lesson and topic (не обязательно если передан directScore)
    let lesson = null
    let taskContent: any = {}
    
    if (lessonId) {
      lesson = await prisma.lesson.findFirst({
        where: {
          id: lessonId,
          topicId: params.id,
        },
        include: {
          topic: true,
        },
      })
      taskContent = lesson?.content as any || {}
    }

    // Если нет directScore и нет урока - ошибка
    if (directScore === undefined && !lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    // Get task details from lesson content
    const taskDescription = taskContent?.description || lesson?.title || ''
    const solution = lesson?.solution || taskContent?.solution || ''

    // Review code using AI or use direct score from practice tasks
    let review: any
    
    // Если передан score напрямую (из практики с заданиями) - используем его
    if (directScore !== undefined) {
      const isCorrect = directScore >= 70 // 70% для прохождения
      review = {
        isCorrect,
        score: directScore,
        feedback: isCorrect ? 'Практика успешно пройдена!' : 'Попробуйте ещё раз для лучшего результата.',
        issues: [],
        suggestions: [],
        encouragement: isCorrect ? 'Отличная работа!' : 'Продолжайте практиковаться!',
      }
    } else {
      // Иначе проверяем код через AI
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
    }

    // Update progress
    const progress = await prisma.topicProgress.findFirst({
      where: {
        topicId: params.id,
        userId: user.id,
      },
    })

    if (progress) {
      // Сохраняем лучший результат (не перезаписываем если новый хуже)
      const bestScore = Math.max(review.score, progress.practiceScore || 0)
      
      // Статус COMPLETED только если лучший practiceScore >= 70%
      const newStatus = bestScore >= 70 ? 'COMPLETED' : 'IN_PROGRESS'
      // masteryLevel = среднее между теорией (если пройдена = 50) и практикой
      const theoryPart = progress.theoryCompleted ? 50 : 0
      const practicePart = Math.round(bestScore / 2) // 0-50 от практики
      const newMastery = theoryPart + practicePart

      await prisma.topicProgress.update({
        where: { id: progress.id },
        data: {
          practiceScore: bestScore,
          masteryLevel: newMastery,
          status: newStatus,
          completedAt: newStatus === 'COMPLETED' && !progress.completedAt ? new Date() : progress.completedAt,
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
