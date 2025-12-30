'use client'

import { X, Clock, ChartBar, Play, CheckCircle, Lock } from '@phosphor-icons/react'
import { Button, Badge, Progress } from '@/components/ui'
import type { Topic, TopicStatus } from '@/types'
import { formatMinutes } from '@/lib/utils'
import { getTopicIcon } from '@/lib/topic-icons'

interface TopicDetailsProps {
  topic: Topic
  onClose: () => void
  onStartLesson: () => void
}

const STATUS_CONFIG: Record<TopicStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'info' }> = {
  LOCKED: { label: 'Заблокировано', variant: 'default' },
  AVAILABLE: { label: 'Доступно', variant: 'info' },
  IN_PROGRESS: { label: 'В процессе', variant: 'warning' },
  COMPLETED: { label: 'Завершено', variant: 'success' },
  MASTERED: { label: 'Освоено', variant: 'success' },
}

const DIFFICULTY_CONFIG = {
  EASY: { label: 'Легко', color: 'text-green-400' },
  MEDIUM: { label: 'Средне', color: 'text-yellow-400' },
  HARD: { label: 'Сложно', color: 'text-orange-400' },
  EXPERT: { label: 'Эксперт', color: 'text-red-400' },
}

export function TopicDetails({ topic, onClose, onStartLesson }: TopicDetailsProps) {
  const progress = Array.isArray(topic.progress) ? topic.progress[0] : topic.progress
  const status = progress?.status || 'LOCKED'
  const mastery = progress?.masteryLevel || 0
  const statusConfig = STATUS_CONFIG[status as TopicStatus]
  const difficultyConfig = DIFFICULTY_CONFIG[topic.difficulty]

  const canStart = status !== 'LOCKED'
  const isCompleted = status === 'COMPLETED' || status === 'MASTERED'

  return (
    <div className="bg-slate-800/90 backdrop-blur-md rounded-xl border border-slate-700/50 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary)]/20 flex items-center justify-center">
            {(() => {
              const IconComponent = getTopicIcon(topic.name)
              return <IconComponent size={28} weight="duotone" className="text-[var(--color-primary)]" />
            })()}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{topic.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              <span className={`text-sm ${difficultyConfig.color}`}>
                {difficultyConfig.label}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} weight="bold" />
        </button>
      </div>

      {/* Description */}
      {topic.description && (
        <p className="text-slate-300 mb-6">{topic.description}</p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Clock size={16} weight="duotone" />
            <span className="text-sm">Время</span>
          </div>
          <div className="text-lg font-semibold text-white">
            {formatMinutes(topic.estimatedMinutes)}
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <ChartBar size={16} weight="duotone" />
            <span className="text-sm">Освоение</span>
          </div>
          <div className="text-lg font-semibold text-white">{mastery}%</div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Прогресс</span>
          <span className="text-white">{mastery}%</span>
        </div>
        <Progress value={mastery} />
      </div>

      {/* Checklist */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          {progress?.theoryCompleted ? (
            <CheckCircle size={20} weight="fill" className="text-green-400" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
          )}
          <span className={progress?.theoryCompleted ? 'text-slate-300' : 'text-slate-500'}>
            Теория изучена
          </span>
        </div>
        <div className="flex items-center gap-3">
          {(progress?.practiceScore || 0) >= 70 ? (
            <CheckCircle size={20} weight="fill" className="text-green-400" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
          )}
          <span className={(progress?.practiceScore || 0) >= 70 ? 'text-slate-300' : 'text-slate-500'}>
            Практика пройдена
          </span>
        </div>
      </div>

      {/* Action button */}
      {canStart ? (
        <Button
          onClick={onStartLesson}
          className="w-full"
          leftIcon={isCompleted ? <CheckCircle size={20} weight="fill" /> : <Play size={20} weight="fill" />}
        >
          {isCompleted ? 'Повторить' : status === 'IN_PROGRESS' ? 'Продолжить' : 'Начать изучение'}
        </Button>
      ) : (
        <Button disabled className="w-full" leftIcon={<Lock size={20} weight="duotone" />}>
          Сначала изучите предыдущие темы
        </Button>
      )}
    </div>
  )
}

