'use client'

import { useState, useCallback } from 'react'
import { Play, RotateCcw, Lightbulb, Eye } from 'lucide-react'
import { Button } from '@/components/ui'

interface CodeEditorProps {
  initialCode: string
  language: string
  onSubmit: (code: string) => void
  hints?: string[]
  solution?: string
  isLoading?: boolean
}

export function CodeEditor({
  initialCode,
  language,
  onSubmit,
  hints = [],
  solution,
  isLoading,
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode)
  const [currentHint, setCurrentHint] = useState(-1) // -1 means no hint shown yet
  const [usedHints, setUsedHints] = useState(0)
  const [showSolution, setShowSolution] = useState(false)

  const handleReset = useCallback(() => {
    setCode(initialCode)
    setCurrentHint(-1)
    setUsedHints(0)
    setShowSolution(false)
  }, [initialCode])

  const handleShowHint = useCallback(() => {
    if (currentHint < hints.length - 1) {
      setCurrentHint(prev => prev + 1)
      setUsedHints(prev => prev + 1)
    }
  }, [currentHint, hints.length])

  const handleSubmit = useCallback(() => {
    onSubmit(code)
  }, [code, onSubmit])

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">{language}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Сбросить
          </Button>
          {hints.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShowHint}
              disabled={currentHint >= hints.length - 1}
              leftIcon={<Lightbulb className="w-4 h-4" />}
            >
              Подсказка ({Math.min(currentHint + 2, hints.length)}/{hints.length})
            </Button>
          )}
          {solution && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSolution(!showSolution)}
              leftIcon={<Eye className="w-4 h-4" />}
            >
              {showSolution ? 'Скрыть решение' : 'Показать решение'}
            </Button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="relative flex">
        {/* Line numbers */}
        <div className="w-12 bg-slate-800/50 border-r border-slate-700/50 flex-shrink-0">
          <div className="py-4 px-2 font-mono text-sm text-slate-500 text-right">
            {code.split('\n').map((_, i) => (
              <div key={i} className="leading-6">{i + 1}</div>
            ))}
          </div>
        </div>
        {/* Code area */}
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-1 h-64 bg-slate-900 text-slate-100 font-mono text-sm py-4 px-3 resize-none focus:outline-none leading-6"
          spellCheck={false}
          placeholder="Напишите ваш код здесь..."
        />
      </div>

      {/* Hints */}
      {currentHint >= 0 && (
        <div className="px-4 py-3 bg-yellow-500/10 border-t border-yellow-500/20 space-y-2">
          {hints.slice(0, currentHint + 1).map((hint, i) => (
            <div key={i} className="flex items-start gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-yellow-400 mb-1">
                  Подсказка {i + 1}
                </div>
                <div className="text-sm text-slate-300">{hint}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Solution */}
      {showSolution && solution && (
        <div className="px-4 py-3 bg-green-500/10 border-t border-green-500/20">
          <div className="text-sm font-medium text-green-400 mb-2">Решение:</div>
          <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap">
            {solution}
          </pre>
        </div>
      )}

      {/* Submit */}
      <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700/50">
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          leftIcon={<Play className="w-4 h-4" />}
          className="w-full"
        >
          Проверить решение
        </Button>
      </div>
    </div>
  )
}

