/**
 * Unit Tests for Memory Manager
 * Requirements: 4.3, 4.5
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryManager, ChatMessage } from './memory-manager'

describe('Memory Manager Unit Tests', () => {
  let memoryManager: MemoryManager

  beforeEach(() => {
    memoryManager = new MemoryManager()
  })

  describe('Session Management', () => {
    it('should create a session with unique thread ID', () => {
      const userId = 'user123'
      const threadId = memoryManager.createSession(userId)

      expect(threadId).toBeTruthy()
      expect(threadId).toContain('thread_')
      expect(threadId).toContain(userId)
    })

    it('should throw error when accessing non-existent thread', () => {
      expect(() => {
        memoryManager.getContext('non-existent-thread')
      }).toThrow('Thread non-existent-thread not found')
    })

    it('should throw error when adding message to non-existent thread', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: Date.now()
      }

      expect(() => {
        memoryManager.addMessage('non-existent-thread', message)
      }).toThrow('Thread non-existent-thread not found')
    })
  })

  describe('Context Summarization', () => {
    // Requirement 4.3: Summarize older messages when exceeding 10 messages
    it('should summarize old messages when context exceeds 10 messages', async () => {
      const userId = 'user123'
      const threadId = memoryManager.createSession(userId)

      // Add 15 messages
      for (let i = 0; i < 15; i++) {
        memoryManager.addMessage(threadId, {
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: Date.now()
        })
      }

      // Before summarization, should have 15 messages
      let context = memoryManager.getContext(threadId)
      expect(context.messages.length).toBe(15)

      // Summarize
      await memoryManager.summarizeOldMessages(threadId)

      // After summarization, should have only 10 most recent messages
      context = memoryManager.getContext(threadId)
      expect(context.messages.length).toBe(10)
      expect(context.summary).toBeTruthy()
      expect(context.summary).toContain('5 messages')

      // Verify the kept messages are the most recent ones
      expect(context.messages[0].content).toBe('Message 5')
      expect(context.messages[9].content).toBe('Message 14')
    })

    it('should not summarize if messages are under limit', async () => {
      const userId = 'user123'
      const threadId = memoryManager.createSession(userId)

      // Add only 5 messages
      for (let i = 0; i < 5; i++) {
        memoryManager.addMessage(threadId, {
          role: 'user',
          content: `Message ${i}`,
          timestamp: Date.now()
        })
      }

      await memoryManager.summarizeOldMessages(threadId)

      const context = memoryManager.getContext(threadId)
      expect(context.messages.length).toBe(5)
      expect(context.summary).toBeUndefined()
    })

    it('should include code blocks in summary', async () => {
      const userId = 'user123'
      const threadId = memoryManager.createSession(userId)

      // Add messages with code blocks
      for (let i = 0; i < 12; i++) {
        memoryManager.addMessage(threadId, {
          role: 'user',
          content: i < 5 ? `\`\`\`\nconst x = ${i}\n\`\`\`` : `Message ${i}`,
          timestamp: Date.now()
        })
      }

      await memoryManager.summarizeOldMessages(threadId)

      const context = memoryManager.getContext(threadId)
      expect(context.summary).toContain('Code examples were shared')
    })
  })

  describe('Context Retrieval', () => {
    // Requirement 4.5: Retrieve context when user references earlier content
    it('should find messages by query', () => {
      const userId = 'user123'
      const threadId = memoryManager.createSession(userId)

      memoryManager.addMessage(threadId, {
        role: 'user',
        content: 'How do I use React hooks?',
        timestamp: Date.now()
      })

      memoryManager.addMessage(threadId, {
        role: 'assistant',
        content: 'React hooks are functions that let you use state',
        timestamp: Date.now()
      })

      memoryManager.addMessage(threadId, {
        role: 'user',
        content: 'What about Vue?',
        timestamp: Date.now()
      })

      const results = memoryManager.findInContext(threadId, 'React')
      expect(results.length).toBe(2)
      expect(results[0].content).toContain('React')
      expect(results[1].content).toContain('React')
    })

    it('should find code blocks when query mentions code', () => {
      const userId = 'user123'
      const threadId = memoryManager.createSession(userId)

      memoryManager.addMessage(threadId, {
        role: 'user',
        content: 'Here is my code:\n```\nconst x = 5\n```',
        timestamp: Date.now()
      })

      memoryManager.addMessage(threadId, {
        role: 'user',
        content: 'Just a regular message',
        timestamp: Date.now()
      })

      const results = memoryManager.findInContext(threadId, 'the code I showed earlier')
      expect(results.length).toBeGreaterThan(0)
      
      const hasCodeBlock = results.some(msg => 
        msg.metadata?.codeBlocks && msg.metadata.codeBlocks.length > 0
      )
      expect(hasCodeBlock).toBe(true)
    })

    it('should return empty array when no matches found', () => {
      const userId = 'user123'
      const threadId = memoryManager.createSession(userId)

      memoryManager.addMessage(threadId, {
        role: 'user',
        content: 'Hello world',
        timestamp: Date.now()
      })

      const results = memoryManager.findInContext(threadId, 'nonexistent query')
      expect(results).toEqual([])
    })
  })

  describe('In-Memory Storage', () => {
    // Requirement 4.4: Store context in memory (not database)
    it('should store context in memory', () => {
      const userId = 'user123'
      const threadId = memoryManager.createSession(userId)

      memoryManager.addMessage(threadId, {
        role: 'user',
        content: 'Test message',
        timestamp: Date.now()
      })

      // Verify it's accessible from memory
      const context = memoryManager.getContext(threadId)
      expect(context.messages.length).toBe(1)
      expect(context.messages[0].content).toBe('Test message')

      // Verify it's in the active sessions
      const activeSessions = memoryManager.getActiveSessions()
      expect(activeSessions).toContain(threadId)
    })

    it('should clear all sessions', () => {
      const userId1 = 'user1'
      const userId2 = 'user2'
      
      memoryManager.createSession(userId1)
      memoryManager.createSession(userId2)

      expect(memoryManager.getActiveSessions().length).toBe(2)

      memoryManager.clear()

      expect(memoryManager.getActiveSessions().length).toBe(0)
    })
  })

  describe('Code Block Extraction', () => {
    it('should extract code blocks from messages', () => {
      const userId = 'user123'
      const threadId = memoryManager.createSession(userId)

      const codeMessage = `Here is some code:
\`\`\`javascript
function hello() {
  console.log('Hello')
}
\`\`\`
And some more text.`

      memoryManager.addMessage(threadId, {
        role: 'user',
        content: codeMessage,
        timestamp: Date.now()
      })

      const context = memoryManager.getContext(threadId)
      expect(context.messages[0].metadata?.codeBlocks).toBeTruthy()
      expect(context.messages[0].metadata?.codeBlocks?.length).toBe(1)
      expect(context.context.lastCodeExample).toContain('```')
    })

    it('should extract multiple code blocks', () => {
      const userId = 'user123'
      const threadId = memoryManager.createSession(userId)

      const multiCodeMessage = `First code:
\`\`\`
const x = 1
\`\`\`
Second code:
\`\`\`
const y = 2
\`\`\`
Done.`

      memoryManager.addMessage(threadId, {
        role: 'user',
        content: multiCodeMessage,
        timestamp: Date.now()
      })

      const context = memoryManager.getContext(threadId)
      expect(context.messages[0].metadata?.codeBlocks?.length).toBe(2)
    })

    it('should update lastCodeExample with most recent code', () => {
      const userId = 'user123'
      const threadId = memoryManager.createSession(userId)

      memoryManager.addMessage(threadId, {
        role: 'user',
        content: '```\nconst x = 1\n```',
        timestamp: Date.now()
      })

      memoryManager.addMessage(threadId, {
        role: 'user',
        content: '```\nconst y = 2\n```',
        timestamp: Date.now()
      })

      const context = memoryManager.getContext(threadId)
      expect(context.context.lastCodeExample).toContain('const y = 2')
    })
  })

  describe('Custom Max Messages', () => {
    it('should respect custom maxMessages setting', async () => {
      const customManager = new MemoryManager(5)
      const userId = 'user123'
      const threadId = customManager.createSession(userId)

      // Add 8 messages
      for (let i = 0; i < 8; i++) {
        customManager.addMessage(threadId, {
          role: 'user',
          content: `Message ${i}`,
          timestamp: Date.now()
        })
      }

      await customManager.summarizeOldMessages(threadId)

      const context = customManager.getContext(threadId)
      expect(context.messages.length).toBe(5)
    })
  })
})
