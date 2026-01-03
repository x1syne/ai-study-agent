/**
 * 📊 PROGRESS TRACKER PROPERTY TESTS
 * 
 * Property-based тесты для отслеживания прогресса
 * Validates: Requirements 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3 from enhanced-course-experience
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateModuleCompletion,
  calculateCourseCompletion
} from '../progress-tracker'
import type { LessonProgress, ModuleProgress, LessonStatus } from '../agents/types'

// ═══════════════════════════════════════════════════════════════
// 🔧 ARBITRARIES
// ═══════════════════════════════════════════════════════════════

const lessonStatusArb = fc.constantFrom<LessonStatus>(
  'not_started', 'theory_done', 'practice_done', 'completed'
)

const lessonProgressArb = fc.record({
  lessonId: fc.uuid(),
  status: lessonStatusArb,
  completedAt: fc.option(fc.date().map(d => d.toISOString()), { nil: undefined })
}) as fc.Arbitrary<LessonProgress>

const moduleProgressArb = fc.array(lessonProgressArb, { minLength: 1, maxLength: 10 })
  .map(lessons => ({
    moduleId: `module-${Math.random().toString(36).slice(2)}`,
    lessons,
    completionPercent: calculateModuleCompletion(lessons)
  })) as fc.Arbitrary<ModuleProgress>

const courseProgressArb = fc.array(moduleProgressArb, { minLength: 1, maxLength: 10 })

// ═══════════════════════════════════════════════════════════════
// 📝 PROPERTY 5: Navigation Shows All Lessons
// Validates: Requirements 2.2
// ═══════════════════════════════════════════════════════════════

describe('Property 5: Navigation Shows All Lessons', () => {
  it('should count all lessons in module completion', () => {
    fc.assert(
      fc.property(
        fc.array(lessonProgressArb, { minLength: 1, maxLength: 20 }),
        (lessons) => {
          const completion = calculateModuleCompletion(lessons)
          
          // Property: completion is based on all lessons
          const completedCount = lessons.filter(l => l.status === 'completed').length
          const expectedPercent = Math.round((completedCount / lessons.length) * 100)
          
          expect(completion).toBe(expectedPercent)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should count all lessons across modules in course completion', () => {
    fc.assert(
      fc.property(
        courseProgressArb,
        (modules) => {
          const completion = calculateCourseCompletion(modules)
          
          // Property: completion is based on all lessons across all modules
          const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)
          const completedLessons = modules.reduce(
            (sum, m) => sum + m.lessons.filter(l => l.status === 'completed').length,
            0
          )
          
          if (totalLessons === 0) {
            expect(completion).toBe(0)
          } else {
            const expectedPercent = Math.round((completedLessons / totalLessons) * 100)
            expect(completion).toBe(expectedPercent)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 📝 PROPERTY 6: Progress Bar State Transitions
// Validates: Requirements 3.2, 3.3
// ═══════════════════════════════════════════════════════════════

describe('Property 6: Progress Bar State Transitions', () => {
  it('should return 0% when no lessons completed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          const lessons: LessonProgress[] = Array.from({ length: count }, (_, i) => ({
            lessonId: `lesson-${i}`,
            status: fc.sample(fc.constantFrom<LessonStatus>('not_started', 'theory_done', 'practice_done'), 1)[0]
          }))
          
          const completion = calculateModuleCompletion(lessons)
          
          // Property: 0% when no 'completed' status
          expect(completion).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 100% when all lessons completed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          const lessons: LessonProgress[] = Array.from({ length: count }, (_, i) => ({
            lessonId: `lesson-${i}`,
            status: 'completed' as LessonStatus
          }))
          
          const completion = calculateModuleCompletion(lessons)
          
          // Property: 100% when all completed
          expect(completion).toBe(100)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return percentage between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.array(lessonProgressArb, { minLength: 1, maxLength: 50 }),
        (lessons) => {
          const completion = calculateModuleCompletion(lessons)
          
          // Property: percentage is in valid range
          expect(completion).toBeGreaterThanOrEqual(0)
          expect(completion).toBeLessThanOrEqual(100)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return integer percentage', () => {
    fc.assert(
      fc.property(
        fc.array(lessonProgressArb, { minLength: 1, maxLength: 50 }),
        (lessons) => {
          const completion = calculateModuleCompletion(lessons)
          
          // Property: result is integer
          expect(Number.isInteger(completion)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 📝 PROPERTY 7: Module Completion Calculation
// Validates: Requirements 3.4, 3.5
// ═══════════════════════════════════════════════════════════════

describe('Property 7: Module Completion Calculation', () => {
  it('should be monotonic - more completed lessons = higher percentage', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }),
        fc.integer({ min: 0, max: 19 }),
        (total, completedCount) => {
          const actualCompleted = Math.min(completedCount, total)
          
          const lessons: LessonProgress[] = Array.from({ length: total }, (_, i) => ({
            lessonId: `lesson-${i}`,
            status: i < actualCompleted ? 'completed' : 'not_started' as LessonStatus
          }))
          
          const lessonsWithOneMore: LessonProgress[] = Array.from({ length: total }, (_, i) => ({
            lessonId: `lesson-${i}`,
            status: i < Math.min(actualCompleted + 1, total) ? 'completed' : 'not_started' as LessonStatus
          }))
          
          const completion1 = calculateModuleCompletion(lessons)
          const completion2 = calculateModuleCompletion(lessonsWithOneMore)
          
          // Property: more completed = higher or equal percentage
          expect(completion2).toBeGreaterThanOrEqual(completion1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle empty lessons array', () => {
    const completion = calculateModuleCompletion([])
    expect(completion).toBe(0)
  })

  it('should only count "completed" status, not intermediate states', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          // All lessons in intermediate states
          const lessons: LessonProgress[] = Array.from({ length: count }, (_, i) => ({
            lessonId: `lesson-${i}`,
            status: i % 2 === 0 ? 'theory_done' : 'practice_done' as LessonStatus
          }))
          
          const completion = calculateModuleCompletion(lessons)
          
          // Property: intermediate states don't count as completed
          expect(completion).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 📝 PROPERTY 8: Progress Persistence Round-Trip
// Validates: Requirements 6.1, 6.2, 6.3
// ═══════════════════════════════════════════════════════════════

describe('Property 8: Progress Persistence Round-Trip', () => {
  it('should preserve lesson status in progress calculation', () => {
    fc.assert(
      fc.property(
        fc.array(lessonProgressArb, { minLength: 1, maxLength: 20 }),
        (lessons) => {
          // Simulate round-trip: calculate -> store -> recalculate
          const completion1 = calculateModuleCompletion(lessons)
          
          // Simulate loading from storage (same data)
          const loadedLessons = JSON.parse(JSON.stringify(lessons)) as LessonProgress[]
          const completion2 = calculateModuleCompletion(loadedLessons)
          
          // Property: round-trip preserves completion percentage
          expect(completion2).toBe(completion1)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should handle completedAt timestamp correctly', () => {
    fc.assert(
      fc.property(
        fc.date(),
        (date) => {
          const lesson: LessonProgress = {
            lessonId: 'test-lesson',
            status: 'completed',
            completedAt: date.toISOString()
          }
          
          // Property: completedAt is valid ISO string
          expect(() => new Date(lesson.completedAt!)).not.toThrow()
          expect(new Date(lesson.completedAt!).toISOString()).toBe(date.toISOString())
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should calculate course completion consistently', () => {
    fc.assert(
      fc.property(
        courseProgressArb,
        (modules) => {
          const completion1 = calculateCourseCompletion(modules)
          
          // Simulate round-trip
          const loadedModules = JSON.parse(JSON.stringify(modules)) as ModuleProgress[]
          const completion2 = calculateCourseCompletion(loadedModules)
          
          // Property: round-trip preserves course completion
          expect(completion2).toBe(completion1)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 📝 PROPERTY: Course Completion Edge Cases
// ═══════════════════════════════════════════════════════════════

describe('Property: Course Completion Edge Cases', () => {
  it('should handle modules with different lesson counts fairly', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 2, maxLength: 5 }),
        (lessonCounts) => {
          // Create modules with varying lesson counts, all completed
          const modules: ModuleProgress[] = lessonCounts.map((count, i) => ({
            moduleId: `module-${i}`,
            lessons: Array.from({ length: count }, (_, j) => ({
              lessonId: `lesson-${i}-${j}`,
              status: 'completed' as LessonStatus
            })),
            completionPercent: 100
          }))
          
          const completion = calculateCourseCompletion(modules)
          
          // Property: all completed = 100%
          expect(completion).toBe(100)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should weight modules by lesson count, not equally', () => {
    // Module 1: 1 lesson completed
    // Module 2: 9 lessons not completed
    // Total: 1/10 = 10%, not 50%
    const modules: ModuleProgress[] = [
      {
        moduleId: 'module-1',
        lessons: [{ lessonId: 'l1', status: 'completed' }],
        completionPercent: 100
      },
      {
        moduleId: 'module-2',
        lessons: Array.from({ length: 9 }, (_, i) => ({
          lessonId: `l${i + 2}`,
          status: 'not_started' as LessonStatus
        })),
        completionPercent: 0
      }
    ]
    
    const completion = calculateCourseCompletion(modules)
    
    // Property: weighted by lesson count
    expect(completion).toBe(10) // 1/10 = 10%
  })

  it('should handle empty modules array', () => {
    const completion = calculateCourseCompletion([])
    expect(completion).toBe(0)
  })

  it('should handle modules with empty lessons arrays', () => {
    const modules: ModuleProgress[] = [
      { moduleId: 'm1', lessons: [], completionPercent: 0 },
      { moduleId: 'm2', lessons: [], completionPercent: 0 }
    ]
    
    const completion = calculateCourseCompletion(modules)
    expect(completion).toBe(0)
  })
})
