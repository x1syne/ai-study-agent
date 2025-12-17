'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Voice {
  id: string
  name: string
  gender: string
}

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSupported] = useState(true)
  const [voices, setVoices] = useState<Voice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>('aidar')
  const [error, setError] = useState<string | null>(null)
  const [provider, setProvider] = useState<string>('silero')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Загружаем доступные голоса
    fetch('/api/tts')
      .then(res => res.json())
      .then(data => {
        setVoices(data.voices || [])
        setProvider(data.provider || 'silero')
      })
      .catch(() => {
        setVoices([{ id: 'aidar', name: 'Айдар (мужской)', gender: 'male' }])
      })

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: selectedVoice }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        console.error('TTS API error:', response.status, errData)
        setError('TTS API ошибка: ' + (errData.details || response.status))
        setIsLoading(false)
        return
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onplay = () => {
        setIsSpeaking(true)
        setIsPaused(false)
        setIsLoading(false)
      }

      audio.onended = () => {
        setIsSpeaking(false)
        setIsPaused(false)
        URL.revokeObjectURL(audioUrl)
      }

      audio.onerror = (e) => {
        console.error('Audio playback error:', e)
        setError('Ошибка воспроизведения')
        setIsLoading(false)
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (err) {
      console.error('TTS fetch error:', err)
      setError('Ошибка сети')
      setIsLoading(false)
    }
  }, [selectedVoice])



  const pause = useCallback(() => {
    if (audioRef.current && isSpeaking) {
      audioRef.current.pause()
      setIsPaused(true)
    } else if (window.speechSynthesis) {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }, [isSpeaking])

  const resume = useCallback(() => {
    if (audioRef.current && isPaused) {
      audioRef.current.play()
      setIsPaused(false)
    } else if (window.speechSynthesis) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    }
  }, [isPaused])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    setIsPaused(false)
    setIsLoading(false)
  }, [])

  const changeVoice = useCallback((voiceId: string) => {
    setSelectedVoice(voiceId)
  }, [])

  return {
    speak, pause, resume, stop, changeVoice,
    isSpeaking, isPaused, isSupported, isLoading,
    voices, selectedVoice, provider, error,
  }
}

// Speech-to-Text
export function useSpeechToText(options: { lang?: string; continuous?: boolean; interimResults?: boolean } = {}) {
  const { lang = 'ru-RU', continuous = false, interimResults = true } = options
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interimTranscript, setInterimTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (SpeechRecognitionAPI) {
        setIsSupported(true)
        const recognition = new SpeechRecognitionAPI()
        recognition.lang = lang
        recognition.continuous = continuous
        recognition.interimResults = interimResults
        recognition.onstart = () => { setIsListening(true); setError(null) }
        recognition.onend = () => setIsListening(false)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (e: any) => { setIsListening(false); setError(e.error) }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (e: any) => {
          let final = '', interim = ''
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript
            else interim += e.results[i][0].transcript
          }
          if (final) setTranscript(p => p + final)
          setInterimTranscript(interim)
        }
        recognitionRef.current = recognition
      }
    }
    return () => { if (recognitionRef.current) recognitionRef.current.stop() }
  }, [lang, continuous, interimResults])

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setTranscript(''); setInterimTranscript(''); setError(null)
      try { recognitionRef.current.start() } catch { /* */ }
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) recognitionRef.current.stop()
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript(''); setInterimTranscript('')
  }, [])

  return { startListening, stopListening, resetTranscript, isListening, transcript, interimTranscript, isSupported, error }
}
