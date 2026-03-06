/**
 * Сервис автоматизации для отправки вебхуков в Pipedream
 * Поддерживает типизированные события и безопасную передачу данных
 */

// Типы событий автоматизации
export type AutomationEventType =
  | 'TOPIC_COMPLETED'
  | 'LESSON_COMPLETED'
  | 'DAILY_REMINDER'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'STREAK_MILESTONE'
  | 'DAILY_STATS'
  | 'GOAL_COMPLETED'

// Базовый интерфейс события
interface BaseEvent {
  type: AutomationEventType
  timestamp: string
  userId: string
}

// Типизированные payload для каждого события
export interface TopicCompletedPayload extends BaseEvent {
  type: 'TOPIC_COMPLETED'
  data: {
    topicId: string
    topicName: string
    goalId: string
    goalTitle: string
    masteryLevel: number
    practiceScore: number
    timeSpentMinutes: number
    telegramId?: string
    userName?: string
  }
}

export interface LessonCompletedPayload extends BaseEvent {
  type: 'LESSON_COMPLETED'
  data: {
    lessonId: string
    lessonTitle: string
    topicName: string
    xpEarned: number
    telegramId?: string
    userName?: string
  }
}

export interface DailyReminderPayload extends BaseEvent {
  type: 'DAILY_REMINDER'
  data: {
    currentStreak: number
    pendingReviews: number
    nextTopicName?: string
    telegramId?: string
    userName?: string
  }
}

export interface AchievementUnlockedPayload extends BaseEvent {
  type: 'ACHIEVEMENT_UNLOCKED'
  data: {
    achievementType: string
    achievementTitle: string
    achievementDescription: string
    telegramId?: string
    userName?: string
  }
}

export interface StreakMilestonePayload extends BaseEvent {
  type: 'STREAK_MILESTONE'
  data: {
    streakDays: number
    milestone: number
    telegramId?: string
    userName?: string
  }
}


export interface DailyStatsPayload extends BaseEvent {
  type: 'DAILY_STATS'
  data: {
    date: string
    totalMinutes: number
    lessonsCompleted: number
    tasksCompleted: number
    cardsReviewed: number
    xpEarned: number
    currentStreak: number
    summary?: string // AI-generated summary
    telegramId?: string
    userName?: string
  }
}

export interface GoalCompletedPayload extends BaseEvent {
  type: 'GOAL_COMPLETED'
  data: {
    goalId: string
    goalTitle: string
    totalTopics: number
    totalTimeMinutes: number
    telegramId?: string
    userName?: string
  }
}

// Union type всех событий
export type AutomationEvent =
  | TopicCompletedPayload
  | LessonCompletedPayload
  | DailyReminderPayload
  | AchievementUnlockedPayload
  | StreakMilestonePayload
  | DailyStatsPayload
  | GoalCompletedPayload

// Конфигурация
const PIPEDREAM_WEBHOOK_URL = process.env.PIPEDREAM_WEBHOOK_URL
const PIPEDREAM_AUTH_KEY = process.env.PIPEDREAM_AUTH_KEY || 'default-secret-key'

/**
 * Отправляет событие в Pipedream webhook
 * @param event - типизированное событие автоматизации
 * @returns Promise с результатом отправки
 */
export async function sendAutomationEvent(event: AutomationEvent): Promise<{
  success: boolean
  error?: string
}> {
  if (!PIPEDREAM_WEBHOOK_URL) {
    console.warn('[Automation] PIPEDREAM_WEBHOOK_URL not configured, skipping event:', event.type)
    return { success: false, error: 'Webhook URL not configured' }
  }

  try {
    const response = await fetch(PIPEDREAM_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-auth-key': PIPEDREAM_AUTH_KEY,
      },
      body: JSON.stringify(event),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Automation] Webhook failed:', response.status, errorText)
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    console.log('[Automation] Event sent successfully:', event.type)
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Automation] Failed to send event:', errorMessage)
    return { success: false, error: errorMessage }
  }
}


// ==================== HELPER FUNCTIONS ====================

/**
 * Отправляет уведомление о завершении топика
 */
export async function notifyTopicCompleted(params: {
  userId: string
  topicId: string
  topicName: string
  goalId: string
  goalTitle: string
  masteryLevel: number
  practiceScore: number
  timeSpentMinutes: number
  telegramId?: string | null
  userName?: string | null
}) {
  const event: TopicCompletedPayload = {
    type: 'TOPIC_COMPLETED',
    timestamp: new Date().toISOString(),
    userId: params.userId,
    data: {
      topicId: params.topicId,
      topicName: params.topicName,
      goalId: params.goalId,
      goalTitle: params.goalTitle,
      masteryLevel: params.masteryLevel,
      practiceScore: params.practiceScore,
      timeSpentMinutes: params.timeSpentMinutes,
      telegramId: params.telegramId || undefined,
      userName: params.userName || undefined,
    },
  }

  return sendAutomationEvent(event)
}

/**
 * Отправляет уведомление о разблокированном достижении
 */
export async function notifyAchievementUnlocked(params: {
  userId: string
  achievementType: string
  achievementTitle: string
  achievementDescription: string
  telegramId?: string | null
  userName?: string | null
}) {
  const event: AchievementUnlockedPayload = {
    type: 'ACHIEVEMENT_UNLOCKED',
    timestamp: new Date().toISOString(),
    userId: params.userId,
    data: {
      achievementType: params.achievementType,
      achievementTitle: params.achievementTitle,
      achievementDescription: params.achievementDescription,
      telegramId: params.telegramId || undefined,
      userName: params.userName || undefined,
    },
  }

  return sendAutomationEvent(event)
}

/**
 * Отправляет дневную статистику пользователя
 */
export async function notifyDailyStats(params: {
  userId: string
  date: string
  totalMinutes: number
  lessonsCompleted: number
  tasksCompleted: number
  cardsReviewed: number
  xpEarned: number
  currentStreak: number
  summary?: string
  telegramId?: string | null
  userName?: string | null
}) {
  const event: DailyStatsPayload = {
    type: 'DAILY_STATS',
    timestamp: new Date().toISOString(),
    userId: params.userId,
    data: {
      date: params.date,
      totalMinutes: params.totalMinutes,
      lessonsCompleted: params.lessonsCompleted,
      tasksCompleted: params.tasksCompleted,
      cardsReviewed: params.cardsReviewed,
      xpEarned: params.xpEarned,
      currentStreak: params.currentStreak,
      summary: params.summary,
      telegramId: params.telegramId || undefined,
      userName: params.userName || undefined,
    },
  }

  return sendAutomationEvent(event)
}

// ==================== SECURITY ====================

/**
 * Проверяет секретный заголовок для входящих запросов от Pipedream
 */
export function validatePipedreamRequest(authKey: string | null): boolean {
  if (!authKey) return false
  return authKey === PIPEDREAM_AUTH_KEY
}
