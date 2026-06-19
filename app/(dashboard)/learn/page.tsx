'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Books,
  CalendarCheck,
  CheckCircle,
  Clock,
  Graph,
  Plus,
  Target,
} from '@phosphor-icons/react'
import { calculateOverallProgress } from '@/lib/utils'
import { fetchWithTimeout, isAbortError } from '@/lib/fetch-with-timeout'

interface Topic {
  id: string
  name: string
  estimatedMinutes?: number
  progress?: { status?: string; mastery?: number } | Array<{ status?: string; mastery?: number }>
}

interface Module {
  id: string
  name: string
  description?: string | null
  order?: number
  topics: Topic[]
}

interface Goal {
  id: string
  title: string
  skill: string
  modules: Module[]
}

export default function LearnPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [activeGoalId, setActiveGoalId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const res = await fetchWithTimeout('/api/goals')
        if (res.ok) {
          const data = await res.json()
          setGoals(data)
          setActiveGoalId(data[0]?.id || null)
        }
      } catch (error) {
        if (!isAbortError(error)) console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGoals()
  }, [])

  const activeGoal = useMemo(
    () => goals.find((goal) => goal.id === activeGoalId) || goals[0],
    [goals, activeGoalId]
  )
  const modules = activeGoal?.modules || []
  const topics = modules.flatMap((module) => module.topics || [])
  const progress = activeGoal ? calculateOverallProgress(activeGoal.modules as any) : 0
  const nextTopic = topics.find((topic) => getTopicStatus(topic) !== 'COMPLETED' && getTopicStatus(topic) !== 'MASTERED') || topics[0]
  const totalMinutes = topics.reduce((sum, topic) => sum + (topic.estimatedMinutes || 0), 0)

  if (!activeGoal) {
    return (
      <div className="practicum-card flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#edf6e7] text-[var(--color-text)]">
          <Books size={32} weight="duotone" />
        </span>
        <h1 className="mt-5 text-2xl font-black text-[var(--color-text)]">Создайте первый учебный набор</h1>
        <p className="mt-2 max-w-[44ch] text-sm font-medium leading-6 text-[var(--color-text-secondary)]">
          Учебный план появится здесь после создания курса: темы, порядок прохождения, практика и повторение.
        </p>
        <Link href="/goals/new" className="btn-practicum mt-6 px-6">
          <Plus size={18} weight="bold" />
          Создать набор
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="practicum-card p-6 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--color-text-muted)]">Учебный план</p>
              <h1 className="mt-2 text-[34px] font-black tracking-[-0.03em] text-[var(--color-text)]">
                {activeGoal.title}
              </h1>
              <p className="mt-2 max-w-[70ch] text-base font-medium leading-7 text-[var(--color-text-secondary)]">
                План разбит на модули и темы. Открывайте тему, проходите урок, затем закрепляйте карточками или тестом.
              </p>
            </div>

            <select
              value={activeGoal.id}
              onChange={(event) => setActiveGoalId(event.target.value)}
              className="h-12 rounded-[14px] border border-[var(--color-border)] bg-white px-4 text-sm font-bold text-[var(--color-text)] outline-none"
            >
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Metric icon={Target} label="Прогресс" value={`${progress}%`} />
            <Metric icon={Books} label="Тем" value={topics.length} />
            <Metric icon={Clock} label="План" value={`${Math.max(1, Math.round(totalMinutes / 60))} ч`} />
          </div>
        </div>

        <aside className="study-dark-panel practicum-card bg-[#101816] p-6 text-white">
          <span className="flex h-13 w-13 items-center justify-center rounded-[16px] bg-[#c6ff4d] text-[#101816]">
            <CalendarCheck size={26} weight="duotone" />
          </span>
          <h2 className="mt-5 text-2xl font-black text-white">Следующий шаг</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
            {nextTopic ? nextTopic.name : 'Добавьте темы в учебный набор'}
          </p>
          {nextTopic ? (
            <Link href={`/learn/${nextTopic.id}`} className="mt-6 flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white/10 text-sm font-black text-white hover:bg-white/15">
              Открыть урок
              <ArrowRight size={18} weight="bold" />
            </Link>
          ) : (
            <Link href="/goals/new" className="mt-6 flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white/10 text-sm font-black text-white hover:bg-white/15">
              Добавить материалы
              <ArrowRight size={18} weight="bold" />
            </Link>
          )}
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {modules.map((module, moduleIndex) => (
            <div key={module.id} className="practicum-card p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#edf6e7] text-sm font-black text-[var(--color-text)]">
                  {String(moduleIndex + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black text-[var(--color-text)]">{module.name}</h2>
                  {module.description && (
                    <p className="mt-1 text-sm font-medium text-[var(--color-text-secondary)]">{module.description}</p>
                  )}

                  <div className="mt-5 space-y-2">
                    {(module.topics || []).map((topic, topicIndex) => {
                      const status = getTopicStatus(topic)
                      const completed = status === 'COMPLETED' || status === 'MASTERED'
                      return (
                        <Link
                          key={topic.id}
                          href={`/learn/${topic.id}`}
                          className="flex items-center gap-3 rounded-[14px] border border-[var(--color-border)] bg-[#f8faf7] px-4 py-3 hover:bg-white"
                        >
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${completed ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-[var(--color-text-muted)]'}`}>
                            {completed ? <CheckCircle size={18} weight="fill" /> : topicIndex + 1}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-[var(--color-text)]">{topic.name}</span>
                            <span className="text-xs font-semibold text-[var(--color-text-muted)]">{topic.estimatedMinutes || 10} мин</span>
                          </span>
                          <ArrowRight size={18} className="text-[var(--color-text-muted)]" />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <aside className="space-y-4">
          <Link href="/review?mode=quiz" className="practicum-card block p-5 hover:-translate-y-0.5">
            <Graph size={24} className="text-[#1f78ff]" />
            <h3 className="mt-3 text-lg font-black text-[var(--color-text)]">Проверить знания</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-secondary)]">
              Сгенерировать тест по теме и сразу пройти его.
            </p>
          </Link>
          <Link href="/review?mode=generate-cards" className="practicum-card block p-5 hover:-translate-y-0.5">
            <Books size={24} className="text-emerald-600" />
            <h3 className="mt-3 text-lg font-black text-[var(--color-text)]">Создать карточки</h3>
            <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-secondary)]">
              Собрать повторение для слабых мест.
            </p>
          </Link>
        </aside>
      </section>
    </div>
  )
}

function getTopicStatus(topic: Topic) {
  const progress = Array.isArray(topic.progress) ? topic.progress[0] : topic.progress
  return progress?.status || 'NOT_STARTED'
}

function Metric({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[#f8faf7] p-4">
      <Icon size={22} weight="duotone" className="text-[var(--color-text-secondary)]" />
      <p className="mt-3 text-[24px] font-black leading-none text-[var(--color-text)]">{value}</p>
      <p className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">{label}</p>
    </div>
  )
}
