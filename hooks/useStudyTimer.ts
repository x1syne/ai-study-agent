import { useState, useEffect, useRef } from 'react'

interface UseStudyTimerProps {
  topicId?: string
  onTimeUpdate?: (minutes: number) => void
  autoSave?: boolean
  saveInterval?: number // minutes
}

export function useStudyTimer({ 
  topicId, 
  onTimeUpdate, 
  autoSave = true, 
  saveInterval = 5 
}: UseStudyTimerProps = {}) {
  const [isActive, setIsActive] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [totalMinutes, setTotalMinutes] = useState(0)
  const intervalRef = useRef<any>(null)
  const lastSaveRef = useRef(0)

  // Start timer
  const start = () => {
    if (!isActive) {
      setIsActive(true)
    }
  }

  // Stop timer
  const stop = () => {
    setIsActive(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Reset timer
  const reset = () => {
    stop()
    setSeconds(0)
    setTotalMinutes(0)
    lastSaveRef.current = 0
  }

  // Save time to server
  const saveTime = async (minutes: number) => {
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

  // Timer effect
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev: number) => {
          const newSeconds = prev + 1
          const currentMinutes = Math.floor(newSeconds / 60)
          
          // Auto-save every saveInterval minutes
          if (autoSave && topicId && currentMinutes > lastSaveRef.current) {
            const minutesToSave = currentMinutes - lastSaveRef.current
            if (minutesToSave >= saveInterval) {
              saveTime(minutesToSave)
              lastSaveRef.current = currentMinutes
            }
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
  }, [isActive, autoSave, topicId, saveInterval])

  // Save remaining time when component unmounts or timer stops
  useEffect(() => {
    return () => {
      const currentMinutes = Math.floor(seconds / 60)
      const unsavedMinutes = currentMinutes - lastSaveRef.current
      if (unsavedMinutes > 0 && topicId) {
        saveTime(unsavedMinutes)
      }
    }
  }, [seconds, topicId])

  const currentMinutes = Math.floor(seconds / 60)
  const displaySeconds = seconds % 60

  return {
    isActive,
    seconds,
    minutes: currentMinutes,
    displayTime: `${currentMinutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`,
    totalMinutes: totalMinutes + currentMinutes,
    start,
    stop,
    reset,
    saveTime: () => {
      const unsavedMinutes = currentMinutes - lastSaveRef.current
      if (unsavedMinutes > 0) {
        saveTime(unsavedMinutes)
        lastSaveRef.current = currentMinutes
      }
    }
  }
}