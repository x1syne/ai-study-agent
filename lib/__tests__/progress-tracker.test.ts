/**
 * 📊 PROGRESS TRACKER TESTS
 * 
 * Тесты для отслеживания прогресса пользователя
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  calculateModuleCompletion,
  calculateCourseCompletion
} from '../progress-tracker'
import type { LessonProgress, ModuleProgress } from '../agents/types'

// ═══════════════════════════════════════════════════════════════
// 📝 CALCULATE MODULE COMPLETION TESTS
// ═══════════════════════════════════════════════════════════════

describe('calculateModuleCompletion', () => {
  it('should return 0 for empty lessons array', () => {
    expect(calculateModuleCompletion([])).toBe(0)
  })

  it('should return 0 when no lessons completed', () => {
    const lessons: LessonProgress[] = [
      { lessonId: 'l1', status: 'not_started' },
      { lessonId: 'l2', status: 'not_started' },
      { lessonId: 'l3', status: 'theory_done' }
    ]
    expect(calculateModuleCompletion(lessons)).toBe(0)
  })

  it('should return 100 when all lessons completed', () => {
    const lessons: LessonProgress[] = [
      { lessonId: 'l1', status: 'completed' },
      { lessonId: 'l2', status: 'completed' }
    ]
    expect(calculateModuleCompletion(lessons)).toBe(100)
  })

  it('should calculate partial completion correctly', () => {
    const lessons: LessonProgress[] = [
      { lessonId: 'l1', status: 'completed' },
      { lessonId: 'l2', status: 'theory_done' },
      { lessonId: 'l3', status: 'not_started' },
      { lessonId: 'l4', status: 'completed' }
    ]
    // 2 out of 4 = 50%
    expect(calculateModuleCompletion(lessons)).toBe(50)
  })

  it('should round to nearest integer', () => {
    const lessons: LessonProgress[] = [
      { lessonId: 'l1', status: 'completed' },
      { lessonId: 'l2', status: 'not_started' },
      { lessonId: 'l3', status: 'not_started' }
    ]
    // 1 out of 3 = 33.33% -> 33%
    expect(calculateModuleCompletion(lessons)).toBe(33)
  })

  it('should handle single lesson', () => {
    const lessons: LessonProgress[] = [
      { lessonId: 'l1', status: 'completed' }
    ]
    expect(calculateModuleCompletion(lessons)).toBe(100)
  })

  it('should only count completed status', () => {
    const lessons: LessonProgress[] = [
      { lessonId: 'l1', status: 'theory_done' },
      { lessonId: 'l2', status: 'practice_done' },
      { lessonId: 'l3', status: 'not_started' }
    ]
    // None are 'completed'
    expect(calculateModuleCompletion(lessons)).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════
// 📊 CALCULATE COURSE COMPLETION TESTS
// ═══════════════════════════════════════════════════════════════

describe('calculateCourseCompletion', () => {
  it('should return 0 for empty modules array', () => {
    expect(calculateCourseCompletion([])).toBe(0)
  })

  it('should return 0 when no lessons in modules', () => {
    const modules: ModuleProgress[] = [
      { moduleId: 'm1', lessons: [], completionPercent: 0 },
      { moduleId: 'm2', lessons: [], completionPercent: 0 }
    ]
    expect(calculateCourseCompletion(modules)).toBe(0)
  })

  it('should return 100 when all lessons completed', () => {
    const modules: ModuleProgress[] = [
      {
        moduleId: 'm1',
        lessons: [
          { lessonId: 'l1', status: 'completed' },
          { lessonId: 'l2', status: 'completed' }
        ],
        completionPercent: 100
      },
      {
        moduleId: 'm2',
        lessons: [
          { lessonId: 'l3', status: 'completed' }
        ],
        completionPercent: 100
      }
    ]
    expect(calculateCourseCompletion(modules)).toBe(100)
  })

  it('should calculate across multiple modules', () => {
    const modules: ModuleProgress[] = [
      {
        moduleId: 'm1',
        lessons: [
          { lessonId: 'l1', status: 'completed' },
          { lessonId: 'l2', status: 'not_started' }
        ],
        completionPercent: 50
      },
      {
        moduleId: 'm2',
        lessons: [
          { lessonId: 'l3', status: 'completed' },
          { lessonId: 'l4', status: 'completed' }
        ],
        completionPercent: 100
      }
    ]
    // 3 out of 4 = 75%
    expect(calculateCourseCompletion(modules)).toBe(75)
  })

  it('should handle uneven module sizes', () => {
    const modules: ModuleProgress[] = [
      {
        moduleId: 'm1',
        lessons: [
          { lessonId: 'l1', status: 'completed' }
        ],
        completionPercent: 100
      },
      {
        moduleId: 'm2',
        lessons: [
          { lessonId: 'l2', status: 'not_started' },
          { lessonId: 'l3', status: 'not_started' },
          { lessonId: 'l4', status: 'not_started' },
          { lessonId: 'l5', status: 'not_started' }
        ],
        completionPercent: 0
      }
    ]
    // 1 out of 5 = 20%
    expect(calculateCourseCompletion(modules)).toBe(20)
  })

  it('should handle mixed completion states', () => {
    const modules: ModuleProgress[] = [
      {
        moduleId: 'm1',
        lessons: [
          { lessonId: 'l1', status: 'completed' },
          { lessonId: 'l2', status: 'theory_done' },
          { lessonId: 'l3', status: 'practice_done' }
        ],
        completionPercent: 33
      }
    ]
    // Only 1 completed out of 3 = 33%
    expect(calculateCourseCompletion(modules)).toBe(33)
  })

  it('should round percentages correctly', () => {
    const modules: ModuleProgress[] = [
      {
        moduleId: 'm1',
        lessons: [
          { lessonId: 'l1', status: 'completed' },
          { lessonId: 'l2', status: 'completed' }
        ],
        completionPercent: 100
      },
      {
        moduleId: 'm2',
        lessons: [
          { lessonId: 'l3', status: 'not_started' }
        ],
        completionPercent: 0
      }
    ]
    // 2 out of 3 = 66.67% -> 67%
    expect(calculateCourseCompletion(modules)).toBe(67)
  })
})

// ═══════════════════════════════════════════════════════════════
// 📊 LESSON STATUS TESTS
// ═══════════════════════════════════════════════════════════════

describe('LessonStatus types', () => {
  it('should recognize all valid status values', () => {
    const validStatuses: LessonProgress['status'][] = [
      'not_started',
      'theory_done',
      'practice_done',
      'completed'
    ]
    
    validStatuses.forEach(status => {
      const lesson: LessonProgress = { lessonId: 'test', status }
      expect(lesson.status).toBe(status)
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// 📊 EDGE CASES
// ═══════════════════════════════════════════════════════════════

describe('Edge cases', () => {
  it('should handle module with single completed lesson', () => {
    const modules: ModuleProgress[] = [
      {
        moduleId: 'm1',
        lessons: [{ lessonId: 'l1', status: 'completed' }],
        completionPercent: 100
      }
    ]
    expect(calculateCourseCompletion(modules)).toBe(100)
  })

  it('should handle many modules with few lessons each', () => {
    const modules: ModuleProgress[] = Array.from({ length: 10 }, (_, i) => ({
      moduleId: `m${i}`,
      lessons: [
        { lessonId: `l${i}`, status: i < 5 ? 'completed' : 'not_started' as const }
      ],
      completionPercent: i < 5 ? 100 : 0
    }))
    // 5 out of 10 = 50%
    expect(calculateCourseCompletion(modules)).toBe(50)
  })

  it('should handle completedAt field in lesson progress', () => {
    const lesson: LessonProgress = {
      lessonId: 'l1',
      status: 'completed',
      completedAt: '2025-01-03T12:00:00Z'
    }
    expect(lesson.completedAt).toBeDefined()
  })
})
