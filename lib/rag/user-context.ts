/**
 * User Context for RAG
 * Персонализация на основе истории обучения пользователя
 */

import { prisma } from '@/lib/prisma'

export interface UserLearningContext {
  completedTopics: string[]
  currentLevel: 'beginner' | 'intermediate' | 'advanced'
  strongAreas: string[]
  weakAreas: string[]
  recentTopics: string[]
}

/**
 * Получение контекста обучения пользователя
 */
export async function getUserLearningContext(userId: string): Promise<UserLearningContext | null> {
  try {
    // Получаем прогресс пользователя
    const progress = await prisma.topicProgress.findMany({
      where: { userId },
      include: {
        topic: {
          select: {
            name: true,
            difficulty: true,
            goal: {
              select: { title: true }
            }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })

    if (progress.length === 0) {
      return null
    }

    // Завершённые темы
    const completedTopics = progress
      .filter(p => p.status === 'COMPLETED' || p.status === 'MASTERED')
      .map(p => p.topic.name)

    // Недавние темы (последние 5)
    const recentTopics = progress
      .slice(0, 5)
      .map(p => p.topic.name)

    // Определяем уровень по сложности завершённых тем
    const difficulties = progress
      .filter(p => p.status === 'COMPLETED' || p.status === 'MASTERED')
      .map(p => p.topic.difficulty)
    
    let currentLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
    if (difficulties.includes('EXPERT') || difficulties.includes('HARD')) {
      currentLevel = 'advanced'
    } else if (difficulties.includes('MEDIUM')) {
      currentLevel = 'intermediate'
    }

    // Сильные области (высокий mastery)
    const strongAreas = progress
      .filter(p => p.masteryLevel >= 80)
      .map(p => p.topic.name)
      .slice(0, 5)

    // Слабые области (низкий mastery или не завершены)
    const weakAreas = progress
      .filter(p => p.masteryLevel < 50 && p.status === 'IN_PROGRESS')
      .map(p => p.topic.name)
      .slice(0, 5)

    return {
      completedTopics,
      currentLevel,
      strongAreas,
      weakAreas,
      recentTopics
    }
  } catch (error) {
    console.error('[UserContext] Error fetching user context:', error)
    return null
  }
}

/**
 * Форматирование контекста пользователя для промпта
 */
export function formatUserContextForPrompt(context: UserLearningContext | null): string {
  if (!context) return ''

  const parts: string[] = []

  if (context.completedTopics.length > 0) {
    parts.push(`Пользователь уже изучил: ${context.completedTopics.slice(0, 10).join(', ')}`)
  }

  parts.push(`Уровень пользователя: ${context.currentLevel}`)

  if (context.strongAreas.length > 0) {
    parts.push(`Сильные стороны: ${context.strongAreas.join(', ')}`)
  }

  if (context.weakAreas.length > 0) {
    parts.push(`Требуют внимания: ${context.weakAreas.join(', ')}`)
  }

  if (parts.length === 0) return ''

  return `
[КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ]
${parts.join('\n')}

Учитывай уровень и опыт пользователя при генерации контента.
`
}

/**
 * Получение связанных тем для обогащения контекста
 */
export async function getRelatedTopicsContext(
  userId: string,
  currentTopicName: string
): Promise<string> {
  try {
    // Находим текущую тему
    const currentProgress = await prisma.topicProgress.findFirst({
      where: {
        userId,
        topic: { name: currentTopicName }
      },
      include: {
        topic: {
          include: {
            goal: {
              include: {
                topics: {
                  select: {
                    name: true,
                    description: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!currentProgress) return ''

    // Получаем другие темы из того же курса
    const relatedTopics = currentProgress.topic.goal.topics
      .filter(t => t.name !== currentTopicName)
      .slice(0, 5)

    if (relatedTopics.length === 0) return ''

    const topicsList = relatedTopics
      .map(t => `• ${t.name}${t.description ? `: ${t.description}` : ''}`)
      .join('\n')

    return `
[СВЯЗАННЫЕ ТЕМЫ КУРСА]
${topicsList}

Можешь ссылаться на эти темы для создания связей между материалами.
`
  } catch (error) {
    console.error('[UserContext] Error fetching related topics:', error)
    return ''
  }
}
