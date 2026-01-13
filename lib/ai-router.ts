/**
 * AI ROUTER - Интеллектуальный роутер между AI провайдерами
 * 
 * Стратегия:
 * - fast: Groq (самый быстрый) → Gemini
 * - heavy: DeepSeek (дешёвый) → Gemini → Groq
 * - chat: только Groq (для скорости)
 * 
 * Включает:
 * - Автоматический fallback между провайдерами
 * - Rate limiting
 * - Retry с экспоненциальной задержкой
 * - Стриминг
 * - Vision API
 */

import Groq from 'groq-sdk'
import { withAIRetry, isAIRetryableError } from './utils/retry'
import { v4 as uuidv4 } from 'uuid'

// Типы
export type TaskType = 'fast' | 'heavy' | 'chat'

// === GIGACHAT AUTH ===
let gigaChatToken: string | null = null
let gigaChatTokenExpiry: number = 0

async function getGigaChatToken(): Promise<string> {
  // Если токен ещё валиден (с запасом 2 минуты) — возвращаем его
  if (gigaChatToken && Date.now() < gigaChatTokenExpiry - 120000) {
    return gigaChatToken
  }

  const authKey = process.env.GIGACHAT_AUTH_KEY
  if (!authKey) throw new Error('GIGACHAT_AUTH_KEY not configured')

  // Используем undici для поддержки самоподписанного сертификата Сбера
  const { fetch: undiciFetch, Agent } = await import('undici')
  const agent = new Agent({
    connect: {
      rejectUnauthorized: false
    }
  })

  const res = await undiciFetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'RqUID': uuidv4(),
      'Authorization': `Basic ${authKey}`,
    },
    body: 'scope=GIGACHAT_API_PERS',
    dispatcher: agent,
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`GigaChat auth failed: ${error}`)
  }

  const data = await res.json() as { access_token: string; expires_at: number }
  gigaChatToken = data.access_token
  // Используем expires_at из ответа (в миллисекундах)
  gigaChatTokenExpiry = data.expires_at
  
  console.log('[GigaChat] Token refreshed, expires at:', new Date(gigaChatTokenExpiry).toISOString())
  return gigaChatToken!
}

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
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
  
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

// Список моделей Gemini для каскадного fallback
// Только 2.5 Lite - используется как fallback после Groq
const GEMINI_MODELS = [
  'gemini-2.5-flash-lite-preview-06-17',  // Lite версия 2.5
]

// === GIGACHAT PROVIDER ===

async function generateGigaChat(
  system: string,
  user: string,
  options: GenerateOptions
): Promise<string> {
  const token = await getGigaChatToken()

  try {
    // Выбираем модель: Pro для сложных задач (JSON, большие ответы), Lite для остальных
    const model = options.json || (options.maxTokens && options.maxTokens > 2000)
      ? 'GigaChat-Pro' 
      : 'GigaChat'

    // Используем undici для поддержки самоподписанного сертификата Сбера
    const { fetch: undiciFetch, Agent } = await import('undici')
    const agent = new Agent({
      connect: {
        rejectUnauthorized: false
      }
    })

    const res = await undiciFetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Request-ID': uuidv4(),
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: false,
      }),
      dispatcher: agent,
    })

    if (!res.ok) {
      const error = await res.text()
      // Если токен истёк — сбрасываем и пробуем снова
      if (res.status === 401 || error.includes('Unauthorized')) {
        gigaChatToken = null
        gigaChatTokenExpiry = 0
        throw new Error('GigaChat: token expired, retry needed')
      }
      // Rate limit
      if (res.status === 429) {
        throw new Error('GigaChat: rate limited')
      }
      throw new Error(`GigaChat: ${error}`)
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { total_tokens: number; prompt_tokens: number; completion_tokens: number } }
    const content = data.choices?.[0]?.message?.content || ''
    
    // Логируем использование токенов
    if (data.usage) {
      console.log(`[GigaChat] ${model} - tokens: ${data.usage.total_tokens} (prompt: ${data.usage.prompt_tokens}, completion: ${data.usage.completion_tokens})`)
    }
    
    return content
  } catch (e: any) {
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

  const errors: string[] = []

  // Пробуем каждую модель по очереди
  for (const model of GEMINI_MODELS) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout

    try {
      console.log(`[Gemini] Trying model: ${model}`)
      
      // Gemma модели используют тот же API но с другим форматом
      const isGemma = model.startsWith('gemma')
      
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ 
              parts: [{ text: `${system}${jsonInstruction}\n\n${user}` }],
              role: 'user'
            }],
            generationConfig: {
              temperature: options.temperature ?? 0.7,
              maxOutputTokens: isGemma ? Math.min(options.maxTokens ?? 4096, 8192) : (options.maxTokens ?? 4096),
            },
          }),
          signal: controller.signal,
        }
      )

      clearTimeout(timeoutId)

      if (!res.ok) {
        const errorText = await res.text()
        // Проверяем на rate limit или quota exceeded
        if (errorText.includes('429') || errorText.includes('quota') || errorText.includes('rate') || errorText.includes('RESOURCE_EXHAUSTED')) {
          console.warn(`[Gemini] ${model} rate limited, trying next model...`)
          errors.push(`${model}: rate limited`)
          continue
        }
        // Модель не найдена - пробуем следующую
        if (errorText.includes('not found') || errorText.includes('404') || errorText.includes('NOT_FOUND')) {
          console.warn(`[Gemini] ${model} not found, trying next model...`)
          errors.push(`${model}: not found`)
          continue
        }
        throw new Error(`Gemini ${model}: ${errorText}`)
      }
      
      const data = await res.json()
      let content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
      
      // Очищаем markdown блоки если ожидаем JSON
      if (options.json && content) {
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      }
      
      if (content) {
        console.log(`[Gemini] Success with ${model}`)
        return content
      }
    } catch (e: any) {
      clearTimeout(timeoutId)
      const errorMsg = e?.message || String(e)
      errors.push(`${model}: ${errorMsg}`)
      
      if (e.name === 'AbortError') {
        console.warn(`[Gemini] ${model} timeout, trying next model...`)
        continue
      }
      
      // Если это rate limit ошибка - пробуем следующую модель
      if (errorMsg.includes('429') || errorMsg.includes('quota') || errorMsg.includes('rate')) {
        console.warn(`[Gemini] ${model} rate limited, trying next model...`)
        continue
      }
      
      // Для других ошибок тоже пробуем следующую модель
      console.warn(`[Gemini] ${model} failed: ${errorMsg}, trying next...`)
    }
  }
  
  throw new Error(`Gemini: all models failed - ${errors.join('; ')}`)
}

// === ГЛАВНЫЙ РОУТЕР ===

type ProviderFn = (s: string, u: string, o: GenerateOptions) => Promise<string>

const PROVIDERS: Record<string, { fn: ProviderFn; rateLimit: number }> = {
  gigachat: { fn: generateGigaChat, rateLimit: 60 },
  groq: { fn: generateGroq, rateLimit: 30 },
  deepseek: { fn: generateDeepSeek, rateLimit: 60 },
  gemini: { fn: generateGemini, rateLimit: 50 },
}

const ROUTING: Record<TaskType, string[]> = {
  fast: ['gigachat', 'groq', 'gemini'],   // GigaChat первый (быстрый и дешёвый)
  heavy: ['gigachat', 'groq', 'gemini'],  // GigaChat для тяжёлых задач тоже
  chat: ['gigachat', 'groq', 'gemini'],   // GigaChat для чата
}

/**
 * Генерация с автоматическим fallback между провайдерами
 * Включает retry с экспоненциальной задержкой для каждого провайдера
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
    if (name === 'gigachat' && !process.env.GIGACHAT_AUTH_KEY) continue
    if (name === 'deepseek' && !process.env.DEEPSEEK_API_KEY) continue
    if (name === 'gemini' && !process.env.GEMINI_API_KEY) continue

    try {
      console.log(`[AI Router] Trying ${name}...`)
      
      // Оборачиваем в retry для обработки временных ошибок
      const content = await withAIRetry(
        () => provider.fn(systemPrompt, userPrompt, options),
        `AI Router ${name}`
      )
      
      if (content) {
        console.log(`[AI Router] Success with ${name} in ${Date.now() - startTime}ms`)
        return { content, provider: name, latencyMs: Date.now() - startTime }
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e)
      errors.push(`${name}: ${errorMsg}`)
      console.warn(`[AI Router] ${name} failed:`, errorMsg)
      
      // Если ошибка не retryable — сразу переходим к следующему провайдеру
      if (!isAIRetryableError(e)) {
        console.log(`[AI Router] ${name} error is not retryable, trying next provider...`)
      }
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

// === STREAMING SUPPORT ===

/**
 * Стриминг генерации с автоматическим fallback
 * Возвращает AsyncGenerator для потоковой передачи чанков
 */
export async function* streamWithRouter(
  taskType: TaskType,
  systemPrompt: string,
  userPrompt: string,
  options: GenerateOptions = {}
): AsyncGenerator<string, void, unknown> {
  const providers = ROUTING[taskType]
  const errors: string[] = []

  for (const name of providers) {
    const provider = PROVIDERS[name]
    if (!provider) continue
    
    if (!checkRateLimit(name, provider.rateLimit)) {
      errors.push(`${name}: rate limited`)
      continue
    }

    // Проверяем наличие API ключа
    if (name === 'gigachat' && !process.env.GIGACHAT_AUTH_KEY) continue
    if (name === 'deepseek' && !process.env.DEEPSEEK_API_KEY) continue
    if (name === 'gemini' && !process.env.GEMINI_API_KEY) continue

    try {
      console.log(`[AI Router Stream] Trying ${name}...`)
      
      if (name === 'gigachat') {
        yield* streamGigaChat(systemPrompt, userPrompt, options)
        return
      } else if (name === 'groq') {
        yield* streamGroq(systemPrompt, userPrompt, options)
        return
      } else if (name === 'deepseek') {
        yield* streamDeepSeek(systemPrompt, userPrompt, options)
        return
      } else if (name === 'gemini') {
        // Gemini не поддерживает стриминг в простом API, делаем fallback на обычную генерацию
        const content = await generateGemini(systemPrompt, userPrompt, options)
        yield content
        return
      }
    } catch (e: any) {
      errors.push(`${name}: ${e.message}`)
      console.warn(`[AI Router Stream] ${name} failed:`, e.message)
    }
  }

  throw new Error(`All streaming providers failed: ${errors.join('; ')}`)
}

/**
 * Стриминг через GigaChat
 */
async function* streamGigaChat(
  system: string,
  user: string,
  options: GenerateOptions
): AsyncGenerator<string, void, unknown> {
  const token = await getGigaChatToken()
  
  const model = options.json || (options.maxTokens && options.maxTokens > 2000)
    ? 'GigaChat-Pro' 
    : 'GigaChat'

  // Используем undici для поддержки самоподписанного сертификата Сбера
  const { fetch: undiciFetch, Agent } = await import('undici')
  const agent = new Agent({
    connect: {
      rejectUnauthorized: false
    }
  })

  const res = await undiciFetch('https://gigachat.devices.sberbank.ru/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'Authorization': `Bearer ${token}`,
      'X-Request-ID': uuidv4(),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user }
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
      update_interval: 0,
    }),
    dispatcher: agent,
  })

  if (!res.ok) {
    const error = await res.text()
    if (res.status === 401) {
      gigaChatToken = null
      gigaChatTokenExpiry = 0
    }
    throw new Error(`GigaChat stream: ${error}`)
  }
  
  if (!res.body) throw new Error('GigaChat stream: no body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const text = decoder.decode(value, { stream: true })
    const lines = text.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {}
      }
    }
  }
}

/**
 * Стриминг через Groq
 */
async function* streamGroq(
  system: string,
  user: string,
  options: GenerateOptions
): AsyncGenerator<string, void, unknown> {
  // Прокси для России
  if (USE_PROXY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
          stream: true,
        }),
      })
      
      if (res.ok && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const text = decoder.decode(value, { stream: true })
          const lines = text.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) yield content
              } catch {}
            }
          }
        }
        return
      }
    } catch (e) {
      console.warn('[AI Router Stream] Groq proxy failed, trying direct...')
    }
  }

  // Прямой стриминг через Groq SDK
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
  
  for (const model of models) {
    try {
      const stream = await groq.chat.completions.create({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
      })

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content
        if (content) yield content
      }
      return
    } catch (e: any) {
      const msg = e?.message || ''
      if (msg.includes('rate') || msg.includes('429')) {
        console.warn(`[AI Router Stream] Groq ${model}: rate limited, trying next...`)
        continue
      }
      throw e
    }
  }
  throw new Error('Groq stream: all models failed')
}

/**
 * Стриминг через DeepSeek
 */
async function* streamDeepSeek(
  system: string,
  user: string,
  options: GenerateOptions
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DeepSeek API key not configured')

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
      stream: true,
    }),
  })

  if (!res.ok) throw new Error(`DeepSeek stream: ${await res.text()}`)
  if (!res.body) throw new Error('DeepSeek stream: no body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    const text = decoder.decode(value, { stream: true })
    const lines = text.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) yield content
        } catch {}
      }
    }
  }
}

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
