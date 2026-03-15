'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Network, Target, Sparkles, AlertTriangle,
  LayoutGrid, GitBranch, BookOpen, CheckCircle2,
  Loader2, Flame, Lock, Circle
} from 'lucide-react'
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph'
import { ModuleGraph } from '@/components/graph/ModuleGraph'
import { TopicDetails } from '@/components/graph/TopicDetails'
import { ModuleTopics } from '@/components/graph/ModuleTopics'
import type { Goal, Topic, Module } from '@/types'
import { cn } from '@/lib/utils'

type ViewMode = 'modules' | 'topics'

/* ─── Safe wrappers ─── */
function SafeKnowledgeGraph({ topics, onTopicClick, selectedTopicId }: {
  topics: Topic[]
  onTopicClick: (id: string) => void
  selectedTopicId?: string
}) {
  const [hasError, setHasError] = useState(false)
  if (hasError) return <GraphError onRetry={() => setHasError(false)} label="граф тем" />
  try {
    return <KnowledgeGraph topics={topics} onTopicClick={onTopicClick} selectedTopicId={selectedTopicId} />
  } catch {
    setHasError(true)
    return null
  }
}

function SafeModuleGraph({ modules, onModuleClick, selectedModuleId, isLoadingTopics }: {
  modules: Module[]
  onModuleClick: (id: string) => void
  selectedModuleId?: string
  isLoadingTopics?: boolean
}) {
  const [hasError, setHasError] = useState(false)
  if (hasError) return <GraphError onRetry={() => setHasError(false)} label="граф модулей" />
  try {
    return <ModuleGraph modules={modules} onModuleClick={onModuleClick} selectedModuleId={selectedModuleId} isLoadingTopics={isLoadingTopics} />
  } catch {
    setHasError(true)
    return null
  }
}

function GraphError({ onRetry, label }: { onRetry: () => void; label: string }) {
  return (
    <div className="h-[460px] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>
        <p style={{ color: 'var(--color-text-secondary)' }}>Не удалось загрузить {label}</p>
        <button onClick={onRetry}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'var(--color-primary)', color: '#fff' }}>
          Попробовать снова
        </button>
      </div>
    </div>
  )
}

/* ─── Main page ─── */
export default function GraphPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingTopics, setIsLoadingTopics] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('modules')

  useEffect(() => { fetchGoals() }, [])

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals')
      if (res.ok) {
        const data = await res.json()
        setGoals(data)
        if (data.length > 0) setSelectedGoal(data[0])
      }
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }

  const allTopics = useMemo(() => {
    if (!selectedGoal) return []
    const mods = selectedGoal.modules ?? []
    if (mods.length > 0)
      return mods.flatMap((m: Module) => m.topics || [])
    return selectedGoal.topics || []
  }, [selectedGoal])

  const allModules = useMemo(() => selectedGoal?.modules ?? [], [selectedGoal])

  const handleTopicClick = (topicId: string) => {
    const topic = allTopics.find((t: Topic) => t.id === topicId)
    if (topic) { setSelectedTopic(topic); setSelectedModule(null) }
  }

  const handleModuleClick = async (moduleId: string) => {
    const module = allModules.find((m: Module) => m.id === moduleId)
    if (module) {
      setSelectedModule(module); setSelectedTopic(null)
      if (!module.topics?.length) {
        setIsLoadingTopics(true)
        setTimeout(() => setIsLoadingTopics(false), 100)
      }
    }
  }

  const getGoalStats = (goal: Goal) => {
    const topics = goal.modules?.length
      ? goal.modules.flatMap((m: Module) => m.topics || [])
      : goal.topics || []
    const total = topics.length
    const completed = topics.filter((t: Topic) => {
      const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
      return p?.status === 'COMPLETED' || p?.status === 'MASTERED'
    }).length
    const inProgress = topics.filter((t: Topic) => {
      const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
      return p?.status === 'IN_PROGRESS'
    }).length
    return {
      total, completed, inProgress,
      modulesCount: goal.modules?.length || 0,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }

  /* ─── Loading ─── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-[var(--color-primary)]/20" />
            <Loader2 className="w-12 h-12 text-[var(--color-primary)] animate-spin absolute inset-0" />
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Загружаем карту знаний…</p>
        </div>
      </div>
    )
  }

  const stats = selectedGoal ? getGoalStats(selectedGoal) : null

  /* ─── LEGEND items ─── */
  const LEGEND = [
    { icon: <Lock className="w-3.5 h-3.5" />, color: '#64748b', label: 'Заблокировано' },
    { icon: <Circle className="w-3.5 h-3.5" />, color: '#0ea5e9', label: 'Доступно' },
    { icon: <Flame className="w-3.5 h-3.5" />, color: '#f97316', label: 'В процессе' },
    { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: '#22c55e', label: 'Завершено' },
    { icon: <Sparkles className="w-3.5 h-3.5" />, color: '#a855f7', label: 'Освоено' },
  ]

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(6,182,212,0.12) 100%)', border: '1px solid rgba(124,58,237,0.25)' }}>
        {/* фоновые блики */}
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)', transform: 'translate(30%,-30%)' }} />
        <div className="absolute bottom-0 left-40 w-48 h-48 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)', transform: 'translateY(40%)' }} />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' }}>
              <Network className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Карта знаний</h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>Визуализация твоего прогресса</p>
            </div>
          </div>

          {stats && (
            <div className="flex items-center gap-6 flex-wrap">
              {[
                { value: stats.modulesCount, label: 'модулей', color: '#7c3aed' },
                { value: stats.total, label: 'тем', color: '#06b6d4' },
                { value: stats.completed, label: 'пройдено', color: '#22c55e' },
                { value: `${stats.percent}%`, label: 'прогресс', color: '#f97316' },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* прогресс-бар */}
        {stats && stats.total > 0 && (
          <div className="relative mt-5 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${stats.percent}%`,
                background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                boxShadow: '0 0 12px rgba(124,58,237,0.6)',
              }} />
          </div>
        )}
      </div>

      {/* ── Content ── */}
      {goals.length > 0 ? (
        <>
          {/* Goal selector + View mode toggle */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Goal tabs */}
            {goals.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
                {goals.map(goal => {
                  const gs = getGoalStats(goal)
                  const isSelected = selectedGoal?.id === goal.id
                  return (
                    <button key={goal.id}
                      onClick={() => { setSelectedGoal(goal); setSelectedTopic(null); setSelectedModule(null) }}
                      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-all duration-200"
                      style={{
                        background: isSelected ? 'rgba(124,58,237,0.15)' : 'var(--color-surface)',
                        borderColor: isSelected ? 'rgba(124,58,237,0.6)' : 'var(--color-border)',
                        color: isSelected ? '#fff' : 'var(--color-text-secondary)',
                      }}>
                      <BookOpen className="w-4 h-4" />
                      <span>{goal.title}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                        style={{
                          background: gs.percent >= 80 ? 'rgba(34,197,94,0.15)' : 'rgba(124,58,237,0.15)',
                          color: gs.percent >= 80 ? '#22c55e' : '#7c3aed',
                        }}>
                        {gs.percent}%
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* View toggle */}
            <div className="flex gap-1 p-1 rounded-xl flex-shrink-0"
              style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
              {([
                { mode: 'modules' as ViewMode, icon: LayoutGrid, label: 'Модули' },
                { mode: 'topics' as ViewMode, icon: GitBranch, label: 'Все темы' },
              ]).map(({ mode, icon: Icon, label }) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                  style={{
                    background: viewMode === mode ? 'var(--color-primary)' : 'transparent',
                    color: viewMode === mode ? '#fff' : 'var(--color-text-secondary)',
                  }}>
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Graph + Details */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Graph card */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl overflow-hidden"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                {/* top accent */}
                <div className="h-0.5" style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }} />
                
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4"
                  style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                    <span className="font-semibold text-white">{selectedGoal?.title}</span>
                  </div>
                  {stats && (
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-24 rounded-full overflow-hidden"
                        style={{ background: 'var(--color-bg-secondary)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${stats.percent}%`,
                            background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
                          }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                        {stats.percent}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Graph body */}
                <div>
                  {viewMode === 'modules' && selectedGoal && allModules.length > 0 && (
                    <SafeModuleGraph
                      modules={allModules}
                      onModuleClick={handleModuleClick}
                      selectedModuleId={selectedModule?.id}
                      isLoadingTopics={isLoadingTopics}
                    />
                  )}
                  {viewMode === 'topics' && selectedGoal && allTopics.length > 0 && (
                    <SafeKnowledgeGraph
                      topics={allTopics}
                      onTopicClick={handleTopicClick}
                      selectedTopicId={selectedTopic?.id}
                    />
                  )}
                  {viewMode === 'modules' && selectedGoal && allModules.length === 0 && (
                    <EmptyGraphState icon={<LayoutGrid className="w-10 h-10" />} text="Модули ещё не созданы" />
                  )}
                  {viewMode === 'topics' && selectedGoal && allTopics.length === 0 && (
                    <EmptyGraphState
                      icon={<Network className="w-10 h-10" />}
                      text="Темы ещё не созданы"
                      sub="Кликни на модуль для генерации тем"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="space-y-4">
              {selectedModule && (
                <ModuleTopics
                  moduleId={selectedModule.id}
                  moduleName={selectedModule.name}
                  moduleIcon={selectedModule.icon || '📚'}
                  onClose={() => setSelectedModule(null)}
                />
              )}

              {selectedTopic && !selectedModule && (
                <TopicDetails
                  topic={selectedTopic}
                  onClose={() => setSelectedTopic(null)}
                  onStartLesson={() => router.push(`/learn/${selectedTopic.id}`)}
                />
              )}

              {!selectedTopic && !selectedModule && (
                <div className="rounded-2xl p-8 text-center"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(124,58,237,0.1)' }}>
                    {viewMode === 'modules'
                      ? <LayoutGrid className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
                      : <Network className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />}
                  </div>
                  <h3 className="font-semibold text-white mb-1">
                    {viewMode === 'modules' ? 'Выбери модуль' : 'Выбери тему'}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {viewMode === 'modules'
                      ? 'Кликни на узел модуля для просмотра тем'
                      : 'Кликни на узел графа для деталей'}
                  </p>
                </div>
              )}

              {/* Legend */}
              <div className="rounded-2xl p-5"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4"
                  style={{ color: 'var(--color-text-secondary)' }}>Легенда</p>
                <div className="space-y-3">
                  {LEGEND.map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${item.color}20`, color: item.color }}>
                        {item.icon}
                      </div>
                      <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats mini */}
              {stats && (
                <div className="rounded-2xl p-5"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-4"
                    style={{ color: 'var(--color-text-secondary)' }}>Прогресс</p>
                  <div className="space-y-3">
                    {[
                      { label: 'Завершено', value: stats.completed, total: stats.total, color: '#22c55e' },
                      { label: 'В процессе', value: stats.inProgress, total: stats.total, color: '#f97316' },
                    ].map(item => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span style={{ color: 'var(--color-text-secondary)' }}>{item.label}</span>
                          <span className="font-medium text-white">{item.value} / {item.total}</span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: 'var(--color-bg-secondary)' }}>
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: item.total > 0 ? `${(item.value / item.total) * 100}%` : '0%',
                              background: item.color,
                              boxShadow: `0 0 8px ${item.color}80`,
                            }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        /* ── Empty state ── */
        <div className="rounded-3xl p-16 text-center"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.15))', border: '1px solid rgba(124,58,237,0.2)' }}>
            <Target className="w-12 h-12" style={{ color: 'var(--color-primary)' }} />
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Создай первый курс</h3>
          <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Карта знаний появится после создания курса
          </p>
          <button onClick={() => router.push('/goals/new')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:opacity-90"
            style={{ background: 'var(--color-primary)', color: '#fff' }}>
            <Sparkles className="w-4 h-4" />
            Создать курс
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyGraphState({ icon, text, sub }: { icon: React.ReactNode; text: string; sub?: string }) {
  return (
    <div className="h-[460px] flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
          style={{ background: 'rgba(124,58,237,0.1)', color: 'var(--color-primary)' }}>
          {icon}
        </div>
        <p className="font-medium text-white">{text}</p>
        {sub && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{sub}</p>}
      </div>
    </div>
  )
}
