/**
 * AI ROUTER - Интеллектуальный роутер между AI провайдерами
 * 
 * Стратегия:
 * - fast: Groq (самый быстрый) → Gemini
 * - heavy: DeepSeek (дешёвый) → Gemini → Groq
 * - chat: только Groq (для скорости)
 */

import Groq from 'groq-sdk'

// Типы
export type TaskType = 'fast' | 'heavy' | 'chat'

/**
 * Безопасный парсинг JSON из AI ответа
 * Извлекает JSON из текста и валидирует структуру
 */
export function safeParseAIJson<T>(
  content: string, 
  validator?: (obj: unknown) => obj is T
): T | null {
  try {
    // Очищаем markdown блоки
    let cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    
    // Ищем JSON объект или массив
    const jsonMatch = cleaned.match(/[\[{][\s\S]*[\]}]/)
    if (!jsonMatch) return null
    
    const parsed = JSON.parse(jsonMatch[0])
    
    // Если есть валидатор — проверяем
    if (validator && !validator(parsed)) return null
    
    return parsed as T
  } catch (e) {
    console.warn('[AI Router] JSON parse failed:', e)
    return null
  }
}

export interface GenerateOptions {
  temperature?: number
  maxTokens?: number
  json?: boolean
}

export interface GenerateResult {
  content: string
  provider: string
  latencyMs: number
}

// Конфигурация
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const USE_PROXY = process.env.VERCEL !== '1' && process.env.USE_DIRECT_GROQ !== 'true'

// Groq клиент
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// Rate limiting state
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

// === ПРОВАЙДЕРЫ ===

async function generateGroq(
  system: string,
  user: string,
  options: GenerateOptions
): Promise<string> {
  // Прокси для России
  if (USE_PROXY) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
      
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          json_mode: options.json ?? false,
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (res.ok) {
        const data = await res.json()
        if (data.content) return data.content
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn('[AI Router] Groq proxy timeout, trying direct...')
      }
      // fallthrough to direct
    }
  }

  // Прямой запрос с таймаутом через Promise.race
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
  
  for (const model of models) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Groq timeout')), 45000)
      )
      
      const requestPromise = groq.chat.completions.create({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        response_format: options.json ? { type: 'json_object' } : undefined,
      })
      
      const res = await Promise.race([requestPromise, timeoutPromise])
      const content = res.choices[0]?.message?.content
      if (content) return content
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('rate') || msg.includes('429') || msg.includes('timeout')) {
        console.warn(`[AI Router] Groq ${model}: ${msg}, trying next...`)
        continue
      }
      throw e
    }
  }
  throw new Error('Groq: all models failed')
}

async function generateDeepSeek(
  system: string,
  user: string,
  options: GenerateOptions
): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DeepSeek API key not configured')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60000) // 60s timeout для тяжёлых задач

  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        response_format: options.json ? { type: 'json_object' } : undefined,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`DeepSeek: ${await res.text()}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') throw new Error('DeepSeek: timeout')
    throw e
  }
}

async function generateGemini(
  system: string,
  user: string,
  options: GenerateOptions
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini API key not configured')

  // Gemini не поддерживает response_format, поэтому добавляем инструкцию в промпт
  const jsonInstruction = options.json 
    ? '\n\nВАЖНО: Ответь ТОЛЬКО валидным JSON без markdown блоков.' 
    : ''

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${system}${jsonInstruction}\n\n${user}` }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.7,
            maxOutputTokens: options.maxTokens ?? 4096,
          },
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!res.ok) throw new Error(`Gemini: ${await res.text()}`)
    const data = await res.json()
    let content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Очищаем markdown блоки если ожидаем JSON
    if (options.json && content) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    }
    
    return content
  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') throw new Error('Gemini: timeout')
    throw e
  }
}

// === ГЛАВНЫЙ РОУТЕР ===

type ProviderFn = (s: string, u: string, o: GenerateOptions) => Promise<string>

const PROVIDERS: Record<string, { fn: ProviderFn; rateLimit: number }> = {
  groq: { fn: generateGroq, rateLimit: 30 },
  deepseek: { fn: generateDeepSeek, rateLimit: 60 },
  gemini: { fn: generateGemini, rateLimit: 50 },
}

const ROUTING: Record<TaskType, string[]> = {
  fast: ['groq', 'gemini'],
  heavy: ['deepseek', 'gemini', 'groq'],
  chat: ['groq'],
}

/**
 * Генерация с автоматическим fallback между провайдерами
 */
export async function generateWithRouter(
  taskType: TaskType,
  systemPrompt: string,
  userPrompt: string,
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const startTime = Date.now()
  const providers = ROUTING[taskType]
  const errors: string[] = []

  for (const name of providers) {
    const provider = PROVIDERS[name]
    if (!provider) continue
    
    // Проверяем rate limit
    if (!checkRateLimit(name, provider.rateLimit)) {
      errors.push(`${name}: rate limited`)
      continue
    }

    // Проверяем наличие API ключа
    if (name === 'deepseek' && !process.env.DEEPSEEK_API_KEY) continue
    if (name === 'gemini' && !process.env.GEMINI_API_KEY) continue

    try {
      console.log(`[AI Router] Trying ${name}...`)
      const content = await provider.fn(systemPrompt, userPrompt, options)
      
      if (content) {
        console.log(`[AI Router] Success with ${name} in ${Date.now() - startTime}ms`)
        return { content, provider: name, latencyMs: Date.now() - startTime }
      }
    } catch (e: any) {
      errors.push(`${name}: ${e.message}`)
      console.warn(`[AI Router] ${name} failed:`, e.message)
    }
  }

  throw new Error(`All providers failed: ${errors.join('; ')}`)
}

/**
 * Параллельная генерация нескольких промптов
 */
export async function generateParallel(
  taskType: TaskType,
  prompts: Array<{ system: string; user: string; options?: GenerateOptions }>
): Promise<Array<{ success: boolean; content?: string; error?: string }>> {
  const results = await Promise.allSettled(
    prompts.map(p => generateWithRouter(taskType, p.system, p.user, p.options || {}))
  )

  return results.map(r => {
    if (r.status === 'fulfilled') {
      return { success: true, content: r.value.content }
    }
    return { success: false, error: r.reason?.message }
  })
}

// Экспорт для обратной совместимости с groq.ts
export { generateGroq as generateCompletion }

// === VISION SUPPORT ===

/**
 * Генерация с поддержкой изображений (Vision)
 * Использует Groq с fallback на Gemini
 */
export async function generateWithVision(
  systemPrompt: string,
  textContent: string,
  imageUrls: string[],
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const startTime = Date.now()
  const errors: string[] = []

  // 1. Пробуем Groq Vision
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('[AI Router] Trying Groq Vision...')
      
      const contentParts: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
        { type: 'text', text: `${systemPrompt}\n\n${textContent}` }
      ]
      
      for (const url of imageUrls) {
        contentParts.push({ type: 'image_url', image_url: { url } })
      }

      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Groq Vision timeout')), 45000)
      )

      const requestPromise = groq.chat.completions.create({
        model: 'llama-3.2-90b-vision-preview',
        messages: [{ 
          role: 'user', 
          // @ts-expect-error - Groq SDK types don't fully support vision yet
          content: contentParts 
        }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      }) as Promise<{ choices: Array<{ message?: { content?: string } }> }>

      const res = await Promise.race([requestPromise, timeoutPromise])
      const content = res.choices[0]?.message?.content
      
      if (content) {
        console.log(`[AI Router] Groq Vision success in ${Date.now() - startTime}ms`)
        return { content, provider: 'groq-vision', latencyMs: Date.now() - startTime }
      }
    } catch (e: any) {
      errors.push(`groq-vision: ${e.message}`)
      console.warn('[AI Router] Groq Vision failed:', e.message)
    }
  }

  // 2. Fallback на Gemini Vision
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('[AI Router] Trying Gemini Vision...')
      
      const parts: Array<{ text: string } | { inline_data: { mime_type: string; data: string } }> = [
        { text: `${systemPrompt}\n\n${textContent}` }
      ]
      
      // Конвертируем base64 изображения для Gemini
      for (const url of imageUrls) {
        if (url.startsWith('data:')) {
          const match = url.match(/^data:([^;]+);base64,(.+)$/)
          if (match) {
            parts.push({
              inline_data: {
                mime_type: match[1],
                data: match[2]
              }
            })
          }
        }
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: options.maxTokens ?? 4096,
            },
          }),
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        
        if (content) {
          console.log(`[AI Router] Gemini Vision success in ${Date.now() - startTime}ms`)
          return { content, provider: 'gemini-vision', latencyMs: Date.now() - startTime }
        }
      }
    } catch (e: any) {
      errors.push(`gemini-vision: ${e.message}`)
      console.warn('[AI Router] Gemini Vision failed:', e.message)
    }
  }

  throw new Error(`All vision providers failed: ${errors.join('; ')}`)
}
