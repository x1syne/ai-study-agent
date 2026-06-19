'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Books,
  Brain,
  CalendarBlank,
  Cards,
  CaretDown,
  ChatCircleText,
  CheckSquareOffset,
  ClipboardText,
  Exam,
  Folder,
  GameController,
  House,
  MagnifyingGlass,
  Microphone,
  NotePencil,
  PlayCircle,
  SidebarSimple,
  SquaresFour,
  UploadSimple,
  Video,
  X,
} from '@phosphor-icons/react'
import { useAppStore } from '@/lib/store'

type NavItem = {
  name: string
  href: string
  icon: any
  tone?: string
  activePath?: string
  activeMode?: string
}

const primaryNav: NavItem[] = [
  { name: 'Главная', href: '/dashboard', icon: House },
  { name: 'Мои наборы', href: '/goals', icon: Folder },
  { name: 'Календарь', href: '/schedule', icon: CalendarBlank },
  { name: 'Мини-приложения', href: '/apps', icon: SquaresFour },
]

const studyNav: NavItem[] = [
  { name: 'Учебный план', href: '/learn', icon: Books, tone: 'text-emerald-600' },
  { name: 'Chat', href: '/chat', icon: ChatCircleText, tone: 'text-sky-600' },
  { name: 'Помоги мне с учебой', href: '/chat?mode=tutor', icon: Brain, tone: 'text-violet-600', activePath: '/chat', activeMode: 'tutor' },
  { name: 'Записать лекцию', href: '/lecture', icon: Microphone, tone: 'text-pink-500' },
]

const practiceNav: NavItem[] = [
  { name: 'QuizFetch', href: '/review?mode=quiz', icon: CheckSquareOffset, activePath: '/review', activeMode: 'quiz' },
  { name: 'Тест', href: '/review?mode=test', icon: Exam, activePath: '/review', activeMode: 'test' },
  { name: 'Карточки', href: '/review?mode=cards', icon: Cards, activePath: '/review', activeMode: 'cards' },
  { name: 'Аркада', href: '/arcade', icon: GameController },
  { name: 'Оценщик эссе', href: '/essay', icon: NotePencil },
]

const mediaNav: NavItem[] = [
  { name: 'Объяснения', href: '/media?mode=explain', icon: PlayCircle, activePath: '/media', activeMode: 'explain' },
  { name: 'Аудиоконспект', href: '/media?mode=audio', icon: Video, activePath: '/media', activeMode: 'audio' },
]

const notes = ['Основы Python', 'Карточки повторения', 'План на неделю', 'Ошибки в практике']

export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { sidebarOpen, setSidebarOpen } = useAppStore()

  useEffect(() => {
    const routes = [
      ...primaryNav,
      ...studyNav,
      ...practiceNav,
      ...mediaNav,
      { href: '/goals/new' },
    ].map((item) => item.href)
    const warmup = window.setTimeout(() => {
      routes.forEach((href) => router.prefetch(href))
    }, 400)

    return () => window.clearTimeout(warmup)
  }, [router])

  const closeMobile = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  const isActive = (item: NavItem) => {
    const path = item.activePath || item.href.split('?')[0]
    const pathMatches = pathname === path || pathname.startsWith(`${path}/`)
    if (!pathMatches) return false
    if (!item.activeMode) return true
    return searchParams.get('mode') === item.activeMode
  }

  return (
    <>
      {sidebarOpen && (
        <button
          aria-label="Закрыть меню"
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'sidebar-practicum fixed left-0 top-0 z-40 flex h-full w-[280px] flex-col transition-transform duration-200',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex h-[76px] items-center gap-3 px-5">
          <Link href="/dashboard" onClick={closeMobile} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#101816] text-[#c6ff4d] shadow-sm">
              <Brain size={23} weight="duotone" />
            </span>
            <span className="min-w-0">
              <span className="block text-[22px] font-black leading-none text-[var(--color-text)]">AI Study</span>
              <span className="mt-1 block text-[12px] font-semibold text-[var(--color-text-muted)]">practice workspace</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-xl p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-bg-hover)] lg:hidden"
            aria-label="Закрыть меню"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <Link href="/goals" onClick={closeMobile} className="flex items-center gap-2 rounded-[14px] border border-[var(--color-border)] bg-white px-3 py-2.5">
            <MagnifyingGlass size={18} className="text-[var(--color-text-muted)]" />
            <span className="min-w-0 flex-1 text-sm font-medium text-[#8b978f]">Поиск наборов...</span>
            <SidebarSimple size={18} className="text-[var(--color-text-muted)]" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-1 border-b border-[var(--color-border)] pb-3">
            {primaryNav.map((item) => (
              <NavLink key={item.name} item={item} active={isActive(item)} onClick={closeMobile} />
            ))}
          </div>

          <div className="py-3">
            <Link
              href="/goals"
              onClick={closeMobile}
              className="mb-3 flex items-center gap-3 rounded-[14px] bg-[#f0f5f1] p-2.5 transition hover:bg-[#e8f0ea]"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#ffe1bc] text-[var(--color-text)]">
                <Books size={19} weight="duotone" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-[var(--color-text)]">Текущий набор</span>
                <span className="block truncate text-[11px] font-semibold text-[var(--color-text-muted)]">выберите в “Мои наборы”</span>
              </span>
              <CaretDown size={16} className="text-[var(--color-text-muted)]" />
            </Link>

            <div className="space-y-1">
              {studyNav.map((item) => (
                <NavLink key={item.name} item={item} active={isActive(item)} onClick={closeMobile} />
              ))}
            </div>
          </div>

          <Disclosure title="Практика" icon={CheckSquareOffset} defaultOpen>
            {practiceNav.map((item) => (
              <SubNavLink key={item.name} item={item} active={isActive(item)} onClick={closeMobile} />
            ))}
          </Disclosure>

          <Disclosure title="Аудио и видео" icon={Video} defaultOpen>
            {mediaNav.map((item) => (
              <SubNavLink key={item.name} item={item} active={isActive(item)} onClick={closeMobile} />
            ))}
          </Disclosure>

          <Link
            href="/goals/new"
            onClick={closeMobile}
            className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#edf1ee] px-4 py-2.5 text-sm font-bold text-[var(--color-text)] hover:bg-[#e4ece6]"
          >
            <UploadSimple size={18} />
            Загрузить
          </Link>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="sidebar-section-label">Ваши заметки</span>
              <Link href="/learn" className="text-[11px] font-bold text-[var(--color-text-secondary)] hover:text-[var(--color-text)]">
                Смотреть все
              </Link>
            </div>
            <div className="space-y-1">
              {notes.map((note) => (
                <Link
                  key={note}
                  href={`/learn?note=${encodeURIComponent(note)}`}
                  onClick={closeMobile}
                  className="flex items-center gap-2 rounded-[12px] px-2 py-2 text-sm font-semibold text-[#46534d] hover:bg-[#f0f4f1]"
                >
                  <ClipboardText size={17} className="text-[#1f78ff]" />
                  <span className="truncate">{note}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </aside>
    </>
  )
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <Link prefetch href={item.href} onClick={onClick} className={cn('sidebar-item', active && 'active')}>
      <Icon size={20} weight={active ? 'duotone' : 'regular'} className={item.tone || 'text-[#6b7871]'} />
      <span className="truncate">{item.name}</span>
    </Link>
  )
}

function SubNavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      prefetch
      href={item.href}
      onClick={onClick}
      className={cn(
        'ml-6 flex items-center gap-2 rounded-[11px] px-2.5 py-2 text-[13px] font-semibold text-[#4f5d57] hover:bg-[#f0f4f1] hover:text-[var(--color-text)]',
        active && 'bg-[#edf6e7] text-[var(--color-text)]'
      )}
    >
      <Icon size={16} className="text-[#1f78ff]" />
      <span>{item.name}</span>
    </Link>
  )
}

function Disclosure({
  title,
  icon: Icon,
  defaultOpen,
  children,
}: {
  title: string
  icon: any
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details className="group border-t border-[var(--color-border)] py-2" open={defaultOpen}>
      <summary className="sidebar-item cursor-pointer list-none">
        <Icon size={20} className="text-cyan-600" />
        <span className="flex-1">{title}</span>
        <CaretDown size={15} className="transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-1 space-y-1">{children}</div>
    </details>
  )
}
