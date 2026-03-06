'use client'

import { 
  SpeakerHigh, 
  SpeakerX, 
  Pause, 
  Play, 
  Stop, 
  CircleNotch,
  Waveform
} from '@phosphor-icons/react'
import { useTextToSpeech } from '@/hooks/useSpeech'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface TextToSpeechProps {
  text: string
  className?: string
  variant?: 'button' | 'icon' | 'full'
  showVoiceSelect?: boolean
}

export function TextToSpeech({ text, className, variant = 'button', showVoiceSelect = false }: TextToSpeechProps) {
  const { 
    speak, pause, resume, stop, changeVoice,
    isSpeaking, isPaused, isSupported, isLoading,
    voices, selectedVoice, provider, error
  } = useTextToSpeech()

  if (!isSupported) {
    return null
  }

  const handleClick = () => {
    if (isLoading) return
    if (isSpeaking && !isPaused) {
      pause()
    } else if (isPaused) {
      resume()
    } else {
      speak(text)
    }
  }

  const getIcon = () => {
    if (isLoading) return <CircleNotch className="w-4 h-4 animate-spin" weight="bold" />
    if (isSpeaking && isPaused) return <Play className="w-4 h-4" weight="fill" />
    if (isSpeaking) return <Pause className="w-4 h-4" weight="fill" />
    return <SpeakerHigh className="w-4 h-4" weight="duotone" />
  }

  const getLabel = () => {
    if (isLoading) return 'Загрузка...'
    if (isSpeaking && isPaused) return 'Продолжить'
    if (isSpeaking) return 'Пауза'
    return 'Прослушать'
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          'p-2 rounded-lg transition-all duration-200',
          isLoading
            ? 'bg-slate-800/50 text-slate-500 cursor-wait'
            : isSpeaking
            ? 'bg-cyan-500/20 text-cyan-400 shadow-lg shadow-cyan-500/20'
            : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-white',
          className
        )}
        title={isLoading ? 'Загрузка...' : isSpeaking ? (isPaused ? 'Продолжить' : 'Пауза') : 'Прослушать'}
      >
        {isLoading ? (
          <CircleNotch className="w-5 h-5 animate-spin" weight="bold" />
        ) : isSpeaking ? (
          isPaused ? (
            <Play className="w-5 h-5" weight="fill" />
          ) : (
            <Pause className="w-5 h-5" weight="fill" />
          )
        ) : (
          <SpeakerHigh className="w-5 h-5" weight="duotone" />
        )}
      </button>
    )
  }

  if (variant === 'full') {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {/* Voice selector */}
        {showVoiceSelect && voices.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Голос:</span>
            <select
              value={selectedVoice}
              onChange={(e) => changeVoice(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            {provider === 'edge-tts' && (
              <span className="text-xs text-cyan-400 flex items-center gap-1">
                <Waveform className="w-3 h-3" weight="fill" />
                Neural
              </span>
            )}
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Button
            variant={isSpeaking ? 'primary' : 'secondary'}
            size="sm"
            onClick={handleClick}
            disabled={isLoading}
            leftIcon={getIcon()}
          >
            {getLabel()}
          </Button>
          {isSpeaking && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={stop} 
              leftIcon={<Stop className="w-4 h-4" weight="fill" />}
            >
              Стоп
            </Button>
          )}
        </div>
        
        {/* Status indicators */}
        {isLoading && (
          <div className="flex items-center gap-2">
            <CircleNotch className="w-4 h-4 animate-spin text-cyan-400" weight="bold" />
            <span className="text-xs text-slate-400">Генерация аудио...</span>
          </div>
        )}
        {isSpeaking && !isPaused && !isLoading && (
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5 items-end h-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-cyan-500 to-cyan-300 rounded-full animate-pulse"
                  style={{
                    height: `${6 + Math.random() * 10}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.5s',
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-slate-400">Воспроизведение...</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2">
            <SpeakerX className="w-4 h-4 text-red-400" weight="fill" />
            <span className="text-xs text-red-400">{error}</span>
          </div>
        )}
      </div>
    )
  }

  // Default button variant
  return (
    <Button
      variant={isSpeaking ? 'primary' : 'secondary'}
      size="sm"
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'transition-all duration-200',
        isSpeaking && 'shadow-lg shadow-cyan-500/20',
        className
      )}
      leftIcon={
        isLoading ? (
          <CircleNotch className="w-4 h-4 animate-spin" weight="bold" />
        ) : isSpeaking ? (
          isPaused ? (
            <Play className="w-4 h-4" weight="fill" />
          ) : (
            <SpeakerX className="w-4 h-4" weight="fill" />
          )
        ) : (
          <SpeakerHigh className="w-4 h-4" weight="duotone" />
        )
      }
    >
      {isLoading ? 'Загрузка...' : isSpeaking ? (isPaused ? 'Продолжить' : 'Остановить') : 'Прослушать'}
    </Button>
  )
}
