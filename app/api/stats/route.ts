import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { getDailyChallenge } from '@/lib/gamification'

export const dynamic = 'force-dynamic'

// GET /api/stats - Get user statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create user stats
    let stats = await prisma.userStats.findUnique({
      where: { userId: user.id },
    })

    if (!stats) {
      stats = await prisma.userStats.create({
        data: { userId: user.id },
      })
    }

    // Get completed lessons count
    const completedLessons = await prisma.lesson.count({
      where: {
        userId: user.id,
        completedAt: { not: null },
      },
    })

    // Get completed tasks count
    const completedTasks = await prisma.taskSubmission.count({
      where: {
        userId: user.id,
        isCorrect: true,
      },
    })

    // Calculate total study time from actual time spent in topics
    const topicProgress = await prisma.topicProgress.findMany({
      where: { userId: user.id },
    })

    const topicMinutes = topicProgress.reduce((sum, progress) => {
      return sum + progress.timeSpentMinutes
    }, 0)

    // Use the maximum between stored totalMinutes and calculated topicMinutes
    // This ensures we don't lose session time that was tracked
    const totalMinutes = Math.max(stats.totalMinutes, topicMinutes)

    // Get achievements
    const achievements = await prisma.achievement.findMany({
      where: { userId: user.id },
      orderBy: { unlockedAt: 'desc' },
    })

    // Get daily challenge
    const dailyChallenge = await getDailyChallenge(user.id)

    // Get activity for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentActivities = await prisma.lesson.findMany({
      where: {
        userId: user.id,
        completedAt: { gte: thirtyDaysAgo },
      },
      select: { completedAt: true },
    })

    const activityByDate: Record<string, number> = {}
    recentActivities.forEach(activity => {
      if (activity.completedAt) {
        const dateStr = activity.completedAt.toISOString().split('T')[0]
        activityByDate[dateStr] = (activityByDate[dateStr] || 0) + 1
      }
    })

    // Update UserStats totalMinutes if it's different
    if (stats.totalMinutes !== totalMinutes) {
      await prisma.userStats.update({
        where: { userId: user.id },
        data: { totalMinutes },
      })
    }

    return NextResponse.json({
      stats: {
        currentStreak: stats.currentStreak,
        longestStreak: stats.longestStreak,
        totalMinutes,
        totalLessons: completedLessons,
        totalTasks: completedTasks,
        totalXP: stats.totalXP,
        level: stats.level,
      },
      achievements: achievements.map(a => ({
        type: a.type,
        unlockedAt: a.unlockedAt,
      })),
      dailyChallenge,
      activityByDate,
    })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
