'use client'

import { useState, useCallback, useMemo, memo } from 'react'
import { ChevronDown, ChevronRight, Lock, Play, Clock, CheckCircle, Menu, X } from 'lucide-react'
import { Progress } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { TopicStatus } from '@/types'

// ==================== INTERFACES ====================

export interface TopicItem {
  id: string
  name: string
  order: number
  status: TopicStatus
  prerequisiteIds?: string[]
}

export interface ModuleWithTopics {
  id: string
  name: string
  icon: string
  order: number
  progress: number
  topics: TopicItem[]
}

export interface CourseSidebarProps {
  goalId: string
  modules: ModuleWithTopics[]
  currentTopicId: string
  onTopicSelect: (topicId: string) => void
}

// ==================== STATUS CONFIG ====================

const STATUS_ICONS: Record<TopicStatus, { icon: React.ReactNode; emoji: string }> = {
  LOCKED: { 
    icon: <Lock className="w-3.5 h-3.5" />, 
    emoji: '🔒' 
  },
  AVAILABLE: { 
    icon: <Play className="w-3.5 h-3.5" />, 
    emoji: '▶️' 
  },
  IN_PROGRESS: { 
    icon: <Clock className="w-3.5 h-3.5" />, 
    emoji: '⏳' 
  },
  COMPLETED: { 
    icon: <CheckCircle className="w-3.5 h-3.5" />, 
    emoji: '✅' 
  },
  MASTERED: { 
    icon: <CheckCircle className="w-3.5 h-3.5" />, 
    emoji: '✅' 
  },
}

const STATUS_COLORS: Record<TopicStatus, string> = {
  LOCKED: 'text-slate-500',
  AVAILABLE: 'text-primary-400',
  IN_PROGRESS: 'text-yellow-400',
  COMPLETED: 'text-green-400',
  MASTERED: 'text-green-400',
}

// ==================== SIDEBAR TOPIC ITEM ====================

interface SidebarTopicItemProps {
  topic: TopicItem
  moduleOrder: number
  isSelected: boolean
  onClick: () => void
  allTopics: TopicItem[]
}

/**
 * Get prerequisite topic names for a locked topic
 * Requirements: 7.4
 */
function getPrerequisiteNames(
  topic: TopicItem,
  allTopics: TopicItem[]
): string[] {
  if (!topic.prerequisiteIds || topic.prerequisiteIds.length === 0) {
    return []
  }

  return topic.prerequisiteIds
    .map(prereqId => {
      const prereqTopic = allTopics.find(t => t.id === prereqId)
      return prereqTopic ? prereqTopic.name : null
    })
    .filter((name): name is string => name !== null)
}

const SidebarTopicItem = memo(function SidebarTopicItem({ 
  topic, 
  moduleOrder, 
  isSelected, 
  onClick, 
  allTopics 
}: SidebarTopicItemProps) {
  const isLocked = topic.status === 'LOCKED'
  const statusConfig = STATUS_ICONS[topic.status]
  const statusColor = STATUS_COLORS[topic.status]
  const prerequisiteNames = isLocked ? getPrerequisiteNames(topic, allTopics) : []
  
  // Format topic number as X.Y (moduleOrder.topicOrder)
  const topicNumber = `${moduleOrder}.${topic.order}`

  return (
    <div className="relative group">
      <button
        onClick={isLocked ? undefined : onClick}
        disabled={isLocked}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-xl',
          'transition-all duration-200 ease-out',
          isLocked 
            ? 'opacity-50 cursor-not-allowed' 
            : 'cursor-pointer',
          isSelected && 'bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 shadow-sm',
          !isSelected && !isLocked && 'hover:bg-white/5 hover:translate-x-0.5'
        )}
      >
        {/* Status icon with pulse animation for current topic */}
        <span className={cn(
          'flex-shrink-0 transition-transform duration-200',
          statusColor,
          isSelected && topic.status === 'IN_PROGRESS' && 'animate-pulse'
        )}>
          {statusConfig.emoji}
        </span>

        {/* Topic number */}
        <span className="text-slate-500 text-xs font-mono min-w-[2rem]">
          {topicNumber}
        </span>

        {/* Topic name */}
        <span className={cn(
          'flex-1 truncate transition-colors duration-200',
          isSelected ? 'text-white font-medium' : 'text-slate-300'
        )}>
          {topic.name}
        </span>
      </button>
      
      {/* Tooltip for locked topics showing prerequisites - Requirements: 7.4 */}
      {isLocked && prerequisiteNames.length > 0 && (
        <div className={cn(
          'absolute left-full top-0 ml-2 z-50',
          'opacity-0 invisible group-hover:opacity-100 group-hover:visible',
          'transition-all duration-200 ease-out',
          'bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3 shadow-xl',
          'min-w-[180px] max-w-[250px]',
          'transform translate-x-1 group-hover:translate-x-0'
        )}>
          <div className="text-xs text-orange-400 font-medium mb-1.5">
            Сначала пройдите:
          </div>
          <ul className="text-xs text-slate-300 space-y-1">
            {prerequisiteNames.slice(0, 3).map((name, idx) => (
              <li key={idx} className="truncate flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-orange-400/60" />
                {name}
              </li>
            ))}
            {prerequisiteNames.length > 3 && (
              <li className="text-slate-500 pl-2.5">и ещё {prerequisiteNames.length - 3}...</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
})

// ==================== SIDEBAR MODULE ====================

interface SidebarModuleProps {
  module: ModuleWithTopics
  isExpanded: boolean
  onToggle: () => void
  currentTopicId: string
  onTopicSelect: (topicId: string) => void
  allTopics: TopicItem[]
}

const SidebarModule = memo(function SidebarModule({ 
  module, 
  isExpanded, 
  onToggle, 
  currentTopicId, 
  onTopicSelect,
  allTopics,
}: SidebarModuleProps) {
  const isCompleted = module.progress === 100
  const sortedTopics = useMemo(
    () => [...module.topics].sort((a, b) => a.order - b.order),
    [module.topics]
  )

  return (
    <div className="border-b border-[var(--color-border)] last:border-b-0">
      {/* Module header */}
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3.5 text-left',
          'transition-all duration-200 ease-out',
          'hover:bg-white/5',
          isExpanded && 'bg-white/[0.02]'
        )}
      >
        {/* Expand/Collapse icon with rotation animation */}
        <span className={cn(
          'text-slate-400 flex-shrink-0 transition-transform duration-200',
          isExpanded && 'rotate-0',
          !isExpanded && '-rotate-90'
        )}>
          <ChevronDown className="w-4 h-4" />
        </span>

        {/* Module icon */}
        <span className="text-lg flex-shrink-0">{module.icon}</span>

        {/* Module info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">
              Модуль {module.order}
            </span>
            {isCompleted && (
              <span className="text-green-400 text-xs animate-fade-in">✓</span>
            )}
          </div>
          <h4 className="font-medium text-white text-sm truncate">
            {module.name}
          </h4>
        </div>

        {/* Progress badge */}
        <span className={cn(
          'text-xs font-medium flex-shrink-0 px-2 py-0.5 rounded-full',
          'transition-colors duration-200',
          isCompleted 
            ? 'bg-green-500/15 text-green-400' 
            : 'bg-slate-700/50 text-slate-400'
        )}>
          {module.progress}%
        </span>
      </button>

      {/* Progress bar */}
      <div className="px-4 pb-2">
        <Progress 
          value={module.progress} 
          size="sm" 
          color={isCompleted ? 'success' : 'primary'}
        />
      </div>

      {/* Topics list with slide animation */}
      <div className={cn(
        'overflow-hidden transition-all duration-300 ease-out',
        isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
      )}>
        <div className="px-2 pb-3 space-y-1">
          {sortedTopics.map((topic, index) => (
            <div 
              key={topic.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <SidebarTopicItem
                topic={topic}
                moduleOrder={module.order}
                isSelected={currentTopicId === topic.id}
                onClick={() => onTopicSelect(topic.id)}
                allTopics={allTopics}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})


// ==================== MAIN COMPONENT ====================

/**
 * CourseSidebar - Sidebar navigation for course modules and topics
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
 * - Display list of modules with icons and numbers
 * - Expand/collapse modules to show topics
 * - Show topic status with icons (🔒, ▶️, ⏳, ✅)
 * - Highlight current topic
 * - Show module progress percentage with progress bar
 * - Mobile responsive with hamburger menu
 */
export function CourseSidebar({
  goalId,
  modules,
  currentTopicId,
  onTopicSelect,
}: CourseSidebarProps) {
  // Track which modules are expanded
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    
    // Find module containing current topic and expand it
    if (currentTopicId) {
      const moduleWithTopic = modules.find(m => 
        m.topics.some(t => t.id === currentTopicId)
      )
      if (moduleWithTopic) {
        initial.add(moduleWithTopic.id)
      }
    } else if (modules.length > 0) {
      // Expand first module by default
      initial.add(modules[0].id)
    }
    
    return initial
  })

  // Mobile sidebar open state
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const handleToggleModule = useCallback((moduleId: string) => {
    setExpandedModules(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }, [])

  const handleTopicSelect = useCallback((topicId: string) => {
    onTopicSelect(topicId)
    // Close mobile sidebar after selection
    setIsMobileOpen(false)
  }, [onTopicSelect])

  // Sort modules by order - memoized
  const sortedModules = useMemo(
    () => [...modules].sort((a, b) => a.order - b.order),
    [modules]
  )

  // Flatten all topics for prerequisite lookup - memoized
  const allTopics = useMemo(
    () => modules.flatMap(m => m.topics),
    [modules]
  )

  // Calculate overall progress - memoized
  const { overallProgress, totalTopics, completedTopics } = useMemo(() => {
    const total = modules.reduce((sum, m) => sum + m.topics.length, 0)
    const completed = modules.reduce((sum, m) => 
      sum + m.topics.filter(t => t.status === 'COMPLETED' || t.status === 'MASTERED').length, 0
    )
    return {
      totalTopics: total,
      completedTopics: completed,
      overallProgress: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }, [modules])

  // Sidebar content (shared between desktop and mobile)
  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white">Содержание курса</h3>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className={cn(
              'md:hidden p-1.5 rounded-lg',
              'text-slate-400 hover:text-white hover:bg-white/10',
              'transition-colors duration-200'
            )}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-slate-400">Прогресс курса</span>
          <span className={cn(
            'font-medium',
            overallProgress === 100 ? 'text-green-400' : 'text-[var(--color-primary)]'
          )}>
            {completedTopics}/{totalTopics} тем
          </span>
        </div>
        <Progress 
          value={overallProgress} 
          size="sm"
          color={overallProgress === 100 ? 'success' : 'primary'}
        />
      </div>

      {/* Modules list */}
      <div className="flex-1 overflow-y-auto">
        {sortedModules.length === 0 ? (
          /* Empty state - no modules */
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-700/30 flex items-center justify-center mb-4">
              <span className="text-3xl">📚</span>
            </div>
            <h4 className="text-white font-medium mb-2">Нет модулей</h4>
            <p className="text-slate-400 text-sm">
              Курс пока не содержит модулей. Они появятся после генерации структуры.
            </p>
          </div>
        ) : (
          sortedModules.map((module) => (
            <SidebarModule
              key={module.id}
              module={module}
              isExpanded={expandedModules.has(module.id)}
              onToggle={() => handleToggleModule(module.id)}
              currentTopicId={currentTopicId}
              onTopicSelect={handleTopicSelect}
              allTopics={allTopics}
            />
          ))
        )}
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className={cn(
          'fixed top-4 left-4 z-40 p-2.5 rounded-xl',
          'bg-[var(--color-bg-card)] border border-[var(--color-border)]',
          'text-slate-300 hover:text-white hover:border-[var(--color-primary)]/50',
          'transition-all duration-200',
          'md:hidden',
          'shadow-lg',
          isMobileOpen && 'opacity-0 pointer-events-none'
        )}
        aria-label="Открыть меню"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden',
          'transition-opacity duration-300',
          isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Mobile sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-72 z-50',
          'bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]',
          'flex flex-col',
          'transform transition-transform duration-300 ease-out',
          'md:hidden',
          'shadow-2xl',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex md:flex-col',
          'w-72 flex-shrink-0',
          'bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)]',
          'h-full overflow-hidden'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  )
}

export default CourseSidebar
