'use client'

import { useState, useEffect, useRef } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { TheoryContent } from './TheoryContent'
import { cn } from '@/lib/utils'

interface TheorySectionProps {
  topicId: string
  topicName: string
  onComplete: () => void
  onContentLoaded?: (content: string) => void
  useStreaming?: boolean
}

/**
 * Компонент секции теории с поддержкой стриминга
 * Показывает теорию либо через обычный API, либо через SSE стриминг
 */
export function TheorySection({
  topicId,
  topicName,
  onComplete,
  onContentLoaded,
  useStreaming = true,
}: TheorySectionProps) {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lessonId, setLessonId] = useState<string | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (useStreaming) {
      startStreaming()
    } else {
      fetchTheory()
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [topicId, useStreaming])

  // Автоскролл при стриминге
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      const element = contentRef.current
      const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 200
      if (isNearBottom) {
        element.scrollTop = element.scrollHeight
      }
    }
  }, [content, isStreaming])

  const startStreaming = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setIsStreaming(true)
    setError(null)
    setContent('')

    try {
      const response = await fetch(`/api/topics/${topicId}/lesson/stream`, {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type')

      // Если JSON — контент закеширован
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        setContent(data.content)
        setLessonId(data.lessonId)
        setIsLoading(false)
        setIsStreaming(false)
        onContentLoaded?.(data.content)
        return
      }

      // SSE стриминг
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let fullContent = ''
      setIsLoading(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value, { stream: true })
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (!data) continue

          try {
            const parsed = JSON.parse(data)

            switch (parsed.type) {
              case 'chunk':
                fullContent += parsed.content
                setContent(fullContent)
                break
              case 'done':
                setLessonId(parsed.lessonId)
                setIsStreaming(false)
                onContentLoaded?.(fullContent)
                break
              case 'error':
                throw new Error(parsed.message)
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || 'Ошибка загрузки')
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const fetchTheory = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/topics/${topicId}/lesson?type=theory`)
      if (!res.ok) throw new Error('Failed to fetch')

      const data = await res.json()
      const theoryContent = data.lesson?.content
      const markdown = typeof theoryContent === 'string' 
        ? theoryContent 
        : (theoryContent?.markdown || theoryContent?.text || '')
      
      setContent(markdown)
      setLessonId(data.lesson?.id)
      onContentLoaded?.(markdown)
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = () => {
    if (useStreaming) {
      startStreaming()
    } else {
      fetchTheory()
    }
  }

  // Ошибка
  if (error && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Ошибка загрузки</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
        <button onClick={handleRetry} className="btn-practicum-outline flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Попробовать снова
        </button>
      </div>
    )
  }

  // Начальная загрузка
  if (isLoading && !content) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative mb-6">
          <div className="w-16 h-16 bg-[var(--color-primary)]/10 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
          </div>
          <div className="absolute inset-0 bg-[var(--color-primary)]/20 rounded-2xl animate-ping" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          {useStreaming ? 'AI генерирует материал...' : 'Загрузка теории...'}
        </h3>
        <p className="text-[var(--color-text-secondary)] text-sm">
          Это займёт несколько секунд
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Индикатор стриминга */}
      {isStreaming && (
        <div className="sticky top-0 z-10 bg-gradient-to-b from-[var(--color-bg-card)] to-transparent pb-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-[var(--color-primary)]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Генерация...</span>
            <div className="flex-1" />
            <span className="text-[var(--color-text-secondary)]">
              {Math.round(content.length / 5)} слов
            </span>
          </div>
          <div className="mt-2 h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--color-primary)] transition-all duration-300"
              style={{ width: `${Math.min((content.length / 15000) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Контент */}
      <div ref={contentRef} className="overflow-y-auto">
        <TheoryContent content={content} topicName={topicName} />
        
        {/* Курсор печати */}
        {isStreaming && (
          <span className="inline-block w-2 h-5 bg-[var(--color-primary)] animate-pulse ml-1" />
        )}
      </div>

      {/* Кнопка завершения */}
      {!isStreaming && content && (
        <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
          <button onClick={onComplete} className="btn-practicum w-full">
            Теория изучена → Практика
          </button>
        </div>
      )}
    </div>
  )
}
