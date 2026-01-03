'use client'

/**
 * 🎓 VISUAL COURSE PAGE
 * 
 * Страница просмотра визуального курса с диаграммами, интерактивом и геймификацией
 * Использует VisualCourseRenderer для полноценного визуального отображения
 * 
 * Enhanced features:
 * - Боковая навигация с модулями и уроками
 * - Прогресс-бар по этапам урока (Теория → Практика → Готово)
 * - Выделение ключевых терминов с tooltip
 * - Сохранение прогресса в localStorage/API
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, AlertCircle, ChevronRight, Menu, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import dynamic from 'next/dynamic'
import type { VisualModule, VisualIdentity, LessonStatus, Lesson } from '@/lib/agents/types'
import CourseNavigation from '@/components/course/CourseNavigation'
import LessonProgressBar from '@/components/course/LessonProgressBar'
import { processMarkdownWithHighlights, extractHighlightedTerms } from '@/components/course/HighlightedText'
import { saveLessonProgress, loadCourseProgress, getLastAccessedLesson } from '@/lib/progress-tracker'

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
  
  // Navigation state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [currentLessonId, setCurrentLessonId] = useState<string>('')
  const [currentStage, setCurrentStage] = useState<'theory' | 'practice' | 'completed'>('theory')
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonStatus>>({})

  useEffect(() => {
    // Загружаем курс из localStorage
    const stored = localStorage.getItem('generatedCourse')
    if (stored) {
      try {
        const data = JSON.parse(stored) as StoredCourseData
        setCourse(data)
        
        // Set initial lesson
        const lastLesson = getLastAccessedLesson(data.id)
        if (lastLesson) {
          setCurrentLessonId(lastLesson)
        } else if (data.modules.length > 0) {
          setCurrentLessonId(`${data.modules[0].id}-lesson-1`)
        }
        
        // Load progress from localStorage
        loadProgressFromStorage(data.id)
      } catch (e) {
        console.error('Failed to parse course:', e)
        setError('Не удалось загрузить курс')
      }
    } else {
      setError('Курс не найден')
    }
    setIsLoading(false)
  }, [params.id])
  
  // Load progress from storage
  const loadProgressFromStorage = useCallback((courseId: string) => {
    const stored = localStorage.getItem('course_progress')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        const courseData = data.courses?.[courseId]
        if (courseData?.lessons) {
          const progress: Record<string, LessonStatus> = {}
          for (const [lessonId, lessonData] of Object.entries(courseData.lessons)) {
            progress[lessonId] = (lessonData as any).status
          }
          setLessonProgress(progress)
        }
      } catch (e) {
        console.error('Failed to load progress:', e)
      }
    }
  }, [])
  
  // Handle lesson selection
  const handleLessonSelect = useCallback((lessonId: string) => {
    setCurrentLessonId(lessonId)
    setCurrentStage('theory')
    
    // Save last accessed lesson
    if (course) {
      saveLessonProgress(null, course.id, lessonId, lessonProgress[lessonId] || 'not_started')
    }
  }, [course, lessonProgress])
  
  // Handle stage change
  const handleStageChange = useCallback((stage: 'theory' | 'practice' | 'completed') => {
    setCurrentStage(stage)
    
    if (course && currentLessonId) {
      let status: LessonStatus = 'not_started'
      if (stage === 'practice') status = 'theory_done'
      else if (stage === 'completed') status = 'completed'
      
      setLessonProgress(prev => ({ ...prev, [currentLessonId]: status }))
      saveLessonProgress(null, course.id, currentLessonId, status)
    }
  }, [course, currentLessonId])
  
  // Handle next lesson
  const handleNextLesson = useCallback(() => {
    if (!course) return
    
    // Find current lesson index
    const allLessons: string[] = []
    course.modules.forEach(m => {
      for (let i = 1; i <= 3; i++) { // Assume 3 lessons per module for now
        allLessons.push(`${m.id}-lesson-${i}`)
      }
    })
    
    const currentIndex = allLessons.indexOf(currentLessonId)
    if (currentIndex < allLessons.length - 1) {
      handleLessonSelect(allLessons[currentIndex + 1])
    }
  }, [course, currentLessonId, handleLessonSelect])
  
  // Build navigation modules
  const buildNavigationModules = useCallback(() => {
    if (!course) return []
    
    return course.modules.map((m, moduleIndex) => {
      // Generate 3 lessons per module (simplified)
      const lessons = [1, 2, 3].map(i => ({
        id: `${m.id}-lesson-${i}`,
        title: i === 1 ? 'Введение' : i === 2 ? 'Основные понятия' : 'Практика',
        order: i,
        status: lessonProgress[`${m.id}-lesson-${i}`] || 'not_started' as LessonStatus,
        estimatedTime: Math.round(m.duration / 3)
      }))
      
      const completedCount = lessons.filter(l => l.status === 'completed').length
      
      return {
        id: m.id,
        name: m.name,
        order: moduleIndex + 1,
        lessons,
        isExpanded: lessons.some(l => l.id === currentLessonId),
        completionPercent: Math.round((completedCount / lessons.length) * 100)
      }
    })
  }, [course, lessonProgress, currentLessonId])

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
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar Navigation */}
      <aside className={`
        fixed lg:relative z-40 h-screen transition-all duration-300
        ${isSidebarOpen ? 'w-72' : 'w-0 lg:w-0'}
      `}>
        {isSidebarOpen && (
          <div className="h-full overflow-hidden">
            <CourseNavigation
              modules={buildNavigationModules()}
              currentLessonId={currentLessonId}
              onLessonSelect={handleLessonSelect}
            />
          </div>
        )}
      </aside>
      
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      
      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        {/* Top Bar */}
        <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
          <div className="flex items-center gap-4 px-4 py-3">
            {/* Sidebar Toggle */}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            {/* Back button */}
            <button 
              onClick={() => router.push('/goals')} 
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            {/* Course Title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-white truncate">
                {course.title}
              </h1>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="px-4 pb-3">
            <LessonProgressBar
              currentStage={currentStage}
              onStageClick={handleStageChange}
            />
          </div>
        </div>

        {/* Visual Course Renderer */}
        <div className="p-4">
          <VisualCourseRenderer
            modules={visualModules}
            visualIdentity={visualIdentity as VisualIdentity}
            onModuleComplete={(moduleId) => {
              console.log('Module completed:', moduleId)
              // Mark all lessons in module as completed
              const moduleData = course.modules.find(m => m.id === moduleId)
              if (moduleData) {
                [1, 2, 3].forEach(i => {
                  const lessonId = `${moduleId}-lesson-${i}`
                  setLessonProgress(prev => ({ ...prev, [lessonId]: 'completed' }))
                  saveLessonProgress(null, course.id, lessonId, 'completed')
                })
              }
            }}
          />
          
          {/* Next Lesson Button */}
          {currentStage === 'completed' && (
            <div className="flex justify-center mt-8 mb-16">
              <button
                onClick={handleNextLesson}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-400 hover:to-blue-400 text-white font-medium rounded-xl transition-all shadow-lg shadow-purple-500/25"
              >
                Следующий урок
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </main>
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
