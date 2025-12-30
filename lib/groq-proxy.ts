// Proxy Groq requests through Supabase Edge Function
// This allows access from Russia without VPN

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface CompletionOptions {
  temperature?: number
  maxTokens?: number
  json?: boolean
}

export async function generateCompletionProxy(
  systemPrompt: string,
  userPrompt: string,
  options?: CompletionOptions
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]

  // Try Supabase Edge Function first (works from Russia)
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        json_mode: options?.json ?? false,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      return data.content || data.message || ''
    }
    
    console.log('Edge function not available, trying direct Groq call...')
  } catch (e) {
    console.log('Edge function error, trying direct Groq call...', e)
  }

  // Fallback to direct Groq call (needs VPN in Russia)
  const { generateCompletion } = await import('./groq')
  return generateCompletion(systemPrompt, userPrompt, options)
}
