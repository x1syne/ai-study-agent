import { prisma } from './prisma'

// XP rewards for different actions
export const XP_REWARDS = {
  COMPLETE_LESSON: 25,
  COMPLETE_TOPIC: 100,
  COMPLETE_TASK: 15,
  REVIEW_CARD: 5,
  PERFECT_QUIZ: 50,
  DAILY_CHALLENGE: 75,
  STREAK_BONUS: 10, // per day of streak
}

// Add XP to user
export async function addXP(userId: string, amount: number, reason?: string) {
  const stats = await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      totalXP: amount,
      level: 1,
    },
    update: {
      totalXP: { increment: amount },
    },
  })

  // Calculate new level
  const newLevel = calculateLevel(stats.totalXP)
  if (newLevel > stats.level) {
    await prisma.userStats.update({
      where: { userId },
      data: { level: newLevel },
    })

    // Check level achievements
    await checkLevelAchievements(userId, newLevel)
  }

  // Check XP achievements
  await checkXPAchievements(userId, stats.totalXP)

  return { xp: stats.totalXP, level: newLevel, added: amount }
}

// Calculate level from XP
export function calculateLevel(totalXP: number): number {
  let level = 1
  let xpNeeded = 100

  while (totalXP >= xpNeeded) {
    totalXP -= xpNeeded
    level++
    xpNeeded = Math.floor(100 * Math.pow(1.5, level - 1))
  }

  return level
}

// Update streak
export async function updateStreak(userId: string) {
  const stats = await prisma.userStats.findUnique({
    where: { userId },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let newStreak = 1
  let longestStreak = stats?.longestStreak || 0

  if (stats?.lastActiveDate) {
    const lastActive = new Date(stats.lastActiveDate)
    lastActive.setHours(0, 0, 0, 0)

    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      // Same day, keep streak
      newStreak = stats.currentStreak
    } else if (diffDays === 1) {
      // Consecutive day, increment streak
      newStreak = stats.currentStreak + 1
    }
    // else: streak broken, reset to 1
  }

  if (newStreak > longestStreak) {
    longestStreak = newStreak
  }

  await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      currentStreak: newStreak,
      longestStreak,
      lastActiveDate: today,
    },
    update: {
      currentStreak: newStreak,
      longestStreak,
      lastActiveDate: today,
    },
  })

  // Check streak achievements
  await checkStreakAchievements(userId, newStreak)

  // Add streak bonus XP
  if (newStreak > 1) {
    await addXP(userId, XP_REWARDS.STREAK_BONUS * Math.min(newStreak, 30), 'streak_bonus')
  }

  return { streak: newStreak, longestStreak }
}

// Check and unlock achievements
export async function checkAchievement(userId: string, type: string) {
  try {
    await prisma.achievement.create({
      data: {
        userId,
        type: type as any,
      },
    })
    return true
  } catch {
    // Already unlocked
    return false
  }
}

async function checkStreakAchievements(userId: string, streak: number) {
  if (streak >= 3) await checkAchievement(userId, 'STREAK_3')
  if (streak >= 7) await checkAchievement(userId, 'STREAK_7')
  if (streak >= 30) await checkAchievement(userId, 'STREAK_30')
  if (streak >= 100) await checkAchievement(userId, 'STREAK_100')
}

async function checkXPAchievements(userId: string, totalXP: number) {
  if (totalXP >= 100) await checkAchievement(userId, 'XP_100')
  if (totalXP >= 500) await checkAchievement(userId, 'XP_500')
  if (totalXP >= 1000) await checkAchievement(userId, 'XP_1000')
  if (totalXP >= 5000) await checkAchievement(userId, 'XP_5000')
}

async function checkLevelAchievements(userId: string, level: number) {
  if (level >= 5) await checkAchievement(userId, 'LEVEL_5')
  if (level >= 10) await checkAchievement(userId, 'LEVEL_10')
}

export async function checkTaskAchievements(userId: string) {
  const taskCount = await prisma.taskSubmission.count({
    where: { userId, isCorrect: true },
  })

  if (taskCount >= 10) await checkAchievement(userId, 'TASKS_10')
  if (taskCount >= 50) await checkAchievement(userId, 'TASKS_50')
  if (taskCount >= 100) await checkAchievement(userId, 'TASKS_100')
}

export async function checkCardAchievements(userId: string) {
  const cardCount = await prisma.reviewCard.count({
    where: { userId, repetitions: { gt: 0 } },
  })

  if (cardCount >= 10) await checkAchievement(userId, 'CARDS_10')
  if (cardCount >= 50) await checkAchievement(userId, 'CARDS_50')
  if (cardCount >= 100) await checkAchievement(userId, 'CARDS_100')
}

// Get daily challenge
export async function getDailyChallenge(userId: string) {
  const stats = await prisma.userStats.findUnique({
    where: { userId },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if already completed today
  if (stats?.dailyChallengeDate) {
    const challengeDate = new Date(stats.dailyChallengeDate)
    challengeDate.setHours(0, 0, 0, 0)
    if (challengeDate.getTime() === today.getTime() && stats.dailyChallengeCompleted) {
      return { completed: true, challenge: null }
    }
  }

  // Get a random available topic for the user
  const availableTopics = await prisma.topicProgress.findMany({
    where: {
      userId,
      status: { in: ['AVAILABLE', 'IN_PROGRESS'] },
    },
    include: { topic: true },
    take: 10,
  })

  if (availableTopics.length === 0) {
    return { completed: false, challenge: null }
  }

  const randomTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)]

  const challengeTypes = [
    { type: 'lesson', title: 'Изучи урок', description: 'Пройди теорию и практику по теме' },
    { type: 'review', title: 'Повтори карточки', description: 'Повтори 10 карточек' },
    { type: 'quiz', title: 'Пройди квиз', description: 'Ответь на 5 вопросов' },
  ]

  const challenge = challengeTypes[Math.floor(Math.random() * challengeTypes.length)]

  return {
    completed: false,
    challenge: {
      id: `daily-${today.getTime()}`,
      ...challenge,
      xpReward: XP_REWARDS.DAILY_CHALLENGE,
      topicId: randomTopic.topic.id,
      topicName: randomTopic.topic.name,
    },
  }
}

// Complete daily challenge
export async function completeDailyChallenge(userId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.userStats.upsert({
    where: { userId },
    create: {
      userId,
      dailyChallengeCompleted: true,
      dailyChallengeDate: today,
    },
    update: {
      dailyChallengeCompleted: true,
      dailyChallengeDate: today,
    },
  })

  await addXP(userId, XP_REWARDS.DAILY_CHALLENGE, 'daily_challenge')

  return { success: true }
}
