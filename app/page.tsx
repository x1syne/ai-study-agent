import Link from 'next/link'
import { Brain, Target, Zap, BarChart3, MessageSquare, Repeat, ChevronDown, Sparkles, Clock, Users } from 'lucide-react'
import { SiPython, SiJavascript, SiReact, SiMysql, SiGit, SiTypescript } from 'react-icons/si'

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
  { name: 'Python', Icon: SiPython, color: 'from-yellow-500 to-blue-500' },
  { name: 'JavaScript', Icon: SiJavascript, color: 'from-yellow-400 to-yellow-600' },
  { name: 'React', Icon: SiReact, color: 'from-cyan-400 to-blue-500' },
  { name: 'SQL', Icon: SiMysql, color: 'from-orange-400 to-red-500' },
  { name: 'Git', Icon: SiGit, color: 'from-orange-500 to-red-600' },
  { name: 'TypeScript', Icon: SiTypescript, color: 'from-blue-400 to-blue-600' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
              </div>
              <span className="text-sm sm:text-xl font-bold text-white truncate">AI Study</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Link href="/login" className="text-slate-300 hover:text-white transition-colors text-xs sm:text-sm px-2 py-1 hidden xs:inline">
                Войти
              </Link>
              <Link href="/dashboard" className="bg-primary-500 hover:bg-primary-600 text-white text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium transition-colors">
                Начать
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
            <Link href="/dashboard" className="btn-primary text-lg px-8 py-4 shadow-lg shadow-primary-500/50 hover:shadow-xl hover:shadow-primary-500/60 hover:scale-105 transition-all duration-300 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Попробовать бесплатно
            </Link>
            <Link href="#features" className="btn-secondary text-lg px-8 py-4 hover:scale-105 transition-all duration-300">
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
            {popularSkills.map((skill, index) => (
              <Link
                key={skill.name}
                href={`/dashboard?skill=${skill.name.toLowerCase()}`}
                className="card card-hover p-6 text-center group relative overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                
                <div className="relative z-10">
                  <skill.Icon className="w-12 h-12 mx-auto mb-3 group-hover:scale-125 transition-transform duration-300 text-primary-400" />
                  <div className="font-medium text-white group-hover:text-primary-400 transition-colors">
                    {skill.name}
                  </div>
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
            {features.map((feature, index) => (
              <div 
                key={feature.title} 
                className="card p-8 card-hover relative overflow-hidden group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    <feature.icon className="w-7 h-7 text-primary-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-primary-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-slate-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-slate-800/30 max-w-full overflow-x-hidden">
        <div className="container mx-auto max-w-full">
          <h2 className="text-4xl font-bold text-white text-center mb-16">
            Как это работает
          </h2>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Укажи цель', desc: 'Что хочешь выучить и за какой срок' },
              { step: '2', title: 'Пройди диагностику', desc: 'AI определит твой текущий уровень' },
              { step: '3', title: 'Получи план', desc: 'Персональный roadmap с графом знаний' },
              { step: '4', title: 'Учись и расти', desc: 'Теория, практика, повторение' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-white">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-slate-800/30 max-w-full overflow-x-hidden">
        <div className="container mx-auto max-w-4xl max-w-full">
          <h2 className="text-4xl font-bold text-white text-center mb-4">
            Частые вопросы
          </h2>
          <p className="text-xl text-slate-400 text-center mb-12">
            Всё, что нужно знать перед началом
          </p>
          
          <div className="space-y-4">
            {[
              {
                q: 'Сколько времени займет обучение?',
                a: 'Зависит от вашей цели и темпа. AI построит персональный план с учетом ваших сроков. В среднем базовый курс по Python занимает 2-3 месяца при занятиях 1 час в день.'
              },
              {
                q: 'Нужны ли знания программирования?',
                a: 'Нет! AI проведет диагностику и определит ваш уровень. Если вы новичок - начнете с основ. Если уже что-то знаете - пропустите известные темы и сразу перейдете к новому материалу.'
              },
              {
                q: 'Как работает AI-агент?',
                a: 'Это не просто чат-бот. Агент сам принимает решения: когда давать теорию, когда практику, когда повторение. Он анализирует ваши ответы, адаптирует сложность и строит оптимальный путь к цели.'
              },
              {
                q: 'Действительно ли это бесплатно?',
                a: 'Да, полностью бесплатно. Без скрытых платежей, без ограничений по времени или темам. Мы используем открытую модель Llama 3.1 70B от Groq.'
              },
              {
                q: 'Можно ли учиться с телефона?',
                a: 'Да! Интерфейс адаптивный и работает на всех устройствах. Учитесь где удобно - дома за компьютером или в дороге с телефона.'
              },
              {
                q: 'Что если я застряну на сложной теме?',
                a: 'AI-чат всегда готов помочь. Задавайте вопросы в любой момент - агент объяснит по-другому, приведет примеры или предложит дополнительные материалы.'
              }
            ].map((faq, index) => (
              <details key={index} className="card p-6 group cursor-pointer hover:border-primary-500/30 transition-all duration-300">
                <summary className="flex items-center justify-between font-semibold text-white text-lg list-none">
                  <span>{faq.q}</span>
                  <ChevronDown className="w-5 h-5 text-primary-400 group-open:rotate-180 transition-transform duration-300" />
                </summary>
                <p className="mt-4 text-slate-400 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 relative overflow-hidden max-w-full">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-accent-500/10 to-primary-500/10 animate-pulse"></div>
        
        <div className="container mx-auto max-w-4xl text-center relative z-10 max-w-full">
          <div className="inline-flex items-center gap-2 bg-primary-500/20 border border-primary-500/30 rounded-full px-4 py-2 mb-6 backdrop-blur-sm">
            <Clock className="w-4 h-4 text-primary-400" />
            <span className="text-primary-300 text-sm font-medium">Начни за 2 минуты</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Готов начать обучение?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Бесплатно. Без ограничений. С персональным AI-агентом.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard" className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-2 shadow-2xl shadow-primary-500/50 hover:shadow-primary-500/70 hover:scale-105 transition-all duration-300">
              <Sparkles className="w-5 h-5" />
              Начать прямо сейчас
            </Link>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Users className="w-4 h-4" />
              <span>Присоединяйся к тысячам студентов</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
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
