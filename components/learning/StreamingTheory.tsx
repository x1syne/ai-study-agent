'use client'

import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { TheoryContent } from './TheoryContent'
import { useStreamingContent } from '@/hooks/useStreamingContent'
import { cn } from '@/lib/utils'

interface StreamingTheoryProps {
  topicId: string
  topicName: string
  onComplete?: (content: string, lessonId: string) => void
  onError?: (error: string) => void
  className?: string
}

/**
 * Компонент для стриминга теории в реальном времени
 * Показывает текст по мере генерации (как ChatGPT)
 */
export function StreamingTheory({
  topicId,
  topicName,
  onComplete,
  onError,
  className,
}: StreamingTheoryProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  
  const {
    content,
    isStreaming,
    isComplete,
    error,
    startStreaming,
  } = useStreamingContent({
    onComplete,
    onError,
  })

  // Запускаем стриминг при монтировании
  useEffect(() => {
    startStreaming(topicId)
  }, [topicId, startStreaming])

  // Автоскролл к новому контенту
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      const element = contentRef.current
      // Скроллим только если пользователь близко к низу
      const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 200
      if (isNearBottom) {
        element.scrollTop = element.scrollHeight
      }
    }
  }, [content, isStreaming])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">Ошибка генерации</h3>
        <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
        <button
          onClick={() => startStreaming(topicId)}
          className="btn-practicum-outline"
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  if (!content && isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative mb-6">
          <div className="w-16 h-16 bg-[var(--color-primary)]/10 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
          </div>
          {/* Пульсирующий эффект */}
          <div className="absolute inset-0 bg-[var(--color-primary)]/20 rounded-2xl animate-ping" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          AI генерирует материал...
        </h3>
        <p className="text-[var(--color-text-secondary)] text-sm">
          Это займёт несколько секунд
        </p>
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
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
        <TheoryContent 
          content={content} 
          topicName={topicName}
        />
        
        {/* Курсор печати */}
        {isStreaming && (
          <span className="inline-block w-2 h-5 bg-[var(--color-primary)] animate-pulse ml-1" />
        )}
      </div>

      {/* Индикатор завершения */}
      {isComplete && (
        <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <span>✓</span>
            <span>Материал готов</span>
            <span className="text-[var(--color-text-secondary)]">
              • {Math.round(content.length / 5)} слов
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
