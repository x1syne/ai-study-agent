'use client'

import { Sun, Moon, Monitor, Clock } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()

  const themes = [
    { value: 'auto' as const, icon: Clock, label: 'Авто (по времени)' },
    { value: 'light' as const, icon: Sun, label: 'Светлая' },
    { value: 'dark' as const, icon: Moon, label: 'Тёмная' },
    { value: 'system' as const, icon: Monitor, label: 'Системная' },
  ]

  return (
    <div className={cn('flex items-center gap-1 p-1 bg-slate-800/50 dark:bg-slate-800/50 light:bg-slate-200 rounded-lg', className)}>
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
            theme === value
              ? 'bg-primary-500 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          )}
          title={label}
        >
          <Icon className="w-4 h-4" />
          {showLabel && <span>{label}</span>}
        </button>
      ))}
    </div>
  )
}

// Simple toggle button (just cycles through themes)
export function ThemeToggleButton({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const cycleTheme = () => {
    if (theme === 'auto') setTheme('light')
    else if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('auto')
  }

  const Icon = theme === 'auto' ? Clock : resolvedTheme === 'dark' ? Moon : Sun

  const getTitle = () => {
    if (theme === 'auto') return 'Авто (по времени суток)'
    if (theme === 'system') return 'Системная тема'
    return theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'
  }

  return (
    <button
      onClick={cycleTheme}
      className={cn(
        'p-2 rounded-lg transition-colors',
        'bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white',
        className
      )}
      title={getTitle()}
    >
      <Icon className="w-5 h-5" />
    </button>
  )
}
