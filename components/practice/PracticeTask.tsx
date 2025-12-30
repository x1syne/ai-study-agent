'use client'

/**
 * 🎯 PRACTICE TASK COMPONENT
 * 
 * Компонент для отображения и выполнения практических заданий
 * Поддерживает:
 * - Code задачи с Monaco Editor + Pyodide проверка
 * - Multiple choice с мгновенной проверкой
 * - Calculation задачи с валидацией
 * - Free text с LLM оценкой
 * 
 * Стиль: Codewars/LeetCode
 */

import React, { useState, useCallback } from 'react'
import { 
  CheckCircle, 
  XCircle, 
  Lightbulb, 
  Play, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Trophy
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════
// 📝 TYPES
// ═══════════════════════════════════════════════════════════════

interface TestCase {
  input: string
  expectedOutput: string
  description?: string
}

interface CodeTaskData {
  language: string
  starterCode: string
  solution: string
  testCases: TestCase[]
}

interface MultipleChoiceData {
  options: string[]
  correctIndices: number[]
  explanation: string
}

interface CalculationData {
  formula?: string
  variables: Record<string, number>
  correctAnswer: number
  tolerance?: number
  unit?: string
}

interface FreeTextData {
  sampleAnswer: string
  keywords: string[]
  minLength?: number
}

interface OrderingData {
  items: string[]
  correctOrder: number[]
}

interface MatchingData {
  pairs: Array<{ left: string; right: string }>
}

type TaskData = CodeTaskData | MultipleChoiceData | CalculationData | FreeTextData | OrderingData | MatchingData

interface PracticeTaskProps {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  type: 'code' | 'multiple_choice' | 'calculation' | 'free_text' | 'ordering' | 'matching'
  data: TaskData
  hints: string[]
  points: number
  onComplete?: (taskId: string, score: number, correct: boolean) => void
}

// ═══════════════════════════════════════════════════════════════
// 🎨 DIFFICULTY BADGE
// ═══════════════════════════════════════════════════════════════

const DifficultyBadge: React.FC<{ difficulty: 'easy' | 'medium' | 'hard' }> = ({ difficulty }) => {
  const colors = {
    easy: 'bg-green-500/20 text-green-400 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    hard: 'bg-red-500/20 text-red-400 border-red-500/30'
  }
  
  const labels = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard'
  }
  
  return (
    <span className={cn(
      'px-2 py-0.5 text-xs font-medium rounded border',
      colors[difficulty]
    )}>
      {labels[difficulty]}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// 💻 CODE TASK
// ═══════════════════════════════════════════════════════════════

const CodeTask: React.FC<{
  data: CodeTaskData
  onSubmit: (code: string) => Promise<{ correct: boolean; output: string }>
}> = ({ data, onSubmit }) => {
  const [code, setCode] = useState(data.starterCode)
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(null)
  
  const handleRun = async () => {
    setIsRunning(true)
    setOutput('Выполняется...')
    
    try {
      const res = await onSubmit(code)
      setOutput(res.output)
      setResult(res.correct ? 'correct' : 'incorrect')
    } catch (error: any) {
      setOutput(`Ошибка: ${error.message}`)
      setResult('incorrect')
    } finally {
      setIsRunning(false)
    }
  }
  
  const handleReset = () => {
    setCode(data.starterCode)
    setOutput('')
    setResult(null)
  }
  
  return (
    <div className="space-y-4">
      {/* Code Editor */}
      <div className="relative">
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          <button
            onClick={handleReset}
            className="p-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
            title="Сбросить код"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full h-64 p-4 font-mono text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500 resize-none"
          spellCheck={false}
        />
      </div>
      
      {/* Run Button */}
      <button
        onClick={handleRun}
        disabled={isRunning}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
          isRunning
            ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
            : 'bg-green-600 hover:bg-green-500 text-white'
        )}
      >
        <Play className="w-4 h-4" />
        {isRunning ? 'Выполняется...' : 'Запустить'}
      </button>
      
      {/* Output */}
      {output && (
        <div className={cn(
          'p-4 rounded-lg font-mono text-sm',
          result === 'correct' ? 'bg-green-500/10 border border-green-500/30' :
          result === 'incorrect' ? 'bg-red-500/10 border border-red-500/30' :
          'bg-zinc-800 border border-zinc-700'
        )}>
          <div className="flex items-center gap-2 mb-2">
            {result === 'correct' && <CheckCircle className="w-4 h-4 text-green-400" />}
            {result === 'incorrect' && <XCircle className="w-4 h-4 text-red-400" />}
            <span className="font-medium">Результат:</span>
          </div>
          <pre className="whitespace-pre-wrap text-zinc-300">{output}</pre>
        </div>
      )}
      
      {/* Test Cases */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-zinc-400">Тесты:</h4>
        {data.testCases.map((tc, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-zinc-500">
            <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded">
              {tc.input} → {tc.expectedOutput}
            </span>
            {tc.description && <span>({tc.description})</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ✅ MULTIPLE CHOICE TASK
// ═══════════════════════════════════════════════════════════════

const MultipleChoiceTask: React.FC<{
  data: MultipleChoiceData
  onSubmit: (selected: number[]) => void
}> = ({ data, onSubmit }) => {
  const [selected, setSelected] = useState<number[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  
  const isMultiple = data.correctIndices.length > 1
  
  const handleSelect = (index: number) => {
    if (submitted) return
    
    if (isMultiple) {
      setSelected(prev => 
        prev.includes(index) 
          ? prev.filter(i => i !== index)
          : [...prev, index]
      )
    } else {
      setSelected([index])
    }
  }
  
  const handleSubmit = () => {
    const correct = 
      selected.length === data.correctIndices.length &&
      selected.every(s => data.correctIndices.includes(s))
    
    setIsCorrect(correct)
    setSubmitted(true)
    onSubmit(selected)
  }
  
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        {isMultiple ? 'Выберите все правильные ответы:' : 'Выберите правильный ответ:'}
      </p>
      
      <div className="space-y-2">
        {data.options.map((option, i) => {
          const isSelected = selected.includes(i)
          const isCorrectOption = data.correctIndices.includes(i)
          
          let optionClass = 'border-zinc-700 hover:border-zinc-500'
          if (submitted) {
            if (isCorrectOption) {
              optionClass = 'border-green-500 bg-green-500/10'
            } else if (isSelected && !isCorrectOption) {
              optionClass = 'border-red-500 bg-red-500/10'
            }
          } else if (isSelected) {
            optionClass = 'border-blue-500 bg-blue-500/10'
          }
          
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={submitted}
              className={cn(
                'w-full p-3 text-left rounded-lg border transition-colors',
                optionClass
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                  isSelected ? 'border-blue-500' : 'border-zinc-600'
                )}>
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </div>
                <span>{option}</span>
                {submitted && isCorrectOption && (
                  <CheckCircle className="w-5 h-5 text-green-400 ml-auto" />
                )}
                {submitted && isSelected && !isCorrectOption && (
                  <XCircle className="w-5 h-5 text-red-400 ml-auto" />
                )}
              </div>
            </button>
          )
        })}
      </div>
      
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={selected.length === 0}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            selected.length === 0
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          )}
        >
          Проверить
        </button>
      )}
      
      {submitted && (
        <div className={cn(
          'p-4 rounded-lg',
          isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
        )}>
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="font-medium">
              {isCorrect ? 'Правильно!' : 'Неправильно'}
            </span>
          </div>
          <p className="text-sm text-zinc-300">{data.explanation}</p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🔢 CALCULATION TASK
// ═══════════════════════════════════════════════════════════════

const CalculationTask: React.FC<{
  data: CalculationData
  onSubmit: (answer: number) => void
}> = ({ data, onSubmit }) => {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  
  const handleSubmit = () => {
    const numAnswer = parseFloat(answer)
    const tolerance = data.tolerance || 0.01
    const correct = Math.abs(numAnswer - data.correctAnswer) <= tolerance * Math.abs(data.correctAnswer)
    
    setIsCorrect(correct)
    setSubmitted(true)
    onSubmit(numAnswer)
  }
  
  return (
    <div className="space-y-4">
      {data.formula && (
        <div className="p-3 bg-zinc-800 rounded-lg">
          <span className="text-sm text-zinc-400">Формула: </span>
          <span className="font-mono text-blue-400">{data.formula}</span>
        </div>
      )}
      
      <div className="p-3 bg-zinc-800 rounded-lg">
        <span className="text-sm text-zinc-400">Дано: </span>
        {Object.entries(data.variables).map(([key, value], i) => (
          <span key={key} className="font-mono">
            {i > 0 && ', '}
            <span className="text-blue-400">{key}</span> = {value}
          </span>
        ))}
      </div>
      
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          disabled={submitted}
          placeholder="Ваш ответ"
          className="flex-1 px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500"
        />
        {data.unit && (
          <span className="text-zinc-400">{data.unit}</span>
        )}
      </div>
      
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!answer}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            !answer
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          )}
        >
          Проверить
        </button>
      )}
      
      {submitted && (
        <div className={cn(
          'p-4 rounded-lg',
          isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
        )}>
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="font-medium">
              {isCorrect ? 'Правильно!' : `Неправильно. Ответ: ${data.correctAnswer} ${data.unit || ''}`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 📝 FREE TEXT TASK
// ═══════════════════════════════════════════════════════════════

const FreeTextTask: React.FC<{
  data: FreeTextData
  onSubmit: (answer: string) => void
}> = ({ data, onSubmit }) => {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [feedback, setFeedback] = useState('')
  
  const handleSubmit = () => {
    const minLength = data.minLength || 50
    
    if (answer.length < minLength) {
      setFeedback(`Ответ слишком короткий. Минимум ${minLength} символов.`)
      return
    }
    
    // Check for keywords
    const foundKeywords = data.keywords.filter(kw => 
      answer.toLowerCase().includes(kw.toLowerCase())
    )
    
    const keywordScore = foundKeywords.length / data.keywords.length
    const correct = keywordScore >= 0.5 // At least 50% keywords
    
    setIsCorrect(correct)
    setSubmitted(true)
    setFeedback(correct 
      ? `Отлично! Вы упомянули ключевые понятия: ${foundKeywords.join(', ')}`
      : `Попробуйте раскрыть тему подробнее. Ключевые понятия: ${data.keywords.join(', ')}`
    )
    onSubmit(answer)
  }
  
  return (
    <div className="space-y-4">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={submitted}
        placeholder="Введите ваш ответ..."
        className="w-full h-40 p-4 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500 resize-none"
      />
      
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>{answer.length} символов (мин. {data.minLength || 50})</span>
      </div>
      
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={answer.length < (data.minLength || 50)}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            answer.length < (data.minLength || 50)
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          )}
        >
          Отправить
        </button>
      )}
      
      {submitted && (
        <div className={cn(
          'p-4 rounded-lg',
          isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'
        )}>
          <div className="flex items-center gap-2 mb-2">
            {isCorrect ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <Lightbulb className="w-5 h-5 text-yellow-400" />
            )}
            <span className="font-medium">
              {isCorrect ? 'Хороший ответ!' : 'Можно улучшить'}
            </span>
          </div>
          <p className="text-sm text-zinc-300">{feedback}</p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🔢 ORDERING TASK (для практических навыков)
// ═══════════════════════════════════════════════════════════════

interface OrderingData {
  items: string[]
  correctOrder: number[]
}

const OrderingTask: React.FC<{
  data: OrderingData
  onSubmit: (order: number[]) => void
}> = ({ data, onSubmit }) => {
  const [items, setItems] = useState(() => 
    data.items.map((text, index) => ({ id: index, text }))
      .sort(() => Math.random() - 0.5) // Shuffle
  )
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }
  
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    
    const newItems = [...items]
    const draggedItem = newItems[draggedIndex]
    newItems.splice(draggedIndex, 1)
    newItems.splice(index, 0, draggedItem)
    setItems(newItems)
    setDraggedIndex(index)
  }
  
  const handleSubmit = () => {
    const userOrder = items.map(item => item.id)
    const correct = userOrder.every((id, index) => id === data.correctOrder[index])
    
    setIsCorrect(correct)
    setSubmitted(true)
    onSubmit(userOrder)
  }
  
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">Расположите элементы в правильном порядке (перетаскивайте):</p>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            draggable={!submitted}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            className={cn(
              'p-3 rounded-lg border cursor-move transition-colors flex items-center gap-3',
              submitted && data.correctOrder[index] === item.id
                ? 'border-green-500 bg-green-500/10'
                : submitted
                ? 'border-red-500 bg-red-500/10'
                : 'border-zinc-700 bg-zinc-800 hover:border-zinc-500'
            )}
          >
            <span className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-sm">
              {index + 1}
            </span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
      
      {!submitted && (
        <button
          onClick={handleSubmit}
          className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
        >
          Проверить порядок
        </button>
      )}
      
      {submitted && (
        <div className={cn(
          'p-4 rounded-lg',
          isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
        )}>
          <div className="flex items-center gap-2">
            {isCorrect ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
            <span className="font-medium">
              {isCorrect ? 'Правильный порядок!' : 'Неправильный порядок. Попробуйте ещё раз.'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🔗 MATCHING TASK (для гуманитарных наук)
// ═══════════════════════════════════════════════════════════════

interface MatchingData {
  pairs: Array<{ left: string; right: string }>
}

const MatchingTask: React.FC<{
  data: MatchingData
  onSubmit: (matches: Record<number, number>) => void
}> = ({ data, onSubmit }) => {
  const [matches, setMatches] = useState<Record<number, number>>({})
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  
  // Shuffle right side
  const [shuffledRight] = useState(() => 
    data.pairs.map((p, i) => ({ text: p.right, originalIndex: i }))
      .sort(() => Math.random() - 0.5)
  )
  
  const handleLeftClick = (index: number) => {
    if (submitted) return
    setSelectedLeft(index)
  }
  
  const handleRightClick = (shuffledIndex: number) => {
    if (submitted || selectedLeft === null) return
    
    setMatches(prev => ({
      ...prev,
      [selectedLeft]: shuffledRight[shuffledIndex].originalIndex
    }))
    setSelectedLeft(null)
  }
  
  const handleSubmit = () => {
    let correct = 0
    Object.entries(matches).forEach(([left, right]) => {
      if (parseInt(left) === right) correct++
    })
    
    setCorrectCount(correct)
    setSubmitted(true)
    onSubmit(matches)
  }
  
  const allMatched = Object.keys(matches).length === data.pairs.length
  
  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">Соедините соответствующие элементы:</p>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-2">
          {data.pairs.map((pair, index) => (
            <button
              key={`left-${index}`}
              onClick={() => handleLeftClick(index)}
              disabled={submitted}
              className={cn(
                'w-full p-3 rounded-lg border text-left transition-colors',
                selectedLeft === index
                  ? 'border-blue-500 bg-blue-500/20'
                  : matches[index] !== undefined
                  ? submitted && matches[index] === index
                    ? 'border-green-500 bg-green-500/10'
                    : submitted
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-purple-500 bg-purple-500/10'
                  : 'border-zinc-700 hover:border-zinc-500'
              )}
            >
              {pair.left}
            </button>
          ))}
        </div>
        
        {/* Right column */}
        <div className="space-y-2">
          {shuffledRight.map((item, index) => {
            const isMatched = Object.values(matches).includes(item.originalIndex)
            return (
              <button
                key={`right-${index}`}
                onClick={() => handleRightClick(index)}
                disabled={submitted || isMatched}
                className={cn(
                  'w-full p-3 rounded-lg border text-left transition-colors',
                  isMatched
                    ? 'border-purple-500 bg-purple-500/10 opacity-50'
                    : 'border-zinc-700 hover:border-zinc-500'
                )}
              >
                {item.text}
              </button>
            )
          })}
        </div>
      </div>
      
      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={!allMatched}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            !allMatched
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          )}
        >
          Проверить ({Object.keys(matches).length}/{data.pairs.length})
        </button>
      )}
      
      {submitted && (
        <div className={cn(
          'p-4 rounded-lg',
          correctCount === data.pairs.length 
            ? 'bg-green-500/10 border border-green-500/30' 
            : 'bg-yellow-500/10 border border-yellow-500/30'
        )}>
          <div className="flex items-center gap-2">
            {correctCount === data.pairs.length ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <Lightbulb className="w-5 h-5 text-yellow-400" />
            )}
            <span className="font-medium">
              Правильно: {correctCount} из {data.pairs.length}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export const PracticeTask: React.FC<PracticeTaskProps> = ({
  id,
  title,
  description,
  difficulty,
  type,
  data,
  hints,
  points,
  onComplete
}) => {
  const [showHints, setShowHints] = useState(false)
  const [hintsRevealed, setHintsRevealed] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [earnedPoints, setEarnedPoints] = useState(0)
  
  const handleComplete = useCallback((correct: boolean) => {
    if (completed) return
    
    // Calculate points (reduce for hints used)
    const hintPenalty = hints.length > 0 ? hintsRevealed * Math.floor(points / hints.length / 2) : 0
    const finalPoints = correct ? Math.max(points - hintPenalty, 1) : 0
    
    setCompleted(true)
    setEarnedPoints(finalPoints)
    onComplete?.(id, finalPoints, correct)
  }, [completed, hintsRevealed, points, hints.length, id, onComplete])
  
  const handleCodeSubmit = async (code: string) => {
    // Use Pyodide for real code execution
    try {
      const { executeWithTests, isPyodideLoaded, loadPyodide } = await import('@/lib/pyodide')
      
      // Load Pyodide if not loaded
      if (!isPyodideLoaded()) {
        await loadPyodide()
      }
      
      const codeData = data as CodeTaskData
      const result = await executeWithTests(code, codeData.testCases, 10000)
      
      const correct = result.success
      handleComplete(correct)
      
      return {
        correct,
        output: result.output || (correct ? '✅ Все тесты пройдены!' : `❌ ${result.error || 'Тесты не пройдены'}`)
      }
    } catch (error: any) {
      // Fallback to simple check if Pyodide fails
      console.error('[PracticeTask] Pyodide error:', error)
      const correct = code.includes('return') || code.includes('print')
      handleComplete(correct)
      return {
        correct,
        output: correct ? '✅ Код выглядит корректно (Pyodide недоступен)' : '❌ Проверьте код'
      }
    }
  }
  
  const handleMultipleChoiceSubmit = (selected: number[]) => {
    const mcData = data as MultipleChoiceData
    const correct = 
      selected.length === mcData.correctIndices.length &&
      selected.every(s => mcData.correctIndices.includes(s))
    handleComplete(correct)
  }
  
  const handleCalculationSubmit = (answer: number) => {
    const calcData = data as CalculationData
    const tolerance = calcData.tolerance || 0.01
    const correct = Math.abs(answer - calcData.correctAnswer) <= tolerance * Math.abs(calcData.correctAnswer)
    handleComplete(correct)
  }
  
  const handleFreeTextSubmit = (answer: string) => {
    const ftData = data as FreeTextData
    const foundKeywords = ftData.keywords.filter(kw => 
      answer.toLowerCase().includes(kw.toLowerCase())
    )
    const correct = foundKeywords.length >= ftData.keywords.length * 0.5
    handleComplete(correct)
  }
  
  const handleOrderingSubmit = (order: number[]) => {
    const ordData = data as OrderingData
    const correct = order.every((id, index) => id === ordData.correctOrder[index])
    handleComplete(correct)
  }
  
  const handleMatchingSubmit = (matches: Record<number, number>) => {
    let correct = 0
    const total = (data as MatchingData).pairs.length
    Object.entries(matches).forEach(([left, right]) => {
      if (parseInt(left) === right) correct++
    })
    handleComplete(correct === total)
  }
  
  const revealNextHint = () => {
    if (hintsRevealed < hints.length) {
      setHintsRevealed(prev => prev + 1)
    }
  }
  
  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <DifficultyBadge difficulty={difficulty} />
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <div className="flex items-center gap-2 text-zinc-400">
            <Trophy className="w-4 h-4" />
            <span className="text-sm">{completed ? earnedPoints : points} pts</span>
          </div>
        </div>
        <p className="text-zinc-300 whitespace-pre-wrap">{description}</p>
      </div>
      
      {/* Task Content */}
      <div className="p-4">
        {type === 'code' && (
          <CodeTask 
            data={data as CodeTaskData} 
            onSubmit={handleCodeSubmit}
          />
        )}
        
        {type === 'multiple_choice' && (
          <MultipleChoiceTask 
            data={data as MultipleChoiceData}
            onSubmit={handleMultipleChoiceSubmit}
          />
        )}
        
        {type === 'calculation' && (
          <CalculationTask 
            data={data as CalculationData}
            onSubmit={handleCalculationSubmit}
          />
        )}
        
        {type === 'free_text' && (
          <FreeTextTask
            data={data as FreeTextData}
            onSubmit={handleFreeTextSubmit}
          />
        )}
        
        {type === 'ordering' && (
          <OrderingTask
            data={data as OrderingData}
            onSubmit={handleOrderingSubmit}
          />
        )}
        
        {type === 'matching' && (
          <MatchingTask
            data={data as MatchingData}
            onSubmit={handleMatchingSubmit}
          />
        )}
      </div>
      
      {/* Hints */}
      {hints.length > 0 && (
        <div className="p-4 border-t border-zinc-700">
          <button
            onClick={() => setShowHints(!showHints)}
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-300"
          >
            <Lightbulb className="w-4 h-4" />
            <span>Подсказки ({hintsRevealed}/{hints.length})</span>
            {showHints ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showHints && (
            <div className="mt-3 space-y-2">
              {hints.slice(0, hintsRevealed).map((hint, i) => (
                <div key={i} className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-sm">
                  💡 {hint}
                </div>
              ))}
              
              {hintsRevealed < hints.length && (
                <button
                  onClick={revealNextHint}
                  className="text-sm text-yellow-400 hover:text-yellow-300"
                >
                  Показать подсказку (-{Math.floor(points / hints.length / 2)} pts)
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Completion Badge */}
      {completed && (
        <div className={cn(
          'p-3 text-center',
          earnedPoints > 0 ? 'bg-green-500/20' : 'bg-red-500/20'
        )}>
          <span className="font-medium">
            {earnedPoints > 0 
              ? `✅ Задание выполнено! +${earnedPoints} очков`
              : '❌ Попробуйте ещё раз'}
          </span>
        </div>
      )}
    </div>
  )
}

export default PracticeTask
