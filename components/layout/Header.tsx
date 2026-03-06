'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, MagnifyingGlass, User, SignOut, GearSix, CaretDown, List, Fire, CheckCircle } from '@phosphor-icons/react'
import { useAppStore } from '@/lib/store'
import { useAuth } from '@/hooks/useAuth'
import { ThemeToggleButton } from '@/components/ui/ThemeToggle'
import { MiniPomodoro } from '@/components/gamification/MiniPomodoro'

interface SearchResult {
  id: string
  title: string
  type: 'goal' | 'topic'
}

interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
}

export function Header() {
  const router = useRouter()
  const { user, setSidebarOpen } = useAppStore()
  const { signOut } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [streak, setStreak] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Load streak
    const savedStreak = localStorage.getItem('reviewStreak')
    if (savedStreak) setStreak(parseInt(savedStreak))
    
    // Load notifications from localStorage
    const savedNotifications = localStorage.getItem('notifications')
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications))
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearch(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const searchGoals = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([])
        setShowSearch(false)
        return
      }
      try {
        const res = await fetch('/api/goals')
        if (res.ok) {
          const goals = await res.json()
          const results: SearchResult[] = []
          goals.forEach((goal: any) => {
            if (goal.title.toLowerCase().includes(searchQuery.toLowerCase())) {
              results.push({ id: goal.id, title: goal.title, type: 'goal' })
            }
            goal.topics?.forEach((topic: any) => {
              if (topic.name.toLowerCase().includes(searchQuery.toLowerCase())) {
                results.push({ id: topic.id, title: topic.name, type: 'topic' })
              }
            })
          })
          setSearchResults(results.slice(0, 6))
          setShowSearch(results.length > 0)
        }
      } catch (error) {
        console.error('Search error:', error)
      }
    }
    const debounce = setTimeout(searchGoals, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 header-practicum flex items-center justify-between px-4 sm:px-6 relative z-50">
      {/* Mobile menu */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden p-2 text-[var(--color-text-secondary)] hover:text-white transition-colors rounded-lg hover:bg-white/5"
      >
        <List size={24} weight="bold" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md mx-4" ref={searchRef}>
        <div className="relative flex items-center gap-2">
          <MagnifyingGlass size={18} weight="bold" className="text-[var(--color-text-secondary)] flex-shrink-0" />
          <input
            type="text"
            placeholder="Поиск курсов и тем..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            className="input-practicum py-2 text-sm flex-1"
          />
        </div>
        
        {showSearch && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 mx-4 max-w-md practicum-card overflow-hidden z-[100]">
            {searchResults.map((result) => (
              <button
                key={`${result.type}-${result.id}`}
                onClick={() => {
                  router.push(result.type === 'goal' ? `/goals/${result.id}` : `/learn/${result.id}`)
                  setShowSearch(false)
                  setSearchQuery('')
                }}
                className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-white text-sm">{result.title}</span>
                <span className="text-xs text-[var(--color-text-secondary)] ml-auto badge-practicum">
                  {result.type === 'goal' ? 'Курс' : 'Тема'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Streak */}
        {streak > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Fire size={16} weight="fill" className="text-orange-500" />
            <span className="text-sm font-medium text-orange-500">{streak}</span>
          </div>
        )}

        <ThemeToggleButton />

        {/* Mini Pomodoro */}
        <MiniPomodoro />

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-[var(--color-text-secondary)] hover:text-white transition-colors rounded-lg hover:bg-white/5"
          >
            <Bell size={20} weight="duotone" />
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-primary)] rounded-full" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 practicum-card overflow-hidden z-[100]">
              <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <h3 className="font-semibold text-white">Уведомления</h3>
                {notifications.length > 0 && (
                  <button 
                    onClick={() => {
                      const updated = notifications.map(n => ({ ...n, read: true }))
                      setNotifications(updated)
                      localStorage.setItem('notifications', JSON.stringify(updated))
                    }}
                    className="text-xs text-[var(--color-primary)] hover:underline"
                  >
                    Прочитать все
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div 
                      key={notification.id}
                      className={`p-4 border-b border-[var(--color-border)] hover:bg-white/5 transition-colors ${!notification.read ? 'bg-[var(--color-primary)]/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${notification.read ? 'bg-slate-500' : 'bg-[var(--color-primary)]'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white text-sm">{notification.title}</p>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-1">{notification.message}</p>
                          <p className="text-xs text-[var(--color-text-secondary)] mt-2">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <CheckCircle size={40} weight="duotone" className="mx-auto text-[var(--color-text-secondary)] mb-3" />
                    <p className="text-[var(--color-text-secondary)]">Нет уведомлений</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">Все прочитано!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-9 h-9 rounded-xl" />
              ) : (
                <div className="w-9 h-9 bg-[var(--color-primary)] rounded-xl flex items-center justify-center">
                  <User size={20} weight="duotone" className="text-white" />
                </div>
              )}
              <CaretDown size={16} weight="bold" className={`text-[var(--color-text-secondary)] transition-transform hidden sm:block ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-64 practicum-card overflow-hidden z-[100]">
                <div className="p-4 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-12 h-12 rounded-xl" />
                    ) : (
                      <div className="w-12 h-12 bg-[var(--color-primary)] rounded-xl flex items-center justify-center">
                        <User size={24} weight="duotone" className="text-white" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{user.name || 'Студент'}</div>
                      <div className="text-sm text-[var(--color-text-secondary)] truncate">{user.email}</div>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Link
                    href="/profile"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <User size={18} weight="duotone" />
                    <span>Профиль</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-colors"
                  >
                    <GearSix size={18} weight="duotone" />
                    <span>Настройки</span>
                  </Link>
                </div>

                <div className="p-2 border-t border-[var(--color-border)]">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <SignOut size={18} weight="duotone" />
                    <span>Выйти</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login">
            <button className="btn-practicum text-sm px-4 py-2">Войти</button>
          </Link>
        )}
      </div>
    </header>
  )
}

