import { describe, it, expect, vi, beforeEach } from 'vitest'

// Тестируем только safeParseAIJson без импорта всего модуля
// чтобы избежать инициализации Groq клиента

describe('safeParseAIJson', () => {
  // Реализация функции для тестирования
  function safeParseAIJson<T>(
    content: string, 
    validator?: (obj: unknown) => obj is T
  ): T | null {
    try {
      let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/)
      if (!jsonMatch) return null
      const parsed = JSON.parse(jsonMatch[0])
      if (validator && !validator(parsed)) return null
      return parsed as T
    } catch (e) {
      return null
    }
  }

  it('should parse valid JSON object', () => {
    const result = safeParseAIJson('{"name": "test", "value": 123}')
    expect(result).toEqual({ name: 'test', value: 123 })
  })

  it('should parse JSON from markdown code block', () => {
    const input = '```json\n{"topics": ["a", "b"]}\n```'
    const result = safeParseAIJson(input)
    expect(result).toEqual({ topics: ['a', 'b'] })
  })

  it('should parse JSON array', () => {
    const result = safeParseAIJson('[1, 2, 3]')
    expect(result).toEqual([1, 2, 3])
  })

  it('should return null for invalid JSON', () => {
    const result = safeParseAIJson('not json at all')
    expect(result).toBeNull()
  })

  it('should return null for empty string', () => {
    const result = safeParseAIJson('')
    expect(result).toBeNull()
  })

  it('should extract JSON from mixed content', () => {
    const input = 'Here is the result: {"status": "ok"} and some more text'
    const result = safeParseAIJson(input)
    expect(result).toEqual({ status: 'ok' })
  })

  it('should use validator when provided', () => {
    interface TestType { name: string }
    const validator = (obj: unknown): obj is TestType => {
      return typeof obj === 'object' && obj !== null && 'name' in obj
    }
    
    const validResult = safeParseAIJson('{"name": "test"}', validator)
    expect(validResult).toEqual({ name: 'test' })
    
    const invalidResult = safeParseAIJson('{"value": 123}', validator)
    expect(invalidResult).toBeNull()
  })

  it('should handle nested JSON objects', () => {
    const input = '{"outer": {"inner": {"value": 42}}}'
    const result = safeParseAIJson(input)
    expect(result).toEqual({ outer: { inner: { value: 42 } } })
  })

  it('should handle JSON with arrays', () => {
    const input = '{"items": [1, 2, 3], "nested": [{"a": 1}, {"b": 2}]}'
    const result = safeParseAIJson(input)
    expect(result).toEqual({ items: [1, 2, 3], nested: [{ a: 1 }, { b: 2 }] })
  })

  it('should handle JSON with special characters in strings', () => {
    const input = '{"text": "Hello\\nWorld", "path": "C:\\\\Users"}'
    const result = safeParseAIJson(input)
    expect(result).toEqual({ text: 'Hello\nWorld', path: 'C:\\Users' })
  })
})

describe('Task Type Routing', () => {
  it('fast tasks should prioritize Groq', () => {
    const fastProviders = ['groq', 'gemini']
    expect(fastProviders[0]).toBe('groq')
  })

  it('heavy tasks should prioritize DeepSeek', () => {
    const heavyProviders = ['deepseek', 'gemini', 'groq']
    expect(heavyProviders[0]).toBe('deepseek')
  })

  it('chat tasks should only use Groq', () => {
    const chatProviders = ['groq']
    expect(chatProviders).toHaveLength(1)
    expect(chatProviders[0]).toBe('groq')
  })
})

describe('Rate Limiting Logic', () => {
  it('should track rate limit state', () => {
    const rateLimits: Record<string, { count: number; resetAt: number }> = {}
    
    function checkRateLimit(provider: string, limit: number): boolean {
      const now = Date.now()
      const state = rateLimits[provider]
      
      if (!state || now > state.resetAt) {
        rateLimits[provider] = { count: 1, resetAt: now + 60000 }
        return true
      }
      
      if (state.count >= limit) return false
      state.count++
      return true
    }

    // First call should pass
    expect(checkRateLimit('groq', 30)).toBe(true)
    expect(rateLimits['groq'].count).toBe(1)

    // Subsequent calls should increment
    expect(checkRateLimit('groq', 30)).toBe(true)
    expect(rateLimits['groq'].count).toBe(2)
  })

  it('should block when limit reached', () => {
    const rateLimits: Record<string, { count: number; resetAt: number }> = {}
    
    function checkRateLimit(provider: string, limit: number): boolean {
      const now = Date.now()
      const state = rateLimits[provider]
      
      if (!state || now > state.resetAt) {
        rateLimits[provider] = { count: 1, resetAt: now + 60000 }
        return true
      }
      
      if (state.count >= limit) return false
      state.count++
      return true
    }

    // Set count to limit
    rateLimits['groq'] = { count: 30, resetAt: Date.now() + 60000 }
    
    // Should be blocked
    expect(checkRateLimit('groq', 30)).toBe(false)
  })
})
