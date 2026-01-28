/**
 * API для управления предпочтениями пользователя
 * 
 * GET /api/preferences - получить предпочтения
 * PUT /api/preferences - обновить предпочтения
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { 
  getOrCreatePreferences, 
  updateUserPreferences,
  UpdatePreferencesParams 
} from '@/lib/ai/user-preferences'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const preferences = await getOrCreatePreferences(user.id)

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error fetching preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as UpdatePreferencesParams

    // Валидация
    if (body.detailLevel && !['BRIEF', 'BALANCED', 'DETAILED'].includes(body.detailLevel)) {
      return NextResponse.json(
        { error: 'Invalid detailLevel' },
        { status: 400 }
      )
    }

    if (body.explanationStyle && 
        !['THEORETICAL', 'PRACTICAL', 'MIXED', 'EXAMPLES_FIRST'].includes(body.explanationStyle)) {
      return NextResponse.json(
        { error: 'Invalid explanationStyle' },
        { status: 400 }
      )
    }

    const preferences = await updateUserPreferences(user.id, body)

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error updating preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    )
  }
}
