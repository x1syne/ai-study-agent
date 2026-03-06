'use client'

import { Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreakDisplayProps {
  streak: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function StreakDisplay({ streak, className, size = 'md' }: StreakDisplayProps) {
  const isActive = streak > 0
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }
  
  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          sizeClasses[size],
          'rounded-xl flex items-center justify-center transition-all',
          isActive
            ? 'bg-gradient-to-br from-orange-500 to-red-500 animate-pulse'
            : 'bg-slate-700'
        )}
      >
        <Flame
          className={cn(
            iconSizes[size],
            isActive ? 'text-white' : 'text-slate-500'
          )}
        />
      </div>
      <div>
        <div className={cn(textSizes[size], 'font-bold', isActive ? 'text-orange-400' : 'text-slate-500')}>
          {streak}
        </div>
        <div className="text-sm text-slate-400">
          {streak === 1 ? 'день' : streak >= 2 && streak <= 4 ? 'дня' : 'дней'} подряд
        </div>
      </div>
    </div>
  )
}

// Streak freeze indicator
export function StreakFreezeIndicator({ hasFreezes, freezeCount }: { hasFreezes: boolean; freezeCount: number }) {
  if (!hasFreezes) return null
  
  return (
    <div className="flex items-center gap-1 text-blue-400 text-sm">
      <span>❄️</span>
      <span>{freezeCount} заморозок</span>
    </div>
  )
}

