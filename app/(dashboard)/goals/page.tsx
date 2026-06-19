'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Books,
  DotsThreeVertical,
  FolderPlus,
  MagnifyingGlass,
  NotePencil,
  Plus,
  SortAscending,
} from '@phosphor-icons/react'
import { calculateOverallProgress } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { fetchWithTimeout, isAbortError } from '@/lib/fetch-with-timeout'
import type { Module, Topic } from '@/types'

interface GoalWithModules {
  id: string
  title: string
  skill: string
  status: string
  targetDate: string | null
  modules: Module[]
  createdAt: string
}

export default function GoalsPage() {
  const { user } = useAppStore()
  const [goals, setGoals] = useState<GoalWithModules[]>([])
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const res = await fetchWithTimeout('/api/goals')
        if (res.ok) setGoals(await res.json())
      } catch (error) {
        if (!isAbortError(error)) console.error(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGoals()
  }, [])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return goals
    return goals.filter((goal) => `${goal.title} ${goal.skill}`.toLowerCase().includes(normalized))
  }, [goals, query])

  return (
    <div className="space-y-7">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#edf6e7] text-[var(--color-text)]">
            <Books size={32} weight="duotone" />
          </span>
          <div>
            <h1 className="text-[34px] font-black tracking-[-0.03em] text-[var(--color-text)]">
              Добрый день, {user?.name || 'студент'}
            </h1>
            <p className="mt-1 text-base font-medium text-[var(--color-text-secondary)]">
              Над каким учебным набором вы работаете сегодня?
            </p>
          </div>
        </div>

        <Link href="/goals/new" className="btn-practicum h-12 px-6">
          <Plus size={19} weight="bold" />
          Создать набор
        </Link>
      </section>

      <section className="flex flex-col gap-3 lg:flex-row">
        <label className="flex h-16 flex-1 items-center gap-3 rounded-[16px] border border-[var(--color-border)] bg-white px-5 shadow-sm">
          <MagnifyingGlass size={24} className="text-[var(--color-text-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-[var(--color-text)] outline-none placeholder:text-[#8b978f]"
            placeholder="Поиск учебных наборов..."
          />
          <span className="hidden h-8 w-px bg-[var(--color-border)] sm:block" />
          <SortAscending size={24} className="hidden text-[var(--color-text-muted)] sm:block" />
        </label>

        <Link
          href="/learn"
          className="flex h-16 items-center justify-center gap-3 rounded-[16px] border border-[#005cff] bg-white px-6 text-base font-black text-[#005cff] shadow-sm hover:bg-blue-50"
        >
          <NotePencil size={22} weight="duotone" />
          Материалы
        </Link>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Link href="/goals/new" className="flex min-h-[300px] flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#cfd9d2] bg-[#fafbf9] p-8 text-center transition hover:border-[#a8b8ad] hover:bg-white">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e4e9e5] text-[var(--color-text-secondary)]">
            <FolderPlus size={30} weight="duotone" />
          </span>
          <h2 className="mt-6 text-xl font-black text-[var(--color-text)]">Создать учебный набор</h2>
          <p className="mt-2 max-w-[28ch] text-sm font-medium leading-6 text-[var(--color-text-secondary)]">
            Создайте новый набор, чтобы организовать материалы, практику и повторения.
          </p>
        </Link>

        {filtered.map((goal, index) => (
          <StudySetCard key={goal.id} goal={goal} index={index} />
        ))}
      </section>
    </div>
  )
}

function StudySetCard({ goal, index }: { goal: GoalWithModules; index: number }) {
  const topics = getAllTopics(goal)
  const progress = calculateOverallProgress(goal.modules || [])
  const imageBg = index % 2 === 0 ? '#ffc38f' : '#ffdce7'

  return (
    <Link href={`/goals/${goal.id}`} className="practicum-card min-h-[300px] p-5 hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[12px]" style={{ background: imageBg }}>
          <Books size={38} weight="duotone" className="text-[var(--color-text)]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h2 className="min-w-0 flex-1 truncate text-[21px] font-black tracking-[-0.02em] text-[var(--color-text)]">
              {goal.title}
            </h2>
            <DotsThreeVertical size={22} className="text-[var(--color-text-muted)]" />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#edf2ee]">
            <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-2 text-right text-sm font-bold text-[var(--color-text-secondary)]">{progress}%</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="badge-practicum">
          <NotePencil size={15} />
          {topics.length} материалов
        </span>
        <span className="badge-practicum">
          <Books size={15} />
          {goal.modules?.length || 0} модулей
        </span>
      </div>

      <div className="mt-7 border-t border-[var(--color-border)] pt-5">
        <div className="flex items-center justify-between text-sm font-bold text-[var(--color-text-muted)]">
          <span>Последнее изучение</span>
          <span>{index === 0 ? 'Только что' : '15m назад'}</span>
        </div>
        <div className="mt-3 rounded-[12px] bg-[#f4f6f4] px-4 py-3 text-sm font-black text-[var(--color-text)]">
          {topics[0]?.name || goal.skill || 'Начать обучение'}
        </div>
      </div>
    </Link>
  )
}

function getAllTopics(goal: GoalWithModules): Topic[] {
  if (!goal.modules) return []
  return goal.modules.flatMap((module) => module.topics || [])
}
