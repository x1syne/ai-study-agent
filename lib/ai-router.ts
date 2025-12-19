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
      })
      if (res.ok) {
        const data = await res.json()
        if (data.content) return data.content
      }
    } catch { /* fallthrough to direct */ }
  }

  // Прямой запрос
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
  
  for (const model of models) {
    try {
      const res = await groq.chat.completions.create({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        response_format: options.json ? { type: 'json_object' } : undefined,
      })
      const content = res.choices[0]?.message?.content
      if (content) return content
    } catch (e: any) {
      if (e?.message?.includes('rate') || e?.message?.includes('429')) continue
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
  })

  if (!res.ok) throw new Error(`DeepSeek: ${await res.text()}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

async function generateGemini(
  system: string,
  user: string,
  options: GenerateOptions
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Gemini API key not configured')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${system}\n\n${user}` }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.7,
          maxOutputTokens: options.maxTokens ?? 4096,
        },
      }),
    }
  )

  if (!res.ok) throw new Error(`Gemini: ${await res.text()}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
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
