'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui'
import { Calendar, Clock, Download, ExternalLink, Plus, X, Trash2, Edit2, Check } from 'lucide-react'
import { generateStudySchedule, downloadICS, generateGoogleCalendarUrl, StudyEvent } from '@/lib/calendar'

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

// Тип для хранения расписаний всех курсов
interface AllSchedules {
  [goalId: string]: StudyEvent[]
}

export default function SchedulePage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<string>('')
  const [allSchedules, setAllSchedules] = useState<AllSchedules>({})
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([])
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventTime, setNewEventTime] = useState('09:00')
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingTime, setEditingTime] = useState('')
  const [preferences, setPreferences] = useState({
    daysPerWeek: 5,
    minutesPerDay: 45,
    preferredTime: 'evening' as 'morning' | 'afternoon' | 'evening',
  })

  // Получаем расписание для текущего курса
  const schedule = allSchedules[selectedGoal] || []
  
  // Устанавливаем расписание для текущего курса
  const setSchedule = (events: StudyEvent[] | ((prev: StudyEvent[]) => StudyEvent[])) => {
    setAllSchedules(prev => {
      const newEvents = typeof events === 'function' ? events(prev[selectedGoal] || []) : events
      return { ...prev, [selectedGoal]: newEvents }
    })
  }

  useEffect(() => {
    fetch('/api/goals')
      .then(res => res.json())
      .then(data => {
        setGoals(data)
        if (data.length > 0) setSelectedGoal(data[0].id)
      })
      .catch(console.error)
    
    // Load custom events from localStorage
    const savedCustom = localStorage.getItem('customEvents')
    if (savedCustom) setCustomEvents(JSON.parse(savedCustom))
    
    // Load ALL schedules from localStorage
    const savedSchedules = localStorage.getItem('allStudySchedules')
    if (savedSchedules) {
      setAllSchedules(JSON.parse(savedSchedules))
    }
    
    // Load preferences from localStorage
    const savedPrefs = localStorage.getItem('schedulePreferences')
    if (savedPrefs) setPreferences(JSON.parse(savedPrefs))
  }, [])

  // Save custom events to localStorage
  useEffect(() => {
    localStorage.setItem('customEvents', JSON.stringify(customEvents))
  }, [customEvents])
  
  // Save ALL schedules to localStorage
  useEffect(() => {
    localStorage.setItem('allStudySchedules', JSON.stringify(allSchedules))
  }, [allSchedules])
  
  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('schedulePreferences', JSON.stringify(preferences))
  }, [preferences])

  const generateSchedule = () => {
    const goal = goals.find(g => g.id === selectedGoal)
    if (!goal) return
    const events = generateStudySchedule(goal.topics, { startDate: new Date(), ...preferences })
    setSchedule(events)
  }
  
  // Удалить событие из расписания
  const deleteScheduleEvent = (eventId: string) => {
    console.log('Deleting event:', eventId)
    setSchedule(prev => prev.filter(e => e.id !== eventId))
  }
  
  // Начать редактирование времени события
  const startEditingEvent = (event: StudyEvent & { goalTitle?: string }) => {
    console.log('Start editing event:', event.id)
    setEditingEventId(event.id)
    const date = new Date(event.startTime)
    const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    setEditingTime(time)
  }
  
  // Сохранить новое время события
  const saveEventTime = (eventId: string) => {
    console.log('Saving event time:', eventId, editingTime)
    setSchedule(prev => prev.map(event => {
      if (event.id !== eventId) return event
      
      const [hours, minutes] = editingTime.split(':').map(Number)
      const oldDate = new Date(event.startTime)
      const newStartTime = new Date(oldDate)
      newStartTime.setHours(hours, minutes, 0, 0)
      
      const duration = new Date(event.endTime).getTime() - new Date(event.startTime).getTime()
      const newEndTime = new Date(newStartTime.getTime() + duration)
      
      return {
        ...event,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString()
      }
    }))
    setEditingEventId(null)
    setEditingTime('')
  }
  
  // Очистить расписание текущего курса
  const clearSchedule = () => {
    setSchedule([])
  }
  
  // Получить все события для дня (из всех курсов)
  const getAllEventsForDay = (date: Date) => {
    const dateStr = date.toDateString()
    const allStudyEvents: (StudyEvent & { goalTitle?: string })[] = []
    
    // Собираем события из всех курсов
    Object.entries(allSchedules).forEach(([goalId, events]) => {
      const goal = goals.find(g => g.id === goalId)
      events.forEach(event => {
        if (new Date(event.startTime).toDateString() === dateStr) {
          allStudyEvents.push({ ...event, goalTitle: goal?.title })
        }
      })
    })
    
    const custom = customEvents.filter(e => e.date === dateStr)
    return { studyEvents: allStudyEvents, custom }
  }

  // Get month days in 4-column layout
  const getMonthDays = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []
    
    // Add empty slots for days before first day of month
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    for (let i = 0; i < startDay; i++) days.push(null)
    
    // Add all days of month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d))
    }
    
    return days
  }

  const getEventsForDay = (date: Date) => {
    return getAllEventsForDay(date)
  }

  const addCustomEvent = () => {
    if (!selectedDate || !newEventTitle.trim()) return
    const event: CustomEvent = {
      id: Date.now().toString(),
      title: newEventTitle,
      time: newEventTime,
      date: selectedDate.toDateString(),
    }
    setCustomEvents([...customEvents, event])
    setNewEventTitle('')
  }

  const deleteCustomEvent = (id: string) => {
    setCustomEvents(customEvents.filter(e => e.id !== id))
  }

  const monthDays = getMonthDays()
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="practicum-hero">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/20 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Расписание занятий</h1>
            <p className="text-[var(--color-text-secondary)]">Планируй обучение и экспортируй в календарь</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Settings - 1 column */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--color-primary)]" />
              Настройки
            </h3>

            <div>
              <label className="text-sm text-[var(--color-text-secondary)] block mb-2">Курс</label>
              <select
                value={selectedGoal}
                onChange={e => setSelectedGoal(e.target.value)}
                className="w-full bg-[#1a1a2e] border border-[var(--color-border)] rounded-xl px-4 py-3 text-white appearance-none cursor-pointer"
                style={{ colorScheme: 'dark' }}
              >
                {goals.map(goal => (
                  <option key={goal.id} value={goal.id} className="bg-[#1a1a2e] text-white">{goal.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-[var(--color-text-secondary)] block mb-2">Дней в неделю</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={preferences.daysPerWeek}
                  onChange={e => setPreferences(p => ({ ...p, daysPerWeek: Math.max(1, Math.min(7, parseInt(e.target.value) || 1)) }))}
                  className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-white text-center text-xl font-bold"
                />
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[3, 4, 5, 6, 7].map(days => (
                  <button
                    key={days}
                    onClick={() => setPreferences(p => ({ ...p, daysPerWeek: days }))}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      preferences.daysPerWeek === days
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-white/5'
                    }`}
                  >
                    {days}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-[var(--color-text-secondary)] block mb-2">Время в день</label>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1">
                  <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Часы</label>
                  <input
                    type="number"
                    min="0"
                    max="8"
                    value={Math.floor(preferences.minutesPerDay / 60)}
                    onChange={e => {
                      const hours = Math.max(0, Math.min(8, parseInt(e.target.value) || 0))
                      const mins = preferences.minutesPerDay % 60
                      setPreferences(p => ({ ...p, minutesPerDay: hours * 60 + mins }))
                    }}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-white text-center text-lg font-bold"
                  />
                </div>
                <span className="text-[var(--color-text-secondary)] mt-5">:</span>
                <div className="flex-1">
                  <label className="text-xs text-[var(--color-text-secondary)] block mb-1">Минуты</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={preferences.minutesPerDay % 60}
                    onChange={e => {
                      const hours = Math.floor(preferences.minutesPerDay / 60)
                      const mins = Math.max(0, Math.min(59, parseInt(e.target.value) || 0))
                      setPreferences(p => ({ ...p, minutesPerDay: hours * 60 + mins }))
                    }}
                    className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-white text-center text-lg font-bold"
                  />
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] text-center mb-2">
                Итого: {Math.floor(preferences.minutesPerDay / 60) > 0 ? `${Math.floor(preferences.minutesPerDay / 60)} ч ` : ''}{preferences.minutesPerDay % 60} мин
              </p>
              <div className="grid grid-cols-4 gap-1">
                {[30, 45, 60, 90].map(mins => (
                  <button
                    key={mins}
                    onClick={() => setPreferences(p => ({ ...p, minutesPerDay: mins }))}
                    className={`py-2 rounded-lg text-xs font-medium transition-colors ${
                      preferences.minutesPerDay === mins
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-white/5'
                    }`}
                  >
                    {mins >= 60 ? `${Math.floor(mins / 60)}ч${mins % 60 > 0 ? mins % 60 : ''}` : `${mins}м`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-[var(--color-text-secondary)] block mb-2">Время</label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { value: 'morning', label: '🌅' },
                  { value: 'afternoon', label: '☀️' },
                  { value: 'evening', label: '🌙' },
                ].map(time => (
                  <button
                    key={time.value}
                    onClick={() => setPreferences(p => ({ ...p, preferredTime: time.value as any }))}
                    className={`py-2 rounded-lg text-lg transition-colors ${
                      preferences.preferredTime === time.value
                        ? 'bg-[var(--color-primary)]'
                        : 'bg-[var(--color-surface)] hover:bg-white/5'
                    }`}
                  >
                    {time.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={generateSchedule} className="btn-practicum w-full text-sm">
              Сгенерировать
            </button>

            {schedule.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-[var(--color-border)]">
                <p className="text-xs text-[var(--color-text-secondary)] text-center">
                  {schedule.length} занятий запланировано
                </p>
                <button
                  onClick={() => downloadICS(schedule)}
                  className="btn-practicum-outline w-full flex items-center justify-center gap-2 text-sm py-2"
                >
                  <Download className="w-4 h-4" />
                  .ics
                </button>
                <a
                  href={generateGoogleCalendarUrl(schedule[0])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-practicum-outline w-full flex items-center justify-center gap-2 text-sm py-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Google
                </a>
                <button
                  onClick={clearSchedule}
                  className="w-full flex items-center justify-center gap-2 text-sm py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Очистить расписание
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar - 3 columns */}
        <div className="xl:col-span-3">
          <Card>
            <CardContent className="p-5">
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="px-3 py-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white transition-colors"
                >
                  ←
                </button>
                <h3 className="text-lg font-semibold text-white">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="px-3 py-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-white/5 hover:text-white transition-colors"
                >
                  →
                </button>
              </div>

              {/* Day names */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map(day => (
                  <div key={day} className="text-center text-xs text-[var(--color-text-secondary)] py-2 font-medium">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day, i) => {
                  if (!day) return <div key={i} className="aspect-square" />
                  
                  const { studyEvents, custom } = getEventsForDay(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  const isSelected = selectedDate?.toDateString() === day.toDateString()
                  const hasEvents = studyEvents.length > 0 || custom.length > 0
                  
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedDate(day)}
                      className={`aspect-square p-1 rounded-xl border transition-all flex flex-col items-center justify-start ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20'
                          : isToday
                          ? 'border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10'
                          : 'border-transparent hover:border-[var(--color-border)] hover:bg-white/5'
                      }`}
                    >
                      <span className={`text-sm font-medium ${isToday ? 'text-[var(--color-primary)]' : 'text-white'}`}>
                        {day.getDate()}
                      </span>
                      {hasEvents && (
                        <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                          {studyEvents.slice(0, 2).map((_, idx) => (
                            <div key={idx} className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                          ))}
                          {custom.slice(0, 2).map((_, idx) => (
                            <div key={idx} className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Day Modal */}
      {selectedDate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedDate(null)}>
          <Card className="w-full max-w-md" onClick={e => e.stopPropagation()}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                <button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-white/5 rounded-lg">
                  <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </button>
              </div>

              {/* Events list */}
              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                {getEventsForDay(selectedDate).studyEvents.map(event => (
                  <div key={event.id} className="p-3 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                          <span className="text-sm text-white font-medium truncate">{event.title}</span>
                        </div>
                        {'goalTitle' in event && event.goalTitle && (
                          <span className="text-xs text-[var(--color-text-secondary)] ml-4 block truncate">
                            {event.goalTitle}
                          </span>
                        )}
                        {editingEventId === event.id ? (
                          <div className="flex items-center gap-2 ml-4 mt-2">
                            <input
                              type="time"
                              value={editingTime}
                              onChange={e => setEditingTime(e.target.value)}
                              className="w-28 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-2 py-1.5 text-white text-sm"
                              style={{ colorScheme: 'dark' }}
                            />
                            <button 
                              onClick={() => saveEventTime(event.id)} 
                              className="p-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg"
                            >
                              <Check className="w-4 h-4 text-green-400" />
                            </button>
                            <button 
                              onClick={() => setEditingEventId(null)} 
                              className="p-1.5 hover:bg-white/10 rounded-lg"
                            >
                              <X className="w-4 h-4 text-[var(--color-text-secondary)]" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--color-text-secondary)] ml-4">
                            {new Date(event.startTime).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {editingEventId !== event.id && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); startEditingEvent(event) }} 
                            className="p-2 bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/30 rounded-lg transition-colors"
                            title="Изменить время"
                          >
                            <Edit2 className="w-4 h-4 text-[var(--color-primary)]" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteScheduleEvent(event.id) }} 
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {getEventsForDay(selectedDate).custom.map(event => (
                  <div key={event.id} className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-sm text-white font-medium">{event.title}</span>
                      </div>
                      <span className="text-xs text-[var(--color-text-secondary)] ml-4">{event.time}</span>
                    </div>
                    <button onClick={() => deleteCustomEvent(event.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ))}
                {getEventsForDay(selectedDate).studyEvents.length === 0 && getEventsForDay(selectedDate).custom.length === 0 && (
                  <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">Нет запланированных дел</p>
                )}
              </div>

              {/* Add new event */}
              <div className="border-t border-[var(--color-border)] pt-4">
                <p className="text-sm text-[var(--color-text-secondary)] mb-2">Добавить дело</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEventTitle}
                    onChange={e => setNewEventTitle(e.target.value)}
                    placeholder="Название..."
                    className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-white text-sm"
                  />
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={e => setNewEventTime(e.target.value)}
                    className="w-24 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-2 py-2 text-white text-sm"
                    style={{ colorScheme: 'dark' }}
                  />
                  <button onClick={addCustomEvent} className="p-2 bg-[var(--color-primary)] rounded-xl hover:opacity-90">
                    <Plus className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
