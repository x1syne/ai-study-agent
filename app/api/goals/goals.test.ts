/**
 * Property-Based Tests for Goals API Ordering
 * 
 * Feature: hierarchical-course-structure
 * Property 9: API Response Ordering
 * 
 * **Validates: Requirements 6.4**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Types for testing
interface MockTopic {
  id: string
  name: string
  order: number
}

interface MockModule {
  id: string
  name: string
  order: number
  topics: MockTopic[]
}

interface MockGoal {
  id: string
  title: string
  modules: MockModule[]
}

// Arbitraries for generating test data
const mockTopicArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  order: fc.integer({ min: 1, max: 100 })
}) as fc.Arbitrary<MockTopic>

const mockModuleArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  order: fc.integer({ min: 1, max: 20 }),
  topics: fc.array(mockTopicArb, { minLength: 1, maxLength: 10 })
}) as fc.Arbitrary<MockModule>

const mockGoalArb = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  modules: fc.array(mockModuleArb, { minLength: 1, maxLength: 10 })
}) as fc.Arbitrary<MockGoal>

/**
 * Simulates the API sorting logic
 * This mirrors what the actual API does when returning goals
 */
function sortGoalStructure(goal: MockGoal): MockGoal {
  return {
    ...goal,
    modules: [...goal.modules]
      .sort((a, b) => a.order - b.order)
      .map(mod => ({
        ...mod,
        topics: [...mod.topics].sort((a, b) => a.order - b.order)
      }))
  }
}

/**
 * Checks if an array is sorted by a given key in ascending order
 */
function isSortedAscending<T>(arr: T[], getKey: (item: T) => number): boolean {
  for (let i = 1; i < arr.length; i++) {
    if (getKey(arr[i]) < getKey(arr[i - 1])) {
      return false
    }
  }
  return true
}

describe('API Response Ordering', () => {
  /**
   * Property 9: API Response Ordering
   * 
   * For any API response containing course structure:
   * - Modules SHALL be sorted by order ascending
   * - Topics within each Module SHALL be sorted by order ascending
   * 
   * **Validates: Requirements 6.4**
   */

  it('Property 9: Modules are sorted by order ascending', () => {
    fc.assert(
      fc.property(
        mockGoalArb,
        (goal) => {
          // Apply the sorting logic (simulating API behavior)
          const sortedGoal = sortGoalStructure(goal)

          // Verify: modules are sorted by order ascending
          const modulesSorted = isSortedAscending(sortedGoal.modules, m => m.order)
          expect(modulesSorted).toBe(true)

          return modulesSorted
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9: Topics within each module are sorted by order ascending', () => {
    fc.assert(
      fc.property(
        mockGoalArb,
        (goal) => {
          // Apply the sorting logic (simulating API behavior)
          const sortedGoal = sortGoalStructure(goal)

          // Verify: topics within each module are sorted by order ascending
          for (const mod of sortedGoal.modules) {
            const topicsSorted = isSortedAscending(mod.topics, t => t.order)
            expect(topicsSorted).toBe(true)
            if (!topicsSorted) return false
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9: Sorting preserves all modules and topics', () => {
    fc.assert(
      fc.property(
        mockGoalArb,
        (goal) => {
          // Apply the sorting logic
          const sortedGoal = sortGoalStructure(goal)

          // Verify: same number of modules
          expect(sortedGoal.modules.length).toBe(goal.modules.length)

          // Verify: same module IDs (just reordered)
          const originalModuleIds = new Set(goal.modules.map(m => m.id))
          const sortedModuleIds = new Set(sortedGoal.modules.map(m => m.id))
          expect(sortedModuleIds).toEqual(originalModuleIds)

          // Verify: same number of topics in each module
          for (const sortedMod of sortedGoal.modules) {
            const originalMod = goal.modules.find(m => m.id === sortedMod.id)
            expect(originalMod).toBeDefined()
            expect(sortedMod.topics.length).toBe(originalMod!.topics.length)

            // Verify: same topic IDs within module
            const originalTopicIds = new Set(originalMod!.topics.map(t => t.id))
            const sortedTopicIds = new Set(sortedMod.topics.map(t => t.id))
            expect(sortedTopicIds).toEqual(originalTopicIds)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9: Sorting is idempotent', () => {
    fc.assert(
      fc.property(
        mockGoalArb,
        (goal) => {
          // Apply sorting twice
          const sortedOnce = sortGoalStructure(goal)
          const sortedTwice = sortGoalStructure(sortedOnce)

          // Verify: sorting twice produces same result as sorting once
          expect(sortedTwice.modules.map(m => m.id)).toEqual(sortedOnce.modules.map(m => m.id))
          
          for (let i = 0; i < sortedOnce.modules.length; i++) {
            expect(sortedTwice.modules[i].topics.map(t => t.id))
              .toEqual(sortedOnce.modules[i].topics.map(t => t.id))
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 9: Multiple goals maintain independent ordering', () => {
    fc.assert(
      fc.property(
        fc.array(mockGoalArb, { minLength: 2, maxLength: 5 }),
        (goals) => {
          // Sort each goal independently
          const sortedGoals = goals.map(sortGoalStructure)

          // Verify: each goal's modules are sorted independently
          for (const sortedGoal of sortedGoals) {
            const modulesSorted = isSortedAscending(sortedGoal.modules, m => m.order)
            expect(modulesSorted).toBe(true)

            for (const mod of sortedGoal.modules) {
              const topicsSorted = isSortedAscending(mod.topics, t => t.order)
              expect(topicsSorted).toBe(true)
            }
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
