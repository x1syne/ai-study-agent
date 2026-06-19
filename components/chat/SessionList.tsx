'use client'

import { useState, useEffect } from 'react'
import { Plus, MessageSquare, Trash2, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { fetchWithTimeout, isAbortError } from '@/lib/fetch-with-timeout'

interface Session {
  id: string
  title: string | null
  messageCount: number
  lastMessageAt: string | null
  createdAt: string
}

interface SessionListProps {
  characterId: string
  currentSessionId?: string
  onSessionSelect: (sessionId: string) => void
  onNewSession: () => void
}

export function SessionList({ 
  characterId, 
  currentSessionId, 
  onSessionSelect, 
  onNewSession 
}: SessionListProps) {
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    setSessions([])
    setHasLoaded(false)
  }, [characterId])

  useEffect(() => {
    if (isExpanded && !hasLoaded) loadSessions()
  }, [isExpanded, hasLoaded])

  const loadSessions = async () => {
    try {
      setIsLoading(true)
      const response = await fetchWithTimeout(`/api/sessions?characterId=${characterId}`, {
        timeoutMs: 1800,
      })
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      }
      setHasLoaded(true)
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('Error loading sessions:', error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Удалить этот диалог?')) return

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId))
        if (currentSessionId === sessionId) {
          onNewSession()
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Вчера'
    } else if (days < 7) {
      return `${days} дн. назад`
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
    }
  }

  if (isLoading) {
    return (
      <div className="px-4 py-2 text-sm text-[var(--color-text-secondary)]">
        Загрузка...
      </div>
    )
  }

  return (
    <div className="border-b border-[var(--color-border)]">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 flex items-center justify-between text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors"
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          История диалогов ({sessions.length})
        </span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Sessions list */}
      {isExpanded && (
        <div className="max-h-48 overflow-y-auto">
          {/* New session button */}
          <button
            onClick={onNewSession}
            className="w-full px-4 py-2 flex items-center gap-2 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Новый диалог
          </button>

          {/* Session items */}
          {sessions.map(session => (
            <div
              key={session.id}
              onClick={() => onSessionSelect(session.id)}
              className={`w-full px-4 py-2 flex items-center justify-between cursor-pointer transition-colors group ${
                currentSessionId === session.id 
                  ? 'bg-[var(--color-primary)]/20' 
                  : 'hover:bg-[var(--color-bg-secondary)]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">
                  {session.title || 'Новый диалог'}
                </p>
                <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(session.lastMessageAt)}
                  <span className="mx-1">•</span>
                  {session.messageCount} сообщ.
                </p>
              </div>
              <button
                onClick={(e) => handleDeleteSession(session.id, e)}
                className="p-1 text-[var(--color-text-secondary)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {sessions.length === 0 && (
            <p className="px-4 py-3 text-sm text-[var(--color-text-secondary)] text-center">
              Нет сохранённых диалогов
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default SessionList
