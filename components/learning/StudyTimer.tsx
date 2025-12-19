'use client'

import { useState, useEffect, useRef } from 'react'

interface StudyTimerProps {
  topicId: string
  className?: string
  showControls?: boolean
  autoStart?: boolean
  onTimeUpdate?: (minutes: number) => void
}

export function StudyTimer({ 
  topicId, 
  className = '', 
  showControls = true,
  autoStart = false,
  onTimeUpdate 
}: StudyTimerProps) {
  const [isActive, setIsActive] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const intervalRef = useRef(null)
  const lastSaveRef = useRef(0)

  // Auto-start if requested
  useEffect(() => {
    if (autoStart && !isActive) {
      setIsActive(true)
    }
  }, [autoStart, isActive])

  // Timer effect
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          const newSeconds = prev + 1
          const currentMinutes = Math.floor(newSeconds / 60)
          
          // Auto-save every 5 minutes
          if (topicId && currentMinutes > lastSaveRef.current && currentMinutes % 5 === 0) {
            const minutesToSave = currentMinutes - lastSaveRef.current
            saveTime(minutesToSave)
            lastSaveRef.current = currentMinutes
          }
          
          return newSeconds
        })
      }, 1000)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isActive, topicId])

  // Save time to server
  const saveTime = async (minutes) => {
    if (!topicId || minutes <= 0) return

    try {
      const response = await fetch(`/api/topics/${topicId}/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      })

      if (response.ok) {
        onTimeUpdate?.(minutes)
      }
    } catch (error) {
      console.error('Failed to save study time:', error)
    }
  }

  const start = () => setIsActive(true)
  const stop = () => setIsActive(false)
  const reset = () => {
    setIsActive(false)
    setSeconds(0)
    lastSaveRef.current = 0
  }

  const currentMinutes = Math.floor(seconds / 60)
  const displaySeconds = seconds % 60
  const displayTime = `${currentMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <span className="font-mono text-lg font-semibold text-white">
          {displayTime}
        </span>
      </div>

      {showControls && (
        <div className="flex items-center gap-2">
          {!isActive ? (
            <button
              onClick={start}
              className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 transition-colors"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
              Старт
            </button>
          ) : (
            <button
              onClick={stop}
              className="px-3 py-1 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-1 transition-colors"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
              Пауза
            </button>
          )}

          <button
            onClick={() => {
              const unsavedMinutes = currentMinutes - lastSaveRef.current
              if (unsavedMinutes > 0) {
                saveTime(unsavedMinutes)
              }
              reset()
            }}
            className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-1 transition-colors"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12"/>
            </svg>
            Стоп
          </button>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'

