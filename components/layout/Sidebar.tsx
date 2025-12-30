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
  CalendarBlank
} from '@phosphor-icons/react'
import { useAppStore } from '@/lib/store'

const navigation = [
  { name: 'Главная', href: '/dashboard', icon: House },
  { name: 'Мои курсы', href: '/goals', icon: Target },
  { name: 'Расписание', href: '/schedule', icon: CalendarBlank },
  { name: 'Карта знаний', href: '/graph', icon: Graph },
  { name: 'Тренажёр', href: '/review', icon: ArrowsClockwise },
  { name: 'AI Наставник', href: '/chat', icon: ChatCircleDots },
  { name: 'Прогресс', href: '/stats', icon: ChartLineUp },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useAppStore()

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside
        className={cn(
          'fixed left-0 top-0 h-full sidebar-practicum z-40',
          'transition-all duration-300 ease-in-out',
          sidebarOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full',
          'max-lg:w-72',
          sidebarOpen ? 'lg:w-72' : 'lg:w-20'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-[var(--color-border)]">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={handleNavClick}>
            <div className="w-10 h-10 bg-[var(--color-primary)] rounded-xl flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            {sidebarOpen && (
              <div>
                <span className="text-lg font-bold text-white">AI Study</span>
                <span className="block text-xs text-[var(--color-text-secondary)]">Практикум</span>
              </div>
            )}
          </Link>
          <button
            onClick={() => window.innerWidth < 1024 ? setSidebarOpen(false) : toggleSidebar()}
            className="p-2 text-[var(--color-text-secondary)] hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <span className="lg:hidden">
              <X size={20} weight="bold" />
            </span>
            <span className="hidden lg:block">
              <CaretLeft 
                size={20} 
                weight="bold"
                className={cn(
                  'transition-transform duration-300',
                  !sidebarOpen && 'rotate-180'
                )} 
              />
            </span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'sidebar-item',
                  isActive && 'active'
                )}
              >
                <item.icon size={22} weight={isActive ? 'duotone' : 'regular'} className="flex-shrink-0" />
                {sidebarOpen && (
                  <span className="font-medium">{item.name}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--color-border)]">
          <Link
            href="/settings"
            onClick={handleNavClick}
            className="sidebar-item"
          >
            <GearSix size={22} weight="regular" className="flex-shrink-0" />
            {sidebarOpen && (
              <span className="font-medium">Настройки</span>
            )}
          </Link>
          
          {sidebarOpen && (
            <div className="mt-4 p-4 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">
              <p className="text-sm text-[var(--color-primary)] font-medium">🎯 Совет дня</p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Занимайся каждый день по 20 минут для лучшего результата
              </p>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

