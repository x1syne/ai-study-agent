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

export default function SchedulePage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedGoal, setSelectedGoal] = useState<string>('')
  const [schedule, setSchedule] = useState<StudyEvent[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>([])
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventTime, setNewEventTime] = useState('09:00')
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingTime, setEditingTime] = useState('')
  const [preferences, setPreferences] = useState({
    startDate: new Date(),
    daysPerWeek: 5,
    minutesPerDay: 45,
    preferredTime: 'evening' as 'morning' | 'afternoon' | 'evening',
  })

  useEffect(() => {
    fetch('/api/goals').then(res => res.json()).then(data => {
      setGoals(data)
      if (data.length > 0) setSelectedGoal(data[0].id)
    }).catch(console.error)
    const savedCustom = localStorage.getItem('customEvents')
    if (savedCustom) setCustomEvents(JSON.parse(savedCustom))
    const savedSchedule = localStorage.getItem('studySchedule')
    if (savedSchedule) {
      const parsed = JSON.parse(savedSchedule)
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

  const handleGenerate = () => {
    const goal = goals.find(g => g.id === selectedGoal)
    if (!goal) return
    setSchedule(generateStudySchedule(goal.topics, preferences))
  }

  const handleDeleteEvent = (eventId: string) => setSchedule(schedule.filter(e => e.id !== eventId))
  const handleStartEdit = (eventId: string, time: string) => { setEditingEventId(eventId); setEditingTime(time) }
  const handleSaveTime = (eventId: string) => {
    setSchedule(schedule.map(event => {
      if (event.id !== eventId) return event
      const [h, m] = editingTime.split(':').map(Number)
      const newStart = new Date(event.startTime)
      newStart.setHours(h, m, 0, 0)
      const dur = new Date(event.endTime).getTime() - new Date(event.startTime).getTime()
      return { ...event, startTime: newStart, endTime: new Date(newStart.getTime() + dur) }
    }))
    setEditingEventId(null)
  }
  const handleClearSchedule = () => { setSchedule([]); localStorage.removeItem('studySchedule') }
  const getMonthDays = () => {
    const y = currentMonth.getFullYear(), mo = currentMonth.getMonth()
    const first = new Date(y, mo, 1), last = new Date(y, mo + 1, 0)
    const days: (Date | null)[] = []
    const start = first.getDay() === 0 ? 6 : first.getDay() - 1
    for (let i = 0; i < start; i++) days.push(null)
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(y, mo, d))
    return days
  }
  const getEventsForDay = (date: Date) => {
    const ds = date.toDateString()
    return { studyEvents: schedule.filter(e => new Date(e.startTime).toDateString() === ds), custom: customEvents.filter(e => e.date === ds) }
  }
  const addCustomEvent = () => {
    if (!newEventTitle || !selectedDate) return
    setCustomEvents([...customEvents, { id: Date.now().toString(), title: newEventTitle, time: newEventTime, date: selectedDate.toDateString() }])
    setNewEventTitle('')
  }
  const removeCustomEvent = (id: string) => setCustomEvents(customEvents.filter(e => e.id !== id))
  const monthDays = getMonthDays()
  const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
  const dayNames = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  const formatTime = (d: Date) => { const dt = new Date(d); return `${dt.getHours().toString().padStart(2,'0')}:${dt.getMinutes().toString().padStart(2,'0')}` }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="practicum-hero"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-[var(--color-primary)]/20 flex items-center justify-center"><Calendar className="w-6 h-6 text-[var(--color-primary)]" /></div><div><h1 className="text-2xl font-bold text-white">Расписание</h1><p className="text-[var(--color-text-secondary)]">Планируй обучение</p></div></div></div>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <Card><CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-[var(--color-text-secondary)]"><Clock className="w-4 h-4" />Настройки</div>
          <div><label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Курс</label><select value={selectedGoal} onChange={e => setSelectedGoal(e.target.value)} className="w-full bg-[#1a1a2e] border border-[var(--color-border)] rounded-xl px-4 py-3 text-white">{goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></div>
          <div><label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Дней в неделю</label><div className="grid grid-cols-7 gap-1">{[1,2,3,4,5,6,7].map(d => <button key={d} onClick={() => setPreferences(p => ({...p, daysPerWeek: d}))} className={`py-2 rounded-lg text-sm ${preferences.daysPerWeek === d ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)]'}`}>{d}</button>)}</div></div>
          <div><label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Минут в день</label><div className="grid grid-cols-4 gap-1">{[30,45,60,90].map(m => <button key={m} onClick={() => setPreferences(p => ({...p, minutesPerDay: m}))} className={`py-2 rounded-lg text-sm ${preferences.minutesPerDay === m ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)]'}`}>{m}</button>)}</div></div>
          <div><label className="text-xs text-[var(--color-text-secondary)] mb-1 block">Время</label><div className="grid grid-cols-3 gap-1">{[{v:'morning',l:'🌅'},{v:'afternoon',l:'☀️'},{v:'evening',l:'🌙'}].map(t => <button key={t.v} onClick={() => setPreferences(p => ({...p, preferredTime: t.v as 'morning'|'afternoon'|'evening'}))} className={`py-2 rounded-lg text-lg ${preferences.preferredTime === t.v ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-surface)]'}`}>{t.l}</button>)}</div></div>
          <button onClick={handleGenerate} className="btn-practicum w-full">Сгенерировать</button>
          {schedule.length > 0 && <div className="space-y-2 pt-2 border-t border-[var(--color-border)]"><p className="text-sm text-[var(--color-text-secondary)] text-center">{schedule.length} занятий</p><button onClick={() => { const normalizedSchedule = schedule.map(e => ({ ...e, startTime: new Date(e.startTime), endTime: new Date(e.endTime) })); downloadICS(normalizedSchedule) }} className="btn-practicum-outline w-full flex items-center justify-center gap-2"><Download className="w-4 h-4" />Скачать .ics</button><button onClick={() => { const firstEvent = schedule[0]; if (firstEvent) { const url = generateGoogleCalendarUrl({ ...firstEvent, startTime: new Date(firstEvent.startTime), endTime: new Date(firstEvent.endTime) }); window.open(url, '_blank') } }} className="btn-practicum-outline w-full flex items-center justify-center gap-2"><ExternalLink className="w-4 h-4" />Google Calendar</button><button onClick={handleClearSchedule} className="w-full text-red-400 hover:text-red-300 text-sm py-2"><Trash2 className="w-4 h-4 inline mr-1" />Очистить</button></div>}
        </CardContent></Card>
        <div className="xl:col-span-3"><Card><CardContent className="p-5">
          <div className="flex items-center justify-between mb-4"><button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-white/5 rounded-lg">←</button><h3 className="text-lg font-semibold text-white">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3><button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-white/5 rounded-lg">→</button></div>
          <div className="grid grid-cols-7 gap-1 mb-2">{dayNames.map(d => <div key={d} className="text-center text-xs text-[var(--color-text-secondary)] py-2">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">{monthDays.map((day, i) => { if (!day) return <div key={i} className="aspect-square" />; const ev = getEventsForDay(day); const isToday = day.toDateString() === new Date().toDateString(); const isSel = selectedDate?.toDateString() === day.toDateString(); return <button key={i} onClick={() => setSelectedDate(day)} className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-1 ${isSel ? 'bg-[var(--color-primary)]' : isToday ? 'bg-[var(--color-primary)]/20' : 'hover:bg-white/5'}`}><span className={`text-sm ${isSel || isToday ? 'font-bold' : ''}`}>{day.getDate()}</span>{(ev.studyEvents.length > 0 || ev.custom.length > 0) && <div className="flex gap-0.5">{ev.studyEvents.slice(0,2).map((_,idx) => <div key={idx} className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />)}{ev.custom.slice(0,2).map((_,idx) => <div key={idx} className="w-1.5 h-1.5 rounded-full bg-green-500" />)}</div>}</button> })}</div>
        </CardContent></Card></div>
      </div>

      {selectedDate && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDate(null)}><Card className="w-full max-w-md" onClick={e => e.stopPropagation()}><CardContent className="p-6">
        <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-white">{selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</h3><button onClick={() => setSelectedDate(null)} className="p-2 hover:bg-white/10 rounded-lg"><X className="w-5 h-5" /></button></div>
        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {getEventsForDay(selectedDate).studyEvents.map(ev => <div key={ev.id} className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]"><div className="flex items-center justify-between"><div className="flex-1"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[var(--color-primary)]" /><span className="text-sm text-white font-medium">{ev.title}</span></div>{editingEventId === ev.id ? <div className="flex items-center gap-2 mt-2"><input type="time" value={editingTime} onChange={e => setEditingTime(e.target.value)} className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-2 py-1 text-sm" /><button onClick={() => handleSaveTime(ev.id)} className="p-1.5 bg-green-500 rounded-lg"><Check className="w-4 h-4" /></button><button onClick={() => setEditingEventId(null)} className="p-1.5 hover:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button></div> : <span className="text-xs text-[var(--color-text-secondary)] ml-4">{formatTime(ev.startTime)} - {formatTime(ev.endTime)}</span>}</div>{editingEventId !== ev.id && <div className="flex items-center gap-1"><button onClick={() => handleStartEdit(ev.id, formatTime(ev.startTime))} className="p-1.5 hover:bg-white/10 rounded-lg"><Edit2 className="w-4 h-4 text-blue-400" /></button><button onClick={() => handleDeleteEvent(ev.id)} className="p-1.5 hover:bg-white/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button></div>}</div></div>)}
          {getEventsForDay(selectedDate).custom.map(ev => <div key={ev.id} className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-between"><div><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500" /><span className="text-sm text-white font-medium">{ev.title}</span></div><span className="text-xs text-[var(--color-text-secondary)] ml-4">{ev.time}</span></div><button onClick={() => removeCustomEvent(ev.id)} className="p-1.5 hover:bg-white/10 rounded-lg"><Trash2 className="w-4 h-4 text-red-400" /></button></div>)}
          {getEventsForDay(selectedDate).studyEvents.length === 0 && getEventsForDay(selectedDate).custom.length === 0 && <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">Нет событий</p>}
        </div>
        <div className="border-t border-[var(--color-border)] pt-4"><p className="text-sm text-[var(--color-text-secondary)] mb-2">Добавить дело</p><div className="flex gap-2"><input type="text" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="Название..." className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm" /><input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} className="w-24 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-2 py-2 text-sm" /><button onClick={addCustomEvent} className="p-2 bg-[var(--color-primary)] rounded-xl"><Plus className="w-5 h-5" /></button></div></div>
      </CardContent></Card></div>}
    </div>
  )
}
