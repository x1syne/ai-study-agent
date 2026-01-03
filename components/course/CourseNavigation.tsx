'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle, Circle, Clock } from 'lucide-react'
import type { LessonStatus } from '@/lib/agents/types'

// ═══════════════════════════════════════════════════════════════
// 📝 TYPES
// ═══════════════════════════════════════════════════════════════

interface LessonSummary {
  id: string
  title: string
  order: number
  status: LessonStatus
  estimatedTime: number
}

interface ModuleWithLessons {
  id: string
  name: string
  order: number
  lessons: LessonSummary[]
  isExpanded: boolean
  completionPercent: number
}

interface CourseNavigationProps {
  modules: ModuleWithLessons[]
  currentLessonId: string
  onLessonSelect: (lessonId: string) => void
  onModuleToggle?: (moduleId: string) => void
}

// ═══════════════════════════════════════════════════════════════
// 🎨 STATUS ICONS
// ═══════════════════════════════════════════════════════════════

function StatusIcon({ status }: { status: LessonStatus }) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-green-500" />
    case 'practice_done':
      return <CheckCircle className="w-4 h-4 text-blue-500" />
    case 'theory_done':
      return <Circle className="w-4 h-4 text-yellow-500 fill-yellow-500" />
    default:
      return <Circle className="w-4 h-4 text-gray-300" />
  }
}

// ═══════════════════════════════════════════════════════════════
// 📚 LESSON ITEM
// ═══════════════════════════════════════════════════════════════

interface LessonItemProps {
  lesson: LessonSummary
  isActive: boolean
  onClick: () => void
}

function LessonItem({ lesson, isActive, onClick }: LessonItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-2 px-3 py-2 text-left text-sm
        rounded-md transition-colors
        ${isActive 
          ? 'bg-blue-100 text-blue-900 dark:bg-blue-900/30 dark:text-blue-100' 
          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
        }
      `}
    >
      <StatusIcon status={lesson.status} />
      <span className="flex-1 truncate">{lesson.title}</span>
      <span className="flex items-center gap-1 text-xs text-gray-400">
        <Clock className="w-3 h-3" />
        {lesson.estimatedTime}м
      </span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// 📦 MODULE SECTION
// ═══════════════════════════════════════════════════════════════

interface ModuleSectionProps {
  module: ModuleWithLessons
  currentLessonId: string
  onLessonSelect: (lessonId: string) => void
  onToggle: () => void
}

function ModuleSection({ module, currentLessonId, onLessonSelect, onToggle }: ModuleSectionProps) {
  const completedCount = module.lessons.filter(l => l.status === 'completed').length
  const totalCount = module.lessons.length
  
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      {/* Module Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        {module.isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        
        <span className="flex-1 text-left font-medium text-gray-900 dark:text-gray-100 truncate">
          {module.order}. {module.name}
        </span>
        
        {/* Completion Badge */}
        <span className={`
          text-xs px-2 py-0.5 rounded-full
          ${module.completionPercent === 100 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
          }
        `}>
          {completedCount}/{totalCount}
        </span>
      </button>
      
      {/* Progress Bar */}
      {module.completionPercent > 0 && module.completionPercent < 100 && (
        <div className="px-3 pb-2">
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${module.completionPercent}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Lessons List */}
      {module.isExpanded && (
        <div className="pb-2 px-2 space-y-1">
          {module.lessons.map(lesson => (
            <LessonItem
              key={lesson.id}
              lesson={lesson}
              isActive={lesson.id === currentLessonId}
              onClick={() => onLessonSelect(lesson.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CourseNavigation({
  modules,
  currentLessonId,
  onLessonSelect,
  onModuleToggle
}: CourseNavigationProps) {
  // Local state for expanded modules if no external control
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    // Auto-expand module containing current lesson
    const currentModule = modules.find(m => 
      m.lessons.some(l => l.id === currentLessonId)
    )
    return new Set(currentModule ? [currentModule.id] : [modules[0]?.id].filter(Boolean))
  })
  
  const handleModuleToggle = (moduleId: string) => {
    if (onModuleToggle) {
      onModuleToggle(moduleId)
    } else {
      setExpandedModules(prev => {
        const next = new Set(prev)
        if (next.has(moduleId)) {
          next.delete(moduleId)
        } else {
          next.add(moduleId)
        }
        return next
      })
    }
  }
  
  // Calculate overall progress
  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)
  const completedLessons = modules.reduce(
    (sum, m) => sum + m.lessons.filter(l => l.status === 'completed').length,
    0
  )
  const overallPercent = totalLessons > 0 
    ? Math.round((completedLessons / totalLessons) * 100) 
    : 0
  
  return (
    <nav className="w-full h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header with Overall Progress */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
          Содержание курса
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${overallPercent}%` }}
            />
          </div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {overallPercent}%
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {completedLessons} из {totalLessons} уроков завершено
        </p>
      </div>
      
      {/* Modules List */}
      <div className="flex-1 overflow-y-auto">
        {modules.map(module => (
          <ModuleSection
            key={module.id}
            module={{
              ...module,
              isExpanded: expandedModules.has(module.id)
            }}
            currentLessonId={currentLessonId}
            onLessonSelect={onLessonSelect}
            onToggle={() => handleModuleToggle(module.id)}
          />
        ))}
      </div>
    </nav>
  )
}
