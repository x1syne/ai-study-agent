'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Calendar, Clock, Download, ExternalLink, Plus, X,
  Trash2, Edit2, Check, ChevronLeft, ChevronRight,
  Sparkles, BookOpen, Sun, Sunset, Moon, Zap,
  CalendarDays, Settings2, GraduationCap
} from 'lucide-react'
import { generateStudySchedule, downloadICS, generateGoogleCalendarUrl, StudyEvent } from '@/lib/calendar'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

interface Goal {
  id: string
  title: string
  topics: { id: string; name: string; estimatedMinutes: number }[]
}

interface CustomEvent {
  id: string
  title: string
  time: string
  date: string
}

const TIME_OPTIONS = [
  { value: 'morning', label: 'Утром', icon: Sun, time: '08:00 – 10:00', color: '#f59e0b' },
  { value: 'afternoon', label: 'Днём', icon: Sunset, time: '13:00 – 15:00', color: '#f97316' },
  { value: 'evening', label: 'Вечером', icon: Moon, time: '19:00 – 21:00', color: '#7c3aed' },
] as const

const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAY_NAMES = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

export default function SchedulePage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState('')
  const [schedule, setSchedule] = useState<StudyEvent[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([])
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventTime, setNewEventTime] = useState('09:00')
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingTime, setEditingTime] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [preferences, setPreferences] = useState({
    startDate: new Date(),
    daysPerWeek: 5,
    minutesPerDay: 45,
    preferredTime: 'evening' as 'morning' | 'afternoon' | 'evening',
  })
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchWithTimeout('/api/goals').then(r => r.json()).then(data => {
      if (Array.isArray(data)) {
        setGoals(data)
        if (data.length > 0) setSelectedGoal(data[0].id)
      }
    }).catch(() => setGoals([]))

    const saved = localStorage.getItem('customEvents')
    if (saved) setCustomEvents(JSON.parse(saved))
    const savedSch = localStorage.getItem('studySchedule')
    if (savedSch) {
      const parsed = JSON.parse(savedSch)
      setSchedule(parsed.map((e: StudyEvent) => ({ ...e, startTime: new Date(e.startTime), endTime: new Date(e.endTime) })))
    }
    const savedPrefs = localStorage.getItem('schedulePreferences')
    if (savedPrefs) {
      const parsed = JSON.parse(savedPrefs)
      setPreferences({ ...parsed, startDate: new Date(parsed.startDate || new Date()) })
    }
  }, [])

  useEffect(() => { localStorage.setItem('customEvents', JSON.stringify(customEvents)) }, [customEvents])
  useEffect(() => { localStorage.setItem('studySchedule', JSON.stringify(schedule)) }, [schedule])
  useEffect(() => { localStorage.setItem('schedulePreferences', JSON.stringify(preferences)) }, [preferences])

  // Close modal on backdrop click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showModal && modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setShowModal(false)
        setSelectedDate(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showModal])

  const handleGenerate = async () => {
    const goal = goals.find(g => g.id === selectedGoal)
    if (!goal) return
    setIsGenerating(true)
    await new Promise(r => setTimeout(r, 600))
    setSchedule(generateStudySchedule(goal.topics, preferences))
    setIsGenerating(false)
  }

  const handleDeleteEvent = (id: string) => setSchedule(s => s.filter(e => e.id !== id))
  const handleStartEdit = (id: string, time: string) => { setEditingEventId(id); setEditingTime(time) }
  const handleSaveTime = (id: string) => {
    setSchedule(s => s.map(ev => {
      if (ev.id !== id) return ev
      const [h, m] = editingTime.split(':').map(Number)
      const newStart = new Date(ev.startTime)
      newStart.setHours(h, m, 0, 0)
      const dur = new Date(ev.endTime).getTime() - new Date(ev.startTime).getTime()
      return { ...ev, startTime: newStart, endTime: new Date(newStart.getTime() + dur) }
    }))
    setEditingEventId(null)
  }
  const handleClearSchedule = () => { setSchedule([]); localStorage.removeItem('studySchedule') }

  const getMonthDays = () => {
    const y = currentMonth.getFullYear(), mo = currentMonth.getMonth()
    const first = new Date(y, mo, 1)
    const last = new Date(y, mo + 1, 0)
    const days: (Date | null)[] = []
    const start = first.getDay() === 0 ? 6 : first.getDay() - 1
    for (let i = 0; i < start; i++) days.push(null)
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, mo, d))
    return days
  }

  const getEventsForDay = (date: Date) => {
    const ds = date.toDateString()
    return {
      study: schedule.filter(e => new Date(e.startTime).toDateString() === ds),
      custom: customEvents.filter(e => e.date === ds),
    }
  }

  const addCustomEvent = () => {
    if (!newEventTitle || !selectedDate) return
    setCustomEvents(prev => [...prev, {
      id: Date.now().toString(),
      title: newEventTitle,
      time: newEventTime,
      date: selectedDate.toDateString(),
    }])
    setNewEventTitle('')
  }

  const removeCustomEvent = (id: string) => setCustomEvents(p => p.filter(e => e.id !== id))

  const formatTime = (d: Date) => {
    const dt = new Date(d)
    return `${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}`
  }

  const monthDays = getMonthDays()

  // Stats
  const totalSessions = schedule.length
  const totalMinutes = schedule.reduce((acc, e) => {
    return acc + (new Date(e.endTime).getTime() - new Date(e.startTime).getTime()) / 60000
  }, 0)
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10

  const openDayModal = (day: Date) => {
    setSelectedDate(day)
    setShowModal(true)
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(6,182,212,0.10) 100%)',
          border: '1px solid rgba(124,58,237,0.25)',
        }}>
        {/* Декоративные орбы */}
        <div className="absolute top-0 right-10 w-64 h-64 rounded-full pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.5) 0%, transparent 70%)', transform: 'translateY(-50%)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full pointer-events-none opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.6) 0%, transparent 70%)', transform: 'translate(-30%, 40%)' }} />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' }}>
              <CalendarDays className="w-7 h-7" style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Расписание</h1>
              <p style={{ color: 'var(--color-text-secondary)' }}>Планируй обучение, достигай целей</p>
            </div>
          </div>

          {totalSessions > 0 && (
            <div className="flex items-center gap-6 flex-wrap">
              {[
                { value: totalSessions, label: 'занятий', color: '#7c3aed', icon: <BookOpen className="w-4 h-4" /> },
                { value: `${totalHours}ч`, label: 'суммарно', color: '#06b6d4', icon: <Clock className="w-4 h-4" /> },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: `${s.color}20`, color: s.color }}>
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* ── Settings Panel ── */}
        <div className="xl:col-span-1 space-y-4">
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="h-0.5" style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }} />
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <span className="font-semibold text-white text-sm">Настройки</span>
              </div>

              {/* Course select */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--color-text-secondary)' }}>Курс</label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: 'var(--color-text-secondary)' }} />
                  <select value={selectedGoal} onChange={e => setSelectedGoal(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white appearance-none"
                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}>
                    {goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                    {goals.length === 0 && <option value="">Нет курсов</option>}
                  </select>
                </div>
              </div>

              {/* Days per week */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--color-text-secondary)' }}>Дней в неделю</label>
                <div className="grid grid-cols-7 gap-1">
                  {[1,2,3,4,5,6,7].map(d => (
                    <button key={d} onClick={() => setPreferences(p => ({ ...p, daysPerWeek: d }))}
                      className="aspect-square rounded-lg text-sm font-semibold transition-all duration-150"
                      style={{
                        background: preferences.daysPerWeek === d ? 'var(--color-primary)' : 'var(--color-bg-secondary)',
                        color: preferences.daysPerWeek === d ? '#fff' : 'var(--color-text-secondary)',
                        border: preferences.daysPerWeek === d ? '1px solid var(--color-primary)' : '1px solid transparent',
                        boxShadow: preferences.daysPerWeek === d ? '0 0 10px rgba(124,58,237,0.4)' : 'none',
                      }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutes per day */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--color-text-secondary)' }}>Минут в день</label>
                <div className="grid grid-cols-4 gap-1">
                  {[30,45,60,90].map(m => (
                    <button key={m} onClick={() => setPreferences(p => ({ ...p, minutesPerDay: m }))}
                      className="py-2 rounded-lg text-sm font-semibold transition-all duration-150"
                      style={{
                        background: preferences.minutesPerDay === m ? 'rgba(6,182,212,0.15)' : 'var(--color-bg-secondary)',
                        color: preferences.minutesPerDay === m ? '#06b6d4' : 'var(--color-text-secondary)',
                        border: preferences.minutesPerDay === m ? '1px solid rgba(6,182,212,0.4)' : '1px solid transparent',
                        boxShadow: preferences.minutesPerDay === m ? '0 0 10px rgba(6,182,212,0.2)' : 'none',
                      }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred time */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--color-text-secondary)' }}>Время занятий</label>
                <div className="space-y-1.5">
                  {TIME_OPTIONS.map(opt => {
                    const Icon = opt.icon
                    const isSelected = preferences.preferredTime === opt.value
                    return (
                      <button key={opt.value}
                        onClick={() => setPreferences(p => ({ ...p, preferredTime: opt.value }))}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200"
                        style={{
                          background: isSelected ? `${opt.color}18` : 'var(--color-bg-secondary)',
                          border: isSelected ? `1px solid ${opt.color}50` : '1px solid transparent',
                        }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${opt.color}20`, color: opt.color }}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: isSelected ? '#fff' : 'var(--color-text-secondary)' }}>
                            {opt.label}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{opt.time}</p>
                        </div>
                        {isSelected && (
                          <div className="ml-auto w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color }} />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Generate button */}
              <button onClick={handleGenerate} disabled={!selectedGoal || isGenerating}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50"
                style={{ background: 'var(--color-primary)', color: '#fff' }}>
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Генерируем…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Сгенерировать
                  </>
                )}
              </button>

              {/* Export buttons */}
              {schedule.length > 0 && (
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-xs text-center" style={{ color: 'var(--color-text-secondary)' }}>
                    {schedule.length} занятий создано
                  </p>
                  <button
                    onClick={() => {
                      const norm = schedule.map(e => ({ ...e, startTime: new Date(e.startTime), endTime: new Date(e.endTime) }))
                      downloadICS(norm)
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    <Download className="w-4 h-4" />
                    Скачать .ics
                  </button>
                  <button
                    onClick={() => {
                      const first = schedule[0]
                      if (first) {
                        const url = generateGoogleCalendarUrl({ ...first, startTime: new Date(first.startTime), endTime: new Date(first.endTime) })
                        window.open(url, '_blank')
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    <ExternalLink className="w-4 h-4" />
                    Google Calendar
                  </button>
                  <button onClick={handleClearSchedule}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm transition-all hover:bg-red-500/10"
                    style={{ color: '#f87171' }}>
                    <Trash2 className="w-4 h-4" />
                    Очистить
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Calendar ── */}
        <div className="xl:col-span-3">
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="h-0.5" style={{ background: 'linear-gradient(90deg, var(--color-accent), var(--color-primary))' }} />

            {/* Calendar header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/5"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <h3 className="text-base font-semibold text-white">
                  {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
              </div>
              <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-white/5"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4">
              {/* Day names */}
              <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-xs font-medium py-2 uppercase tracking-wider"
                    style={{ color: 'var(--color-text-secondary)' }}>{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day, i) => {
                  if (!day) return <div key={i} className="aspect-square" />
                  const ev = getEventsForDay(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  const isSel = selectedDate?.toDateString() === day.toDateString()
                  const hasStudy = ev.study.length > 0
                  const hasCustom = ev.custom.length > 0
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6

                  return (
                    <button key={i} onClick={() => openDayModal(day)}
                      className="relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 group"
                      style={{
                        background: isSel
                          ? 'var(--color-primary)'
                          : isToday
                            ? 'rgba(124,58,237,0.15)'
                            : 'transparent',
                        border: isSel
                          ? '1px solid var(--color-primary)'
                          : isToday
                            ? '1px solid rgba(124,58,237,0.4)'
                            : '1px solid transparent',
                        boxShadow: isSel ? '0 0 16px rgba(124,58,237,0.4)' : 'none',
                      }}
                      onMouseEnter={e => {
                        if (!isSel) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
                      }}
                      onMouseLeave={e => {
                        if (!isSel && !isToday) (e.currentTarget as HTMLElement).style.background = 'transparent'
                        else if (isToday && !isSel) (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.15)'
                      }}>
                      <span className={`text-sm font-medium ${isSel ? 'text-white' : isToday ? 'text-white' : isWeekend ? 'text-red-400/70' : 'text-white'}`}>
                        {day.getDate()}
                      </span>
                      {(hasStudy || hasCustom) && (
                        <div className="flex gap-0.5">
                          {ev.study.slice(0, 3).map((_, idx) => (
                            <div key={idx} className="w-1 h-1 rounded-full"
                              style={{ background: isSel ? '#fff' : 'var(--color-primary)' }} />
                          ))}
                          {ev.custom.slice(0, 2).map((_, idx) => (
                            <div key={idx} className="w-1 h-1 rounded-full"
                              style={{ background: isSel ? '#fff' : '#22c55e' }} />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 px-5 py-3 text-xs"
              style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--color-primary)' }} />
                Занятие по курсу
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                Своё событие
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' }} />
                Сегодня
              </div>
            </div>
          </div>

          {/* Upcoming events mini-list */}
          {schedule.length > 0 && (
            <div className="mt-4 rounded-2xl overflow-hidden"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="px-5 py-3 flex items-center gap-2"
                style={{ borderBottom: '1px solid var(--color-border)' }}>
                <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                <span className="text-sm font-semibold text-white">Ближайшие занятия</span>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {schedule
                  .filter(e => new Date(e.startTime) >= new Date())
                  .slice(0, 5)
                  .map(ev => (
                    <div key={ev.id} className="flex items-center gap-3 px-5 py-3 group">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(124,58,237,0.12)' }}>
                        <BookOpen className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                        <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {new Date(ev.startTime).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' })}
                          {' · '}{formatTime(ev.startTime)} – {formatTime(ev.endTime)}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteEvent(ev.id)}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                        style={{ color: '#f87171' }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Day Modal ── */}
      {showModal && selectedDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div ref={modalRef}
            className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(15,14,23,0.95)',
              border: '1px solid rgba(124,58,237,0.3)',
              boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.1)',
            }}>
            {/* top accent */}
            <div className="h-0.5" style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))' }} />

            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(124,58,237,0.15)' }}>
                  <Calendar className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
                </div>
                <h3 className="font-semibold text-white">
                  {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
                </h3>
              </div>
              <button onClick={() => { setShowModal(false); setSelectedDate(null) }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10"
                style={{ color: 'var(--color-text-secondary)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Events list */}
            <div className="max-h-64 overflow-y-auto">
              {(() => {
                const evs = getEventsForDay(selectedDate)
                const hasAny = evs.study.length > 0 || evs.custom.length > 0
                return hasAny ? (
                  <div className="p-4 space-y-2">
                    {evs.study.map(ev => (
                      <div key={ev.id} className="rounded-xl p-3 group"
                        style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--color-primary)' }} />
                              <span className="text-sm font-medium text-white truncate">{ev.title}</span>
                            </div>
                            {editingEventId === ev.id ? (
                              <div className="flex items-center gap-2 mt-2">
                                <input type="time" value={editingTime}
                                  onChange={e => setEditingTime(e.target.value)}
                                  className="text-sm px-2 py-1 rounded-lg"
                                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: '#fff' }} />
                                <button onClick={() => handleSaveTime(ev.id)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center bg-green-500/20 text-green-400">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setEditingEventId(null)}
                                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10"
                                  style={{ color: 'var(--color-text-secondary)' }}>
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs ml-4" style={{ color: 'var(--color-text-secondary)' }}>
                                {formatTime(ev.startTime)} – {formatTime(ev.endTime)}
                              </span>
                            )}
                          </div>
                          {editingEventId !== ev.id && (
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleStartEdit(ev.id, formatTime(ev.startTime))}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-blue-400">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleDeleteEvent(ev.id)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-red-400">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {evs.custom.map(ev => (
                      <div key={ev.id} className="rounded-xl p-3 group flex items-center justify-between"
                        style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-white">{ev.title}</span>
                          </div>
                          <span className="text-xs ml-4 text-green-400/70">{ev.time}</span>
                        </div>
                        <button onClick={() => removeCustomEvent(ev.id)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                      style={{ background: 'rgba(124,58,237,0.1)' }}>
                      <Calendar className="w-6 h-6" style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Нет событий</p>
                  </div>
                )
              })()}
            </div>

            {/* Add custom event */}
            <div className="p-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                Добавить своё событие
              </p>
              <div className="flex gap-2">
                <input type="text" value={newEventTitle}
                  onChange={e => setNewEventTitle(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomEvent()}
                  placeholder="Название…"
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white placeholder-[var(--color-text-muted)] outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--color-border)',
                  }} />
                <input type="time" value={newEventTime}
                  onChange={e => setNewEventTime(e.target.value)}
                  className="w-24 px-2 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--color-border)' }} />
                <button onClick={addCustomEvent}
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:opacity-90"
                  style={{ background: 'var(--color-primary)', color: '#fff' }}>
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
