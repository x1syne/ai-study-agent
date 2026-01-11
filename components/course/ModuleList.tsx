'use client'

import { useState, useCallback } from 'react'
import { ModuleCard } from './ModuleCard'
import { TopicItem } from './TopicItem'
import { calculateModuleProgress } from '@/lib/utils'
import type { TopicStatus, Difficulty } from '@/types'

export interface ModuleWithTopics {
  id: string
  name: string
  description?: string | null
  icon: string
  order: number
  topics: {
    id: string
    name: string
    description?: string | null
    icon?: string | null
    difficulty: Difficulty
    estimatedMinutes: number
    order: number
    progress?: {
      status: TopicStatus
      masteryLevel: number
    } | null
  }[]
}

export interface ModuleListProps {
  modules: ModuleWithTopics[]
  onTopicClick: (topicId: string) => void
  selectedTopicId?: string
  defaultExpandedModuleId?: string
}

/**
 * ModuleList - List of modules with topics
 * 
 * Requirements: 3.2, 3.6
 * - List of modules with topics
 * - Manage expand/collapse state
 */
export function ModuleList({
  modules,
  onTopicClick,
  selectedTopicId,
  defaultExpandedModuleId,
}: ModuleListProps) {
  // Track which modules are expanded
  // By default, expand the first module or the one containing selected topic
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    
    if (defaultExpandedModuleId) {
      initial.add(defaultExpandedModuleId)
    } else if (selectedTopicId) {
      // Find module containing selected topic
      const moduleWithTopic = modules.find(m => 
        m.topics.some(t => t.id === selectedTopicId)
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

  // Sort modules by order
  const sortedModules = [...modules].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      {sortedModules.map((module) => {
        // Sort topics by order within module
        const sortedTopics = [...module.topics].sort((a, b) => a.order - b.order)
        
        // Calculate module progress
        const progress = calculateModuleProgress(
          module.topics.map(t => ({ progress: t.progress }))
        )

        return (
          <ModuleCard
            key={module.id}
            module={module}
            progress={progress}
            isExpanded={expandedModules.has(module.id)}
            onToggle={() => handleToggleModule(module.id)}
          >
            <div className="space-y-2">
              {sortedTopics.map((topic) => (
                <TopicItem
                  key={topic.id}
                  topic={topic}
                  moduleOrder={module.order}
                  onClick={() => onTopicClick(topic.id)}
                  isSelected={selectedTopicId === topic.id}
                />
              ))}
            </div>
          </ModuleCard>
        )
      })}
    </div>
  )
}
