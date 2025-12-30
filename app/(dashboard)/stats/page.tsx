'use client'

import { useState, useEffect } from 'react'
import { Trophy, Timer, TrendingUp, Target, Clock, BookOpen, Zap, Flame } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { StatsOverview } from '@/components/stats/StatsOverview'
import { ActivityCalendar } from '@/components/stats/ActivityCalendar'
import { PomodoroTimer, AchievementBadge, ACHIEVEMENTS } from '@/components/gamification'
import type { AchievementType } from '@/components/gamification'
import type { UserStats, Achievement } from '@/types'
import { formatMinutes } from '@/lib/utils'

export default function StatsPage() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [activity, setActivity] = useState<{ date: string; count: number }[]>([])
  const [progress, setProgress] = useState({ completedTopics: 0, totalTopics: 0, averageMastery: 0 })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
        setAchievements(data.achievements || [])
        
        // Convert activity data format
        const activityData = Object.entries(data.activityByDate || {}).map(([date, count]) => ({
          date,
          count: count as number
        }))
        setActivity(activityData)
        
        setProgress(data.progress || { completedTopics: 0, totalTopics: 0, averageMastery: 0 })
      }
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>

  const allAchievementTypes = Object.keys(ACHIEVEMENTS) as AchievementType[]
  const unlockedTypes = new Set(achievements.map(a => a.type))

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="practicum-card-yellow p-6 sm:p-8 rounded-3xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#10101a]/20 rounded-2xl flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Прогресс</h1>
              <p className="text-white/70">Твоя статистика обучения</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{(stats as any)?.level || 1}</p>
              <p className="text-xs text-white/70">уровень</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{(stats as any)?.totalXP || 0}</p>
              <p className="text-xs text-white/70">XP</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<Flame />} value={stats?.currentStreak || 0} label="Дней подряд" color="orange" />
        <StatCard icon={<Clock />} value={formatMinutes(stats?.totalMinutes || 0)} label="Времени" color="blue" />
        <StatCard icon={<BookOpen />} value={stats?.totalLessons || 0} label="Уроков" color="green" />
        <StatCard icon={<Target />} value={stats?.totalTasks || 0} label="Задач" color="purple" />
      </div>

      {/* Progress Summary */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-bold text-[var(--color-primary)]">{progress.completedTopics}</p>
            <p className="text-[var(--color-text-secondary)]">Тем завершено</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-bold text-white">{progress.totalTopics}</p>
            <p className="text-[var(--color-text-secondary)]">Всего тем</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-4xl font-bold text-green-500">{progress.averageMastery}%</p>
            <p className="text-[var(--color-text-secondary)]">Среднее освоение</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Calendar */}
        <div className="lg:col-span-2">
          <ActivityCalendar data={activity} />
        </div>

        {/* Pomodoro */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5 text-red-500" />
              Pomodoro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PomodoroTimer />
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[var(--color-primary)]" />
            Достижения
            <span className="badge-practicum ml-2">{achievements.length}/{allAchievementTypes.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allAchievementTypes.map(type => {
              const info = ACHIEVEMENTS[type]
              const isUnlocked = unlockedTypes.has(type)
              return (
                <div 
                  key={type} 
                  className={`p-4 rounded-xl border transition-all ${
                    isUnlocked 
                      ? 'bg-[var(--color-bg-secondary)] border-[var(--color-primary)]/30' 
                      : 'bg-[var(--color-bg-secondary)]/50 border-[var(--color-border)] opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-2xl ${!isUnlocked && 'grayscale'}`}>{info.icon}</span>
                    <span className={`text-sm font-medium ${isUnlocked ? 'text-white' : 'text-[var(--color-text-secondary)]'}`}>
                      {info.name}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">{info.description}</p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      {achievements.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Недавние достижения</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {achievements.slice(0, 5).map(a => {
              const info = ACHIEVEMENTS[a.type as AchievementType]
              return (
                <div key={a.type} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                  <span className="text-3xl">{info?.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-white">{info?.name}</p>
                    <p className="text-sm text-[var(--color-text-secondary)]">{info?.description}</p>
                  </div>
                  <span className="text-sm text-[var(--color-text-secondary)]">{new Date(a.unlockedAt).toLocaleDateString('ru-RU')}</span>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
  const colors: Record<string, string> = {
    orange: 'text-orange-500 bg-orange-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
  }
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center`}>{icon}</div>
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

