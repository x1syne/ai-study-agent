'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { User, Mail, Target, BookOpen, Clock, Trophy, LogOut, Award, Settings, Shield, Zap, Star, Activity, Hash, Crown, Check, Sparkles, Layers, Brain, Rocket, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui'
import { AchievementBadge, ACHIEVEMENTS } from '@/components/gamification'
import type { AchievementType } from '@/components/gamification'
import { useAuth } from '@/hooks/useAuth'
import { useAppStore } from '@/lib/store'
import { formatMinutes } from '@/lib/utils'

interface Stats {
  currentStreak: number
  longestStreak: number
  totalMinutes: number
  totalLessons: number
  totalTasks: number
  totalXP: number
  level: number
}

interface Achievement {
  type: AchievementType
  unlockedAt: string
}

type TabType = 'profile' | 'subscription'

export default function ProfilePage() {
  const router = useRouter()
  const { user } = useAppStore()
  const { signOut } = useAuth()
  const [stats, setStats] = useState<Stats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [goalsCount, setGoalsCount] = useState(0)
  const [topicsCount, setTopicsCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('profile')
  
  // Subscription state (stored in localStorage for demo)
  const [subscription, setSubscription] = useState<{
    plan: 'free' | 'pro'
    expiresAt: string | null
  }>({ plan: 'free', expiresAt: null })

  useEffect(() => { 
    fetchData()
    // Load subscription from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('subscription')
        if (saved) {
          const sub = JSON.parse(saved)
          // Check if expired
          if (sub.expiresAt && new Date(sub.expiresAt) < new Date()) {
            setSubscription({ plan: 'free', expiresAt: null })
            localStorage.removeItem('subscription')
          } else {
            setSubscription(sub)
          }
        }
      } catch (e) { console.error('Failed to load subscription:', e) }
    }
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, goalsRes] = await Promise.all([fetch('/api/stats'), fetch('/api/goals')])
      if (statsRes.ok) { const data = await statsRes.json(); setStats(data.stats); setAchievements(data.achievements || []) }
      if (goalsRes.ok) { const goals = await goalsRes.json(); setGoalsCount(goals.length); setTopicsCount(goals.reduce((acc: number, g: any) => acc + (g.topics?.length || 0), 0)) }
    } catch (e) { console.error(e) }
    finally { setIsLoading(false) }
  }

  const handleSignOut = async () => { await signOut(); router.push('/login') }
  
  const handleSubscribe = () => {
    // Demo: activate subscription for 30 days
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)
    const newSub = { plan: 'pro' as const, expiresAt: expiresAt.toISOString() }
    setSubscription(newSub)
    localStorage.setItem('subscription', JSON.stringify(newSub))
    alert('Подписка PRO активирована на 30 дней! (демо-режим)')
  }
  
  const handleCancelSubscription = () => {
    if (confirm('Вы уверены, что хотите отменить подписку?')) {
      setSubscription({ plan: 'free', expiresAt: null })
      localStorage.removeItem('subscription')
    }
  }

  if (!user) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>

  const getRank = (xp: number) => {
    if (xp >= 10000) return { name: 'Легенда', color: 'text-[var(--color-primary)]' }
    if (xp >= 5000) return { name: 'Мастер', color: 'text-purple-400' }
    if (xp >= 2000) return { name: 'Эксперт', color: 'text-blue-400' }
    if (xp >= 500) return { name: 'Ученик', color: 'text-green-400' }
    return { name: 'Новичок', color: 'text-[var(--color-text-secondary)]' }
  }

  const rank = getRank(stats?.totalXP || 0)
  const username = user.email?.split('@')[0] || 'user'
  const allAchievementTypes = Object.keys(ACHIEVEMENTS) as AchievementType[]
  const unlockedTypes = new Set(achievements.map(a => a.type))
  const isPro = subscription.plan === 'pro'
  const daysLeft = subscription.expiresAt 
    ? Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="practicum-card-yellow p-6 sm:p-8 rounded-3xl">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-24 h-24 rounded-2xl border-4 border-[#10101a]/20" />
            ) : (
              <div className="w-24 h-24 bg-[#10101a]/20 rounded-2xl flex items-center justify-center">
                <User className="w-12 h-12 text-white" />
              </div>
            )}
            <div className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-bold bg-[#10101a] ${rank.color}`}>
              {isPro ? <Crown className="w-3 h-3 inline mr-1" /> : null}{rank.name}
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{user.name || 'Студент'}</h1>
              {isPro && <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold">PRO</span>}
            </div>
            <p className="text-white/70 flex items-center justify-center sm:justify-start gap-1 mt-1">
              <Hash className="w-4 h-4" />@{username}
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-3 text-sm text-white/70">
              <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{user.email}</span>
              <span className="flex items-center gap-1"><Shield className="w-4 h-4" />Уровень {stats?.level || 1}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => router.push('/settings')} className="px-4 py-2 rounded-xl bg-[#10101a]/20 text-white hover:bg-[#10101a]/30 transition-colors flex items-center gap-2">
              <Settings className="w-4 h-4" /> Настройки
            </button>
            <button onClick={handleSignOut} className="p-2 rounded-xl bg-[#10101a]/20 text-white hover:bg-[#10101a]/30 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-[var(--color-bg-secondary)] rounded-xl">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'profile' 
              ? 'bg-[var(--color-primary)] text-black' 
              : 'text-[var(--color-text-secondary)] hover:text-white'
          }`}
        >
          <User className="w-4 h-4" /> Профиль
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'subscription' 
              ? 'bg-[var(--color-primary)] text-black' 
              : 'text-[var(--color-text-secondary)] hover:text-white'
          }`}
        >
          <Crown className="w-4 h-4" /> Подписка
          {isPro && <span className="w-2 h-2 rounded-full bg-green-500" />}
        </button>
      </div>


      {/* Profile Tab Content */}
      {activeTab === 'profile' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={<Zap />} value={stats?.totalXP || 0} label="Опыта" color="yellow" />
            <StatCard icon={<Clock />} value={formatMinutes(stats?.totalMinutes || 0)} label="Времени" color="blue" />
            <StatCard icon={<Target />} value={stats?.totalTasks || 0} label="Задач" color="green" />
            <StatCard icon={<Trophy />} value={stats?.longestStreak || 0} label="Лучший streak" color="orange" />
          </div>

          {/* Activity */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-green-500" /> Сводка</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                  <p className="text-3xl font-bold text-[var(--color-primary)]">{goalsCount}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Курсов</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                  <p className="text-3xl font-bold text-green-500">{topicsCount}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Тем</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                  <p className="text-3xl font-bold text-purple-500">{achievements.length}</p>
                  <p className="text-sm text-[var(--color-text-secondary)]">Достижений</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2"><Award className="w-5 h-5 text-[var(--color-primary)]" /> Достижения</span>
                <span className="badge-practicum">{achievements.length}/{allAchievementTypes.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
                {allAchievementTypes.map(type => (
                  <AchievementBadge key={type} type={type} unlocked={unlockedTypes.has(type)} size="md" showName />
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Achievements */}
          {achievements.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Star className="w-5 h-5 text-[var(--color-primary)]" /> Недавние</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {achievements.slice(0, 5).map(a => {
                  const info = ACHIEVEMENTS[a.type]
                  return (
                    <div key={a.type} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                      <span className="text-3xl">{info?.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-white">{info?.name}</p>
                        <p className="text-sm text-[var(--color-text-secondary)]">{info?.description}</p>
                      </div>
                      <span className="text-sm text-[var(--color-text-secondary)]">{new Date(a.unlockedAt).toLocaleDateString('ru-RU')}</span>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Subscription Tab Content */}
      {activeTab === 'subscription' && (
        <div className="space-y-6">
          {/* Current Plan Status */}
          {isPro && (
            <Card className="border-purple-500/50 bg-gradient-to-br from-purple-500/10 to-pink-500/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Crown className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Подписка PRO активна</h3>
                      <p className="text-purple-300">Осталось {daysLeft} дней</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleCancelSubscription}
                    className="px-4 py-2 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    Отменить
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plans Comparison */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Free Plan */}
            <Card className={!isPro ? 'ring-2 ring-[var(--color-primary)]' : ''}>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Бесплатный</h3>
                  <p className="text-4xl font-bold text-white mt-2">0 ₽<span className="text-sm font-normal text-[var(--color-text-secondary)]">/мес</span></p>
                </div>
                <ul className="space-y-3 mb-6">
                  <FeatureItem included>3 курса одновременно</FeatureItem>
                  <FeatureItem included>Базовая AI-генерация</FeatureItem>
                  <FeatureItem included>Квизы и практика</FeatureItem>
                  <FeatureItem included>Статистика обучения</FeatureItem>
                  <FeatureItem>Безлимитные курсы</FeatureItem>
                  <FeatureItem>Продвинутый AI-репетитор</FeatureItem>
                  <FeatureItem>Приоритетная генерация</FeatureItem>
                  <FeatureItem>Экспорт сертификатов</FeatureItem>
                </ul>
                {!isPro && (
                  <div className="text-center">
                    <span className="px-4 py-2 rounded-xl bg-slate-700 text-slate-300">Текущий план</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className={`relative overflow-hidden ${isPro ? 'ring-2 ring-purple-500' : ''}`}>
              <div className="absolute top-0 right-0 px-4 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-bl-xl">
                ПОПУЛЯРНЫЙ
              </div>
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">PRO</h3>
                  <p className="text-4xl font-bold text-white mt-2">500 ₽<span className="text-sm font-normal text-[var(--color-text-secondary)]">/мес</span></p>
                </div>
                <ul className="space-y-3 mb-6">
                  <FeatureItem included>Безлимитные курсы</FeatureItem>
                  <FeatureItem included>Продвинутый AI-репетитор</FeatureItem>
                  <FeatureItem included>Приоритетная генерация</FeatureItem>
                  <FeatureItem included>Экспорт сертификатов PDF</FeatureItem>
                  <FeatureItem included>Персональные рекомендации</FeatureItem>
                  <FeatureItem included>Расширенная статистика</FeatureItem>
                  <FeatureItem included>Без рекламы</FeatureItem>
                  <FeatureItem included>Приоритетная поддержка</FeatureItem>
                </ul>
                {isPro ? (
                  <div className="text-center">
                    <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white">Активен</span>
                  </div>
                ) : (
                  <Button onClick={handleSubscribe} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    <CreditCard className="w-4 h-4 mr-2" /> Оформить подписку
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>


          {/* PRO Features Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" /> Что даёт PRO
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <Layers className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Безлимитные курсы</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">Создавай сколько угодно курсов по любым темам</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Умный AI-репетитор</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">Продвинутые объяснения и персональные подсказки</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                    <Rocket className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Быстрая генерация</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">Приоритетная очередь для генерации контента</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Сертификаты</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">Экспортируй сертификаты в PDF формате</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader>
              <CardTitle>Частые вопросы</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                <h4 className="font-semibold text-white mb-1">Как оплатить подписку?</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">Принимаем карты Visa, MasterCard, МИР. Оплата через безопасный платёжный шлюз.</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                <h4 className="font-semibold text-white mb-1">Можно ли отменить подписку?</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">Да, вы можете отменить подписку в любой момент. Доступ сохранится до конца оплаченного периода.</p>
              </div>
              <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)]">
                <h4 className="font-semibold text-white mb-1">Что будет с моими курсами после отмены?</h4>
                <p className="text-sm text-[var(--color-text-secondary)]">Все созданные курсы и прогресс сохранятся. Вы сможете продолжить обучение с ограничениями бесплатного плана.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode; value: string | number; label: string; color: string }) {
  const colors: Record<string, string> = {
    yellow: 'text-[var(--color-primary)] bg-[var(--color-primary)]/10',
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
  }
  return (
    <Card>
      <CardContent className="p-4 text-center">
        <div className={`w-12 h-12 rounded-xl ${colors[color]} flex items-center justify-center mx-auto mb-3`}>{icon}</div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
      </CardContent>
    </Card>
  )
}

function FeatureItem({ children, included = false }: { children: React.ReactNode; included?: boolean }) {
  return (
    <li className={`flex items-center gap-2 ${included ? 'text-white' : 'text-slate-500'}`}>
      {included ? (
        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full border border-slate-600 flex-shrink-0" />
      )}
      <span>{children}</span>
    </li>
  )
}
