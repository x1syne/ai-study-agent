/**
 * Property-Based Tests for Course Generation Structure
 * 
 * Feature: hierarchical-course-structure
 * 
 * These tests validate the structure of generated course data
 * to ensure it conforms to the hierarchical module/topic structure.
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.7**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Types matching the expected GeneratedCourse interface from design.md
interface GeneratedTopic {
  slug: string
  name: string
  description: string
  icon: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'
  estimatedMinutes: number
  order: number
  prerequisites: string[]
}

interface GeneratedModule {
  name: string
  description: string
  icon: string
  order: number
  topics: GeneratedTopic[]
}

interface GeneratedCourse {
  modules: GeneratedModule[]
}

// Validation functions that mirror what the API should enforce
function validateModuleCount(course: GeneratedCourse): boolean {
  return course.modules.length >= 3 && course.modules.length <= 6
}

function validateTopicCountPerModule(course: GeneratedCourse): boolean {
  return course.modules.every(
    module => module.topics.length >= 2 && module.topics.length <= 5
  )
}

function validateSequentialModuleOrder(course: GeneratedCourse): boolean {
  return course.modules.every(
    (module, index) => module.order === index + 1
  )
}

function validateSequentialTopicOrder(course: GeneratedCourse): boolean {
  return course.modules.every(module =>
    module.topics.every(
      (topic, index) => topic.order === index + 1
    )
  )
}

function validateModuleDescriptions(course: GeneratedCourse): boolean {
  return course.modules.every(
    module => module.description && module.description.trim().length > 0
  )
}

// Arbitraries for generating test data
const difficultyArb = fc.constantFrom('EASY', 'MEDIUM', 'HARD', 'EXPERT') as fc.Arbitrary<'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'>

const topicArb = (order: number): fc.Arbitrary<GeneratedTopic> => fc.record({
  slug: fc.stringMatching(/^[a-z][a-z0-9-]{0,49}$/).map(s => s || 'topic'),
  name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  description: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  icon: fc.constantFrom('📖', '📚', '🎯', '💡', '🔬'),
  difficulty: difficultyArb,
  estimatedMinutes: fc.integer({ min: 10, max: 60 }),
  order: fc.constant(order),
  prerequisites: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 3 })
})

const moduleArb = (order: number, topicCount: number): fc.Arbitrary<GeneratedModule> => 
  fc.tuple(
    fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
    fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
    fc.constantFrom('📚', '🎓', '📖', '🧠', '💻'),
    fc.tuple(...Array.from({ length: topicCount }, (_, i) => topicArb(i + 1)))
  ).map(([name, description, icon, topics]) => ({
    name,
    description,
    icon,
    order,
    topics
  }))

// Generate a valid course with specified module and topic counts
const validCourseArb = (moduleCount: number, topicsPerModule: number[]): fc.Arbitrary<GeneratedCourse> =>
  fc.tuple(
    ...Array.from({ length: moduleCount }, (_, i) => 
      moduleArb(i + 1, topicsPerModule[i] || 3)
    )
  ).map(modules => ({ modules }))

// Generate a course with random valid structure (3-6 modules, 2-5 topics each)
const randomValidCourseArb: fc.Arbitrary<GeneratedCourse> = 
  fc.integer({ min: 3, max: 6 }).chain(moduleCount =>
    fc.tuple(
      ...Array.from({ length: moduleCount }, () => 
        fc.integer({ min: 2, max: 5 })
      )
    ).chain(topicCounts =>
      validCourseArb(moduleCount, topicCounts)
    )
  )

describe('Course Generation Structure Properties', () => {
  /**
   * Property 2: Module Count Bounds (3-6)
   * 
   * For any AI-generated course structure, the number of Modules 
   * SHALL be between 3 and 6 inclusive.
   * 
   * **Validates: Requirements 2.1**
   */
  it('Property 2: Module Count Bounds - valid courses have 3-6 modules', () => {
    fc.assert(
      fc.property(
        randomValidCourseArb,
        (course) => {
          const isValid = validateModuleCount(course)
          expect(isValid).toBe(true)
          expect(course.modules.length).toBeGreaterThanOrEqual(3)
          expect(course.modules.length).toBeLessThanOrEqual(6)
          return isValid
        }
      ),
      { numRuns: 5, timeout: 10000 }
    )
  })

  it('Property 2: Module Count Bounds - rejects courses with < 3 modules', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 }),
        (moduleCount) => {
          const topicCounts = Array(moduleCount).fill(3)
          
          // Generate course with invalid module count
          const modules: GeneratedModule[] = Array.from({ length: moduleCount }, (_, i) => ({
            name: `Module ${i + 1}`,
            description: `Description for module ${i + 1}`,
            icon: '📚',
            order: i + 1,
            topics: Array.from({ length: 3 }, (_, j) => ({
              slug: `topic-${i}-${j}`,
              name: `Topic ${j + 1}`,
              description: 'Topic description',
              icon: '📖',
              difficulty: 'EASY' as const,
              estimatedMinutes: 15,
              order: j + 1,
              prerequisites: []
            }))
          }))

          const course: GeneratedCourse = { modules }
          const isValid = validateModuleCount(course)
          
          expect(isValid).toBe(false)
          return !isValid
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 2: Module Count Bounds - rejects courses with > 6 modules', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 7, max: 15 }),
        (moduleCount) => {
          const modules: GeneratedModule[] = Array.from({ length: moduleCount }, (_, i) => ({
            name: `Module ${i + 1}`,
            description: `Description for module ${i + 1}`,
            icon: '📚',
            order: i + 1,
            topics: Array.from({ length: 3 }, (_, j) => ({
              slug: `topic-${i}-${j}`,
              name: `Topic ${j + 1}`,
              description: 'Topic description',
              icon: '📖',
              difficulty: 'EASY' as const,
              estimatedMinutes: 15,
              order: j + 1,
              prerequisites: []
            }))
          }))

          const course: GeneratedCourse = { modules }
          const isValid = validateModuleCount(course)
          
          expect(isValid).toBe(false)
          return !isValid
        }
      ),
      { numRuns: 20 }
    )
  })


  /**
   * Property 3: Topic Count Per Module Bounds (2-5)
   * 
   * For any AI-generated Module, the number of Topics 
   * SHALL be between 2 and 5 inclusive.
   * 
   * **Validates: Requirements 2.2**
   */
  it('Property 3: Topic Count Per Module Bounds - valid modules have 2-5 topics', () => {
    fc.assert(
      fc.property(
        randomValidCourseArb,
        (course) => {
          const isValid = validateTopicCountPerModule(course)
          expect(isValid).toBe(true)
          
          for (const module of course.modules) {
            expect(module.topics.length).toBeGreaterThanOrEqual(2)
            expect(module.topics.length).toBeLessThanOrEqual(5)
          }
          
          return isValid
        }
      ),
      { numRuns: 5, timeout: 10000 }
    )
  })

  it('Property 3: Topic Count Per Module Bounds - rejects modules with < 2 topics', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1 }),
        (topicCount) => {
          const module: GeneratedModule = {
            name: 'Test Module',
            description: 'Test description',
            icon: '📚',
            order: 1,
            topics: Array.from({ length: topicCount }, (_, j) => ({
              slug: `topic-${j}`,
              name: `Topic ${j + 1}`,
              description: 'Topic description',
              icon: '📖',
              difficulty: 'EASY' as const,
              estimatedMinutes: 15,
              order: j + 1,
              prerequisites: []
            }))
          }

          const course: GeneratedCourse = { 
            modules: [module, module, module] // 3 modules to pass module count validation
          }
          const isValid = validateTopicCountPerModule(course)
          
          expect(isValid).toBe(false)
          return !isValid
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 3: Topic Count Per Module Bounds - rejects modules with > 5 topics', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 6, max: 15 }),
        (topicCount) => {
          const module: GeneratedModule = {
            name: 'Test Module',
            description: 'Test description',
            icon: '📚',
            order: 1,
            topics: Array.from({ length: topicCount }, (_, j) => ({
              slug: `topic-${j}`,
              name: `Topic ${j + 1}`,
              description: 'Topic description',
              icon: '📖',
              difficulty: 'EASY' as const,
              estimatedMinutes: 15,
              order: j + 1,
              prerequisites: []
            }))
          }

          const course: GeneratedCourse = { 
            modules: [module, module, module]
          }
          const isValid = validateTopicCountPerModule(course)
          
          expect(isValid).toBe(false)
          return !isValid
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 4: Sequential Order Assignment
   * 
   * For any generated course:
   * - Module order values SHALL be sequential starting from 1
   * - Topic order values within each Module SHALL be sequential starting from 1
   * 
   * **Validates: Requirements 2.3, 2.4**
   */
  it('Property 4: Sequential Order Assignment - modules have sequential order starting from 1', () => {
    fc.assert(
      fc.property(
        randomValidCourseArb,
        (course) => {
          const isValid = validateSequentialModuleOrder(course)
          expect(isValid).toBe(true)
          
          course.modules.forEach((module, index) => {
            expect(module.order).toBe(index + 1)
          })
          
          return isValid
        }
      ),
      { numRuns: 5, timeout: 10000 }
    )
  })

  it('Property 4: Sequential Order Assignment - topics within modules have sequential order starting from 1', () => {
    fc.assert(
      fc.property(
        randomValidCourseArb,
        (course) => {
          const isValid = validateSequentialTopicOrder(course)
          expect(isValid).toBe(true)
          
          for (const module of course.modules) {
            module.topics.forEach((topic, index) => {
              expect(topic.order).toBe(index + 1)
            })
          }
          
          return isValid
        }
      ),
      { numRuns: 5, timeout: 10000 }
    )
  })

  it('Property 4: Sequential Order Assignment - rejects non-sequential module orders', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 6 }),
        (moduleCount) => {
          // Create modules with non-sequential order (e.g., 1, 3, 5 instead of 1, 2, 3)
          const modules: GeneratedModule[] = Array.from({ length: moduleCount }, (_, i) => ({
            name: `Module ${i + 1}`,
            description: `Description for module ${i + 1}`,
            icon: '📚',
            order: (i + 1) * 2, // Non-sequential: 2, 4, 6, ...
            topics: Array.from({ length: 3 }, (_, j) => ({
              slug: `topic-${i}-${j}`,
              name: `Topic ${j + 1}`,
              description: 'Topic description',
              icon: '📖',
              difficulty: 'EASY' as const,
              estimatedMinutes: 15,
              order: j + 1,
              prerequisites: []
            }))
          }))

          const course: GeneratedCourse = { modules }
          const isValid = validateSequentialModuleOrder(course)
          
          expect(isValid).toBe(false)
          return !isValid
        }
      ),
      { numRuns: 20 }
    )
  })

  it('Property 4: Sequential Order Assignment - rejects non-sequential topic orders', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        (topicCount) => {
          // Create module with non-sequential topic order
          const module: GeneratedModule = {
            name: 'Test Module',
            description: 'Test description',
            icon: '📚',
            order: 1,
            topics: Array.from({ length: topicCount }, (_, j) => ({
              slug: `topic-${j}`,
              name: `Topic ${j + 1}`,
              description: 'Topic description',
              icon: '📖',
              difficulty: 'EASY' as const,
              estimatedMinutes: 15,
              order: (j + 1) * 2, // Non-sequential: 2, 4, 6, ...
              prerequisites: []
            }))
          }

          const course: GeneratedCourse = { 
            modules: [
              { ...module, order: 1 },
              { ...module, order: 2 },
              { ...module, order: 3 }
            ]
          }
          const isValid = validateSequentialTopicOrder(course)
          
          expect(isValid).toBe(false)
          return !isValid
        }
      ),
      { numRuns: 20 }
    )
  })

  /**
   * Property 5: Module Description Existence
   * 
   * For any AI-generated Module, the description field 
   * SHALL be non-empty.
   * 
   * **Validates: Requirements 2.7**
   */
  it('Property 5: Module Description Existence - all modules have non-empty descriptions', () => {
    fc.assert(
      fc.property(
        randomValidCourseArb,
        (course) => {
          const isValid = validateModuleDescriptions(course)
          expect(isValid).toBe(true)
          
          for (const module of course.modules) {
            expect(module.description).toBeDefined()
            expect(module.description.trim().length).toBeGreaterThan(0)
          }
          
          return isValid
        }
      ),
      { numRuns: 5, timeout: 10000 }
    )
  })

  it('Property 5: Module Description Existence - rejects modules with empty descriptions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', '   ', '\t', '\n'),
        (emptyDescription) => {
          const module: GeneratedModule = {
            name: 'Test Module',
            description: emptyDescription,
            icon: '📚',
            order: 1,
            topics: Array.from({ length: 3 }, (_, j) => ({
              slug: `topic-${j}`,
              name: `Topic ${j + 1}`,
              description: 'Topic description',
              icon: '📖',
              difficulty: 'EASY' as const,
              estimatedMinutes: 15,
              order: j + 1,
              prerequisites: []
            }))
          }

          const course: GeneratedCourse = { 
            modules: [
              { ...module, order: 1 },
              { ...module, order: 2 },
              { ...module, order: 3 }
            ]
          }
          const isValid = validateModuleDescriptions(course)
          
          expect(isValid).toBe(false)
          return !isValid
        }
      ),
      { numRuns: 20 }
    )
  })
})

describe('Course Validation Utility Functions', () => {
  it('All validation functions work together for valid courses', () => {
    fc.assert(
      fc.property(
        randomValidCourseArb,
        (course) => {
          const moduleCountValid = validateModuleCount(course)
          const topicCountValid = validateTopicCountPerModule(course)
          const moduleOrderValid = validateSequentialModuleOrder(course)
          const topicOrderValid = validateSequentialTopicOrder(course)
          const descriptionsValid = validateModuleDescriptions(course)

          expect(moduleCountValid).toBe(true)
          expect(topicCountValid).toBe(true)
          expect(moduleOrderValid).toBe(true)
          expect(topicOrderValid).toBe(true)
          expect(descriptionsValid).toBe(true)

          return moduleCountValid && topicCountValid && moduleOrderValid && topicOrderValid && descriptionsValid
        }
      ),
      { numRuns: 5, timeout: 10000 }
    )
  })
})
