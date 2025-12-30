'use client'

import { cn } from '@/lib/utils'

export type AchievementType =
  | 'FIRST_LESSON'
  | 'FIRST_TOPIC'
  | 'FIRST_GOAL'
  | 'STREAK_3'
  | 'STREAK_7'
  | 'STREAK_30'
  | 'STREAK_100'
  | 'TASKS_10'
  | 'TASKS_50'
  | 'TASKS_100'
  | 'CARDS_10'
  | 'CARDS_50'
  | 'CARDS_100'
  | 'PERFECT_QUIZ'
  | 'SPEED_LEARNER'
  | 'NIGHT_OWL'
  | 'EARLY_BIRD'
  | 'XP_100'
  | 'XP_500'
  | 'XP_1000'
  | 'XP_5000'
  | 'LEVEL_5'
  | 'LEVEL_10'
  | 'DAILY_CHALLENGE_7'

interface AchievementInfo {
  icon: string
  name: string
  description: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export const ACHIEVEMENTS: Record<AchievementType, AchievementInfo> = {
  FIRST_LESSON: { icon: '📖', name: 'Первый шаг', description: 'Завершить первый урок', rarity: 'common' },
  FIRST_TOPIC: { icon: '🎯', name: 'Тема закрыта', description: 'Завершить первую тему', rarity: 'common' },
  FIRST_GOAL: { icon: '🚀', name: 'Цель поставлена', description: 'Создать первую цель', rarity: 'common' },
  STREAK_3: { icon: '🔥', name: 'Разогрев', description: '3 дня подряд', rarity: 'common' },
  STREAK_7: { icon: '🔥', name: 'Неделя огня', description: '7 дней подряд', rarity: 'rare' },
  STREAK_30: { icon: '🔥', name: 'Месяц в огне', description: '30 дней подряд', rarity: 'epic' },
  STREAK_100: { icon: '💎', name: 'Легенда', description: '100 дней подряд', rarity: 'legendary' },
  TASKS_10: { icon: '✅', name: 'Практик', description: 'Решить 10 задач', rarity: 'common' },
  TASKS_50: { icon: '💪', name: 'Трудяга', description: 'Решить 50 задач', rarity: 'rare' },
  TASKS_100: { icon: '🏆', name: 'Мастер задач', description: 'Решить 100 задач', rarity: 'epic' },
  CARDS_10: { icon: '🃏', name: 'Картёжник', description: 'Повторить 10 карточек', rarity: 'common' },
  CARDS_50: { icon: '🎴', name: 'Коллекционер', description: 'Повторить 50 карточек', rarity: 'rare' },
  CARDS_100: { icon: '🎰', name: 'Мастер памяти', description: 'Повторить 100 карточек', rarity: 'epic' },
  PERFECT_QUIZ: { icon: '💯', name: 'Перфекционист', description: 'Пройти квиз без ошибок', rarity: 'rare' },
  SPEED_LEARNER: { icon: '⚡', name: 'Скорость', description: 'Завершить тему за 10 минут', rarity: 'rare' },
  NIGHT_OWL: { icon: '🦉', name: 'Ночная сова', description: 'Учиться после полуночи', rarity: 'common' },
  EARLY_BIRD: { icon: '🐦', name: 'Ранняя пташка', description: 'Учиться до 7 утра', rarity: 'common' },
  XP_100: { icon: '⭐', name: 'Новичок', description: 'Набрать 100 XP', rarity: 'common' },
  XP_500: { icon: '🌟', name: 'Ученик', description: 'Набрать 500 XP', rarity: 'rare' },
  XP_1000: { icon: '✨', name: 'Знаток', description: 'Набрать 1000 XP', rarity: 'epic' },
  XP_5000: { icon: '💫', name: 'Эксперт', description: 'Набрать 5000 XP', rarity: 'legendary' },
  LEVEL_5: { icon: '🎖️', name: 'Уровень 5', description: 'Достичь 5 уровня', rarity: 'rare' },
  LEVEL_10: { icon: '🏅', name: 'Уровень 10', description: 'Достичь 10 уровня', rarity: 'epic' },
  DAILY_CHALLENGE_7: { icon: '🎯', name: 'Челленджер', description: '7 daily challenges подряд', rarity: 'rare' },
}

const rarityColors = {
  common: 'from-slate-400 to-slate-500',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-orange-500',
}

const rarityBorders = {
  common: 'border-slate-500/50',
  rare: 'border-blue-500/50',
  epic: 'border-purple-500/50',
  legendary: 'border-yellow-500/50 animate-pulse',
}

interface AchievementBadgeProps {
  type: AchievementType
  unlocked?: boolean
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}

export function AchievementBadge({
  type,
  unlocked = true,
  size = 'md',
  showName = false,
  className,
}: AchievementBadgeProps) {
  const achievement = ACHIEVEMENTS[type]
  if (!achievement) return null

  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl',
  }

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className={cn(
          sizeClasses[size],
          'rounded-xl flex items-center justify-center border-2 transition-all',
          unlocked
            ? `bg-gradient-to-br ${rarityColors[achievement.rarity]} ${rarityBorders[achievement.rarity]}`
            : 'bg-slate-800 border-slate-700 grayscale opacity-50'
        )}
        title={`${achievement.name}: ${achievement.description}`}
      >
        {achievement.icon}
      </div>
      {showName && (
        <span className={cn('text-xs text-center', unlocked ? 'text-white' : 'text-slate-500')}>
          {achievement.name}
        </span>
      )}
    </div>
  )
}

// Achievement unlock notification
export function AchievementUnlockToast({ type }: { type: AchievementType }) {
  const achievement = ACHIEVEMENTS[type]
  if (!achievement) return null

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-xl border border-yellow-500/50 animate-bounce">
      <div className="text-4xl">{achievement.icon}</div>
      <div>
        <div className="text-yellow-400 font-bold">Достижение разблокировано!</div>
        <div className="text-white font-medium">{achievement.name}</div>
        <div className="text-slate-400 text-sm">{achievement.description}</div>
      </div>
    </div>
  )
}

