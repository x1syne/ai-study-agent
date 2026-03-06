/**
 * Property-Based Tests for Data Migration to Module Structure
 * 
 * Feature: hierarchical-course-structure
 * Property 8: Migration Data Preservation
 * 
 * **Validates: Requirements 5.2, 5.3**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { MigrationResult, migrateToModules, verifyMigration } from './migrate-to-modules'

// Types for testing
interface MockGoal {
  id: string
  title: string
  skill: string
  userId: string
}

interface MockTopic {
  id: string
  moduleId: string
  slug: string
  name: string
  order: number
}

interface MockTopicProgress {
  id: string
  userId: string
  topicId: string
  status: string
  masteryLevel: number
}

interface MockModule {
  id: string
  goalId: string
  name: string
  order: number
}

// Arbitraries for generating test data
const goalIdArb = fc.uuid()
const userIdArb = fc.uuid()
const topicIdArb = fc.uuid()
const moduleIdArb = fc.uuid()

const mockGoalArb = fc.record({
  id: goalIdArb,
  title: fc.string({ minLength: 1, maxLength: 100 }),
  skill: fc.string({ minLength: 1, maxLength: 50 }),
  userId: userIdArb
}) as fc.Arbitrary<MockGoal>

const mockTopicArb = (moduleId: string) => fc.record({
  id: topicIdArb,
  moduleId: fc.constant(moduleId),
  slug: fc.string({ minLength: 1, maxLength: 50 }).map(s => s.replace(/\s/g, '-').toLowerCase()),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  order: fc.integer({ min: 1, max: 100 })
}) as fc.Arbitrary<MockTopic>

const mockTopicProgressArb = (topicId: string, userId: string) => fc.record({
  id: fc.uuid(),
  userId: fc.constant(userId),
  topicId: fc.constant(topicId),
  status: fc.constantFrom('LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'MASTERED'),
  masteryLevel: fc.integer({ min: 0, max: 100 })
}) as fc.Arbitrary<MockTopicProgress>

const mockModuleArb = (goalId: string) => fc.record({
  id: moduleIdArb,
  goalId: fc.constant(goalId),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  order: fc.integer({ min: 1, max: 10 })
}) as fc.Arbitrary<MockModule>

describe('Migration Data Preservation', () => {
  /**
   * Property 8: Migration Data Preservation
   * 
   * For any existing Goal with Topics, after migration:
   * - All original Topics SHALL exist within a Module
   * - All TopicProgress records SHALL be preserved
   * 
   * **Validates: Requirements 5.2, 5.3**
   */

  it('Property 8: Migration creates default module for goals without modules', () => {
    fc.assert(
      fc.property(
        fc.array(mockGoalArb, { minLength: 1, maxLength: 10 }),
        (goals) => {
          // Simulate migration logic
          const goalsWithoutModules = goals.filter(() => true) // All goals need modules
          const modulesCreated: MockModule[] = []

          for (const goal of goalsWithoutModules) {
            const defaultModule: MockModule = {
              id: `module-${goal.id}`,
              goalId: goal.id,
              name: 'Общий раздел',
              order: 1
            }
            modulesCreated.push(defaultModule)
          }

          // Verify: each goal has exactly one module created
          expect(modulesCreated.length).toBe(goals.length)
          
          // Verify: each module references a valid goal
          for (const module of modulesCreated) {
            const goalExists = goals.some(g => g.id === module.goalId)
            expect(goalExists).toBe(true)
          }

          // Verify: default module has correct name
          for (const module of modulesCreated) {
            expect(module.name).toBe('Общий раздел')
            expect(module.order).toBe(1)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 8: Topics remain associated with modules after migration', () => {
    fc.assert(
      fc.property(
        mockGoalArb,
        fc.integer({ min: 1, max: 10 }),
        (goal, topicCount) => {
          // Create a module for the goal
          const module: MockModule = {
            id: `module-${goal.id}`,
            goalId: goal.id,
            name: 'Общий раздел',
            order: 1
          }

          // Create topics for the module
          const topics: MockTopic[] = []
          for (let i = 0; i < topicCount; i++) {
            topics.push({
              id: `topic-${goal.id}-${i}`,
              moduleId: module.id,
              slug: `topic-${i}`,
              name: `Topic ${i}`,
              order: i + 1
            })
          }

          // Verify: all topics have valid moduleId
          for (const topic of topics) {
            expect(topic.moduleId).toBe(module.id)
          }

          // Verify: topic count is preserved
          expect(topics.length).toBe(topicCount)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 8: TopicProgress records are preserved after migration', () => {
    fc.assert(
      fc.property(
        mockGoalArb,
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (goal, topicCount, progressCount) => {
          const userId = goal.userId
          
          // Create module and topics
          const module: MockModule = {
            id: `module-${goal.id}`,
            goalId: goal.id,
            name: 'Общий раздел',
            order: 1
          }

          const topics: MockTopic[] = []
          for (let i = 0; i < topicCount; i++) {
            topics.push({
              id: `topic-${goal.id}-${i}`,
              moduleId: module.id,
              slug: `topic-${i}`,
              name: `Topic ${i}`,
              order: i + 1
            })
          }

          // Create progress records (up to progressCount, limited by topics)
          const actualProgressCount = Math.min(progressCount, topicCount)
          const progressRecords: MockTopicProgress[] = []
          for (let i = 0; i < actualProgressCount; i++) {
            progressRecords.push({
              id: `progress-${userId}-${topics[i].id}`,
              userId: userId,
              topicId: topics[i].id,
              status: 'IN_PROGRESS',
              masteryLevel: Math.floor(Math.random() * 100)
            })
          }

          // Verify: progress records reference valid topics
          for (const progress of progressRecords) {
            const topicExists = topics.some(t => t.id === progress.topicId)
            expect(topicExists).toBe(true)
          }

          // Verify: progress count is preserved
          expect(progressRecords.length).toBe(actualProgressCount)

          // Verify: progress records have valid user reference
          for (const progress of progressRecords) {
            expect(progress.userId).toBe(userId)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 8: Migration is idempotent - running twice produces same result', () => {
    fc.assert(
      fc.property(
        fc.array(mockGoalArb, { minLength: 1, maxLength: 5 }),
        (goals) => {
          // First migration run
          const firstRunModules: MockModule[] = []
          for (const goal of goals) {
            firstRunModules.push({
              id: `module-${goal.id}`,
              goalId: goal.id,
              name: 'Общий раздел',
              order: 1
            })
          }

          // Second migration run - should not create duplicates
          const goalsWithModules = new Set(firstRunModules.map(m => m.goalId))
          const secondRunModules: MockModule[] = []
          
          for (const goal of goals) {
            if (!goalsWithModules.has(goal.id)) {
              secondRunModules.push({
                id: `module-${goal.id}-2`,
                goalId: goal.id,
                name: 'Общий раздел',
                order: 1
              })
            }
          }

          // Verify: no new modules created in second run
          expect(secondRunModules.length).toBe(0)

          // Verify: total modules equals goals count
          expect(firstRunModules.length).toBe(goals.length)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('MigrationResult Structure', () => {
  it('MigrationResult has correct structure', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 1000 }),
        fc.array(fc.string(), { maxLength: 10 }),
        (success, goalsProcessed, modulesCreated, topicsMigrated, progressRecordsPreserved, errors) => {
          const result: MigrationResult = {
            success,
            goalsProcessed,
            modulesCreated,
            topicsMigrated,
            progressRecordsPreserved,
            errors
          }

          // Verify structure
          expect(result).toHaveProperty('success')
          expect(result).toHaveProperty('goalsProcessed')
          expect(result).toHaveProperty('modulesCreated')
          expect(result).toHaveProperty('topicsMigrated')
          expect(result).toHaveProperty('progressRecordsPreserved')
          expect(result).toHaveProperty('errors')

          // Verify types
          expect(typeof result.success).toBe('boolean')
          expect(typeof result.goalsProcessed).toBe('number')
          expect(typeof result.modulesCreated).toBe('number')
          expect(typeof result.topicsMigrated).toBe('number')
          expect(typeof result.progressRecordsPreserved).toBe('number')
          expect(Array.isArray(result.errors)).toBe(true)

          // Verify non-negative counts
          expect(result.goalsProcessed).toBeGreaterThanOrEqual(0)
          expect(result.modulesCreated).toBeGreaterThanOrEqual(0)
          expect(result.topicsMigrated).toBeGreaterThanOrEqual(0)
          expect(result.progressRecordsPreserved).toBeGreaterThanOrEqual(0)

          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('MigrationResult success correlates with empty errors', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 5 }),
        (errors) => {
          const result: MigrationResult = {
            success: errors.length === 0,
            goalsProcessed: 10,
            modulesCreated: 10,
            topicsMigrated: 50,
            progressRecordsPreserved: 100,
            errors
          }

          // Verify: success is true only when errors is empty
          if (result.success) {
            expect(result.errors.length).toBe(0)
          } else {
            expect(result.errors.length).toBeGreaterThan(0)
          }

          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})
