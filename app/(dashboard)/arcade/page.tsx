'use client'

import { useEffect, useMemo, useState } from 'react'
import { GameController, Lightning, Trophy } from '@phosphor-icons/react'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

interface Topic {
  id: string
  name: string
}

const fallbackTopics = [
  { id: '1', name: 'Основы темы' },
  { id: '2', name: 'Ключевые термины' },
  { id: '3', name: 'Практический пример' },
  { id: '4', name: 'Типичная ошибка' },
]

export default function ArcadePage() {
  const [topics, setTopics] = useState<Topic[]>(fallbackTopics)
  const [round, setRound] = useState(0)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [answered, setAnswered] = useState<string | null>(null)

  useEffect(() => {
    const saved = Number(localStorage.getItem('arcadeBestScore') || 0)
    setBestScore(saved)

    fetchWithTimeout('/api/goals')
      .then((res) => (res.ok ? res.json() : []))
      .then((goals) => {
        const loaded = goals.flatMap((goal: any) =>
          (goal.modules || []).flatMap((module: any) => module.topics || [])
        )
        if (loaded.length) setTopics(loaded)
      })
      .catch(() => undefined)
  }, [])

  const question = useMemo(() => {
    const current = topics[round % topics.length]
    const wrong = topics.filter((topic) => topic.id !== current.id).slice(0, 3)
    const options = [...wrong, current].sort((a, b) => a.name.localeCompare(b.name))
    return { current, options }
  }, [topics, round])

  const answer = (id: string) => {
    if (answered) return
    setAnswered(id)
    const correct = id === question.current.id
    const nextScore = correct ? score + 10 : Math.max(0, score - 5)
    setScore(nextScore)
    if (nextScore > bestScore) {
      setBestScore(nextScore)
      localStorage.setItem('arcadeBestScore', String(nextScore))
    }
    window.setTimeout(() => {
      setAnswered(null)
      setRound((value) => value + 1)
    }, 650)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="study-dark-panel practicum-card bg-[#101816] p-6 text-white sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-white/70">Аркада</p>
            <h1 className="mt-2 text-[34px] font-black tracking-[-0.03em] text-white">Быстрая практика</h1>
            <p className="mt-2 max-w-[58ch] text-sm font-semibold leading-6 text-white/70">
              Игровой режим: выберите правильную тему по описанию и набирайте очки.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <Stat icon={Lightning} label="Очки" value={score} />
            <Stat icon={Trophy} label="Рекорд" value={bestScore} />
          </div>
        </div>
      </section>

      <section className="practicum-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#fff0d8]">
            <GameController size={26} weight="duotone" />
          </span>
          <div>
            <p className="text-sm font-bold text-[var(--color-text-muted)]">Раунд {round + 1}</p>
            <h2 className="text-2xl font-black text-[var(--color-text)]">Какая тема подходит?</h2>
          </div>
        </div>

        <div className="mt-6 rounded-[18px] bg-[#f8faf7] p-5 text-lg font-black text-[var(--color-text)]">
          Разберите: “{question.current.name}”
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {question.options.map((option) => {
            const isChosen = answered === option.id
            const isCorrect = option.id === question.current.id
            return (
              <button
                key={option.id}
                onClick={() => answer(option.id)}
                className={`rounded-[16px] border px-5 py-4 text-left text-sm font-black transition ${
                  isChosen
                    ? isCorrect
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-red-300 bg-red-50 text-red-700'
                    : 'border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]'
                }`}
              >
                {option.name}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-[16px] bg-white/10 px-5 py-4">
      <Icon size={22} className="mx-auto text-[#c6ff4d]" weight="duotone" />
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="text-xs font-bold text-white/60">{label}</p>
    </div>
  )
}
