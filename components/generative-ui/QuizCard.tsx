'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import type { QuizData } from './types'

interface QuizCardProps {
  data: QuizData
}

export function QuizCard({ data }: QuizCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)

  const handleSelect = (index: number) => {
    if (showResult) return
    setSelected(index)
    setShowResult(true)
  }

  const isCorrect = selected === data.correctIndex

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-start gap-3 mb-4">
        <HelpCircle className="w-5 h-5 text-primary-400 mt-0.5 flex-shrink-0" />
        <p className="text-white font-medium">{data.question}</p>
      </div>

      <div className="space-y-2">
        {data.options.map((option, index) => {
          const isSelected = selected === index
          const isCorrectOption = index === data.correctIndex
          
          let bgClass = 'bg-slate-700/50 hover:bg-slate-700'
          let borderClass = 'border-slate-600/50'
          
          if (showResult) {
            if (isCorrectOption) {
              bgClass = 'bg-green-500/20'
              borderClass = 'border-green-500/50'
            } else if (isSelected && !isCorrectOption) {
              bgClass = 'bg-red-500/20'
              borderClass = 'border-red-500/50'
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={showResult}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${bgClass} ${borderClass} ${
                showResult ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs font-medium">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="text-slate-200 flex-1">{option}</span>
                {showResult && isCorrectOption && (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                )}
                {showResult && isSelected && !isCorrectOption && (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {showResult && (
        <div className={`mt-4 p-3 rounded-lg ${isCorrect ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
          <p className={`text-sm ${isCorrect ? 'text-green-300' : 'text-amber-300'}`}>
            {isCorrect ? '✅ Правильно!' : '❌ Неправильно.'} {data.explanation}
          </p>
        </div>
      )}
    </div>
  )
}

