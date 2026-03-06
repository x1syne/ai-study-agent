'use client'

import { useState } from 'react'
import { Zap, CheckCircle, Clock, Gift } from 'lucide-react'
import { Card, CardContent, Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface DailyChallengeProps {
  challenge: {
    id: string
    type: 'lesson' | 'review' | 'quiz' | 'task'
    title: string
    description: string
    xpReward: number
    topicId?: string
    topicName?: string
  } | null
  completed: boolean
  onStart?: () => void
  className?: string
}

export function DailyChallenge({ challenge, completed, onStart, className }: DailyChallengeProps) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const now = new Date()
    const midnight = new Date(now)
    midnight.setHours(24, 0, 0, 0)
    return Math.floor((midnight.getTime() - now.getTime()) / 1000)
  })

  // Update countdown
  useState(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  })

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h}ч ${m}м ${s}с`
  }

  if (!challenge) {
    return (
      <Card className={cn('border-slate-700/50', className)}>
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-slate-400">Нет доступных челленджей</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'border-2 transition-all',
        completed
          ? 'border-green-500/50 bg-green-500/5'
          : 'border-yellow-500/50 bg-yellow-500/5',
        className
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                completed ? 'bg-green-500/20' : 'bg-yellow-500/20'
              )}
            >
              {completed ? (
                <CheckCircle className="w-6 h-6 text-green-400" />
              ) : (
                <Zap className="w-6 h-6 text-yellow-400" />
              )}
            </div>
            <div>
              <div className="text-sm text-yellow-400 font-medium">Daily Challenge</div>
              <div className="text-lg font-bold text-white">{challenge.title}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-yellow-400 font-bold">
              <Zap className="w-4 h-4" />
              +{challenge.xpReward} XP
            </div>
            <div className="flex items-center gap-1 text-slate-400 text-sm">
              <Clock className="w-3 h-3" />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <p className="text-slate-300 mb-4">{challenge.description}</p>

        {challenge.topicName && (
          <div className="text-sm text-slate-400 mb-4">
            Тема: <span className="text-white">{challenge.topicName}</span>
          </div>
        )}

        {completed ? (
          <div className="flex items-center justify-center gap-2 py-3 bg-green-500/10 rounded-lg text-green-400">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Выполнено!</span>
          </div>
        ) : (
          <Button onClick={onStart} className="w-full" leftIcon={<Zap className="w-5 h-5" />}>
            Начать челлендж
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

