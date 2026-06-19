'use client'

import { useEffect, useRef, useState } from 'react'
import { Microphone, Pause, Play, Stop, Trash } from '@phosphor-icons/react'

interface LectureNote {
  id: string
  title: string
  note: string
  createdAt: string
  duration: number
}

export default function LecturePage() {
  const [isRecording, setIsRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState<LectureNote[]>([])
  const recorderRef = useRef<MediaRecorder | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('lectureNotes')
    if (saved) setNotes(JSON.parse(saved))
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [])

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    recorderRef.current = new MediaRecorder(stream)
    recorderRef.current.start()
    setIsRecording(true)
    timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000)
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop())
    recorderRef.current = null
    setIsRecording(false)
    if (timerRef.current) window.clearInterval(timerRef.current)
  }

  const saveNote = () => {
    const item: LectureNote = {
      id: String(Date.now()),
      title: title.trim() || 'Новая лекция',
      note: note.trim(),
      createdAt: new Date().toISOString(),
      duration: seconds,
    }
    const next = [item, ...notes]
    setNotes(next)
    localStorage.setItem('lectureNotes', JSON.stringify(next))
    setTitle('')
    setNote('')
    setSeconds(0)
  }

  const removeNote = (id: string) => {
    const next = notes.filter((item) => item.id !== id)
    setNotes(next)
    localStorage.setItem('lectureNotes', JSON.stringify(next))
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="practicum-card p-6 sm:p-7">
        <p className="text-sm font-bold text-[var(--color-text-muted)]">Записать лекцию</p>
        <h1 className="mt-2 text-[34px] font-black tracking-[-0.03em] text-[var(--color-text)]">Лекция и заметки</h1>
        <p className="mt-2 max-w-[66ch] text-base font-medium leading-7 text-[var(--color-text-secondary)]">
          Запустите запись, ведите заметку и сохраните итог в локальную историю. Разрешение на микрофон запрашивается браузером.
        </p>

        <div className="mt-6 rounded-[22px] bg-[#f8faf7] p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className={`flex h-16 w-16 items-center justify-center rounded-[20px] ${isRecording ? 'bg-red-100 text-red-600' : 'bg-[#ffe8f8] text-[var(--color-text)]'}`}>
                <Microphone size={31} weight="duotone" />
              </span>
              <div>
                <p className="text-3xl font-black text-[var(--color-text)]">{formatSeconds(seconds)}</p>
                <p className="text-sm font-bold text-[var(--color-text-muted)]">{isRecording ? 'Идет запись' : 'Готово к записи'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {!isRecording ? (
                <button onClick={startRecording} className="btn-practicum px-5">
                  <Play size={18} weight="fill" />
                  Начать
                </button>
              ) : (
                <button onClick={stopRecording} className="btn-practicum-outline px-5">
                  <Stop size={18} weight="fill" />
                  Стоп
                </button>
              )}
              <button onClick={() => setSeconds(0)} className="btn-practicum-outline px-4" disabled={isRecording}>
                <Pause size={18} />
              </button>
            </div>
          </div>
        </div>

        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="input-practicum mt-5 h-12"
          placeholder="Название лекции"
        />
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          className="mt-3 min-h-[260px] w-full resize-y rounded-[16px] border border-[var(--color-border)] bg-white p-4 text-sm font-medium leading-6 text-[var(--color-text)] outline-none"
          placeholder="Пишите заметки во время лекции..."
        />
        <button onClick={saveNote} className="btn-practicum mt-4 px-6" disabled={!note.trim() && seconds === 0}>
          Сохранить лекцию
        </button>
      </section>

      <aside className="practicum-card p-5">
        <h2 className="text-lg font-black text-[var(--color-text)]">История</h2>
        <div className="mt-4 space-y-3">
          {notes.length === 0 ? (
            <p className="rounded-[14px] bg-[#f8faf7] p-4 text-sm font-medium leading-6 text-[var(--color-text-secondary)]">
              Сохраненные лекции появятся здесь.
            </p>
          ) : (
            notes.map((item) => (
              <div key={item.id} className="rounded-[14px] border border-[var(--color-border)] bg-[#f8faf7] p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-black text-[var(--color-text)]">{item.title}</p>
                    <p className="mt-1 text-xs font-semibold text-[var(--color-text-muted)]">
                      {formatSeconds(item.duration)} · {new Date(item.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <button onClick={() => removeNote(item.id)} className="text-red-600">
                    <Trash size={18} />
                  </button>
                </div>
                {item.note && <p className="mt-3 line-clamp-2 text-sm font-medium leading-6 text-[var(--color-text-secondary)]">{item.note}</p>}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  )
}

function formatSeconds(value: number) {
  const minutes = Math.floor(value / 60)
  const seconds = value % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
