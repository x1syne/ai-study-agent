'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Books, Headphones, PlayCircle, SpeakerHigh } from '@phosphor-icons/react'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

interface Topic {
  id: string
  name: string
}

export default function MediaPage() {
  const searchParams = useSearchParams()
  const mode = searchParams.get('mode') === 'audio' ? 'audio' : 'explain'
  const [topics, setTopics] = useState<Topic[]>([])
  const [selectedTopicId, setSelectedTopicId] = useState('')
  const selectedTopic = useMemo(() => topics.find((topic) => topic.id === selectedTopicId), [topics, selectedTopicId])

  useEffect(() => {
    fetchWithTimeout('/api/goals')
      .then((res) => (res.ok ? res.json() : []))
      .then((goals) => {
        const loaded = goals.flatMap((goal: any) =>
          (goal.modules || []).flatMap((module: any) => module.topics || [])
        )
        setTopics(loaded)
        setSelectedTopicId(loaded[0]?.id || '')
      })
      .catch(() => undefined)
  }, [])

  const speak = () => {
    if (!selectedTopic) return
    const utterance = new SpeechSynthesisUtterance(`Краткий аудиоконспект по теме: ${selectedTopic.name}. Откройте урок, чтобы изучить теорию и пройти практику.`)
    utterance.lang = 'ru-RU'
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  return (
    <div className="space-y-6">
      <section className="practicum-card p-6 sm:p-7">
        <p className="text-sm font-bold text-[var(--color-text-muted)]">Аудио и видео</p>
        <h1 className="mt-2 text-[34px] font-black tracking-[-0.03em] text-[var(--color-text)]">
          {mode === 'audio' ? 'Аудиоконспект' : 'Объяснения'}
        </h1>
        <p className="mt-2 max-w-[68ch] text-base font-medium leading-7 text-[var(--color-text-secondary)]">
          Выберите тему: можно открыть полноценный урок или прослушать короткое аудио-резюме через браузерный синтез речи.
        </p>
      </section>

      <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="practicum-card p-4">
          <h2 className="px-2 text-sm font-black text-[var(--color-text)]">Темы</h2>
          <div className="mt-3 space-y-2">
            {topics.length === 0 ? (
              <p className="rounded-[12px] bg-[#f8faf7] p-3 text-sm font-medium text-[var(--color-text-secondary)]">
                Создайте учебный набор, чтобы здесь появились темы.
              </p>
            ) : (
              topics.slice(0, 20).map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`w-full rounded-[12px] px-3 py-2 text-left text-sm font-bold ${
                    selectedTopicId === topic.id ? 'bg-[#edf6e7] text-[var(--color-text)]' : 'text-[var(--color-text-secondary)] hover:bg-[#f8faf7]'
                  }`}
                >
                  {topic.name}
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="practicum-card p-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-[#e9f4ff] text-[var(--color-text)]">
            {mode === 'audio' ? <Headphones size={32} weight="duotone" /> : <PlayCircle size={32} weight="duotone" />}
          </span>
          <h2 className="mt-5 text-2xl font-black text-[var(--color-text)]">
            {selectedTopic?.name || 'Выберите тему'}
          </h2>
          <p className="mt-2 max-w-[62ch] text-sm font-medium leading-6 text-[var(--color-text-secondary)]">
            {mode === 'audio'
              ? 'Слушайте краткий конспект, а затем переходите к уроку или практике.'
              : 'Откройте урок с теорией, примерами и заданиями по выбранной теме.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {selectedTopic && (
              <Link href={`/learn/${selectedTopic.id}`} className="btn-practicum px-6">
                <Books size={18} />
                Открыть урок
              </Link>
            )}
            <button onClick={speak} className="btn-practicum-outline px-6" disabled={!selectedTopic}>
              <SpeakerHigh size={18} />
              Прослушать
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
