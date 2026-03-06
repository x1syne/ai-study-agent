    'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, BookOpen, Code, CheckCircle, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { TheoryContent, StreamingTheoryContent } from '@/components/learning/TheoryContent'
import { CodeEditor } from '@/components/learning/CodeEditor'
import { QuizQuestion } from '@/components/learning/QuizQuestion'
import { VisualTask } from '@/components/learning/VisualTask'
import { StepikTask, TaskResult } from '@/components/learning/StepikTask'
import { StudyTimer } from '@/components/learning/StudyTimer'
import { CompletionModal } from '@/components/learning/CompletionModal'
import { TopicNavigation, TopicNavigationItem } from '@/components/learning/TopicNavigation'
import { useCompletionModal } from '@/hooks/useCompletionModal'
import type { TopicStatus } from '@/types'
import type { ModuleWithTopics } from '@/components/learning/CourseSidebar'

// Lazy load CourseSidebar for better initial page load performance
const CourseSidebar = dynamic(
  () => import('@/components/learning/CourseSidebar').then(mod => ({ default: mod.CourseSidebar })),
  { 
    ssr: false,
    loading: () => (
      <aside className="hidden md:flex md:flex-col w-72 flex-shrink-0 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] h-full">
        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="h-6 w-32 bg-slate-700/50 rounded animate-pulse mb-3" />
          <div className="h-4 w-24 bg-slate-700/50 rounded animate-pulse mb-2" />
          <div className="h-2 w-full bg-slate-700/50 rounded animate-pulse" />
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-700/30 rounded-xl animate-pulse" />
          ))}
        </div>
      </aside>
    )
  }
)

type LessonStep = 'theory' | 'practice' | 'complete'

interface PracticeTask {
  id: number
  question: string
  type: string
  difficulty: string
  options?: string[]
  correctAnswer?: number
  correctAnswers?: number[] | string[]
  explanation: string
}

// Сортировка заданий от простого к сложному
function sortTasksByDifficulty(tasks: PracticeTask[]): PracticeTask[] {
  const order = { easy: 0, medium: 1, hard: 2 }
  return [...tasks].sort((a, b) => {
    const aOrder = order[a.difficulty as keyof typeof order] ?? 1
    const bOrder = order[b.difficulty as keyof typeof order] ?? 1
    return aOrder - bOrder
  })
}

export default function LearnPage() {
  const params = useParams()
  const router = useRouter()
  const [step, setStep] = useState<LessonStep>('theory')
  const [topic, setTopic] = useState<any>(null)
  const [lesson, setLesson] = useState<any>(null)
  const [practiceLesson, setPracticeLesson] = useState<any>(null)
  const [practiceTasks, setPracticeTasks] = useState<PracticeTask[]>([])
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0)
  const [taskScore, setTaskScore] = useState({ correct: 0, total: 0 })
  const [taskResults, setTaskResults] = useState<TaskResult[]>([])
  const [savedAnswers, setSavedAnswers] = useState<Map<number, any>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChangingTask, setIsChangingTask] = useState(false)
  const [theoryContent, setTheoryContent] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // Course sidebar state
  const [courseModules, setCourseModules] = useState<ModuleWithTopics[]>([])
  const [allTopicsForNav, setAllTopicsForNav] = useState<TopicNavigationItem[]>([])
  const [goalId, setGoalId] = useState<string>('')
  const [currentTopicStatus, setCurrentTopicStatus] = useState<TopicStatus>('AVAILABLE')

  useEffect(() => { 
    // AbortController — отменяет запрос при смене темы или двойном mount (StrictMode)
    const abortController = new AbortController()

    // Сбрасываем состояние при смене темы
    setStep('theory')
    setTopic(null)
    setLesson(null)
    setPracticeLesson(null)
    setPracticeTasks([])
    setCurrentTaskIndex(0)
    setTaskScore({ correct: 0, total: 0 })
    setTaskResults([])
    setSavedAnswers(new Map())
    setTheoryContent('')
    setStreamingContent('')
    setIsStreaming(false)
    setIsLoadingImages(false)
    setLoadError(null)

    // Загружаем новую тему
    fetchTheoryStream(abortController.signal)

    return () => { abortController.abort() }
  }, [params.topicId])

  // Fetch course structure for sidebar
  const fetchCourseStructure = useCallback(async (goalIdParam: string) => {
    try {
      const res = await fetch(`/api/goals/${goalIdParam}`)
      if (res.ok) {
        const goal = await res.json()
        setGoalId(goal.id)
        
        // Transform modules for sidebar
        const modules: ModuleWithTopics[] = goal.modules.map((mod: any) => {
          const topics = mod.topics.map((t: any) => ({
            id: t.id,
            name: t.name,
            order: t.order,
            status: (t.progress?.status || 'LOCKED') as TopicStatus,
            prerequisiteIds: t.prerequisiteIds || [],
          }))
          
          // Calculate module progress
          const completedTopics = topics.filter(
            (t: { status: TopicStatus }) => t.status === 'COMPLETED' || t.status === 'MASTERED'
          ).length
          const progress = topics.length > 0 ? Math.round((completedTopics / topics.length) * 100) : 0
          
          return {
            id: mod.id,
            name: mod.name,
            icon: mod.icon || '📚',
            order: mod.order,
            progress,
            topics,
          }
        })
        
        setCourseModules(modules)
        
        // Build flat list of all topics for navigation - Requirements: 7.1
        const allTopics: TopicNavigationItem[] = goal.modules.flatMap((mod: any) =>
          mod.topics.map((t: any) => ({
            id: t.id,
            name: t.name,
            order: t.order,
            status: (t.progress?.status || 'LOCKED') as TopicStatus,
            moduleOrder: mod.order,
            moduleName: mod.name,
            prerequisiteIds: t.prerequisiteIds || [],
          }))
        )
        setAllTopicsForNav(allTopics)
        
        // Find current topic status
        const currentTopic = modules
          .flatMap((m: ModuleWithTopics) => m.topics)
          .find((t: { id: string }) => t.id === params.topicId)
        if (currentTopic) {
          setCurrentTopicStatus(currentTopic.status)
        }
      }
    } catch (e) {
      console.error('Failed to fetch course structure:', e)
    }
  }, [params.topicId])

  // Получаем тон из localStorage
  const getContentTone = () => {
    if (typeof window === 'undefined') return ''
    try {
      const settings = JSON.parse(localStorage.getItem('settings') || '{}')
      return settings.contentTone || ''
    } catch { return '' }
  }

  /** Загрузка теории через SSE-стриминг (текст появляется по мере генерации) */
  const fetchTheoryStream = async (signal?: AbortSignal) => {
    setIsLoading(true)
    setLoadError(null)
    setStreamingContent('')
    setIsStreaming(false)

    try {
      const res = await fetch(`/api/topics/${params.topicId}/lesson/stream`, { signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const contentType = res.headers.get('content-type') || ''

      // Если теория закэширована — бэкенд вернёт обычный JSON
      if (contentType.includes('application/json')) {
        const data = await res.json()
        setTopic(data.topic)
        const md = data.content || ''
        setLesson({ id: data.lessonId, content: { markdown: md } })
        setTheoryContent(md)
        if (data.goalId) fetchCourseStructure(data.goalId)
        setIsLoading(false)
        return
      }

      // SSE-стрим — читаем чанки
      setIsLoading(false)
      setIsStreaming(true)

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let accumulated = ''
      let lastFlush = 0
      const FLUSH_INTERVAL = 300 // мс между обновлениями UI (тяжёлый рендер с LaTeX/таблицами)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'start' && event.topic) {
              setTopic(event.topic)
              if (event.goalId) fetchCourseStructure(event.goalId)
            } else if (event.type === 'chunk') {
              accumulated += event.content
              // Тротлим обновления UI — не чаще раз в 150мс
              const now = Date.now()
              if (now - lastFlush >= FLUSH_INTERVAL) {
                setStreamingContent(accumulated)
                lastFlush = now
              }
            } else if (event.type === 'images_loading') {
              setIsLoadingImages(true)
            } else if (event.type === 'images_done') {
              setIsLoadingImages(false)
            } else if (event.type === 'content_replace') {
              accumulated = event.content
              setStreamingContent(accumulated)
              setIsLoadingImages(false)
            } else if (event.type === 'done') {
              setLesson({ id: event.lessonId, content: { markdown: accumulated } })
              setTheoryContent(accumulated)
              setIsStreaming(false)
            } else if (event.type === 'error') {
              throw new Error(event.message || 'Stream error')
            }
          } catch (parseError) {
            // Логируем только если это не пустая строка
            if (line.slice(6).trim()) {
              console.warn('[Stream] Failed to parse SSE event:', line.slice(6, 80))
            }
          }
        }
      }

      // Финальный flush остатка
      setStreamingContent(accumulated)
      setIsStreaming(false)
    } catch (e: any) {
      // Abort — штатная отмена, не показываем ошибку
      if (e.name === 'AbortError') {
        console.log('[Stream] Aborted (cleanup / topic change)')
        return
      }
      console.error('[Stream] Failed:', e)
      setLoadError(e.message || 'Ошибка загрузки теории')
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  const fetchLesson = async (type: string) => {
    // Теория — через стриминг
    if (type === 'theory') { return fetchTheoryStream() }

    setIsLoading(true)
    setLoadError(null)
    try {
      const tone = getContentTone()
      const toneParam = tone ? `&tone=${tone}` : ''
      const res = await fetch(`/api/topics/${params.topicId}/lesson?type=${type}${toneParam}`)

      if (res.ok) {
        const data = await res.json()
        setTopic(data.topic)

        // Update current topic status from progress
        if (data.progress?.status) {
          setCurrentTopicStatus(data.progress.status as TopicStatus)
        }

        if (type === 'theory') {
          setLesson(data.lesson)
          const content = data.lesson?.content
          if (content) {
            setTheoryContent(typeof content === 'string' ? content : (content.markdown || content.text || ''))
          }
          fetchGoalIdFromTopic(params.topicId as string)
        } else {
          setPracticeLesson(data.lesson)
          const tasks = data.lesson?.content?.tasks
          if (tasks && Array.isArray(tasks) && tasks.length > 0) {
            // Фильтруем невалидные задания
            const validTasks = tasks.filter((t: any) => {
              if (!t.question || t.question.length < 10) return false
              if (t.type === 'single' && (!t.options || t.options.length < 2)) return false
              if (t.type === 'multiple' && (!t.options || t.options.length < 2)) return false
              if (t.type === 'matching' && (!t.leftItems || !t.rightItems || t.leftItems.length < 2)) return false
              return true
            })
            
            // Убираем дубликаты по тексту вопроса
            const seenQuestions = new Set<string>()
            const uniqueTasks = validTasks.filter((t: any) => {
              const normalized = t.question.toLowerCase().trim().slice(0, 50)
              if (seenQuestions.has(normalized)) return false
              seenQuestions.add(normalized)
              return true
            })
            
            const sortedTasks = sortTasksByDifficulty(uniqueTasks)
            setPracticeTasks(sortedTasks)
            setCurrentTaskIndex(0)
            setTaskScore({ correct: 0, total: 0 })
            setTaskResults(new Array(sortedTasks.length).fill('pending'))
          } else {
            setPracticeTasks([])
            setTaskResults([])
          }
        }
      } else if (res.status === 403) {
        console.error('Access denied to topic')
        setLoadError('Доступ к теме запрещён')
        router.push('/goals')
      } else if (res.status === 404) {
        console.error('Topic not found')
        setLoadError('Тема не найдена')
        router.push('/goals')
      } else {
        console.error('Failed to fetch lesson:', res.status, res.statusText)
        const errorData = await res.json().catch(() => ({}))
        console.error('Error details:', errorData)
        setLoadError('Не удалось загрузить урок. Попробуйте обновить страницу.')
      }
    } catch (e) { 
      console.error('Network error:', e)
      setLoadError('Ошибка сети. Проверьте подключение к интернету.')
    }
    finally { 
      setIsLoading(false) 
    }
  }

  // Fetch goal ID from topic to load course structure
  const fetchGoalIdFromTopic = async (topicId: string) => {
    try {
      // Get all goals and find the one containing this topic
      const goalsRes = await fetch('/api/goals')
      if (goalsRes.ok) {
        const goals = await goalsRes.json()
        for (const goal of goals) {
          // Fetch full goal with modules
          const goalRes = await fetch(`/api/goals/${goal.id}`)
          if (goalRes.ok) {
            const fullGoal = await goalRes.json()
            const hasTopicInGoal = fullGoal.modules?.some((m: any) => 
              m.topics?.some((t: any) => t.id === topicId)
            )
            if (hasTopicInGoal) {
              fetchCourseStructure(goal.id)
              break
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch goal ID:', e)
    }
  }

  // Mark current topic as completed (fire-and-forget — не блокирует навигацию)
  const markTopicComplete = useCallback(async () => {
    // Оптимистичное обновление UI
    setCurrentTopicStatus('COMPLETED')

    try {
      // Submit в фоне
      await fetch(`/api/topics/${params.topicId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'manual_complete', score: 100 }),
      })

      // Sidebar обновим в фоне — не блокируем переход
      if (goalId) {
        fetchCourseStructure(goalId).catch(() => {})
      }
    } catch (e) {
      console.error('Failed to mark topic complete:', e)
    }
  }, [params.topicId, goalId, fetchCourseStructure])

  // Navigate to a different topic
  const navigateToTopic = useCallback((topicId: string) => {
    router.push(`/learn/${topicId}`)
  }, [router])

  // Completion modal hook
  const completionModal = useCompletionModal({
    currentTopicStatus,
    currentTopicName: topic?.name || '',
    onNavigate: navigateToTopic,
    onMarkComplete: markTopicComplete,
  })

  const handleCompleteTheory = () => {
    // Fire-and-forget: отметка теории в фоне, переход к практике мгновенный
    fetch(`/api/topics/${params.topicId}/lesson`, { method: 'POST' }).catch(e => console.error(e))
    setStep('practice')
    fetchLesson('practice')
  }

  const handleSubmitCode = async (code: string, score?: number, retryCount = 0) => {
    const MAX_RETRIES = 3
    setIsSubmitting(true)
    try {
      // Если передан score (из практики с заданиями) - используем его
      // Иначе отправляем код на проверку AI
      const practiceScore = score ?? (taskScore.total > 0 ? Math.round((taskScore.correct / taskScore.total) * 100) : undefined)
      const res = await fetch(`/api/topics/${params.topicId}/submit`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ code, lessonId: practiceLesson?.id, score: practiceScore }) 
      })
      if (res.ok) { 
        const result = await res.json()
        if (result.isCorrect) {
          setStep('complete')
          setCurrentTopicStatus('COMPLETED')
          // Refresh course structure
          if (goalId) {
            fetchCourseStructure(goalId)
          }
        }
      }
      else if (retryCount < MAX_RETRIES) {
        // Retry при ошибке сервера
        console.log(`[Learn] Submit retry ${retryCount + 1}/${MAX_RETRIES}`)
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)))
        return handleSubmitCode(code, score, retryCount + 1)
      }
    } catch (e) { 
      console.error('Submit error:', e)
      // Retry при сетевой ошибке
      if (retryCount < MAX_RETRIES) {
        console.log(`[Learn] Submit retry ${retryCount + 1}/${MAX_RETRIES}`)
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)))
        return handleSubmitCode(code, score, retryCount + 1)
      }
    }
    finally { setIsSubmitting(false) }
  }

  if (isLoading && !topic) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>

  // Error state - show error message with retry button
  if (loadError && !topic) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-24 h-24 bg-orange-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">⚠️</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Ошибка загрузки</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              {loadError}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => fetchLesson('theory')} 
                className="btn-practicum"
              >
                Попробовать снова
              </button>
              <button 
                onClick={() => router.push('/goals')} 
                className="btn-practicum-outline"
              >
                Вернуться к курсам
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Если тема не загрузилась после окончания загрузки
  if (!isLoading && !topic) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ArrowLeft className="w-12 h-12 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Тема недоступна</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Возможно, тема заблокирована или вы не имеете к ней доступа
            </p>
            <button onClick={() => router.push('/goals')} className="btn-practicum">
              Вернуться к курсам
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stepProgress = step === 'theory' ? 33 : step === 'practice' ? 66 : 100

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Course Sidebar - Requirements: 1.1 */}
      {courseModules.length > 0 && (
        <CourseSidebar
          goalId={goalId}
          modules={courseModules}
          currentTopicId={params.topicId as string}
          onTopicSelect={completionModal.handleTopicSelect}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button onClick={() => router.back()} className="p-2 rounded-xl text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{topic?.icon || '📚'}</span>
                  <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{topic?.name}</h1>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] truncate">{topic?.description}</p>
              </div>
            </div>
            
            {/* Study Timer */}
            <div className="hidden sm:block">
              <StudyTimer 
                topicId={params.topicId as string}
                autoStart={step !== 'complete'}
                showControls={false}
              />
            </div>
          </div>

          {/* Progress Steps */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 sm:gap-4 mb-3">
                <StepIndicator icon={<BookOpen />} label="Теория" active={step === 'theory'} completed={step !== 'theory'} />
                <div className="flex-1 h-0.5 bg-[var(--color-border)]" />
                <StepIndicator icon={<Code />} label="Практика" active={step === 'practice'} completed={step === 'complete'} />
                <div className="flex-1 h-0.5 bg-[var(--color-border)]" />
                <StepIndicator icon={<CheckCircle />} label="Готово" active={step === 'complete'} completed={false} />
              </div>
              <div className="progress-practicum"><div className="progress-practicum-fill" style={{ width: `${stepProgress}%` }} /></div>
              
              {/* Mobile Timer */}
              <div className="sm:hidden mt-4 pt-4 border-t border-[var(--color-border)]">
                <StudyTimer 
                  topicId={params.topicId as string}
                  autoStart={step !== 'complete'}
                  showControls={true}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          {step === 'theory' && (
            <Card>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
                    <span className="ml-3 text-[var(--color-text-secondary)]">AI генерирует материал...</span>
                  </div>
                ) : isStreaming ? (
                  /* Стриминг: полный рендер с таблицами, LaTeX, кодом и картинками */
                  <>
                    <StreamingTheoryContent content={streamingContent} />
                    <div className="flex items-center gap-2 mt-4 py-3 px-4 bg-[var(--color-primary)]/10 rounded-lg">
                      <Loader2 className="w-4 h-4 text-[var(--color-primary)] animate-spin" />
                      <span className="text-sm text-[var(--color-text-secondary)]">
                        {isLoadingImages ? 'Генерация иллюстраций...' : 'Генерация...'}
                      </span>
                    </div>
                  </>
                ) : lesson?.content ? (
                  <>
                    <TheoryContent 
                      content={typeof lesson.content === 'string' ? lesson.content : (lesson.content.markdown || lesson.content.text || JSON.stringify(lesson.content))} 
                      topicName={topic?.name || ''} 
                    />
                    <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
                      <button onClick={handleCompleteTheory} className="btn-practicum w-full">
                        Теория изучена → Практика
                      </button>
                    </div>
                    {/* Topic Navigation - Requirements: 7.1 */}
                    {allTopicsForNav.length > 0 && (
                      <TopicNavigation
                        currentTopicId={params.topicId as string}
                        allTopics={allTopicsForNav}
                        onNavigate={completionModal.handleTopicSelect}
                      />
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-[var(--color-text-secondary)]">
                    Не удалось загрузить теорию. Попробуйте обновить страницу.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {step === 'practice' && (
            <div className="space-y-6">
              {isLoading ? (
                <Card><CardContent className="py-12 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
                  <span className="ml-3 text-[var(--color-text-secondary)]">AI генерирует задания...</span>
                </CardContent></Card>
              ) : practiceTasks.length > 0 ? (
                <>
                  <Card><CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-[var(--color-text-secondary)]">Задание {currentTaskIndex + 1} из {practiceTasks.length}</span>
                      <span className="text-sm text-green-500">Правильно: {taskScore.correct}/{practiceTasks.length}</span>
                    </div>
                    <div className="progress-practicum"><div className="progress-practicum-fill" style={{ width: `${(currentTaskIndex / practiceTasks.length) * 100}%` }} /></div>
                    <div className="flex gap-1 mt-3">
                      {practiceTasks.map((_, idx) => (
                        <div key={idx} className={`h-2 flex-1 rounded ${idx < currentTaskIndex ? 'bg-green-500' : idx === currentTaskIndex ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
                      ))}
                    </div>
                  </CardContent></Card>
                  {currentTaskIndex < practiceTasks.length && (
                    <div className={`transition-opacity duration-200 ${isChangingTask ? 'opacity-50' : 'opacity-100'}`}>
                      <StepikTask
                        key={`task-${currentTaskIndex}`}
                        task={practiceTasks[currentTaskIndex] as any}
                        taskNumber={currentTaskIndex + 1}
                        totalTasks={practiceTasks.length}
                        taskResults={taskResults}
                        theoryContent={theoryContent}
                        savedAnswer={savedAnswers.get(currentTaskIndex)}
                        lessonId={practiceLesson?.id}
                        onDifficultyOverride={(taskId, newDifficulty) => {
                          // Update the task in the local state
                          setPracticeTasks(prev => prev.map(t => 
                            t.id === taskId ? { ...t, difficulty: newDifficulty, manualOverride: true } : t
                          ))
                        }}
                        onAnswer={(isCorrect, answer) => {
                          // Обновляем score только если это первый ответ на задание
                          if (taskResults[currentTaskIndex] === 'pending') {
                            setTaskScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }))
                          }
                          setTaskResults(prev => {
                            const newResults = [...prev]
                            newResults[currentTaskIndex] = isCorrect ? 'correct' : 'wrong'
                            return newResults
                          })
                          setSavedAnswers(prev => new Map(prev).set(currentTaskIndex, answer))
                        }}
                        onNext={() => {
                          if (currentTaskIndex < practiceTasks.length - 1) {
                            setIsChangingTask(true)
                            setTimeout(() => {
                              setCurrentTaskIndex(prev => prev + 1)
                              setIsChangingTask(false)
                            }, 100)
                          }
                          else { 
                            // Score считается от ОБЩЕГО числа заданий, не только отвеченных
                            const finalScore = practiceTasks.length > 0 
                              ? Math.round((taskScore.correct / practiceTasks.length) * 100) 
                              : 0
                            handleSubmitCode('practice_completed', finalScore)
                            setStep('complete') 
                          }
                        }}
                        onPrev={() => { 
                          if (currentTaskIndex > 0) {
                            setIsChangingTask(true)
                            setTimeout(() => {
                              setCurrentTaskIndex(prev => prev - 1)
                              setIsChangingTask(false)
                            }, 100)
                          }
                        }}
                        onGoToTask={(idx) => {
                          setIsChangingTask(true)
                          setTimeout(() => {
                            setCurrentTaskIndex(idx)
                            setIsChangingTask(false)
                          }, 100)
                        }}
                        onGoToTheory={() => setStep('theory')}
                        canGoPrev={currentTaskIndex > 0}
                      />
                    </div>
                  )}
                </>
              ) : practiceLesson?.content ? (
                practiceLesson.content.taskType === 'visual' ? (
                  <VisualTask title={practiceLesson.content.title} description={practiceLesson.content.description} steps={practiceLesson.content.steps} expectedResult={practiceLesson.content.expectedResult || practiceLesson.content.solution} hints={practiceLesson.hints || practiceLesson.content.hints} checkpoints={practiceLesson.content.checkpoints} onComplete={() => { handleSubmitCode('visual_task_completed'); setStep('complete') }} isLoading={isSubmitting} />
                ) : practiceLesson.content.taskType === 'quiz' ? (
                  <Card><CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">{practiceLesson.content.title || 'Проверка'}</h2>
                    <QuizQuestion question={practiceLesson.content.description} options={practiceLesson.content.options || ['Да', 'Нет']} correctAnswer={practiceLesson.content.correctAnswer || 0} explanation={practiceLesson.content.solution} onAnswer={(isCorrect) => { if (isCorrect) { handleSubmitCode('quiz_correct'); setStep('complete') } }} />
                  </CardContent></Card>
                ) : (
                  <>
                    <Card><CardContent className="p-6">
                      <h2 className="text-xl font-semibold text-white mb-4">{practiceLesson.content.title || 'Задание'}</h2>
                      <p className="text-[var(--color-text-secondary)]">{practiceLesson.content.description}</p>
                    </CardContent></Card>
                    <CodeEditor initialCode={practiceLesson.content.starterCode || '// Код'} language="python" onSubmit={handleSubmitCode} hints={practiceLesson.hints || practiceLesson.content.hints} solution={practiceLesson.solution || practiceLesson.content.solution} isLoading={isSubmitting} />
                  </>
                )
              ) : (
                <Card><CardContent className="py-12 text-center text-[var(--color-text-secondary)]">Не удалось загрузить</CardContent></Card>
              )}
            </div>
          )}

          {step === 'complete' && (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-20 h-20 bg-[var(--color-primary)] rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Тема завершена!</h2>
                {practiceTasks.length > 0 && (
                  <div className="mb-6">
                    <p className="text-4xl font-bold text-[var(--color-primary)] mb-2">{Math.round((taskScore.correct / practiceTasks.length) * 100)}%</p>
                    <p className="text-[var(--color-text-secondary)]">{taskScore.correct} из {practiceTasks.length} правильно</p>
                    {taskScore.correct / practiceTasks.length < 0.4 && (
                      <p className="text-orange-400 text-sm mt-2">Рекомендуем повторить теорию и пройти тест ещё раз</p>
                    )}
                  </div>
                )}
                <p className="text-[var(--color-text-secondary)] mb-6">
                  {practiceTasks.length > 0 && taskScore.correct / practiceTasks.length >= 0.7 
                    ? `Отлично! Ты освоил "${topic?.name}"` 
                    : `Тема "${topic?.name}" пройдена. Продолжай практиковаться!`}
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button onClick={() => router.back()} className="btn-practicum-outline">Назад к курсу</button>
                  <button 
                    onClick={() => {
                      setStep('practice')
                      setCurrentTaskIndex(0)
                      setTaskScore({ correct: 0, total: 0 })
                      setTaskResults(new Array(practiceTasks.length).fill('pending'))
                    }} 
                    className="btn-practicum-outline"
                  >
                    Пройти тест снова
                  </button>
                  <Link href="/review"><button className="btn-practicum">К повторению</button></Link>
                </div>
                {/* Topic Navigation - Requirements: 7.1, 7.2 */}
                {allTopicsForNav.length > 0 && (
                  <TopicNavigation
                    currentTopicId={params.topicId as string}
                    allTopics={allTopicsForNav}
                    onNavigate={navigateToTopic}
                    className="mt-8"
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Completion Modal - Requirements: 2.1, 2.5, 2.6 */}
      <CompletionModal
        isOpen={completionModal.isOpen}
        onConfirm={completionModal.handleConfirm}
        onCancel={completionModal.handleCancel}
        topicName={completionModal.topicName}
      />
    </div>
  )
}

function StepIndicator({ icon, label, active, completed }: { icon: React.ReactNode; label: string; active: boolean; completed: boolean }) {
  return (
    <div className={`flex items-center gap-1 sm:gap-2 ${active ? 'text-[var(--color-primary)]' : completed ? 'text-green-500' : 'text-[var(--color-text-secondary)]'}`}>
      <span className="w-4 h-4 sm:w-5 sm:h-5">{icon}</span>
      <span className="text-xs sm:text-sm font-medium">{label}</span>
    </div>
  )
}
