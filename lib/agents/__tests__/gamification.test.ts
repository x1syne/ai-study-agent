/**
 * 🧪 GAMIFICATION PROPERTY TESTS
 * 
 * Feature: visual-interactive-courses
 * Property 7: Gamification Spec Validity
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  generateCheckpoints,
  generateProgressVisualization,
  generateLevelBadges,
  generateGamificationSpec,
  validateGamificationSpec,
  assignLevelsToModules,
  calculateCurrentLevel,
  isCheckpointReached,
  generateLevelUpMessage
} from '../gamification-generator'
import type {
  DifficultyLevel,
  CourseModule,
  ModuleContentType,
  ProgressVisualizationType
} from '../types'

// ═══════════════════════════════════════════════════════════════
// 🎯 GENERATORS
// ═══════════════════════════════════════════════════════════════

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

const moduleCountArb = fc.integer({ min: 1, max: 20 })
const completedModulesArb = fc.integer({ min: 0, max: 20 })

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER CONSTANTS
// ═══════════════════════════════════════════════════════════════

const VALID_PROGRESS_TYPES: ProgressVisualizationType[] = [
  'progress_bar',
  'pie_chart',
  'experience_points'
]

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - Checkpoints
// ═══════════════════════════════════════════════════════════════

describe('Checkpoints Generation', () => {
  /**
   * Property 7.1a: checkpoints is an array
   */
  it('should generate checkpoints as array for all inputs', () => {
    fc.assert(
      fc.property(
        fc.array(courseModuleArb, { minLength: 1, maxLength: 10 }),
        (modules) => {
          const checkpoints = generateCheckpoints(modules)
          
          expect(Array.isArray(checkpoints)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.1b: checkpoints count matches modules count
   */
  it('should generate one checkpoint per module', () => {
    fc.assert(
      fc.property(
        fc.array(courseModuleArb, { minLength: 1, maxLength: 10 }),
        (modules) => {
          const checkpoints = generateCheckpoints(modules)
          
          expect(checkpoints.length).toBe(modules.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.1c: each checkpoint has non-empty title
   */
  it('should generate checkpoints with non-empty title', () => {
    fc.assert(
      fc.property(
        fc.array(courseModuleArb, { minLength: 1, maxLength: 10 }),
        (modules) => {
          const checkpoints = generateCheckpoints(modules)
          
          checkpoints.forEach(checkpoint => {
            expect(typeof checkpoint.title).toBe('string')
            expect(checkpoint.title.length).toBeGreaterThan(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.1d: each checkpoint has non-empty emoji
   */
  it('should generate checkpoints with non-empty emoji', () => {
    fc.assert(
      fc.property(
        fc.array(courseModuleArb, { minLength: 1, maxLength: 10 }),
        (modules) => {
          const checkpoints = generateCheckpoints(modules)
          
          checkpoints.forEach(checkpoint => {
            expect(typeof checkpoint.emoji).toBe('string')
            expect(checkpoint.emoji.length).toBeGreaterThan(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.1e: each checkpoint has non-empty rewardText
   */
  it('should generate checkpoints with non-empty rewardText', () => {
    fc.assert(
      fc.property(
        fc.array(courseModuleArb, { minLength: 1, maxLength: 10 }),
        (modules) => {
          const checkpoints = generateCheckpoints(modules)
          
          checkpoints.forEach(checkpoint => {
            expect(typeof checkpoint.rewardText).toBe('string')
            expect(checkpoint.rewardText.length).toBeGreaterThan(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - Progress Visualization
// ═══════════════════════════════════════════════════════════════

describe('Progress Visualization Generation', () => {
  /**
   * Property 7.3a: type is valid
   */
  it('should generate valid progress type for all inputs', () => {
    fc.assert(
      fc.property(moduleCountArb, completedModulesArb, (total, completed) => {
        const safeCompleted = Math.min(completed, total)
        const progress = generateProgressVisualization(total, safeCompleted)
        
        expect(VALID_PROGRESS_TYPES).toContain(progress.type)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.3b: maxValue is positive
   */
  it('should generate positive maxValue', () => {
    fc.assert(
      fc.property(moduleCountArb, (total) => {
        const progress = generateProgressVisualization(total)
        
        expect(progress.maxValue).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.3c: currentValue >= 0
   */
  it('should generate non-negative currentValue', () => {
    fc.assert(
      fc.property(moduleCountArb, completedModulesArb, (total, completed) => {
        const safeCompleted = Math.min(completed, total)
        const progress = generateProgressVisualization(total, safeCompleted)
        
        expect(progress.currentValue).toBeGreaterThanOrEqual(0)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.3d: currentValue <= maxValue
   */
  it('should generate currentValue <= maxValue', () => {
    fc.assert(
      fc.property(moduleCountArb, completedModulesArb, (total, completed) => {
        const safeCompleted = Math.min(completed, total)
        const progress = generateProgressVisualization(total, safeCompleted)
        
        expect(progress.currentValue).toBeLessThanOrEqual(progress.maxValue)
      }),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - Level Badges
// ═══════════════════════════════════════════════════════════════

describe('Level Badges Generation', () => {
  /**
   * Property 7.2a: levelBadges is an array
   */
  it('should generate levelBadges as array for all inputs', () => {
    fc.assert(
      fc.property(moduleCountArb, (moduleCount) => {
        const badges = generateLevelBadges(moduleCount)
        
        expect(Array.isArray(badges)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.2b: each badge has positive integer level
   */
  it('should generate badges with positive integer level', () => {
    fc.assert(
      fc.property(moduleCountArb, (moduleCount) => {
        const badges = generateLevelBadges(moduleCount)
        
        badges.forEach(badge => {
          expect(Number.isInteger(badge.level)).toBe(true)
          expect(badge.level).toBeGreaterThan(0)
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.2c: each badge has non-empty emoji
   */
  it('should generate badges with non-empty emoji', () => {
    fc.assert(
      fc.property(moduleCountArb, (moduleCount) => {
        const badges = generateLevelBadges(moduleCount)
        
        badges.forEach(badge => {
          expect(typeof badge.emoji).toBe('string')
          expect(badge.emoji.length).toBeGreaterThan(0)
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.2d: each badge has non-empty title
   */
  it('should generate badges with non-empty title', () => {
    fc.assert(
      fc.property(moduleCountArb, (moduleCount) => {
        const badges = generateLevelBadges(moduleCount)
        
        badges.forEach(badge => {
          expect(typeof badge.title).toBe('string')
          expect(badge.title.length).toBeGreaterThan(0)
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.2e: levels are sequential starting from 1
   */
  it('should generate sequential levels starting from 1', () => {
    fc.assert(
      fc.property(moduleCountArb, (moduleCount) => {
        const badges = generateLevelBadges(moduleCount)
        
        badges.forEach((badge, index) => {
          expect(badge.level).toBe(index + 1)
        })
      }),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - Full GamificationSpec
// ═══════════════════════════════════════════════════════════════

describe('Full Gamification Spec Generation', () => {
  /**
   * Property 7.6a: Generated spec has all required fields
   */
  it('should generate spec with all required fields', () => {
    fc.assert(
      fc.property(
        fc.array(courseModuleArb, { minLength: 1, maxLength: 10 }),
        completedModulesArb,
        (modules, completed) => {
          const safeCompleted = Math.min(completed, modules.length)
          const spec = generateGamificationSpec(modules, safeCompleted)
          
          expect(spec).toHaveProperty('checkpoints')
          expect(spec).toHaveProperty('progressVisualization')
          expect(spec).toHaveProperty('levelBadges')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 7.6b: Generated spec passes validation
   */
  it('should generate valid spec that passes validation', () => {
    fc.assert(
      fc.property(
        fc.array(courseModuleArb, { minLength: 1, maxLength: 10 }),
        completedModulesArb,
        (modules, completed) => {
          const safeCompleted = Math.min(completed, modules.length)
          const spec = generateGamificationSpec(modules, safeCompleted)
          
          expect(validateGamificationSpec(spec)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 UNIT TESTS (Edge Cases)
// ═══════════════════════════════════════════════════════════════

describe('Gamification Edge Cases', () => {
  const createTestModule = (overrides: Partial<CourseModule> = {}): CourseModule => ({
    id: 'test-module-1',
    order: 1,
    name: 'Test Module',
    description: 'A test module for unit testing',
    theoryPrompt: 'Generate theory about testing',
    practicePrompt: 'Generate practice tasks',
    keyTerms: ['testing', 'unit', 'module'],
    duration: 30,
    difficulty: 'beginner',
    contentType: 'theory',
    ...overrides
  })

  describe('generateCheckpoints', () => {
    it('uses correct emoji for theory content', () => {
      const module = createTestModule({ contentType: 'theory' })
      const checkpoints = generateCheckpoints([module])
      
      expect(checkpoints[0].emoji).toBe('📚')
    })

    it('uses correct emoji for hands_on content', () => {
      const module = createTestModule({ contentType: 'hands_on' })
      const checkpoints = generateCheckpoints([module])
      
      expect(checkpoints[0].emoji).toBe('🛠️')
    })

    it('uses correct emoji for problem_solving content', () => {
      const module = createTestModule({ contentType: 'problem_solving' })
      const checkpoints = generateCheckpoints([module])
      
      expect(checkpoints[0].emoji).toBe('🧩')
    })

    it('uses correct emoji for project content', () => {
      const module = createTestModule({ contentType: 'project' })
      const checkpoints = generateCheckpoints([module])
      
      expect(checkpoints[0].emoji).toBe('🚀')
    })

    it('uses correct emoji for review content', () => {
      const module = createTestModule({ contentType: 'review' })
      const checkpoints = generateCheckpoints([module])
      
      expect(checkpoints[0].emoji).toBe('✅')
    })

    it('includes module name in title', () => {
      const module = createTestModule({ name: 'My Custom Module' })
      const checkpoints = generateCheckpoints([module])
      
      expect(checkpoints[0].title).toContain('My Custom Module')
    })
  })

  describe('generateProgressVisualization', () => {
    it('uses progress_bar for small courses (1-3 modules)', () => {
      expect(generateProgressVisualization(1).type).toBe('progress_bar')
      expect(generateProgressVisualization(2).type).toBe('progress_bar')
      expect(generateProgressVisualization(3).type).toBe('progress_bar')
    })

    it('uses pie_chart for medium courses (4-6 modules)', () => {
      expect(generateProgressVisualization(4).type).toBe('pie_chart')
      expect(generateProgressVisualization(5).type).toBe('pie_chart')
      expect(generateProgressVisualization(6).type).toBe('pie_chart')
    })

    it('uses experience_points for large courses (7+ modules)', () => {
      expect(generateProgressVisualization(7).type).toBe('experience_points')
      expect(generateProgressVisualization(10).type).toBe('experience_points')
    })

    it('calculates maxValue as modules * 100', () => {
      expect(generateProgressVisualization(5).maxValue).toBe(500)
      expect(generateProgressVisualization(10).maxValue).toBe(1000)
    })

    it('calculates currentValue based on completed modules', () => {
      expect(generateProgressVisualization(5, 2).currentValue).toBe(200)
      expect(generateProgressVisualization(5, 5).currentValue).toBe(500)
    })

    it('caps currentValue at maxValue', () => {
      const progress = generateProgressVisualization(5, 10)
      expect(progress.currentValue).toBeLessThanOrEqual(progress.maxValue)
    })
  })

  describe('generateLevelBadges', () => {
    it('generates minimum 2 levels', () => {
      const badges = generateLevelBadges(1)
      expect(badges.length).toBeGreaterThanOrEqual(2)
    })

    it('generates maximum 10 levels', () => {
      const badges = generateLevelBadges(100)
      expect(badges.length).toBeLessThanOrEqual(10)
    })

    it('uses correct emojis for levels', () => {
      const badges = generateLevelBadges(10)
      expect(badges[0].emoji).toBe('🌱')
      expect(badges[1].emoji).toBe('🌿')
      expect(badges[2].emoji).toBe('🌳')
    })

    it('uses correct titles for levels', () => {
      const badges = generateLevelBadges(10)
      expect(badges[0].title).toBe('Новичок')
      expect(badges[1].title).toBe('Ученик')
      expect(badges[2].title).toBe('Практик')
    })
  })

  describe('assignLevelsToModules', () => {
    it('assigns levels to all modules', () => {
      const modules = [
        createTestModule({ id: 'mod-1' }),
        createTestModule({ id: 'mod-2' }),
        createTestModule({ id: 'mod-3' })
      ]
      const levelMap = assignLevelsToModules(modules)
      
      expect(levelMap.size).toBe(3)
      expect(levelMap.has('mod-1')).toBe(true)
      expect(levelMap.has('mod-2')).toBe(true)
      expect(levelMap.has('mod-3')).toBe(true)
    })

    it('assigns increasing levels', () => {
      const modules = Array.from({ length: 6 }, (_, i) => 
        createTestModule({ id: `mod-${i}` })
      )
      const levelMap = assignLevelsToModules(modules)
      
      // First modules should have lower levels
      expect(levelMap.get('mod-0')).toBeLessThanOrEqual(levelMap.get('mod-5')!)
    })
  })

  describe('calculateCurrentLevel', () => {
    it('returns 1 for no completed modules', () => {
      expect(calculateCurrentLevel(0, 10)).toBe(1)
    })

    it('returns max level for all completed modules', () => {
      const totalModules = 10
      const levelCount = Math.min(Math.max(Math.ceil(totalModules / 2), 2), 10)
      expect(calculateCurrentLevel(10, 10)).toBe(levelCount)
    })

    it('returns intermediate level for partial completion', () => {
      const level = calculateCurrentLevel(5, 10)
      expect(level).toBeGreaterThan(1)
      expect(level).toBeLessThanOrEqual(5)
    })
  })

  describe('isCheckpointReached', () => {
    it('returns false when module not completed', () => {
      expect(isCheckpointReached(0, 0)).toBe(false)
      expect(isCheckpointReached(5, 3)).toBe(false)
    })

    it('returns true when module completed', () => {
      expect(isCheckpointReached(0, 1)).toBe(true)
      expect(isCheckpointReached(2, 5)).toBe(true)
    })
  })

  describe('generateLevelUpMessage', () => {
    it('includes level title', () => {
      const message = generateLevelUpMessage(1)
      expect(message).toContain('Новичок')
    })

    it('includes emoji', () => {
      const message = generateLevelUpMessage(1)
      expect(message).toContain('🌱')
    })

    it('includes congratulation', () => {
      const message = generateLevelUpMessage(1)
      expect(message).toContain('Поздравляем')
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('validateGamificationSpec', () => {
  it('returns true for valid spec', () => {
    const validSpec = {
      checkpoints: [{
        title: 'Module 1',
        emoji: '📚',
        rewardText: 'Great job!'
      }],
      progressVisualization: {
        type: 'progress_bar' as ProgressVisualizationType,
        maxValue: 100,
        currentValue: 50
      },
      levelBadges: [{
        level: 1,
        emoji: '🌱',
        title: 'Beginner'
      }]
    }
    
    expect(validateGamificationSpec(validSpec)).toBe(true)
  })

  it('returns false for empty checkpoint title', () => {
    const invalidSpec = {
      checkpoints: [{
        title: '',
        emoji: '📚',
        rewardText: 'Great job!'
      }],
      progressVisualization: {
        type: 'progress_bar' as ProgressVisualizationType,
        maxValue: 100,
        currentValue: 50
      },
      levelBadges: []
    }
    
    expect(validateGamificationSpec(invalidSpec)).toBe(false)
  })

  it('returns false for invalid progress type', () => {
    const invalidSpec = {
      checkpoints: [],
      progressVisualization: {
        type: 'invalid' as ProgressVisualizationType,
        maxValue: 100,
        currentValue: 50
      },
      levelBadges: []
    }
    
    expect(validateGamificationSpec(invalidSpec)).toBe(false)
  })

  it('returns false for negative maxValue', () => {
    const invalidSpec = {
      checkpoints: [],
      progressVisualization: {
        type: 'progress_bar' as ProgressVisualizationType,
        maxValue: -100,
        currentValue: 50
      },
      levelBadges: []
    }
    
    expect(validateGamificationSpec(invalidSpec)).toBe(false)
  })

  it('returns false for currentValue > maxValue', () => {
    const invalidSpec = {
      checkpoints: [],
      progressVisualization: {
        type: 'progress_bar' as ProgressVisualizationType,
        maxValue: 100,
        currentValue: 150
      },
      levelBadges: []
    }
    
    expect(validateGamificationSpec(invalidSpec)).toBe(false)
  })

  it('returns false for non-integer badge level', () => {
    const invalidSpec = {
      checkpoints: [],
      progressVisualization: {
        type: 'progress_bar' as ProgressVisualizationType,
        maxValue: 100,
        currentValue: 50
      },
      levelBadges: [{
        level: 1.5,
        emoji: '🌱',
        title: 'Beginner'
      }]
    }
    
    expect(validateGamificationSpec(invalidSpec)).toBe(false)
  })

  it('returns false for zero badge level', () => {
    const invalidSpec = {
      checkpoints: [],
      progressVisualization: {
        type: 'progress_bar' as ProgressVisualizationType,
        maxValue: 100,
        currentValue: 50
      },
      levelBadges: [{
        level: 0,
        emoji: '🌱',
        title: 'Beginner'
      }]
    }
    
    expect(validateGamificationSpec(invalidSpec)).toBe(false)
  })
})
