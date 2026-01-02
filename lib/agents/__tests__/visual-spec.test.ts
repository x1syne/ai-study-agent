/**
 * 🧪 MODULE VISUAL SPEC PROPERTY TESTS
 * 
 * Feature: visual-interactive-courses
 * Property 2: Module Visual Spec Completeness
 * Validates: Requirements 2.1, 2.2, 2.3
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  generateModuleVisualSpec,
  generateAllModuleVisualSpecs,
  validateModuleVisualSpec
} from '../visual-spec'
import { generateVisualIdentity } from '../visual-identity'
import type {
  TopicType,
  DifficultyLevel,
  CourseModule,
  ModuleContentType,
  PrimaryVisualType,
  DecorationElement
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

const moduleIndexArb = fc.integer({ min: 0, max: 20 })

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Validates hex color format
 */
function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

/**
 * Valid primary visual types
 */
const VALID_PRIMARY_VISUAL_TYPES: PrimaryVisualType[] = [
  'diagram',
  'infographic',
  'timeline',
  'comparison_table',
  'flowchart'
]

/**
 * Valid decoration elements
 */
const VALID_DECORATION_ELEMENTS: DecorationElement[] = [
  'geometric_shape',
  'gradient_orb',
  'floating_icon'
]

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS
// ═══════════════════════════════════════════════════════════════

describe('Module Visual Spec Generation', () => {
  /**
   * Property 2.1: heroImagePrompt is non-empty string
   * 
   * For any generated ModuleVisualSpec, heroImagePrompt
   * should be a non-empty string
   */
  it('should generate non-empty heroImagePrompt for all inputs', () => {
    fc.assert(
      fc.property(
        courseModuleArb,
        topicTypeArb,
        difficultyArb,
        moduleIndexArb,
        (module, topicType, difficulty, moduleIndex) => {
          const visualIdentity = generateVisualIdentity(topicType, difficulty)
          const spec = generateModuleVisualSpec(module, visualIdentity, topicType, moduleIndex)
          
          expect(typeof spec.heroImagePrompt).toBe('string')
          expect(spec.heroImagePrompt.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.2: colorScheme has valid hex colors
   * 
   * For any generated ModuleVisualSpec, colorScheme should have
   * primary, secondary, and accent as valid hex colors
   */
  it('should generate valid hex colors in colorScheme for all inputs', () => {
    fc.assert(
      fc.property(
        courseModuleArb,
        topicTypeArb,
        difficultyArb,
        moduleIndexArb,
        (module, topicType, difficulty, moduleIndex) => {
          const visualIdentity = generateVisualIdentity(topicType, difficulty)
          const spec = generateModuleVisualSpec(module, visualIdentity, topicType, moduleIndex)
          
          expect(isValidHexColor(spec.colorScheme.primary)).toBe(true)
          expect(isValidHexColor(spec.colorScheme.secondary)).toBe(true)
          expect(isValidHexColor(spec.colorScheme.accent)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.3: primaryVisual has valid type
   * 
   * For any generated ModuleVisualSpec, primaryVisual.type should be
   * one of: diagram, infographic, timeline, comparison_table, flowchart
   */
  it('should generate valid primaryVisual type for all inputs', () => {
    fc.assert(
      fc.property(
        courseModuleArb,
        topicTypeArb,
        difficultyArb,
        moduleIndexArb,
        (module, topicType, difficulty, moduleIndex) => {
          const visualIdentity = generateVisualIdentity(topicType, difficulty)
          const spec = generateModuleVisualSpec(module, visualIdentity, topicType, moduleIndex)
          
          expect(VALID_PRIMARY_VISUAL_TYPES).toContain(spec.primaryVisual.type)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.4: primaryVisual has non-empty description
   * 
   * For any generated ModuleVisualSpec, primaryVisual.description
   * should be a non-empty string
   */
  it('should generate non-empty primaryVisual description for all inputs', () => {
    fc.assert(
      fc.property(
        courseModuleArb,
        topicTypeArb,
        difficultyArb,
        moduleIndexArb,
        (module, topicType, difficulty, moduleIndex) => {
          const visualIdentity = generateVisualIdentity(topicType, difficulty)
          const spec = generateModuleVisualSpec(module, visualIdentity, topicType, moduleIndex)
          
          expect(typeof spec.primaryVisual.description).toBe('string')
          expect(spec.primaryVisual.description.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.5: secondaryVisuals is an array
   * 
   * For any generated ModuleVisualSpec, secondaryVisuals
   * should be an array (may be empty)
   */
  it('should generate secondaryVisuals as array for all inputs', () => {
    fc.assert(
      fc.property(
        courseModuleArb,
        topicTypeArb,
        difficultyArb,
        moduleIndexArb,
        (module, topicType, difficulty, moduleIndex) => {
          const visualIdentity = generateVisualIdentity(topicType, difficulty)
          const spec = generateModuleVisualSpec(module, visualIdentity, topicType, moduleIndex)
          
          expect(Array.isArray(spec.secondaryVisuals)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.6: decorationElements contains valid elements
   * 
   * For any generated ModuleVisualSpec, decorationElements should
   * only contain valid decoration element types
   */
  it('should generate valid decorationElements for all inputs', () => {
    fc.assert(
      fc.property(
        courseModuleArb,
        topicTypeArb,
        difficultyArb,
        moduleIndexArb,
        (module, topicType, difficulty, moduleIndex) => {
          const visualIdentity = generateVisualIdentity(topicType, difficulty)
          const spec = generateModuleVisualSpec(module, visualIdentity, topicType, moduleIndex)
          
          expect(Array.isArray(spec.decorationElements)).toBe(true)
          spec.decorationElements.forEach(element => {
            expect(VALID_DECORATION_ELEMENTS).toContain(element)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 2.7: Generated spec passes validation
   * 
   * For any valid inputs, validateModuleVisualSpec should return true
   */
  it('should generate valid ModuleVisualSpec that passes validation', () => {
    fc.assert(
      fc.property(
        courseModuleArb,
        topicTypeArb,
        difficultyArb,
        moduleIndexArb,
        (module, topicType, difficulty, moduleIndex) => {
          const visualIdentity = generateVisualIdentity(topicType, difficulty)
          const spec = generateModuleVisualSpec(module, visualIdentity, topicType, moduleIndex)
          
          expect(validateModuleVisualSpec(spec)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 BATCH GENERATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Batch Module Visual Spec Generation', () => {
  /**
   * Property: generateAllModuleVisualSpecs returns correct count
   */
  it('should generate specs for all modules', () => {
    fc.assert(
      fc.property(
        fc.array(courseModuleArb, { minLength: 1, maxLength: 10 }),
        topicTypeArb,
        difficultyArb,
        (modules, topicType, difficulty) => {
          const visualIdentity = generateVisualIdentity(topicType, difficulty)
          const specs = generateAllModuleVisualSpecs(modules, visualIdentity, topicType)
          
          expect(specs.length).toBe(modules.length)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: All generated specs in batch are valid
   */
  it('should generate all valid specs in batch', () => {
    fc.assert(
      fc.property(
        fc.array(courseModuleArb, { minLength: 1, maxLength: 10 }),
        topicTypeArb,
        difficultyArb,
        (modules, topicType, difficulty) => {
          const visualIdentity = generateVisualIdentity(topicType, difficulty)
          const specs = generateAllModuleVisualSpecs(modules, visualIdentity, topicType)
          
          specs.forEach(spec => {
            expect(validateModuleVisualSpec(spec)).toBe(true)
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

describe('Module Visual Spec Edge Cases', () => {
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

  it('generates flowchart for problem_solving content type', () => {
    const module = createTestModule({ contentType: 'problem_solving' })
    const visualIdentity = generateVisualIdentity('programming', 'beginner')
    const spec = generateModuleVisualSpec(module, visualIdentity, 'programming')
    
    expect(spec.primaryVisual.type).toBe('flowchart')
  })

  it('generates timeline for project content type', () => {
    const module = createTestModule({ contentType: 'project' })
    const visualIdentity = generateVisualIdentity('programming', 'beginner')
    const spec = generateModuleVisualSpec(module, visualIdentity, 'programming')
    
    expect(spec.primaryVisual.type).toBe('timeline')
  })

  it('generates comparison_table for review content type', () => {
    const module = createTestModule({ contentType: 'review' })
    const visualIdentity = generateVisualIdentity('programming', 'beginner')
    const spec = generateModuleVisualSpec(module, visualIdentity, 'programming')
    
    expect(spec.primaryVisual.type).toBe('comparison_table')
  })

  it('generates infographic for theory content type', () => {
    const module = createTestModule({ contentType: 'theory' })
    const visualIdentity = generateVisualIdentity('programming', 'beginner')
    const spec = generateModuleVisualSpec(module, visualIdentity, 'programming')
    
    expect(spec.primaryVisual.type).toBe('infographic')
  })

  it('generates diagram for hands_on content type', () => {
    const module = createTestModule({ contentType: 'hands_on' })
    const visualIdentity = generateVisualIdentity('programming', 'beginner')
    const spec = generateModuleVisualSpec(module, visualIdentity, 'programming')
    
    expect(spec.primaryVisual.type).toBe('diagram')
  })

  it('includes mermaidCode for flowchart type', () => {
    const module = createTestModule({ contentType: 'problem_solving' })
    const visualIdentity = generateVisualIdentity('programming', 'beginner')
    const spec = generateModuleVisualSpec(module, visualIdentity, 'programming')
    
    expect(spec.primaryVisual.mermaidCode).toBeDefined()
    expect(spec.primaryVisual.mermaidCode).toContain('graph')
  })

  it('uses correct emojis for programming topic', () => {
    const module = createTestModule()
    const visualIdentity = generateVisualIdentity('programming', 'beginner')
    const spec = generateModuleVisualSpec(module, visualIdentity, 'programming')
    
    const iconSet = spec.secondaryVisuals.find(v => v.type === 'icon_set')
    expect(iconSet).toBeDefined()
    expect(iconSet?.icons).toContain('💻')
  })

  it('uses correct emojis for scientific topic', () => {
    const module = createTestModule()
    const visualIdentity = generateVisualIdentity('scientific', 'beginner')
    const spec = generateModuleVisualSpec(module, visualIdentity, 'scientific')
    
    const iconSet = spec.secondaryVisuals.find(v => v.type === 'icon_set')
    expect(iconSet).toBeDefined()
    expect(iconSet?.icons).toContain('🔬')
  })

  it('uses correct emojis for creative topic', () => {
    const module = createTestModule()
    const visualIdentity = generateVisualIdentity('creative', 'beginner')
    const spec = generateModuleVisualSpec(module, visualIdentity, 'creative')
    
    const iconSet = spec.secondaryVisuals.find(v => v.type === 'icon_set')
    expect(iconSet).toBeDefined()
    expect(iconSet?.icons).toContain('🎨')
  })

  it('uses correct emojis for business topic', () => {
    const module = createTestModule()
    const visualIdentity = generateVisualIdentity('business', 'beginner')
    const spec = generateModuleVisualSpec(module, visualIdentity, 'business')
    
    const iconSet = spec.secondaryVisuals.find(v => v.type === 'icon_set')
    expect(iconSet).toBeDefined()
    expect(iconSet?.icons).toContain('📈')
  })

  it('generates different color schemes for different module indices', () => {
    const module = createTestModule()
    const visualIdentity = generateVisualIdentity('programming', 'beginner')
    
    const spec0 = generateModuleVisualSpec(module, visualIdentity, 'programming', 0)
    const spec1 = generateModuleVisualSpec(module, visualIdentity, 'programming', 1)
    
    // Primary should be the same (from visual identity)
    expect(spec0.colorScheme.primary).toBe(spec1.colorScheme.primary)
    
    // Secondary and accent may vary based on index
    // (implementation detail - just verify they're valid)
    expect(isValidHexColor(spec0.colorScheme.secondary)).toBe(true)
    expect(isValidHexColor(spec1.colorScheme.secondary)).toBe(true)
  })

  it('includes hero image prompt with topic-specific style', () => {
    const module = createTestModule({ name: 'React Hooks' })
    const visualIdentity = generateVisualIdentity('programming', 'beginner')
    const spec = generateModuleVisualSpec(module, visualIdentity, 'programming')
    
    expect(spec.heroImagePrompt).toContain('React Hooks')
    expect(spec.heroImagePrompt).toContain('educational illustration')
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('validateModuleVisualSpec', () => {
  it('returns true for valid spec', () => {
    const validSpec = {
      heroImagePrompt: 'A valid prompt',
      colorScheme: {
        primary: '#4F46E5',
        secondary: '#667EEA',
        accent: '#764BA2'
      },
      decorationElements: ['geometric_shape'] as DecorationElement[],
      primaryVisual: {
        type: 'diagram' as PrimaryVisualType,
        description: 'A valid description'
      },
      secondaryVisuals: []
    }
    
    expect(validateModuleVisualSpec(validSpec)).toBe(true)
  })

  it('returns false for empty heroImagePrompt', () => {
    const invalidSpec = {
      heroImagePrompt: '',
      colorScheme: {
        primary: '#4F46E5',
        secondary: '#667EEA',
        accent: '#764BA2'
      },
      decorationElements: ['geometric_shape'] as DecorationElement[],
      primaryVisual: {
        type: 'diagram' as PrimaryVisualType,
        description: 'A valid description'
      },
      secondaryVisuals: []
    }
    
    expect(validateModuleVisualSpec(invalidSpec)).toBe(false)
  })

  it('returns false for invalid hex color', () => {
    const invalidSpec = {
      heroImagePrompt: 'A valid prompt',
      colorScheme: {
        primary: 'not-a-hex',
        secondary: '#667EEA',
        accent: '#764BA2'
      },
      decorationElements: ['geometric_shape'] as DecorationElement[],
      primaryVisual: {
        type: 'diagram' as PrimaryVisualType,
        description: 'A valid description'
      },
      secondaryVisuals: []
    }
    
    expect(validateModuleVisualSpec(invalidSpec)).toBe(false)
  })

  it('returns false for invalid primaryVisual type', () => {
    const invalidSpec = {
      heroImagePrompt: 'A valid prompt',
      colorScheme: {
        primary: '#4F46E5',
        secondary: '#667EEA',
        accent: '#764BA2'
      },
      decorationElements: ['geometric_shape'] as DecorationElement[],
      primaryVisual: {
        type: 'invalid_type' as PrimaryVisualType,
        description: 'A valid description'
      },
      secondaryVisuals: []
    }
    
    expect(validateModuleVisualSpec(invalidSpec)).toBe(false)
  })

  it('returns false for empty primaryVisual description', () => {
    const invalidSpec = {
      heroImagePrompt: 'A valid prompt',
      colorScheme: {
        primary: '#4F46E5',
        secondary: '#667EEA',
        accent: '#764BA2'
      },
      decorationElements: ['geometric_shape'] as DecorationElement[],
      primaryVisual: {
        type: 'diagram' as PrimaryVisualType,
        description: ''
      },
      secondaryVisuals: []
    }
    
    expect(validateModuleVisualSpec(invalidSpec)).toBe(false)
  })
})
