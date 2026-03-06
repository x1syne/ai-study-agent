import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { addXP, updateStreak, checkCardAchievements, XP_REWARDS } from '@/lib/gamification'

export const dynamic = 'force-dynamic'

// SM-2 algorithm implementation
function calculateNextReview(
  quality: number, // 0-5 scale
  easeFactor: number,
  interval: number,
  repetitions: number
) {
  let newEaseFactor = easeFactor
  let newInterval = interval
  let newRepetitions = repetitions

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      newInterval = 1
    } else if (repetitions === 1) {
      newInterval = 6
    } else {
      newInterval = Math.round(interval * easeFactor)
    }
    newRepetitions = repetitions + 1
  } else {
    // Incorrect response - reset
    newRepetitions = 0
    newInterval = 1
  }

  // Update ease factor
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  if (newEaseFactor < 1.3) newEaseFactor = 1.3

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
  }
}

// DELETE /api/review/[id] - Delete a review card
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const card = await prisma.reviewCard.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    await prisma.reviewCard.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting card:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/review/[id] - Rate a review card
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { response } = body // 'forgot' | 'hard' | 'good' | 'easy'

    // Map response to quality (0-5 scale)
    const qualityMap: Record<string, number> = {
      forgot: 1,
      hard: 3,
      good: 4,
      easy: 5,
    }
    const quality = qualityMap[response] || 3

    const card = await prisma.reviewCard.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (!card) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    // Calculate next review using SM-2
    const { easeFactor, interval, repetitions } = calculateNextReview(
      quality,
      card.easeFactor,
      card.interval,
      card.repetitions
    )

    // Calculate next review date
    const nextReviewDate = new Date()
    nextReviewDate.setDate(nextReviewDate.getDate() + interval)

    // Update card
    const updatedCard = await prisma.reviewCard.update({
      where: { id: params.id },
      data: {
        easeFactor,
        interval,
        repetitions,
        nextReviewDate,
        lastReviewDate: new Date(),
      },
    })

    // Add XP for reviewing card
    await addXP(user.id, XP_REWARDS.REVIEW_CARD, 'card_review')
    
    // Update streak
    await updateStreak(user.id)
    
    // Check card achievements
    await checkCardAchievements(user.id)

    return NextResponse.json(updatedCard)
  } catch (error) {
    console.error('Error rating card:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
