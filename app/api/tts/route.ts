import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const YANDEX_API_KEY = process.env.YANDEX_API_KEY
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID

function cleanMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '') // блоки кода
    .replace(/`[^`]+`/g, '') // inline код
    .replace(/#{1,6}\s*/g, '') // заголовки
    .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold**
    .replace(/\*([^*]+)\*/g, '$1') // *italic*
    .replace(/__([^_]+)__/g, '$1') // __bold__
    .replace(/_([^_]+)_/g, '$1') // _italic_
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // ссылки
    .replace(/!\[.*?\]\(.*?\)/g, '') // картинки
    .replace(/^[-*+]\s+/gm, '') // списки
    .replace(/^\d+\.\s+/gm, '') // нумерация
    .replace(/^>\s*/gm, '') // цитаты
    .replace(/\|.*\|/g, '') // таблицы
    .replace(/[-=]{3,}/g, '') // разделители
    .replace(/[#*`~\[\]<>|\\]/g, '') // спецсимволы
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(request: NextRequest) {
  const { text } = await request.json()
  if (!text) return NextResponse.json({ error: 'Text required' }, { status: 400 })
  if (!YANDEX_API_KEY || !YANDEX_FOLDER_ID) return NextResponse.json({ error: 'No Yandex' }, { status: 500 })

  const cleanText = cleanMarkdown(text)
  if (!cleanText) return NextResponse.json({ error: 'Empty text after cleanup' }, { status: 400 })

  const params = new URLSearchParams({
    text: cleanText.substring(0, 2000),
    lang: 'ru-RU',
    voice: 'filipp',
    folderId: YANDEX_FOLDER_ID,
    format: 'mp3',
  })

  const res = await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', {
    method: 'POST',
    headers: {
      'Authorization': 'Api-Key ' + YANDEX_API_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status })
  return new NextResponse(new Uint8Array(await res.arrayBuffer()), { headers: { 'Content-Type': 'audio/mpeg' } })
}

export async function GET() {
  return NextResponse.json({ provider: 'yandex' })
}
