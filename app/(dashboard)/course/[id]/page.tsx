'use client'

/**
 * 🎓 VISUAL COURSE PAGE
 * 
 * Страница просмотра визуального курса с диаграммами, интерактивом и геймификацией
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, ChevronRight, CheckCircle, Loader2, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'

interface CourseModule {
  id: string
  name: string
  description: string
  duration: number
  difficulty: string
  theory: {
    markdown: string
    wordCount: number
  }
  practice: {
    tasksCount: number
    tasks: any[]
  }
  visualSpec?: any
  sections?: any[]
}

interface CourseData {
  id: string
  title: string
  subtitle: string
  description: string
  topicType: string
  difficulty: string
  totalDuration: number
  modulesCount: number
  objectives: string[]
  modules: CourseModule[]
  metadata: {
    generatedAt: string
    generationTime: number
    cached: boolean
    visualIdentity?: {
      colorScheme: {
        primary: string
        secondary: string
        accent: string
        background: string
      }
    }
  }
}

export default function VisualCoursePage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<CourseData | null>(null)
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0)
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Загружаем курс из localStorage
    const stored = localStorage.getItem('generatedCourse')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setCourse(data)
      } catch (e) {
        console.error('Failed to parse course:', e)
      }
    }
    setIsLoading(false)
  }, [params.id])

  const handleCompleteModule = () => {
    setCompletedModules(prev => new Set([...Array.from(prev), currentModuleIndex]))
    if (currentModuleIndex < (course?.modules.length || 0) - 1) {
      setCurrentModuleIndex(prev => prev + 1)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Курс не найден</h2>
            <p className="text-slate-400 mb-6">Попробуйте создать новый курс</p>
            <button onClick={() => router.push('/goals/new')} className="btn-practicum">
              Создать курс
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentModule = course.modules?.[currentModuleIndex]
  const progress = course.modules?.length ? Math.round((completedModules.size / course.modules.length) * 100) : 0
  const colors = course.metadata?.visualIdentity?.colorScheme

  // Если модули не загрузились
  if (!course.modules || course.modules.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Курс пуст</h2>
            <p className="text-slate-400 mb-6">Модули не были сгенерированы. Попробуйте создать курс заново.</p>
            <button onClick={() => router.push('/goals/new')} className="btn-practicum">
              Создать новый курс
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!currentModule) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="py-16 text-center">
            <h2 className="text-xl font-bold text-white mb-2">Модуль не найден</h2>
            <button onClick={() => setCurrentModuleIndex(0)} className="btn-practicum">
              К первому модулю
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/goals')} 
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h1 className="text-2xl font-bold text-white">{course.title}</h1>
          </div>
          <p className="text-slate-400">{course.subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{progress}%</div>
          <div className="text-xs text-slate-400">завершено</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar - Module List */}
        <div className="lg:col-span-1 space-y-2">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Модули ({course.modules?.length || 0})</h3>
          {(course.modules || []).map((module, idx) => (
            <button
              key={module.id}
              onClick={() => setCurrentModuleIndex(idx)}
              className={`w-full text-left p-3 rounded-lg transition-colors ${
                idx === currentModuleIndex 
                  ? 'bg-purple-500/20 border border-purple-500/50' 
                  : 'bg-slate-800/50 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                {completedModules.has(idx) ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    idx === currentModuleIndex ? 'border-purple-500' : 'border-slate-600'
                  }`} />
                )}
                <span className={`text-sm ${idx === currentModuleIndex ? 'text-white' : 'text-slate-300'}`}>
                  {module.name}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-1 ml-6">
                {module.duration} мин • {module.difficulty}
              </div>
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Module Header */}
          <Card style={colors ? { borderColor: colors.primary + '40' } : undefined}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-slate-400">
                      Модуль {currentModuleIndex + 1} из {course.modules.length}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-white">{currentModule.name}</h2>
                  <p className="text-slate-400 mt-1">{currentModule.description}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400">{currentModule.duration} мин</div>
                  <div className="text-xs text-slate-500">{currentModule.theory.wordCount} слов</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theory Content */}
          <Card>
            <CardContent className="p-6">
              <div 
                className="prose prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(currentModule.theory.markdown) }}
              />
            </CardContent>
          </Card>

          {/* Practice Tasks */}
          {currentModule.practice?.tasksCount > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Практика ({currentModule.practice?.tasksCount || 0} заданий)
                </h3>
                <div className="space-y-3">
                  {(currentModule.practice?.tasks || []).slice(0, 3).map((task, idx) => (
                    <div key={task.id || idx} className="p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                          {task.difficulty}
                        </span>
                        <span className="text-xs text-slate-500">{task.type}</span>
                      </div>
                      <h4 className="text-white font-medium">{task.title}</h4>
                      <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentModuleIndex(prev => Math.max(0, prev - 1))}
              disabled={currentModuleIndex === 0}
              className="px-4 py-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Предыдущий
            </button>
            
            {completedModules.has(currentModuleIndex) ? (
              <button
                onClick={() => setCurrentModuleIndex(prev => Math.min((course.modules?.length || 1) - 1, prev + 1))}
                disabled={currentModuleIndex === (course.modules?.length || 1) - 1}
                className="px-6 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
              >
                Следующий модуль <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleCompleteModule}
                className="px-6 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg flex items-center gap-2"
              >
                Завершить модуль <CheckCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple markdown to HTML converter
function formatMarkdown(markdown: string): string {
  if (!markdown) return ''
  
  return markdown
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-white mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-white mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-white mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-800 rounded text-purple-400">$1</code>')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="p-4 bg-slate-900 rounded-lg overflow-x-auto my-4"><code>$2</code></pre>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 text-slate-300">$1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 text-slate-300">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-slate-300 mb-4">')
    .replace(/^(?!<[h|l|p|c])/gm, '<p class="text-slate-300 mb-4">')
}
