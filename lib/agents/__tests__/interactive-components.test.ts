/**
 * 🧪 INTERACTIVE COMPONENT PROPERTY TESTS
 * 
 * Feature: visual-interactive-courses
 * Property 3: Interactive Component Validity
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  generateInteractiveComponent,
  generateAllInteractiveComponents,
  validateInteractiveComponent
} from '../interactive-generator'
import type {
  TopicType,
  DifficultyLevel,
  CourseModule,
  ModuleContentType,
  InteractiveComponentType,
  DragDropDifficulty,
  RewardVisual
} from '../types'

// ═══════════════════════════════════════════════════════════════
// 🎯 GENERATORS
// ═══════════════════════════════════════════════════════════════

const topicTypeArb = fc.constantFrom<TopicType>(
  'programming',
  'scientific',
  'creative',
  'practical',
  'business',
  'humanities',
  'technical'
)

const difficultyArb = fc.constantFrom<DifficultyLevel>(
  'beginner',
  'intermediate',
  'advanced',
  'expert'
)

const contentTypeArb = fc.constantFrom<ModuleContentType>(
  'theory',
  'hands_on',
  'problem_solving',
  'project',
  'review'
)

/**
 * Generator for CourseModule
 */
const courseModuleArb = fc.record({
  id: fc.uuid(),
  order: fc.integer({ min: 1, max: 20 }),
  name: fc.string({ minLength: 3, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  theoryPrompt: fc.string({ minLength: 10, maxLength: 1000 }),
  practicePrompt: fc.string({ minLength: 10, maxLength: 1000 }),
  keyTerms: fc.array(fc.string({ minLength: 2, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
  duration: fc.integer({ min: 5, max: 120 }),
  difficulty: difficultyArb,
  contentType: contentTypeArb
}) as fc.Arbitrary<CourseModule>

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER CONSTANTS
// ═══════════════════════════════════════════════════════════════

const VALID_INTERACTIVE_TYPES: InteractiveComponentType[] = [
  'drag_and_drop',
  'code_sandbox',
  'quiz_with_feedback',
  'simulation',
  'progress_checklist'
]

const VALID_DRAGDROP_DIFFICULTIES: DragDropDifficulty[] = [
  'matching',
  'ordering',
  'fill_blank'
]

const VALID_REWARD_VISUALS: RewardVisual[] = [
  'confetti',
  'badge',
  'progress_bar'
]

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS
// ═══════════════════════════════════════════════════════════════

describe('Interactive Component Generation', () => {
  /**
   * Property 3.1: type is always valid
   * 
   * For any generated InteractiveComponent, type should be one of:
   * drag_and_drop, code_sandbox, quiz_with_feedback, simulation, progress_checklist
   */
  it('should generate valid interactive type for all inputs', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const config = generateInteractiveComponent(module, topicType)
        
        expect(VALID_INTERACTIVE_TYPES).toContain(config.type)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.2: drag_and_drop has valid difficulty
   * 
   * IF type is drag_and_drop, THEN difficulty should be one of:
   * matching, ordering, fill_blank
   */
  it('should have valid difficulty when type is drag_and_drop', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const config = generateInteractiveComponent(module, topicType)
        
        if (config.type === 'drag_and_drop') {
          expect(config.difficulty).toBeDefined()
          expect(VALID_DRAGDROP_DIFFICULTIES).toContain(config.difficulty)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.3: rewardVisual is always valid
   * 
   * For any generated InteractiveComponent, rewardVisual should be one of:
   * confetti, badge, progress_bar
   */
  it('should generate valid rewardVisual for all inputs', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const config = generateInteractiveComponent(module, topicType)
        
        expect(VALID_REWARD_VISUALS).toContain(config.rewardVisual)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.4: hintsAvailable is between 0 and 3
   * 
   * For any generated InteractiveComponent, hintsAvailable should be
   * an integer between 0 and 3 inclusive
   */
  it('should generate hintsAvailable between 0 and 3 for all inputs', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const config = generateInteractiveComponent(module, topicType)
        
        expect(Number.isInteger(config.hintsAvailable)).toBe(true)
        expect(config.hintsAvailable).toBeGreaterThanOrEqual(0)
        expect(config.hintsAvailable).toBeLessThanOrEqual(3)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.5: data is always an object
   * 
   * For any generated InteractiveComponent, data should be a non-null object
   */
  it('should generate data as object for all inputs', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const config = generateInteractiveComponent(module, topicType)
        
        expect(config.data).toBeDefined()
        expect(typeof config.data).toBe('object')
        expect(config.data).not.toBeNull()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 3.6: Generated config passes validation
   * 
   * For any valid inputs, validateInteractiveComponent should return true
   */
  it('should generate valid config that passes validation', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const config = generateInteractiveComponent(module, topicType)
        
        expect(validateInteractiveComponent(config)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 BATCH GENERATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Batch Interactive Component Generation', () => {
  /**
   * Property: generateAllInteractiveComponents returns correct count
   */
  it('should generate configs for all modules', () => {
    fc.assert(
      fc.property(
        fc.array(courseModuleArb, { minLength: 1, maxLength: 10 }),
        topicTypeArb,
        (modules, topicType) => {
          const configs = generateAllInteractiveComponents(modules, topicType)
          
          expect(configs.length).toBe(modules.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: All generated configs in batch are valid
   */
  it('should generate all valid configs in batch', () => {
    fc.assert(
      fc.property(
        fc.array(courseModuleArb, { minLength: 1, maxLength: 10 }),
        topicTypeArb,
        (modules, topicType) => {
          const configs = generateAllInteractiveComponents(modules, topicType)
          
          configs.forEach(config => {
            expect(validateInteractiveComponent(config)).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 UNIT TESTS (Edge Cases)
// ═══════════════════════════════════════════════════════════════

describe('Interactive Component Edge Cases', () => {
  const createTestModule = (overrides: Partial<CourseModule> = {}): CourseModule => ({
    id: 'test-module-1',
    order: 1,
    name: 'Test Module',
    description: 'A test module for unit testing. This is a longer description.',
    theoryPrompt: 'Generate theory about testing',
    practicePrompt: 'Generate practice tasks',
    keyTerms: ['testing', 'unit', 'module', 'validation', 'assertion'],
    duration: 30,
    difficulty: 'beginner',
    contentType: 'theory',
    ...overrides
  })

  describe('Type selection by content type', () => {
    it('generates quiz_with_feedback for theory content', () => {
      const module = createTestModule({ contentType: 'theory' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.type).toBe('quiz_with_feedback')
    })

    it('generates code_sandbox for hands_on content', () => {
      const module = createTestModule({ contentType: 'hands_on' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.type).toBe('code_sandbox')
    })

    it('generates drag_and_drop for problem_solving content', () => {
      const module = createTestModule({ contentType: 'problem_solving' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.type).toBe('drag_and_drop')
    })

    it('generates progress_checklist for project content', () => {
      const module = createTestModule({ contentType: 'project' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.type).toBe('progress_checklist')
    })

    it('generates quiz_with_feedback for review content', () => {
      const module = createTestModule({ contentType: 'review' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.type).toBe('quiz_with_feedback')
    })
  })

  describe('Difficulty affects drag_and_drop', () => {
    it('uses matching for beginner difficulty', () => {
      const module = createTestModule({ 
        contentType: 'problem_solving',
        difficulty: 'beginner'
      })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.type).toBe('drag_and_drop')
      expect(config.difficulty).toBe('matching')
    })

    it('uses ordering for intermediate difficulty', () => {
      const module = createTestModule({ 
        contentType: 'problem_solving',
        difficulty: 'intermediate'
      })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.type).toBe('drag_and_drop')
      expect(config.difficulty).toBe('ordering')
    })

    it('uses fill_blank for advanced difficulty', () => {
      const module = createTestModule({ 
        contentType: 'problem_solving',
        difficulty: 'advanced'
      })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.type).toBe('drag_and_drop')
      expect(config.difficulty).toBe('fill_blank')
    })
  })

  describe('Hints by difficulty', () => {
    it('provides 3 hints for beginner', () => {
      const module = createTestModule({ difficulty: 'beginner' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.hintsAvailable).toBe(3)
    })

    it('provides 2 hints for intermediate', () => {
      const module = createTestModule({ difficulty: 'intermediate' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.hintsAvailable).toBe(2)
    })

    it('provides 1 hint for advanced', () => {
      const module = createTestModule({ difficulty: 'advanced' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.hintsAvailable).toBe(1)
    })

    it('provides 0 hints for expert', () => {
      const module = createTestModule({ difficulty: 'expert' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.hintsAvailable).toBe(0)
    })
  })

  describe('Reward visuals', () => {
    it('uses confetti for drag_and_drop', () => {
      const module = createTestModule({ contentType: 'problem_solving' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.type).toBe('drag_and_drop')
      expect(config.rewardVisual).toBe('confetti')
    })

    it('uses badge for code_sandbox', () => {
      const module = createTestModule({ contentType: 'hands_on' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.type).toBe('code_sandbox')
      expect(config.rewardVisual).toBe('badge')
    })

    it('uses progress_bar for quiz_with_feedback', () => {
      const module = createTestModule({ contentType: 'theory' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.type).toBe('quiz_with_feedback')
      expect(config.rewardVisual).toBe('progress_bar')
    })
  })

  describe('Data structure by type', () => {
    it('generates pairs for matching drag_and_drop', () => {
      const module = createTestModule({ 
        contentType: 'problem_solving',
        difficulty: 'beginner'
      })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.data).toHaveProperty('pairs')
      expect(config.data).toHaveProperty('instruction')
    })

    it('generates items for ordering drag_and_drop', () => {
      const module = createTestModule({ 
        contentType: 'problem_solving',
        difficulty: 'intermediate'
      })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.data).toHaveProperty('items')
      expect(config.data).toHaveProperty('instruction')
    })

    it('generates questions for quiz_with_feedback', () => {
      const module = createTestModule({ contentType: 'theory' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.data).toHaveProperty('questions')
      expect(config.data).toHaveProperty('passingScore')
    })

    it('generates starterCode for code_sandbox', () => {
      const module = createTestModule({ contentType: 'hands_on' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.data).toHaveProperty('language')
      expect(config.data).toHaveProperty('starterCode')
      expect(config.data).toHaveProperty('testCases')
    })

    it('generates items for progress_checklist', () => {
      const module = createTestModule({ contentType: 'project' })
      const config = generateInteractiveComponent(module, 'programming')
      
      expect(config.data).toHaveProperty('title')
      expect(config.data).toHaveProperty('items')
      expect(config.data).toHaveProperty('showProgress')
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('validateInteractiveComponent', () => {
  it('returns true for valid config', () => {
    const validConfig = {
      type: 'quiz_with_feedback' as InteractiveComponentType,
      rewardVisual: 'progress_bar' as RewardVisual,
      hintsAvailable: 2,
      data: { questions: [] }
    }
    
    expect(validateInteractiveComponent(validConfig)).toBe(true)
  })

  it('returns false for invalid type', () => {
    const invalidConfig = {
      type: 'invalid_type' as InteractiveComponentType,
      rewardVisual: 'progress_bar' as RewardVisual,
      hintsAvailable: 2,
      data: {}
    }
    
    expect(validateInteractiveComponent(invalidConfig)).toBe(false)
  })

  it('returns false for drag_and_drop without difficulty', () => {
    const invalidConfig = {
      type: 'drag_and_drop' as InteractiveComponentType,
      rewardVisual: 'confetti' as RewardVisual,
      hintsAvailable: 2,
      data: {}
    }
    
    expect(validateInteractiveComponent(invalidConfig)).toBe(false)
  })

  it('returns true for drag_and_drop with valid difficulty', () => {
    const validConfig = {
      type: 'drag_and_drop' as InteractiveComponentType,
      difficulty: 'matching' as DragDropDifficulty,
      rewardVisual: 'confetti' as RewardVisual,
      hintsAvailable: 2,
      data: {}
    }
    
    expect(validateInteractiveComponent(validConfig)).toBe(true)
  })

  it('returns false for invalid rewardVisual', () => {
    const invalidConfig = {
      type: 'quiz_with_feedback' as InteractiveComponentType,
      rewardVisual: 'invalid_reward' as RewardVisual,
      hintsAvailable: 2,
      data: {}
    }
    
    expect(validateInteractiveComponent(invalidConfig)).toBe(false)
  })

  it('returns false for hintsAvailable > 3', () => {
    const invalidConfig = {
      type: 'quiz_with_feedback' as InteractiveComponentType,
      rewardVisual: 'progress_bar' as RewardVisual,
      hintsAvailable: 5,
      data: {}
    }
    
    expect(validateInteractiveComponent(invalidConfig)).toBe(false)
  })

  it('returns false for hintsAvailable < 0', () => {
    const invalidConfig = {
      type: 'quiz_with_feedback' as InteractiveComponentType,
      rewardVisual: 'progress_bar' as RewardVisual,
      hintsAvailable: -1,
      data: {}
    }
    
    expect(validateInteractiveComponent(invalidConfig)).toBe(false)
  })

  it('returns false for missing data', () => {
    const invalidConfig = {
      type: 'quiz_with_feedback' as InteractiveComponentType,
      rewardVisual: 'progress_bar' as RewardVisual,
      hintsAvailable: 2,
      data: null as unknown as Record<string, unknown>
    }
    
    expect(validateInteractiveComponent(invalidConfig)).toBe(false)
  })
})
