'use client'

/**
 * 🎓 CREATE COURSE PAGE
 * 
 * Страница для создания курсов по любой теме
 * Использует цепочку агентов: Analyst → Constructor → Generator
 */

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, BookOpen, Clock, Target, Loader2, Palette, Gamepad2 } from 'lucide-react'

interface GenerationProgress {
  stage: string
  progress: number
  message: string
}

export default function CreateCoursePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [visualMode, setVisualMode] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<GenerationProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim() || query.length < 3) {
      setError('Введите тему курса (минимум 3 символа)')
      return
    }

    setIsGenerating(true)
    setError(null)
    setProgress({ stage: 'starting', progress: 0, message: 'Начинаем генерацию...' })

    try {
      const response = await fetch('/api/create-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), visualMode })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Ошибка генерации курса')
      }

      // Сохраняем курс в localStorage для отображения
      localStorage.setItem('generatedCourse', JSON.stringify(data.data))
      
      // Переходим на страницу курса
      router.push(`/learn/${data.data.id}`)
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка')
    } finally {
      setIsGenerating(false)
      setProgress(null)
    }
  }

  const examples = [
    'ООП в Python',
    'Квантовая физика для начинающих',
    'Основы кулинарии',
    'Machine Learning с нуля',
    'История Древнего Рима',
    'Финансовая грамотность'
  ]

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 rounded-full text-blue-400 text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            AI Course Generator
          </div>
          <h1 className="text-3xl font-bold mb-2">Создать курс</h1>
          <p className="text-zinc-400">
            Введите любую тему — AI создаст полноценный курс уровня Harvard/MIT
          </p>
        </div>

        {/* Visual Mode Toggle */}
        <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${visualMode ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-700 text-zinc-400'}`}>
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium">Визуальный режим</h3>
                <p className="text-xs text-zinc-500">Диаграммы, интерактив, геймификация</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVisualMode(!visualMode)}
              disabled={isGenerating}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                visualMode ? 'bg-purple-500' : 'bg-zinc-600'
              } disabled:opacity-50`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                visualMode ? 'left-7' : 'left-1'
              }`} />
            </button>
          </div>
          
          {visualMode && (
            <div className="mt-3 pt-3 border-t border-zinc-700 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <Gamepad2 className="w-3 h-3 text-green-400" />
                Drag & Drop, квизы
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                Бейджи, прогресс
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <BookOpen className="w-3 h-3 text-blue-400" />
                Mermaid диаграммы
              </div>
              <div className="flex items-center gap-2 text-zinc-400">
                <Target className="w-3 h-3 text-red-400" />
                Chart.js графики
              </div>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Например: ООП в Python, Квантовая физика, Кулинария..."
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
              disabled={isGenerating}
              maxLength={500}
            />
            <div className="flex justify-between mt-1 text-xs text-zinc-500">
              <span>Минимум 3 символа</span>
              <span>{query.length}/500</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isGenerating || query.length < 3}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Генерация курса...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Создать курс
              </>
            )}
          </button>
        </form>

        {/* Progress */}
        {progress && (
          <div className="mt-6 p-4 bg-zinc-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">{progress.message}</span>
              <span className="text-sm text-blue-400">{progress.progress}%</span>
            </div>
            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Examples */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-zinc-400 mb-3">Примеры тем:</h3>
          <div className="flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                onClick={() => setQuery(example)}
                disabled={isGenerating}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm transition-colors disabled:opacity-50"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-3 gap-4">
          <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-blue-400" />
            <h4 className="font-medium mb-1">5-10 модулей</h4>
            <p className="text-xs text-zinc-500">Теория + практика</p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
            <Target className="w-8 h-8 mx-auto mb-2 text-green-400" />
            <h4 className="font-medium mb-1">Codewars-style</h4>
            <p className="text-xs text-zinc-500">Задания с проверкой</p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-lg text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <h4 className="font-medium mb-1">~2 минуты</h4>
            <p className="text-xs text-zinc-500">Время генерации</p>
          </div>
        </div>
      </div>
    </div>
  )
}
