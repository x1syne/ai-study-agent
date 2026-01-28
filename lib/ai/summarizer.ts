/**
 * Summarizer Service
 * 
 * Асинхронно создаёт сжатые представления длинных диалогов.
 * Использует LLM для генерации осмысленных summary.
 */

import { getCheckpointer, Message } from './checkpointer'
import { generateText } from './groq-client'

// ==================== ТИПЫ ====================

export interface SummarizerConfig {
  summaryThreshold: number      // Порог сообщений для суммаризации
  maxMessagesToSummarize: number // Макс. сообщений для одной суммаризации
  summaryMaxLength: number      // Макс. длина summary в символах
}

const DEFAULT_CONFIG: SummarizerConfig = {
  summaryThreshold: 50,
  maxMessagesToSummarize: 100,
  summaryMaxLength: 1000
}

// ==================== ПРОМПТ ДЛЯ СУММАРИЗАЦИИ ====================

const SUMMARY_PROMPT = `Ты — ассистент для создания кратких резюме диалогов.

Твоя задача: создать краткое резюме разговора между студентом и AI-ассистентом.

Резюме должно:
1. Быть на русском языке
2. Содержать ключевые темы, которые обсуждались
3. Отметить важные вопросы студента
4. Указать основные объяснения и выводы
5. Быть не длиннее 500 слов

Формат резюме:
- Основные темы: [перечисление]
- Ключевые вопросы студента: [перечисление]
- Важные объяснения: [краткое описание]
- Текущий прогресс: [что студент понял/изучил]

Диалог для резюмирования:`

// ==================== SUMMARIZER CLASS ====================

export class Summarizer {
  private config: SummarizerConfig

  constructor(config: Partial<SummarizerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Создать summary для списка сообщений
   */
  async summarize(messages: Message[]): Promise<string> {
    if (messages.length === 0) {
      return ''
    }

    // Форматируем сообщения для промпта
    const formattedMessages = messages.map(m => {
      const role = m.role === 'user' ? 'Студент' : 'Ассистент'
      return `${role}: ${m.content}`
    }).join('\n\n')

    const prompt = `${SUMMARY_PROMPT}\n\n${formattedMessages}\n\nРезюме:`

    try {
      const summary = await generateText(prompt, {
        maxTokens: 500,
        temperature: 0.3
      })

      // Обрезаем если слишком длинное
      if (summary.length > this.config.summaryMaxLength) {
        return summary.slice(0, this.config.summaryMaxLength) + '...'
      }

      return summary
    } catch (error) {
      console.error('Error generating summary:', error)
      // Fallback: простое резюме
      return this.createFallbackSummary(messages)
    }
  }

  /**
   * Проверить, нужна ли суммаризация для сессии
   */
  async needsSummary(sessionId: string): Promise<boolean> {
    const checkpointer = getCheckpointer()
    return checkpointer.needsSummary(sessionId)
  }

  /**
   * Создать и сохранить summary для сессии
   */
  async summarizeSession(sessionId: string): Promise<string> {
    const checkpointer = getCheckpointer()
    
    // Загружаем сообщения для суммаризации
    const messages = await checkpointer.loadHistory(
      sessionId, 
      this.config.maxMessagesToSummarize
    )

    if (messages.length < this.config.summaryThreshold) {
      return ''
    }

    // Генерируем summary
    const summary = await this.summarize(messages)

    // Сохраняем в сессию
    await checkpointer.updateSummary(sessionId, summary)

    return summary
  }

  /**
   * Запланировать асинхронную суммаризацию
   * (В реальном приложении можно использовать очередь задач)
   */
  scheduleSummary(sessionId: string): void {
    // Асинхронно запускаем суммаризацию
    setImmediate(async () => {
      try {
        const needsSummary = await this.needsSummary(sessionId)
        if (needsSummary) {
          await this.summarizeSession(sessionId)
          console.log(`Summary created for session ${sessionId}`)
        }
      } catch (error) {
        console.error(`Error scheduling summary for session ${sessionId}:`, error)
      }
    })
  }

  /**
   * Объединить существующий summary с новыми сообщениями
   */
  async mergeSummary(
    existingSummary: string, 
    newMessages: Message[]
  ): Promise<string> {
    if (newMessages.length === 0) {
      return existingSummary
    }

    const formattedNew = newMessages.map(m => {
      const role = m.role === 'user' ? 'Студент' : 'Ассистент'
      return `${role}: ${m.content}`
    }).join('\n\n')

    const prompt = `Объедини существующее резюме с новой частью диалога.

Существующее резюме:
${existingSummary}

Новая часть диалога:
${formattedNew}

Создай обновлённое резюме, сохраняя важную информацию из обоих источников:`

    try {
      return await generateText(prompt, {
        maxTokens: 500,
        temperature: 0.3
      })
    } catch (error) {
      console.error('Error merging summary:', error)
      return existingSummary
    }
  }

  // ==================== ПРИВАТНЫЕ МЕТОДЫ ====================

  /**
   * Создать простое резюме без LLM (fallback)
   */
  private createFallbackSummary(messages: Message[]): string {
    const userMessages = messages.filter(m => m.role === 'user')
    const topics = new Set<string>()

    // Извлекаем ключевые слова из вопросов
    userMessages.forEach(m => {
      const words = m.content.split(/\s+/).filter(w => w.length > 5)
      words.slice(0, 3).forEach(w => topics.add(w.toLowerCase()))
    })

    const topicsList = Array.from(topics).slice(0, 5).join(', ')

    return `Диалог из ${messages.length} сообщений. ` +
      `Вопросов студента: ${userMessages.length}. ` +
      `Ключевые темы: ${topicsList || 'общие вопросы'}.`
  }
}

// ==================== SINGLETON ====================

let summarizerInstance: Summarizer | null = null

export function getSummarizer(config?: Partial<SummarizerConfig>): Summarizer {
  if (!summarizerInstance) {
    summarizerInstance = new Summarizer(config)
  }
  return summarizerInstance
}

/**
 * Быстрый метод для суммаризации сессии
 */
export async function summarizeSession(sessionId: string): Promise<string> {
  const summarizer = getSummarizer()
  return summarizer.summarizeSession(sessionId)
}

export default Summarizer
