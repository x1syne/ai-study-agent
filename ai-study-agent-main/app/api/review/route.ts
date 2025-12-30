import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/review - Get cards due for review today
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const cards = await prisma.reviewCard.findMany({
      where: {
        userId: user.id,
        nextReviewDate: { lte: today },
      },
      orderBy: { nextReviewDate: 'asc' },
    })

    // Get total cards count
    const totalCards = await prisma.reviewCard.count({
      where: { userId: user.id },
    })

    return NextResponse.json({
      cards,
      dueCount: cards.length,
      totalCount: totalCards,
    })
  } catch (error) {
    console.error('Error fetching review cards:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/review - Create a new review card
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { front, back, topicSlug } = body

    if (!front || !back) {
      return NextResponse.json({ error: 'Front and back are required' }, { status: 400 })
    }

    const card = await prisma.reviewCard.create({
      data: {
        userId: user.id,
        front,
        back,
        topicSlug: topicSlug || 'general',
      },
    })

    return NextResponse.json(card, { status: 201 })
  } catch (error) {
    console.error('Error creating review card:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
