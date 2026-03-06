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
    const { model, messages, temperature, max_tokens, json_mode, tools, tool_choice } = await req.json()

    const body: Record<string, unknown> = {
      model: model || 'qwen/qwen3.5-397b-a17b',
      messages,
      temperature: temperature || 0.7,
      max_tokens: max_tokens || 4096,
    }

    if (json_mode) body.response_format = { type: 'json_object' }
    if (tools) { body.tools = tools; body.tool_choice = tool_choice || 'auto' }

    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return new Response(JSON.stringify({ error: `NVIDIA ${response.status}: ${errorText}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      })
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message

    return new Response(JSON.stringify({
      content: message?.content || '',
      tool_calls: message?.tool_calls || undefined,
    }), {
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    })
  }
})
