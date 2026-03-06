/**
 * Context Builder
 * 
 * Формирует контекст для промпта персонажа на основе истории диалога,
 * предпочтений пользователя и текущей темы обучения.
 */

import { getCheckpointer, Message, DialogContext } from './checkpointer'
import { getUserPreferences, UserPreferencesData } from './user-preferences'
import { getCharacterById } from './characters'

// ==================== ТИПЫ ====================

export interface BuildContextParams {
  sessionId: string
  userId: string
  characterId: string
  currentMessage: string
  topicSlug?: string
  topicName?: string
}

export interface PromptContext {
  systemPrompt: string
  historyContext: string
  userContext: string
  fullPrompt: string
}

export interface ContextBuilderConfig {
  maxHistoryTokens: number      // Примерный лимит токенов для истории
  includeSummary: boolean       // Включать summary в контекст
  includePreferences: boolean   // Включать предпочтения
}

const DEFAULT_CONFIG: ContextBuilderConfig = {
  maxHistoryTokens: 2000,
  includeSummary: true,
  includePreferences: true
}

// ==================== CONTEXT BUILDER CLASS ====================

export class ContextBuilder {
  private config: ContextBuilderConfig

  constructor(config: Partial<ContextBuilderConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Построить полный контекст для LLM
   */
  async buildContext(params: BuildContextParams): Promise<PromptContext> {
    const { sessionId, userId, characterId, topicSlug, topicName } = params

    // Получаем контекст диалога
    const checkpointer = getCheckpointer()
    const dialogContext = await checkpointer.getContext(sessionId)

    // Получаем предпочтения пользователя
    let preferences: UserPreferencesData | null = null
    if (this.config.includePreferences) {
      preferences = await getUserPreferences(userId)
    }

    // Формируем системный промпт
    const systemPrompt = this.buildSystemPrompt(characterId, preferences, topicSlug, topicName)

    // Формируем контекст истории
    const historyContext = this.buildHistoryContext(dialogContext)

    // Формируем контекст пользователя
    const userContext = this.buildUserContext(preferences, topicSlug, topicName)

    // Собираем полный промпт
    const fullPrompt = this.assembleFullPrompt(systemPrompt, historyContext, userContext)

    return {
      systemPrompt,
      historyContext,
      userContext,
      fullPrompt
    }
  }

  /**
   * Форматировать историю сообщений для промпта
   */
  formatMessagesForPrompt(messages: Message[]): string {
    if (messages.length === 0) return ''

    return messages.map(m => {
      const role = m.role === 'user' ? 'Студент' : 'Ассистент'
      return `${role}: ${m.content}`
    }).join('\n\n')
  }

  // ==================== ПРИВАТНЫЕ МЕТОДЫ ====================

  /**
   * Построить системный промпт для персонажа
   */
  private buildSystemPrompt(
    characterId: string,
    preferences: UserPreferencesData | null,
    topicSlug?: string,
    topicName?: string
  ): string {
    // Базовый промпт персонажа
    const character = getCharacterById(characterId)
    const basePrompt = character?.systemPrompt || ''

    // Добавляем инструкции по стилю на основе предпочтений
    let styleInstructions = ''
    if (preferences) {
      styleInstructions = this.buildStyleInstructions(preferences)
    }

    // Добавляем контекст темы
    let topicContext = ''
    if (topicSlug && topicName) {
      topicContext = `\n\n[ТЕКУЩАЯ ТЕМА]: ${topicName} (${topicSlug})`
    }

    return `${basePrompt}${styleInstructions}${topicContext}`
  }

  /**
   * Построить инструкции по стилю из предпочтений
   */
  private buildStyleInstructions(preferences: UserPreferencesData): string {
    const instructions: string[] = []

    // Уровень детализации
    switch (preferences.detailLevel) {
      case 'BRIEF':
        instructions.push('Давай краткие, лаконичные ответы без лишних деталей.')
        break
      case 'DETAILED':
        instructions.push('Давай подробные, развёрнутые объяснения с примерами.')
        break
      // BALANCED - по умолчанию
    }

    // Стиль объяснений
    switch (preferences.explanationStyle) {
      case 'THEORETICAL':
        instructions.push('Фокусируйся на теоретических основах и концепциях.')
        break
      case 'PRACTICAL':
        instructions.push('Фокусируйся на практических примерах и применении.')
        break
      case 'EXAMPLES_FIRST':
        instructions.push('Начинай с примеров, затем объясняй теорию.')
        break
      // MIXED - по умолчанию
    }

    // Любимые темы
    if (preferences.favoriteTopics.length > 0) {
      instructions.push(`Студент интересуется: ${preferences.favoriteTopics.join(', ')}.`)
    }

    // Кастомные инструкции
    if (preferences.customInstructions) {
      instructions.push(preferences.customInstructions)
    }

    if (instructions.length === 0) return ''

    return `\n\n[ПРЕДПОЧТЕНИЯ СТУДЕНТА]:\n${instructions.join('\n')}`
  }

  /**
   * Построить контекст истории диалога
   */
  private buildHistoryContext(dialogContext: DialogContext): string {
    const parts: string[] = []

    // Добавляем summary если есть
    if (this.config.includeSummary && dialogContext.summary) {
      parts.push(`[КРАТКОЕ СОДЕРЖАНИЕ ПРЕДЫДУЩЕГО РАЗГОВОРА]:\n${dialogContext.summary}`)
    }

    // Добавляем последние сообщения
    if (dialogContext.messages.length > 0) {
      const formattedHistory = this.formatMessagesForPrompt(dialogContext.messages)
      parts.push(`[ИСТОРИЯ ДИАЛОГА]:\n${formattedHistory}`)
    }

    return parts.join('\n\n')
  }

  /**
   * Построить контекст пользователя
   */
  private buildUserContext(
    preferences: UserPreferencesData | null,
    topicSlug?: string,
    topicName?: string
  ): string {
    const parts: string[] = []

    if (topicName) {
      parts.push(`Текущая тема изучения: ${topicName}`)
    }

    if (preferences?.favoriteTopics.length) {
      parts.push(`Интересы студента: ${preferences.favoriteTopics.join(', ')}`)
    }

    return parts.join('\n')
  }

  /**
   * Собрать полный промпт
   */
  private assembleFullPrompt(
    systemPrompt: string,
    historyContext: string,
    userContext: string
  ): string {
    const parts = [systemPrompt]

    if (historyContext) {
      parts.push(historyContext)
    }

    if (userContext) {
      parts.push(`[КОНТЕКСТ]:\n${userContext}`)
    }

    return parts.join('\n\n---\n\n')
  }
}

// ==================== SINGLETON ====================

let contextBuilderInstance: ContextBuilder | null = null

export function getContextBuilder(config?: Partial<ContextBuilderConfig>): ContextBuilder {
  if (!contextBuilderInstance) {
    contextBuilderInstance = new ContextBuilder(config)
  }
  return contextBuilderInstance
}

/**
 * Быстрый метод для построения контекста
 */
export async function buildPromptContext(params: BuildContextParams): Promise<PromptContext> {
  const builder = getContextBuilder()
  return builder.buildContext(params)
}

export default ContextBuilder
