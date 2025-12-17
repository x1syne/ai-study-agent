'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, MessageSquare, Sparkles, Zap, Brain, BookOpen, Code, Lightbulb, Search } from 'lucide-react'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { Card, CardContent } from '@/components/ui'

interface Message {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
  characterId?: string
}

const quickPrompts = [
  { icon: <BookOpen className="w-5 h-5" />, text: 'Объясни тему', prompt: 'Объясни мне простыми словами что такое', color: 'bg-blue-500/10 text-blue-500' },
  { icon: <Lightbulb className="w-5 h-5" />, text: 'План обучения', prompt: 'Составь мне план обучения по теме', color: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' },
  { icon: <Code className="w-5 h-5" />, text: 'Проверь код', prompt: 'Найди ошибки в моём коде и объясни как исправить', color: 'bg-green-500/10 text-green-500' },
  { icon: <Search className="w-5 h-5" />, text: 'Примеры', prompt: 'Приведи практические примеры использования', color: 'bg-purple-500/10 text-purple-500' },
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [currentCharacterId, setCurrentCharacterId] = useState('default')

  const fetchMessages = useCallback(async (characterId: string) => {
    setIsFetching(true)
    try {
      const res = await fetch(`/api/chat?limit=50&characterId=${characterId}`)
      if (res.ok) setMessages(await res.json())
    } catch (e) { console.error(e) }
    finally { setIsFetching(false) }
  }, [])

  useEffect(() => { fetchMessages(currentCharacterId) }, [currentCharacterId, fetchMessages])

  const handleCharacterChange = (characterId: string) => {
    if (characterId !== currentCharacterId) setCurrentCharacterId(characterId)
  }

  const sendMessage = async (message: string, characterId?: string, files?: { name: string; type: 'image' | 'text'; content: string }[]) => {
    if ((!message.trim() && (!files || files.length === 0)) || isLoading) return
    if (characterId && characterId !== currentCharacterId) {
      setCurrentCharacterId(characterId)
      await fetchMessages(characterId)
    }
    setIsLoading(true)
    
    // Build display message with file indicators
    let displayContent = message
    if (files && files.length > 0) {
      const fileNames = files.map(f => f.type === 'image' ? `📷 ${f.name}` : `📄 ${f.name}`).join(', ')
      displayContent = message ? `${message}\n\n[Прикреплено: ${fileNames}]` : `[Прикреплено: ${fileNames}]`
    }
    
    const tempMsg: Message = { id: `temp-${Date.now()}`, role: 'USER', content: displayContent, createdAt: new Date().toISOString(), characterId: characterId || currentCharacterId }
    setMessages(prev => [...prev, tempMsg])
    try {
      const res = await fetch('/api/chat', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          message, 
          characterId: characterId || currentCharacterId,
          files: files || []
        }) 
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev.filter(m => m.id !== tempMsg.id), data.userMessage, data.aiMessage])
      } else setMessages(prev => prev.filter(m => m.id !== tempMsg.id))
    } catch (e) { console.error(e); setMessages(prev => prev.filter(m => m.id !== tempMsg.id)) }
    finally { setIsLoading(false) }
  }

  if (isFetching && messages.length === 0) {
    return (
      <div className="h-[calc(100vh-8rem)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)] mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 animate-fade-in">
      {/* Header - only when no messages */}
      {messages.length === 0 && (
        <>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--color-primary)] rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">AI Наставник</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">Llama 3.3 70B • Всегда готов помочь</p>
            </div>
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
              <Zap className="w-4 h-4 text-green-500" />
              <span className="text-green-500 text-sm">Online</span>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickPrompts.map((item, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(item.prompt)}
                className="practicum-card p-4 text-left group hover:border-[var(--color-primary)]/50"
              >
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-3`}>
                  {item.icon}
                </div>
                <p className="text-sm font-medium text-white group-hover:text-[var(--color-primary)] transition-colors">
                  {item.text}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Chat Interface */}
      <div className="flex-1 min-h-0">
        <ChatInterface
          messages={messages}
          onSendMessage={sendMessage}
          onCharacterChange={handleCharacterChange}
          isLoading={isLoading}
        />
      </div>

      {/* Features hint */}
      {messages.length === 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="font-medium text-white">Возможности AI</p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Объяснение тем • Генерация примеров • Проверка кода • Составление планов
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

