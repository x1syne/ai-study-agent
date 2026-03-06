'use client'

import { CheckCircle, Lock, Play, Clock } from 'lucide-react'
import { Progress, Badge } from '@/components/ui'
import { cn, formatMinutes } from '@/lib/utils'
import type { TopicStatus, Difficulty } from '@/types'

export interface TopicItemProps {
  topic: {
    id: string
    name: string
    description?: string | null
    icon?: string | null
    difficulty: Difficulty
    estimatedMinutes: number
    order: number
    progress?: {
      status: TopicStatus
      masteryLevel: number
    } | null
  }
  moduleOrder: number
  onClick: () => void
  isSelected?: boolean
}

const STATUS_CONFIG: Record<TopicStatus, { 
  icon: React.ReactNode
  color: string
  bgColor: string
}> = {
  LOCKED: { 
    icon: <Lock className="w-4 h-4" />, 
    color: 'text-slate-500',
    bgColor: 'bg-slate-700/30'
  },
  AVAILABLE: { 
    icon: <Play className="w-4 h-4" />, 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20'
  },
  IN_PROGRESS: { 
    icon: <Play className="w-4 h-4" />, 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20'
  },
  COMPLETED: { 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'text-green-400',
    bgColor: 'bg-green-500/20'
  },
  MASTERED: { 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'text-green-400',
    bgColor: 'bg-green-500/20'
  },
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; color: string }> = {
  EASY: { label: 'Легко', color: 'text-green-400' },
  MEDIUM: { label: 'Средне', color: 'text-yellow-400' },
  HARD: { label: 'Сложно', color: 'text-orange-400' },
  EXPERT: { label: 'Эксперт', color: 'text-red-400' },
}

/**
 * TopicItem - Individual topic within a module
 * 
 * Requirements: 3.4
 * - Numbering format X.Y (1.1, 1.2, 2.1...)
 * - Status and progress of topic
 */
export function TopicItem({
  topic,
  moduleOrder,
  onClick,
  isSelected = false,
}: TopicItemProps) {
  const status = topic.progress?.status || 'LOCKED'
  const mastery = topic.progress?.masteryLevel || 0
  const statusConfig = STATUS_CONFIG[status]
  const difficultyConfig = DIFFICULTY_CONFIG[topic.difficulty]
  
  const isLocked = status === 'LOCKED'
  const isCompleted = status === 'COMPLETED' || status === 'MASTERED'
  
  // Format topic number as X.Y (moduleOrder.topicOrder)
  const topicNumber = `${moduleOrder}.${topic.order}`

  return (
    <div
      onClick={isLocked ? undefined : onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-all',
        isLocked 
          ? 'opacity-60 cursor-not-allowed' 
          : 'cursor-pointer hover:bg-slate-700/50',
        isSelected && 'bg-primary-500/20 border border-primary-500/30',
        !isSelected && !isLocked && 'bg-slate-800/30'
      )}
    >
      {/* Status icon */}
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
        statusConfig.bgColor,
        statusConfig.color
      )}>
        {statusConfig.icon}
      </div>

      {/* Topic number */}
      <span className="text-slate-500 text-sm font-mono min-w-[2.5rem]">
        {topicNumber}
      </span>

      {/* Topic icon */}
      <span className="text-lg flex-shrink-0">
        {topic.icon || '📖'}
      </span>

      {/* Topic info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-white truncate">{topic.name}</div>
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatMinutes(topic.estimatedMinutes)}
          </span>
          <span className={difficultyConfig.color}>
            {difficultyConfig.label}
          </span>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-16 hidden sm:block">
          <Progress 
            value={mastery} 
            size="sm"
            color={isCompleted ? 'success' : 'primary'}
          />
        </div>
        <Badge
          variant={
            isCompleted ? 'success' 
            : status === 'IN_PROGRESS' ? 'warning'
            : status === 'AVAILABLE' ? 'info'
            : 'default'
          }
          size="sm"
        >
          {mastery}%
        </Badge>
      </div>
    </div>
  )
}
