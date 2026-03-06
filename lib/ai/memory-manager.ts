/**
 * Memory Manager for AI Chat
 * Manages contextual memory for chat sessions
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  metadata?: {
    codeBlocks?: string[]
    topics?: string[]
  }
}

export interface ChatMemory {
  threadId: string
  userId: string
  messages: ChatMessage[]
  summary?: string
  context: {
    currentTopic?: string
    userLevel?: 'beginner' | 'intermediate' | 'advanced'
    lastCodeExample?: string
  }
  createdAt: number
  lastActivity: number
}

export class MemoryManager {
  private storage: Map<string, ChatMemory>
  private maxMessages: number = 10

  constructor(maxMessages: number = 10) {
    this.storage = new Map()
    this.maxMessages = maxMessages
  }

  /**
   * Create a new chat session
   * Requirement 4.1: Create memory context with unique thread ID
   */
  createSession(userId: string): string {
    const threadId = `thread_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const memory: ChatMemory = {
      threadId,
      userId,
      messages: [],
      context: {},
      createdAt: Date.now(),
      lastActivity: Date.now()
    }
    
    this.storage.set(threadId, memory)
    return threadId
  }

  /**
   * Add a message to the chat session
   * Requirement 4.2: Include previous messages in context
   */
  addMessage(threadId: string, message: ChatMessage): void {
    const memory = this.storage.get(threadId)
    
    if (!memory) {
      throw new Error(`Thread ${threadId} not found`)
    }
    
    // Add the message
    memory.messages.push(message)
    memory.lastActivity = Date.now()
    
    // Extract metadata
    if (message.content) {
      // Extract code blocks
      const codeBlockRegex = /```[\s\S]*?```/g
      const codeBlocks = message.content.match(codeBlockRegex)
      if (codeBlocks && codeBlocks.length > 0) {
        message.metadata = message.metadata || {}
        message.metadata.codeBlocks = codeBlocks
        memory.context.lastCodeExample = codeBlocks[codeBlocks.length - 1]
      }
    }
    
    // Update storage
    this.storage.set(threadId, memory)
  }

  /**
   * Get the context for a chat session
   * Requirement 4.2: Include previous messages in context
   */
  getContext(threadId: string): ChatMemory {
    const memory = this.storage.get(threadId)
    
    if (!memory) {
      throw new Error(`Thread ${threadId} not found`)
    }
    
    return { ...memory }
  }

  /**
   * Summarize old messages when context exceeds max messages
   * Requirement 4.3: Summarize older messages when exceeding 10 messages
   */
  async summarizeOldMessages(threadId: string): Promise<void> {
    const memory = this.storage.get(threadId)
    
    if (!memory) {
      throw new Error(`Thread ${threadId} not found`)
    }
    
    // Only summarize if we have more than maxMessages
    if (memory.messages.length <= this.maxMessages) {
      return
    }
    
    // Take the oldest messages (all except the last maxMessages)
    const messagesToSummarize = memory.messages.slice(0, memory.messages.length - this.maxMessages)
    const recentMessages = memory.messages.slice(-this.maxMessages)
    
    // Create a simple summary
    const summary = this.createSummary(messagesToSummarize)
    
    // Update memory with summary and keep only recent messages
    memory.summary = summary
    memory.messages = recentMessages
    
    this.storage.set(threadId, memory)
  }

  /**
   * Find messages in context by query
   * Requirement 4.5: Retrieve context when user references earlier content
   */
  findInContext(threadId: string, query: string): ChatMessage[] {
    const memory = this.storage.get(threadId)
    
    if (!memory) {
      throw new Error(`Thread ${threadId} not found`)
    }
    
    const lowerQuery = query.toLowerCase()
    
    // Search in messages
    const matchingMessages = memory.messages.filter(msg => 
      msg.content.toLowerCase().includes(lowerQuery)
    )
    
    // Also search in code blocks if query mentions "code"
    if (lowerQuery.includes('code') || lowerQuery.includes('earlier') || lowerQuery.includes('showed')) {
      const messagesWithCode = memory.messages.filter(msg => 
        msg.metadata?.codeBlocks && msg.metadata.codeBlocks.length > 0
      )
      
      // Merge and deduplicate
      const allMatches = [...matchingMessages, ...messagesWithCode]
      const uniqueMatches = Array.from(new Set(allMatches.map(m => JSON.stringify(m))))
        .map(s => JSON.parse(s))
      
      return uniqueMatches
    }
    
    return matchingMessages
  }

  /**
   * Create a simple summary of messages
   * Private helper method
   */
  private createSummary(messages: ChatMessage[]): string {
    if (messages.length === 0) {
      return ''
    }
    
    const topics = new Set<string>()
    const codeBlocks: string[] = []
    
    messages.forEach(msg => {
      // Extract topics from metadata
      if (msg.metadata?.topics) {
        msg.metadata.topics.forEach(t => topics.add(t))
      }
      
      // Collect code blocks
      if (msg.metadata?.codeBlocks) {
        codeBlocks.push(...msg.metadata.codeBlocks)
      }
    })
    
    let summary = `Previous conversation (${messages.length} messages)`
    
    if (topics.size > 0) {
      summary += ` covered topics: ${Array.from(topics).join(', ')}`
    }
    
    if (codeBlocks.length > 0) {
      summary += `. Code examples were shared (${codeBlocks.length} blocks)`
    }
    
    return summary
  }

  /**
   * Clear all sessions (for testing)
   */
  clear(): void {
    this.storage.clear()
  }

  /**
   * Get all active sessions (for debugging)
   */
  getActiveSessions(): string[] {
    return Array.from(this.storage.keys())
  }
}
