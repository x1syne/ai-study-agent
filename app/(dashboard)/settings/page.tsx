'use client'

import { useState, useEffect } from 'react'
import { Settings, User, Bell, Moon, Sun, Save, Monitor, Volume2, Mic, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useTheme } from '@/contexts/ThemeContext'
import { useAppStore } from '@/lib/store'

export default function SettingsPage() {
  const { theme } = useTheme()
  const { user } = useAppStore()
  const [dailyGoal, setDailyGoal] = useState(30)
  const [notifications, setNotifications] = useState(true)
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const [sttEnabled, setSttEnabled] = useState(true)
  const [learningStyle, setLearningStyle] = useState('balanced')
  const [contentTone, setContentTone] = useState('conversational')
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('settings')
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        if (parsed.dailyGoal) setDailyGoal(parsed.dailyGoal)
        if (typeof parsed.notifications === 'boolean') setNotifications(parsed.notifications)
        if (typeof parsed.ttsEnabled === 'boolean') setTtsEnabled(parsed.ttsEnabled)
        if (typeof parsed.sttEnabled === 'boolean') setSttEnabled(parsed.sttEnabled)
        if (parsed.learningStyle) setLearningStyle(parsed.learningStyle)
        if (parsed.contentTone) setContentTone(parsed.contentTone)
      } catch (e) {
        console.error('Failed to parse settings:', e)
      }
    }
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    localStorage.setItem('settings', JSON.stringify({ 
      dailyGoal, 
      notifications, 
      ttsEnabled, 
      sttEnabled,
      learningStyle,
      contentTone
    }))
    await new Promise(r => setTimeout(r, 500))
    setIsSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Настройки</h1>
        <p className="text-[var(--color-text-secondary)] mt-1">Персонализируй обучение</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-[var(--color-primary)]" />
            Профиль
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-16 h-16 rounded-xl" />
            ) : (
              <div className="w-16 h-16 bg-[var(--color-primary)] rounded-xl flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <p className="font-medium text-white">{user?.name || 'Гость'}</p>
              <p className="text-sm text-[var(--color-text-secondary)]">{user?.email || 'Не авторизован'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-[var(--color-primary)]" /> : theme === 'light' ? <Sun className="w-5 h-5 text-[var(--color-primary)]" /> : <Monitor className="w-5 h-5 text-[var(--color-primary)]" />}
            Тема
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle showLabel className="w-full justify-center" />
          <p className="text-sm text-[var(--color-text-secondary)] text-center mt-3">
            {theme === 'auto' ? 'Авто: светлая днём, тёмная ночью' : theme === 'system' ? 'Автоматически по системе' : theme === 'dark' ? 'Тёмная тема' : 'Светлая тема'}
          </p>
        </CardContent>
      </Card>

      {/* Voice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-[var(--color-primary)]" />
            Голос
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow icon={<Volume2 />} title="Озвучка (TTS)" desc="Прослушивание теории" value={ttsEnabled} onChange={setTtsEnabled} />
          <ToggleRow icon={<Mic />} title="Голосовой ввод (STT)" desc="Отвечать голосом" value={sttEnabled} onChange={setSttEnabled} />
        </CardContent>
      </Card>

      {/* Learning */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--color-primary)]" />
            Обучение
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Ежедневная цель</label>
            <input type="range" min="10" max="120" step="10" value={dailyGoal} onChange={e => setDailyGoal(Number(e.target.value))} className="w-full accent-[var(--color-primary)]" />
            <div className="flex justify-between text-sm text-[var(--color-text-secondary)] mt-1">
              <span>10 мин</span>
              <span className="text-[var(--color-primary)] font-medium">{dailyGoal} мин</span>
              <span>2 часа</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Стиль обучения</label>
            <div className="grid grid-cols-3 gap-3">
              {[{ id: 'theory', name: 'Теория' }, { id: 'balanced', name: 'Баланс' }, { id: 'practice', name: 'Практика' }].map(s => (
                <button 
                  key={s.id} 
                  onClick={() => setLearningStyle(s.id)}
                  className={`p-3 rounded-xl border-2 transition-colors text-center ${
                    learningStyle === s.id 
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' 
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <p className="font-medium text-white">{s.name}</p>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Тон контента</label>
            <p className="text-sm text-[var(--color-text-secondary)] mb-3">Как AI будет объяснять материал</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'academic', name: '🎓 Научный', desc: 'Формальный стиль' },
                { id: 'conversational', name: '💬 Простой', desc: 'Понятный язык' },
                { id: 'motivational', name: '🚀 Мотивирующий', desc: 'Вдохновляющий' }
              ].map(t => (
                <button 
                  key={t.id} 
                  onClick={() => setContentTone(t.id)}
                  className={`p-3 rounded-xl border-2 transition-colors text-center ${
                    contentTone === t.id 
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' 
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  <p className="font-medium text-white text-sm">{t.name}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--color-primary)]" />
            Уведомления
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ToggleRow icon={<Bell />} title="Напоминания" desc="Напоминания о повторении" value={notifications} onChange={setNotifications} />
        </CardContent>
      </Card>

      {/* Save */}
      <button onClick={handleSave} disabled={isSaving} className={`btn-practicum w-full flex items-center justify-center gap-2 ${saved ? 'bg-green-500 hover:bg-green-600' : ''}`}>
        {isSaving ? (
          <div className="w-5 h-5 border-2 border-[#10101a] border-t-transparent rounded-full animate-spin" />
        ) : saved ? (
          <Check className="w-5 h-5" />
        ) : (
          <Save className="w-5 h-5" />
        )}
        {saved ? 'Сохранено!' : 'Сохранить'}
      </button>
    </div>
  )
}

function ToggleRow({ icon, title, desc, value, onChange }: { icon: React.ReactNode; title: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-[var(--color-text-secondary)]">{icon}</span>
        <div>
          <p className="font-medium text-white">{title}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">{desc}</p>
        </div>
      </div>
      <button onClick={() => onChange(!value)} className={`w-12 h-6 rounded-full transition-colors ${value ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'}`}>
        <div className={`w-5 h-5 bg-white rounded-full transition-transform ${value ? 'translate-x-6' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )
}

