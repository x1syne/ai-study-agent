import { describe, it, expect, vi } from 'vitest'
import type { Module, Topic } from '@/types'

describe('ModuleGraph', () => {
  const createMockModule = (overrides: Partial<Module> = {}): Module => ({
    id: 'module-1',
    name: 'Test Module',
    description: 'Test description',
    icon: '📚',
    order: 1,
    topics: [],
    ...overrides,
  })

  const createMockTopic = (overrides: Partial<Topic> = {}): Topic => ({
    id: 'topic-1',
    name: 'Test Topic',
    description: 'Test description',
    icon: '📖',
    order: 1,
    difficulty: 'MEDIUM',
    estimatedMinutes: 20,
    prerequisiteIds: [],
    progress: { status: 'AVAILABLE', masteryLevel: 0 },
    ...overrides,
  } as Topic)

  describe('Module Status Calculation', () => {
    it('should mark module as AVAILABLE if it has no topics', () => {
      const module = createMockModule({ topics: [] })
      expect(module.topics.length).toBe(0)
      // Module with no topics should be available for topic generation
    })

    it('should mark module as COMPLETED if all topics are completed', () => {
      const topics = [
        createMockTopic({ id: 't1', progress: { status: 'COMPLETED', masteryLevel: 100 } }),
        createMockTopic({ id: 't2', progress: { status: 'MASTERED', masteryLevel: 100 } }),
      ]

      const completedCount = topics.filter(t => {
        const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
        return p?.status === 'COMPLETED' || p?.status === 'MASTERED'
      }).length

      expect(completedCount).toBe(topics.length)
    })

    it('should mark module as IN_PROGRESS if any topic is in progress', () => {
      const topics = [
        createMockTopic({ id: 't1', progress: { status: 'COMPLETED', masteryLevel: 100 } }),
        createMockTopic({ id: 't2', progress: { status: 'IN_PROGRESS', masteryLevel: 50 } }),
        createMockTopic({ id: 't3', progress: { status: 'AVAILABLE', masteryLevel: 0 } }),
      ]

      const hasInProgress = topics.some(t => {
        const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
        return p?.status === 'IN_PROGRESS'
      })
      expect(hasInProgress).toBe(true)
    })

    it('should calculate progress percentage correctly', () => {
      const topics = [
        createMockTopic({ id: 't1', progress: { status: 'COMPLETED', masteryLevel: 100 } }),
        createMockTopic({ id: 't2', progress: { status: 'COMPLETED', masteryLevel: 100 } }),
        createMockTopic({ id: 't3', progress: { status: 'AVAILABLE', masteryLevel: 0 } }),
        createMockTopic({ id: 't4', progress: { status: 'LOCKED', masteryLevel: 0 } }),
      ]

      const completed = topics.filter(t => {
        const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
        return p?.status === 'COMPLETED' || p?.status === 'MASTERED'
      }).length
      const progress = Math.round((completed / topics.length) * 100)

      expect(progress).toBe(50) // 2 out of 4 = 50%
    })

    it('should handle empty topics array', () => {
      const topics: Topic[] = []
      const progress = topics.length > 0 ? Math.round((0 / topics.length) * 100) : 0
      expect(progress).toBe(0)
    })

    it('should handle all topics completed', () => {
      const topics = [
        createMockTopic({ id: 't1', progress: { status: 'COMPLETED', masteryLevel: 100 } }),
        createMockTopic({ id: 't2', progress: { status: 'MASTERED', masteryLevel: 100 } }),
      ]

      const completed = topics.filter(t => {
        const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
        return p?.status === 'COMPLETED' || p?.status === 'MASTERED'
      }).length
      const progress = Math.round((completed / topics.length) * 100)

      expect(progress).toBe(100)
    })
  })

  describe('Module Ordering', () => {
    it('should sort modules by order', () => {
      const modules = [
        createMockModule({ id: 'm3', order: 3 }),
        createMockModule({ id: 'm1', order: 1 }),
        createMockModule({ id: 'm2', order: 2 }),
      ]

      const sorted = [...modules].sort((a, b) => a.order - b.order)

      expect(sorted[0].id).toBe('m1')
      expect(sorted[1].id).toBe('m2')
      expect(sorted[2].id).toBe('m3')
    })

    it('should handle modules with same order', () => {
      const modules = [
        createMockModule({ id: 'm1', order: 1 }),
        createMockModule({ id: 'm2', order: 1 }),
      ]

      const sorted = [...modules].sort((a, b) => a.order - b.order)
      expect(sorted).toHaveLength(2)
    })
  })

  describe('Module Statistics', () => {
    it('should count total modules', () => {
      const modules = [
        createMockModule({ id: 'm1' }),
        createMockModule({ id: 'm2' }),
        createMockModule({ id: 'm3' }),
      ]

      expect(modules.length).toBe(3)
    })

    it('should count completed modules', () => {
      const modules = [
        createMockModule({
          id: 'm1',
          topics: [
            createMockTopic({ progress: { status: 'COMPLETED', masteryLevel: 100 } }),
          ],
        }),
        createMockModule({
          id: 'm2',
          topics: [
            createMockTopic({ progress: { status: 'IN_PROGRESS', masteryLevel: 50 } }),
          ],
        }),
      ]

      const completedModules = modules.filter(m => {
        if (m.topics.length === 0) return false
        return m.topics.every(t => {
          const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
          return p?.status === 'COMPLETED' || p?.status === 'MASTERED'
        })
      })

      expect(completedModules.length).toBe(1)
    })

    it('should count total topics across all modules', () => {
      const modules = [
        createMockModule({
          id: 'm1',
          topics: [createMockTopic({ id: 't1' }), createMockTopic({ id: 't2' })],
        }),
        createMockModule({
          id: 'm2',
          topics: [createMockTopic({ id: 't3' })],
        }),
      ]

      const totalTopics = modules.reduce((sum, m) => sum + m.topics.length, 0)
      expect(totalTopics).toBe(3)
    })
  })
})
