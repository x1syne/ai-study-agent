'use client'

import { useState, useEffect, useCallback } from 'react'
import { Play, Pause, RotateCcw, Coffee, Brain } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface PomodoroTimerProps {
  onComplete?: (type: 'work' | 'break') => void
  className?: string
}

type TimerMode = 'work' | 'shortBreak' | 'longBreak'

const TIMER_SETTINGS = {
  work: 25 * 60, // 25 minutes
  shortBreak: 5 * 60, // 5 minutes
  longBreak: 15 * 60, // 15 minutes
}

export function PomodoroTimer({ onComplete, className }: PomodoroTimerProps) {
  const [mode, setMode] = useState<TimerMode>('work')
  const [timeLeft, setTimeLeft] = useState(TIMER_SETTINGS.work)
  const [isRunning, setIsRunning] = useState(false)
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0)

  const resetTimer = useCallback((newMode: TimerMode) => {
    setMode(newMode)
    setTimeLeft(TIMER_SETTINGS[newMode])
    setIsRunning(false)
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      // Timer completed
      if (mode === 'work') {
        setPomodorosCompleted(prev => prev + 1)
        onComplete?.('work')
        // Auto switch to break
        const nextMode = (pomodorosCompleted + 1) % 4 === 0 ? 'longBreak' : 'shortBreak'
        resetTimer(nextMode)
      } else {
        onComplete?.('break')
        resetTimer('work')
      }
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRunning, timeLeft, mode, pomodorosCompleted, onComplete, resetTimer])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const progress = ((TIMER_SETTINGS[mode] - timeLeft) / TIMER_SETTINGS[mode]) * 100

  const modeColors = {
    work: 'from-red-500 to-orange-500',
    shortBreak: 'from-green-500 to-emerald-500',
    longBreak: 'from-blue-500 to-cyan-500',
  }

  const modeLabels = {
    work: 'Фокус',
    shortBreak: 'Короткий перерыв',
    longBreak: 'Длинный перерыв',
  }

  return (
    <div className={cn('bg-slate-800/50 rounded-xl p-4 sm:p-6 border border-slate-700/50 w-full', className)}>
      {/* Mode selector */}
      <div className="flex gap-2 mb-4 sm:mb-6">
        {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map(m => (
          <button
            key={m}
            onClick={() => resetTimer(m)}
            className={cn(
              'flex-1 py-2 px-2 sm:px-3 rounded-lg text-xs sm:text-sm font-medium transition-colors',
              mode === m
                ? `bg-gradient-to-r ${modeColors[m]} text-white`
                : 'bg-slate-700/50 text-slate-400 hover:text-white'
            )}
          >
            {m === 'work' ? (
              <Brain className="w-4 h-4 mx-auto" />
            ) : (
              <Coffee className="w-4 h-4 mx-auto" />
            )}
          </button>
        ))}
      </div>

      {/* Timer display */}
      <div className="relative w-32 h-32 sm:w-48 sm:h-48 mx-auto mb-4 sm:mb-6">
        {/* Progress ring */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-700"
          />
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 88}
            strokeDashoffset={2 * Math.PI * 88 * (1 - progress / 100)}
            className="transition-all duration-1000"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={mode === 'work' ? '#ef4444' : mode === 'shortBreak' ? '#22c55e' : '#3b82f6'} />
              <stop offset="100%" stopColor={mode === 'work' ? '#f97316' : mode === 'shortBreak' ? '#10b981' : '#06b6d4'} />
            </linearGradient>
          </defs>
        </svg>
        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl sm:text-4xl font-bold text-white font-mono">{formatTime(timeLeft)}</div>
          <div className="text-xs sm:text-sm text-slate-400">{modeLabels[mode]}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2 sm:gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => resetTimer(mode)}
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          <span className="hidden sm:inline">Сброс</span>
        </Button>
        <Button
          onClick={() => setIsRunning(!isRunning)}
          leftIcon={isRunning ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
        >
          {isRunning ? 'Пауза' : 'Старт'}
        </Button>
      </div>

      {/* Pomodoros count */}
      <div className="flex justify-center gap-2 mt-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-3 h-3 rounded-full transition-colors',
              i < pomodorosCompleted % 4 ? 'bg-red-500' : 'bg-slate-700'
            )}
          />
        ))}
      </div>
      <div className="text-center text-sm text-slate-400 mt-2">
        {pomodorosCompleted} помидоров выполнено
      </div>
    </div>
  )
}

