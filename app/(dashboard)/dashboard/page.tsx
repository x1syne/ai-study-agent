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

// colour palette per stat
const STAT_COLORS = {
  orange: { bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.2)', text: '#f97316', glow: 'rgba(249,115,22,0.15)' },
  violet: { bg: 'rgba(124,58,237,0.12)', border: 'rgba(124,58,237,0.2)', text: '#8b5cf6', glow: 'rgba(124,58,237,0.15)' },
  cyan:   { bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.2)',  text: '#06b6d4', glow: 'rgba(6,182,212,0.12)'  },
  green:  { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.2)', text: '#10b981', glow: 'rgba(16,185,129,0.12)' },
}

const QUICK_ACTIONS = [
  { href: '/review', icon: Brain,       label: 'Тренажёр',    desc: 'Повторить',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { href: '/graph',  icon: Target,      label: 'Карта знаний',desc: 'Граф тем',    color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'  },
  { href: '/chat',   icon: Sparkles,    label: 'AI Наставник',desc: 'Задать вопрос',color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  { href: '/stats',  icon: TrendingUp,  label: 'Прогресс',    desc: 'Статистика',  color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
]

export default function DashboardPage() {
  const { user } = useAppStore()
  const [goals, setGoals]     = useState<GoalWithModules[]>([])
  const [stats, setStats]     = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [greeting, setGreeting]   = useState('')

  useEffect(() => {
    fetchData()
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Доброе утро' : h < 18 ? 'Добрый день' : 'Добрый вечер')
  }, [])

  const fetchData = async () => {
    try {
      const [goalsRes, statsRes] = await Promise.all([fetch('/api/goals'), fetch('/api/stats')])
      if (goalsRes.ok) setGoals(await goalsRes.json())
      if (statsRes.ok) { const d = await statsRes.json(); setStats(d.stats) }
    } catch {}
    finally { setIsLoading(false) }
  }

  const getGoalProgress = (goal: GoalWithModules) =>
    !goal.modules?.length ? 0 : calculateOverallProgress(goal.modules)

  const getAllTopics = (goal: GoalWithModules): Topic[] =>
    goal.modules ? goal.modules.flatMap(m => m.topics) : []

  const getTodaysTasks = () => {
    const tasks: { goalId: string; goalTitle: string; topic: Topic }[] = []
    goals.forEach(goal => {
      getAllTopics(goal).forEach(topic => {
        const progress = Array.isArray(topic.progress) ? topic.progress[0] : topic.progress
        if (progress?.status === 'IN_PROGRESS' || progress?.status === 'AVAILABLE')
          tasks.push({ goalId: goal.id, goalTitle: goal.title, topic: { ...topic, progress } })
      })
    })
    return tasks.slice(0, 3)
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="relative">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[#4f46e5] flex items-center justify-center animate-pulse">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[#4f46e5] blur-lg opacity-30 animate-glow-pulse" />
      </div>
    </div>
  )

  const todaysTasks = getTodaysTasks()
  const userName    = user?.name?.split(' ')[0] || 'студент'
  const xpProgress  = (stats?.totalXP || 0) % 100

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">

      {/* ═══ HERO ═══ */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-5">

        {/* Welcome card */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] p-6 sm:p-8"
          style={{ background: 'linear-gradient(145deg, #111118 0%, #0c0c14 100%)' }}>
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
          <div className="absolute bottom-0 left-1/2 w-96 h-32 opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.6) 0%, transparent 70%)' }} />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[var(--color-text-muted)] text-[13px] mb-1 font-medium tracking-wide uppercase">
                  {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  {greeting},{' '}
                  <span className="text-gradient">{userName}</span>
                  {' '}👋
                </h1>
                <p className="text-[var(--color-text-secondary)] mt-2 text-sm">
                  {stats?.currentStreak && stats.currentStreak > 0
                    ? `🔥 ${stats.currentStreak} дней подряд — продолжай в том же духе!`
                    : 'Готов к новым знаниям сегодня?'}
                </p>
              </div>
              <Link href="/goals/new" className="hidden sm:block">
                <button className="btn-practicum text-sm gap-2">
                  <Plus className="w-4 h-4" />
                  Новый курс
                </button>
              </Link>
            </div>

            {/* Quick stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatMini
                icon={<Flame className="w-4 h-4" />}
                value={stats?.currentStreak || 0}
                label="Дней подряд"
                scheme={STAT_COLORS.orange}
              />
              <StatMini
                icon={<Zap className="w-4 h-4" />}
                value={stats?.totalXP || 0}
                label="Опыт XP"
                scheme={STAT_COLORS.violet}
              />
              <StatMini
                icon={<Clock className="w-4 h-4" />}
                value={<SessionTimer />}
                label="Сессия"
                scheme={STAT_COLORS.cyan}
              />
              <StatMini
                icon={<CheckCircle2 className="w-4 h-4" />}
                value={stats?.totalTasks || 0}
                label="Задач решено"
                scheme={STAT_COLORS.green}
              />
            </div>
          </div>
        </div>

        {/* Level card */}
        <div className="relative overflow-hidden rounded-3xl p-6 flex flex-col justify-between"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #06b6d4 100%)',
            boxShadow: '0 0 48px rgba(124,58,237,0.3), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}>
          {/* Sparkle decorations */}
          <div className="absolute top-4 right-4 w-24 h-24 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10"
            style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Star className="w-7 h-7 text-white fill-white" />
              </div>
              <div>
                <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">Уровень</p>
                <p className="text-4xl font-black text-white leading-none">{stats?.level || 1}</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[12px] text-white/60 font-medium">
                <span>До следующего</span>
                <span className="text-white/80">{100 - xpProgress} XP</span>
              </div>
              <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-700"
                  style={{ width: `${xpProgress}%`, boxShadow: '0 0 8px rgba(255,255,255,0.6)' }}
                />
              </div>
              <p className="text-[11px] text-white/50">{stats?.totalXP || 0} XP всего</p>
            </div>
          </div>

          {/* Bottom action */}
          <Link href="/stats" className="relative z-10 mt-4">
            <button className="w-full py-2.5 rounded-xl bg-white/15 hover:bg-white/25 transition-all text-white text-sm font-semibold flex items-center justify-center gap-2 backdrop-blur-sm">
              Посмотреть прогресс
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>

      {/* ═══ CONTINUE LEARNING ═══ */}
      {todaysTasks.length > 0 && (
        <section>
          <SectionHeader
            icon={<Rocket className="w-5 h-5" style={{ color: '#f59e0b' }} />}
            title="Продолжить обучение"
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todaysTasks.map(task => {
              const inProgress = task.topic.progress?.status === 'IN_PROGRESS'
              return (
                <Link key={task.topic.id} href={`/learn/${task.topic.id}`}>
                  <div className="course-card group h-full">
                    {/* Glow on hover */}
                    <div className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: 'radial-gradient(circle at 60% 20%, rgba(245,158,11,0.08) 0%, transparent 70%)' }} />

                    <div className="course-card-icon" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.15)' }}>
                      <TopicIcon icon={task.topic.icon || undefined} size={28} className="text-[#f59e0b]" />
                    </div>

                    <h3 className="font-semibold text-white text-[15px] mb-1 group-hover:text-[#f59e0b] transition-colors line-clamp-2 flex-1">
                      {task.topic.name}
                    </h3>
                    <p className="text-[13px] text-[var(--color-text-muted)] mb-4">{task.goalTitle}</p>

                    <div className="flex items-center justify-between mt-auto">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        inProgress
                          ? 'bg-[var(--color-primary)]/12 text-[var(--color-primary-light)] border border-[var(--color-primary)]/20'
                          : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)] border border-[var(--color-accent)]/20'
                      }`}>
                        {inProgress ? 'В процессе' : 'Доступно'}
                      </span>
                      <div className="w-8 h-8 rounded-full bg-[#f59e0b] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-[0_0_12px_rgba(245,158,11,0.4)]">
                        <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                      </div>
                    </div>

                    <div className="course-card-progress">
                      <div className="course-card-progress-fill" style={{ width: '35%' }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ═══ MY COURSES ═══ */}
      <section>
        <SectionHeader
          icon={<TrendingUp className="w-5 h-5 text-[#10b981]" />}
          title="Мои курсы"
          link={{ href: '/goals', label: 'Все курсы' }}
        />

        {goals.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.slice(0, 3).map((goal, i) => {
              const progress    = getGoalProgress(goal)
              const totalTopics = getAllTopics(goal).length
              const modulesCount = goal.modules?.length || 0
              const hue = ['#8b5cf6', '#06b6d4', '#10b981'][i % 3]

              return (
                <Link key={goal.id} href={`/goals/${goal.id}`}>
                  <div className="course-card group h-full">
                    <div className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{ background: `radial-gradient(circle at 60% 20%, ${hue}10 0%, transparent 70%)` }} />

                    <div className="flex items-start justify-between mb-4">
                      <div className="course-card-icon flex-shrink-0"
                        style={{ background: `${hue}15`, border: `1px solid ${hue}25` }}>
                        <Target className="w-7 h-7" style={{ color: hue }} />
                      </div>
                      <span className="text-2xl font-black" style={{ color: hue }}>{progress}%</span>
                    </div>

                    <h3 className="font-semibold text-white text-[15px] mb-1 group-hover:text-white/90 transition-colors line-clamp-2 flex-1">
                      {goal.title}
                    </h3>
                    <p className="text-[13px] text-[var(--color-text-muted)] mb-5">
                      {modulesCount} модулей · {totalTopics} тем
                    </p>

                    <div className="mt-auto space-y-2">
                      <div className="h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${hue}, ${hue}bb)` }} />
                      </div>
                    </div>

                    <div className="course-card-progress">
                      <div className="course-card-progress-fill" style={{ width: `${progress}%`, background: hue }} />
                    </div>
                  </div>
                </Link>
              )
            })}

            {/* Add new course */}
            <Link href="/goals/new">
              <div className="relative overflow-hidden rounded-[20px] border border-dashed border-[var(--color-border-light)] flex flex-col items-center justify-center text-center p-8 cursor-pointer group transition-all duration-300 hover:border-[var(--color-primary)]/60 min-h-[180px]"
                style={{ background: 'rgba(124,58,237,0.03)' }}>
                <div className="w-14 h-14 rounded-2xl bg-[var(--color-border)] flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary)]/15 transition-all duration-300 group-hover:scale-110">
                  <Plus className="w-7 h-7 text-[var(--color-text-muted)] group-hover:text-[var(--color-primary-light)] transition-colors" />
                </div>
                <p className="font-semibold text-[var(--color-text-secondary)] group-hover:text-white transition-colors text-sm">
                  Добавить курс
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">AI построит план автоматически</p>
              </div>
            </Link>
          </div>
        ) : (
          /* Empty state */
          <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] p-12 text-center"
            style={{ background: 'linear-gradient(145deg, #111118 0%, #0c0c14 100%)' }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.1) 0%, transparent 60%)' }} />
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[var(--color-primary)] to-[#4f46e5] flex items-center justify-center mx-auto mb-5 shadow-glow-md">
                <BookOpen className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Начни своё обучение</h3>
              <p className="text-[var(--color-text-secondary)] mb-8 max-w-md mx-auto text-sm leading-relaxed">
                Создай первый курс — AI автоматически построит персональный граф знаний с теорией и практикой
              </p>
              <Link href="/goals/new">
                <button className="btn-practicum gap-2">
                  <Sparkles className="w-4 h-4" />
                  Создать курс с AI
                </button>
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* ═══ QUICK ACTIONS ═══ */}
      <section>
        <SectionHeader
          icon={<Sparkles className="w-5 h-5 text-[#f59e0b]" />}
          title="Быстрые действия"
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map(action => (
            <Link key={action.href} href={action.href}>
              <div className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] p-5 cursor-pointer group transition-all duration-300 hover:border-[var(--color-border-light)] hover:-translate-y-1"
                style={{ background: 'linear-gradient(145deg, #111118 0%, #0c0c14 100%)' }}>
                {/* Hover background glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(circle at 50% 50%, ${action.color}10 0%, transparent 70%)` }} />

                <div className="relative z-10">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                    style={{ background: action.bg, border: `1px solid ${action.color}25` }}>
                    <action.icon className="w-5 h-5 transition-colors" style={{ color: action.color }} />
                  </div>
                  <p className="font-semibold text-white text-sm mb-0.5 group-hover:text-white transition-colors">{action.label}</p>
                  <p className="text-[12px] text-[var(--color-text-muted)]">{action.desc}</p>
                </div>

                <ArrowRight
                  className="absolute bottom-4 right-4 w-4 h-4 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0"
                  style={{ color: action.color }}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

/* ─── Sub-components ─── */

function StatMini({
  icon, value, label, scheme,
}: {
  icon: React.ReactNode
  value: string | number | React.ReactNode
  label: string
  scheme: { bg: string; border: string; text: string; glow: string }
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-200 border"
      style={{ background: scheme.bg, borderColor: scheme.border }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: scheme.glow, color: scheme.text }}>
        {icon}
      </div>
      <div>
        <p className="text-[17px] font-bold text-white leading-tight">{value}</p>
        <p className="text-[11px] font-medium mt-0.5" style={{ color: scheme.text, opacity: 0.8 }}>{label}</p>
      </div>
    </div>
  )
}

function SectionHeader({
  icon, title, link,
}: {
  icon: React.ReactNode
  title: string
  link?: { href: string; label: string }
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
        {icon}
        {title}
      </h2>
      {link && (
        <Link href={link.href}
          className="text-[13px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary-light)] transition-colors flex items-center gap-1">
          {link.label}
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  )
}
