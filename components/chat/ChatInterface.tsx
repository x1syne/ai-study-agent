'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, User, Loader2, Mic, MicOff, Paperclip, X, FileText, Image as ImageIcon } from 'lucide-react'
import { GenerativeUIRenderer } from '@/components/generative-ui'
import { CharacterSelector } from './CharacterSelector'
import { useSpeechToText } from '@/hooks/useSpeech'
import { AI_CHARACTERS, type AICharacter } from '@/lib/ai/characters'
import type { ChatMessage } from '@/types'

interface AttachedFile {
  name: string
  type: 'image' | 'text'
  content: string // base64 for images, text content for files
  preview?: string
}

interface ChatInterfaceProps {
  messages: ChatMessage[]
  onSendMessage: (message: string, characterId?: string, files?: AttachedFile[]) => void
  onCharacterChange?: (characterId: string) => void
  isLoading?: boolean
  topicContext?: string
}

export function ChatInterface({ messages, onSendMessage, onCharacterChange, isLoading, topicContext }: ChatInterfaceProps) {
  const [input, setInput] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [selectedCharacter, setSelectedCharacter] = useState<AICharacter>(AI_CHARACTERS[0])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { startListening, stopListening, isListening, transcript, interimTranscript, isSupported: sttSupported } = useSpeechToText()

  const handleCharacterSelect = (character: AICharacter) => {
    setSelectedCharacter(character)
    onCharacterChange?.(character.id)
  }

  useEffect(() => { if (transcript) setInput(prev => prev + transcript) }, [transcript])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      if (file.type.startsWith('image/')) {
        // Handle image
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = reader.result as string
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            type: 'image',
            content: base64,
            preview: base64
          }])
        }
        reader.readAsDataURL(file)
      } else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md') || file.name.endsWith('.json') || file.name.endsWith('.js') || file.name.endsWith('.ts') || file.name.endsWith('.py') || file.name.endsWith('.html') || file.name.endsWith('.css')) {
        // Handle text file
        const text = await file.text()
        setAttachedFiles(prev => [...prev, {
          name: file.name,
          type: 'text',
          content: text.substring(0, 10000) // Limit to 10k chars
        }])
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && attachedFiles.length === 0) || isLoading) return
    onSendMessage(input.trim(), selectedCharacter.id, attachedFiles.length > 0 ? attachedFiles : undefined)
    setInput('')
    setAttachedFiles([])
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e) }
  }

  return (
    <div className="flex flex-col h-full practicum-card overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between gap-2">
          <CharacterSelector selectedId={selectedCharacter.id} onSelect={handleCharacterSelect} />
          {topicContext && <p className="text-xs text-[var(--color-text-secondary)] truncate">Контекст: {topicContext}</p>}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-2xl bg-[var(--color-primary)] flex items-center justify-center text-4xl mx-auto mb-4">
              {selectedCharacter.icon}
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Привет! Я {selectedCharacter.name}</h3>
            <p className="text-[var(--color-text-secondary)] max-w-md mx-auto text-sm">{selectedCharacter.description}</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === 'USER' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${message.role === 'USER' ? 'bg-[var(--color-border)]' : 'bg-[var(--color-primary)]'}`}>
              {message.role === 'USER' ? <User className="w-5 h-5 text-white" /> : <span className="text-lg">{selectedCharacter.icon}</span>}
            </div>
            <div className={`flex-1 max-w-[80%] ${message.role === 'USER' ? 'text-right' : ''}`}>
              <div className={`inline-block rounded-2xl px-4 py-3 ${message.role === 'USER' ? 'bg-[var(--color-primary)]/10 text-white' : 'bg-[var(--color-bg-secondary)]'}`}>
                {message.role === 'ASSISTANT' ? <GenerativeUIRenderer content={message.content} /> : <p className="text-white">{message.content}</p>}
              </div>
              <div className="text-xs text-[var(--color-text-secondary)] mt-1">
                {new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-9 h-9 bg-[var(--color-primary)] rounded-xl flex items-center justify-center">
              <span className="text-lg">{selectedCharacter.icon}</span>
            </div>
            <div className="bg-[var(--color-bg-secondary)] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-[var(--color-text-secondary)] animate-spin" />
                <span className="text-sm text-[var(--color-text-secondary)]">Думаю...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-[var(--color-border)]">
        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="relative group bg-[var(--color-bg-secondary)] rounded-lg p-2 flex items-center gap-2">
                {file.type === 'image' ? (
                  <img src={file.preview} alt={file.name} className="w-12 h-12 object-cover rounded" />
                ) : (
                  <FileText className="w-8 h-8 text-[var(--color-primary)]" />
                )}
                <span className="text-xs text-[var(--color-text-secondary)] max-w-[100px] truncate">{file.name}</span>
                <button type="button" onClick={() => removeFile(index)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {isListening && interimTranscript && (
          <div className="mb-2 px-3 py-2 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl">
            <p className="text-sm text-[var(--color-primary)] italic">🎤 {interimTranscript}</p>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.txt,.md,.json,.js,.ts,.py,.html,.css"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-white transition-colors" title="Прикрепить файл">
            <Paperclip className="w-5 h-5" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Слушаю...' : 'Задай вопрос или прикрепи файл...'}
            rows={1}
            className="input-practicum flex-1 resize-none py-3"
          />
          {sttSupported && (
            <button type="button" onClick={() => isListening ? stopListening() : startListening()} className={`px-4 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] hover:text-white'}`}>
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}
          <button type="submit" disabled={(!input.trim() && attachedFiles.length === 0) || isLoading} className="btn-practicum px-4 disabled:opacity-50">
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}

