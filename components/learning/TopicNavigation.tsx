'use client'

import { useMemo } from 'react'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TopicStatus } from '@/types'

// ==================== INTERFACES ====================

export interface TopicNavigationItem {
  id: string
  name: string
  order: number
  status: TopicStatus
  moduleOrder: number
  moduleName: string
  prerequisiteIds?: string[]
}

export interface TopicNavigationProps {
  currentTopicId: string
  allTopics: TopicNavigationItem[]
  onNavigate: (topicId: string) => void
  className?: string
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Find previous and next topics based on order
 * Topics are sorted by moduleOrder, then by topic order within module
 */
function findAdjacentTopics(
  currentTopicId: string,
  allTopics: TopicNavigationItem[]
): { prev: TopicNavigationItem | null; next: TopicNavigationItem | null } {
  // Sort topics by module order, then by topic order
  const sortedTopics = [...allTopics].sort((a, b) => {
    if (a.moduleOrder !== b.moduleOrder) {
      return a.moduleOrder - b.moduleOrder
    }
    return a.order - b.order
  })

  const currentIndex = sortedTopics.findIndex(t => t.id === currentTopicId)
  
  if (currentIndex === -1) {
    return { prev: null, next: null }
  }

  const prev = currentIndex > 0 ? sortedTopics[currentIndex - 1] : null
  const next = currentIndex < sortedTopics.length - 1 ? sortedTopics[currentIndex + 1] : null

  return { prev, next }
}

/**
 * Get prerequisite topic names for a locked topic
 * Requirements: 7.4
 */
export function getPrerequisiteNames(
  topic: TopicNavigationItem,
  allTopics: TopicNavigationItem[]
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

// ==================== NAVIGATION BUTTON ====================

interface NavButtonProps {
  topic: TopicNavigationItem | null
  direction: 'prev' | 'next'
  onClick: () => void
  allTopics: TopicNavigationItem[]
}

function NavButton({ topic, direction, onClick, allTopics }: NavButtonProps) {
  if (!topic) {
    return (
      <div className="flex-1" /> // Spacer when no topic
    )
  }

  const isLocked = topic.status === 'LOCKED'
  const isPrev = direction === 'prev'
  const prerequisiteNames = isLocked ? getPrerequisiteNames(topic, allTopics) : []

  return (
    <div className={cn('flex-1', isPrev ? 'text-left' : 'text-right')}>
      <button
        onClick={isLocked ? undefined : onClick}
        disabled={isLocked}
        className={cn(
          'group inline-flex items-center gap-3 px-5 py-4 rounded-2xl',
          'transition-all duration-200 ease-out',
          'border border-[var(--color-border)]',
          isLocked
            ? 'opacity-60 cursor-not-allowed bg-[var(--color-bg-secondary)]'
            : 'hover:bg-white/5 hover:border-[var(--color-primary)]/30 cursor-pointer hover:shadow-lg',
          isPrev ? 'flex-row' : 'flex-row-reverse'
        )}
      >
        {/* Arrow icon with animation */}
        <span className={cn(
          'flex-shrink-0 p-2 rounded-xl',
          'transition-all duration-200',
          isLocked 
            ? 'bg-slate-700/30' 
            : 'bg-[var(--color-primary)]/10 group-hover:bg-[var(--color-primary)]/20',
          !isLocked && (isPrev ? 'group-hover:-translate-x-1' : 'group-hover:translate-x-1')
        )}>
          {isLocked ? (
            <Lock className="w-4 h-4 text-slate-500" />
          ) : isPrev ? (
            <ChevronLeft className="w-5 h-5 text-[var(--color-primary)]" />
          ) : (
            <ChevronRight className="w-5 h-5 text-[var(--color-primary)]" />
          )}
        </span>

        {/* Topic info */}
        <div className={cn('min-w-0', isPrev ? 'text-left' : 'text-right')}>
          <div className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">
            {isPrev ? 'Предыдущая тема' : 'Следующая тема'}
          </div>
          <div className={cn(
            'text-sm font-medium truncate max-w-[200px]',
            'transition-colors duration-200',
            isLocked ? 'text-slate-500' : 'text-white group-hover:text-[var(--color-primary)]'
          )}>
            {topic.name}
          </div>
          {/* Show prerequisites for locked topics - Requirements: 7.4 */}
          {isLocked && prerequisiteNames.length > 0 && (
            <div className="text-xs text-orange-400/80 mt-1.5 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-orange-400/60" />
              Сначала: {prerequisiteNames.slice(0, 2).join(', ')}
              {prerequisiteNames.length > 2 && ` +${prerequisiteNames.length - 2}`}
            </div>
          )}
        </div>
      </button>
    </div>
  )
}

// ==================== MAIN COMPONENT ====================

/**
 * TopicNavigation - Navigation buttons for previous/next topics
 * 
 * Requirements: 7.1, 7.4
 * - Display "Previous topic" and "Next topic" buttons at the bottom of content
 * - Show which topics need to be completed for locked topics
 */
export function TopicNavigation({
  currentTopicId,
  allTopics,
  onNavigate,
  className,
}: TopicNavigationProps) {
  const { prev, next } = useMemo(
    () => findAdjacentTopics(currentTopicId, allTopics),
    [currentTopicId, allTopics]
  )

  // Don't render if there are no adjacent topics
  if (!prev && !next) {
    return null
  }

  return (
    <div className={cn(
      'flex items-stretch gap-4 pt-8 mt-8 border-t border-[var(--color-border)]',
      className
    )}>
      <NavButton
        topic={prev}
        direction="prev"
        onClick={() => prev && onNavigate(prev.id)}
        allTopics={allTopics}
      />
      <NavButton
        topic={next}
        direction="next"
        onClick={() => next && onNavigate(next.id)}
        allTopics={allTopics}
      />
    </div>
  )
}

export default TopicNavigation
