'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Search, Sparkles, ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardContent, Button, Input } from '@/components/ui'
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
      'Алгоритмы': ['Сортировки', 'Поиск', 'Графы', 'Динамическое программирование', 'Рекурсия', 'Big O нотация']
    }
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
      'Японский': ['Хирагана и катакана', 'Базовые кандзи', 'JLPT N5-N4', 'JLPT N3-N2', 'Разговорный японский', 'Аниме-японский']
    }
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
      'Статистика': ['Описательная статистика', 'Проверка гипотез', 'Регрессия', 'Корреляция', 'A/B тестирование', 'Байесовская статистика']
    }
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
      'Экология': ['Экосистемы', 'Изменение климата', 'Устойчивое развитие', 'Биоразнообразие', 'Загрязнение', 'Зелёная энергетика']
    }
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
      'Стартапы': ['Идея и валидация', 'MVP', 'Привлечение инвестиций', 'Unit-экономика', 'Масштабирование', 'Продуктовый менеджмент']
    }
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
      'Анимация': ['Принципы анимации', 'After Effects', 'Motion дизайн', 'Lottie', 'CSS анимации', 'Персонажная анимация']
    }
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
      'Продакшн': ['DAW основы', 'Сведение', 'Мастеринг', 'Синтез звука', 'Сэмплирование', 'Битмейкинг']
    }
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
      'Первая помощь': ['Базовая первая помощь', 'СЛР', 'Травмы', 'Ожоги', 'Отравления', 'Экстренные ситуации']
    }
  },
]

type Step = 'category' | 'subtopic' | 'topic' | 'custom' | 'creating'

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
    if (customTopic.trim()) {
      createGoal(customTopic, customTopic)
    }
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
        const goal = await res.json()
        // Requirement 5: Redirect to /graph after course creation
        router.push('/graph')
      } else {
        const data = await res.json()
        setError(data.error || 'Ошибка создания курса')
        setStep('category')
      }
    } catch (e) {
      setError('Ошибка сети')
      setStep('category')
    } finally {
      setIsCreating(false)
    }
  }

  if (step === 'creating') {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="w-16 h-16 text-primary-400 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">Создаём курс...</h2>
            <p className="text-slate-400">AI генерирует учебный план и структуру курса</p>
            <p className="text-slate-500 text-sm mt-4">Это может занять 30-60 секунд</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/goals">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-white">Новый курс</h1>
          <p className="text-slate-400">Выбери тему или введи свою</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {step === 'category' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск темы..."
              className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Custom topic */}
          <Card className="border-primary-500/30 bg-primary-500/5">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">Своя тема</h3>
                  <p className="text-sm text-slate-400">Введи любую тему для изучения</p>
                </div>
                <Button onClick={() => setStep('custom')}>
                  Ввести
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Popular topics */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">Популярные темы</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {filteredTopics.map(topic => (
                <Card 
                  key={topic.id} 
                  hover 
                  className="cursor-pointer"
                  onClick={() => handleSelectCategory(topic)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="text-3xl">{topic.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-white">{topic.name}</h3>
                        <p className="text-sm text-slate-400">{Object.keys(topic.subtopics).slice(0, 3).join(', ')}...</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </>
      )}

      {step === 'subtopic' && selectedCategory && (
        <>
          <Button variant="ghost" onClick={() => setStep('category')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Назад
          </Button>

          <div className="flex items-center gap-4 mb-6">
            <div className="text-4xl">{selectedCategory.icon}</div>
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedCategory.name}</h2>
              <p className="text-slate-400">Выбери направление или введи своё</p>
            </div>
          </div>

          {/* Custom subtopic */}
          <Card className="border-primary-500/30 bg-primary-500/5 mb-6">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder={`Например: ${Object.keys(selectedCategory.subtopics)[0]} для начинающих`}
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                />
                <Button onClick={handleCustomSubmit} disabled={!customTopic.trim()}>
                  Создать
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Subtopics */}
          <div className="grid md:grid-cols-3 gap-3">
            {Object.keys(selectedCategory.subtopics).map(subtopic => (
              <Card 
                key={subtopic} 
                hover 
                className="cursor-pointer"
                onClick={() => handleSelectSubtopic(subtopic)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">{subtopic}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedCategory.subtopics[subtopic as keyof typeof selectedCategory.subtopics]?.length || 0} тем
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {step === 'topic' && selectedCategory && selectedSubtopic && (
        <>
          <Button variant="ghost" onClick={() => setStep('subtopic')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Назад к {selectedCategory.name}
          </Button>

          <div className="flex items-center gap-4 mb-6">
            <div className="text-4xl">{selectedCategory.icon}</div>
            <div>
              <h2 className="text-2xl font-bold text-white">{selectedSubtopic}</h2>
              <p className="text-slate-400">Выбери конкретную тему или введи свою</p>
            </div>
          </div>

          {/* Custom topic input */}
          <Card className="border-primary-500/30 bg-primary-500/5 mb-6">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder={`Своя тема по ${selectedSubtopic}...`}
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && customTopic.trim() && createGoal(`${selectedCategory.name}: ${selectedSubtopic}`, customTopic)}
                />
                <Button 
                  onClick={() => createGoal(`${selectedCategory.name}: ${selectedSubtopic}`, customTopic)} 
                  disabled={!customTopic.trim()}
                >
                  Создать
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Specific topics */}
          <h3 className="text-lg font-semibold text-white mb-4">Готовые темы</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {(selectedCategory.subtopics[selectedSubtopic as keyof typeof selectedCategory.subtopics] || []).map(topic => (
              <Card 
                key={topic} 
                hover 
                className="cursor-pointer"
                onClick={() => handleSelectTopic(topic)}
              >
                <CardContent className="p-4">
                  <span className="text-white">{topic}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {step === 'custom' && (
        <>
          <Button variant="ghost" onClick={() => setStep('category')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> Назад
          </Button>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">Что хочешь изучить?</h2>
              <p className="text-slate-400 mb-6">
                Введи любую тему — AI создаст персональный курс с теорией и практикой
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Например: Квантовая физика, История Древнего Рима, Машинное обучение..."
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-primary-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
                  autoFocus
                />
                <Button 
                  onClick={handleCustomSubmit} 
                  disabled={!customTopic.trim()}
                  className="w-full"
                  leftIcon={<Sparkles className="w-5 h-5" />}
                >
                  Создать курс
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

