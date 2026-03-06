'use client'

import { useState } from 'react'
import { CheckCircle, Eye, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui'

interface VisualTaskProps {
  title: string
  description: string
  steps?: string[]
  expectedResult: string
  hints?: string[]
  checkpoints?: string[]
  onComplete: () => void
  isLoading?: boolean
}

export function VisualTask({
  title,
  description,
  steps = [],
  expectedResult,
  hints = [],
  checkpoints = [],
  onComplete,
  isLoading,
}: VisualTaskProps) {
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [showResult, setShowResult] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [currentHint, setCurrentHint] = useState(0)

  const toggleStep = (index: number) => {
    const newSet = new Set(completedSteps)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setCompletedSteps(newSet)
  }

  const allStepsCompleted = steps.length > 0 && completedSteps.size === steps.length

  const showNextHint = () => {
    if (currentHint < hints.length) {
      setCurrentHint(prev => prev + 1)
      setShowHints(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* Task description */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
        <p className="text-slate-300 whitespace-pre-wrap">{description}</p>
      </div>

      {/* Steps */}
      {steps.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h4 className="text-md font-semibold text-white mb-4">Пошаговая инструкция:</h4>
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                onClick={() => toggleStep(index)}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  completedSteps.has(index)
                    ? 'bg-green-500/10 border border-green-500/30'
                    : 'bg-slate-900/50 hover:bg-slate-900'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  completedSteps.has(index)
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-700 text-slate-400'
                }`}>
                  {completedSteps.has(index) ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <span className="text-sm">{index + 1}</span>
                  )}
                </div>
                <span className={completedSteps.has(index) ? 'text-green-300' : 'text-slate-300'}>
                  {step}
                </span>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-4">
            Отмечай выполненные шаги, кликая на них
          </p>
        </div>
      )}

      {/* Checkpoints */}
      {checkpoints.length > 0 && (
        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h4 className="text-md font-semibold text-white mb-4">Проверь себя:</h4>
          <ul className="space-y-2">
            {checkpoints.map((checkpoint, index) => (
              <li key={index} className="flex items-start gap-2 text-slate-300">
                <span className="text-primary-400">✓</span>
                {checkpoint}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hints */}
      {hints.length > 0 && (
        <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
          <button
            onClick={showNextHint}
            className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-colors"
          >
            <Lightbulb className="w-5 h-5" />
            <span>Подсказка ({Math.min(currentHint + 1, hints.length)}/{hints.length})</span>
          </button>
          {showHints && currentHint > 0 && (
            <div className="mt-4 space-y-2">
              {hints.slice(0, currentHint).map((hint, index) => (
                <p key={index} className="text-slate-300 pl-7">
                  {index + 1}. {hint}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Expected result */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <button
          onClick={() => setShowResult(!showResult)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary-400" />
            <span className="font-medium text-white">Как должен выглядеть результат</span>
          </div>
          {showResult ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>
        {showResult && (
          <div className="p-4 pt-0 border-t border-slate-700/50">
            <p className="text-slate-300 whitespace-pre-wrap">{expectedResult}</p>
          </div>
        )}
      </div>

      {/* Complete button */}
      <Button
        onClick={onComplete}
        isLoading={isLoading}
        className="w-full"
        disabled={steps.length > 0 && !allStepsCompleted}
        leftIcon={<CheckCircle className="w-5 h-5" />}
      >
        {allStepsCompleted || steps.length === 0 ? 'Задание выполнено' : `Выполни все шаги (${completedSteps.size}/${steps.length})`}
      </Button>
    </div>
  )
}

