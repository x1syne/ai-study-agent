import Link from 'next/link'
import {
  ArrowRight,
  Books,
  Brain,
  CalendarCheck,
  ChartLineUp,
  ChatCircleText,
  CheckCircle,
  Graph,
  NotePencil,
  ShieldCheck,
  Target,
} from '@phosphor-icons/react/dist/ssr'

const learningLoop = [
  {
    title: 'Цель',
    text: 'Студент описывает результат: экзамен, новая профессия, тема для проекта.',
  },
  {
    title: 'Маршрут',
    text: 'Система собирает модули, зависимости и порядок изучения.',
  },
  {
    title: 'Занятие',
    text: 'Каждая тема превращается в теорию, практику и проверку понимания.',
  },
  {
    title: 'Повторение',
    text: 'Слабые места возвращаются в тренажёр, пока знание не закрепится.',
  },
]

const disciplines = [
  'Программирование',
  'Математика',
  'Физика',
  'Языки',
  'Экономика',
  'Инженерия',
  'История',
  'Дизайн',
]

const productPoints = [
  {
    icon: Graph,
    title: 'Граф знаний',
    text: 'Видно, какие темы уже открыты, какие зависят друг от друга и где студент застрял.',
  },
  {
    icon: NotePencil,
    title: 'Теория и практика',
    text: 'Материалы генерируются под конкретную цель и сразу связываются с заданиями.',
  },
  {
    icon: CalendarCheck,
    title: 'Ритм повторения',
    text: 'Карточки и задачи возвращаются по расписанию, а не когда студент случайно вспомнит.',
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f4f7f5] text-[#111816] selection:bg-[#c6ff4d] selection:text-[#111816]">
      <header className="sticky top-0 z-50 border-b border-[#dce4df] bg-[#f4f7f5]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="AI Study home">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#101816] text-[#c6ff4d]">
              <Brain size={21} weight="duotone" />
            </span>
            <span className="text-[18px] font-semibold tracking-[-0.02em]">AI Study</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-[#53615b] md:flex">
            <a href="#system" className="transition-colors hover:text-[#111816]">Система</a>
            <a href="#workflow" className="transition-colors hover:text-[#111816]">Процесс</a>
            <a href="#mentor" className="transition-colors hover:text-[#111816]">Наставник</a>
          </nav>

          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-full bg-[#111816] px-5 text-sm font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            Открыть кабинет
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#dce4df]">
        <div className="absolute inset-x-0 top-0 h-px bg-white" />
        <div className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-[1180px] grid-cols-1 items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
          <div className="max-w-[650px]">
            <p className="mb-8 inline-flex rounded-full border border-[#cad8d0] bg-white px-4 py-2 text-sm font-medium text-[#53615b]">
              Учебная система, а не чат с советами
            </p>
            <h1 className="max-w-[11ch] text-balance text-[clamp(3.2rem,8.5vw,5.9rem)] font-black leading-[0.92] tracking-[-0.045em] text-[#101816]">
              Учиться по маршруту.
            </h1>
            <p className="mt-7 max-w-[590px] text-pretty text-lg leading-8 text-[#42504a] sm:text-xl">
              AI Study собирает цель в курс, ведёт по темам, проверяет понимание и возвращает к слабым местам.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#111816] px-6 text-[15px] font-semibold text-white transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                Начать обучение
                <ArrowRight className="ml-2" size={18} weight="bold" />
              </Link>
              <a
                href="#system"
                className="inline-flex h-12 items-center justify-center rounded-full border border-[#bac8c1] bg-white px-6 text-[15px] font-semibold text-[#111816] transition-colors duration-200 hover:border-[#111816]"
              >
                Посмотреть систему
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 top-12 hidden h-28 w-28 rounded-full bg-[#c6ff4d] blur-3xl lg:block" />
            <div className="relative rounded-[28px] border border-[#16211d] bg-[#0d1311] p-3 shadow-[0_28px_80px_rgba(17,24,22,0.22)]">
              <div className="rounded-[22px] border border-white/10 bg-[#121a17] p-4 sm:p-5">
                <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-[#8fa098]">Курс</p>
                    <p className="mt-1 text-lg font-semibold text-white">Python для анализа данных</p>
                  </div>
                  <span className="rounded-full bg-[#c6ff4d] px-3 py-1 text-xs font-bold text-[#111816]">42%</span>
                </div>

                <div className="grid gap-3 lg:grid-cols-[1fr_0.78fr]">
                  <div className="rounded-[18px] bg-[#f4f7f5] p-4 text-[#111816]">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="text-sm font-semibold">Граф тем</span>
                      <Graph size={19} weight="duotone" />
                    </div>
                    <div className="space-y-3">
                      {['Основы Python', 'NumPy', 'Pandas', 'Визуализация', 'Проект'].map((item, index) => (
                        <div key={item} className="grid grid-cols-[24px_1fr] items-center gap-3">
                          <span className={`h-3 w-3 rounded-full ${index < 2 ? 'bg-[#111816]' : index === 2 ? 'bg-[#c6ff4d] ring-4 ring-[#dfff86]' : 'bg-[#cfd8d3]'}`} />
                          <div className="h-9 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-[inset_0_0_0_1px_rgba(17,24,22,0.08)]">
                            {item}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                        <Target size={18} weight="duotone" />
                        Сегодня
                      </div>
                      <p className="text-sm leading-6 text-[#b9c7c0]">Разобрать группировку данных и решить 4 задачи.</p>
                    </div>
                    <div className="rounded-[18px] border border-white/10 bg-[#c6ff4d] p-4 text-[#111816]">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
                        <CheckCircle size={18} weight="fill" />
                        Проверка
                      </div>
                      <p className="text-sm leading-6">Ответ принят. Следующее повторение через 3 дня.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#111816]">
                        <ChatCircleText size={20} weight="duotone" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white">AI-наставник</p>
                        <p className="text-sm text-[#b9c7c0]">Объясняет ошибку в контексте текущей темы</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-[#c6ff4d]">онлайн</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="system" className="border-b border-[#dce4df] bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-[720px]">
            <h2 className="text-balance text-4xl font-black leading-[1] tracking-[-0.035em] text-[#111816] sm:text-5xl">
              Внутри не промпт, а учебный контур.
            </h2>
            <p className="mt-5 max-w-[62ch] text-lg leading-8 text-[#53615b]">
              Главная задача системы — держать структуру обучения: от цели и диагностики до закрепления материала.
            </p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[26px] bg-[#111816] p-5 text-white sm:p-7">
              <div className="grid gap-3 sm:grid-cols-2">
                {productPoints.map((point) => {
                  const Icon = point.icon
                  return (
                    <div key={point.title} className="rounded-[18px] border border-white/10 bg-white/[0.045] p-5">
                      <Icon size={24} weight="duotone" className="text-[#c6ff4d]" />
                      <h3 className="mt-5 text-xl font-bold tracking-[-0.02em]">{point.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-[#c5d2cc]">{point.text}</p>
                    </div>
                  )
                })}
                <div className="rounded-[18px] bg-[#c6ff4d] p-5 text-[#111816]">
                  <Books size={24} weight="duotone" />
                  <h3 className="mt-5 text-xl font-black tracking-[-0.02em]">Любая область</h3>
                  <p className="mt-3 text-sm leading-6">От программирования до языков: маршрут собирается под цель, а не под шаблон курса.</p>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-[#dce4df] bg-[#f4f7f5] p-5 sm:p-7">
              <p className="text-sm font-semibold text-[#53615b]">Направления</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {disciplines.map((item) => (
                  <span key={item} className="rounded-full border border-[#c9d6d0] bg-white px-4 py-2 text-sm font-semibold text-[#111816]">
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-10 border-t border-[#dce4df] pt-6">
                <p className="text-2xl font-black leading-tight tracking-[-0.03em]">
                  Студент видит не список уроков, а карту движения.
                </p>
                <p className="mt-4 leading-7 text-[#53615b]">
                  Поэтому легче понять, что учить сейчас, что можно пропустить и где нужно вернуться к базе.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-[#dce4df] bg-[#f4f7f5]">
        <div className="mx-auto max-w-[1180px] px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <h2 className="text-balance text-4xl font-black leading-[1] tracking-[-0.035em] sm:text-5xl">
                Один цикл вместо разрозненных инструментов.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#53615b]">
                План, объяснение, практика и повторение живут в одном учебном состоянии.
              </p>
            </div>

            <div className="divide-y divide-[#d3ded8] rounded-[26px] border border-[#d3ded8] bg-white">
              {learningLoop.map((step, index) => (
                <div key={step.title} className="grid gap-4 p-6 sm:grid-cols-[72px_1fr] sm:p-7">
                  <div className="text-3xl font-black tracking-[-0.04em] text-[#8b9992]">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-[-0.03em]">{step.title}</h3>
                    <p className="mt-2 max-w-[58ch] leading-7 text-[#53615b]">{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="mentor" className="bg-[#101816] text-white">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:py-20">
          <div>
            <h2 className="max-w-[680px] text-balance text-4xl font-black leading-[1] tracking-[-0.035em] sm:text-5xl">
              Наставник объясняет, но система держит курс.
            </h2>
            <p className="mt-5 max-w-[64ch] text-lg leading-8 text-[#c5d2cc]">
              Чат полезен только тогда, когда знает цель, текущую тему, прошлые ошибки и следующий шаг.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#c6ff4d] px-6 text-[15px] font-black text-[#111816] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                Создать аккаунт
                <ArrowRight className="ml-2" size={18} weight="bold" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-[15px] font-semibold text-white transition-colors duration-200 hover:border-white/40"
              >
                Войти
              </Link>
            </div>
          </div>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.045] p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#c6ff4d] text-[#111816]">
                <ShieldCheck size={21} weight="duotone" />
              </span>
              <div>
                <p className="font-bold">Контекстный ответ</p>
                <p className="text-sm text-[#9eada6]">основан на текущем маршруте</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-[18px] bg-white px-4 py-3 text-sm leading-6 text-[#111816]">
                Почему мой код группирует данные неправильно?
              </div>
              <div className="rounded-[18px] border border-white/10 bg-[#16211d] px-4 py-3 text-sm leading-6 text-[#dce8e2]">
                Ты применил среднее до фильтрации пропусков. Вернись к шагу "очистка данных", затем повтори задачу с новым условием.
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/[0.06] px-4 py-2 text-sm text-[#c6ff4d]">
                <ChartLineUp size={17} weight="bold" />
                Слабое место добавлено в повторение
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
