'use client'

/**
 * 🎯 QUIZ WITH FEEDBACK COMPONENT
 * 
 * Интерактивный квиз с мгновенной обратной связью:
 * - Мгновенный feedback после ответа
 * - Подсказки с penalty
 * - Анимация награды
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, HelpCircle, ChevronRight, Trophy, RotateCcw } from 'lucide-react'
import type { RewardVisual } from '@/lib/agents/types'

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  points: number
}

interface QuizWithFeedbackProps {
  questions: QuizQuestion[]
  passingScore?: number
  showExplanations?: boolean
  allowRetry?: boolean
  onComplete?: (score: number, passed: boolean) => void
  rewardVisual?: RewardVisual
  hintsAvailable?: number
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export const QuizWithFeedback: React.FC<QuizWithFeedbackProps> = ({
  questions,
  passingScore = 70,
  showExplanations = true,
  allowRetry = true,
  onComplete = () => {},
  hintsAvailable = 0
}) => {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<Map<string, { selected: number; correct: boolean }>>(new Map())
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [completed, setCompleted] = useState(false)

  const question = questions[currentQuestion]
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0)
  const progress = ((currentQuestion + (showFeedback ? 1 : 0)) / questions.length) * 100

  const handleAnswer = (index: number) => {
    if (showFeedback) return
    setSelectedAnswer(index)
  }

  const submitAnswer = () => {
    if (selectedAnswer === null) return

    const isCorrect = selectedAnswer === question.correctIndex
    const pointsEarned = isCorrect ? question.points : 0

    setAnswers(prev => new Map(prev).set(question.id, {
      selected: selectedAnswer,
      correct: isCorrect
    }))

    if (isCorrect) {
      setScore(prev => prev + pointsEarned)
    }

    setShowFeedback(true)
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setShowHint(false)
    } else {
      // Quiz completed
      setCompleted(true)
      const finalScore = (score / totalPoints) * 100
      onComplete(finalScore, finalScore >= passingScore)
    }
  }

  const useHint = () => {
    if (hintsUsed < hintsAvailable && !showFeedback) {
      setHintsUsed(prev => prev + 1)
      setShowHint(true)
    }
  }

  const restart = () => {
    setCurrentQuestion(0)
    setSelectedAnswer(null)
    setShowFeedback(false)
    setScore(0)
    setAnswers(new Map())
    setHintsUsed(0)
    setShowHint(false)
    setCompleted(false)
  }

  // Completion screen
  if (completed) {
    const finalScore = (score / totalPoints) * 100
    const passed = finalScore >= passingScore

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="quiz-complete p-8 bg-white rounded-xl shadow-lg text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className={`
            w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center
            ${passed ? 'bg-green-100' : 'bg-orange-100'}
          `}
        >
          {passed ? (
            <Trophy className="w-12 h-12 text-green-500" />
          ) : (
            <RotateCcw className="w-12 h-12 text-orange-500" />
          )}
        </motion.div>

        <h2 className="text-2xl font-bold mb-2">
          {passed ? 'Отлично!' : 'Попробуйте ещё раз'}
        </h2>

        <p className="text-gray-600 mb-4">
          Ваш результат: <span className="font-bold">{Math.round(finalScore)}%</span>
        </p>

        <div className="mb-6">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${finalScore}%` }}
              transition={{ duration: 1, delay: 0.5 }}
              className={`h-full ${passed ? 'bg-green-500' : 'bg-orange-500'}`}
            />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Проходной балл: {passingScore}%
          </p>
        </div>

        <div className="text-sm text-gray-600 mb-6">
          Правильных ответов: {Array.from(answers.values()).filter(a => a.correct).length} из {questions.length}
        </div>

        {allowRetry && !passed && (
          <button
            onClick={restart}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Попробовать снова
          </button>
        )}
      </motion.div>
    )
  }

  return (
    <div className="quiz-container p-6 bg-white rounded-xl shadow-sm border">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-500 mb-2">
          <span>Вопрос {currentQuestion + 1} из {questions.length}</span>
          <span>{score} / {totalPoints} очков</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-blue-500"
          />
        </div>
      </div>

      {/* Question */}
      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <h3 className="text-lg font-medium mb-4">{question.question}</h3>

        {/* Hint button */}
        {hintsAvailable > 0 && !showFeedback && (
          <button
            onClick={useHint}
            disabled={hintsUsed >= hintsAvailable}
            className="mb-4 flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 disabled:opacity-50"
          >
            <HelpCircle size={16} />
            Подсказка ({hintsAvailable - hintsUsed} осталось)
          </button>
        )}

        {/* Hint display */}
        <AnimatePresence>
          {showHint && !showFeedback && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm"
            >
              💡 Подсказка: Исключите явно неправильные варианты
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selectedAnswer === index
            const isCorrect = index === question.correctIndex
            const showResult = showFeedback

            return (
              <motion.button
                key={index}
                onClick={() => handleAnswer(index)}
                disabled={showFeedback}
                className={`
                  w-full p-4 rounded-lg border-2 text-left transition-all
                  ${showResult
                    ? isCorrect
                      ? 'border-green-500 bg-green-50'
                      : isSelected
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200'
                    : isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                whileHover={{ scale: showFeedback ? 1 : 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center justify-between">
                  <span>{option}</span>
                  {showResult && (
                    isCorrect ? (
                      <Check className="text-green-500" />
                    ) : isSelected ? (
                      <X className="text-red-500" />
                    ) : null
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </motion.div>

      {/* Feedback */}
      <AnimatePresence>
        {showFeedback && showExplanations && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`
              p-4 rounded-lg mb-4
              ${selectedAnswer === question.correctIndex
                ? 'bg-green-50 border border-green-200'
                : 'bg-orange-50 border border-orange-200'
              }
            `}
          >
            <p className="font-medium mb-1">
              {selectedAnswer === question.correctIndex ? '✅ Правильно!' : '❌ Неправильно'}
            </p>
            <p className="text-sm text-gray-600">{question.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {!showFeedback ? (
          <button
            onClick={submitAnswer}
            disabled={selectedAnswer === null}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            Ответить
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            {currentQuestion < questions.length - 1 ? (
              <>Далее <ChevronRight size={16} /></>
            ) : (
              'Завершить'
            )}
          </button>
        )}
      </div>
    </div>
  )
}

export default QuizWithFeedback
