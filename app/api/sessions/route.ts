/**
 * API для управления сессиями диалогов
 * 
 * GET /api/sessions - список сессий пользователя
 * POST /api/sessions - создание новой сессии
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCheckpointer } from '@/lib/ai/checkpointer'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const characterId = searchParams.get('characterId') || 'default'

    const checkpointer = getCheckpointer()
    const sessions = await checkpointer.listSessions(user.id, characterId)

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { characterId = 'default', title } = body

    const checkpointer = getCheckpointer()
    const newSession = await checkpointer.createSession({
      userId: user.id,
      characterId,
      title
    })

    return NextResponse.json({ session: newSession }, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
