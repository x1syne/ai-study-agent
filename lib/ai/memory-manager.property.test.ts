/**
 * Property-Based Tests for Memory Manager
 * Feature: mcp-integration, Property 5: Context Management
 * Validates: Requirements 4.1, 4.2, 4.4
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { MemoryManager, ChatMessage } from './memory-manager'

describe('Memory Manager Properties', () => {
  let memoryManager: MemoryManager

  beforeEach(() => {
    memoryManager = new MemoryManager()
  })

  // Feature: mcp-integration, Property 5: Context Management
  it('Property 5: Context management', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // userId
        fc.array(
          fc.string({ minLength: 1, maxLength: 100 }), 
          { minLength: 1, maxLength: 20 }
        ), // messages
        async (userId, messageContents) => {
          // Create a new session
          const threadId = memoryManager.createSession(userId)
          
          // Requirement 4.1: Create a unique thread ID on session start
          expect(threadId).toBeTruthy()
          expect(typeof threadId).toBe('string')
          expect(threadId).toContain(userId)
          
          // Add messages to the session
          for (const content of messageContents) {
            const message: ChatMessage = {
              role: 'user',
              content,
              timestamp: Date.now()
            }
            memoryManager.addMessage(threadId, message)
          }
          
          // Requirement 4.2: Include previous messages in context for each new message
          const context = memoryManager.getContext(threadId)
          
          // Verify context contains messages
          expect(context.messages.length).toBeGreaterThan(0)
          expect(context.messages.length).toBeLessThanOrEqual(messageContents.length)
          
          // Verify thread ID matches
          expect(context.threadId).toBe(threadId)
          expect(context.userId).toBe(userId)
          
          // Requirement 4.4: Store context in memory (not database)
          // Verify it's in the in-memory storage
          expect(memoryManager.getActiveSessions()).toContain(threadId)
          
          // Verify messages are stored correctly
          context.messages.forEach((msg, idx) => {
            expect(msg.role).toBe('user')
            expect(msg.content).toBeTruthy()
            expect(msg.timestamp).toBeGreaterThan(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property: Thread ID uniqueness', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // userId
        fc.integer({ min: 2, max: 10 }), // number of sessions
        async (userId, sessionCount) => {
          const threadIds = new Set<string>()
          
          // Create multiple sessions for the same user
          for (let i = 0; i < sessionCount; i++) {
            const threadId = memoryManager.createSession(userId)
            threadIds.add(threadId)
          }
          
          // All thread IDs should be unique
          expect(threadIds.size).toBe(sessionCount)
        }
      ),
      { numRuns: 100 }
    )
  }, 10000)

  it('Property: Message ordering preservation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.array(
          fc.record({
            role: fc.constantFrom('user' as const, 'assistant' as const),
            content: fc.string({ minLength: 1, maxLength: 100 })
          }),
          { minLength: 1, maxLength: 15 }
        ),
        async (userId, messages) => {
          const threadId = memoryManager.createSession(userId)
          
          // Add messages in order
          for (const msg of messages) {
            memoryManager.addMessage(threadId, {
              ...msg,
              timestamp: Date.now()
            })
          }
          
          const context = memoryManager.getContext(threadId)
          
          // Messages should be in the same order
          expect(context.messages.length).toBe(messages.length)
          
          context.messages.forEach((storedMsg, idx) => {
            expect(storedMsg.role).toBe(messages[idx].role)
            expect(storedMsg.content).toBe(messages[idx].content)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property: Code block extraction', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.array(
          fc.string({ minLength: 1, maxLength: 50 }),
          { minLength: 1, maxLength: 5 }
        ), // code snippets
        async (userId, codeSnippets) => {
          const threadId = memoryManager.createSession(userId)
          
          // Create messages with code blocks
          for (const code of codeSnippets) {
            const message: ChatMessage = {
              role: 'user',
              content: `Here is some code:\n\`\`\`\n${code}\n\`\`\``,
              timestamp: Date.now()
            }
            memoryManager.addMessage(threadId, message)
          }
          
          const context = memoryManager.getContext(threadId)
          
          // Last code example should be stored
          if (codeSnippets.length > 0) {
            expect(context.context.lastCodeExample).toBeTruthy()
            expect(context.context.lastCodeExample).toContain('```')
          }
          
          // Messages should have code block metadata
          const messagesWithCode = context.messages.filter(
            msg => msg.metadata?.codeBlocks && msg.metadata.codeBlocks.length > 0
          )
          expect(messagesWithCode.length).toBe(codeSnippets.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property: Context retrieval immutability', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.array(
          fc.string({ minLength: 1, maxLength: 100 }),
          { minLength: 1, maxLength: 10 }
        ),
        async (userId, messageContents) => {
          const threadId = memoryManager.createSession(userId)
          
          // Add messages
          for (const content of messageContents) {
            memoryManager.addMessage(threadId, {
              role: 'user',
              content,
              timestamp: Date.now()
            })
          }
          
          // Get context twice
          const context1 = memoryManager.getContext(threadId)
          const context2 = memoryManager.getContext(threadId)
          
          // Both should have the same data
          expect(context1.messages.length).toBe(context2.messages.length)
          expect(context1.threadId).toBe(context2.threadId)
          
          // Modifying one shouldn't affect the other (immutability check)
          context1.messages.push({
            role: 'assistant',
            content: 'test',
            timestamp: Date.now()
          })
          
          const context3 = memoryManager.getContext(threadId)
          expect(context3.messages.length).toBe(context2.messages.length)
        }
      ),
      { numRuns: 100 }
    )
  })
})
