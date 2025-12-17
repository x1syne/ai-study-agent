'use client'

import { useState, useEffect } from 'react'
import { 
  Brain, Layers, ListChecks, Sparkles, Loader2, Play, Clock, 
  Plus, Flame, Star, BookOpen, Trophy, ChevronRight, ArrowLeft
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { ReviewCard as ReviewCardComponent } from '@/components/review/ReviewCard'
import { QuizQuestion } from '@/components/learning/QuizQuestion'
import type { ReviewCard } from '@/types'

type View = 'dashboard' | 'study-cards' | 'study-quiz' | 'generate'

interface QuizItem {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
}

interface Goal {
  id: string
  title: string
  topics: { id: string; name: string; slug: string }[]
}

interface QuizSet {
  id: string
  topicName: string
  questions: QuizItem[]
  createdAt: string
  bestScore?: number
}

const topicNameMap: Record<string, string> = {}

export default function ReviewPage() {
  const [view, setView] = useState<View>('dashboard')
  const [cards, setCards] = useState<ReviewCard[]>([])
  const [dueCards, setDueCards] = useState<ReviewCard[]>([])
  const [studyingCards, setStudyingCards] = useState<ReviewCard[]>([])
  const [studyingTopic, setStudyingTopic] = useState<string | null>(null)
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 })
  const [quizSets, setQuizSets] = useState<QuizSet[]>([])
  const [activeQuiz, setActiveQuiz] = useState<QuizSet | null>(null)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 })
  const [quizAnswered, setQuizAnswered] = useState(false)
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedTopic, setSelectedTopic] = useState<{ id: string; name: string; slug: string } | null>(null)
  const [generateType, setGenerateType] = useState<'cards' | 'quiz'>('cards')
  const [itemCount, setItemCount] = useState(15)
  const [isGenerating, setIsGenerating] = useState(false)
  const [dailyStreak, setDailyStreak] = useState(0)
  const [todayReviewed, setTodayReviewed] = useState(0)

  useEffect(() => {
    Promise.all([fetchCards(), fetchGoals(), loadQuizSets()]).finally(() => setIsLoading(false))
    const streak = localStorage.getItem('reviewStreak')
    if (streak) setDailyStreak(parseInt(streak))
    const today = localStorage.getItem('todayReviewed')
    if (today) setTodayReviewed(parseInt(today))
  }, [])

  const fetchCards = async () => {
    try {
      const res = await fetch('/api/review')
      if (res.ok) {
        const data = await res.json()
        const allCards = data.cards || []
        setCards(allCards)
        setDueCards(allCards.filter((c: ReviewCard) => !c.nextReviewDate || new Date(c.nextReviewDate) <= new Date()))
      }
    } catch (e) { console.error(e) }
  }

  const fetchGoals = async () => {
    try {
      const res = await fetch('/api/goals')
      if (res.ok) {
        const data = await res.json()
        setGoals(data)
        data.forEach((g: Goal) => g.topics.forEach(t => { topicNameMap[t.slug] = t.name }))
      }
    } catch (e) { console.error(e) }
  }

  const loadQuizSets = () => {
    const saved = localStorage.getItem('quizSets')
    if (saved) setQuizSets(JSON.parse(saved))
  }

  const saveQuizSets = (sets: QuizSet[]) => {
    localStorage.setItem('quizSets', JSON.stringify(sets))
    setQuizSets(sets)
  }

  const getTopicDisplayName = (slug: string) => topicNameMap[slug] || slug

  const startTopicStudy = (topic: string, topicCards: ReviewCard[]) => {
    const due = topicCards.filter(c => !c.nextReviewDate || new Date(c.nextReviewDate) <= new Date())
    setStudyingCards(due.length > 0 ? due : topicCards)
    setStudyingTopic(getTopicDisplayName(topic))
    setCurrentCardIndex(0)
    setSessionStats({ reviewed: 0, correct: 0 })
    setView('study-cards')
  }

  const handleCardRate = async (quality: 'forgot' | 'hard' | 'good' | 'easy') => {
    const card = studyingCards[currentCardIndex]
    if (!card) return
    const isCorrect = quality !== 'forgot'
    setSessionStats(prev => ({ reviewed: prev.reviewed + 1, correct: prev.correct + (isCorrect ? 1 : 0) }))
    setTodayReviewed(prev => { localStorage.setItem('todayReviewed', String(prev + 1)); return prev + 1 })
    try { await fetch(`/api/review/${card.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: quality }) }) } catch (e) { console.error(e) }
    if (currentCardIndex < studyingCards.length - 1) setCurrentCardIndex(prev => prev + 1)
    else { setView('dashboard'); setStudyingTopic(null); setStudyingCards([]); fetchCards() }
  }

  const startQuiz = (quiz: QuizSet) => { setActiveQuiz(quiz); setQuizIndex(0); setQuizScore({ correct: 0, total: 0 }); setQuizAnswered(false); setView('study-quiz') }
  const handleQuizAnswer = (isCorrect: boolean) => { setQuizScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 })); setQuizAnswered(true) }
  const nextQuizQuestion = () => {
    if (activeQuiz && quizIndex < activeQuiz.questions.length - 1) { setQuizIndex(prev => prev + 1); setQuizAnswered(false) }
    else {
      if (activeQuiz) {
        const score = Math.round((quizScore.correct / quizScore.total) * 100)
        saveQuizSets(quizSets.map(q => q.id === activeQuiz.id ? { ...q, bestScore: Math.max(q.bestScore || 0, score) } : q))
      }
      setActiveQuiz(null); setView('dashboard')
    }
  }

  const handleGenerate = async () => {
    if (!selectedTopic) return
    setIsGenerating(true)
    try {
      const res = await fetch('/api/review/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: generateType, topicName: selectedTopic.name, topicSlug: selectedTopic.slug, count: itemCount }) })
      if (res.ok) {
        const data = await res.json()
        if (generateType === 'cards') {
          await fetchCards()
          setSelectedTopic(null)
          setView('dashboard')
        } else {
          // Create quiz and immediately start it
          const newQuiz: QuizSet = { 
            id: `quiz-${Date.now()}`, 
            topicName: selectedTopic.name, 
            questions: data.questions, 
            createdAt: new Date().toISOString() 
          }
          saveQuizSets([...quizSets, newQuiz])
          setSelectedTopic(null)
          // Start the quiz immediately
          startQuiz(newQuiz)
        }
      }
    } catch (e) { console.error(e) }
    finally { setIsGenerating(false) }
  }

  const cardsByTopic = cards.reduce((acc, card) => {
    const slug = card.topicSlug || 'general'
    const name = getTopicDisplayName(slug)
    if (!acc[name]) acc[name] = { cards: [], slug }
    acc[name].cards.push(card)
    return acc
  }, {} as Record<string, { cards: ReviewCard[]; slug: string }>)

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" /></div>

  // Study Cards View
  if (view === 'study-cards') {
    const card = studyingCards[currentCardIndex]
    const progress = studyingCards.length > 0 ? (currentCardIndex / studyingCards.length) * 100 : 0
    if (!card) return <SessionComplete stats={sessionStats} onBack={() => { setView('dashboard'); setStudyingCards([]) }} />
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <button onClick={() => { setView('dashboard'); setStudyingCards([]) }} className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> Назад
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-secondary)]">{currentCardIndex + 1}/{studyingCards.length}</span>
            <span className="badge-practicum-success">{sessionStats.correct} ✓</span>
          </div>
        </div>
        <div className="progress-practicum"><div className="progress-practicum-fill" style={{ width: `${progress}%` }} /></div>
        <div className="text-center"><span className="badge-practicum text-base px-4 py-2">{studyingTopic}</span></div>
        <ReviewCardComponent front={card.front} back={card.back} onRate={handleCardRate} />
      </div>
    )
  }

  // Study Quiz View
  if (view === 'study-quiz' && activeQuiz) {
    const q = activeQuiz.questions[quizIndex]
    const progress = (quizIndex / activeQuiz.questions.length) * 100
    if (!q) return <SessionComplete stats={{ reviewed: quizScore.total, correct: quizScore.correct }} onBack={() => { setActiveQuiz(null); setView('dashboard') }} />
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <button onClick={() => { setActiveQuiz(null); setView('dashboard') }} className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> Выйти
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--color-text-secondary)]">{quizIndex + 1}/{activeQuiz.questions.length}</span>
            <span className="badge-practicum-success">{quizScore.correct} ✓</span>
          </div>
        </div>
        <div className="progress-practicum"><div className="progress-practicum-fill" style={{ width: `${progress}%` }} /></div>
        <Card><CardContent className="p-6">
          <QuizQuestion key={`quiz-${quizIndex}`} question={q.question} options={q.options} correctAnswer={q.correctAnswer} explanation={q.explanation} onAnswer={handleQuizAnswer} />
          {quizAnswered && <button onClick={nextQuizQuestion} className="btn-practicum w-full mt-4">{quizIndex < activeQuiz.questions.length - 1 ? 'Следующий →' : '🎉 Завершить'}</button>}
        </CardContent></Card>
      </div>
    )
  }

  // Generate View
  if (view === 'generate') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <button onClick={() => setView('dashboard')} className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> Назад
          </button>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Sparkles className="w-5 h-5 text-[var(--color-primary)]" /> AI Генерация</h2>
          <div className="w-20" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[{ type: 'cards' as const, icon: Layers, title: 'Карточки', desc: 'Флеш-карты', max: 120 }, { type: 'quiz' as const, icon: ListChecks, title: 'Квиз', desc: 'Тест', max: 60 }].map(item => (
            <button key={item.type} onClick={() => setGenerateType(item.type)} className={`p-6 rounded-2xl border-2 text-left transition-all ${generateType === item.type ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'}`}>
              <item.icon className={`w-10 h-10 mb-3 ${generateType === item.type ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-secondary)]'}`} />
              <div className="font-bold text-white">{item.title}</div>
              <div className="text-sm text-[var(--color-text-secondary)]">{item.desc}</div>
            </button>
          ))}
        </div>
        <Card><CardHeader><CardTitle className="text-base">Выбери тему</CardTitle></CardHeader><CardContent>
          {goals.length > 0 ? goals.map(goal => (
            <div key={goal.id} className="mb-4">
              <p className="text-xs text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">{goal.title}</p>
              <div className="flex flex-wrap gap-2">
                {goal.topics.map(topic => (
                  <button key={topic.id} onClick={() => setSelectedTopic(topic)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedTopic?.id === topic.id ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg-secondary)] text-white hover:bg-[var(--color-border)]'}`}>{topic.name}</button>
                ))}
              </div>
            </div>
          )) : <p className="text-center text-[var(--color-text-secondary)] py-8">Сначала создай курсы</p>}
        </CardContent></Card>
        {selectedTopic && (
          <Card><CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[var(--color-text-secondary)]">Количество</span>
              <input 
                type="number" 
                min="1" 
                max={generateType === 'cards' ? 120 : 60} 
                value={itemCount} 
                onChange={e => setItemCount(Math.max(1, Math.min(generateType === 'cards' ? 120 : 60, parseInt(e.target.value) || 1)))} 
                className="w-20 px-3 py-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-white text-center text-xl font-bold"
              />
            </div>
            <input type="range" min="5" max={generateType === 'cards' ? 120 : 60} step="5" value={itemCount} onChange={e => setItemCount(parseInt(e.target.value))} className="w-full accent-[var(--color-primary)]" />
            {/* Quick presets */}
            <div className="flex gap-2 mt-4">
              {(generateType === 'cards' ? [10, 20, 30, 50] : [5, 10, 15, 20]).map(num => (
                <button 
                  key={num} 
                  onClick={() => setItemCount(num)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${itemCount === num ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-white'}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </CardContent></Card>
        )}
        <button onClick={handleGenerate} disabled={!selectedTopic || isGenerating} className="btn-practicum w-full h-14 text-lg disabled:opacity-50">
          {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin mr-2 inline" /> Генерация...</> : <><Sparkles className="w-5 h-5 mr-2 inline" /> Создать</>}
        </button>
      </div>
    )
  }

  // Dashboard View
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Hero */}
      <div className="practicum-card-yellow p-6 sm:p-8 rounded-3xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#10101a]/20 rounded-2xl flex items-center justify-center"><Brain className="w-7 h-7 text-white" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Тренажёр</h1>
              <p className="text-white/70">Закрепляй знания каждый день</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center"><div className="flex items-center gap-1 text-white"><Flame className="w-5 h-5" /><span className="text-2xl font-bold">{dailyStreak}</span></div><p className="text-xs text-white/70">дней</p></div>
            <div className="text-center"><div className="flex items-center gap-1 text-white"><Star className="w-5 h-5" /><span className="text-2xl font-bold">{todayReviewed}</span></div><p className="text-xs text-white/70">сегодня</p></div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-3 gap-4">
        <button onClick={() => { setStudyingCards(dueCards); setStudyingTopic('Все темы'); setCurrentCardIndex(0); setSessionStats({ reviewed: 0, correct: 0 }); setView('study-cards') }} disabled={dueCards.length === 0} className={`p-6 rounded-2xl border-2 text-left transition-all ${dueCards.length > 0 ? 'border-orange-500/50 bg-orange-500/10 hover:border-orange-500' : 'border-[var(--color-border)] opacity-50'}`}>
          <div className="flex items-center gap-3 mb-2"><div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center"><Clock className="w-6 h-6 text-orange-500" /></div><div><p className="text-3xl font-bold text-white">{dueCards.length}</p><p className="text-sm text-[var(--color-text-secondary)]">к повторению</p></div></div>
          {dueCards.length > 0 && <p className="text-sm text-orange-500 flex items-center gap-1"><Play className="w-4 h-4" /> Начать</p>}
        </button>
        <div className="p-6 rounded-2xl border-2 border-[var(--color-border)]">
          <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center"><Layers className="w-6 h-6 text-[var(--color-primary)]" /></div><div><p className="text-3xl font-bold text-white">{cards.length}</p><p className="text-sm text-[var(--color-text-secondary)]">всего карточек</p></div></div>
        </div>
        <button onClick={() => setView('generate')} className="p-6 rounded-2xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] text-left transition-all group">
          <div className="flex items-center gap-3 mb-2"><div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center group-hover:bg-[var(--color-primary)]/20 transition-colors"><Plus className="w-6 h-6 text-[var(--color-primary)]" /></div><div><p className="font-bold text-white">Создать</p><p className="text-sm text-[var(--color-text-secondary)]">с помощью AI</p></div></div>
        </button>
      </div>

      {/* Cards by Topic */}
      {Object.keys(cardsByTopic).length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-[var(--color-primary)]" /> Мои карточки</h2>
          <div className="space-y-3">
            {Object.entries(cardsByTopic).map(([name, { cards: topicCards, slug }]) => {
              const dueCount = topicCards.filter(c => !c.nextReviewDate || new Date(c.nextReviewDate) <= new Date()).length
              return (
                <button key={slug} onClick={() => startTopicStudy(slug, topicCards)} className="w-full practicum-card p-4 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center"><Layers className="w-6 h-6 text-[var(--color-primary)]" /></div>
                    <div className="text-left"><p className="font-semibold text-white group-hover:text-[var(--color-primary)] transition-colors">{name}</p><p className="text-sm text-[var(--color-text-secondary)]">{topicCards.length} карточек {dueCount > 0 && <span className="text-orange-500">• {dueCount} к повторению</span>}</p></div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[var(--color-text-secondary)] group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all" />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Quizzes */}
      {quizSets.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-[var(--color-primary)]" /> Мои квизы</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {quizSets.map(quiz => (
              <button key={quiz.id} onClick={() => startQuiz(quiz)} className="practicum-card p-5 text-left group">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center"><ListChecks className="w-5 h-5 text-[var(--color-primary)]" /></div>
                  {quiz.bestScore !== undefined && <span className="badge-practicum-success">{quiz.bestScore}%</span>}
                </div>
                <p className="font-semibold text-white group-hover:text-[var(--color-primary)] transition-colors">{quiz.topicName}</p>
                <p className="text-sm text-[var(--color-text-secondary)]">{quiz.questions.length} вопросов</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function SessionComplete({ stats, onBack }: { stats: { reviewed: number; correct: number }; onBack: () => void }) {
  const percent = stats.reviewed > 0 ? Math.round((stats.correct / stats.reviewed) * 100) : 0
  return (
    <div className="max-w-md mx-auto text-center py-12 animate-fade-in">
      <div className="w-24 h-24 bg-[var(--color-primary)] rounded-3xl flex items-center justify-center mx-auto mb-6"><Trophy className="w-12 h-12 text-white" /></div>
      <h2 className="text-2xl font-bold text-white mb-2">Отлично!</h2>
      <p className="text-5xl font-bold text-[var(--color-primary)] mb-2">{percent}%</p>
      <p className="text-[var(--color-text-secondary)] mb-6">{stats.correct} из {stats.reviewed} правильно</p>
      <button onClick={onBack} className="btn-practicum">Продолжить</button>
    </div>
  )
}

