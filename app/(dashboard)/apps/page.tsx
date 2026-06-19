'use client'

import Link from 'next/link'
import {
  Books,
  Cards,
  ChatCircleText,
  Exam,
  GameController,
  Graph,
  Microphone,
  NotePencil,
  Timer,
  Video,
} from '@phosphor-icons/react'

const apps = [
  { title: 'Учебный план', text: 'Темы, модули и следующий шаг обучения', href: '/learn', icon: Books, color: '#edf6e7' },
  { title: 'QuizFetch', text: 'Создать тест по теме и сразу пройти его', href: '/review?mode=quiz', icon: Exam, color: '#dfe9ff' },
  { title: 'Карточки', text: 'Повторение по слабым местам', href: '/review?mode=cards', icon: Cards, color: '#f0e7ff' },
  { title: 'Аркада', text: 'Быстрая игровая практика по темам', href: '/arcade', icon: GameController, color: '#fff0d8' },
  { title: 'Оценщик эссе', text: 'Проверка структуры, аргументации и ясности', href: '/essay', icon: NotePencil, color: '#ffe3ec' },
  { title: 'AI-наставник', text: 'Разбор темы, ошибки или плана', href: '/chat?mode=tutor', icon: ChatCircleText, color: '#e4f8ff' },
  { title: 'Запись лекции', text: 'Записать аудио и сохранить заметку', href: '/lecture', icon: Microphone, color: '#ffe8f8' },
  { title: 'Аудио и видео', text: 'Объяснения и аудиоконспекты', href: '/media?mode=explain', icon: Video, color: '#e9f4ff' },
  { title: 'Карта знаний', text: 'Связи тем и визуальный прогресс', href: '/graph', icon: Graph, color: '#e7f8ef' },
  { title: 'Pomodoro', text: 'Фокус-сессии и таймер обучения', href: '/stats', icon: Timer, color: '#fff4df' },
]

export default function AppsPage() {
  return (
    <div className="space-y-7">
      <section className="practicum-card p-6 sm:p-7">
        <p className="text-sm font-bold text-[var(--color-text-muted)]">Мини-приложения</p>
        <h1 className="mt-2 text-[34px] font-black tracking-[-0.03em] text-[var(--color-text)]">
          Инструменты для обучения
        </h1>
        <p className="mt-2 max-w-[68ch] text-base font-medium leading-7 text-[var(--color-text-secondary)]">
          Все отдельные режимы разложены по своим вкладкам: практика, чат, запись лекций, эссе, аркада и медиа.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {apps.map((app) => {
          const Icon = app.icon
          return (
            <Link key={app.title} href={app.href} className="practicum-card p-5 hover:-translate-y-0.5">
              <span className="flex h-13 w-13 items-center justify-center rounded-[16px] text-[var(--color-text)]" style={{ background: app.color }}>
                <Icon size={26} weight="duotone" />
              </span>
              <h2 className="mt-4 text-lg font-black text-[var(--color-text)]">{app.title}</h2>
              <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-text-secondary)]">{app.text}</p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
