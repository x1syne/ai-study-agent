'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Play, Lock, CheckCircle, Clock, ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { TopicStatus } from '@/types'

interface ModuleTopicsProps {
  moduleId: string
  moduleName: string
  moduleIcon: string
  onClose: () => void
}

interface TopicWithProgress {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  order?: number
  progress?: {
    status: TopicStatus
    masteryLevel?: number
  } | null
}

const STATUS_CONFIG: Record<TopicStatus, { 
  icon: React.ReactNode
  color: string
  bg: string
  label: string
}> = {
  LOCKED: { 
    icon: <Lock className="w-4 h-4" />, 
    color: 'text-slate-500',
    bg: 'bg-slate-500/10',
    label: 'Заблокировано',
  },
  AVAILABLE: { 
    icon: <Play className="w-4 h-4" />, 
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    label: 'Доступно',
  },
  IN_PROGRESS: { 
    icon: <Clock className="w-4 h-4" />, 
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    label: 'В процессе',
  },
  COMPLETED: { 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    label: 'Завершено',
  },
  MASTERED: { 
    icon: <CheckCircle className="w-4 h-4" />, 
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    label: 'Освоено',
  },
}

/**
 * Компонент для отображения подтем модуля
 * Загружает темы лениво при открытии модуля
 */
export function ModuleTopics({
  moduleId,
  moduleName,
  moduleIcon,
  onClose,
}: ModuleTopicsProps) {
  const router = useRouter()
  const [topics, setTopics] = useState<TopicWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Загружаем или генерируем темы при монтировании
  useEffect(() => {
    fetchTopics()
  }, [moduleId])

  const fetchTopics = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/modules/${moduleId}/topics`)
      
      if (!res.ok) {
        throw new Error('Failed to fetch topics')
      }

      const data = await res.json()
      setTopics(data.topics || [])
      setIsGenerating(data.generated === true)
      
      // Если темы были сгенерированы, показываем уведомление
      if (data.generated) {
        setTimeout(() => setIsGenerating(false), 2000)
      }
    } catch (e) {
      console.error('Error fetching topics:', e)
      setError('Не удалось загрузить темы')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTopicClick = (topic: TopicWithProgress) => {
    const status = topic.progress?.status || 'AVAILABLE'
    if (status === 'LOCKED') return
    
    router.push(`/learn/${topic.id}`)
  }

  const getTopicStatus = (topic: TopicWithProgress): TopicStatus => {
    return topic.progress?.status || 'AVAILABLE'
  }

  // Сортируем темы по порядку
  const sortedTopics = [...topics].sort((a, b) => (a.order || 0) - (b.order || 0))

  // Статистика
  const completedCount = topics.filter(t => {
    const status = getTopicStatus(t)
    return status === 'COMPLETED' || status === 'MASTERED'
  }).length
  const progress = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0

  return (
    <Card className="relative overflow-hidden">
      {/* Градиентная полоса сверху */}
      <div className="h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{moduleIcon}</div>
            <div>
              <CardTitle className="text-lg">{moduleName}</CardTitle>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {topics.length} тем • {progress}% завершено
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Прогресс-бар */}
        <div className="mt-3">
          <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {/* Индикатор генерации */}
        {isGenerating && (
          <div className="mb-4 p-3 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--color-primary)]/20 rounded-lg flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-[var(--color-primary)] animate-spin" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Темы сгенерированы!</p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                AI создал структуру модуля
              </p>
            </div>
          </div>
        )}

        {/* Загрузка */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin mb-3" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              Загрузка тем...
            </p>
          </div>
        )}

        {/* Ошибка */}
        {error && !isLoading && (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button
              onClick={fetchTopics}
              className="btn-practicum-outline text-sm"
            >
              Попробовать снова
            </button>
          </div>
        )}

        {/* Список тем */}
        {!isLoading && !error && (
          <div className="space-y-2">
            {sortedTopics.map((topic, index) => {
              const status = getTopicStatus(topic)
              const config = STATUS_CONFIG[status]
              const isLocked = status === 'LOCKED'

              return (
                <button
                  key={topic.id}
                  onClick={() => handleTopicClick(topic)}
                  disabled={isLocked}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl text-left',
                    'transition-all duration-200',
                    isLocked 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-white/5 hover:translate-x-1 cursor-pointer',
                    'group'
                  )}
                >
                  {/* Номер */}
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium',
                    config.bg,
                    config.color,
                  )}>
                    {index + 1}
                  </div>

                  {/* Иконка темы */}
                  <div className="text-xl">{topic.icon || '📖'}</div>

                  {/* Информация */}
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      'font-medium truncate',
                      isLocked ? 'text-slate-500' : 'text-white'
                    )}>
                      {topic.name}
                    </h4>
                    {topic.description && (
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">
                        {topic.description}
                      </p>
                    )}
                  </div>

                  {/* Статус */}
                  <div className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs',
                    config.bg,
                    config.color,
                  )}>
                    {config.icon}
                    <span className="hidden sm:inline">{config.label}</span>
                  </div>

                  {/* Стрелка */}
                  {!isLocked && (
                    <ChevronRight className={cn(
                      'w-4 h-4 text-slate-500 transition-transform',
                      'group-hover:translate-x-1 group-hover:text-[var(--color-primary)]'
                    )} />
                  )}
                </button>
              )
            })}

            {/* Пустое состояние */}
            {sortedTopics.length === 0 && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-slate-700/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">📚</span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Темы ещё не созданы
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
