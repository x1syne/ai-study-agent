'use client'

import { useState, useEffect, useCallback } from 'react'
import { Timer, Play, Pause, ArrowCounterClockwise, GearSix } from '@phosphor-icons/react'

export function MiniPomodoro() {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [workMinutes, setWorkMinutes] = useState(25)
  const [breakMinutes, setBreakMinutes] = useState(5)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [mode, setMode] = useState<'work' | 'break'>('work')

  // Load saved settings
  useEffect(() => {
    const saved = localStorage.getItem('pomodoroSettings')
    if (saved) {
      try {
        const { work, break: brk } = JSON.parse(saved)
        if (work) setWorkMinutes(work)
        if (brk) setBreakMinutes(brk)
        setTimeLeft(work * 60 || 25 * 60)
      } catch {}
    }
  }, [])

  // Save settings
  const saveSettings = () => {
    localStorage.setItem('pomodoroSettings', JSON.stringify({ work: workMinutes, break: breakMinutes }))
    setTimeLeft(mode === 'work' ? workMinutes * 60 : breakMinutes * 60)
    setShowSettings(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const reset = useCallback(() => {
    setTimeLeft(mode === 'work' ? workMinutes * 60 : breakMinutes * 60)
    setIsRunning(false)
  }, [mode, workMinutes, breakMinutes])

  const toggleMode = useCallback(() => {
    const newMode = mode === 'work' ? 'break' : 'work'
    setMode(newMode)
    setTimeLeft(newMode === 'work' ? workMinutes * 60 : breakMinutes * 60)
    setIsRunning(false)
  }, [mode, workMinutes, breakMinutes])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(t => t - 1), 1000)
    } else if (timeLeft === 0) {
      if (typeof window !== 'undefined') {
        try {
          const audio = new Audio('/notification.mp3')
          audio.play().catch(() => {})
        } catch {}
      }
      toggleMode()
    }
    return () => clearInterval(interval)
  }, [isRunning, timeLeft, toggleMode])

  const totalTime = mode === 'work' ? workMinutes * 60 : breakMinutes * 60
  const progress = ((totalTime - timeLeft) / totalTime) * 100

  return (
    <div className="relative flex items-center">
      {/* Compact timer display when running */}
      {isRunning && !isOpen && (
        <div 
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--color-primary)]/20 cursor-pointer hover:bg-[var(--color-primary)]/30 transition-colors mr-1"
        >
          <div className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded-full animate-pulse" />
          <span className="text-sm font-mono font-medium text-[var(--color-primary)]">
            {formatTime(timeLeft)}
          </span>
        </div>
      )}

      {/* Timer button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-xl transition-all ${
          isRunning && !isOpen
            ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' 
            : 'hover:bg-white/5 text-[var(--color-text-secondary)] hover:text-white'
        }`}
        title="Pomodoro Timer"
      >
        <Timer size={20} weight="duotone" />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => { setIsOpen(false); setShowSettings(false) }} />
          <div className="fixed sm:absolute right-4 sm:right-0 top-16 sm:top-12 z-[9999] w-72 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-xl overflow-hidden">
            {showSettings ? (
              /* Settings view */
              <div className="p-4">
                <h4 className="text-sm font-semibold text-white mb-4">⚙️ Настройки таймера</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Работа (минуты)</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={workMinutes}
                      onChange={(e) => setWorkMinutes(Math.max(1, Math.min(120, parseInt(e.target.value) || 1)))}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-white text-center"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Перерыв (минуты)</label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={breakMinutes}
                      onChange={(e) => setBreakMinutes(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-white text-center"
                    />
                  </div>

                  {/* Quick presets */}
                  <div>
                    <label className="text-xs text-[var(--color-text-secondary)] mb-2 block">Быстрый выбор</label>
                    <div className="flex gap-2">
                      {[
                        { work: 25, break: 5, label: '25/5' },
                        { work: 50, break: 10, label: '50/10' },
                        { work: 90, break: 20, label: '90/20' },
                      ].map(preset => (
                        <button
                          key={preset.label}
                          onClick={() => { setWorkMinutes(preset.work); setBreakMinutes(preset.break) }}
                          className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                            workMinutes === preset.work && breakMinutes === preset.break
                              ? 'bg-[var(--color-primary)] text-white'
                              : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 py-2 rounded-xl bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-white"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={saveSettings}
                    className="flex-1 py-2 rounded-xl bg-[var(--color-primary)] text-white"
                  >
                    Сохранить
                  </button>
                </div>
              </div>
            ) : (
              /* Timer view */
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    mode === 'work' 
                      ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {mode === 'work' ? '🎯 Работа' : '☕ Перерыв'}
                  </span>
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--color-text-secondary)] hover:text-white"
                  >
                    <GearSix size={16} weight="bold" />
                  </button>
                </div>

                <div className="text-4xl font-bold text-white text-center mb-3 font-mono">
                  {formatTime(timeLeft)}
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-[var(--color-surface)] rounded-full mb-4 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      mode === 'work' ? 'bg-[var(--color-primary)]' : 'bg-green-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={reset}
                    className="p-2 rounded-xl bg-[var(--color-surface)] hover:bg-white/10 text-[var(--color-text-secondary)]"
                  >
                    <ArrowCounterClockwise size={16} weight="bold" />
                  </button>
                  <button
                    onClick={() => setIsRunning(!isRunning)}
                    className={`flex-1 py-2 rounded-xl font-medium flex items-center justify-center gap-2 ${
                      isRunning 
                        ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30' 
                        : 'bg-[var(--color-primary)] text-white hover:opacity-90'
                    }`}
                  >
                    {isRunning ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
                    {isRunning ? 'Пауза' : 'Старт'}
                  </button>
                </div>

                <button
                  onClick={toggleMode}
                  className="w-full mt-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:text-white transition-colors"
                >
                  Переключить на {mode === 'work' ? 'перерыв' : 'работу'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
