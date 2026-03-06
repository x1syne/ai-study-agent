import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { notifyDailyStats, validatePipedreamRequest } from '@/lib/services/automation'
import { generateWithRouter } from '@/lib/ai-router'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Vercel cron может работать до 60 секунд

// Секретный ключ для защиты cron endpoint
const CRON_SECRET = process.env.CRON_SECRET

/**
 * GET /api/cron/daily-stats
 * Cron-задача для сбора и отправки дневной статистики пользователей
 * 
 * Вызывается через Vercel Cron или внешний планировщик
 * Требует заголовок Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации
    const authHeader = request.headers.get('authorization')
    const cronSecret = authHeader?.replace('Bearer ', '')
    
    // Также проверяем x-auth-key для совместимости с Pipedream
    const pipedreamKey = request.headers.get('x-auth-key')
    
    const isAuthorized = 
      (CRON_SECRET && cronSecret === CRON_SECRET) ||
      validatePipedreamRequest(pipedreamKey)

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    // Получаем всех пользователей с привязанным Telegram
    const usersWithTelegram = await prisma.user.findMany({
      where: {
        telegramId: { not: null },
      },
      select: {
        id: true,
        name: true,
        telegramId: true,
        timezone: true,
      },
    })

    const results: Array<{ userId: string; success: boolean; error?: string }> = []

    for (const user of usersWithTelegram) {
      try {
        const stats = await collectUserDailyStats(user.id, yesterday)
        
        // Генерируем AI-саммари если есть активность
        let summary: string | undefined
        if (stats.totalMinutes > 0 || stats.lessonsCompleted > 0) {
          summary = await generateDailySummary(stats, user.name)
        }

        // Отправляем в Pipedream
        const result = await notifyDailyStats({
          userId: user.id,
          date: yesterday.toISOString().split('T')[0],
          ...stats,
          summary,
          telegramId: user.telegramId,
          userName: user.name,
        })

        results.push({ userId: user.id, success: result.success, error: result.error })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({ userId: user.id, success: false, error: errorMessage })
      }
    }

    const successCount = results.filter(r => r.success).length
    
    return NextResponse.json({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: results.length - successCount,
      results,
    })
  } catch (error) {
    console.error('Error in daily-stats cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


/**
 * Собирает статистику пользователя за указанный день
 */
async function collectUserDailyStats(userId: string, date: Date) {
  const startOfDay = new Date(date)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(date)
  endOfDay.setHours(23, 59, 59, 999)

  // Получаем статистику пользователя
  const userStats = await prisma.userStats.findUnique({
    where: { userId },
  })

  // Подсчитываем завершённые уроки за день
  const lessonsCompleted = await prisma.lesson.count({
    where: {
      userId,
      completedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  // Подсчитываем выполненные задания за день
  const tasksCompleted = await prisma.taskSubmission.count({
    where: {
      userId,
      isCorrect: true,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  // Подсчитываем повторённые карточки за день
  const cardsReviewed = await prisma.reviewCard.count({
    where: {
      userId,
      lastReviewDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  })

  // Подсчитываем время за день (из прогресса топиков)
  const progressUpdates = await prisma.topicProgress.findMany({
    where: {
      userId,
      updatedAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      timeSpentMinutes: true,
    },
  })

  // Примерная оценка времени за день
  // (в реальности нужен отдельный трекинг сессий)
  const totalMinutes = Math.min(
    progressUpdates.reduce((sum: number, p: { timeSpentMinutes: number }) => sum + (p.timeSpentMinutes || 0), 0),
    480 // Максимум 8 часов в день
  )

  // XP за день (примерная оценка)
  const xpEarned = lessonsCompleted * 25 + tasksCompleted * 15 + cardsReviewed * 5

  return {
    totalMinutes,
    lessonsCompleted,
    tasksCompleted,
    cardsReviewed,
    xpEarned,
    currentStreak: userStats?.currentStreak || 0,
  }
}

/**
 * Генерирует AI-саммари дневной активности
 */
async function generateDailySummary(
  stats: {
    totalMinutes: number
    lessonsCompleted: number
    tasksCompleted: number
    cardsReviewed: number
    xpEarned: number
    currentStreak: number
  },
  userName?: string | null
): Promise<string> {
  try {
    const prompt = `Сгенерируй короткое (2-3 предложения) мотивирующее сообщение о дневной активности пользователя${userName ? ` ${userName}` : ''}.

Статистика за день:
- Время обучения: ${stats.totalMinutes} минут
- Уроков пройдено: ${stats.lessonsCompleted}
- Заданий выполнено: ${stats.tasksCompleted}
- Карточек повторено: ${stats.cardsReviewed}
- XP заработано: ${stats.xpEarned}
- Текущая серия: ${stats.currentStreak} дней

Если активности не было, мягко напомни о важности регулярных занятий.
Используй эмодзи. Пиши на русском языке.`

    const result = await generateWithRouter('fast', 
      'Ты — дружелюбный помощник в обучении. Пиши кратко и мотивирующе.',
      prompt,
      { temperature: 0.7, maxTokens: 200 }
    )

    return result.content || 'Продолжай учиться! 📚'
  } catch (error) {
    console.error('Error generating daily summary:', error)
    return stats.totalMinutes > 0 
      ? `Отличный день! 🎉 ${stats.totalMinutes} минут обучения.`
      : 'Не забывай про учёбу! 📚'
  }
}
