'use client'

import { Mic, MicOff, Loader2 } from 'lucide-react'
import { useSpeechToText } from '@/hooks/useSpeech'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface SpeechToTextProps {
  onTranscript: (text: string) => void
  onInterim?: (text: string) => void
  className?: string
  variant?: 'button' | 'icon' | 'floating'
}

export function SpeechToText({
  onTranscript,
  onInterim,
  className,
  variant = 'button',
}: SpeechToTextProps) {
  const {
    startListening,
    stopListening,
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
  } = useSpeechToText()

  useEffect(() => {
    if (transcript) {
      onTranscript(transcript)
    }
  }, [transcript, onTranscript])

  useEffect(() => {
    if (interimTranscript && onInterim) {
      onInterim(interimTranscript)
    }
  }, [interimTranscript, onInterim])

  if (!isSupported) {
    return null
  }

  const handleClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        className={cn(
          'p-2 rounded-lg transition-all',
          isListening
            ? 'bg-red-500/20 text-red-400 animate-pulse'
            : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white',
          className
        )}
        title={isListening ? 'Остановить запись' : 'Голосовой ввод'}
      >
        {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>
    )
  }

  if (variant === 'floating') {
    return (
      <div className={cn('relative', className)}>
        <button
          onClick={handleClick}
          className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg',
            isListening
              ? 'bg-red-500 text-white animate-pulse scale-110'
              : 'bg-primary-500 text-white hover:bg-primary-600'
          )}
        >
          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </button>
        {isListening && (
          <div className="absolute -top-2 -right-2">
            <span className="flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
            </span>
          </div>
        )}
        {error && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-red-400 bg-slate-900 px-2 py-1 rounded">
            {error}
          </div>
        )}
      </div>
    )
  }

  // Default button variant
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Button
        variant={isListening ? 'danger' : 'secondary'}
        onClick={handleClick}
        leftIcon={
          isListening ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Mic className="w-4 h-4" />
          )
        }
      >
        {isListening ? 'Слушаю...' : '🎤 Голосовой ввод'}
      </Button>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {isListening && interimTranscript && (
        <p className="text-sm text-slate-400 italic">"{interimTranscript}"</p>
      )}
    </div>
  )
}

// Voice input field component
interface VoiceInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function VoiceInput({ value, onChange, placeholder, className }: VoiceInputProps) {
  const { startListening, stopListening, isListening, transcript, interimTranscript, isSupported } =
    useSpeechToText()

  useEffect(() => {
    if (transcript) {
      onChange(value + transcript)
    }
  }, [transcript, value, onChange])

  return (
    <div className={cn('relative', className)}>
      <input
        type="text"
        value={value + (isListening ? interimTranscript : '')}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
      />
      {isSupported && (
        <button
          type="button"
          onClick={() => (isListening ? stopListening() : startListening())}
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors',
            isListening
              ? 'bg-red-500/20 text-red-400 animate-pulse'
              : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
          )}
        >
          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
      )}
    </div>
  )
}

