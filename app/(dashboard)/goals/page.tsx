'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Target, Calendar, Trash2, Play, Download, BookOpen, CheckCircle2, Layers, Sparkles, ArrowRight } from 'lucide-react'
import { formatDate, calculateOverallProgress } from '@/lib/utils'
import type { Module, Topic } from '@/types'

interface GoalWithModules {
  id: string
  title: string
  skill: string
  status: string
  targetDate: string | null
  modules: Module[]
  createdAt: string
}

// Per-card accent palette (rotates)
const CARD_ACCENTS = [
  { color: '#8b5cf6', glow: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.25)', bg: 'rgba(139,92,246,0.08)' },
  { color: '#06b6d4', glow: 'rgba(6,182,212,0.15)',  border: 'rgba(6,182,212,0.25)',  bg: 'rgba(6,182,212,0.08)'  },
  { color: '#10b981', glow: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.25)', bg: 'rgba(16,185,129,0.08)' },
  { color: '#f59e0b', glow: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.25)', bg: 'rgba(245,158,11,0.08)' },
  { color: '#ec4899', glow: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.25)', bg: 'rgba(236,72,153,0.08)' },
  { color: '#3b82f6', glow: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.25)', bg: 'rgba(59,130,246,0.08)' },
]

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithModules[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { fetchGoals() }, [])

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals')
      if (res.ok) setGoals(await res.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteGoal = async (id: string) => {
    if (!confirm('Удалить этот курс?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
      if (res.ok) setGoals(goals.filter(g => g.id !== id))
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const getAllTopics = (goal: GoalWithModules): Topic[] => {
    if (!goal.modules) return []
    return goal.modules.flatMap(m => m.topics)
  }

  const exportToICS = (goal: GoalWithModules) => {
    const formatICSDate = (date: Date) =>
      date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    const now = new Date()
    const targetDate = goal.targetDate
      ? new Date(goal.targetDate)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const allTopics = getAllTopics(goal)

    let icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//AI Study Agent//RU\nCALSCALE:GREGORIAN\nMETHOD:PUBLISH\nBEGIN:VEVENT\nUID:${goal.id}@ai-study-agent\nDTSTAMP:${formatICSDate(now)}\nDTSTART:${formatICSDate(now)}\nDTEND:${formatICSDate(targetDate)}\nSUMMARY:${goal.title}\nDESCRIPTION:Курс: ${goal.skill}\\\\nМодулей: ${goal.modules?.length || 0}\\\\nТем: ${allTopics.length}\nSTATUS:CONFIRMED\nEND:VEVENT\n`

    allTopics.forEach((topic, index) => {
      const topicStart = new Date(now.getTime() + index * 2 * 24 * 60 * 60 * 1000)
      const topicEnd = new Date(topicStart.getTime() + 2 * 60 * 60 * 1000)
      icsContent += `BEGIN:VEVENT\nUID:${topic.id}@ai-study-agent\nDTSTAMP:${formatICSDate(now)}\nDTSTART:${formatICSDate(topicStart)}\nDTEND:${formatICSDate(topicEnd)}\nSUMMARY:${topic.name}\nDESCRIPTION:Тема курса "${goal.title}"\nSTATUS:CONFIRMED\nEND:VEVENT\n`
    })
    icsContent += 'END:VCALENDAR'

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${goal.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getGoalProgress = (goal: GoalWithModules) => {
    if (!goal.modules || goal.modules.length === 0) return 0
    return calculateOverallProgress(goal.modules)
  }

  // Summary stats
  const totalTopics    = goals.reduce((s, g) => s + getAllTopics(g).length, 0)
  const completedTopics = goals.reduce((s, g) => {
    return s + getAllTopics(g).filter(t => {
      const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
      return p?.status === 'COMPLETED' || p?.status === 'MASTERED'
    }).length
  }, 0)
  const avgProgress = goals.length
    ? Math.round(goals.reduce((s, g) => s + getGoalProgress(g), 0) / goals.length)
    : 0

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="h-8 w-40 rounded-xl bg-[var(--color-bg-elevated)] animate-pulse" />
          <div className="h-10 w-32 rounded-xl bg-[var(--color-bg-elevated)] animate-pulse" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-[var(--color-bg-elevated)] animate-pulse" />)}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-56 rounded-2xl bg-[var(--color-bg-elevated)] animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Мои курсы</h1>
          <p className="mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {goals.length > 0 ? `${goals.length} ${goals.length === 1 ? 'курс' : goals.length < 5 ? 'курса' : 'курсов'}` : 'Начни своё обучение'}
          </p>
        </div>
        <Link href="/goals/new">
          <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group"
            style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)' }}>
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
              style={{ boxShadow: '0 0 25px rgba(124,58,237,0.5)' }} />
            <Plus className="w-4 h-4" />
            Новый курс
          </button>
        </Link>
      </div>

      {/* Summary stats — only when courses exist */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Всего курсов',   value: goals.length,      color: '#8b5cf6', icon: <Target className="w-5 h-5" /> },
            { label: 'Тем пройдено',   value: `${completedTopics}/${totalTopics}`, color: '#06b6d4', icon: <CheckCircle2 className="w-5 h-5" /> },
            { label: 'Средний прогресс', value: `${avgProgress}%`,  color: '#10b981', icon: <Layers className="w-5 h-5" /> },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl border p-4 flex items-center gap-4"
              style={{
                background: 'var(--color-bg-card)',
                borderColor: 'var(--color-border)',
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${stat.color}20`, color: stat.color }}>
                {stat.icon}
              </div>
              <div>
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Goals Grid */}
      {goals.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal, i) => {
            const progress = getGoalProgress(goal)
            const allTopics = getAllTopics(goal)
            const done = allTopics.filter(t => {
              const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
              return p?.status === 'COMPLETED' || p?.status === 'MASTERED'
            }).length
            const modulesCount = goal.modules?.length || 0
            const accent = CARD_ACCENTS[i % CARD_ACCENTS.length]
            const isDeleting = deletingId === goal.id

            return (
              <div key={goal.id} className="group relative rounded-2xl border transition-all duration-300 hover:-translate-y-1 overflow-hidden"
                style={{
                  background: 'var(--color-bg-card)',
                  borderColor: 'var(--color-border)',
                }}>

                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
                  style={{ background: `linear-gradient(90deg, ${accent.color}, transparent)` }} />

                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                  style={{ boxShadow: `inset 0 0 0 1px ${accent.border}` }} />

                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
                  <button onClick={e => { e.preventDefault(); exportToICS(goal) }}
                    className="p-1.5 rounded-lg transition-colors duration-200"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = accent.color; e.currentTarget.style.background = accent.bg }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent' }}
                    title="Экспорт в календарь (.ics)">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={e => { e.preventDefault(); deleteGoal(goal.id) }}
                    disabled={isDeleting}
                    className="p-1.5 rounded-lg transition-colors duration-200"
                    style={{ color: 'var(--color-text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'transparent' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <Link href={`/goals/${goal.id}`} className="block p-5">
                  {/* Icon + title */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                      style={{ background: accent.bg, color: accent.color }}>
                      <Target className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h3 className="font-semibold text-white truncate transition-colors duration-200 group-hover:text-white pr-10"
                        style={{ lineHeight: '1.35' }}>
                        {goal.title}
                      </h3>
                      <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {goal.skill}
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center text-xs mb-2">
                      <span style={{ color: 'var(--color-text-muted)' }}>Прогресс</span>
                      <span className="font-bold" style={{ color: accent.color }}>{progress}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-elevated)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          background: `linear-gradient(90deg, ${accent.color}, ${accent.color}aa)`,
                          boxShadow: progress > 0 ? `0 0 8px ${accent.glow}` : 'none',
                        }} />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {modulesCount} мод.
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {done}/{allTopics.length} тем
                      </span>
                      {goal.targetDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(goal.targetDate)}
                        </span>
                      )}
                    </div>
                    {/* Play button */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0"
                      style={{ background: accent.color }}>
                      <Play className="w-3.5 h-3.5 text-white ml-0.5" />
                    </div>
                  </div>
                </Link>

                {/* Bottom progress bar */}
                <div className="h-0.5 w-full" style={{ background: 'var(--color-bg-elevated)' }}>
                  <div className="h-full transition-all duration-500"
                    style={{ width: `${progress}%`, background: accent.color }} />
                </div>
              </div>
            )
          })}

          {/* Add new card */}
          <Link href="/goals/new">
            <div className="group relative rounded-2xl border border-dashed min-h-[200px] flex flex-col items-center justify-center text-center p-6 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-card)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(124,58,237,0.4)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--color-text-muted)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.15)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--color-primary)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,58,237,0.08)'; (e.currentTarget as HTMLDivElement).style.color = 'var(--color-text-muted)' }}>
                <Plus className="w-7 h-7" />
              </div>
              <p className="font-semibold transition-colors duration-200 group-hover:text-white"
                style={{ color: 'var(--color-text-secondary)' }}>
                Добавить курс
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                AI создаст план обучения
              </p>
            </div>
          </Link>
        </div>
      ) : (
        /* Empty state */
        <div className="rounded-3xl border p-16 text-center"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(6,182,212,0.1) 100%)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <Target className="w-12 h-12" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#f59e0b' }} />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Курсов пока нет</h3>
          <p className="mb-8 max-w-sm mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
            Создай свой первый курс — AI построит персональный план обучения с нуля
          </p>
          <Link href="/goals/new">
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden group"
              style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)' }}>
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none"
                style={{ boxShadow: '0 0 30px rgba(124,58,237,0.4)' }} />
              <Plus className="w-5 h-5" />
              Создать первый курс
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}
