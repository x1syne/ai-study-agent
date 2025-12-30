import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/settings/telegram
 * Получить текущий Telegram ID пользователя
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { telegramId: true },
    })

    return NextResponse.json({
      telegramId: userData?.telegramId || null,
      linked: !!userData?.telegramId,
    })
  } catch (error) {
    console.error('Error getting telegram settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/user/settings/telegram
 * Привязать Telegram ID к аккаунту
 * Body: { telegramId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { telegramId } = body

    if (!telegramId || typeof telegramId !== 'string') {
      return NextResponse.json(
        { error: 'telegramId is required and must be a string' },
        { status: 400 }
      )
    }

    // Валидация формата Telegram ID (числовой ID)
    const telegramIdClean = telegramId.trim()
    if (!/^\d+$/.test(telegramIdClean)) {
      return NextResponse.json(
        { error: 'Invalid Telegram ID format. Must be numeric.' },
        { status: 400 }
      )
    }

    // Проверяем, не привязан ли уже этот Telegram ID к другому аккаунту
    const existingUser = await prisma.user.findUnique({
      where: { telegramId: telegramIdClean },
    })

    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json(
        { error: 'This Telegram ID is already linked to another account' },
        { status: 409 }
      )
    }

    // Обновляем пользователя
    await prisma.user.update({
      where: { id: user.id },
      data: { telegramId: telegramIdClean },
    })

    return NextResponse.json({
      success: true,
      telegramId: telegramIdClean,
      message: 'Telegram ID linked successfully',
    })
  } catch (error) {
    console.error('Error linking telegram:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/user/settings/telegram
 * Отвязать Telegram ID от аккаунта
 */
export async function DELETE() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { telegramId: null },
    })

    return NextResponse.json({
      success: true,
      message: 'Telegram ID unlinked successfully',
    })
  } catch (error) {
    console.error('Error unlinking telegram:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
