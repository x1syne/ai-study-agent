'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { BookOpen, Brain, Code, Lightbulb, MessageSquare, Search, Sparkles, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { fetchWithTimeout, isAbortError } from '@/lib/fetch-with-timeout'

interface Message {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
  characterId?: string
}

const ChatInterface = dynamic(
  () => import('@/components/chat/ChatInterface').then((mod) => mod.ChatInterface),
  {
    ssr: false,
    loading: () => <ChatInterfaceSkeleton />,
  }
)

function ChatInterfaceSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="border-b border-[var(--color-border)] p-4">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 animate-pulse rounded-2xl bg-[var(--color-primary)]/25" />
          <div className="mx-auto h-4 w-48 animate-pulse rounded-full bg-[var(--color-bg-secondary)]" />
        </div>
      </div>
      <div className="border-t border-[var(--color-border)] p-4">
        <div className="h-12 animate-pulse rounded-xl bg-[var(--color-bg-secondary)]" />
      </div>
    </div>
  )
}

const modeContent = {
  chat: {
    title: 'AI-наставник',
    subtitle: 'Llama 3.3 70B · всегда готов помочь',
    characterId: 'default',
    prompts: [
      { icon: <BookOpen className="h-5 w-5" />, text: 'Объясни тему', prompt: 'Объясни мне простыми словами тему: ', color: 'bg-blue-500/10 text-blue-600' },
      { icon: <Lightbulb className="h-5 w-5" />, text: 'План обучения', prompt: 'Составь мне план обучения по теме: ', color: 'bg-lime-500/15 text-lime-700' },
      { icon: <Code className="h-5 w-5" />, text: 'Проверь код', prompt: 'Найди ошибки в моем коде и объясни, как исправить: ', color: 'bg-green-500/10 text-green-600' },
      { icon: <Search className="h-5 w-5" />, text: 'Примеры', prompt: 'Приведи практические примеры по теме: ', color: 'bg-purple-500/10 text-purple-600' },
    ],
  },
  tutor: {
    title: 'Помоги мне с учебой',
    subtitle: 'Режим репетитора: объяснение, проверка понимания, следующий шаг',
    characterId: 'tutor',
    prompts: [
      { icon: <Brain className="h-5 w-5" />, text: 'Разбери тему', prompt: 'Разбери эту тему как репетитор: ', color: 'bg-violet-500/10 text-violet-600' },
      { icon: <BookOpen className="h-5 w-5" />, text: 'Проверь знания', prompt: 'Задай мне 5 вопросов, чтобы проверить понимание темы: ', color: 'bg-emerald-500/10 text-emerald-600' },
      { icon: <Lightbulb className="h-5 w-5" />, text: 'Что дальше', prompt: 'Определи следующий шаг обучения по теме: ', color: 'bg-amber-500/10 text-amber-600' },
      { icon: <Search className="h-5 w-5" />, text: 'Ошибки', prompt: 'Объясни мои ошибки и дай короткую практику: ', color: 'bg-red-500/10 text-red-600' },
    ],
  },
  feedback: {
    title: 'Отзыв и идея',
    subtitle: 'Напишите, что улучшить в платформе или какой сценарий добавить',
    characterId: 'default',
    prompts: [
      { icon: <Sparkles className="h-5 w-5" />, text: 'Идея функции', prompt: 'У меня есть идея для платформы: ', color: 'bg-lime-500/15 text-lime-700' },
      { icon: <Search className="h-5 w-5" />, text: 'Что не работает', prompt: 'Помоги описать проблему в интерфейсе: ', color: 'bg-red-500/10 text-red-600' },
      { icon: <Lightbulb className="h-5 w-5" />, text: 'Улучшить UX', prompt: 'Предложи, как улучшить этот сценарий: ', color: 'bg-blue-500/10 text-blue-600' },
      { icon: <BookOpen className="h-5 w-5" />, text: 'Для курса', prompt: 'Нужно добавить функцию для курса: ', color: 'bg-purple-500/10 text-purple-600' },
    ],
  },
}

type ChatMode = keyof typeof modeContent

export default function ChatPage() {
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') as ChatMode) || 'chat'
  const config = modeContent[mode] || modeContent.chat
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [currentCharacterId, setCurrentCharacterId] = useState(config.characterId)

  useEffect(() => {
    setCurrentCharacterId(config.characterId)
  }, [config.characterId])

  const fetchMessages = useCallback(async (characterId: string) => {
    setIsFetching(true)
    try {
      const res = await fetchWithTimeout(`/api/chat?limit=20&characterId=${characterId}`, {
        timeoutMs: 1800,
      })
      if (res.ok) setMessages(await res.json())
    } catch (e) {
      if (!isAbortError(e)) {
        console.error(e)
      }
    } finally {
      setIsFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages(currentCharacterId)
  }, [currentCharacterId, fetchMessages])

  const handleCharacterChange = (characterId: string) => {
    if (characterId !== currentCharacterId) setCurrentCharacterId(characterId)
  }

  const sendMessage = async (
    message: string,
    characterId?: string,
    files?: { name: string; type: 'image' | 'text'; content: string }[]
  ) => {
    if ((!message.trim() && (!files || files.length === 0)) || isLoading) return
    if (characterId && characterId !== currentCharacterId) {
      setCurrentCharacterId(characterId)
    }
    setIsLoading(true)

    let displayContent = message
    if (files && files.length > 0) {
      const fileNames = files.map((file) => `${file.type === 'image' ? 'Фото' : 'Файл'}: ${file.name}`).join(', ')
      displayContent = message ? `${message}\n\n[Прикреплено: ${fileNames}]` : `[Прикреплено: ${fileNames}]`
    }

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: displayContent,
      createdAt: new Date().toISOString(),
      characterId: characterId || currentCharacterId,
    }
    setMessages((prev) => [...prev, tempMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          characterId: characterId || currentCharacterId,
          files: files || [],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => [...prev.filter((msg) => msg.id !== tempMsg.id), data.userMessage, data.aiMessage])
      } else {
        setMessages((prev) => prev.filter((msg) => msg.id !== tempMsg.id))
      }
    } catch (e) {
      console.error(e)
      setMessages((prev) => prev.filter((msg) => msg.id !== tempMsg.id))
    } finally {
      setIsLoading(false)
    }
  }

  const quickPrompts = useMemo(() => config.prompts, [config.prompts])

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 animate-fade-in">
      {messages.length === 0 && (
        <>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)]">
              <MessageSquare className="h-6 w-6 text-[var(--color-primary-ink)]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[var(--color-text)]">{config.title}</h1>
              <p className="text-sm font-medium text-[var(--color-text-secondary)]">{config.subtitle}</p>
            </div>
            <div className="ml-auto hidden items-center gap-2 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1.5 sm:flex">
              <Zap className="h-4 w-4 text-green-600" />
              <span className="text-sm font-bold text-green-600">Online</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {quickPrompts.map((item) => (
              <button
                key={item.text}
                onClick={() => sendMessage(item.prompt)}
                className="practicum-card p-4 text-left group hover:border-[var(--color-primary-dark)]/50"
              >
                <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${item.color}`}>
                  {item.icon}
                </div>
                <p className="text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary-dark)]">
                  {item.text}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="min-h-0 flex-1">
        {isFetching && messages.length === 0 && (
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)]">
            <Brain className="h-4 w-4 text-[var(--color-primary-dark)]" />
            Загружаем историю в фоне
          </div>
        )}
        <ChatInterface
          messages={messages}
          onSendMessage={sendMessage}
          onCharacterChange={handleCharacterChange}
          isLoading={isLoading}
        />
      </div>

      {messages.length === 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary)]/15">
                <Sparkles className="h-5 w-5 text-[var(--color-primary-dark)]" />
              </div>
              <div>
                <p className="font-bold text-[var(--color-text)]">Возможности AI</p>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">
                  Объяснение тем · генерация примеров · проверка кода · составление планов
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
