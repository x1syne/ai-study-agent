'use client'

import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface XPDisplayProps {
  xp: number
  level: number
  className?: string
  showLevel?: boolean
}

// XP needed for each level (exponential growth)
export function getXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1))
}

export function getLevelFromXP(totalXP: number): { level: number; currentXP: number; nextLevelXP: number } {
  let level = 1
  let xpNeeded = getXPForLevel(level)
  let remainingXP = totalXP

  while (remainingXP >= xpNeeded) {
    remainingXP -= xpNeeded
    level++
    xpNeeded = getXPForLevel(level)
  }

  return {
    level,
    currentXP: remainingXP,
    nextLevelXP: xpNeeded,
  }
}

export function XPDisplay({ xp, level, className, showLevel = true }: XPDisplayProps) {
  const { currentXP, nextLevelXP } = getLevelFromXP(xp)
  const progress = (currentXP / nextLevelXP) * 100

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {showLevel && (
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
            <span className="text-sm font-bold text-white">{level}</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-slate-900 rounded-full flex items-center justify-center">
            <Zap className="w-3 h-3 text-yellow-400" />
          </div>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-slate-400">Уровень {level}</span>
          <span className="text-yellow-400 font-medium">{xp} XP</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {currentXP} / {nextLevelXP} до уровня {level + 1}
        </div>
      </div>
    </div>
  )
}

