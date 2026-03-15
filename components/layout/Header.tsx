'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell, MagnifyingGlass, User, SignOut, GearSix,
  CaretDown, List, Fire, CheckCircle, X
} from '@phosphor-icons/react'
import { useAppStore } from '@/lib/store'
import { useAuth } from '@/hooks/useAuth'
import { ThemeToggleButton } from '@/components/ui/ThemeToggle'
import { MiniPomodoro } from '@/components/gamification/MiniPomodoro'

interface SearchResult { id: string; title: string; type: 'goal' | 'topic' }
interface Notification  { id: string; title: string; message: string; time: string; read: boolean }

export function Header() {
  const router = useRouter()
  const { user, setSidebarOpen } = useAppStore()
  const { signOut } = useAuth()

  const [showDropdown, setShowDropdown]           = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [searchQuery, setSearchQuery]             = useState('')
  const [searchResults, setSearchResults]         = useState<SearchResult[]>([])
  const [showSearch, setShowSearch]               = useState(false)
  const [streak, setStreak]                       = useState(0)
  const [notifications, setNotifications]         = useState<Notification[]>([])
  const [searchFocused, setSearchFocused]         = useState(false)

  const dropdownRef      = useRef<HTMLDivElement>(null)
  const searchRef        = useRef<HTMLDivElement>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedStreak = localStorage.getItem('reviewStreak')
    if (savedStreak) setStreak(parseInt(savedStreak))
    const saved = localStorage.getItem('notifications')
    if (saved) setNotifications(JSON.parse(saved))
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current      && !dropdownRef.current.contains(e.target as Node))      setShowDropdown(false)
      if (searchRef.current        && !searchRef.current.contains(e.target as Node))        setShowSearch(false)
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const searchGoals = async () => {
      if (searchQuery.length < 2) { setSearchResults([]); setShowSearch(false); return }
      try {
        const res = await fetch('/api/goals')
        if (res.ok) {
          const goals = await res.json()
          const results: SearchResult[] = []
          goals.forEach((goal: any) => {
            if (goal.title.toLowerCase().includes(searchQuery.toLowerCase()))
              results.push({ id: goal.id, title: goal.title, type: 'goal' })
            goal.topics?.forEach((topic: any) => {
              if (topic.name.toLowerCase().includes(searchQuery.toLowerCase()))
                results.push({ id: topic.id, title: topic.name, type: 'topic' })
            })
          })
          setSearchResults(results.slice(0, 6))
          setShowSearch(results.length > 0)
        }
      } catch {}
    }
    const t = setTimeout(searchGoals, 300)
    return () => clearTimeout(t)
  }, [searchQuery])

  const handleSignOut = async () => { await signOut(); router.push('/login') }
  const unread = notifications.filter(n => !n.read).length

  return (
    <header className="h-16 header-practicum flex items-center justify-between px-4 sm:px-6 relative z-20">

      {/* Mobile burger */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden p-2 rounded-xl text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-all"
      >
        <List size={22} weight="bold" />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-md mx-4 sm:mx-6" ref={searchRef}>
        <div className={`relative flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl transition-all duration-200 border ${
          searchFocused
            ? 'bg-[var(--color-bg-card)] border-[var(--color-primary)] shadow-[0_0_0_3px_rgba(124,58,237,0.1)]'
            : 'bg-[var(--color-bg-secondary)] border-[var(--color-border-light)] hover:border-[var(--color-border-light)]'
        }`}>
          <MagnifyingGlass
            size={16}
            weight="bold"
            className={`flex-shrink-0 transition-colors ${searchFocused ? 'text-[var(--color-primary-light)]' : 'text-[var(--color-text-muted)]'}`}
          />
          <input
            type="text"
            placeholder="Поиск курсов и тем..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => { setSearchFocused(true); searchResults.length > 0 && setShowSearch(true) }}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent outline-none text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setSearchResults([]); setShowSearch(false) }}
              className="text-[var(--color-text-muted)] hover:text-white transition-colors">
              <X size={14} weight="bold" />
            </button>
          )}
        </div>

        {/* Search dropdown */}
        {showSearch && searchResults.length > 0 && (
          <div className="absolute top-full left-4 sm:left-6 right-4 sm:right-auto sm:w-[28rem] mt-2 practicum-card overflow-hidden z-[100] animate-scale-in shadow-lg-dark">
            <div className="p-2">
              {searchResults.map(r => (
                <button
                  key={`${r.type}-${r.id}`}
                  onClick={() => { router.push(r.type === 'goal' ? `/goals/${r.id}` : `/learn/${r.id}`); setShowSearch(false); setSearchQuery('') }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left hover:bg-white/5 transition-colors group"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    r.type === 'goal' ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary-light)]' : 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                  }`}>
                    {r.type === 'goal' ? '📚' : '📖'}
                  </div>
                  <span className="text-sm text-[var(--color-text)] group-hover:text-white transition-colors flex-1 truncate">{r.title}</span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    r.type === 'goal' ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary-light)]' : 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  }`}>
                    {r.type === 'goal' ? 'Курс' : 'Тема'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 sm:gap-2">

        {/* Streak badge */}
        {streak > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Fire size={14} weight="fill" className="text-orange-400" />
            <span className="text-sm font-bold text-orange-400">{streak}</span>
          </div>
        )}

        <ThemeToggleButton />
        <MiniPomodoro />

        {/* Notifications */}
        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl text-[var(--color-text-muted)] hover:text-white hover:bg-white/5 transition-all"
          >
            <Bell size={18} weight="duotone" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--color-primary)] rounded-full animate-pulse-primary" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 practicum-card overflow-hidden z-[100] animate-scale-in shadow-card">
              <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">Уведомления</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={() => { const u = notifications.map(n => ({ ...n, read: true })); setNotifications(u); localStorage.setItem('notifications', JSON.stringify(u)) }}
                    className="text-[11px] font-medium text-[var(--color-primary-light)] hover:text-[var(--color-primary)] transition-colors"
                  >
                    Прочитать все
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length > 0 ? notifications.map(n => (
                  <div key={n.id} className={`p-4 border-b border-[var(--color-border)] hover:bg-white/3 transition-colors ${!n.read ? 'bg-[var(--color-primary)]/5' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-[var(--color-border-light)]' : 'bg-[var(--color-primary)]'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm">{n.title}</p>
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{n.message}</p>
                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{n.time}</p>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="py-10 text-center">
                    <CheckCircle size={36} weight="duotone" className="mx-auto text-[var(--color-text-muted)] mb-3" />
                    <p className="text-sm text-[var(--color-text-secondary)] font-medium">Всё прочитано!</p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">Новых уведомлений нет</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar + dropdown */}
        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-all group"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-8 h-8 rounded-xl object-cover ring-2 ring-[var(--color-border)]" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center ring-2 ring-[var(--color-primary)]/30">
                  <span className="text-xs font-bold text-white">
                    {(user.name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <CaretDown
                size={14}
                weight="bold"
                className={`text-[var(--color-text-muted)] hidden sm:block transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`}
              />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-60 practicum-card overflow-hidden z-[100] animate-scale-in shadow-card">
                {/* User info */}
                <div className="p-4 border-b border-[var(--color-border)]"
                  style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06) 0%, transparent 100%)' }}>
                  <div className="flex items-center gap-3">
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-11 h-11 rounded-xl object-cover" />
                    ) : (
                      <div className="w-11 h-11 bg-gradient-primary rounded-xl flex items-center justify-center">
                        <span className="text-lg font-bold text-white">{(user.name || 'U').charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{user.name || 'Студент'}</p>
                      <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <Link href="/profile" onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-all text-sm">
                    <User size={16} weight="duotone" />
                    <span>Профиль</span>
                  </Link>
                  <Link href="/settings" onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[var(--color-text-secondary)] hover:text-white hover:bg-white/5 transition-all text-sm">
                    <GearSix size={16} weight="duotone" />
                    <span>Настройки</span>
                  </Link>
                </div>

                <div className="p-2 border-t border-[var(--color-border)]">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-red-400 hover:bg-red-500/8 transition-all text-sm"
                  >
                    <SignOut size={16} weight="duotone" />
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
