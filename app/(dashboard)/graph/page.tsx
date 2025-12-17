'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Network, Target, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph'
import { TopicDetails } from '@/components/graph/TopicDetails'
import type { Goal, Topic } from '@/types'

export default function GraphPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

  const handleTopicClick = (topicId: string) => {
    if (!selectedGoal) return
    const topic = selectedGoal.topics.find(t => t.id === topicId)
    if (topic) {
      setSelectedTopic(topic)
      // Проверяем статус темы
      const progress = Array.isArray(topic.progress) ? topic.progress[0] : topic.progress
      const status = progress?.status || 'AVAILABLE'
      
      // Если тема доступна, можно сразу перейти к изучению
      if (status === 'AVAILABLE' || status === 'IN_PROGRESS') {
        console.log('Topic is available for learning:', topic.name)
      } else if (status === 'LOCKED') {
        console.log('Topic is locked:', topic.name)
      }
    }
  }

  const getGoalStats = (goal: Goal) => {
    const total = goal.topics.length
    const completed = goal.topics.filter(t => {
      const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
      return p?.status === 'COMPLETED' || p?.status === 'MASTERED'
    }).length
    const inProgress = goal.topics.filter(t => {
      const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
      return p?.status === 'IN_PROGRESS'
    }).length
    return { total, completed, inProgress, percent: Math.round((completed / total) * 100) || 0 }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const stats = selectedGoal ? getGoalStats(selectedGoal) : null

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="practicum-card-yellow p-6 sm:p-8 rounded-3xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#10101a]/20 rounded-2xl flex items-center justify-center">
              <Network className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Карта знаний</h1>
              <p className="text-white/70">Визуализация твоего прогресса</p>
            </div>
          </div>
          {stats && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-white/70">тем</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.completed}</p>
                <p className="text-xs text-white/70">завершено</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.percent}%</p>
                <p className="text-xs text-white/70">прогресс</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {goals.length > 0 ? (
        <>
          {/* Goal selector */}
          {goals.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {goals.map(goal => {
                const goalStats = getGoalStats(goal)
                return (
                  <button
                    key={goal.id}
                    onClick={() => { setSelectedGoal(goal); setSelectedTopic(null) }}
                    className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all whitespace-nowrap ${
                      selectedGoal?.id === goal.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
                        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50'
                    }`}
                  >
                    <span className="font-medium">{goal.title}</span>
                    <span className={`badge-practicum ${goalStats.percent >= 80 ? 'badge-practicum-success' : ''}`}>
                      {goalStats.percent}%
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Graph and details */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <div className="h-1 bg-[var(--color-primary)]" />
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
                      {selectedGoal?.title}
                    </div>
                    {stats && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 progress-practicum">
                          <div className="progress-practicum-fill" style={{ width: `${stats.percent}%` }} />
                        </div>
                        <span className="text-sm text-[var(--color-text-secondary)]">{stats.percent}%</span>
                      </div>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {selectedGoal && (
                    <KnowledgeGraph
                      topics={selectedGoal.topics}
                      onTopicClick={handleTopicClick}
                      selectedTopicId={selectedTopic?.id}
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {selectedTopic ? (
                <TopicDetails
                  topic={selectedTopic}
                  onClose={() => setSelectedTopic(null)}
                  onStartLesson={() => router.push(`/learn/${selectedTopic.id}`)}
                />
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 bg-[var(--color-primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Network className="w-8 h-8 text-[var(--color-primary)]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Выбери тему</h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Кликни на узел графа для деталей
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Legend */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Легенда</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { color: 'bg-[var(--color-text-secondary)]', label: 'Заблокировано' },
                    { color: 'bg-blue-500', label: 'Доступно' },
                    { color: 'bg-[var(--color-primary)]', label: 'В процессе' },
                    { color: 'bg-green-500', label: 'Завершено' },
                    { color: 'bg-purple-500', label: 'Освоено' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${item.color}`} />
                      <span className="text-sm text-[var(--color-text-secondary)]">{item.label}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-24 h-24 bg-[var(--color-bg-secondary)] rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Target className="w-12 h-12 text-[var(--color-text-secondary)]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Создай первый курс</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Карта знаний появится после создания курса
            </p>
            <button onClick={() => router.push('/goals/new')} className="btn-practicum">
              <Sparkles className="w-5 h-5 mr-2 inline" />
              Создать курс
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

