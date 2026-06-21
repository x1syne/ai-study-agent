import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/ai-status - Проверка статуса AI провайдеров
export async function GET() {
  const status = {
    groq: !!process.env.GROQ_API_KEY,
    nvidia: !!process.env.NVIDIA_API_KEY,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    gemini: !!process.env.GEMINI_API_KEY,
    freellmapi: !!process.env.FREELLMAPI_API_KEY,
    providers: [] as string[]
  }

  if (status.groq) status.providers.push('Groq')
  if (status.nvidia) status.providers.push('NVIDIA')
  if (status.deepseek) status.providers.push('DeepSeek')
  if (status.gemini) status.providers.push('Gemini')
  if (status.freellmapi) status.providers.push('FreeLLMAPI')

  return NextResponse.json({
    ok: status.providers.length > 0,
    activeProviders: status.providers,
    message: status.providers.length > 1 
      ? `Оптимизация активна! Используются: ${status.providers.join(', ')}`
      : status.providers.length === 1
        ? `Работает только ${status.providers[0]}`
        : 'Нет активных AI провайдеров!'
  })
}
