'use client'

import { useState, useEffect } from 'react'
import { useSessionTimer } from '@/hooks/useSessionTimer'
import { formatMinutes } from '@/lib/utils'

export function SessionTimer() {
  const { sessionMinutes } = useSessionTimer()
  const [totalMinutes, setTotalMinutes] = useState(0)

  useEffect(() => {
    // Получаем общее время из API
    const fetchTotalTime = async () => {
      try {
        const response = await fetch('/api/stats')
        if (response.ok) {
          const data = await response.json()
          setTotalMinutes(data.stats.totalMinutes || 0)
        }
      } catch (error) {
        console.error('Failed to fetch total time:', error)
      }
    }

    fetchTotalTime()
  }, [])

  // Показываем сумму сохраненного времени и текущей сессии
  const displayMinutes = totalMinutes + sessionMinutes

  return (
    <span className="text-lg font-bold text-white">
      {formatMinutes(displayMinutes)}
    </span>
  )
}