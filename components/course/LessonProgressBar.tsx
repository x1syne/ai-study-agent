'use client'

import { BookOpen, PenTool, CheckCircle } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// 📝 TYPES
// ═══════════════════════════════════════════════════════════════

type ProgressStage = 'theory' | 'practice' | 'completed'

interface LessonProgressBarProps {
  currentStage: ProgressStage
  onStageClick?: (stage: ProgressStage) => void
  className?: string
}

// ═══════════════════════════════════════════════════════════════
// 🎨 STAGE CONFIG
// ═══════════════════════════════════════════════════════════════

const stages: { id: ProgressStage; label: string; icon: typeof BookOpen }[] = [
  { id: 'theory', label: 'Теория', icon: BookOpen },
  { id: 'practice', label: 'Практика', icon: PenTool },
  { id: 'completed', label: 'Готово', icon: CheckCircle },
]

function getStageIndex(stage: ProgressStage): number {
  return stages.findIndex(s => s.id === stage)
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function LessonProgressBar({
  currentStage,
  onStageClick,
  className = ''
}: LessonProgressBarProps) {
  const currentIndex = getStageIndex(currentStage)
  
  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between relative">
        {/* Progress Line Background */}
        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 -translate-y-1/2 z-0" />
        
        {/* Progress Line Filled */}
        <div 
          className="absolute top-1/2 left-0 h-1 bg-gradient-to-r from-blue-500 to-green-500 -translate-y-1/2 z-0 transition-all duration-500"
          style={{ 
            width: currentIndex === 0 ? '0%' : 
                   currentIndex === 1 ? '50%' : '100%' 
          }}
        />
        
        {/* Stage Buttons */}
        {stages.map((stage, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isClickable = onStageClick && (isCompleted || isCurrent)
          const Icon = stage.icon
          
          return (
            <button
              key={stage.id}
              onClick={() => isClickable && onStageClick?.(stage.id)}
              disabled={!isClickable}
              className={`
                relative z-10 flex flex-col items-center gap-1
                transition-all duration-300
                ${isClickable ? 'cursor-pointer' : 'cursor-default'}
              `}
            >
              {/* Icon Circle */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                transition-all duration-300
                ${isCompleted 
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' 
                  : isCurrent 
                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 scale-110' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                }
              `}>
                <Icon className="w-5 h-5" />
              </div>
              
              {/* Label */}
              <span className={`
                text-xs font-medium transition-colors
                ${isCompleted 
                  ? 'text-green-600 dark:text-green-400' 
                  : isCurrent 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-400'
                }
              `}>
                {stage.label}
              </span>
              
              {/* Current Indicator */}
              {isCurrent && (
                <div className="absolute -bottom-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER EXPORTS
// ═══════════════════════════════════════════════════════════════

export function getNextStage(current: ProgressStage): ProgressStage | null {
  const index = getStageIndex(current)
  if (index < stages.length - 1) {
    return stages[index + 1].id
  }
  return null
}

export function getPreviousStage(current: ProgressStage): ProgressStage | null {
  const index = getStageIndex(current)
  if (index > 0) {
    return stages[index - 1].id
  }
  return null
}

export function stageToLessonStatus(stage: ProgressStage): string {
  switch (stage) {
    case 'theory': return 'not_started'
    case 'practice': return 'theory_done'
    case 'completed': return 'completed'
  }
}
