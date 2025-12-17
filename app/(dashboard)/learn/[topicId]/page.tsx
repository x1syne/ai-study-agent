'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Code, CheckCircle, Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { TheoryContent } from '@/components/learning/TheoryContent'
import { CodeEditor } from '@/components/learning/CodeEditor'
import { QuizQuestion } from '@/components/learning/QuizQuestion'
import { VisualTask } from '@/components/learning/VisualTask'
import { StepikTask, TaskResult } from '@/components/learning/StepikTask'

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
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [theoryContent, setTheoryContent] = useState('')
  const [taskKey, setTaskKey] = useState(0) // Unique key to force remount

  useEffect(() => { fetchLesson('theory') }, [params.topicId])

  // Получаем тон из localStorage
  const getContentTone = () => {
    if (typeof window === 'undefined') return ''
    try {
      const settings = JSON.parse(localStorage.getItem('settings') || '{}')
      return settings.contentTone || ''
    } catch { return '' }
  }

  const fetchLesson = async (type: string) => {
    setIsLoading(true)
    try {
      const tone = getContentTone()
      const toneParam = tone ? `&tone=${tone}` : ''
      const res = await fetch(`/api/topics/${params.topicId}/lesson?type=${type}${toneParam}`)
      
      if (res.ok) {
        const data = await res.json()
        setTopic(data.topic)
        if (type === 'theory') {
          setLesson(data.lesson)
          // Сохраняем теорию для AI помощи
          const content = data.lesson?.content
          if (content) {
            setTheoryContent(typeof content === 'string' ? content : (content.markdown || content.text || ''))
          }
        } else {
          setPracticeLesson(data.lesson)
          const tasks = data.lesson?.content?.tasks
          if (tasks && Array.isArray(tasks) && tasks.length > 0) {
            // Сортируем от простого к сложному
            const sortedTasks = sortTasksByDifficulty(tasks)
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
        router.push('/goals')
      } else if (res.status === 404) {
        console.error('Topic not found')
        router.push('/goals')
      } else {
        console.error('Failed to fetch lesson:', res.status, res.statusText)
        const errorData = await res.json().catch(() => ({}))
        console.error('Error details:', errorData)
      }
    } catch (e) { 
      console.error('Network error:', e)
    }
    finally { 
      setIsLoading(false) 
    }
  }

  const handleCompleteTheory = async () => {
    try { await fetch(`/api/topics/${params.topicId}/lesson`, { method: 'POST' }) } catch (e) { console.error(e) }
    setStep('practice')
    fetchLesson('practice')
  }

  const handleSubmitCode = async (code: string, score?: number) => {
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
      if (res.ok) { const result = await res.json(); if (result.isCorrect) setStep('complete') }
    } catch (e) { console.error(e) }
    finally { setIsSubmitting(false) }
  }

  if (isLoading && !topic) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>

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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
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
                  <span className="text-sm text-green-500">Правильно: {taskScore.correct}/{taskScore.total}</span>
                </div>
                <div className="progress-practicum"><div className="progress-practicum-fill" style={{ width: `${(currentTaskIndex / practiceTasks.length) * 100}%` }} /></div>
                <div className="flex gap-1 mt-3">
                  {practiceTasks.map((_, idx) => (
                    <div key={idx} className={`h-2 flex-1 rounded ${idx < currentTaskIndex ? 'bg-green-500' : idx === currentTaskIndex ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`} />
                  ))}
                </div>
              </CardContent></Card>
              {currentTaskIndex < practiceTasks.length && (
                <StepikTask
                  key={`task-${currentTaskIndex}-${taskKey}`}
                  task={practiceTasks[currentTaskIndex] as any}
                  taskNumber={currentTaskIndex + 1}
                  totalTasks={practiceTasks.length}
                  taskResults={taskResults}
                  theoryContent={theoryContent}
                  onAnswer={(isCorrect) => {
                    setTaskScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }))
                    setTaskResults(prev => {
                      const newResults = [...prev]
                      newResults[currentTaskIndex] = isCorrect ? 'correct' : 'wrong'
                      return newResults
                    })
                  }}
                  onNext={() => {
                    setTaskKey(k => k + 1) // Force remount on next
                    if (currentTaskIndex < practiceTasks.length - 1) setCurrentTaskIndex(prev => prev + 1)
                    else { 
                      const finalScore = taskScore.total > 0 ? Math.round((taskScore.correct / taskScore.total) * 100) : 0
                      handleSubmitCode('practice_completed', finalScore)
                      setStep('complete') 
                    }
                  }}
                  onPrev={() => { 
                    setTaskKey(k => k + 1) // Force remount on prev
                    if (currentTaskIndex > 0) setCurrentTaskIndex(prev => prev - 1) 
                  }}
                  onGoToTask={(idx) => {
                    setTaskKey(k => k + 1) // Force remount on jump
                    setCurrentTaskIndex(idx)
                  }}
                  onGoToTheory={() => setStep('theory')}
                  canGoPrev={currentTaskIndex > 0}
                />
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
            {taskScore.total > 0 && (
              <div className="mb-6">
                <p className="text-4xl font-bold text-[var(--color-primary)] mb-2">{Math.round((taskScore.correct / taskScore.total) * 100)}%</p>
                <p className="text-[var(--color-text-secondary)]">{taskScore.correct} из {taskScore.total} правильно</p>
                {taskScore.correct / taskScore.total < 0.4 && (
                  <p className="text-orange-400 text-sm mt-2">Рекомендуем повторить теорию и пройти тест ещё раз</p>
                )}
              </div>
            )}
            <p className="text-[var(--color-text-secondary)] mb-6">
              {taskScore.total > 0 && taskScore.correct / taskScore.total >= 0.7 
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
          </CardContent>
        </Card>
      )}
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
