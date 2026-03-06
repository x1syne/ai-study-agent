'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface QuizQuestionProps {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  onAnswer: (isCorrect: boolean) => void
  onNext?: () => void // Optional - if provided, shows "Next" button
  showNextButton?: boolean // Control visibility of next button
}

export function QuizQuestion({
  question,
  options,
  correctAnswer,
  explanation,
  onAnswer,
  onNext,
  showNextButton = false,
}: QuizQuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  const isCorrect = selectedAnswer === correctAnswer

  const handleSubmit = () => {
    if (selectedAnswer === null) return
    setIsSubmitted(true)
    setShowExplanation(true)
    onAnswer(isCorrect)
  }

  const handleNext = () => {
    setSelectedAnswer(null)
    setIsSubmitted(false)
    setShowExplanation(false)
    onNext?.()
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
      {/* Question */}
      <div className="flex items-start gap-3 mb-6">
        <HelpCircle className="w-6 h-6 text-primary-400 flex-shrink-0 mt-1" />
        <h3 className="text-lg font-medium text-white">{question}</h3>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {options.map((option, index) => {
          const isSelected = selectedAnswer === index
          const isCorrectOption = index === correctAnswer
          
          let optionStyle = 'border-slate-600/50 hover:border-slate-500'
          if (isSubmitted) {
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
              onClick={() => !isSubmitted && setSelectedAnswer(index)}
              disabled={isSubmitted}
              className={cn(
                'w-full flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left',
                optionStyle,
                !isSubmitted && 'cursor-pointer'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  isSubmitted && isCorrectOption
                    ? 'bg-green-500 text-white'
                    : isSubmitted && isSelected && !isCorrectOption
                    ? 'bg-red-500 text-white'
                    : isSelected
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-700 text-slate-300'
                )}
              >
                {String.fromCharCode(65 + index)}
              </div>
              <span className="text-slate-200 flex-1">{option}</span>
              {isSubmitted && isCorrectOption && (
                <CheckCircle className="w-5 h-5 text-green-400" />
              )}
              {isSubmitted && isSelected && !isCorrectOption && (
                <XCircle className="w-5 h-5 text-red-400" />
              )}
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      {showExplanation && (
        <div
          className={cn(
            'p-4 rounded-lg mb-6',
            isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
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
          <p className="text-slate-300 text-sm">{explanation}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!isSubmitted ? (
          <Button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
            className="flex-1"
          >
            Ответить
          </Button>
        ) : showNextButton ? (
          <Button onClick={handleNext} className="flex-1">
            Следующий вопрос
          </Button>
        ) : null}
      </div>
    </div>
  )
}

