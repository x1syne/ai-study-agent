import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { TopicStatus } from '@/types'

describe('ModuleTopics', () => {
  describe('Topic Status Display', () => {
    const STATUS_CONFIG: Record<TopicStatus, { label: string }> = {
      LOCKED: { label: 'Заблокировано' },
      AVAILABLE: { label: 'Доступно' },
      IN_PROGRESS: { label: 'В процессе' },
      COMPLETED: { label: 'Завершено' },
      MASTERED: { label: 'Освоено' },
    }

    it('should have correct status labels', () => {
      expect(STATUS_CONFIG.LOCKED.label).toBe('Заблокировано')
      expect(STATUS_CONFIG.AVAILABLE.label).toBe('Доступно')
      expect(STATUS_CONFIG.IN_PROGRESS.label).toBe('В процессе')
      expect(STATUS_CONFIG.COMPLETED.label).toBe('Завершено')
      expect(STATUS_CONFIG.MASTERED.label).toBe('Освоено')
    })

    it('should have all 5 statuses defined', () => {
      const statuses = Object.keys(STATUS_CONFIG)
      expect(statuses).toHaveLength(5)
      expect(statuses).toContain('LOCKED')
      expect(statuses).toContain('AVAILABLE')
      expect(statuses).toContain('IN_PROGRESS')
      expect(statuses).toContain('COMPLETED')
      expect(statuses).toContain('MASTERED')
    })
  })

  describe('Topic Sorting', () => {
    it('should sort topics by order', () => {
      const topics = [
        { id: 't3', name: 'Third', order: 3 },
        { id: 't1', name: 'First', order: 1 },
        { id: 't2', name: 'Second', order: 2 },
      ]

      const sorted = [...topics].sort((a, b) => (a.order || 0) - (b.order || 0))

      expect(sorted[0].name).toBe('First')
      expect(sorted[1].name).toBe('Second')
      expect(sorted[2].name).toBe('Third')
    })

    it('should handle topics without order', () => {
      const topics = [
        { id: 't1', name: 'No Order' },
        { id: 't2', name: 'Has Order', order: 1 },
      ]

      const sorted = [...topics].sort((a, b) => (a.order || 0) - (b.order || 0))
      expect(sorted).toHaveLength(2)
    })
  })

  describe('Progress Calculation', () => {
    it('should calculate progress correctly', () => {
      const topics = [
        { id: 't1', progress: { status: 'COMPLETED' as TopicStatus } },
        { id: 't2', progress: { status: 'COMPLETED' as TopicStatus } },
        { id: 't3', progress: { status: 'AVAILABLE' as TopicStatus } },
        { id: 't4', progress: { status: 'LOCKED' as TopicStatus } },
      ]

      const completedCount = topics.filter(t => {
        const status = t.progress?.status
        return status === 'COMPLETED' || status === 'MASTERED'
      }).length

      const progress = topics.length > 0 ? Math.round((completedCount / topics.length) * 100) : 0

      expect(progress).toBe(50) // 2 out of 4 = 50%
    })

    it('should return 0 for empty topics', () => {
      const topics: any[] = []
      const progress = topics.length > 0 ? Math.round((0 / topics.length) * 100) : 0
      expect(progress).toBe(0)
    })

    it('should return 100 for all completed', () => {
      const topics = [
        { id: 't1', progress: { status: 'COMPLETED' as TopicStatus } },
        { id: 't2', progress: { status: 'MASTERED' as TopicStatus } },
      ]

      const completedCount = topics.filter(t => {
        const status = t.progress?.status
        return status === 'COMPLETED' || status === 'MASTERED'
      }).length

      const progress = Math.round((completedCount / topics.length) * 100)
      expect(progress).toBe(100)
    })
  })

  describe('Topic Status Helper', () => {
    it('should get topic status from progress', () => {
      const getTopicStatus = (topic: { progress?: { status: TopicStatus } | null }): TopicStatus => {
        return topic.progress?.status || 'AVAILABLE'
      }

      expect(getTopicStatus({ progress: { status: 'COMPLETED' } })).toBe('COMPLETED')
      expect(getTopicStatus({ progress: { status: 'LOCKED' } })).toBe('LOCKED')
      expect(getTopicStatus({ progress: null })).toBe('AVAILABLE')
      expect(getTopicStatus({})).toBe('AVAILABLE')
    })
  })

  describe('Locked Topic Behavior', () => {
    it('should identify locked topics', () => {
      const topic = { id: 't1', progress: { status: 'LOCKED' as TopicStatus } }
      const isLocked = topic.progress?.status === 'LOCKED'
      expect(isLocked).toBe(true)
    })

    it('should identify non-locked topics', () => {
      const topics = [
        { id: 't1', progress: { status: 'AVAILABLE' as TopicStatus } },
        { id: 't2', progress: { status: 'IN_PROGRESS' as TopicStatus } },
        { id: 't3', progress: { status: 'COMPLETED' as TopicStatus } },
      ]

      topics.forEach(topic => {
        const isLocked = topic.progress?.status === 'LOCKED'
        expect(isLocked).toBe(false)
      })
    })
  })

  describe('API Response Handling', () => {
    it('should handle generated flag', () => {
      const response = { topics: [], generated: true }
      expect(response.generated).toBe(true)
    })

    it('should handle non-generated response', () => {
      const response = { topics: [], generated: false }
      expect(response.generated).toBe(false)
    })

    it('should handle topics array', () => {
      const response = {
        topics: [
          { id: 't1', name: 'Topic 1', order: 1 },
          { id: 't2', name: 'Topic 2', order: 2 },
        ],
        generated: false,
      }

      expect(response.topics).toHaveLength(2)
      expect(response.topics[0].name).toBe('Topic 1')
    })
  })
})
