/**
 * 🧠 LLM WRAPPER - Unified LLM Interface
 * 
 * Groq (primary) + HuggingFace (fallback) с:
 * - Rate limiting (throttle 1 req/sec)
 * - Retry logic (3 attempts)
 * - Timeout handling (5 sec default)
 * - Token tracking
 * 
 * Лимиты Groq (Dec 2025):
 * - 14,400 req/day
 * - 70K TPM (tokens per minute)
 * - ~500K-1M tokens/day
 */

import Groq from 'groq-sdk'
import { HfInference } from '@huggingface/inference'
import { throttle } from 'lodash'
import type { LLMResponse, GenerationConfig } from './agents/types'

// ═══════════════════════════════════════════════════════════════
// 🔧 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile', 
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768'
] as const

const HF_MODELS = [
  'meta-llama/Llama-3.2-3B-Instruct',
  'mistralai/Mistral-7B-Instruct-v0.3',
  'microsoft/Phi-3-mini-4k-instruct'
] as const

const DEFAULT_CONFIG: Required<GenerationConfig> = {
  temperature: 0.7,
  maxTokens: 4096,
  json: false,
  retries: 3,
  timeout: 30000 // 30 seconds
}

// ═══════════════════════════════════════════════════════════════
// 📊 RATE LIMITING & TRACKING
// ═══════════════════════════════════════════════════════════════

interface UsageStats {
  requestsToday: number
  tokensToday: number
  lastReset: string
  errors: number
}

const usage: UsageStats = {
  requestsToday: 0,
  tokensToday: 0,
  lastReset: new Date().toDateString(),
  errors: 0
}

function checkAndResetDaily() {
  const today = new Date().toDateString()
  if (usage.lastReset !== today) {
    usage.requestsToday = 0
    usage.tokensToday = 0
    usage.lastReset = today
    usage.errors = 0
    console.log('[LLM] Daily usage reset')
  }
}

function trackUsage(tokens: number) {
  checkAndResetDaily()
  usage.requestsToday++
  usage.tokensToday += tokens
  
  // Warn if approaching limits
  if (usage.requestsToday > 12000) {
    console.warn(`[LLM] ⚠️ High request count: ${usage.requestsToday}/14400`)
  }
  if (usage.tokensToday > 400000) {
    console.warn(`[LLM] ⚠️ High token usage: ${usage.tokensToday}/500000`)
  }
}

export function getUsageStats(): UsageStats {
  checkAndResetDaily()
  return { ...usage }
}

// ═══════════════════════════════════════════════════════════════
// 🚀 GROQ CLIENT
// ═══════════════════════════════════════════════════════════════

let groqClient: Groq | null = null

function getGroqClient(): Groq | null {
  if (!process.env.GROQ_API_KEY) {
    console.warn('[LLM] GROQ_API_KEY not set')
    return null
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groqClient
}

async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  config: Required<GenerationConfig>
): Promise<LLMResponse> {
  const client = getGroqClient()
  if (!client) throw new Error('Groq client not available')
  
  const startTime = Date.now()
  
  for (const model of GROQ_MODELS) {
    try {
      console.log(`[LLM] Trying Groq ${model}...`)
      
      const response = await Promise.race([
        client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          response_format: config.json ? { type: 'json_object' } : undefined
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), config.timeout)
        )
      ])
      
      const content = response.choices[0]?.message?.content || ''
      const tokensUsed = response.usage?.total_tokens || 0
      
      if (content) {
        trackUsage(tokensUsed)
        console.log(`[LLM] ✅ Groq ${model} success (${tokensUsed} tokens)`)
        
        return {
          content,
          provider: 'groq',
          tokensUsed,
          latencyMs: Date.now() - startTime
        }
      }
    } catch (error: any) {
      const msg = error?.message || String(error)
      console.warn(`[LLM] Groq ${model} failed: ${msg}`)
      
      // Rate limit - try next model
      if (msg.includes('rate') || msg.includes('429')) {
        continue
      }
      // Timeout - try next model
      if (msg.includes('Timeout')) {
        continue
      }
    }
  }
  
  throw new Error('All Groq models failed')
}

// ═══════════════════════════════════════════════════════════════
// 🤗 HUGGINGFACE CLIENT (FALLBACK)
// ═══════════════════════════════════════════════════════════════

let hfClient: HfInference | null = null

function getHFClient(): HfInference | null {
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.warn('[LLM] HUGGINGFACE_API_KEY not set')
    return null
  }
  if (!hfClient) {
    hfClient = new HfInference(process.env.HUGGINGFACE_API_KEY)
  }
  return hfClient
}

async function callHuggingFace(
  systemPrompt: string,
  userPrompt: string,
  config: Required<GenerationConfig>
): Promise<LLMResponse> {
  const client = getHFClient()
  if (!client) throw new Error('HuggingFace client not available')
  
  const startTime = Date.now()
  const fullPrompt = `${systemPrompt}\n\nUser: ${userPrompt}\n\nAssistant:`
  
  for (const model of HF_MODELS) {
    try {
      console.log(`[LLM] Trying HuggingFace ${model}...`)
      
      const response = await Promise.race([
        client.textGeneration({
          model,
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: config.maxTokens,
            temperature: config.temperature,
            return_full_text: false
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), config.timeout)
        )
      ])
      
      const content = response.generated_text || ''
      
      if (content) {
        // HF doesn't return token count, estimate
        const tokensUsed = Math.ceil(content.length / 4)
        trackUsage(tokensUsed)
        console.log(`[LLM] ✅ HuggingFace ${model} success`)
        
        return {
          content,
          provider: 'huggingface',
          tokensUsed,
          latencyMs: Date.now() - startTime
        }
      }
    } catch (error: any) {
      console.warn(`[LLM] HuggingFace ${model} failed: ${error?.message}`)
    }
  }
  
  throw new Error('All HuggingFace models failed')
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN API - THROTTLED
// ═══════════════════════════════════════════════════════════════

/**
 * Internal call function (not throttled)
 */
async function _callLLM(
  systemPrompt: string,
  userPrompt: string,
  config: GenerationConfig = {}
): Promise<LLMResponse> {
  const fullConfig: Required<GenerationConfig> = { ...DEFAULT_CONFIG, ...config }
  
  let lastError: Error | null = null
  
  // Try Groq first (primary)
  for (let attempt = 1; attempt <= fullConfig.retries; attempt++) {
    try {
      return await callGroq(systemPrompt, userPrompt, fullConfig)
    } catch (error: any) {
      lastError = error
      console.warn(`[LLM] Groq attempt ${attempt}/${fullConfig.retries} failed`)
      
      if (attempt < fullConfig.retries) {
        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    }
  }
  
  // Fallback to HuggingFace
  console.log('[LLM] Falling back to HuggingFace...')
  
  for (let attempt = 1; attempt <= fullConfig.retries; attempt++) {
    try {
      return await callHuggingFace(systemPrompt, userPrompt, fullConfig)
    } catch (error: any) {
      lastError = error
      console.warn(`[LLM] HuggingFace attempt ${attempt}/${fullConfig.retries} failed`)
      
      if (attempt < fullConfig.retries) {
        await new Promise(r => setTimeout(r, 1000 * attempt))
      }
    }
  }
  
  usage.errors++
  throw lastError || new Error('All LLM providers failed')
}

/**
 * Throttled LLM call - max 1 request per second
 * Prevents rate limiting issues
 */
const throttledCall = throttle(
  async (
    systemPrompt: string,
    userPrompt: string,
    config: GenerationConfig
  ): Promise<LLMResponse> => {
    return _callLLM(systemPrompt, userPrompt, config)
  },
  1000, // 1 second between calls
  { leading: true, trailing: true }
)

/**
 * Main LLM API
 * 
 * @param systemPrompt - System instructions
 * @param userPrompt - User message
 * @param config - Generation config
 * @returns LLM response with metadata
 * 
 * @example
 * const response = await callLLM(
 *   'You are a helpful assistant',
 *   'Explain OOP in Python',
 *   { temperature: 0.7, maxTokens: 2000 }
 * )
 */
export async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  config: GenerationConfig = {}
): Promise<LLMResponse> {
  return throttledCall(systemPrompt, userPrompt, config) as Promise<LLMResponse>
}

/**
 * Call LLM expecting JSON response
 * Automatically parses and validates
 */
export async function callLLMJson<T>(
  systemPrompt: string,
  userPrompt: string,
  config: Omit<GenerationConfig, 'json'> = {}
): Promise<{ data: T; meta: Omit<LLMResponse, 'content'> }> {
  const response = await callLLM(systemPrompt, userPrompt, { ...config, json: true })
  
  try {
    // Clean markdown code blocks if present
    let content = response.content
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim()
    
    // Find JSON object/array
    const jsonMatch = content.match(/[\[{][\s\S]*[\]}]/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    const data = JSON.parse(jsonMatch[0]) as T
    
    return {
      data,
      meta: {
        provider: response.provider,
        tokensUsed: response.tokensUsed,
        latencyMs: response.latencyMs
      }
    }
  } catch (error) {
    console.error('[LLM] JSON parse error:', error)
    console.error('[LLM] Raw content:', response.content.slice(0, 500))
    throw new Error(`Failed to parse LLM JSON response: ${error}`)
  }
}

/**
 * Batch LLM calls with concurrency control
 */
export async function callLLMBatch(
  prompts: Array<{ system: string; user: string; config?: GenerationConfig }>,
  concurrency: number = 2
): Promise<Array<{ success: boolean; response?: LLMResponse; error?: string }>> {
  const results: Array<{ success: boolean; response?: LLMResponse; error?: string }> = []
  
  for (let i = 0; i < prompts.length; i += concurrency) {
    const batch = prompts.slice(i, i + concurrency)
    
    const batchResults = await Promise.allSettled(
      batch.map(p => callLLM(p.system, p.user, p.config))
    )
    
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push({ success: true, response: result.value })
      } else {
        results.push({ success: false, error: result.reason?.message })
      }
    }
    
    // Small delay between batches
    if (i + concurrency < prompts.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }
  
  return results
}

// ═══════════════════════════════════════════════════════════════
// 🔄 LEGACY COMPATIBILITY
// ═══════════════════════════════════════════════════════════════

/**
 * Legacy wrapper for existing code
 * @deprecated Use callLLM instead
 */
export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number
    maxTokens?: number
    json?: boolean
  }
): Promise<string> {
  const response = await callLLM(systemPrompt, userPrompt, options)
  return response.content
}
