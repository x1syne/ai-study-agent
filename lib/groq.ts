import Groq from 'groq-sdk'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// On Vercel, direct Groq works (server is in Europe)
// Proxy only needed for local development in Russia
const USE_PROXY = process.env.VERCEL !== '1' && process.env.USE_DIRECT_GROQ !== 'true'

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: {
    temperature?: number
    maxTokens?: number
    json?: boolean
  }
): Promise<string> {
  // Try Supabase Edge Function proxy first (works from Russia)
  if (USE_PROXY) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
          json_mode: options?.json ?? false,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.content || ''
      }
      
      console.log('Proxy failed, trying direct Groq...')
    } catch (e) {
      console.log('Proxy error, trying direct Groq...', e)
    }
  }

  // Models to try in order (fallback chain)
  const models = [
    'llama-3.3-70b-versatile',  // Best quality
    'llama-3.1-70b-versatile',  // Fallback
    'llama-3.1-8b-instant',     // Fast fallback
    'mixtral-8x7b-32768'        // Alternative
  ]
  
  let lastError: Error | null = null
  
  for (const model of models) {
    const maxRetries = 2
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Groq] Trying ${model}, attempt ${attempt}/${maxRetries}...`)
        
        const response = await groq.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
          response_format: options?.json ? { type: 'json_object' } : undefined,
        })

        const content = response.choices[0]?.message?.content || ''
        if (content) {
          console.log(`[Groq] Success with ${model}! Content length: ${content.length}`)
          return content
        }
        
        throw new Error('Empty response from AI')
      } catch (e: any) {
        lastError = e as Error
        const errorMsg = e?.message || e?.error?.message || String(e)
        console.error(`[Groq] ${model} attempt ${attempt} failed:`, errorMsg)
        
        // If rate limited or model unavailable, try next model
        if (errorMsg.includes('rate') || errorMsg.includes('429') || errorMsg.includes('503')) {
          console.log(`[Groq] Rate limited on ${model}, trying next model...`)
          break // Skip to next model
        }
        
        if (attempt < maxRetries) {
          const waitTime = 2000 * attempt
          console.log(`[Groq] Waiting ${waitTime}ms before retry...`)
          await new Promise(r => setTimeout(r, waitTime))
        }
      }
    }
  }
  
  console.error('[Groq] All models failed!')
  throw lastError || new Error('AI generation failed after trying all models')
}

export async function streamCompletion(
  systemPrompt: string,
  userPrompt: string
) {
  // Try models in order
  const models = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768']
  
  for (const model of models) {
    try {
      console.log(`[Groq Stream] Trying ${model}...`)
      const stream = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      })
      return stream
    } catch (e: any) {
      console.error(`[Groq Stream] ${model} failed:`, e?.message)
      continue
    }
  }
  
  throw new Error('All streaming models failed')
}
