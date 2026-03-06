/**
 * User Preferences Service
 * 
 * Управление предпочтениями пользователя для персонализации обучения.
 */

import { prisma } from '@/lib/prisma'
import { DetailLevel, ExplanationStyle } from '@prisma/client'

// ==================== ТИПЫ ====================

export interface UserPreferencesData {
  id: string
  userId: string
  detailLevel: 'BRIEF' | 'BALANCED' | 'DETAILED'
  explanationStyle: 'THEORETICAL' | 'PRACTICAL' | 'MIXED' | 'EXAMPLES_FIRST'
  favoriteTopics: string[]
  avoidTopics: string[]
  customInstructions: string | null
}

export interface UpdatePreferencesParams {
  detailLevel?: 'BRIEF' | 'BALANCED' | 'DETAILED'
  explanationStyle?: 'THEORETICAL' | 'PRACTICAL' | 'MIXED' | 'EXAMPLES_FIRST'
  favoriteTopics?: string[]
  avoidTopics?: string[]
  customInstructions?: string | null
}

// ==================== ФУНКЦИИ ====================

/**
 * Получить предпочтения пользователя
 */
export async function getUserPreferences(userId: string): Promise<UserPreferencesData | null> {
  const prefs = await prisma.userPreferences.findUnique({
    where: { userId }
  })

  if (!prefs) return null

  return {
    id: prefs.id,
    userId: prefs.userId,
    detailLevel: prefs.detailLevel as UserPreferencesData['detailLevel'],
    explanationStyle: prefs.explanationStyle as UserPreferencesData['explanationStyle'],
    favoriteTopics: prefs.favoriteTopics,
    avoidTopics: prefs.avoidTopics,
    customInstructions: prefs.customInstructions
  }
}

/**
 * Получить или создать предпочтения пользователя
 */
export async function getOrCreatePreferences(userId: string): Promise<UserPreferencesData> {
  const existing = await getUserPreferences(userId)
  if (existing) return existing

  const prefs = await prisma.userPreferences.create({
    data: {
      userId,
      detailLevel: DetailLevel.BALANCED,
      explanationStyle: ExplanationStyle.MIXED
    }
  })

  return {
    id: prefs.id,
    userId: prefs.userId,
    detailLevel: prefs.detailLevel as UserPreferencesData['detailLevel'],
    explanationStyle: prefs.explanationStyle as UserPreferencesData['explanationStyle'],
    favoriteTopics: prefs.favoriteTopics,
    avoidTopics: prefs.avoidTopics,
    customInstructions: prefs.customInstructions
  }
}

/**
 * Обновить предпочтения пользователя
 */
export async function updateUserPreferences(
  userId: string,
  params: UpdatePreferencesParams
): Promise<UserPreferencesData> {
  // Убеждаемся что запись существует
  await getOrCreatePreferences(userId)

  const updateData: Record<string, unknown> = {}

  if (params.detailLevel !== undefined) {
    updateData.detailLevel = params.detailLevel as DetailLevel
  }
  if (params.explanationStyle !== undefined) {
    updateData.explanationStyle = params.explanationStyle as ExplanationStyle
  }
  if (params.favoriteTopics !== undefined) {
    updateData.favoriteTopics = params.favoriteTopics
  }
  if (params.avoidTopics !== undefined) {
    updateData.avoidTopics = params.avoidTopics
  }
  if (params.customInstructions !== undefined) {
    updateData.customInstructions = params.customInstructions
  }

  const prefs = await prisma.userPreferences.update({
    where: { userId },
    data: updateData
  })

  return {
    id: prefs.id,
    userId: prefs.userId,
    detailLevel: prefs.detailLevel as UserPreferencesData['detailLevel'],
    explanationStyle: prefs.explanationStyle as UserPreferencesData['explanationStyle'],
    favoriteTopics: prefs.favoriteTopics,
    avoidTopics: prefs.avoidTopics,
    customInstructions: prefs.customInstructions
  }
}

/**
 * Добавить тему в избранное
 */
export async function addFavoriteTopic(userId: string, topic: string): Promise<void> {
  const prefs = await getOrCreatePreferences(userId)
  
  if (!prefs.favoriteTopics.includes(topic)) {
    await prisma.userPreferences.update({
      where: { userId },
      data: {
        favoriteTopics: [...prefs.favoriteTopics, topic]
      }
    })
  }
}

/**
 * Удалить тему из избранного
 */
export async function removeFavoriteTopic(userId: string, topic: string): Promise<void> {
  const prefs = await getUserPreferences(userId)
  if (!prefs) return

  await prisma.userPreferences.update({
    where: { userId },
    data: {
      favoriteTopics: prefs.favoriteTopics.filter(t => t !== topic)
    }
  })
}

/**
 * Установить кастомные инструкции
 */
export async function setCustomInstructions(
  userId: string, 
  instructions: string | null
): Promise<void> {
  await getOrCreatePreferences(userId)
  
  await prisma.userPreferences.update({
    where: { userId },
    data: { customInstructions: instructions }
  })
}

/**
 * Анализировать сообщение на предмет предпочтений
 * (Простая эвристика для автоматического определения предпочтений)
 */
export function analyzeMessageForPreferences(
  content: string
): Partial<UpdatePreferencesParams> | null {
  const lowerContent = content.toLowerCase()
  const updates: Partial<UpdatePreferencesParams> = {}

  // Определяем уровень детализации
  if (lowerContent.includes('кратко') || lowerContent.includes('коротко')) {
    updates.detailLevel = 'BRIEF'
  } else if (lowerContent.includes('подробн') || lowerContent.includes('детальн')) {
    updates.detailLevel = 'DETAILED'
  }

  // Определяем стиль объяснений
  if (lowerContent.includes('пример') || lowerContent.includes('покажи')) {
    updates.explanationStyle = 'EXAMPLES_FIRST'
  } else if (lowerContent.includes('теори') || lowerContent.includes('концепц')) {
    updates.explanationStyle = 'THEORETICAL'
  } else if (lowerContent.includes('практик') || lowerContent.includes('применен')) {
    updates.explanationStyle = 'PRACTICAL'
  }

  return Object.keys(updates).length > 0 ? updates : null
}

export default {
  getUserPreferences,
  getOrCreatePreferences,
  updateUserPreferences,
  addFavoriteTopic,
  removeFavoriteTopic,
  setCustomInstructions,
  analyzeMessageForPreferences
}
