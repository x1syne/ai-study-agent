'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  Books,
  Brain,
  Cards,
  ChartLineUp,
  CheckCircle,
  Clock,
  Exam,
  Graph,
  ListChecks,
  Plus,
  Target,
} from '@phosphor-icons/react'
import { calculateOverallProgress } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { SessionTimer } from '@/components/common/SessionTimer'
import { fetchWithTimeout, isAbortError } from '@/lib/fetch-with-timeout'
import type { Module, Topic } from '@/types'

interface GoalWithModules {
  id: string
  title: string
  skill: string
  status: string
  modules: Module[]
  createdAt: string
}

interface Stats {
  currentStreak: number
  longestStreak: number
  totalMinutes: number
  totalLessons: number
  totalTasks: number
  totalXP: number
  level: number
}

const featureCards = [
  {
    title: 'QuizFetch',
    text: 'Проверка по текущим темам',
    href: '/review?mode=quiz',
    icon: ListChecks,
    bg: 'bg-[#a8f3f0]',
  },
  {
    title: 'Карточки',
    text: 'Повторение слабых мест',
    href: '/review?mode=cards',
    icon: Cards,
    bg: 'bg-[#90a9ff]',
  },
  {
    title: 'Репетитор',
    text: 'Разбор ошибок в контексте',
    href: '/chat?mode=tutor',
    icon: Brain,
    bg: 'bg-[#d9c8ff]',
  },
]

const selfStudy = [
  { title: 'Добавить материалы', text: 'PDF, заметки, статьи или программа курса', href: '/goals/new', icon: Plus },
  { title: 'Пройти тест', text: 'Быстрая диагностика понимания', href: '/review?mode=test', icon: Exam },
  { title: 'Создать карточки', text: 'Собрать повторение из тем', href: '/review?mode=generate-cards', icon: Cards },
  { title: 'Спросить наставника', text: 'Разобрать тему или ошибку', href: '/chat?mode=tutor', icon: Brain },
]

export default function DashboardPage() {
  const { user } = useAppStore()
  const [goals, setGoals] = useState<GoalWithModules[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [goalsResult, statsResult] = await Promise.allSettled([
          fetchWithTimeout('/api/goals'),
          fetchWithTimeout('/api/stats'),
        ])
        if (goalsResult.status === 'fulfilled' && goalsResult.value.ok) {
          setGoals(await goalsResult.value.json())
        }
        if (statsResult.status === 'fulfilled' && statsResult.value.ok) {
          const statsRes = statsResult.value
          const data = await statsRes.json()
          setStats(data.stats)
        }
        if (goalsResult.status === 'rejected' && !isAbortError(goalsResult.reason)) console.error(goalsResult.reason)
        if (statsResult.status === 'rejected' && !isAbortError(statsResult.reason)) console.error(statsResult.reason)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const activeGoal = goals[0]
  const topics = useMemo(() => getAllTopics(activeGoal), [activeGoal])
  const progress = activeGoal ? calculateOverallProgress(activeGoal.modules || []) : 0
  const userName = user?.name?.split(' ')[0] || 'студент'
  const dateLabel = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  const recommendedTopics = topics.length
    ? topics.slice(0, 6)
    : ['Диагностика уровня', 'Первый модуль', 'Практика', 'Повторение', 'Проект'].map((name, index) => ({ id: `${index}`, name }) as Topic)

  return (
    <div className="space-y-7">
      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="practicum-card p-6 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-bold capitalize text-[var(--color-text-muted)]">{dateLabel}</p>
              <h1 className="mt-2 text-[34px] font-black leading-tight tracking-[-0.03em] text-[var(--color-text)] sm:text-[42px]">
                Добрый день, {userName}
              </h1>
              <p className="mt-2 max-w-[62ch] text-base font-medium leading-7 text-[var(--color-text-secondary)]">
                Рабочее пространство для курса: учебный план, практика, карточки и наставник собраны вокруг одного набора.
              </p>
            </div>
            <Link href="/goals/new" className="btn-practicum h-12 px-5">
              <Plus size={19} weight="bold" />
              Новый набор
            </Link>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Books} label="Тем в наборе" value={topics.length || 0} />
            <Metric icon={CheckCircle} label="Освоено" value={`${progress}%`} />
            <Metric icon={Clock} label="Сессия" value={<SessionTimer />} />
            <Metric icon={ChartLineUp} label="XP всего" value={stats?.totalXP || 0} />
          </div>
        </div>

        <aside className="study-dark-panel practicum-card overflow-hidden bg-[#101816] p-6 text-white">
          <div className="flex items-center justify-between">
            <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#c6ff4d] text-[#101816]">
              <Target size={27} weight="fill" />
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-black text-white">{progress}%</span>
          </div>
          <h2 className="mt-6 text-2xl font-black text-white">{activeGoal?.title || 'My First Study Set'}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/70">
            Следующий шаг: пройти короткую проверку, затем закрепить тему карточками.
          </p>
          <div className="mt-6 h-2 rounded-full bg-white/10">
            <div className="h-full rounded-full bg-[#c6ff4d]" style={{ width: `${Math.max(progress, 8)}%` }} />
          </div>
          <Link href="/learn" className="mt-7 flex h-12 items-center justify-center gap-2 rounded-[14px] bg-white/10 text-sm font-black text-white hover:bg-white/15">
            Посмотреть учебный план
            <ArrowRight size={18} weight="bold" />
          </Link>
        </aside>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-[22px] font-black tracking-[-0.02em] text-[var(--color-text)]">
            <Graph size={24} className="text-emerald-600" />
            Рекомендовано из вашего учебного плана
          </h2>
          <Link href="/learn" className="btn-practicum-outline h-10 px-4">
            Посмотреть полный план
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2">
          {recommendedTopics.map((topic, index) => (
            <Link
              key={topic.id || topic.name}
              href={'id' in topic && topic.id ? `/learn/${topic.id}` : '/learn'}
              className="min-w-[235px] rounded-[16px] border border-[var(--color-border)] bg-white px-4 py-3 shadow-sm hover:border-[var(--color-border-light)]"
            >
              <span className="text-xs font-black text-[var(--color-text-muted)]">{String(index + 1).padStart(2, '0')}</span>
              <span className="ml-3 text-sm font-black text-[var(--color-text)]">{topic.name}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-[22px] bg-[#dfe9ff] p-5 sm:p-6">
        <div className="mb-4">
          <p className="text-sm font-bold text-[#5b6680]">
            Тема 1 из {Math.max(topics.length, 1)} в {activeGoal?.title || 'учебном наборе'}
          </p>
          <h2 className="mt-1 text-[24px] font-black tracking-[-0.02em] text-[var(--color-text)]">
            {recommendedTopics[0]?.name || 'Начните с диагностики'}
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {featureCards.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.title} href={item.href} className="overflow-hidden rounded-[18px] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className={`flex h-40 items-center justify-center ${item.bg}`}>
                  <div className="rounded-[18px] bg-white px-8 py-5 text-center text-sm font-black text-[var(--color-text)] shadow-sm">
                    {item.text}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4">
                  <Icon size={22} className="text-[#1f78ff]" weight="duotone" />
                  <span className="text-base font-black text-[var(--color-text)]">{item.title}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[22px] font-black tracking-[-0.02em] text-[var(--color-text)]">Или начните учиться по-своему</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {selfStudy.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.title} href={item.href} className="practicum-card p-5 hover:-translate-y-0.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#edf6e7] text-[var(--color-text)]">
                  <Icon size={22} weight="duotone" />
                </span>
                <h3 className="mt-4 text-base font-black text-[var(--color-text)]">{item.title}</h3>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-secondary)]">{item.text}</p>
              </Link>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function getAllTopics(goal?: GoalWithModules): Topic[] {
  if (!goal?.modules) return []
  return goal.modules.flatMap((module) => module.topics || [])
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-[16px] border border-[var(--color-border)] bg-[#f8faf7] p-4">
      <Icon size={22} weight="duotone" className="text-[var(--color-text-secondary)]" />
      <p className="mt-3 text-[24px] font-black leading-none text-[var(--color-text)]">{value}</p>
      <p className="mt-1 text-xs font-bold text-[var(--color-text-muted)]">{label}</p>
    </div>
  )
}
