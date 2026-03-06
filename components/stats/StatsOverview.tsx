'use client'

import { Flame, Clock, CheckCircle, Target, Trophy, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { formatMinutes } from '@/lib/utils'
import type { UserStats } from '@/types'

interface StatsOverviewProps {
  stats: UserStats
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const statCards = [
    {
      icon: Flame,
      label: 'Текущий streak',
      value: `${stats.currentStreak} дней`,
      color: 'text-orange-400',
      bgColor: 'from-orange-500/20 to-red-500/20',
    },
    {
      icon: Trophy,
      label: 'Лучший streak',
      value: `${stats.longestStreak} дней`,
      color: 'text-yellow-400',
      bgColor: 'from-yellow-500/20 to-amber-500/20',
    },
    {
      icon: Clock,
      label: 'Время обучения',
      value: formatMinutes(stats.totalMinutes),
      color: 'text-blue-400',
      bgColor: 'from-blue-500/20 to-cyan-500/20',
    },
    {
      icon: CheckCircle,
      label: 'Уроков пройдено',
      value: stats.totalLessons.toString(),
      color: 'text-green-400',
      bgColor: 'from-green-500/20 to-emerald-500/20',
    },
    {
      icon: Target,
      label: 'Задач решено',
      value: stats.totalTasks.toString(),
      color: 'text-purple-400',
      bgColor: 'from-purple-500/20 to-violet-500/20',
    },
    {
      icon: Zap,
      label: 'Точность',
      value: stats.totalTasks > 0
        ? `${Math.round((stats.correctAnswers / stats.totalTasks) * 100)}%`
        : '0%',
      color: 'text-primary-400',
      bgColor: 'from-primary-500/20 to-accent-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label} className="overflow-hidden">
          <CardContent className="p-4">
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.bgColor} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-sm text-slate-400">{stat.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

