'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Target, Calendar, Trash2, MoreVertical, Play, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { formatDate, calculateProgress } from '@/lib/utils'

interface Goal {
  id: string
  title: string
  skill: string
  status: string
  targetDate: string | null
  topics: any[]
  createdAt: string
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchGoals()
  }, [])

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals')
      if (res.ok) setGoals(await res.json())
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const deleteGoal = async (id: string) => {
    if (!confirm('Удалить этот курс?')) return
    try {
      const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
      if (res.ok) setGoals(goals.filter(g => g.id !== id))
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const exportToICS = (goal: Goal) => {
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    }

    const now = new Date()
    const targetDate = goal.targetDate ? new Date(goal.targetDate) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    
    let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//AI Study Agent//RU
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${goal.id}@ai-study-agent
DTSTAMP:${formatICSDate(now)}
DTSTART:${formatICSDate(now)}
DTEND:${formatICSDate(targetDate)}
SUMMARY:${goal.title}
DESCRIPTION:Курс: ${goal.skill}\\nТем: ${goal.topics.length}
STATUS:CONFIRMED
END:VEVENT
`

    // Add events for each topic
    goal.topics.forEach((topic, index) => {
      const topicStart = new Date(now.getTime() + index * 2 * 24 * 60 * 60 * 1000)
      const topicEnd = new Date(topicStart.getTime() + 2 * 60 * 60 * 1000)
      icsContent += `BEGIN:VEVENT
UID:${topic.id}@ai-study-agent
DTSTAMP:${formatICSDate(now)}
DTSTART:${formatICSDate(topicStart)}
DTEND:${formatICSDate(topicEnd)}
SUMMARY:${topic.name}
DESCRIPTION:Тема курса "${goal.title}"
STATUS:CONFIRMED
END:VEVENT
`
    })

    icsContent += 'END:VCALENDAR'

    // Download file
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${goal.title.replace(/[^a-zA-Zа-яА-Я0-9]/g, '_')}.ics`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getGoalProgress = (goal: Goal) => {
    const completed = goal.topics.filter(t => {
      const progress = Array.isArray(t.progress) ? t.progress[0] : t.progress
      return progress?.status === 'COMPLETED' || progress?.status === 'MASTERED'
    }).length
    return calculateProgress(completed, goal.topics.length)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Мои курсы</h1>
          <p className="text-[var(--color-text-secondary)] mt-1">Управляй своим обучением</p>
        </div>
        <Link href="/goals/new">
          <button className="btn-practicum flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Новый курс
          </button>
        </Link>
      </div>

      {/* Goals Grid */}
      {goals.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map(goal => {
            const progress = getGoalProgress(goal)
            const completedTopics = goal.topics.filter(t => {
              const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
              return p?.status === 'COMPLETED' || p?.status === 'MASTERED'
            }).length

            return (
              <div key={goal.id} className="course-card group relative">
                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                  <button
                    onClick={(e) => { e.preventDefault(); exportToICS(goal) }}
                    className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
                    title="Экспорт в календарь (.ics)"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); deleteGoal(goal.id) }}
                    className="p-2 rounded-lg text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <Link href={`/goals/${goal.id}`}>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="course-card-icon">
                      <Target className="w-8 h-8 text-[var(--color-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate group-hover:text-[var(--color-primary)] transition-colors">
                        {goal.title}
                      </h3>
                      <p className="text-sm text-[var(--color-text-secondary)]">{goal.skill}</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[var(--color-text-secondary)]">Прогресс</span>
                      <span className="font-semibold text-[var(--color-primary)]">{progress}%</span>
                    </div>
                    <div className="progress-practicum">
                      <div className="progress-practicum-fill" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                      <span>{completedTopics}/{goal.topics.length} тем</span>
                      {goal.targetDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(goal.targetDate)}
                        </span>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-4 h-4 text-white ml-0.5" />
                    </div>
                  </div>
                </Link>

                {/* Bottom progress bar */}
                <div className="course-card-progress">
                  <div className="course-card-progress-fill" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )
          })}

          {/* Add new */}
          <Link href="/goals/new">
            <div className="course-card border-dashed flex flex-col items-center justify-center text-center min-h-[200px] group hover:border-[var(--color-primary)]">
              <div className="w-16 h-16 rounded-2xl bg-[var(--color-border)] flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary)]/10 transition-colors">
                <Plus className="w-8 h-8 text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] transition-colors" />
              </div>
              <p className="font-medium text-[var(--color-text-secondary)] group-hover:text-white transition-colors">
                Добавить курс
              </p>
              <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                AI создаст план обучения
              </p>
            </div>
          </Link>
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-24 h-24 bg-[var(--color-bg-secondary)] rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Target className="w-12 h-12 text-[var(--color-text-secondary)]" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Нет курсов</h3>
            <p className="text-[var(--color-text-secondary)] mb-6 max-w-md mx-auto">
              Создай свой первый курс и AI построит персональный план обучения
            </p>
            <Link href="/goals/new">
              <button className="btn-practicum">
                <Plus className="w-5 h-5 mr-2 inline" />
                Создать курс
              </button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

