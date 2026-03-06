import { useState, useEffect, useRef } from 'react'

export function useSessionTimer() {
  const [sessionMinutes, setSessionMinutes] = useState(0)
  const startTimeRef = useRef<number>(Date.now())
  const intervalRef = useRef<any>(null)
  const lastSaveRef = useRef(0)

  useEffect(() => {
    // Восстанавливаем время сессии из localStorage
    const savedSessionStart = localStorage.getItem('sessionStartTime')
    if (savedSessionStart) {
      const elapsed = Math.floor((Date.now() - parseInt(savedSessionStart)) / 1000 / 60)
      setSessionMinutes(elapsed)
      startTimeRef.current = parseInt(savedSessionStart)
    } else {
      localStorage.setItem('sessionStartTime', startTimeRef.current.toString())
    }

    // Запускаем таймер
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000 / 60)
      setSessionMinutes(elapsed)

      // Сохраняем время каждые 5 минут
      if (elapsed > lastSaveRef.current && elapsed % 5 === 0) {
        saveSessionTime(elapsed - lastSaveRef.current)
        lastSaveRef.current = elapsed
      }
    }, 60000) // Обновляем каждую минуту

    // Сохраняем время при закрытии страницы
    const handleBeforeUnload = () => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000 / 60)
      const unsavedMinutes = elapsed - lastSaveRef.current
      if (unsavedMinutes > 0) {
        saveSessionTime(unsavedMinutes)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)
      
      // Сохраняем время при размонтировании
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000 / 60)
      const unsavedMinutes = elapsed - lastSaveRef.current
      if (unsavedMinutes > 0) {
        saveSessionTime(unsavedMinutes)
      }
    }
  }, [])

  const saveSessionTime = async (minutes: number) => {
    if (minutes <= 0) return

    try {
      await fetch('/api/session/time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      })
    } catch (error) {
      console.error('Failed to save session time:', error)
    }
  }

  const resetSession = () => {
    const now = Date.now()
    startTimeRef.current = now
    lastSaveRef.current = 0
    setSessionMinutes(0)
    localStorage.setItem('sessionStartTime', now.toString())
  }

  return {
    sessionMinutes,
    resetSession
  }
}