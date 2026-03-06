/**
 * API для управления конкретной сессией
 * 
 * GET /api/sessions/[id] - получить сессию с историей
 * DELETE /api/sessions/[id] - удалить сессию
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCheckpointer } from '@/lib/ai/checkpointer'

interface RouteParams {
  params: { id: string }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const checkpointer = getCheckpointer()
    
    // Получаем сессию
    const conversationSession = await checkpointer.getSession(params.id)
    if (!conversationSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Проверяем владельца
    if (conversationSession.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Загружаем историю
    const messages = await checkpointer.loadHistory(params.id, limit)

    return NextResponse.json({
      session: conversationSession,
      messages
    })
  } catch (error) {
    console.error('Error fetching session:', error)
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const checkpointer = getCheckpointer()
    
    // Проверяем владельца
    const conversationSession = await checkpointer.getSession(params.id)
    if (!conversationSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (conversationSession.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await checkpointer.deleteSession(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}
