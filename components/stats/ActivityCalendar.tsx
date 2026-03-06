'use client'

import { useMemo, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ActivityDay {
  date: string
  count: number
}

type ViewMode = 'year' | '6months' | '3months' | 'month' | 'custom'

interface ActivityCalendarProps {
  data: ActivityDay[]
  year?: number
}

export function ActivityCalendar({ data, year: initialYear = new Date().getFullYear() }: ActivityCalendarProps) {
  const [year, setYear] = useState(initialYear)
  const [viewMode, setViewMode] = useState<ViewMode>('year')
  const [startMonth, setStartMonth] = useState(0)
  const [customDays, setCustomDays] = useState(30)
  const [showCustomInput, setShowCustomInput] = useState(false)

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem('calendarPrefs')
    if (saved) {
      try {
        const prefs = JSON.parse(saved)
        if (prefs.viewMode) setViewMode(prefs.viewMode)
        if (prefs.customDays) setCustomDays(prefs.customDays)
      } catch {}
    }
  }, [])

  // Save preferences
  useEffect(() => {
    localStorage.setItem('calendarPrefs', JSON.stringify({ viewMode, customDays }))
  }, [viewMode, customDays])

  const getDateRange = () => {
    const now = new Date()
    let start: Date, end: Date
    
    switch (viewMode) {
      case 'custom':
        end = new Date()
        start = new Date()
        start.setDate(start.getDate() - customDays + 1)
        break
      case 'month':
        start = new Date(year, startMonth, 1)
        end = new Date(year, startMonth + 1, 0)
        break
      case '3months':
        start = new Date(year, startMonth, 1)
        end = new Date(year, startMonth + 3, 0)
        break
      case '6months':
        start = new Date(year, startMonth, 1)
        end = new Date(year, startMonth + 6, 0)
        break
      default: // year
        start = new Date(year, 0, 1)
        end = new Date(year, 11, 31)
    }
    return { start, end }
  }

  const calendar = useMemo(() => {
    const { start: startDate, end: endDate } = getDateRange()
    const days: { date: Date; count: number }[] = []

    // Create map for quick lookup
    const dataMap = new Map(data.map(d => [d.date, d.count]))

    // Generate all days of the year
    const current = new Date(startDate)
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]
      days.push({
        date: new Date(current),
        count: dataMap.get(dateStr) || 0,
      })
      current.setDate(current.getDate() + 1)
    }

    // Group by weeks
    const weeks: typeof days[] = []
    let currentWeek: typeof days = []

    // Add empty days for first week alignment
    const firstDayOfWeek = days[0].date.getDay()
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({ date: new Date(0), count: -1 })
    }

    days.forEach((day) => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        weeks.push(currentWeek)
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      weeks.push(currentWeek)
    }

    return weeks
  }, [data, year, viewMode, startMonth, customDays])

  const getIntensity = (count: number): string => {
    if (count < 0) return 'bg-transparent'
    if (count === 0) return 'bg-slate-800'
    if (count <= 2) return 'bg-green-900'
    if (count <= 4) return 'bg-green-700'
    if (count <= 6) return 'bg-green-500'
    return 'bg-green-400'
  }

  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  const viewModes: { id: ViewMode; label: string }[] = [
    { id: 'month', label: '1 мес' },
    { id: '3months', label: '3 мес' },
    { id: '6months', label: '6 мес' },
    { id: 'year', label: 'Год' },
    { id: 'custom', label: `${customDays}д` },
  ]

  const getTitle = () => {
    switch (viewMode) {
      case 'custom':
        return `Последние ${customDays} дней`
      case 'month':
        return `${months[startMonth]} ${year}`
      case '3months':
        return `${months[startMonth]} - ${months[(startMonth + 2) % 12]} ${year}`
      case '6months':
        return `${months[startMonth]} - ${months[(startMonth + 5) % 12]} ${year}`
      default:
        return `${year}`
    }
  }

  const handlePrev = () => {
    if (viewMode === 'year') {
      setYear(y => y - 1)
    } else {
      const monthsToMove = viewMode === 'month' ? 1 : viewMode === '3months' ? 3 : 6
      if (startMonth - monthsToMove < 0) {
        setYear(y => y - 1)
        setStartMonth(12 - monthsToMove + startMonth)
      } else {
        setStartMonth(m => m - monthsToMove)
      }
    }
  }

  const handleNext = () => {
    if (viewMode === 'year') {
      setYear(y => y + 1)
    } else {
      const monthsToMove = viewMode === 'month' ? 1 : viewMode === '3months' ? 3 : 6
      if (startMonth + monthsToMove > 11) {
        setYear(y => y + 1)
        setStartMonth((startMonth + monthsToMove) % 12)
      } else {
        setStartMonth(m => m + monthsToMove)
      }
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 sm:p-6 w-full">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <button onClick={handlePrev} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h3 className="text-lg font-semibold text-white min-w-[120px] text-center">{getTitle()}</h3>
          <button onClick={handleNext} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* View mode selector */}
        <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1">
          {viewModes.map(mode => (
            <button
              key={mode.id}
              onClick={() => {
                if (mode.id === 'custom') {
                  setShowCustomInput(true)
                } else {
                  setViewMode(mode.id)
                  setShowCustomInput(false)
                }
                if (mode.id !== 'year' && mode.id !== 'custom') setStartMonth(new Date().getMonth())
              }}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                viewMode === mode.id
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom days input */}
      {showCustomInput && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-slate-900/50 rounded-lg">
          <span className="text-sm text-slate-400">Показать последние</span>
          <input
            type="number"
            min="7"
            max="365"
            value={customDays}
            onChange={(e) => setCustomDays(Math.max(7, Math.min(365, parseInt(e.target.value) || 30)))}
            className="w-20 px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-white text-center text-sm"
          />
          <span className="text-sm text-slate-400">дней</span>
          <button
            onClick={() => { setViewMode('custom'); setShowCustomInput(false) }}
            className="ml-auto px-3 py-1 rounded-lg bg-[var(--color-primary)] text-white text-sm"
          >
            Применить
          </button>
        </div>
      )}
      
      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="inline-flex flex-col gap-1 min-w-max">
          {/* Month labels - only show for year view */}
          {viewMode === 'year' && (
            <div className="flex gap-1 mb-2 ml-8">
              {months.map((month, i) => (
                <div
                  key={month}
                  className="text-xs text-slate-500"
                  style={{ width: `${Math.max((calendar.length / 12) * 13, 30)}px` }}
                >
                  {month}
                </div>
              ))}
            </div>
          )}

          {/* Calendar grid */}
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-2">
              {weekDays.map((day, i) => (
                <div
                  key={day}
                  className="text-xs text-slate-500 h-3 flex items-center"
                  style={{ visibility: i % 2 === 1 ? 'visible' : 'hidden' }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {calendar.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={cn(
                      'w-3 h-3 rounded-sm transition-colors',
                      getIntensity(day.count),
                      day.count >= 0 && 'hover:ring-1 hover:ring-white/50 cursor-pointer'
                    )}
                    title={
                      day.count >= 0
                        ? `${day.date.toLocaleDateString('ru-RU')}: ${day.count} активностей`
                        : undefined
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <span className="text-xs text-slate-500">Меньше</span>
        <div className="flex gap-1">
          {[0, 2, 4, 6, 8].map((count) => (
            <div
              key={count}
              className={cn('w-3 h-3 rounded-sm', getIntensity(count))}
            />
          ))}
        </div>
        <span className="text-xs text-slate-500">Больше</span>
      </div>
    </div>
  )
}

