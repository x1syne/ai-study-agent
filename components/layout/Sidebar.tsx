'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  House,
  Target,
  Graph,
  ArrowsClockwise,
  ChatCircleDots,
  ChartLineUp,
  GearSix,
  GraduationCap,
  X,
  CaretLeft,
  CalendarBlank,
} from '@phosphor-icons/react'
import { useAppStore } from '@/lib/store'
import { DailyTip } from './DailyTip'

const navigation = [
  { name: 'Главная',     href: '/dashboard', icon: House,          color: '#8b5cf6' },
  { name: 'Мои курсы',  href: '/goals',     icon: Target,         color: '#06b6d4' },
  { name: 'Расписание', href: '/schedule',  icon: CalendarBlank,  color: '#f59e0b' },
  { name: 'Карта знаний',href: '/graph',    icon: Graph,          color: '#10b981' },
  { name: 'Тренажёр',   href: '/review',    icon: ArrowsClockwise,color: '#f43f5e' },
  { name: 'AI Наставник',href: '/chat',     icon: ChatCircleDots, color: '#7c3aed' },
  { name: 'Прогресс',   href: '/stats',     icon: ChartLineUp,    color: '#22d3ee' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore()

  const handleNavClick = () => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full z-40',
          'transition-all duration-300 ease-smooth',
          'flex flex-col',
          'border-r border-[var(--color-border)]',
          // background with subtle gradient
          'bg-[var(--color-bg-secondary)]',
          sidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
          'max-lg:w-72',
          sidebarOpen ? 'lg:w-72' : 'lg:w-[72px]'
        )}
        style={{
          background: 'linear-gradient(180deg, #0c0c14 0%, #080810 100%)',
        }}
      >
        {/* Top glow line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent opacity-50" />

        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--color-border)] flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0" onClick={handleNavClick}>
            {/* Logo icon */}
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-primary shadow-glow-sm">
                <GraduationCap className="w-5 h-5 text-white" weight="duotone" />
              </div>
              {/* Glow behind icon */}
              <div className="absolute inset-0 rounded-xl bg-gradient-primary opacity-30 blur-md -z-10" />
            </div>

            {sidebarOpen && (
              <div className="overflow-hidden">
                <span className="block text-[15px] font-bold text-white leading-tight">AI Study</span>
                <span className="block text-[11px] font-medium text-[var(--color-text-muted)] tracking-wide uppercase">Практикум</span>
              </div>
            )}
          </Link>

          <button
            onClick={() => window.innerWidth < 1024 ? setSidebarOpen(false) : toggleSidebar()}
            className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-all duration-200 flex-shrink-0"
          >
            <span className="lg:hidden">
              <X size={18} weight="bold" />
            </span>
            <span className="hidden lg:block">
              <CaretLeft
                size={16}
                weight="bold"
                className={cn('transition-transform duration-300', !sidebarOpen && 'rotate-180')}
              />
            </span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {!sidebarOpen && (
            <div className="h-px w-full my-2 bg-gradient-to-r from-transparent via-[var(--color-border-light)] to-transparent" />
          )}

          {navigation.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                data-tooltip={!sidebarOpen ? item.name : undefined}
                className={cn(
                  'sidebar-item group relative',
                  isActive && 'active',
                  !sidebarOpen && 'justify-center px-0'
                )}
                style={{
                  animationDelay: `${index * 40}ms`,
                }}
              >
                {/* Icon container */}
                <div
                  className={cn(
                    'relative flex items-center justify-center flex-shrink-0 transition-all duration-200',
                    sidebarOpen ? 'w-8 h-8 rounded-lg' : 'w-10 h-10 rounded-xl',
                    isActive && 'shadow-glow-sm'
                  )}
                  style={isActive ? {
                    background: `${item.color}20`,
                    boxShadow: `0 0 12px ${item.color}30`,
                  } : {}}
                >
                  <item.icon
                    size={sidebarOpen ? 18 : 20}
                    weight={isActive ? 'duotone' : 'regular'}
                    style={{ color: isActive ? item.color : undefined }}
                    className={cn(
                      'transition-all duration-200',
                      !isActive && 'group-hover:scale-110'
                    )}
                  />

                  {/* Active indicator dot (collapsed mode) */}
                  {!sidebarOpen && isActive && (
                    <div
                      className="absolute -right-0.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
                      style={{ background: `linear-gradient(180deg, ${item.color}, transparent)` }}
                    />
                  )}
                </div>

                {sidebarOpen && (
                  <span className="font-medium text-[13.5px] leading-none">
                    {item.name}
                  </span>
                )}

                {/* Hover glow */}
                {!isActive && (
                  <div
                    className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                    style={{ background: `radial-gradient(circle at center, ${item.color}08 0%, transparent 70%)` }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="flex-shrink-0 p-3 border-t border-[var(--color-border)] space-y-1">
          <Link
            href="/settings"
            onClick={handleNavClick}
            className={cn(
              'sidebar-item group',
              !sidebarOpen && 'justify-center px-0'
            )}
          >
            <div className={cn(
              'flex items-center justify-center flex-shrink-0 transition-all duration-200',
              sidebarOpen ? 'w-8 h-8' : 'w-10 h-10 rounded-xl'
            )}>
              <GearSix
                size={sidebarOpen ? 18 : 20}
                weight="regular"
                className="transition-transform duration-500 group-hover:rotate-90"
              />
            </div>
            {sidebarOpen && (
              <span className="font-medium text-[13.5px]">Настройки</span>
            )}
          </Link>

          {sidebarOpen && (
            <div className="pt-1">
              <DailyTip />
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
