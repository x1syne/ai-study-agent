'use client'

import { useState, useCallback, useRef } from 'react'

interface StreamingState {
  content: string
  isStreaming: boolean
  isComplete: boolean
  error: string | null
  lessonId: string | null
}

interface UseStreamingContentOptions {
  onChunk?: (chunk: string) => void
  onComplete?: (content: string, lessonId: string) => void
  onError?: (error: string) => void
}

/**
 * Хук для стриминга контента теории в реальном времени
 * Использует Server-Sent Events (SSE) для получения чанков
 */
export function useStreamingContent(options: UseStreamingContentOptions = {}) {
  const [state, setState] = useState<StreamingState>({
    content: '',
    isStreaming: false,
    isComplete: false,
    error: null,
    lessonId: null,
  })

  const abortControllerRef = useRef<AbortController | null>(null)

  const startStreaming = useCallback(async (topicId: string) => {
    // Отменяем предыдущий запрос если есть
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()

    setState({
      content: '',
      isStreaming: true,
      isComplete: false,
      error: null,
      lessonId: null,
    })

    try {
      const response = await fetch(`/api/topics/${topicId}/lesson/stream`, {
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type')

      // Если это JSON — контент уже закеширован
      if (contentType?.includes('application/json')) {
        const data = await response.json()
        setState({
          content: data.content,
          isStreaming: false,
          isComplete: true,
          error: null,
          lessonId: data.lessonId,
        })
        options.onComplete?.(data.content, data.lessonId)
        return
      }

      // SSE стриминг
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let fullContent = ''

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
              case 'start':
                // Начало генерации
                break

              case 'chunk':
                fullContent += parsed.content
                setState(prev => ({
                  ...prev,
                  content: fullContent,
                }))
                options.onChunk?.(parsed.content)
                break

              case 'done':
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  isComplete: true,
                  lessonId: parsed.lessonId,
                }))
                options.onComplete?.(fullContent, parsed.lessonId)
                break

              case 'error':
                throw new Error(parsed.message)
            }
          } catch (e) {
            // Игнорируем ошибки парсинга отдельных чанков
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return

      const errorMessage = error.message || 'Streaming failed'
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: errorMessage,
      }))
      options.onError?.(errorMessage)
    }
  }, [options])

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setState(prev => ({
      ...prev,
      isStreaming: false,
    }))
  }, [])

  const reset = useCallback(() => {
    stopStreaming()
    setState({
      content: '',
      isStreaming: false,
      isComplete: false,
      error: null,
      lessonId: null,
    })
  }, [stopStreaming])

  return {
    ...state,
    startStreaming,
    stopStreaming,
    reset,
  }
}
