'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Sparkles, ChevronRight, Loader2, X } from 'lucide-react'
import Link from 'next/link'

// Трёхуровневая структура: Категория → Подтема → Конкретные темы
const POPULAR_TOPICS = [
  {
    id: 'programming',
    name: 'Программирование',
    icon: '💻',
    subtopics: {
      'Python': ['Основы синтаксиса', 'ООП в Python', 'Работа с файлами', 'Библиотека pandas', 'Django/Flask', 'Асинхронность'],
      'JavaScript': ['Основы JS', 'DOM и события', 'Async/Await', 'ES6+ фичи', 'TypeScript', 'Node.js основы'],
      'React': ['Компоненты и JSX', 'Хуки (useState, useEffect)', 'React Router', 'Состояние и Redux', 'Next.js', 'Тестирование'],
      'SQL': ['SELECT и JOIN', 'Агрегатные функции', 'Индексы', 'Транзакции', 'PostgreSQL', 'Оптимизация запросов'],
      'Git': ['Основные команды', 'Ветвление', 'Merge и Rebase', 'GitHub Flow', 'Конфликты', 'Git Hooks'],
      'Алгоритмы': ['Сортировки', 'Поиск', 'Графы', 'Динамическое программирование', 'Рекурсия', 'Big O нотация'],
    },
  },
  {
    id: 'languages',
    name: 'Иностранные языки',
    icon: '🌍',
    subtopics: {
      'Английский': ['Грамматика A1-A2', 'Грамматика B1-B2', 'Разговорный английский', 'Бизнес-английский', 'IELTS подготовка', 'Произношение'],
      'Немецкий': ['Основы грамматики', 'Артикли и падежи', 'Разговорные фразы', 'Бизнес-немецкий', 'TestDaF', 'Произношение'],
      'Французский': ['Основы грамматики', 'Времена глаголов', 'Разговорный французский', 'DELF подготовка', 'Произношение', 'Культура Франции'],
      'Испанский': ['Основы грамматики', 'Времена глаголов', 'Разговорный испанский', 'DELE подготовка', 'Латиноамериканский испанский', 'Произношение'],
      'Китайский': ['Пиньинь и тоны', 'Базовые иероглифы', 'HSK 1-2', 'HSK 3-4', 'Разговорный китайский', 'Культура Китая'],
      'Японский': ['Хирагана и катакана', 'Базовые кандзи', 'JLPT N5-N4', 'JLPT N3-N2', 'Разговорный японский', 'Аниме-японский'],
    },
  },
  {
    id: 'math',
    name: 'Математика',
    icon: '📐',
    subtopics: {
      'Алгебра': ['Уравнения и неравенства', 'Функции и графики', 'Логарифмы', 'Прогрессии', 'Комплексные числа', 'Многочлены'],
      'Геометрия': ['Планиметрия', 'Стереометрия', 'Векторы', 'Координатный метод', 'Тригонометрия', 'Площади и объёмы'],
      'Мат. анализ': ['Пределы', 'Производные', 'Интегралы', 'Ряды', 'Дифференциальные уравнения', 'Многомерный анализ'],
      'Линейная алгебра': ['Матрицы', 'Определители', 'Системы уравнений', 'Векторные пространства', 'Собственные значения', 'Линейные отображения'],
      'Теория вероятностей': ['Базовые понятия', 'Условная вероятность', 'Формула Байеса', 'Случайные величины', 'Распределения', 'Закон больших чисел'],
      'Статистика': ['Описательная статистика', 'Проверка гипотез', 'Регрессия', 'Корреляция', 'A/B тестирование', 'Байесовская статистика'],
    },
  },
  {
    id: 'science',
    name: 'Естественные науки',
    icon: '🔬',
    subtopics: {
      'Физика': ['Механика', 'Термодинамика', 'Электричество', 'Оптика', 'Квантовая физика', 'Теория относительности'],
      'Химия': ['Общая химия', 'Органическая химия', 'Неорганическая химия', 'Биохимия', 'Химические реакции', 'Периодическая таблица'],
      'Биология': ['Клеточная биология', 'Генетика', 'Эволюция', 'Анатомия человека', 'Экология', 'Микробиология'],
      'Астрономия': ['Солнечная система', 'Звёзды и галактики', 'Космология', 'Чёрные дыры', 'Экзопланеты', 'История космонавтики'],
      'География': ['Физическая география', 'Экономическая география', 'Климатология', 'Картография', 'Геология', 'Океанология'],
      'Экология': ['Экосистемы', 'Изменение климата', 'Устойчивое развитие', 'Биоразнообразие', 'Загрязнение', 'Зелёная энергетика'],
    },
  },
  {
    id: 'business',
    name: 'Бизнес и финансы',
    icon: '📊',
    subtopics: {
      'Маркетинг': ['Digital маркетинг', 'SMM', 'SEO', 'Контент-маркетинг', 'Email-маркетинг', 'Аналитика'],
      'Менеджмент': ['Основы управления', 'Agile/Scrum', 'Лидерство', 'Управление проектами', 'HR менеджмент', 'Тайм-менеджмент'],
      'Инвестиции': ['Основы инвестирования', 'Акции', 'Облигации', 'ETF и фонды', 'Криптовалюты', 'Портфельная теория'],
      'Бухгалтерия': ['Основы бухучёта', 'Финансовая отчётность', 'Налоги', 'Управленческий учёт', '1С', 'МСФО'],
      'Экономика': ['Микроэкономика', 'Макроэкономика', 'Международная экономика', 'Экономическая история', 'Поведенческая экономика', 'Финансовые рынки'],
      'Стартапы': ['Идея и валидация', 'MVP', 'Привлечение инвестиций', 'Unit-экономика', 'Масштабирование', 'Продуктовый менеджмент'],
    },
  },
  {
    id: 'design',
    name: 'Дизайн',
    icon: '🎨',
    subtopics: {
      'UI/UX': ['Основы UX', 'UI дизайн', 'Прототипирование', 'Юзабилити', 'Дизайн-системы', 'UX исследования'],
      'Графический дизайн': ['Композиция', 'Типографика', 'Цветоведение', 'Брендинг', 'Полиграфия', 'Иллюстрация'],
      'Figma': ['Интерфейс Figma', 'Компоненты', 'Auto Layout', 'Прототипы', 'Плагины', 'Командная работа'],
      'Photoshop': ['Основы Photoshop', 'Ретушь', 'Коллажи', 'Цветокоррекция', 'Эффекты', 'Автоматизация'],
      '3D моделирование': ['Blender основы', 'Моделирование', 'Текстурирование', 'Рендеринг', 'Анимация', 'Скульптинг'],
      'Анимация': ['Принципы анимации', 'After Effects', 'Motion дизайн', 'Lottie', 'CSS анимации', 'Персонажная анимация'],
    },
  },
  {
    id: 'music',
    name: 'Музыка',
    icon: '🎵',
    subtopics: {
      'Гитара': ['Основы игры', 'Аккорды', 'Бой и перебор', 'Табулатуры', 'Соло', 'Стили игры'],
      'Фортепиано': ['Основы игры', 'Чтение нот', 'Гаммы и аккорды', 'Классика', 'Джаз', 'Импровизация'],
      'Теория музыки': ['Ноты и ритм', 'Интервалы', 'Аккорды', 'Гармония', 'Формы', 'Анализ произведений'],
      'Вокал': ['Дыхание', 'Постановка голоса', 'Диапазон', 'Вокальные техники', 'Стили пения', 'Работа с микрофоном'],
      'Ударные': ['Основы ритма', 'Базовые биты', 'Рудименты', 'Стили', 'Координация', 'Импровизация'],
      'Продакшн': ['DAW основы', 'Сведение', 'Мастеринг', 'Синтез звука', 'Сэмплирование', 'Битмейкинг'],
    },
  },
  {
    id: 'health',
    name: 'Здоровье',
    icon: '🏃',
    subtopics: {
      'Фитнес': ['Силовые тренировки', 'Кардио', 'Растяжка', 'Функциональный тренинг', 'Домашние тренировки', 'Программы тренировок'],
      'Питание': ['Основы нутрициологии', 'Макронутриенты', 'Диеты', 'Спортивное питание', 'Интервальное голодание', 'Meal prep'],
      'Йога': ['Хатха-йога', 'Виньяса', 'Аштанга', 'Йога для начинающих', 'Медитативная йога', 'Йога-нидра'],
      'Медитация': ['Основы медитации', 'Осознанность', 'Дыхательные практики', 'Визуализация', 'Мантры', 'Медитация для сна'],
      'Психология': ['Когнитивная психология', 'Эмоциональный интеллект', 'Стресс-менеджмент', 'Отношения', 'Самооценка', 'Привычки'],
      'Первая помощь': ['Базовая первая помощь', 'СЛР', 'Травмы', 'Ожоги', 'Отравления', 'Экстренные ситуации'],
    },
  },
]

type Step = 'category' | 'subtopic' | 'topic' | 'custom' | 'creating'

// ── Shared UI helpers ────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      {children}
    </h2>
  )
}

function BackButton({ onClick, label = 'Назад' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg mb-6 transition-all duration-200 hover:-translate-x-0.5"
      style={{ color: 'var(--color-text-secondary)', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function NewGoalPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('category')
  const [selectedCategory, setSelectedCategory] = useState<typeof POPULAR_TOPICS[0] | null>(null)
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('')
  const [customTopic, setCustomTopic] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState('')

  const filteredTopics = POPULAR_TOPICS.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    Object.keys(t.subtopics).some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const handleSelectCategory = (category: typeof POPULAR_TOPICS[0]) => {
    setSelectedCategory(category)
    setStep('subtopic')
  }

  const handleSelectSubtopic = (subtopic: string) => {
    setSelectedSubtopic(subtopic)
    setStep('topic')
  }

  const handleSelectTopic = (topic: string) => {
    createGoal(`${selectedCategory?.name}: ${selectedSubtopic}`, topic)
  }

  const handleCustomSubmit = () => {
    if (customTopic.trim()) createGoal(customTopic, customTopic)
  }

  const createGoal = async (title: string, skill: string) => {
    setIsCreating(true)
    setStep('creating')
    setError('')
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, skill, level: 'beginner' }),
      })
      if (res.ok) {
        router.push('/graph')
      } else {
        const data = await res.json()
        setError(data.error || 'Ошибка создания курса')
        setStep('category')
      }
    } catch {
      setError('Ошибка сети')
      setStep('category')
    } finally {
      setIsCreating(false)
    }
  }

  // ── Creating screen ──────────────────────────────────────────────────────
  if (step === 'creating') {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center animate-fade-in">
        <div className="rounded-3xl border p-12"
          style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
          {/* Animated logo */}
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)' }}>
              <Sparkles className="w-9 h-9 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl animate-glow-pulse"
              style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)', filter: 'blur(24px)', opacity: 0.4, zIndex: -1 }} />
            {/* Orbit dots */}
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-bg-card)', border: '2px solid var(--color-border)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--color-accent)' }} />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">AI создаёт курс</h2>
          <p className="mb-2" style={{ color: 'var(--color-text-secondary)' }}>
            Генерируем учебный план и структуру курса
          </p>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-muted)' }}>Это займёт 30–60 секунд</p>

          {/* Animated steps */}
          <div className="space-y-3 text-left">
            {['Анализ темы', 'Создание модулей', 'Генерация заданий'].map((s, i) => (
              <div key={s} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--color-primary)', animationDelay: `${i * 200}ms` }} />
                <span className="text-sm text-white">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Breadcrumb ────────────────────────────────────────────────────────────
  const breadcrumbs = [
    { label: 'Категория', active: step === 'category' },
    ...(step !== 'category' ? [{ label: selectedCategory?.name || '', active: step === 'subtopic' }] : []),
    ...(step === 'topic' ? [{ label: selectedSubtopic, active: true }] : []),
    ...(step === 'custom' ? [{ label: 'Своя тема', active: true }] : []),
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/goals">
          <button className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 hover:-translate-x-0.5"
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Новый курс</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            AI построит персональный план обучения
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      {breadcrumbs.length > 1 && (
        <div className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--color-text-muted)' }} />}
              <span style={{ color: b.active ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                {b.label}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}>
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── STEP: category ─────────────────────────────────────────────────── */}
      {step === 'category' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
            <input type="text" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск темы..."
              className="w-full pl-11 pr-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)' }}
              onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Custom topic highlight card */}
          <div className="rounded-2xl p-5 flex items-center gap-4 cursor-pointer group transition-all duration-200 hover:-translate-y-0.5"
            style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}
            onClick={() => setStep('custom')}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
              style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--color-primary)' }}>
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Своя тема</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Введи любую тему — AI создаст курс с нуля
              </p>
            </div>
            <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1"
              style={{ color: 'var(--color-primary)' }} />
          </div>

          {/* Popular topics grid */}
          <div>
            <SectionTitle>
              <span>Популярные темы</span>
              {searchQuery && <span className="text-sm font-normal" style={{ color: 'var(--color-text-muted)' }}>({filteredTopics.length})</span>}
            </SectionTitle>
            <div className="grid md:grid-cols-2 gap-3">
              {filteredTopics.map(topic => (
                <button key={topic.id} onClick={() => handleSelectCategory(topic)}
                  className="text-left rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 group"
                  style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.background = 'rgba(124,58,237,0.03)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-bg-card)' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl flex-shrink-0">{topic.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white">{topic.name}</h3>
                      <p className="text-sm truncate mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {Object.keys(topic.subtopics).slice(0, 3).join(' · ')}...
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5"
                      style={{ color: 'var(--color-primary)' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── STEP: subtopic ─────────────────────────────────────────────────── */}
      {step === 'subtopic' && selectedCategory && (
        <>
          <BackButton onClick={() => setStep('category')} />

          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl">{selectedCategory.icon}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedCategory.name}</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Выбери направление или введи своё</p>
            </div>
          </div>

          {/* Custom subtopic input */}
          <div className="rounded-2xl p-5 mb-2"
            style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
              Своё направление
            </p>
            <div className="flex gap-3">
              <input type="text" value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                placeholder={`Например: ${Object.keys(selectedCategory.subtopics)[0]} для начинающих`}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }}
                onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()} />
              <button onClick={handleCustomSubmit} disabled={!customTopic.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)' }}>
                Создать
              </button>
            </div>
          </div>

          {/* Subtopics grid */}
          <div>
            <SectionTitle>Направления</SectionTitle>
            <div className="grid md:grid-cols-3 gap-3">
              {Object.entries(selectedCategory.subtopics).map(([subtopic, topics]) => (
                <button key={subtopic} onClick={() => handleSelectSubtopic(subtopic)}
                  className="text-left rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 group"
                  style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-medium text-white">{subtopic}</span>
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200"
                      style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {topics.length} тем
                  </p>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── STEP: topic ────────────────────────────────────────────────────── */}
      {step === 'topic' && selectedCategory && selectedSubtopic && (
        <>
          <BackButton onClick={() => setStep('subtopic')} label={`Назад к ${selectedCategory.name}`} />

          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl">{selectedCategory.icon}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedSubtopic}</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Выбери конкретную тему или введи свою</p>
            </div>
          </div>

          {/* Custom topic input */}
          <div className="rounded-2xl p-5 mb-2"
            style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)' }}>
            <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
              Своя тема
            </p>
            <div className="flex gap-3">
              <input type="text" value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                placeholder={`Своя тема по ${selectedSubtopic}...`}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)' }}
                onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }}
                onKeyDown={e => e.key === 'Enter' && customTopic.trim() && createGoal(`${selectedCategory.name}: ${selectedSubtopic}`, customTopic)} />
              <button
                onClick={() => createGoal(`${selectedCategory.name}: ${selectedSubtopic}`, customTopic)}
                disabled={!customTopic.trim()}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)' }}>
                Создать
              </button>
            </div>
          </div>

          {/* Specific topics */}
          <div>
            <SectionTitle>Готовые темы</SectionTitle>
            <div className="grid md:grid-cols-2 gap-3">
              {(selectedCategory.subtopics[selectedSubtopic as keyof typeof selectedCategory.subtopics] || []).map(topic => (
                <button key={topic} onClick={() => handleSelectTopic(topic)}
                  className="text-left rounded-2xl border px-5 py-4 text-sm font-medium text-white transition-all duration-200 hover:-translate-y-0.5 group flex items-center justify-between"
                  style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.35)'; e.currentTarget.style.background = 'rgba(124,58,237,0.04)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'var(--color-bg-card)' }}>
                  {topic}
                  <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200"
                    style={{ color: 'var(--color-primary)' }} />
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── STEP: custom ───────────────────────────────────────────────────── */}
      {step === 'custom' && (
        <>
          <BackButton onClick={() => setStep('category')} />

          <div className="rounded-3xl border p-8"
            style={{ background: 'var(--color-bg-card)', borderColor: 'var(--color-border)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--color-primary)' }}>
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Что хочешь изучить?</h2>
            <p className="mb-7" style={{ color: 'var(--color-text-secondary)' }}>
              Введи любую тему — AI создаст персональный курс с теорией и практикой
            </p>

            <div className="space-y-4">
              <div className="relative">
                <input type="text" value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                  placeholder="Например: Квантовая физика, История Рима, Машинное обучение..."
                  className="w-full px-5 py-3.5 rounded-xl text-sm outline-none transition-all duration-200"
                  style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none' }}
                  onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
                  autoFocus />
              </div>

              <button onClick={handleCustomSubmit} disabled={!customTopic.trim() || isCreating}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-white text-sm transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #4f46e5 100%)' }}>
                <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
                  style={{ boxShadow: '0 0 30px rgba(124,58,237,0.4)' }} />
                {isCreating
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Создаём курс...</>
                  : <><Sparkles className="w-4 h-4" />Создать курс</>
                }
              </button>
            </div>

            {/* Example suggestions */}
            <div className="mt-6">
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>Например:</p>
              <div className="flex flex-wrap gap-2">
                {['Квантовая физика', 'Машинное обучение', 'История Японии', 'Игра на укулеле', 'Веб-дизайн'].map(ex => (
                  <button key={ex} onClick={() => setCustomTopic(ex)}
                    className="px-3 py-1.5 rounded-lg text-xs transition-all duration-200 hover:-translate-y-0.5"
                    style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'; e.currentTarget.style.color = 'var(--color-primary)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
