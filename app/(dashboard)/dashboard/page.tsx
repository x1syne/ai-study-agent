'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus, Target, BookOpen, Clock, Sparkles, TrendingUp,
  Flame, Zap, Brain, ArrowRight, Play, Star, Rocket, CheckCircle2
} from 'lucide-react'
import { Card, CardContent, TopicIcon } from '@/components/ui'
import { formatMinutes, calculateOverallProgress } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { SessionTimer } from '@/components/common/SessionTimer'
import type { Module, Topic } from '@/types'

interface GoalWithModules {
  id: string
  title: string
  skill: string
  status: string
  modules: Module[]
  createdAt: string
}

interface Stats {
  currentStreak: number
  longestStreak: number
  totalMinutes: number
  totalLessons: number
  totalTasks: number
  totalXP: number
  level: number
}

export default function DashboardPage() {
  const { user } = useAppStore()
  const [goals, setGoals] = useState<GoalWithModules[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    fetchData()
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Доброе утро')
    else if (hour < 18) setGreeting('Добрый день')
    else setGreeting('Добрый вечер')
  }, [])

  const fetchData = async () => {
    try {
      const [goalsRes, statsRes] = await Promise.all([
        fetch('/api/goals'),
        fetch('/api/stats'),
      ])
      if (goalsRes.ok) setGoals(await goalsRes.json())
      if (statsRes.ok) {
        const data = await statsRes.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate progress using modules - Requirements 3.1
  const getGoalProgress = (goal: GoalWithModules) => {
    if (!goal.modules || goal.modules.length === 0) return 0
    return calculateOverallProgress(goal.modules)
  }

  // Get all topics from modules
  const getAllTopics = (goal: GoalWithModules): Topic[] => {
    if (!goal.modules) return []
    return goal.modules.flatMap(m => m.topics)
  }

  // Get total topics count
  const getTotalTopicsCount = (goal: GoalWithModules): number => {
    return getAllTopics(goal).length
  }

  const getTodaysTasks = () => {
    const tasks: { goalId: string; goalTitle: string; topic: Topic }[] = []
    goals.forEach(goal => {
      const allTopics = getAllTopics(goal)
      allTopics.forEach(topic => {
        const progress = Array.isArray(topic.progress) ? topic.progress[0] : topic.progress
        if (progress?.status === 'IN_PROGRESS' || progress?.status === 'AVAILABLE') {
          tasks.push({ goalId: goal.id, goalTitle: goal.title, topic: { ...topic, progress } })
        }
      })
    })
    return tasks.slice(0, 3)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--color-yellow)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const todaysTasks = getTodaysTasks()
  const userName = user?.name?.split(' ')[0] || 'студент'

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Welcome Card */}
        <div className="flex-1 practicum-card p-6 sm:p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[var(--color-text-secondary)] text-sm mb-1">
                {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {greeting}, {userName}! 👋
              </h1>
              <p className="text-[var(--color-text-secondary)] mt-2">
                {stats?.currentStreak && stats.currentStreak > 0 
                  ? `${stats.currentStreak} дней подряд! Отличный результат.`
                  : 'Готов к новым знаниям?'}
              </p>
            </div>
            <Link href="/goals/new">
              <button className="btn-practicum hidden sm:flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Новый курс
              </button>
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatMini icon={<Flame />} value={stats?.currentStreak || 0} label="Дней подряд" color="orange" />
            <StatMini icon={<Zap />} value={stats?.totalXP || 0} label="Опыта" color="yellow" />
            <StatMini icon={<Clock />} value={<SessionTimer />} label="Времени" color="blue" />
            <StatMini icon={<Target />} value={stats?.totalTasks || 0} label="Задач" color="green" />
          </div>
        </div>

        {/* Level Card */}
        <div className="lg:w-80 practicum-card-yellow p-6 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-[#10101a]/20 rounded-2xl flex items-center justify-center">
              <Star className="w-7 h-7 text-[#10101a]" />
            </div>
            <div>
              <p className="text-[#10101a]/70 text-sm">Твой уровень</p>
              <p className="text-3xl font-bold text-[#10101a]">{stats?.level || 1}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-[#10101a]/70">
              <span>До следующего</span>
              <span>{100 - ((stats?.totalXP || 0) % 100)} XP</span>
            </div>
            <div className="h-2 bg-[#10101a]/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#10101a] rounded-full transition-all"
                style={{ width: `${(stats?.totalXP || 0) % 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Continue Learning */}
      {todaysTasks.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-[var(--color-yellow)]" />
              Продолжить обучение
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysTasks.map((task) => (
              <Link key={task.topic.id} href={`/learn/${task.topic.id}`}>
                <div className="course-card group">
                  <div className="course-card-icon">
                    <TopicIcon icon={task.topic.icon || undefined} size={32} className="text-[var(--color-yellow)]" />
                  </div>
                  <h3 className="font-semibold text-white mb-1 group-hover:text-[var(--color-yellow)] transition-colors">
                    {task.topic.name}
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)] mb-4">{task.goalTitle}</p>
                  <div className="flex items-center justify-between">
                    <span className={`badge-practicum ${task.topic.progress?.status === 'IN_PROGRESS' ? '' : 'badge-practicum-info'}`}>
                      {task.topic.progress?.status === 'IN_PROGRESS' ? 'В процессе' : 'Доступно'}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-[var(--color-yellow)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-[#10101a] ml-0.5" />
                    </div>
                  </div>
                  <div className="course-card-progress">
                    <div className="course-card-progress-fill" style={{ width: '30%' }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My Courses - Requirements 3.1 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            Мои курсы
          </h2>
          <Link href="/goals" className="text-sm text-[var(--color-yellow)] hover:underline">
            Все курсы →
          </Link>
        </div>
        
        {goals.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.slice(0, 3).map(goal => {
              const progress = getGoalProgress(goal)
              const totalTopics = getTotalTopicsCount(goal)
              const modulesCount = goal.modules?.length || 0
              
              return (
                <Link key={goal.id} href={`/goals/${goal.id}`}>
                  <div className="course-card group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="course-card-icon">
                        <Target className="w-8 h-8 text-[var(--color-yellow)]" />
                      </div>
                      <span className="text-2xl font-bold text-[var(--color-yellow)]">{progress}%</span>
                    </div>
                    <h3 className="font-semibold text-white mb-1 group-hover:text-[var(--color-yellow)] transition-colors">
                      {goal.title}
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                      {modulesCount} модулей • {totalTopics} тем
                    </p>
                    <div className="progress-practicum">
                      <div className="progress-practicum-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="course-card-progress">
                      <div className="course-card-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </Link>
              )
            })}
            
            {/* Add new course card */}
            <Link href="/goals/new">
              <div className="course-card border-dashed flex flex-col items-center justify-center text-center group hover:border-[var(--color-yellow)]">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-border)] flex items-center justify-center mb-4 group-hover:bg-[var(--color-yellow)]/10 transition-colors">
                  <Plus className="w-8 h-8 text-[var(--color-text-secondary)] group-hover:text-[var(--color-yellow)] transition-colors" />
                </div>
                <p className="font-medium text-[var(--color-text-secondary)] group-hover:text-white transition-colors">
                  Добавить курс
                </p>
              </div>
            </Link>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="w-20 h-20 bg-[var(--color-bg-secondary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-10 h-10 text-[var(--color-text-secondary)]" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Начни обучение</h3>
              <p className="text-[var(--color-text-secondary)] mb-6">
                Создай свой первый курс и AI построит персональный план
              </p>
              <Link href="/goals/new">
                <button className="btn-practicum">
                  <Plus className="w-5 h-5 mr-2 inline" />
                  Создать курс
                </button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--color-yellow)]" />
          Быстрые действия
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickAction href="/review" icon={<Brain />} label="Тренажёр" desc="Повторить материал" />
          <QuickAction href="/graph" icon={<Target />} label="Карта знаний" desc="Визуализация" />
          <QuickAction href="/chat" icon={<Sparkles />} label="AI Наставник" desc="Задать вопрос" />
          <QuickAction href="/stats" icon={<TrendingUp />} label="Прогресс" desc="Статистика" />
        </div>
      </section>
    </div>
  )
}

function StatMini({ icon, value, label, color }: { icon: React.ReactNode; value: string | number | React.ReactNode; label: string; color: string }) {
  const colors: Record<string, string> = {
    orange: 'text-orange-500 bg-orange-500/10',
    yellow: 'text-[var(--color-yellow)] bg-[var(--color-yellow)]/10',
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
  }
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg-secondary)]">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold text-white">{value}</p>
        <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      </div>
    </div>
  )
}

function QuickAction({ href, icon, label, desc }: { href: string; icon: React.ReactNode; label: string; desc: string }) {
  return (
    <Link href={href}>
      <div className="practicum-card p-4 group">
        <div className="w-12 h-12 rounded-xl bg-[var(--color-yellow)]/10 flex items-center justify-center mb-3 group-hover:bg-[var(--color-yellow)]/20 transition-colors">
          <span className="text-[var(--color-yellow)]">{icon}</span>
        </div>
        <p className="font-medium text-white group-hover:text-[var(--color-yellow)] transition-colors">{label}</p>
        <p className="text-xs text-[var(--color-text-secondary)]">{desc}</p>
      </div>
    </Link>
  )
}
