/**
 * AI ROUTER — Интеллектуальный роутер между AI провайдерами
 *
 * 6 AI на 5 ролей (протестировано на реальных запросах):
 * - fast:    Groq LPU llama-3.3-70b (~0.3с) — проверка ответов, JSON, анализ
 * - heavy:   NVIDIA Mistral-Nemotron (~1.4с) — генерация теории курсов
 * - chat:    NVIDIA Nemotron Super 49B (~3с) — чат с AI-наставником
 * - agentic: NVIDIA Llama 3.3 70B (~1.2с) — структура курсов, модули
 * - images:  NVIDIA FLUX.1-schnell — иллюстрации
 * - fallback: Llama 3.3 70B — стабильный запасной
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

// Типы
export type TaskType = 'fast' | 'heavy' | 'chat' | 'agentic'
// Grok использует OpenAI-совместимый API

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
  /** Тип задачи — передаётся роутером для выбора модели внутри провайдера */
  _taskType?: TaskType
  tools?: Array<{
    type: 'function'
    function: {
      name: string
      description: string
      parameters: Record<string, any>
    }
  }>
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } }
}

export interface GenerateResult {
  content: string
  provider: string
  latencyMs: number
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: {
      name: string
      arguments: string
    }
  }>
}

// Конфигурация
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const USE_PROXY = process.env.VERCEL !== '1' && process.env.USE_DIRECT_GROQ !== 'true'

// Groq клиент
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

// NVIDIA NIM конфигурация (протестировано на реальных запросах)
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'
const NVIDIA_MODELS = {
  // 🧠 Генерация теории — agentic, tool calling, instruction following (~1.4с, стабильна)
  heavy: 'mistralai/mistral-nemotron',
  // 💬 Чат с AI-наставником — 49B, thinking mode, качественный диалог (~3с, стабильна)
  chat: 'nvidia/llama-3.3-nemotron-super-49b-v1.5',
  // 🤖 Агентные задачи — структура курсов, модули (~1.2с, самая стабильная)
  agentic: 'meta/llama-3.3-70b-instruct',
  // ⚡ Быстрые задачи на NVIDIA (fallback если Groq недоступен) (~1.2с)
  fast: 'meta/llama-3.3-70b-instruct',
  // 🛡️ Надёжный fallback — проверенный, стабильный
  fallback: 'meta/llama-3.3-70b-instruct',
  // 💻 Code review
  code: 'qwen/qwen2.5-coder-32b-instruct',
  // 🖼️ Генерация изображений
  image: 'black-forest-labs/flux.1-schnell',
} as const

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
): Promise<{ content: string; tool_calls?: any[] }> {
  console.log('[Groq] Starting generation...')
  
  // Прокси для России
  if (USE_PROXY) {
    try {
      console.log('[Groq] Trying proxy...')
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
        if (data.content) {
          console.log('[Groq] Proxy success:', data.content.length, 'chars')
          return data.content
        }
      } else {
        console.warn('[Groq] Proxy failed with status:', res.status)
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn('[Groq] Proxy timeout, trying direct...')
      } else {
        console.warn('[Groq] Proxy error:', e.message)
      }
      // fallthrough to direct
    }
  }

  // Прямой запрос с таймаутом через Promise.race
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant']
  
  for (const model of models) {
    try {
      console.log(`[Groq] Trying model: ${model}`)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Groq timeout')), 45000)
      )
      
      const requestPromise = groq.chat.completions.create({
        model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        response_format: options.json ? { type: 'json_object' } : undefined,
        tools: options.tools,
        tool_choice: options.tool_choice as any,
      })
      
      const res = await Promise.race([requestPromise, timeoutPromise])
      const message = res.choices[0]?.message
      const content = message?.content || ''
      const tool_calls = message?.tool_calls
      
      if (content || tool_calls) {
        console.log(`[Groq] Success with ${model}:`, content?.length || 0, 'chars', tool_calls?.length || 0, 'tool calls')
        return { content, tool_calls }
      }
    } catch (e: any) {
      const msg = e?.message || ''
      console.error(`[Groq] ${model} failed:`, msg)
      if (msg.includes('rate') || msg.includes('429') || msg.includes('timeout')) {
        console.warn(`[Groq] ${model}: ${msg}, trying next...`)
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
const GEMINI_MODELS = [
  'gemini-2.5-flash-lite-preview-06-17',  // Lite версия 2.5
]

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

// === NVIDIA NIM ПРОВАЙДЕР ===

/** Выбор модели NVIDIA по типу задачи */
function pickNvidiaModel(options: GenerateOptions): string {
  const taskType = options._taskType
  switch (taskType) {
    case 'heavy':   return NVIDIA_MODELS.heavy    // Mistral-Nemotron ~1.4с — генерация теории
    case 'chat':    return NVIDIA_MODELS.chat      // Nemotron Super 49B ~3с — диалог
    case 'agentic': return NVIDIA_MODELS.agentic   // Llama 3.3 70B ~1.2с — агентные задачи
    case 'fast':    return NVIDIA_MODELS.fast       // Llama 3.3 70B ~1.2с — быстрые задачи
    default:        return NVIDIA_MODELS.fallback   // Llama 3.3 70B — надёжный fallback
  }
}

async function generateNvidia(
  system: string,
  user: string,
  options: GenerateOptions
): Promise<{ content: string; tool_calls?: any[] }> {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) throw new Error('NVIDIA API key not configured')

  const model = pickNvidiaModel(options)
  const isHeavy = options._taskType === 'heavy'
  const useThinking = options._taskType === 'chat' // thinking mode только для чата
  // Увеличенный таймаут для тяжёлых задач (генерация теории)
  const timeoutMs = isHeavy ? 90000 : 60000

  console.log(`[NVIDIA] Model: ${model}, thinking: ${useThinking}, timeout: ${timeoutMs}ms`)

  // Прокси через Supabase Edge Function (для России)
  if (USE_PROXY) {
    try {
      console.log(`[NVIDIA] Trying proxy with model: ${model}`)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

      const res = await fetch(`${SUPABASE_URL}/functions/v1/nvidia-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? (isHeavy ? 8192 : 4096),
          json_mode: options.json ?? false,
          tools: options.tools,
          tool_choice: options.tool_choice,
          ...(useThinking ? { chat_template_kwargs: { thinking: true } } : {}),
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (res.ok) {
        const data = await res.json()
        if (data.content || data.tool_calls) {
          console.log(`[NVIDIA] Proxy success:`, data.content?.length || 0, 'chars')
          return { content: data.content || '', tool_calls: data.tool_calls }
        }
      } else {
        console.warn(`[NVIDIA] Proxy failed with status:`, res.status)
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.warn('[NVIDIA] Proxy timeout, trying direct...')
      } else {
        console.warn('[NVIDIA] Proxy error:', e.message)
      }
    }
  }

  // Прямой запрос (VPN / Vercel / зарубеж)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    console.log(`[NVIDIA] Direct request, model: ${model}`)

    const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? (isHeavy ? 8192 : 4096),
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
        ...(options.tools ? { tools: options.tools, tool_choice: options.tool_choice ?? 'auto' } : {}),
        ...(useThinking ? { chat_template_kwargs: { thinking: true } } : {}),
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const errorText = await res.text()
      if (res.status === 429 || errorText.includes('rate')) {
        console.warn(`[NVIDIA] ${model} rate limited, trying fallback...`)
        return generateNvidiaFallback(system, user, options, apiKey)
      }
      throw new Error(`NVIDIA ${model}: ${res.status} ${errorText}`)
    }

    const data = await res.json()
    const message = data.choices?.[0]?.message
    const content = message?.content || ''
    const tool_calls = message?.tool_calls

    if (content || tool_calls) {
      console.log(`[NVIDIA] Success with ${model}:`, content?.length || 0, 'chars')
      return { content, tool_calls }
    }
    throw new Error(`NVIDIA ${model}: empty response`)
  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') throw new Error('NVIDIA: timeout')
    throw e
  }
}

/** Fallback на быструю модель NVIDIA при rate limit */
async function generateNvidiaFallback(
  system: string,
  user: string,
  options: GenerateOptions,
  apiKey: string
): Promise<{ content: string; tool_calls?: any[] }> {
  const fallbackModel = NVIDIA_MODELS.fallback
  console.log(`[NVIDIA] Fallback to ${fallbackModel}`)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 45000)

  try {
    const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: fallbackModel,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
        ...(options.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    if (!res.ok) throw new Error(`NVIDIA fallback: ${await res.text()}`)

    const data = await res.json()
    const content = data.choices?.[0]?.message?.content || ''
    if (content) return { content }
    throw new Error('NVIDIA fallback: empty response')
  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e.name === 'AbortError') throw new Error('NVIDIA fallback: timeout')
    throw e
  }
}

/** FLUX.1-schnell API endpoint */
const FLUX_API_URL = 'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-schnell'
/** Допустимые размеры: 768x768, 1024x768, 768x1024, 1024x1024 */
const DEFAULT_IMAGE_WIDTH = 1024
const DEFAULT_IMAGE_HEIGHT = 768 // 4:3 — хорошо смотрится в теории
const DEFAULT_IMAGE_STEPS = 4

/**
 * Генерация изображений через NVIDIA FLUX.1-schnell
 * Формат API: text_prompts вместо prompt
 * Возвращает base64 изображение (JPEG)
 */
export async function generateImage(
  prompt: string,
  options: { width?: number; height?: number; steps?: number; seed?: number } = {}
): Promise<{ image: string; seed: number }> {
  const apiKey = process.env.NVIDIA_IMAGE_API_KEY || process.env.NVIDIA_API_KEY
  if (!apiKey) throw new Error('NVIDIA API key not configured for image generation')

  const { width = DEFAULT_IMAGE_WIDTH, height = DEFAULT_IMAGE_HEIGHT, steps = DEFAULT_IMAGE_STEPS, seed } = options

  console.log(`[NVIDIA Image] Generating: "${prompt.slice(0, 80)}..."`)

  // FLUX.1 API использует формат text_prompts (как Stable Diffusion)
  const body: Record<string, unknown> = {
    text_prompts: [{ text: prompt }],
    width,
    height,
    steps,
  }
  // seed=0 означает "случайный" на стороне API, передаём только если задан явно
  if (seed !== undefined && seed !== 0) body.seed = seed

  const res = await fetch(FLUX_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error(`[NVIDIA Image] Error ${res.status}: ${errText.slice(0, 200)}`)
    throw new Error(`NVIDIA Image: ${res.status} ${errText}`)
  }

  const data = await res.json()
  const image = data.artifacts?.[0]?.base64 || data.image || ''
  const resultSeed = data.artifacts?.[0]?.seed ?? 0

  if (!image) throw new Error('NVIDIA Image: no image in response')

  console.log(`[NVIDIA Image] Success, seed: ${resultSeed}`)
  return { image, seed: resultSeed }
}

// === ГЛАВНЫЙ РОУТЕР ===

type ProviderFn = (s: string, u: string, o: GenerateOptions) => Promise<{ content: string; tool_calls?: any[] } | string>

const PROVIDERS: Record<string, { fn: ProviderFn; rateLimit: number }> = {
  groq: { fn: generateGroq, rateLimit: 30 },
  nvidia: { fn: generateNvidia, rateLimit: 40 },
  deepseek: { fn: generateDeepSeek, rateLimit: 60 },
  gemini: { fn: generateGemini, rateLimit: 50 },
}

const ROUTING: Record<TaskType, string[]> = {
  fast:    ['groq', 'nvidia'],              // ⚡ Groq LPU ~0.3с → NVIDIA Llama 3.3
  heavy:   ['nvidia', 'groq'],              // 🧠 Mistral-Nemotron ~1.4с → Groq fallback
  chat:    ['nvidia', 'groq'],              // 💬 Nemotron Super 49B ~3с → Groq fallback
  agentic: ['nvidia', 'groq'],              // 🤖 Llama 3.3 70B ~1.2с → Groq fallback
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

  // Передаём taskType внутрь провайдера для выбора модели
  const optionsWithTask: GenerateOptions = { ...options, _taskType: taskType }

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
    if (name === 'nvidia' && !process.env.NVIDIA_API_KEY) continue

    try {
      console.log(`[AI Router] Trying ${name}...`)
      
      // Оборачиваем в retry для обработки временных ошибок
      const result = await withAIRetry(
        () => provider.fn(systemPrompt, userPrompt, optionsWithTask),
        `AI Router ${name}`
      )
      
      // Обрабатываем результат (может быть строкой или объектом с tool_calls)
      const content = typeof result === 'string' ? result : result.content
      const tool_calls = typeof result === 'object' ? result.tool_calls : undefined
      
      if (content || tool_calls) {
        console.log(`[AI Router] Success with ${name} in ${Date.now() - startTime}ms`)
        return { 
          content: content || '', 
          provider: name, 
          latencyMs: Date.now() - startTime,
          tool_calls 
        }
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
  // Передаём taskType внутрь провайдера для выбора модели
  const optionsWithTask: GenerateOptions = { ...options, _taskType: taskType }

  for (const name of providers) {
    const provider = PROVIDERS[name]
    if (!provider) continue

    if (!checkRateLimit(name, provider.rateLimit)) {
      errors.push(`${name}: rate limited`)
      continue
    }

    // Проверяем наличие API ключа
    if (name === 'deepseek' && !process.env.DEEPSEEK_API_KEY) continue
    if (name === 'gemini' && !process.env.GEMINI_API_KEY) continue
    if (name === 'nvidia' && !process.env.NVIDIA_API_KEY) continue

    try {
      console.log(`[AI Router Stream] Trying ${name}...`)

      if (name === 'groq') {
        yield* streamGroq(systemPrompt, userPrompt, optionsWithTask)
        return
      } else if (name === 'nvidia') {
        yield* streamNvidia(systemPrompt, userPrompt, optionsWithTask)
        return
      } else if (name === 'deepseek') {
        yield* streamDeepSeek(systemPrompt, userPrompt, optionsWithTask)
        return
      } else if (name === 'gemini') {
        // Gemini не поддерживает стриминг в простом API, делаем fallback на обычную генерацию
        const content = await generateGemini(systemPrompt, userPrompt, optionsWithTask)
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

/** Парсинг SSE чанков из стрима */
function* parseSSEChunks(text: string): Generator<string> {
  for (const line of text.split('\n')) {
    if (!line.startsWith('data: ')) continue
    const data = line.slice(6)
    if (data === '[DONE]') continue
    try {
      const parsed = JSON.parse(data)
      const content = parsed.choices?.[0]?.delta?.content
      if (content) yield content
    } catch {}
  }
}

/**
 * Стриминг через NVIDIA NIM (прокси + direct)
 */
async function* streamNvidia(
  system: string,
  user: string,
  options: GenerateOptions
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) throw new Error('NVIDIA API key not configured')

  const model = pickNvidiaModel(options)

  // Прокси для России
  if (USE_PROXY) {
    try {
      console.log(`[NVIDIA Stream] Trying proxy, model: ${model}`)
      const res = await fetch(`${SUPABASE_URL}/functions/v1/nvidia-proxy-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
        }),
      })

      if (res.ok && res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          yield* parseSSEChunks(decoder.decode(value, { stream: true }))
        }
        return
      }
      console.warn('[NVIDIA Stream] Proxy failed, trying direct...')
    } catch (e) {
      console.warn('[NVIDIA Stream] Proxy error, trying direct...')
    }
  }

  // Прямой запрос
  console.log(`[NVIDIA Stream] Direct, model: ${model}`)
  const res = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: true,
    }),
  })

  if (!res.ok) throw new Error(`NVIDIA stream: ${res.status} ${await res.text()}`)
  if (!res.body) throw new Error('NVIDIA stream: no body')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield* parseSSEChunks(decoder.decode(value, { stream: true }))
  }
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
