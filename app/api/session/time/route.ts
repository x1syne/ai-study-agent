import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/session/time - Update total session time
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { minutes } = await request.json()
    
    if (!minutes || minutes <= 0) {
      return NextResponse.json({ error: 'Invalid minutes value' }, { status: 400 })
    }

    // Update user stats with session time
    await prisma.userStats.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        totalMinutes: minutes,
      },
      update: {
        totalMinutes: {
          increment: minutes,
        },
        lastActiveDate: new Date(),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating session time:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}