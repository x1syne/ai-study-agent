'use client'

import { useMemo, useState } from 'react'
import { CheckCircle, NotePencil, WarningCircle } from '@phosphor-icons/react'

export default function EssayPage() {
  const [essay, setEssay] = useState('')
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const result = useMemo(() => scoreEssay(essay), [essay])

  const saveDraft = () => {
    localStorage.setItem('essayDraft', essay)
    localStorage.setItem('essayDraftSavedAt', new Date().toISOString())
    setSavedAt(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))
  }

  const loadDraft = () => {
    setEssay(localStorage.getItem('essayDraft') || '')
    const saved = localStorage.getItem('essayDraftSavedAt')
    setSavedAt(saved ? new Date(saved).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : null)
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="practicum-card p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[var(--color-text-muted)]">Оценщик эссе</p>
            <h1 className="mt-2 text-[34px] font-black tracking-[-0.03em] text-[var(--color-text)]">Проверка текста</h1>
            <p className="mt-2 max-w-[64ch] text-base font-medium leading-7 text-[var(--color-text-secondary)]">
              Вставьте эссе или развернутый ответ. Платформа оценит структуру, объем, аргументацию и даст список правок.
            </p>
          </div>
          <span className="hidden h-14 w-14 items-center justify-center rounded-[18px] bg-[#ffe3ec] text-[var(--color-text)] sm:flex">
            <NotePencil size={28} weight="duotone" />
          </span>
        </div>

        <textarea
          value={essay}
          onChange={(event) => setEssay(event.target.value)}
          className="mt-6 min-h-[430px] w-full resize-y rounded-[18px] border border-[var(--color-border)] bg-[#f8faf7] p-5 text-base font-medium leading-7 text-[var(--color-text)] outline-none focus:border-[#a2baaa] focus:ring-4 focus:ring-[rgba(198,255,77,0.24)]"
          placeholder="Вставьте сюда эссе, ответ ЕГЭ/ОГЭ или письменную работу..."
        />

        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={saveDraft} className="btn-practicum px-5">Сохранить черновик</button>
          <button onClick={loadDraft} className="btn-practicum-outline px-5">Загрузить черновик</button>
          {savedAt && <span className="badge-practicum">Сохранено: {savedAt}</span>}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="study-dark-panel practicum-card bg-[#101816] p-6 text-white">
          <p className="text-sm font-bold text-white/60">Итог</p>
          <p className="mt-2 text-5xl font-black text-white">{result.score}%</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/70">{result.summary}</p>
        </div>

        <div className="practicum-card p-5">
          <h2 className="text-lg font-black text-[var(--color-text)]">Что улучшить</h2>
          <div className="mt-4 space-y-3">
            {result.checks.map((check) => (
              <div key={check.label} className="flex gap-3 rounded-[14px] bg-[#f8faf7] p-3">
                {check.ok ? (
                  <CheckCircle size={21} weight="fill" className="shrink-0 text-emerald-600" />
                ) : (
                  <WarningCircle size={21} weight="fill" className="shrink-0 text-amber-600" />
                )}
                <div>
                  <p className="text-sm font-black text-[var(--color-text)]">{check.label}</p>
                  <p className="text-xs font-medium leading-5 text-[var(--color-text-secondary)]">{check.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

function scoreEssay(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const paragraphs = text.split(/\n\s*\n/).filter((part) => part.trim().length > 0)
  const hasIntro = /введение|тезис|проблем/i.test(text)
  const hasConclusion = /вывод|итак|таким образом|следовательно/i.test(text)
  const hasExamples = /например|аргумент|пример|потому что|так как/i.test(text)
  const uniqueWords = new Set(words.map((word) => word.toLowerCase())).size
  const variety = words.length ? uniqueWords / words.length : 0

  const checks = [
    { label: 'Объем', ok: words.length >= 120, text: words.length >= 120 ? `${words.length} слов: достаточно для развернутого ответа.` : `Сейчас ${words.length} слов. Добавьте аргументы и примеры.` },
    { label: 'Структура', ok: paragraphs.length >= 3, text: paragraphs.length >= 3 ? 'Есть разделение на смысловые блоки.' : 'Разбейте текст на вступление, аргументы и вывод.' },
    { label: 'Тезис', ok: hasIntro, text: hasIntro ? 'Во вступлении есть явный тезис или проблема.' : 'Сформулируйте тезис в первом абзаце.' },
    { label: 'Аргументы', ok: hasExamples, text: hasExamples ? 'Найдены маркеры примеров и причин.' : 'Добавьте конкретные примеры и причинно-следственные связи.' },
    { label: 'Вывод', ok: hasConclusion, text: hasConclusion ? 'Есть финальное обобщение.' : 'Закончите текст выводом.' },
    { label: 'Лексика', ok: variety > 0.45 || words.length < 20, text: variety > 0.45 ? 'Повторы не выглядят критичными.' : 'Есть много повторов, замените часть слов синонимами.' },
  ]

  const score = Math.round((checks.filter((check) => check.ok).length / checks.length) * 100)
  return {
    score,
    summary: score >= 80 ? 'Работа выглядит сильной. Осталось точечно вычитать формулировки.' : score >= 50 ? 'База есть, но нужно усилить структуру и аргументы.' : 'Пока это черновик. Начните с тезиса, примеров и вывода.',
    checks,
  }
}
