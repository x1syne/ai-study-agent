'use client'

/**
 * 🎓 VISUAL COURSE PAGE
 * 
 * Страница просмотра визуального курса с диаграммами, интерактивом и геймификацией
 * Использует VisualCourseRenderer для полноценного визуального отображения
 */

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import dynamic from 'next/dynamic'
import type { VisualModule, VisualIdentity } from '@/lib/agents/types'

// Lazy load VisualCourseRenderer для оптимизации
const VisualCourseRenderer = dynamic(
  () => import('@/components/course/VisualCourseRenderer'),
  { 
    ssr: false, 
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }
)

// Типы данных курса из localStorage (формат API response)
interface StoredCourseData {
  id: string
  title: string
  subtitle: string
  description: string
  topicType: string
  difficulty: string
  totalDuration: number
  modulesCount: number
  objectives: string[]
  modules: Array<{
    id: string
    name: string
    description: string
    duration: number
    difficulty: string
    theory: { markdown: string; wordCount: number }
    practice: { tasksCount: number; tasks: any[] }
    visualSpec?: any
    sections?: any[]
    keyTerms?: string[]
  }>
  metadata: {
    generatedAt: string
    generationTime: number
    cached: boolean
    visualIdentity?: {
      primaryColor: string
      gradient: string
      fontPairing: [string, string]
      iconFamily: string
      colorScheme: string
      visualTheme: string
    }
    interactivityLevel?: string
  }
}

// Дефолтная визуальная идентичность
const defaultVisualIdentity: VisualIdentity = {
  primaryColor: '#8B5CF6',
  gradient: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
  fontPairing: ['Inter', 'JetBrains Mono'],
  iconFamily: 'lucide',
  colorScheme: 'purple-gradient',
  visualTheme: 'minimalist-illustrations'
}

export default function VisualCoursePage() {
  const params = useParams()
  const router = useRouter()
  const [course, setCourse] = useState<StoredCourseData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Загружаем курс из localStorage
    const stored = localStorage.getItem('generatedCourse')
    if (stored) {
      try {
        const data = JSON.parse(stored) as StoredCourseData
        setCourse(data)
      } catch (e) {
        console.error('Failed to parse course:', e)
        setError('Не удалось загрузить курс')
      }
    } else {
      setError('Курс не найден')
    }
    setIsLoading(false)
  }, [params.id])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Загрузка курса...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !course) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-red-500/20">
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">
              {error || 'Курс не найден'}
            </h2>
            <p className="text-slate-400 mb-6">
              Попробуйте создать новый курс с визуальным режимом
            </p>
            <button 
              onClick={() => router.push('/goals/new')} 
              className="px-6 py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-xl transition-colors"
            >
              Создать курс
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Проверяем наличие модулей
  if (!course.modules || course.modules.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Курс пуст</h2>
            <p className="text-slate-400 mb-6">
              Модули не были сгенерированы. Попробуйте создать курс заново.
            </p>
            <button 
              onClick={() => router.push('/goals/new')} 
              className="px-6 py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-xl transition-colors"
            >
              Создать новый курс
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Проверяем, есть ли визуальные данные (sections, visualSpec)
  const hasVisualData = course.modules.some(m => m.sections && m.sections.length > 0)
  const visualIdentity = course.metadata?.visualIdentity || defaultVisualIdentity

  // Преобразуем модули в формат VisualModule
  const visualModules: VisualModule[] = course.modules.map((m, index) => ({
    id: m.id || `module-${index + 1}`,
    order: index + 1,
    name: m.name,
    description: m.description,
    theoryPrompt: '',
    practicePrompt: '',
    keyTerms: m.keyTerms || extractKeyTerms(m.theory?.markdown || ''),
    duration: m.duration,
    difficulty: m.difficulty as any,
    contentType: 'theory' as const,
    visualSpec: m.visualSpec || generateDefaultVisualSpec(m.name, index),
    sections: m.sections || generateDefaultSections(m.theory?.markdown || '', m.practice?.tasks || [])
  }))

  // Если нет визуальных данных, показываем fallback с предупреждением
  if (!hasVisualData) {
    console.warn('Course has no visual sections, using generated defaults')
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Back button */}
      <div className="fixed top-4 left-4 z-50">
        <button 
          onClick={() => router.push('/goals')} 
          className="p-2 rounded-xl bg-slate-800/80 backdrop-blur-sm text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Visual Course Renderer */}
      <VisualCourseRenderer
        modules={visualModules}
        visualIdentity={visualIdentity as VisualIdentity}
        onModuleComplete={(moduleId) => {
          console.log('Module completed:', moduleId)
        }}
      />
    </div>
  )
}

// Извлечение ключевых терминов из markdown
function extractKeyTerms(markdown: string): string[] {
  const terms: string[] = []
  
  // Ищем жирный текст **term**
  const boldMatches = markdown.match(/\*\*([^*]+)\*\*/g)
  if (boldMatches) {
    boldMatches.slice(0, 6).forEach(match => {
      const term = match.replace(/\*\*/g, '').trim()
      if (term.length > 2 && term.length < 50) {
        terms.push(term)
      }
    })
  }
  
  return terms.slice(0, 6)
}

// Генерация дефолтной визуальной спецификации
function generateDefaultVisualSpec(moduleName: string, index: number) {
  const colors = [
    { primary: '#8B5CF6', secondary: '#6366F1', accent: '#A78BFA' },
    { primary: '#3B82F6', secondary: '#2563EB', accent: '#60A5FA' },
    { primary: '#10B981', secondary: '#059669', accent: '#34D399' },
    { primary: '#F59E0B', secondary: '#D97706', accent: '#FBBF24' },
  ]
  const colorSet = colors[index % colors.length]
  
  return {
    heroImagePrompt: `Educational illustration for ${moduleName}`,
    colorScheme: colorSet,
    decorationElements: ['geometric_shape', 'gradient_orb'] as const,
    primaryVisual: {
      type: 'diagram' as const,
      description: `Concept diagram for ${moduleName}`
    },
    secondaryVisuals: [{
      type: 'icon_set' as const,
      icons: ['📚', '💡', '🎯', '✨', '🚀'],
      purpose: 'section markers'
    }]
  }
}

// Генерация дефолтных секций из markdown и практики
function generateDefaultSections(markdown: string, tasks: any[]) {
  const sections = []
  
  // Разбиваем markdown на части
  const parts = markdown.split(/^##\s+/m).filter(Boolean)
  
  parts.slice(0, 4).forEach((part, index) => {
    const lines = part.trim().split('\n')
    const title = lines[0] || `Раздел ${index + 1}`
    const content = lines.slice(1).join('\n').trim()
    
    // Разбиваем контент на блоки по ~150 слов
    const words = content.split(/\s+/)
    const blocks = []
    
    for (let i = 0; i < words.length; i += 100) {
      const blockText = words.slice(i, i + 100).join(' ')
      if (blockText.trim()) {
        blocks.push({
          text: blockText,
          accompanyingVisual: {
            type: 'icon' as const,
            description: title,
            iconName: ['BookOpen', 'Lightbulb', 'Target', 'Sparkles'][index % 4]
          }
        })
      }
    }
    
    sections.push({
      contentType: index === 0 ? 'theory' : index === parts.length - 1 ? 'practice' : 'example',
      textBlocks: blocks.slice(0, 3),
      multimedia: {
        imagePrompts: [],
        videoSources: [],
        diagrams: [],
        embeds: []
      },
      gamification: {
        checkpoints: [],
        progressVisualization: { type: 'progress_bar', maxValue: 100, currentValue: 0 },
        levelBadges: []
      }
    })
  })
  
  // Добавляем секцию практики если есть задания
  if (tasks.length > 0) {
    sections.push({
      contentType: 'practice' as const,
      textBlocks: tasks.slice(0, 3).map(task => ({
        text: `${task.title}: ${task.description}`,
        accompanyingVisual: {
          type: 'icon' as const,
          description: 'Practice task',
          iconName: 'Target'
        }
      })),
      multimedia: {
        imagePrompts: [],
        videoSources: [],
        diagrams: [],
        embeds: []
      },
      gamification: {
        checkpoints: [{ title: 'Практика', emoji: '🎯', rewardText: 'Отлично!' }],
        progressVisualization: { type: 'progress_bar', maxValue: 100, currentValue: 0 },
        levelBadges: []
      }
    })
  }
  
  return sections.length > 0 ? sections : [{
    contentType: 'theory' as const,
    textBlocks: [{
      text: markdown.slice(0, 500) || 'Контент модуля',
      accompanyingVisual: {
        type: 'icon' as const,
        description: 'Module content',
        iconName: 'BookOpen'
      }
    }],
    multimedia: {
      imagePrompts: [],
      videoSources: [],
      diagrams: [],
      embeds: []
    },
    gamification: {
      checkpoints: [],
      progressVisualization: { type: 'progress_bar', maxValue: 100, currentValue: 0 },
      levelBadges: []
    }
  }]
}
