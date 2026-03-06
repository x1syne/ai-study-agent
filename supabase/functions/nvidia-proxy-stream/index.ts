import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const NVIDIA_API_KEY = Deno.env.get('NVIDIA_API_KEY')
const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { model, messages, temperature, max_tokens } = await req.json()

    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'qwen/qwen3.5-397b-a17b',
        messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 4096,
        stream: true,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(JSON.stringify({ error: `NVIDIA stream ${response.status}: ${errorText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        ...CORS_HEADERS,
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
})
