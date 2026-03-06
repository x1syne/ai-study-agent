import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/topics/[id]/time - Update time spent on topic
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { minutes } = await request.json()
    
    if (!minutes || minutes <= 0) {
      return NextResponse.json({ error: 'Invalid minutes value' }, { status: 400 })
    }

    const topicId = params.id

    // Find or create topic progress
    let progress = await prisma.topicProgress.findUnique({
      where: {
        userId_topicId: {
          userId: user.id,
          topicId: topicId,
        },
      },
    })

    if (!progress) {
      progress = await prisma.topicProgress.create({
        data: {
          userId: user.id,
          topicId: topicId,
          status: 'IN_PROGRESS',
          timeSpentMinutes: minutes,
        },
      })
    } else {
      progress = await prisma.topicProgress.update({
        where: {
          userId_topicId: {
            userId: user.id,
            topicId: topicId,
          },
        },
        data: {
          timeSpentMinutes: progress.timeSpentMinutes + minutes,
        },
      })
    }

    // Update user stats total minutes
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
      },
    })

    return NextResponse.json({ 
      success: true, 
      timeSpent: progress.timeSpentMinutes 
    })
  } catch (error) {
    console.error('Error updating time spent:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}