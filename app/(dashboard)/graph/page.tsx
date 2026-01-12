'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Network, Target, Sparkles, AlertTriangle, LayoutGrid, GitBranch } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { KnowledgeGraph } from '@/components/graph/KnowledgeGraph'
import { ModuleGraph } from '@/components/graph/ModuleGraph'
import { TopicDetails } from '@/components/graph/TopicDetails'
import { ModuleTopics } from '@/components/graph/ModuleTopics'
import type { Goal, Topic, Module } from '@/types'
import { cn } from '@/lib/utils'

type ViewMode = 'modules' | 'topics'

// Error boundary wrapper for KnowledgeGraph
function SafeKnowledgeGraph({ topics, onTopicClick, selectedTopicId }: {
  topics: Topic[]
  onTopicClick: (topicId: string) => void
  selectedTopicId?: string
}) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">Не удалось загрузить граф</p>
          <button 
            onClick={() => setHasError(false)}
            className="btn-practicum-outline text-sm"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  try {
    return (
      <KnowledgeGraph
        topics={topics}
        onTopicClick={onTopicClick}
        selectedTopicId={selectedTopicId}
      />
    )
  } catch (error) {
    console.error('KnowledgeGraph render error:', error)
    setHasError(true)
    return null
  }
}

// Error boundary wrapper for ModuleGraph
function SafeModuleGraph({ modules, onModuleClick, selectedModuleId, isLoadingTopics }: {
  modules: Module[]
  onModuleClick: (moduleId: string) => void
  selectedModuleId?: string
  isLoadingTopics?: boolean
}) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
          <p className="text-slate-400 mb-4">Не удалось загрузить граф модулей</p>
          <button 
            onClick={() => setHasError(false)}
            className="btn-practicum-outline text-sm"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  try {
    return (
      <ModuleGraph
        modules={modules}
        onModuleClick={onModuleClick}
        selectedModuleId={selectedModuleId}
        isLoadingTopics={isLoadingTopics}
      />
    )
  } catch (error) {
    console.error('ModuleGraph render error:', error)
    setHasError(true)
    return null
  }
}

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

  // Flatten topics from modules for the graph
  const allTopics = useMemo(() => {
    if (!selectedGoal) return []
    
    // If goal has modules, flatten topics from all modules
    if (selectedGoal.modules && selectedGoal.modules.length > 0) {
      return selectedGoal.modules.flatMap((mod: Module) => mod.topics || [])
    }
    
    // Fallback to direct topics for backward compatibility
    return selectedGoal.topics || []
  }, [selectedGoal])

  // Get modules for module graph
  const allModules = useMemo(() => {
    if (!selectedGoal?.modules) return []
    return selectedGoal.modules
  }, [selectedGoal])

  const handleTopicClick = (topicId: string) => {
    if (!selectedGoal) return
    const topic = allTopics.find((t: Topic) => t.id === topicId)
    if (topic) {
      setSelectedTopic(topic)
      setSelectedModule(null)
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

  const handleModuleClick = async (moduleId: string) => {
    if (!selectedGoal) return
    const module = allModules.find((m: Module) => m.id === moduleId)
    if (module) {
      setSelectedModule(module)
      setSelectedTopic(null)
      
      // Если у модуля нет тем — они будут загружены/сгенерированы в ModuleTopics
      if (!module.topics || module.topics.length === 0) {
        setIsLoadingTopics(true)
        // Загрузка происходит в компоненте ModuleTopics
        setTimeout(() => setIsLoadingTopics(false), 100)
      }
    }
  }

  const getGoalStats = (goal: Goal) => {
    // Get topics from modules or direct topics
    const topics = goal.modules && goal.modules.length > 0
      ? goal.modules.flatMap((mod: Module) => mod.topics || [])
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
    
    const modulesCount = goal.modules?.length || 0
    
    return { total, completed, inProgress, modulesCount, percent: total > 0 ? Math.round((completed / total) * 100) : 0 }
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
                <p className="text-2xl font-bold text-white">{stats.modulesCount}</p>
                <p className="text-xs text-white/70">модулей</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-white/70">тем</p>
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
          {/* Goal selector + View mode toggle */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between">
            {/* Goal selector */}
            {goals.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {goals.map(goal => {
                  const goalStats = getGoalStats(goal)
                  return (
                    <button
                      key={goal.id}
                      onClick={() => { setSelectedGoal(goal); setSelectedTopic(null); setSelectedModule(null) }}
                      className={cn(
                        'flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all whitespace-nowrap',
                        selectedGoal?.id === goal.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
                          : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-primary)]/50'
                      )}
                    >
                      <span className="font-medium">{goal.title}</span>
                      <span className={cn('badge-practicum', goalStats.percent >= 80 && 'badge-practicum-success')}>
                        {goalStats.percent}%
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* View mode toggle */}
            <div className="flex gap-2 bg-[var(--color-bg-secondary)] p-1 rounded-xl border border-[var(--color-border)]">
              <button
                onClick={() => setViewMode('modules')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  viewMode === 'modules'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                )}
              >
                <LayoutGrid className="w-4 h-4" />
                Модули
              </button>
              <button
                onClick={() => setViewMode('topics')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  viewMode === 'topics'
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                )}
              >
                <GitBranch className="w-4 h-4" />
                Все темы
              </button>
            </div>
          </div>

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
                  {/* Module Graph View */}
                  {viewMode === 'modules' && selectedGoal && allModules.length > 0 && (
                    <SafeModuleGraph
                      modules={allModules}
                      onModuleClick={handleModuleClick}
                      selectedModuleId={selectedModule?.id}
                      isLoadingTopics={isLoadingTopics}
                    />
                  )}
                  
                  {/* Topics Graph View */}
                  {viewMode === 'topics' && selectedGoal && allTopics.length > 0 && (
                    <SafeKnowledgeGraph
                      topics={allTopics}
                      onTopicClick={handleTopicClick}
                      selectedTopicId={selectedTopic?.id}
                    />
                  )}
                  
                  {/* Empty state for modules */}
                  {viewMode === 'modules' && selectedGoal && allModules.length === 0 && (
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center">
                        <LayoutGrid className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-400">Модули ещё не созданы</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Empty state for topics */}
                  {viewMode === 'topics' && selectedGoal && allTopics.length === 0 && (
                    <div className="h-[400px] flex items-center justify-center">
                      <div className="text-center">
                        <Network className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-400">Темы ещё не созданы</p>
                        <p className="text-xs text-slate-500 mt-2">Кликни на модуль для генерации тем</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              {/* Module Topics Panel */}
              {selectedModule && (
                <ModuleTopics
                  moduleId={selectedModule.id}
                  moduleName={selectedModule.name}
                  moduleIcon={selectedModule.icon || '📚'}
                  onClose={() => setSelectedModule(null)}
                />
              )}
              
              {/* Topic Details Panel */}
              {selectedTopic && !selectedModule && (
                <TopicDetails
                  topic={selectedTopic}
                  onClose={() => setSelectedTopic(null)}
                  onStartLesson={() => router.push(`/learn/${selectedTopic.id}`)}
                />
              )}
              
              {/* Default state */}
              {!selectedTopic && !selectedModule && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 bg-[var(--color-primary)]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      {viewMode === 'modules' ? (
                        <LayoutGrid className="w-8 h-8 text-[var(--color-primary)]" />
                      ) : (
                        <Network className="w-8 h-8 text-[var(--color-primary)]" />
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {viewMode === 'modules' ? 'Выбери модуль' : 'Выбери тему'}
                    </h3>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {viewMode === 'modules' 
                        ? 'Кликни на модуль для просмотра тем' 
                        : 'Кликни на узел графа для деталей'}
                    </p>
                  </CardContent>
                </Card>
              )}
              
              {/* Legend */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Легенда</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { color: 'bg-slate-500', label: 'Заблокировано' },
                    { color: 'bg-cyan-500', label: 'Доступно' },
                    { color: 'bg-orange-500', label: 'В процессе' },
                    { color: 'bg-green-500', label: 'Завершено' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={cn('w-4 h-4 rounded-full', item.color)} />
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

