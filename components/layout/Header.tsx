'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ArrowUp,
  Bell,
  CheckCircle,
  Export,
  Info,
  List,
  SignOut,
  User,
  Users,
} from '@phosphor-icons/react'
import { useAppStore } from '@/lib/store'
import { useAuth } from '@/hooks/useAuth'
import { MiniPomodoro } from '@/components/gamification/MiniPomodoro'

const routeLabels: Record<string, string> = {
  '/dashboard': 'Главная',
  '/goals': 'Мои наборы',
  '/goals/new': 'Создать набор',
  '/learn': 'Учебный план',
  '/review': 'Практика',
  '/chat': 'Chat',
  '/schedule': 'Календарь',
  '/graph': 'Карта знаний',
  '/stats': 'Прогресс',
  '/apps': 'Мини-приложения',
  '/arcade': 'Аркада',
  '/essay': 'Оценщик эссе',
  '/lecture': 'Запись лекции',
  '/media': 'Аудио и видео',
  '/settings': 'Настройки',
  '/profile': 'Профиль',
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, setSidebarOpen } = useAppStore()
  const { signOut } = useAuth()
  const [copied, setCopied] = useState(false)

  const currentLabel =
    routeLabels[pathname] ||
    Object.entries(routeLabels)
      .filter(([path]) => pathname.startsWith(`${path}/`))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ||
    'Workspace'

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const handleShare = async () => {
    const shareUrl = window.location.href
    const payload = { title: 'AI Study', text: 'Учебный набор в AI Study', url: shareUrl }

    if (navigator.share) {
      await navigator.share(payload).catch(() => undefined)
      return
    }

    await navigator.clipboard?.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <header className="header-practicum flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={() => setSidebarOpen(true)}
          className="rounded-xl border border-[var(--color-border)] bg-white p-2 text-[var(--color-text)] shadow-sm lg:hidden"
          aria-label="Открыть меню"
        >
          <List size={20} weight="bold" />
        </button>

        <div className="hidden min-w-0 sm:block">
          <div className="flex items-center gap-2 text-[15px] font-bold">
            <Link href="/goals" className="truncate text-[#005cff] hover:underline">
              My Study Sets
            </Link>
            <span className="text-[var(--color-text-muted)]">›</span>
            <span className="truncate text-[var(--color-text-secondary)]">{currentLabel}</span>
          </div>
          <p className="mt-0.5 hidden text-xs font-semibold text-[var(--color-text-muted)] sm:block">
            Учебный набор, практика и наставник в одном рабочем пространстве
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden sm:block">
          <ActionLink href="/profile" tone="green">
            <ArrowUp size={17} weight="bold" />
            <span>Улучшить</span>
          </ActionLink>
        </div>

        <div className="hidden md:block">
          <button
            onClick={handleShare}
            className="flex h-10 items-center gap-2 rounded-[12px] border border-blue-200 bg-white px-3 text-sm font-bold text-[#005cff] shadow-sm transition-colors hover:bg-blue-50"
          >
            {copied ? <CheckCircle size={17} weight="fill" /> : <Users size={17} weight="bold" />}
            <span>{copied ? 'Скопировано' : 'Поделиться'}</span>
          </button>
        </div>

        <div className="hidden lg:block">
          <ActionLink href="/chat?mode=feedback">
            <Info size={17} weight="bold" />
            <span className="hidden xl:inline">Отзыв</span>
          </ActionLink>
        </div>

        <div className="hidden md:block">
          <MiniPomodoro />
        </div>

        <Link
          href="/goals/new"
          className="hidden h-10 w-10 items-center justify-center rounded-[12px] border border-[var(--color-border)] bg-white text-[var(--color-text)] shadow-sm hover:bg-[var(--color-bg-hover)] sm:flex"
          aria-label="Загрузить материалы"
        >
          <Export size={19} weight="bold" />
        </Link>

        <details className="relative hidden sm:block">
          <summary
            className="relative flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-[12px] border border-[var(--color-border)] bg-white text-[var(--color-text)] shadow-sm hover:bg-[var(--color-bg-hover)]"
            aria-label="Уведомления"
          >
            <Bell size={18} weight="duotone" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--color-primary-dark)]" />
          </summary>
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-[16px] border border-[var(--color-border)] bg-white p-3 shadow-lg">
            <p className="px-2 text-sm font-black text-[var(--color-text)]">Сегодня</p>
            <Link href="/review?mode=cards" className="mt-2 block rounded-[12px] px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
              Повторить карточки из слабых тем
            </Link>
            <Link href="/schedule" className="block rounded-[12px] px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
              Проверить учебное расписание
            </Link>
          </div>
        </details>

        {user ? (
          <details className="relative">
            <summary className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-full bg-[#8d6e63] text-sm font-black text-white shadow-sm">
              {(user.name || user.email || 'U').charAt(0).toUpperCase()}
            </summary>
            <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-[16px] border border-[var(--color-border)] bg-white shadow-lg">
              <div className="border-b border-[var(--color-border)] p-4">
                <p className="truncate text-sm font-bold text-[var(--color-text)]">{user.name || 'Студент'}</p>
                <p className="truncate text-xs font-semibold text-[var(--color-text-muted)]">{user.email}</p>
              </div>
              <div className="p-2">
                <Link href="/profile" className="flex items-center gap-2 rounded-[12px] px-3 py-2 text-sm font-bold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)]">
                  <User size={17} />
                  Профиль
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  <SignOut size={17} />
                  Выйти
                </button>
              </div>
            </div>
          </details>
        ) : (
          <Link href="/login" className="btn-practicum px-5">
            Войти
          </Link>
        )}
      </div>
    </header>
  )
}

function ActionLink({
  href,
  tone,
  children,
}: {
  href: string
  tone?: 'green'
  children: ReactNode
}) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-200 bg-emerald-500 text-white hover:bg-emerald-600'
      : 'border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]'

  return (
    <Link
      href={href}
      className={`flex h-10 items-center gap-2 rounded-[12px] border px-3 text-sm font-bold shadow-sm transition-colors ${toneClass}`}
    >
      {children}
    </Link>
  )
}
