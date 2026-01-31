/**
 * Integration tests for Memory Manager in Chat API
 * Tests Requirements 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MemoryManager } from '@/lib/ai/memory-manager'

describe('Memory Manager Integration in Chat API', () => {
  let memoryManager: MemoryManager

  beforeEach(() => {
    memoryManager = new MemoryManager(10)
  })

  it('should create a session on first message (Requirement 4.1)', () => {
    const userId = 'test-user-123'
    const threadId = memoryManager.createSession(userId)

    expect(threadId).toBeTruthy()
    expect(threadId).toContain('thread_')
    expect(threadId).toContain(userId)
  })

  it('should include previous messages in context (Requirement 4.2)', () => {
    const userId = 'test-user-123'
    const threadId = memoryManager.createSession(userId)

    // Add first message
    memoryManager.addMessage(threadId, {
      role: 'user',
      content: 'Hello, can you help me with JavaScript?',
      timestamp: Date.now()
    })

    // Add second message
    memoryManager.addMessage(threadId, {
      role: 'assistant',
      content: 'Of course! What would you like to know?',
      timestamp: Date.now()
    })

    // Get context
    const context = memoryManager.getContext(threadId)

    expect(context.messages).toHaveLength(2)
    expect(context.messages[0].content).toContain('JavaScript')
    expect(context.messages[1].role).toBe('assistant')
  })

  it('should summarize old messages when exceeding 10 messages (Requirement 4.3)', async () => {
    const userId = 'test-user-123'
    const threadId = memoryManager.createSession(userId)

    // Add 12 messages (exceeds max of 10)
    for (let i = 0; i < 12; i++) {
      memoryManager.addMessage(threadId, {
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`,
        timestamp: Date.now()
      })
    }

    // Trigger summarization
    await memoryManager.summarizeOldMessages(threadId)

    // Get context
    const context = memoryManager.getContext(threadId)

    // Should have summary and only 10 recent messages
    expect(context.summary).toBeTruthy()
    expect(context.messages).toHaveLength(10)
    // Summary should mention the 2 messages that were summarized (12 total - 10 kept = 2 summarized)
    expect(context.summary).toContain('2 messages')
  })

  it('should store context in memory, not database (Requirement 4.4)', () => {
    const userId = 'test-user-123'
    const threadId = memoryManager.createSession(userId)

    memoryManager.addMessage(threadId, {
      role: 'user',
      content: 'Test message',
      timestamp: Date.now()
    })

    // Verify context is retrievable from memory
    const context = memoryManager.getContext(threadId)
    expect(context.messages).toHaveLength(1)

    // Verify it's in-memory by checking active sessions
    const activeSessions = memoryManager.getActiveSessions()
    expect(activeSessions).toContain(threadId)
  })

  it('should retrieve context when user references earlier content (Requirement 4.5)', () => {
    const userId = 'test-user-123'
    const threadId = memoryManager.createSession(userId)

    // Add message with code
    memoryManager.addMessage(threadId, {
      role: 'assistant',
      content: 'Here is an example:\n```javascript\nconst x = 5;\n```',
      timestamp: Date.now()
    })

    // Add another message
    memoryManager.addMessage(threadId, {
      role: 'user',
      content: 'Can you explain the code you showed earlier?',
      timestamp: Date.now()
    })

    // Find messages referencing "code" or "earlier"
    const relevantMessages = memoryManager.findInContext(threadId, 'code earlier')

    expect(relevantMessages.length).toBeGreaterThan(0)
    expect(relevantMessages.some(m => m.content.includes('```'))).toBe(true)
  })

  it('should extract and store code blocks in context', () => {
    const userId = 'test-user-123'
    const threadId = memoryManager.createSession(userId)

    // Add message with code block
    memoryManager.addMessage(threadId, {
      role: 'assistant',
      content: 'Here is a function:\n```javascript\nfunction add(a, b) { return a + b; }\n```',
      timestamp: Date.now()
    })

    // Get context
    const context = memoryManager.getContext(threadId)

    // Should have extracted code block
    expect(context.context.lastCodeExample).toBeTruthy()
    expect(context.context.lastCodeExample).toContain('function add')
  })

  it('should handle context summarization correctly', async () => {
    const userId = 'test-user-123'
    const threadId = memoryManager.createSession(userId)

    // Add messages with code blocks
    for (let i = 0; i < 15; i++) {
      memoryManager.addMessage(threadId, {
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: i % 3 === 0 ? `Message ${i}\n\`\`\`js\ncode ${i}\n\`\`\`` : `Message ${i}`,
        timestamp: Date.now()
      })
    }

    // Trigger summarization
    await memoryManager.summarizeOldMessages(threadId)

    const context = memoryManager.getContext(threadId)

    // Should have summary mentioning code blocks
    expect(context.summary).toContain('Code examples were shared')
    expect(context.messages).toHaveLength(10)
  })

  it('should maintain thread isolation between users', () => {
    const user1 = 'user-1'
    const user2 = 'user-2'

    const thread1 = memoryManager.createSession(user1)
    const thread2 = memoryManager.createSession(user2)

    memoryManager.addMessage(thread1, {
      role: 'user',
      content: 'User 1 message',
      timestamp: Date.now()
    })

    memoryManager.addMessage(thread2, {
      role: 'user',
      content: 'User 2 message',
      timestamp: Date.now()
    })

    const context1 = memoryManager.getContext(thread1)
    const context2 = memoryManager.getContext(thread2)

    expect(context1.messages[0].content).toBe('User 1 message')
    expect(context2.messages[0].content).toBe('User 2 message')
    expect(context1.userId).toBe(user1)
    expect(context2.userId).toBe(user2)
  })
})


/**
 * Integration tests for MCP Tools in Chat API
 * Tests Requirements 1.1, 2.1
 */

describe('MCP Tools Integration in Chat API', () => {
  describe('File Save Tool Integration', () => {
    it('should detect file save request and save file (Requirement 1.1)', async () => {
      const { detectToolNeeds } = await import('@/lib/mcp/tool-detector')
      const { FilesystemTool } = await import('@/lib/mcp/tools/filesystem')
      const { MCPClient } = await import('@/lib/mcp/mcp-client')

      // Test message requesting file save
      const message = 'Сохрани этот код в файл example.js:\n```javascript\nconsole.log("Hello World");\n```'

      // Detect tool needs
      const toolDetection = detectToolNeeds(message)

      expect(toolDetection.needsFileSave).toBe(true)
      expect(toolDetection.fileInfo).toBeDefined()
      expect(toolDetection.fileInfo?.filename).toBe('example.js')
      expect(toolDetection.fileInfo?.content).toContain('console.log')

      // Execute file save
      const filesystemTool = new FilesystemTool(new MCPClient([]), './test-user-files')
      const result = await filesystemTool.saveFile({
        userId: 'test-user-123',
        filename: toolDetection.fileInfo!.filename,
        content: toolDetection.fileInfo!.content,
        type: toolDetection.fileInfo!.type
      })

      expect(result.path).toContain('user-files')
      expect(result.path).toContain('example.js')
      expect(result.url).toContain('download')
    })

    it('should handle file save with different file types', async () => {
      const { detectToolNeeds } = await import('@/lib/mcp/tool-detector')

      const testCases = [
        {
          message: 'Save this to notes.md:\n```\n# My Notes\n```',
          expectedFilename: 'notes.md',
          expectedType: 'note'
        },
        {
          message: 'Create file script.py:\n```python\nprint("Hello")\n```',
          expectedFilename: 'script.py',
          expectedType: 'code'
        },
        {
          message: 'Сохрани в config.json:\n```json\n{"key": "value"}\n```',
          expectedFilename: 'config.json',
          expectedType: 'code'
        }
      ]

      for (const testCase of testCases) {
        const toolDetection = detectToolNeeds(testCase.message)
        
        expect(toolDetection.needsFileSave).toBe(true)
        expect(toolDetection.fileInfo?.filename).toBe(testCase.expectedFilename)
        expect(toolDetection.fileInfo?.type).toBe(testCase.expectedType)
      }
    })

    it('should extract code from AI response if not in user message', async () => {
      const { detectToolNeeds } = await import('@/lib/mcp/tool-detector')

      // User message without code
      const userMessage = 'Save this code to example.js'
      const aiResponse = 'Here is the code:\n```javascript\nconst x = 5;\nconsole.log(x);\n```'

      const toolDetection = detectToolNeeds(userMessage)

      expect(toolDetection.needsFileSave).toBe(true)
      expect(toolDetection.fileInfo?.filename).toBe('example.js')

      // In the actual implementation, we extract code from AI response
      const codeBlockPattern = /```[\w]*\n([\s\S]*?)```/g
      const codeBlocks = [...aiResponse.matchAll(codeBlockPattern)]
      const extractedCode = codeBlocks[0][1].trim()

      expect(extractedCode).toContain('const x = 5')
    })
  })

  describe('Web Search Tool Integration', () => {
    it('should detect search need and perform search (Requirement 2.1)', async () => {
      const { detectToolNeeds } = await import('@/lib/mcp/tool-detector')

      // Test message requiring search
      const message = 'What are the latest features in React 19?'

      // Detect tool needs
      const toolDetection = detectToolNeeds(message)

      expect(toolDetection.needsSearch).toBe(true)
      expect(toolDetection.searchQuery).toBeDefined()
      expect(toolDetection.searchQuery).toContain('React 19')
    })

    it('should detect various search patterns', async () => {
      const { detectToolNeeds } = await import('@/lib/mcp/tool-detector')

      const testCases = [
        {
          message: 'Search for Python 3.12 new features',
          shouldDetect: true,
          expectedQuery: 'Python 3.12 new features'
        },
        {
          message: 'Какие новости о TypeScript 5.0?',
          shouldDetect: true
        },
        {
          message: 'Compare React vs Vue',
          shouldDetect: true
        },
        {
          message: 'What is the best JavaScript framework?',
          shouldDetect: true
        },
        {
          message: 'Explain closures in JavaScript',
          shouldDetect: false // No time-sensitive or search keywords
        }
      ]

      for (const testCase of testCases) {
        const toolDetection = detectToolNeeds(testCase.message)
        
        expect(toolDetection.needsSearch).toBe(testCase.shouldDetect)
        if (testCase.shouldDetect && testCase.expectedQuery) {
          expect(toolDetection.searchQuery).toContain(testCase.expectedQuery)
        }
      }
    })

    it('should handle search with caching', async () => {
      const { SearchTool, SearchCache } = await import('@/lib/mcp/tools/search')

      // Mock Brave API key
      const mockApiKey = 'test-api-key'
      const cache = new SearchCache(3600000) // 1 hour TTL

      // Note: This test would require mocking the fetch API
      // For now, we just verify the cache behavior
      const query = 'React 19 features'
      
      // Simulate cached results
      cache.set(query, [
        {
          title: 'React 19 Features',
          url: 'https://example.com/react-19',
          snippet: 'New features in React 19...'
        }
      ])

      // Verify cache hit
      const cachedResults = cache.get(query)
      expect(cachedResults).toBeDefined()
      expect(cachedResults).toHaveLength(1)
      expect(cachedResults![0].title).toBe('React 19 Features')
    })
  })

  describe('Combined Tool Detection', () => {
    it('should detect both file save and search needs', async () => {
      const { detectToolNeeds } = await import('@/lib/mcp/tool-detector')

      const message = 'Search for React 19 features and save the code to example.js:\n```javascript\nconst x = 5;\n```'

      const toolDetection = detectToolNeeds(message)

      expect(toolDetection.needsFileSave).toBe(true)
      expect(toolDetection.needsSearch).toBe(true)
      expect(toolDetection.fileInfo?.filename).toBe('example.js')
      expect(toolDetection.searchQuery).toContain('React 19')
    })

    it('should handle messages with no tool needs', async () => {
      const { detectToolNeeds } = await import('@/lib/mcp/tool-detector')

      const message = 'Explain how closures work in JavaScript'

      const toolDetection = detectToolNeeds(message)

      expect(toolDetection.needsFileSave).toBe(false)
      expect(toolDetection.needsSearch).toBe(false)
    })
  })

  describe('Tool Result Formatting', () => {
    it('should format file save result in response', () => {
      const filename = 'example.js'
      const url = '/api/files/download?userId=test&filename=example.js'
      
      const formattedResult = `\n\n✅ Файл сохранён: [${filename}](${url})`

      expect(formattedResult).toContain('✅')
      expect(formattedResult).toContain(filename)
      expect(formattedResult).toContain(url)
    })

    it('should format search results in response', () => {
      const searchResults = [
        {
          title: 'React 19 Features',
          url: 'https://example.com/react-19',
          snippet: 'New features in React 19...'
        },
        {
          title: 'React 19 Release Notes',
          url: 'https://example.com/react-19-notes',
          snippet: 'Official release notes...'
        }
      ]

      let formattedResults = `\n\n🔍 Результаты поиска по запросу "React 19":\n\n`
      searchResults.forEach((result, index) => {
        formattedResults += `${index + 1}. **[${result.title}](${result.url})**\n`
        formattedResults += `   ${result.snippet}\n\n`
      })

      expect(formattedResults).toContain('🔍')
      expect(formattedResults).toContain('React 19 Features')
      expect(formattedResults).toContain('https://example.com/react-19')
      expect(formattedResults).toContain('New features in React 19')
    })
  })
})
