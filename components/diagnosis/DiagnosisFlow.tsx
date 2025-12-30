'use client'

import { useState } from 'react'
import { Brain, ChevronRight, CheckCircle, XCircle, SkipForward } from 'lucide-react'
import { Card, CardContent, Button, Progress, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  topicSlug: string
  difficulty: string
}

interface DiagnosisFlowProps {
  questions: Question[]
  onComplete: (results: { topicSlug: string; score: number }[]) => void
}

export function DiagnosisFlow({ questions, onComplete }: DiagnosisFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isAnswered, setIsAnswered] = useState(false)
  const [results, setResults] = useState<{ topicSlug: string; correct: boolean }[]>([])

  const currentQuestion = questions[currentIndex]
  const progress = ((currentIndex + 1) / questions.length) * 100

  const handleAnswer = () => {
    if (selectedAnswer === null) return

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer
    setIsAnswered(true)
    setResults([...results, { topicSlug: currentQuestion.topicSlug, correct: isCorrect }])
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setSelectedAnswer(null)
      setIsAnswered(false)
    } else {
      // Calculate scores by topic
      const topicScores = new Map<string, { correct: number; total: number }>()
      results.forEach(r => {
        const current = topicScores.get(r.topicSlug) || { correct: 0, total: 0 }
        topicScores.set(r.topicSlug, {
          correct: current.correct + (r.correct ? 1 : 0),
          total: current.total + 1,
        })
      })

      const finalResults = Array.from(topicScores.entries()).map(([topicSlug, data]) => ({
        topicSlug,
        score: Math.round((data.correct / data.total) * 100),
      }))

      onComplete(finalResults)
    }
  }

  const handleSkip = () => {
    setResults([...results, { topicSlug: currentQuestion.topicSlug, correct: false }])
    handleNext()
  }

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Диагностика</h2>
        <p className="text-slate-400 mt-1">
          Определяем твой текущий уровень знаний
        </p>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Вопрос {currentIndex + 1} из {questions.length}</span>
          <span className="text-white">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Question */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-2 mb-6">
            <Badge variant="info" size="sm">{currentQuestion.difficulty}</Badge>
            <Badge size="sm">{currentQuestion.topicSlug}</Badge>
          </div>

          <h3 className="text-xl font-medium text-white mb-6">
            {currentQuestion.question}
          </h3>

          {/* Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => {
              const isSelected = selectedAnswer === index
              const isCorrectOption = index === currentQuestion.correctAnswer

              let optionStyle = 'border-slate-600/50 hover:border-slate-500'
              if (isAnswered) {
                if (isCorrectOption) {
                  optionStyle = 'border-green-500 bg-green-500/10'
                } else if (isSelected && !isCorrectOption) {
                  optionStyle = 'border-red-500 bg-red-500/10'
                }
              } else if (isSelected) {
                optionStyle = 'border-primary-500 bg-primary-500/10'
              }

              return (
                <button
                  key={index}
                  onClick={() => !isAnswered && setSelectedAnswer(index)}
                  disabled={isAnswered}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
                    optionStyle
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                      isAnswered && isCorrectOption
                        ? 'bg-green-500 text-white'
                        : isAnswered && isSelected && !isCorrectOption
                        ? 'bg-red-500 text-white'
                        : isSelected
                        ? 'bg-primary-500 text-white'
                        : 'bg-slate-700 text-slate-300'
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="text-slate-200 flex-1">{option}</span>
                  {isAnswered && isCorrectOption && (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                  {isAnswered && isSelected && !isCorrectOption && (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Explanation */}
          {isAnswered && (
            <div
              className={cn(
                'mt-6 p-4 rounded-lg',
                isCorrect
                  ? 'bg-green-500/10 border border-green-500/30'
                  : 'bg-red-500/10 border border-red-500/30'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="font-medium text-green-400">Правильно!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-400" />
                    <span className="font-medium text-red-400">Неправильно</span>
                  </>
                )}
              </div>
              <p className="text-slate-300 text-sm">{currentQuestion.explanation}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        {!isAnswered ? (
          <>
            <Button
              variant="ghost"
              onClick={handleSkip}
              leftIcon={<SkipForward className="w-4 h-4" />}
            >
              Не знаю
            </Button>
            <Button
              onClick={handleAnswer}
              disabled={selectedAnswer === null}
              className="flex-1"
            >
              Ответить
            </Button>
          </>
        ) : (
          <Button
            onClick={handleNext}
            rightIcon={<ChevronRight className="w-4 h-4" />}
            className="flex-1"
          >
            {currentIndex < questions.length - 1 ? 'Следующий вопрос' : 'Завершить'}
          </Button>
        )}
      </div>
    </div>
  )
}

