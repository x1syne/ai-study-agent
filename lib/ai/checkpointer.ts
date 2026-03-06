/**
 * Checkpointer Service
 * 
 * Сохранение и восстановление состояния диалогов между сессиями.
 * Реализует паттерн Checkpointer из LangGraph для персистентности.
 */

import { prisma } from '@/lib/prisma'
import { MessageRole } from '@prisma/client'

// ==================== ТИПЫ ====================

export interface CheckpointerConfig {
  memoryWindowSize: number      // Размер окна памяти (default: 20)
  summaryThreshold: number      // Порог для создания summary (default: 50)
  maxSessionMessages: number    // Макс. сообщений в сессии (default: 1000)
  retentionDays: number         // Срок хранения (default: 90)
}

export interface SaveMessageParams {
  sessionId: string
  userId: string
  characterId: string
  role: 'user' | 'assistant'
  content: string
  topicSlug?: string
  metadata?: Record<string, unknown>
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  topicSlug?: string | null
  metadata?: Record<string, unknown> | null
  createdAt: Date
}

export interface Session {
  id: string
  userId: string
  characterId: string
  title: string | null
  summary: string | null
  messageCount: number
  lastMessageAt: Date | null
  isArchived: boolean
  createdAt: Date
}

export interface CreateSessionParams {
  userId: string
  characterId: string
  title?: string
}

export interface DialogContext {
  summary?: string
  messages: Message[]
  sessionId: string
  messageCount: number
}

// ==================== КОНФИГУРАЦИЯ ====================

const DEFAULT_CONFIG: CheckpointerConfig = {
  memoryWindowSize: 20,
  summaryThreshold: 50,
  maxSessionMessages: 1000,
  retentionDays: 90
}

// ==================== CHECKPOINTER CLASS ====================

export class Checkpointer {
  private config: CheckpointerConfig

  constructor(config: Partial<CheckpointerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Сохранить сообщение в сессию
   */
  async saveMessage(params: SaveMessageParams): Promise<Message> {
    const { sessionId, userId, characterId, role, content, topicSlug, metadata } = params

    // Создаём сообщение
    const message = await prisma.chatMessage.create({
      data: {
        sessionId,
        userId,
        characterId,
        role: role === 'user' ? MessageRole.USER : MessageRole.ASSISTANT,
        content,
        topicSlug,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined
      }
    })

    // Обновляем счётчик сессии
    await prisma.conversationSession.update({
      where: { id: sessionId },
      data: {
        messageCount: { increment: 1 },
        lastMessageAt: new Date(),
        // Автоматически генерируем title из первого сообщения
        title: await this.generateTitleIfNeeded(sessionId, content, role)
      }
    })

    return {
      id: message.id,
      role: message.role === MessageRole.USER ? 'user' : 'assistant',
      content: message.content,
      topicSlug: message.topicSlug,
      metadata: message.metadata as Record<string, unknown> | null,
      createdAt: message.createdAt
    }
  }

  /**
   * Загрузить историю сессии
   */
  async loadHistory(sessionId: string, limit?: number): Promise<Message[]> {
    const take = limit || this.config.memoryWindowSize

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take
    })

    // Возвращаем в хронологическом порядке
    return messages.reverse().map(m => ({
      id: m.id,
      role: m.role === MessageRole.USER ? 'user' : 'assistant',
      content: m.content,
      topicSlug: m.topicSlug,
      metadata: m.metadata as Record<string, unknown> | null,
      createdAt: m.createdAt
    }))
  }

  /**
   * Получить контекст диалога для LLM
   */
  async getContext(sessionId: string): Promise<DialogContext> {
    const session = await prisma.conversationSession.findUnique({
      where: { id: sessionId }
    })

    if (!session) {
      throw new Error(`Session ${sessionId} not found`)
    }

    const messages = await this.loadHistory(sessionId, this.config.memoryWindowSize)

    return {
      summary: session.summary || undefined,
      messages,
      sessionId,
      messageCount: session.messageCount
    }
  }

  /**
   * Создать новую сессию
   */
  async createSession(params: CreateSessionParams): Promise<Session> {
    const { userId, characterId, title } = params

    const session = await prisma.conversationSession.create({
      data: {
        userId,
        characterId,
        title
      }
    })

    return {
      id: session.id,
      userId: session.userId,
      characterId: session.characterId,
      title: session.title,
      summary: session.summary,
      messageCount: session.messageCount,
      lastMessageAt: session.lastMessageAt,
      isArchived: session.isArchived,
      createdAt: session.createdAt
    }
  }

  /**
   * Получить список сессий пользователя с персонажем
   */
  async listSessions(userId: string, characterId: string): Promise<Session[]> {
    const sessions = await prisma.conversationSession.findMany({
      where: {
        userId,
        characterId,
        isArchived: false
      },
      orderBy: { lastMessageAt: 'desc' }
    })

    return sessions.map((s: { id: string; userId: string; characterId: string; title: string | null; summary: string | null; messageCount: number; lastMessageAt: Date | null; isArchived: boolean; createdAt: Date }) => ({
      id: s.id,
      userId: s.userId,
      characterId: s.characterId,
      title: s.title,
      summary: s.summary,
      messageCount: s.messageCount,
      lastMessageAt: s.lastMessageAt,
      isArchived: s.isArchived,
      createdAt: s.createdAt
    }))
  }

  /**
   * Получить сессию по ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const session = await prisma.conversationSession.findUnique({
      where: { id: sessionId }
    })

    if (!session) return null

    return {
      id: session.id,
      userId: session.userId,
      characterId: session.characterId,
      title: session.title,
      summary: session.summary,
      messageCount: session.messageCount,
      lastMessageAt: session.lastMessageAt,
      isArchived: session.isArchived,
      createdAt: session.createdAt
    }
  }

  /**
   * Удалить сессию
   */
  async deleteSession(sessionId: string): Promise<void> {
    await prisma.conversationSession.delete({
      where: { id: sessionId }
    })
  }

  /**
   * Архивировать сессию
   */
  async archiveSession(sessionId: string): Promise<void> {
    await prisma.conversationSession.update({
      where: { id: sessionId },
      data: { isArchived: true }
    })
  }

  /**
   * Архивировать старые сообщения в сессии
   * Оставляет только последние maxSessionMessages сообщений
   */
  async archiveOldMessages(sessionId: string): Promise<number> {
    const session = await prisma.conversationSession.findUnique({
      where: { id: sessionId },
      select: { messageCount: true }
    })

    if (!session || session.messageCount <= this.config.maxSessionMessages) {
      return 0
    }

    // Находим ID сообщений для удаления (самые старые)
    const messagesToDelete = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: session.messageCount - this.config.maxSessionMessages,
      select: { id: true }
    })

    if (messagesToDelete.length === 0) return 0

    // Удаляем старые сообщения
    const result = await prisma.chatMessage.deleteMany({
      where: {
        id: { in: messagesToDelete.map(m => m.id) }
      }
    })

    // Обновляем счётчик
    await prisma.conversationSession.update({
      where: { id: sessionId },
      data: { messageCount: this.config.maxSessionMessages }
    })

    return result.count
  }

  /**
   * Очистить старые сессии (старше retentionDays)
   */
  async cleanupOldSessions(): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays)

    const result = await prisma.conversationSession.deleteMany({
      where: {
        lastMessageAt: { lt: cutoffDate },
        isArchived: true
      }
    })

    return result.count
  }

  /**
   * Обновить summary сессии
   */
  async updateSummary(sessionId: string, summary: string): Promise<void> {
    await prisma.conversationSession.update({
      where: { id: sessionId },
      data: {
        summary,
        summaryUpdatedAt: new Date()
      }
    })
  }

  /**
   * Проверить, нужна ли суммаризация
   */
  async needsSummary(sessionId: string): Promise<boolean> {
    const session = await prisma.conversationSession.findUnique({
      where: { id: sessionId },
      select: { messageCount: true, summaryUpdatedAt: true }
    })

    if (!session) return false

    // Нужна суммаризация если сообщений больше порога и summary устарел
    return session.messageCount > this.config.summaryThreshold
  }

  /**
   * Получить или создать сессию для пользователя
   */
  async getOrCreateSession(userId: string, characterId: string): Promise<Session> {
    // Ищем последнюю активную сессию
    const existingSessions = await this.listSessions(userId, characterId)
    
    if (existingSessions.length > 0) {
      return existingSessions[0]
    }

    // Создаём новую
    return this.createSession({ userId, characterId })
  }

  // ==================== ПРИВАТНЫЕ МЕТОДЫ ====================

  /**
   * Генерировать title для сессии из первого сообщения
   */
  private async generateTitleIfNeeded(
    sessionId: string, 
    content: string, 
    role: string
  ): Promise<string | undefined> {
    const session = await prisma.conversationSession.findUnique({
      where: { id: sessionId },
      select: { title: true, messageCount: true }
    })

    // Генерируем title только для первого сообщения пользователя
    if (session?.title || session?.messageCount !== 0 || role !== 'user') {
      return undefined
    }

    // Берём первые 50 символов как title
    return content.slice(0, 50) + (content.length > 50 ? '...' : '')
  }
}

// ==================== SINGLETON ====================

let checkpointerInstance: Checkpointer | null = null

export function getCheckpointer(config?: Partial<CheckpointerConfig>): Checkpointer {
  if (!checkpointerInstance) {
    checkpointerInstance = new Checkpointer(config)
  }
  return checkpointerInstance
}

export default Checkpointer
