'use client'

import { ChevronDown, ChevronRight } from 'lucide-react'
import { Progress } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface ModuleCardProps {
  module: {
    id: string
    name: string
    description?: string | null
    icon: string
    order: number
  }
  progress: number
  isExpanded: boolean
  onToggle: () => void
  children?: React.ReactNode
}

/**
 * ModuleCard - Collapsible section displaying module info and progress
 * 
 * Requirements: 3.1, 3.3, 3.5
 * - Collapsible section with header and progress
 * - Icon, name, description of module
 * - Progress indicator
 */
export function ModuleCard({
  module,
  progress,
  isExpanded,
  onToggle,
  children,
}: ModuleCardProps) {
  const isCompleted = progress === 100

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header - clickable to expand/collapse */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-4 p-4 text-left transition-colors',
          'hover:bg-slate-800/80',
          isExpanded && 'bg-slate-800/30'
        )}
      >
        {/* Expand/Collapse icon */}
        <div className="text-slate-400">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </div>

        {/* Module icon */}
        <div className="text-2xl flex-shrink-0">{module.icon}</div>

        {/* Module info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm font-medium">
              Модуль {module.order}
            </span>
            {isCompleted && (
              <span className="text-green-400 text-xs">✓ Завершён</span>
            )}
          </div>
          <h3 className="font-semibold text-white truncate">{module.name}</h3>
          {!isExpanded && module.description && (
            <p className="text-sm text-slate-400 truncate mt-0.5">
              {module.description}
            </p>
          )}
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-20 hidden sm:block">
            <Progress 
              value={progress} 
              size="sm" 
              color={isCompleted ? 'success' : 'primary'}
            />
          </div>
          <span className={cn(
            'text-sm font-medium min-w-[3rem] text-right',
            isCompleted ? 'text-green-400' : 'text-slate-300'
          )}>
            {progress}%
          </span>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-700/50">
          {/* Module description when expanded */}
          {module.description && (
            <div className="px-4 py-3 bg-slate-900/30">
              <p className="text-sm text-slate-400">{module.description}</p>
            </div>
          )}
          
          {/* Topics list */}
          <div className="p-4 pt-2">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
