import Link from 'next/link'
import { Brain, Target, Zap, BarChart3, MessageSquare, Repeat } from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'Граф знаний',
    description: 'Визуальная карта всех тем и их связей. Видишь свой прогресс в реальном времени.',
  },
  {
    icon: Target,
    title: 'Адаптивное обучение',
    description: 'AI подстраивается под твой уровень и темп. Сложнее, когда готов. Проще, когда нужно.',
  },
  {
    icon: Zap,
    title: 'Умная диагностика',
    description: 'Определяем твой уровень за 10 минут. Не тратим время на то, что ты уже знаешь.',
  },
  {
    icon: BarChart3,
    title: 'Персональный план',
    description: 'AI строит roadmap к твоей цели с учётом сроков и зависимостей между темами.',
  },
  {
    icon: MessageSquare,
    title: 'AI-чат',
    description: 'Задавай вопросы в любой момент. AI объяснит, поможет, направит.',
  },
  {
    icon: Repeat,
    title: 'Интервальное повторение',
    description: 'Алгоритм SM-2 напомнит повторить материал в идеальное время.',
  },
]

const popularSkills = [
  { name: 'Python', icon: '🐍', color: 'from-yellow-500 to-blue-500' },
  { name: 'JavaScript', icon: '⚡', color: 'from-yellow-400 to-yellow-600' },
  { name: 'React', icon: '⚛️', color: 'from-cyan-400 to-blue-500' },
  { name: 'SQL', icon: '🗄️', color: 'from-orange-400 to-red-500' },
  { name: 'Git', icon: '📦', color: 'from-orange-500 to-red-600' },
  { name: 'TypeScript', icon: '📘', color: 'from-blue-400 to-blue-600' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AI Study Agent</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-slate-300 hover:text-white transition-colors">
                Войти
              </Link>
              <Link href="/dashboard" className="btn-primary">
                Начать обучение
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-2 mb-6">
            <span className="text-primary-400 text-sm font-medium">🚀 Gartner Trend 2025: Agentic AI</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Персональный{' '}
            <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              AI-репетитор
            </span>
          </h1>
          
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Автономный агент, который сам ведёт тебя к цели. Диагностирует уровень, 
            строит граф знаний, генерирует материалы и адаптируется под твой темп.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="btn-primary text-lg px-8 py-4">
              Начать бесплатно
            </Link>
            <Link href="#features" className="btn-secondary text-lg px-8 py-4">
              Как это работает
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-16">
            <div>
              <div className="text-4xl font-bold text-white">100%</div>
              <div className="text-slate-400">Бесплатно</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">AI</div>
              <div className="text-slate-400">Llama 3.1 70B</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white">∞</div>
              <div className="text-slate-400">Тем для изучения</div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Skills */}
      <section className="py-16 px-4 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-8">
            Популярные направления
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularSkills.map((skill) => (
              <Link
                key={skill.name}
                href={`/dashboard?skill=${skill.name.toLowerCase()}`}
                className="card card-hover p-6 text-center group"
              >
                <div className="text-4xl mb-3">{skill.icon}</div>
                <div className="font-medium text-white group-hover:text-primary-400 transition-colors">
                  {skill.name}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Всё для эффективного обучения
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Не просто чат-бот, а полноценный автономный агент, 
              который сам принимает решения об обучении
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="card p-8 card-hover">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-7 h-7 text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            Как это работает
          </h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Укажи цель', desc: 'Что хочешь выучить и за какой срок' },
              { step: '2', title: 'Пройди диагностику', desc: 'AI определит твой текущий уровень' },
              { step: '3', title: 'Получи план', desc: 'Персональный roadmap с графом знаний' },
              { step: '4', title: 'Учись и расти', desc: 'Теория, практика, повторение' },
            ].map((item, index) => (
              <div key={item.step} className="text-center relative">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
                {index < 3 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary-500/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Готов начать обучение?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Бесплатно. Без ограничений. С персональным AI-агентом.
          </p>
          <Link href="/dashboard" className="btn-primary text-lg px-10 py-4 inline-block">
            Начать прямо сейчас
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary-400" />
            <span className="font-semibold text-white">AI Study Agent</span>
          </div>
          <div className="text-slate-400 text-sm">
            Powered by Groq (Llama 3.1) • Supabase • Vercel
          </div>
        </div>
      </footer>
    </div>
  )
}

