'use client'

import { useState, useCallback, useMemo } from 'react'
import { Check, X, Lightbulb, ChevronRight, ChevronLeft, RotateCcw, MessageCircle, Loader2, GripVertical } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

// Компонент для рендеринга текста с LaTeX
function MathText({ children, className = '' }: { children: string; className?: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[[rehypeKatex, { throwOnError: false, output: 'htmlAndMathml' }]]}
      components={{
        p: ({ children }) => <span className={className}>{children}</span>,
        code({ className: codeClassName, children, ...props }) {
          const match = /language-(\w+)/.exec(codeClassName || '')
          const isInline = !match && !String(children).includes('\n')
          return isInline ? (
            <code className="bg-slate-700 px-1.5 py-0.5 rounded text-primary-400 text-sm" {...props}>
              {children}
            </code>
          ) : (
            <SyntaxHighlighter
              style={oneDark}
              language={match ? match[1] : 'text'}
              PreTag="div"
              className="rounded-lg my-2 text-sm"
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          )
        }
      }}
    >
      {children}
    </ReactMarkdown>
  )
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b.charAt(i-1) === a.charAt(j-1) 
        ? matrix[i-1][j-1] 
        : Math.min(matrix[i-1][j-1]+1, matrix[i][j-1]+1, matrix[i-1][j]+1)
    }
  }
  return matrix[b.length][a.length]
}

interface BaseTask {
  id: number
  type: 'single' | 'multiple' | 'text' | 'number' | 'matching' | 'code'
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  hint?: string
  explanation: string
}
interface SingleTask extends BaseTask { type: 'single'; options: string[]; correctAnswer: number }
interface MultipleTask extends BaseTask { type: 'multiple'; options: string[]; correctAnswers: number[] }
interface TextTask extends BaseTask { type: 'text'; correctAnswers: string[] }
interface NumberTask extends BaseTask { type: 'number'; correctAnswer: number; tolerance?: number }
interface MatchingTask extends BaseTask { type: 'matching'; leftItems: string[]; rightItems: string[]; correctPairs: [number, number][] }
interface CodeTask extends BaseTask { 
  type: 'code'
  language: string
  starterCode?: string
  testCases?: { input: string; expected: string }[]
  solution?: string
}
type Task = SingleTask | MultipleTask | TextTask | NumberTask | MatchingTask | CodeTask

export type TaskResult = 'pending' | 'correct' | 'wrong'

interface SavedAnswer {
  type: string
  value: any
  isCorrect: boolean
}

interface StepikTaskProps {
  task: Task
  taskNumber: number
  totalTasks: number
  onAnswer: (isCorrect: boolean, answer: SavedAnswer) => void
  onNext: () => void
  onPrev?: () => void
  onGoToTheory?: () => void
  onGoToTask?: (index: number) => void
  canGoPrev?: boolean
  taskResults?: TaskResult[]
  theoryContent?: string
  savedAnswer?: SavedAnswer // Сохранённый ответ для отображения результата
  lessonId?: string // For manual difficulty override
  onDifficultyOverride?: (taskId: number, newDifficulty: 'easy' | 'medium' | 'hard') => void
}


export function StepikTask({ 
  task, taskNumber, totalTasks, onAnswer, onNext, onPrev, onGoToTheory, onGoToTask, 
  canGoPrev = true, taskResults = [], theoryContent = '', savedAnswer, lessonId, onDifficultyOverride
}: StepikTaskProps) {
  // Инициализируем из сохранённого ответа если есть
  const [selectedSingle, setSelectedSingle] = useState<number | null>(
    savedAnswer?.type === 'single' ? savedAnswer.value : null
  )
  const [selectedMultiple, setSelectedMultiple] = useState<number[]>(
    savedAnswer?.type === 'multiple' ? savedAnswer.value : []
  )
  const [textAnswer, setTextAnswer] = useState(
    savedAnswer?.type === 'text' ? String(savedAnswer.value) : ''
  )
  const [numberAnswer, setNumberAnswer] = useState(
    savedAnswer?.type === 'number' ? String(savedAnswer.value) : ''
  )
  const [codeAnswer, setCodeAnswer] = useState(
    savedAnswer?.type === 'code' ? savedAnswer.value : ((task as CodeTask).starterCode || '')
  )
  const [showSolution, setShowSolution] = useState(false)
  const [matchingPairs, setMatchingPairs] = useState<Map<number, number>>(
    savedAnswer?.type === 'matching' && Array.isArray(savedAnswer.value) 
      ? new Map(savedAnswer.value) 
      : new Map()
  )
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  
  // Если есть сохранённый ответ - показываем результат
  const [isSubmitted, setIsSubmitted] = useState(!!savedAnswer)
  const [isCorrect, setIsCorrect] = useState(savedAnswer?.isCorrect ?? false)
  const [showHint, setShowHint] = useState(false)
  const [attempts, setAttempts] = useState(savedAnswer ? 1 : 0)
  const [codeCheckLoading, setCodeCheckLoading] = useState(false)
  const [codeCheckResult, setCodeCheckResult] = useState<{ correct: boolean; feedback: string } | null>(null)
  
  const [showAIChat, setShowAIChat] = useState(false)
  const [aiQuestion, setAiQuestion] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiFeedback, setAiFeedback] = useState<{ feedback?: string; suggestion?: string } | null>(null)

  const difficultyColors = {
    easy: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    hard: 'bg-red-500/20 text-red-400 border-red-500/30'
  }
  const difficultyLabels = { easy: 'Лёгкое', medium: 'Среднее', hard: 'Сложное' }

  // Функция для безопасного парсинга JSON с валидацией
  const safeParseJSON = <T,>(content: string, validator: (obj: any) => obj is T): T | null => {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return null
      const parsed = JSON.parse(jsonMatch[0])
      return validator(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  // Валидатор для результата проверки кода
  const isCodeCheckResult = (obj: any): obj is { correct: boolean; feedback: string } => {
    return typeof obj === 'object' && typeof obj.correct === 'boolean' && typeof obj.feedback === 'string'
  }

  const checkCodeWithAI = async (retryCount = 0): Promise<boolean> => {
    const MAX_RETRIES = 2
    const codeTask = task as CodeTask
    const starterCode = codeTask.starterCode || ''
    const trimmedCode = codeAnswer.trim()
    
    // Проверка: код не пустой и отличается от стартового
    if (!trimmedCode || trimmedCode.length < 10) {
      setCodeCheckResult({ correct: false, feedback: 'Напишите код для решения задачи' })
      return false
    }
    
    // Если код совпадает со стартовым - не засчитываем
    if (trimmedCode === starterCode.trim() || trimmedCode === '// Начните писать код здесь') {
      setCodeCheckResult({ correct: false, feedback: 'Вы не написали решение. Напишите код.' })
      return false
    }
    
    setCodeCheckLoading(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
      
      // Используем специализированный endpoint вместо chat
      const res = await fetch('/api/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'code',
          question: task.question,
          userAnswer: codeAnswer,
          testCases: codeTask.testCases,
          solution: codeTask.solution,
          language: codeTask.language
        }),
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (res.ok) {
        const result = await res.json()
        if (typeof result.correct === 'boolean') {
          setCodeCheckResult({ correct: result.correct, feedback: result.feedback || '' })
          return result.correct === true
        }
      }
      
      // Retry если не удалось получить валидный ответ
      if (retryCount < MAX_RETRIES) {
        console.log(`[StepikTask] Code check retry ${retryCount + 1}/${MAX_RETRIES}`)
        return checkCodeWithAI(retryCount + 1)
      }
      
      // AI не ответил после всех попыток
      setCodeCheckResult({ correct: false, feedback: 'Не удалось проверить код. Попробуйте ещё раз.' })
      return false
    } catch (e: any) { 
      if (e.name === 'AbortError') {
        console.error('Code check timeout')
        if (retryCount < MAX_RETRIES) {
          return checkCodeWithAI(retryCount + 1)
        }
      }
      console.error('Code check failed:', e)
      setCodeCheckResult({ correct: false, feedback: 'Ошибка проверки. Попробуйте ещё раз.' })
      return false
    }
    finally { setCodeCheckLoading(false) }
  }

  // Список бессмысленных ответов
  const INVALID_ANSWERS = ['не знаю', 'незнаю', 'нз', 'хз', 'не помню', 'затрудняюсь', 'пропустить', 'skip', 'idk', 'без понятия', 'фиг знает']

  // AI-проверка текстового ответа
  const checkTextWithAI = async (userAnswer: string, correctAnswers: string[]): Promise<{ correct: boolean; feedback?: string; suggestion?: string }> => {
    const trimmedAnswer = userAnswer.trim()
    const correctAnswer = correctAnswers[0] || ''
    
    // 1. Пустой ответ
    if (trimmedAnswer.length === 0) {
      return { correct: false, feedback: "Введите ответ", suggestion: "" }
    }
    
    // 2. Бессмысленный ответ ("не знаю" и т.д.)
    const normalized = trimmedAnswer.toLowerCase()
    if (INVALID_ANSWERS.some(inv => normalized === inv)) {
      return { correct: false, feedback: "Неправильно", suggestion: "Попробуйте ответить на вопрос" }
    }
    
    // 3. Рандомные буквы
    if (/^[бвгджзклмнпрстфхцчшщ\s]+$/i.test(normalized) || /^(.)\1{3,}$/.test(normalized)) {
      return { correct: false, feedback: "Неправильно", suggestion: "" }
    }
    
    // 4. Слишком короткий (меньше 3 символов)
    if (trimmedAnswer.length < 3) {
      return { correct: false, feedback: "Ответ слишком короткий", suggestion: "" }
    }

    // 5. Отправляем на сервер для AI проверки по смыслу
    try {
      const res = await fetch('/api/check-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'text',
          question: task.question,
          userAnswer: trimmedAnswer,
          correctAnswer: correctAnswer
        })
      })
      
      if (res.ok) {
        const result = await res.json()
        return {
          correct: result.correct === true,
          feedback: result.feedback || (result.correct ? "Правильно!" : "Неправильно"),
          suggestion: result.suggestion || ""
        }
      }
    } catch (e) {
      console.error('AI check failed:', e)
    }
    
    // Fallback: проверка ключевых слов
    if (correctAnswer) {
      const norm = (s: string) => s.toLowerCase().replace(/[.,!?;:'"()\-–—]/g, '').trim()
      const userWords = norm(trimmedAnswer).split(/\s+/).filter(w => w.length > 3)
      const ansWords = norm(correctAnswer).split(/\s+/).filter(w => w.length > 3)
      
      let matches = 0
      for (const aw of ansWords) {
        if (userWords.some(uw => uw.includes(aw) || aw.includes(uw))) matches++
      }
      
      if (matches >= 2 || (ansWords.length > 0 && matches / ansWords.length >= 0.3)) {
        return { correct: true, feedback: "Правильно!", suggestion: "" }
      }
    }
    
    return { 
      correct: false, 
      feedback: "Неправильно", 
      suggestion: correctAnswer ? `Правильный ответ: ${correctAnswer.slice(0, 150)}` : '' 
    }
  }

  const checkAnswer = useCallback(async () => {
    if (isSubmitted || isProcessing) return
    setIsProcessing(true)
    
    let correct = false
    let aiResult: { correct: boolean; feedback?: string; suggestion?: string } | null = null
    
    switch (task.type) {
      case 'single': {
        const correctIdx = typeof task.correctAnswer === 'string' ? parseInt(task.correctAnswer, 10) : task.correctAnswer
        correct = selectedSingle === correctIdx
        break
      }
      case 'multiple': {
        const correctArr = (task.correctAnswers || []).map(v => typeof v === 'string' ? parseInt(v, 10) : v)
        const options = (task as MultipleTask).options || []
        
        // Сначала проверяем по индексам
        const basicMatch = selectedMultiple.length === correctArr.length && 
          selectedMultiple.every(i => correctArr.includes(i))
        
        if (basicMatch) {
          correct = true
        } else {
          // Если не совпало - проверяем через AI по смыслу
          const selectedOptions = selectedMultiple.map(i => options[i]).filter(Boolean)
          const correctOptions = correctArr.map(i => options[i]).filter(Boolean)
          
          console.log('[DEBUG] Multiple check - Selected:', selectedOptions)
          console.log('[DEBUG] Multiple check - Correct by index:', correctOptions)
          
          try {
            const res = await fetch('/api/check-answer', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'multiple',
                question: task.question,
                userAnswer: selectedOptions,
                correctAnswer: correctOptions,
                allOptions: options
              })
            })
            
            if (res.ok) {
              const result = await res.json()
              correct = result.correct === true
              if (result.feedback) {
                aiResult = { correct, feedback: result.feedback, suggestion: result.suggestion }
              }
            }
          } catch (e) {
            console.error('AI multiple check failed:', e)
            // Fallback: если AI недоступен, проверяем есть ли хотя бы частичное совпадение
            const matchCount = selectedMultiple.filter(i => correctArr.includes(i)).length
            correct = matchCount >= Math.ceil(correctArr.length * 0.7) // 70% правильных
          }
        }
        break
      }
      case 'text': {
        // Поддержка обоих форматов: correctAnswers (массив) и correctAnswer (строка)
        let answers: string[] = []
        if (task.correctAnswers && Array.isArray(task.correctAnswers)) {
          answers = task.correctAnswers.map(a => String(a))
        } else if ((task as any).correctAnswer) {
          answers = [String((task as any).correctAnswer)]
        }
        
        console.log('[DEBUG] Text check - User answer:', textAnswer)
        console.log('[DEBUG] Text check - Correct answers:', answers)
        
        if (answers.length > 0 && textAnswer.trim()) {
          console.log('[DEBUG] Starting AI text check...')
          aiResult = await checkTextWithAI(textAnswer, answers)
          console.log('[DEBUG] AI result:', aiResult)
          correct = aiResult.correct
        } else {
          // Если нет правильного ответа - используем AI для оценки
          console.log('[DEBUG] No correct answers, using AI evaluation')
          aiResult = await checkTextWithAI(textAnswer, [task.question])
          correct = aiResult.correct
        }
        break
      }
      case 'number': {
        const userNum = parseFloat(numberAnswer)
        const correctNum = typeof task.correctAnswer === 'string' ? parseFloat(task.correctAnswer) : task.correctAnswer
        const tol = task.tolerance ?? (Number.isInteger(correctNum) ? 0 : 0.01)
        correct = !isNaN(userNum) && !isNaN(correctNum) && Math.abs(userNum - correctNum) <= tol
        break
      }
      case 'matching': {
        const pairs = task.correctPairs || []
        correct = pairs.length > 0 && pairs.every(([l, r]) => matchingPairs.get(l) === r)
        break
      }
      case 'code': {
        correct = await checkCodeWithAI()
        break
      }
    }
    
    setIsCorrect(correct)
    setIsSubmitted(true)
    setIsProcessing(false)
    setAttempts(prev => prev + 1)
    
    // Сохраняем результат AI анализа для отображения
    if (aiResult && (aiResult.feedback || aiResult.suggestion)) {
      setAiFeedback(aiResult)
    }
    
    // Сохраняем ответ для отображения при возврате
    const answerToSave: SavedAnswer = {
      type: task.type,
      value: task.type === 'single' ? selectedSingle
        : task.type === 'multiple' ? selectedMultiple
        : task.type === 'text' ? textAnswer
        : task.type === 'number' ? numberAnswer
        : task.type === 'matching' ? Array.from(matchingPairs.entries())
        : codeAnswer,
      isCorrect: correct
    }
    onAnswer(correct, answerToSave)
  }, [task, selectedSingle, selectedMultiple, textAnswer, numberAnswer, matchingPairs, codeAnswer, isSubmitted, isProcessing, onAnswer])

  const handleRetry = () => {
    setIsSubmitted(false)
    setIsProcessing(false)
    setSelectedSingle(null)
    setSelectedMultiple([])
    setTextAnswer('')
    setNumberAnswer('')
    setCodeAnswer((task as CodeTask).starterCode || '')
    setShowSolution(false)
    setMatchingPairs(new Map())
    setSelectedLeft(null)
    setCodeCheckResult(null)
    setAiFeedback(null)
  }

  const askAI = async () => {
    if (!aiQuestion.trim() && !isSubmitted) return
    setAiLoading(true)
    setAiResponse('') // Очищаем предыдущий ответ
    try {
      const prompt = aiQuestion.trim() || 'Объясни почему мой ответ неправильный и как решить это задание'
      const contextInfo = theoryContent ? `\n\nТеория по теме:\n${theoryContent.slice(0, 2000)}` : ''
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: `Задание: ${task.question}${contextInfo}\n\nМой вопрос: ${prompt}`,
          systemPrompt: 'Ты AI-репетитор. Помогай студенту понять материал, объясняй простым языком, давай подсказки но не решай за него.'
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (res.ok) {
        const data = await res.json()
        setAiResponse(data.aiMessage?.content || 'Не удалось получить ответ')
      } else {
        setAiResponse('Ошибка сервера. Попробуйте ещё раз.')
      }
    } catch (e: any) { 
      if (e.name === 'AbortError') {
        setAiResponse('Превышено время ожидания. Попробуйте ещё раз.')
      } else {
        setAiResponse('Ошибка соединения. Проверьте интернет и попробуйте ещё раз.')
      }
    }
    finally { setAiLoading(false); setAiQuestion('') }
  }

  const toggleMultiple = (idx: number) => setSelectedMultiple(prev => 
    prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
  
  const handleDragStart = (idx: number) => setDraggedItem(idx)
  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (rightIdx: number) => {
    if (draggedItem !== null) {
      setMatchingPairs(prev => new Map(prev).set(draggedItem, rightIdx))
      setDraggedItem(null)
    }
  }
  const handleMatchingClick = (side: 'left' | 'right', idx: number) => {
    if (side === 'left') setSelectedLeft(idx)
    else if (selectedLeft !== null) { 
      setMatchingPairs(prev => new Map(prev).set(selectedLeft, idx))
      setSelectedLeft(null) 
    }
  }

  const canSubmit = useMemo(() => {
    switch (task.type) {
      case 'single': return selectedSingle !== null
      case 'multiple': return selectedMultiple.length > 0
      case 'text': return textAnswer.trim().length > 0
      case 'number': return numberAnswer.trim().length > 0
      case 'matching': return matchingPairs.size === ((task as MatchingTask).leftItems?.length || 0)
      case 'code': return codeAnswer.trim().length > 10
      default: return false
    }
  }, [task.type, selectedSingle, selectedMultiple, textAnswer, numberAnswer, matchingPairs, codeAnswer])


  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
      {/* Task Navigation Panel */}
      {totalTasks > 1 && (
        <div className="bg-slate-900/70 px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-slate-400 mr-2">Задания:</span>
            {Array.from({ length: totalTasks }, (_, idx) => {
              const result = taskResults[idx] || 'pending'
              const isCurrent = idx === taskNumber - 1
              return (
                <button key={idx} onClick={() => onGoToTask?.(idx)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                    isCurrent ? 'bg-primary-500 text-white ring-2 ring-primary-400' 
                      : result === 'correct' ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                      : result === 'wrong' ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                      : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}>{idx + 1}</button>
              )
            })}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-slate-900/50 px-4 sm:px-6 py-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-white">Задание {taskNumber}/{totalTasks}</span>
            <Badge className={difficultyColors[task.difficulty || 'easy']}>{difficultyLabels[task.difficulty || 'easy']}</Badge>
            {attempts > 0 && <span className="text-xs text-slate-400">Попытка {attempts}</span>}
          </div>
          <div className="flex items-center gap-2">
            {onGoToTheory && <button onClick={onGoToTheory} className="text-xs text-slate-400 hover:text-primary-400 transition-colors">← К теории</button>}
            {task.hint && !isSubmitted && (
              <button onClick={() => setShowHint(!showHint)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-amber-400 transition-colors">
                <Lightbulb className="w-4 h-4" />
              </button>
            )}
            <button onClick={() => setShowAIChat(!showAIChat)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-primary-400 transition-colors">
              <MessageCircle className="w-4 h-4" /><span className="hidden sm:inline">AI помощь</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hint */}
      {showHint && task.hint && !isSubmitted && (
        <div className="mx-4 sm:mx-6 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-amber-200 text-sm">{task.hint}</p>
          </div>
        </div>
      )}

      {/* AI Chat Panel */}
      {showAIChat && (
        <div className="mx-4 sm:mx-6 mt-4 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-primary-400" />
            <span className="text-primary-400 font-medium">AI Репетитор</span>
          </div>
          {aiResponse && <div className="mb-3 p-3 bg-slate-800/50 rounded-lg text-slate-200 text-sm whitespace-pre-wrap">{aiResponse}</div>}
          <div className="flex gap-2">
            <input type="text" value={aiQuestion} onChange={(e) => setAiQuestion(e.target.value)}
              placeholder={isSubmitted && !isCorrect ? "Спроси почему неправильно..." : "Задай вопрос по заданию..."}
              className="flex-1 p-2 rounded-lg bg-slate-900/50 border border-slate-700 text-white text-sm placeholder:text-slate-500"
              onKeyDown={(e) => e.key === 'Enter' && askAI()} />
            <Button onClick={askAI} disabled={aiLoading} className="px-3">
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Спросить'}
            </Button>
          </div>
          {isSubmitted && !isCorrect && (
            <button onClick={() => { setAiQuestion(''); askAI() }} className="mt-2 text-xs text-primary-400 hover:underline">
              Объясни почему неправильно
            </button>
          )}
        </div>
      )}

      {/* Question with LaTeX support */}
      <div className="p-4 sm:p-6">
        <div className="text-white text-lg mb-6 leading-relaxed prose prose-invert max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkMath]}
            rehypePlugins={[[rehypeKatex, { throwOnError: false, output: 'htmlAndMathml' }]]}
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '')
                const isInline = !match && !String(children).includes('\n')
                return isInline ? (
                  <code className="bg-slate-700 px-1.5 py-0.5 rounded text-primary-400 text-sm" {...props}>
                    {children}
                  </code>
                ) : (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match ? match[1] : 'text'}
                    PreTag="div"
                    className="rounded-lg my-3 text-sm"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                )
              },
              p({ children }) {
                return <p className="mb-2">{children}</p>
              }
            }}
          >
            {task.question}
          </ReactMarkdown>
        </div>

        {/* Single choice with LaTeX */}
        {task.type === 'single' && (task as SingleTask).options && (
          <div className="space-y-3">
            {(task as SingleTask).options.map((option, idx) => {
              const correctIdx = typeof (task as SingleTask).correctAnswer === 'string' 
                ? parseInt((task as SingleTask).correctAnswer as any, 10) : (task as SingleTask).correctAnswer
              return (
                <button key={idx} onClick={() => !isSubmitted && setSelectedSingle(idx)} disabled={isSubmitted}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    isSubmitted ? idx === correctIdx ? 'border-green-500 bg-green-500/10' 
                      : idx === selectedSingle ? 'border-red-500 bg-red-500/10' : 'border-slate-700 bg-slate-800/30'
                      : selectedSingle === idx ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSubmitted ? idx === correctIdx ? 'border-green-500 bg-green-500' 
                        : idx === selectedSingle ? 'border-red-500 bg-red-500' : 'border-slate-600'
                        : selectedSingle === idx ? 'border-primary-500 bg-primary-500' : 'border-slate-600'
                    }`}>
                      {isSubmitted && idx === correctIdx && <Check className="w-4 h-4 text-white" />}
                      {isSubmitted && idx === selectedSingle && idx !== correctIdx && <X className="w-4 h-4 text-white" />}
                    </div>
                    <div className="text-slate-200 flex-1">
                      <MathText>{option}</MathText>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Multiple choice with LaTeX */}
        {task.type === 'multiple' && (task as MultipleTask).options && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400 mb-2">Выберите все правильные варианты</p>
            {(task as MultipleTask).options.map((option, idx) => {
              const correctArr = ((task as MultipleTask).correctAnswers || []).map(v => typeof v === 'string' ? parseInt(v as any, 10) : v)
              const isCorrectByKey = correctArr.includes(idx)
              const isSel = selectedMultiple.includes(idx)
              const showAsCorrect = isSubmitted && isCorrect && isSel
              const showAsWrong = isSubmitted && !isCorrect && isSel && !isCorrectByKey
              const showAsCorrectByKey = isSubmitted && !isCorrect && isCorrectByKey
              return (
                <button key={idx} onClick={() => !isSubmitted && toggleMultiple(idx)} disabled={isSubmitted}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    isSubmitted 
                      ? showAsCorrect ? 'border-green-500 bg-green-500/10'
                      : showAsCorrectByKey ? 'border-green-500 bg-green-500/10'
                      : showAsWrong ? 'border-red-500 bg-red-500/10' 
                      : isSel ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-slate-700 bg-slate-800/30'
                      : isSel ? 'border-primary-500 bg-primary-500/10' : 'border-slate-700 bg-slate-800/30 hover:border-slate-600'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      isSubmitted 
                        ? showAsCorrect ? 'border-green-500 bg-green-500'
                        : showAsCorrectByKey ? 'border-green-500 bg-green-500'
                        : showAsWrong ? 'border-red-500 bg-red-500' 
                        : isSel ? 'border-yellow-500 bg-yellow-500'
                        : 'border-slate-600'
                        : isSel ? 'border-primary-500 bg-primary-500' : 'border-slate-600'
                    }`}>
                      {(isSubmitted ? (showAsCorrect || showAsCorrectByKey || isSel) : isSel) && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div className="text-slate-200 flex-1">
                      <MathText>{option}</MathText>
                    </div>
                  </div>
                </button>
              )
            })}
            {/* AI Feedback для множественного выбора */}
            {isSubmitted && aiFeedback && (
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    {aiFeedback.feedback && (
                      <p className="text-blue-200 text-sm mb-2">{aiFeedback.feedback}</p>
                    )}
                    {aiFeedback.suggestion && (
                      <p className="text-blue-300 text-sm">
                        <span className="font-medium">💡</span> {aiFeedback.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text input */}
        {task.type === 'text' && (
          <div>
            <input type="text" value={textAnswer} onChange={(e) => setTextAnswer(e.target.value)} disabled={isSubmitted}
              placeholder="Введите ваш ответ..."
              className={`w-full p-4 rounded-xl border-2 bg-slate-900/50 text-white placeholder:text-slate-500 focus:outline-none ${
                isSubmitted ? isCorrect ? 'border-green-500' : 'border-red-500' : 'border-slate-700 focus:border-primary-500'
              }`} />
            
            {/* AI Feedback для текстовых ответов */}
            {isSubmitted && aiFeedback && (
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <MessageCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    {aiFeedback.feedback && (
                      <p className="text-blue-200 text-sm mb-2">{aiFeedback.feedback}</p>
                    )}
                    {aiFeedback.suggestion && (
                      <p className="text-blue-300 text-sm">
                        <span className="font-medium">💡 Рекомендация:</span> {aiFeedback.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {isSubmitted && !isCorrect && !aiFeedback && (
              <p className="mt-2 text-sm text-slate-400">Правильный ответ: <span className="text-green-400">{(task as TextTask).correctAnswers?.[0] || (task as any).correctAnswer || 'Нет эталонного ответа'}</span></p>
            )}
          </div>
        )}

        {/* Number input */}
        {task.type === 'number' && (
          <div>
            <input type="number" value={numberAnswer} onChange={(e) => setNumberAnswer(e.target.value)} disabled={isSubmitted}
              placeholder="Введите число..."
              className={`w-full p-4 rounded-xl border-2 bg-slate-900/50 text-white placeholder:text-slate-500 focus:outline-none ${
                isSubmitted ? isCorrect ? 'border-green-500' : 'border-red-500' : 'border-slate-700 focus:border-primary-500'
              }`} />
            {isSubmitted && !isCorrect && (
              <p className="mt-2 text-sm text-slate-400">Правильный ответ: <span className="text-green-400">{(task as NumberTask).correctAnswer}</span></p>
            )}
          </div>
        )}


        {/* Matching with Drag & Drop and LaTeX */}
        {task.type === 'matching' && (task as MatchingTask).leftItems && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">Перетащите или кликните для соединения</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                {(task as MatchingTask).leftItems.map((item, idx) => (
                  <div key={idx} draggable={!isSubmitted} onDragStart={() => handleDragStart(idx)}
                    onClick={() => !isSubmitted && handleMatchingClick('left', idx)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-2 ${
                      selectedLeft === idx ? 'border-primary-500 bg-primary-500/10' 
                        : matchingPairs.has(idx) ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 hover:border-slate-600'
                    }`}>
                    <GripVertical className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <div className="text-slate-200 flex-1"><MathText>{item}</MathText></div>
                    {matchingPairs.has(idx) && <span className="text-xs text-green-400 flex-shrink-0">→</span>}
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {(task as MatchingTask).rightItems?.map((item, idx) => (
                  <div key={idx} onDragOver={handleDragOver} onDrop={() => handleDrop(idx)}
                    onClick={() => !isSubmitted && handleMatchingClick('right', idx)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedLeft !== null ? 'border-primary-500/50 bg-primary-500/5 cursor-pointer' : 'border-slate-700'
                    }`}>
                    <div className="text-slate-200"><MathText>{item}</MathText></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Code editor */}
        {task.type === 'code' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{(task as CodeTask).language?.toUpperCase() || 'CODE'}</Badge>
              {(task as CodeTask).testCases && (task as CodeTask).testCases!.length > 0 && (
                <span className="text-xs text-slate-400">{(task as CodeTask).testCases!.length} тест-кейсов</span>
              )}
            </div>
            <textarea value={codeAnswer} onChange={(e) => setCodeAnswer(e.target.value)} disabled={isSubmitted}
              placeholder="// Напишите ваш код здесь..."
              className={`w-full h-64 p-4 rounded-xl border-2 bg-slate-900 text-green-400 font-mono text-sm placeholder:text-slate-600 focus:outline-none resize-none ${
                isSubmitted ? isCorrect ? 'border-green-500' : 'border-red-500' : 'border-slate-700 focus:border-primary-500'
              }`} spellCheck={false} />
            {(task as CodeTask).testCases && (task as CodeTask).testCases!.length > 0 && (
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                <p className="text-xs text-slate-400 mb-2">Примеры тестов:</p>
                {(task as CodeTask).testCases!.slice(0, 3).map((tc, idx) => (
                  <div key={idx} className="text-xs font-mono mb-1">
                    <span className="text-slate-500">Вход:</span> <span className="text-blue-400">{tc.input}</span>
                    <span className="text-slate-500 ml-2">→</span> <span className="text-green-400">{tc.expected}</span>
                  </div>
                ))}
              </div>
            )}
            {codeCheckResult && (
              <div className={`p-3 rounded-lg border ${codeCheckResult.correct ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                <p className={`text-sm ${codeCheckResult.correct ? 'text-green-400' : 'text-red-400'}`}>{codeCheckResult.feedback}</p>
              </div>
            )}
            {isSubmitted && (task as CodeTask).solution && (
              <div>
                <button onClick={() => setShowSolution(!showSolution)} className="text-sm text-primary-400 hover:underline">
                  {showSolution ? 'Скрыть решение' : 'Показать решение'}
                </button>
                {showSolution && (
                  <pre className="mt-2 p-4 bg-slate-900 rounded-lg text-green-400 font-mono text-sm overflow-x-auto border border-green-500/30">
                    {(task as CodeTask).solution}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result & Explanation with LaTeX */}
      {isSubmitted && (
        <div className={`mx-4 sm:mx-6 mb-4 p-4 rounded-xl ${isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? <Check className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-red-400" />}
            <span className={`font-semibold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>{isCorrect ? 'Правильно!' : 'Неправильно'}</span>
          </div>
          <div className="text-slate-300 text-sm prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[[rehypeKatex, { throwOnError: false, output: 'htmlAndMathml' }]]}
            >
              {task.explanation}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 sm:px-6 pb-6">
        <div className="flex gap-2">
          {canGoPrev && taskNumber > 1 && onPrev && (
            <Button onClick={onPrev} variant="secondary" className="px-3"><ChevronLeft className="w-4 h-4" /></Button>
          )}
          <div className="flex-1">
            {!isSubmitted ? (
              <Button onClick={checkAnswer} disabled={!canSubmit || codeCheckLoading || isProcessing} className="w-full">
                {(codeCheckLoading || isProcessing) ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Проверка...</> : 'Проверить ответ'}
              </Button>
            ) : isCorrect ? (
              <Button onClick={onNext} className="w-full" rightIcon={<ChevronRight className="w-4 h-4" />}>
                {taskNumber < totalTasks ? 'Следующее задание' : 'Завершить практику'}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={handleRetry} variant="secondary" className="flex-1" leftIcon={<RotateCcw className="w-4 h-4" />}>Ещё раз</Button>
                <Button onClick={onNext} className="flex-1" rightIcon={<ChevronRight className="w-4 h-4" />}>Дальше</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
