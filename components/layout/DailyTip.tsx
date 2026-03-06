'use client'

import { useState, useEffect } from 'react'
import { Target } from '@phosphor-icons/react'

const tips = [
  'Занимайся каждый день по 20 минут для лучшего результата',
  'Делай перерывы каждые 25 минут - это повышает продуктивность',
  'Повторяй материал через день, неделю и месяц для лучшего запоминания',
  'Учи новое утром - мозг лучше усваивает информацию после сна',
  'Объясняй изученное другим - это лучший способ проверить понимание',
  'Практикуйся на реальных проектах - теория без практики бесполезна',
  'Не бойся ошибок - они помогают учиться быстрее',
  'Ставь конкретные цели на каждую неделю и отслеживай прогресс',
]

export function DailyTip() {
  const [currentTip, setCurrentTip] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setIsVisible(false)
      
      // Change tip after fade out
      setTimeout(() => {
        setCurrentTip((prev) => (prev + 1) % tips.length)
        setIsVisible(true)
      }, 300) // Match transition duration
    }, 10000) // Change every 10 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="mt-4 p-4 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
      <div className="flex items-center gap-2 mb-1">
        <Target size={16} className="text-[var(--color-primary)]" />
        <p className="text-sm text-[var(--color-primary)] font-medium">Совет дня</p>
      </div>
      <p 
        className={`text-xs text-[var(--color-text-secondary)] mt-1 transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {tips[currentTip]}
      </p>
    </div>
  )
}
