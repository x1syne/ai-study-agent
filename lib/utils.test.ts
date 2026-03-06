/**
 * Property-Based Tests for Progress Calculation Utilities
 * 
 * Feature: hierarchical-course-structure
 * Property 6: Progress Calculation Accuracy
 * Property 7: Overall Course Progress Calculation
 * 
 * **Validates: Requirements 4.1, 4.2, 4.4**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateModuleProgress, calculateOverallProgress } from './utils'

// Types for testing
interface MockTopicProgress {
  status: string
}

interface MockTopic {
  progress?: MockTopicProgress | null
}

interface MockModule {
  topics: MockTopic[]
}

// Arbitraries for generating test data
const topicStatusArb = fc.constantFrom('LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'MASTERED')

const mockTopicArb: fc.Arbitrary<MockTopic> = fc.oneof(
  fc.constant({ progress: null }),
  fc.constant({ progress: undefined }),
  fc.record({
    progress: fc.record({
      status: topicStatusArb
    })
  })
)

const mockModuleArb: fc.Arbitrary<MockModule> = fc.record({
  topics: fc.array(mockTopicArb, { minLength: 0, maxLength: 10 })
})

describe('Progress Calculation', () => {
  /**
   * Property 6: Progress Calculation Accuracy
   * 
   * For any Module with N total Topics and M completed Topics,
   * the progress percentage SHALL equal (M / N) * 100.
   * 
   * **Validates: Requirements 4.1, 4.2**
   */
  it('Property 6: Module progress equals (completed / total) * 100', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.integer({ min: 0, max: 20 }),
        (completedCount, nonCompletedCount) => {
          // Create topics with specific completed/non-completed counts
          const completedTopics: MockTopic[] = Array(completedCount).fill(null).map(() => ({
            progress: { status: fc.sample(fc.constantFrom('COMPLETED', 'MASTERED'), 1)[0] }
          }))
          
          const nonCompletedTopics: MockTopic[] = Array(nonCompletedCount).fill(null).map(() => ({
            progress: { status: fc.sample(fc.constantFrom('LOCKED', 'AVAILABLE', 'IN_PROGRESS'), 1)[0] }
          }))
          
          const allTopics = [...completedTopics, ...nonCompletedTopics]
          const totalCount = allTopics.length
          
          const progress = calculateModuleProgress(allTopics)
          
          // Verify: progress equals (completed / total) * 100
          if (totalCount === 0) {
            expect(progress).toBe(0)
          } else {
            const expectedProgress = Math.round((completedCount / totalCount) * 100)
            expect(progress).toBe(expectedProgress)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6: Progress is always between 0 and 100
   */
  it('Property 6: Module progress is bounded between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.array(mockTopicArb, { minLength: 0, maxLength: 20 }),
        (topics) => {
          const progress = calculateModuleProgress(topics)
          
          expect(progress).toBeGreaterThanOrEqual(0)
          expect(progress).toBeLessThanOrEqual(100)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6: Empty module returns 0 progress
   */
  it('Property 6: Empty module returns 0 progress', () => {
    const progress = calculateModuleProgress([])
    expect(progress).toBe(0)
  })

  /**
   * Property 6: All completed topics returns 100 progress
   */
  it('Property 6: All completed topics returns 100 progress', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        (count) => {
          const topics: MockTopic[] = Array(count).fill(null).map(() => ({
            progress: { status: fc.sample(fc.constantFrom('COMPLETED', 'MASTERED'), 1)[0] }
          }))
          
          const progress = calculateModuleProgress(topics)
          expect(progress).toBe(100)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7: Overall Course Progress Calculation
   * 
   * For any Goal, the overall progress SHALL equal
   * (total completed topics across all modules / total topics across all modules) * 100.
   * 
   * **Validates: Requirements 4.4**
   */
  it('Property 7: Overall progress equals (total completed / total topics) * 100', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc.integer({ min: 0, max: 10 }),
            fc.integer({ min: 0, max: 10 })
          ),
          { minLength: 1, maxLength: 5 }
        ),
        (moduleCounts) => {
          // Create modules with specific completed/non-completed counts
          let totalCompleted = 0
          let totalTopics = 0
          
          const modules: MockModule[] = moduleCounts.map(([completedCount, nonCompletedCount]) => {
            totalCompleted += completedCount
            totalTopics += completedCount + nonCompletedCount
            
            const completedTopics: MockTopic[] = Array(completedCount).fill(null).map(() => ({
              progress: { status: fc.sample(fc.constantFrom('COMPLETED', 'MASTERED'), 1)[0] }
            }))
            
            const nonCompletedTopics: MockTopic[] = Array(nonCompletedCount).fill(null).map(() => ({
              progress: { status: fc.sample(fc.constantFrom('LOCKED', 'AVAILABLE', 'IN_PROGRESS'), 1)[0] }
            }))
            
            return { topics: [...completedTopics, ...nonCompletedTopics] }
          })
          
          const progress = calculateOverallProgress(modules)
          
          // Verify: progress equals (total completed / total topics) * 100
          if (totalTopics === 0) {
            expect(progress).toBe(0)
          } else {
            const expectedProgress = Math.round((totalCompleted / totalTopics) * 100)
            expect(progress).toBe(expectedProgress)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7: Overall progress is always between 0 and 100
   */
  it('Property 7: Overall progress is bounded between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.array(mockModuleArb, { minLength: 0, maxLength: 10 }),
        (modules) => {
          const progress = calculateOverallProgress(modules)
          
          expect(progress).toBeGreaterThanOrEqual(0)
          expect(progress).toBeLessThanOrEqual(100)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7: Empty modules array returns 0 progress
   */
  it('Property 7: Empty modules array returns 0 progress', () => {
    const progress = calculateOverallProgress([])
    expect(progress).toBe(0)
  })

  /**
   * Property 7: Modules with empty topics returns 0 progress
   */
  it('Property 7: Modules with empty topics returns 0 progress', () => {
    const modules: MockModule[] = [{ topics: [] }, { topics: [] }]
    const progress = calculateOverallProgress(modules)
    expect(progress).toBe(0)
  })
})
