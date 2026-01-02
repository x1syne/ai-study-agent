/**
 * 🧪 VISUAL IDENTITY PROPERTY TESTS
 * 
 * Feature: visual-interactive-courses
 * Property 1: Visual Identity Generation Correctness
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  generateVisualIdentity,
  validateVisualIdentity,
  isValidHexColor,
  isValidGradient,
  TOPIC_TO_COLOR_SCHEME,
  DIFFICULTY_TO_VISUAL_THEME,
  DEFAULT_FONT_PAIRING,
  DEFAULT_ICON_FAMILY
} from '../visual-identity'
import type { TopicType, DifficultyLevel, ColorScheme, VisualTheme } from '../types'

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

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS
// ═══════════════════════════════════════════════════════════════

describe('Visual Identity Generation', () => {
  /**
   * Property 1.1: ColorScheme matches TopicType mapping
   * 
   * For any TopicType, the generated colorScheme should match
   * the predefined mapping:
   * - programming/technical → blue-gradient
   * - scientific → green-gradient
   * - creative/humanities → purple-gradient
   * - business/practical → orange-gradient
   */
  it('should map TopicType to correct ColorScheme for all inputs', () => {
    fc.assert(
      fc.property(topicTypeArb, (topicType) => {
        const identity = generateVisualIdentity(topicType, 'beginner')
        const expectedScheme = TOPIC_TO_COLOR_SCHEME[topicType]
        
        expect(identity.colorScheme).toBe(expectedScheme)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.2: VisualTheme matches DifficultyLevel mapping
   * 
   * For any DifficultyLevel, the generated visualTheme should match:
   * - beginner → minimalist-illustrations
   * - intermediate → data-driven-infographics
   * - advanced/expert → animated-diagrams
   */
  it('should map DifficultyLevel to correct VisualTheme for all inputs', () => {
    fc.assert(
      fc.property(difficultyArb, (difficulty) => {
        const identity = generateVisualIdentity('programming', difficulty)
        const expectedTheme = DIFFICULTY_TO_VISUAL_THEME[difficulty]
        
        expect(identity.visualTheme).toBe(expectedTheme)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.3: VisualIdentity contains all required fields
   * 
   * For any combination of TopicType and DifficultyLevel,
   * the generated VisualIdentity should have:
   * - primaryColor: valid hex color
   * - gradient: valid CSS gradient
   * - fontPairing: array of 2 non-empty strings
   * - iconFamily: non-empty string
   */
  it('should generate complete VisualIdentity with all required fields', () => {
    fc.assert(
      fc.property(topicTypeArb, difficultyArb, (topicType, difficulty) => {
        const identity = generateVisualIdentity(topicType, difficulty)
        
        // Check primaryColor is valid hex
        expect(isValidHexColor(identity.primaryColor)).toBe(true)
        
        // Check gradient is valid CSS gradient
        expect(isValidGradient(identity.gradient)).toBe(true)
        
        // Check fontPairing has 2 non-empty strings
        expect(identity.fontPairing).toHaveLength(2)
        expect(identity.fontPairing[0].length).toBeGreaterThan(0)
        expect(identity.fontPairing[1].length).toBeGreaterThan(0)
        
        // Check iconFamily is non-empty
        expect(identity.iconFamily.length).toBeGreaterThan(0)
        
        // Check colorScheme is valid
        expect(['blue-gradient', 'green-gradient', 'purple-gradient', 'orange-gradient'])
          .toContain(identity.colorScheme)
        
        // Check visualTheme is valid
        expect(['minimalist-illustrations', 'data-driven-infographics', 'animated-diagrams'])
          .toContain(identity.visualTheme)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.4: Generated VisualIdentity passes validation
   * 
   * For any valid inputs, validateVisualIdentity should return true
   */
  it('should generate valid VisualIdentity that passes validation', () => {
    fc.assert(
      fc.property(topicTypeArb, difficultyArb, (topicType, difficulty) => {
        const identity = generateVisualIdentity(topicType, difficulty)
        
        expect(validateVisualIdentity(identity)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 1.5: Default fonts and icons are used
   * 
   * For any inputs, fontPairing should be Inter/JetBrains Mono
   * and iconFamily should be Lucide
   */
  it('should use default fonts (Inter, JetBrains Mono) and icons (Lucide)', () => {
    fc.assert(
      fc.property(topicTypeArb, difficultyArb, (topicType, difficulty) => {
        const identity = generateVisualIdentity(topicType, difficulty)
        
        expect(identity.fontPairing).toEqual(DEFAULT_FONT_PAIRING)
        expect(identity.iconFamily).toBe(DEFAULT_ICON_FAMILY)
      }),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 UNIT TESTS (Edge Cases)
// ═══════════════════════════════════════════════════════════════

describe('Visual Identity Edge Cases', () => {
  it('returns blue-gradient for programming topics', () => {
    const result = generateVisualIdentity('programming', 'beginner')
    expect(result.colorScheme).toBe('blue-gradient')
    expect(result.primaryColor).toBe('#4F46E5')
  })

  it('returns green-gradient for scientific topics', () => {
    const result = generateVisualIdentity('scientific', 'intermediate')
    expect(result.colorScheme).toBe('green-gradient')
    expect(result.primaryColor).toBe('#10B981')
  })

  it('returns purple-gradient for creative topics', () => {
    const result = generateVisualIdentity('creative', 'advanced')
    expect(result.colorScheme).toBe('purple-gradient')
    expect(result.primaryColor).toBe('#8B5CF6')
  })

  it('returns orange-gradient for business topics', () => {
    const result = generateVisualIdentity('business', 'expert')
    expect(result.colorScheme).toBe('orange-gradient')
    expect(result.primaryColor).toBe('#F59E0B')
  })

  it('returns minimalist-illustrations for beginner difficulty', () => {
    const result = generateVisualIdentity('programming', 'beginner')
    expect(result.visualTheme).toBe('minimalist-illustrations')
  })

  it('returns data-driven-infographics for intermediate difficulty', () => {
    const result = generateVisualIdentity('programming', 'intermediate')
    expect(result.visualTheme).toBe('data-driven-infographics')
  })

  it('returns animated-diagrams for advanced difficulty', () => {
    const result = generateVisualIdentity('programming', 'advanced')
    expect(result.visualTheme).toBe('animated-diagrams')
  })

  it('returns animated-diagrams for expert difficulty', () => {
    const result = generateVisualIdentity('programming', 'expert')
    expect(result.visualTheme).toBe('animated-diagrams')
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Validation Functions', () => {
  describe('isValidHexColor', () => {
    it('accepts valid hex colors', () => {
      expect(isValidHexColor('#4F46E5')).toBe(true)
      expect(isValidHexColor('#000000')).toBe(true)
      expect(isValidHexColor('#FFFFFF')).toBe(true)
      expect(isValidHexColor('#abcdef')).toBe(true)
    })

    it('rejects invalid hex colors', () => {
      expect(isValidHexColor('4F46E5')).toBe(false)  // Missing #
      expect(isValidHexColor('#4F46E')).toBe(false)  // Too short
      expect(isValidHexColor('#4F46E5F')).toBe(false) // Too long
      expect(isValidHexColor('#GGGGGG')).toBe(false) // Invalid chars
      expect(isValidHexColor('rgb(0,0,0)')).toBe(false) // Wrong format
    })
  })

  describe('isValidGradient', () => {
    it('accepts valid CSS gradients', () => {
      expect(isValidGradient('linear-gradient(135deg, #667eea 0%, #764ba2 100%)')).toBe(true)
      expect(isValidGradient('linear-gradient(to right, red, blue)')).toBe(true)
    })

    it('rejects invalid gradients', () => {
      expect(isValidGradient('radial-gradient(circle, red, blue)')).toBe(false)
      expect(isValidGradient('#4F46E5')).toBe(false)
      expect(isValidGradient('linear-gradient(')).toBe(false)
    })
  })
})
