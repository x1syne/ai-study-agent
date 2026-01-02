/**
 * 🧪 TEXT BLOCK PROPERTY TESTS
 * 
 * Feature: visual-interactive-courses
 * Property 4: Text Block Structure Correctness
 * Validates: Requirements 4.1, 4.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  splitIntoTextBlocks,
  generateTextBlocks,
  assignVisualToBlock,
  validateTextBlock,
  validateTextBlocks,
  countWords,
  determineVisualType,
  MAX_WORDS_PER_BLOCK
} from '../text-blocks'
import type {
  TopicType,
  VisualTheme,
  AccompanyingVisualType
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

const visualThemeArb = fc.constantFrom<VisualTheme>(
  'minimalist-illustrations',
  'data-driven-infographics',
  'animated-diagrams'
)

/**
 * Generator for markdown-like text with sentences
 */
const markdownTextArb = fc.array(
  fc.lorem({ mode: 'sentences', maxCount: 3 }),
  { minLength: 1, maxLength: 20 }
).map(sentences => sentences.join(' '))

/**
 * Generator for short text (under 150 words)
 */
const shortTextArb = fc.array(
  fc.lorem({ mode: 'words' }),
  { minLength: 1, maxLength: 100 }
).map(words => words.join(' '))

/**
 * Generator for long text (over 150 words)
 */
const longTextArb = fc.array(
  fc.lorem({ mode: 'words' }),
  { minLength: 200, maxLength: 500 }
).map(words => words.join(' '))

const blockIndexArb = fc.integer({ min: 0, max: 50 })

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER CONSTANTS
// ═══════════════════════════════════════════════════════════════

const VALID_VISUAL_TYPES: AccompanyingVisualType[] = [
  'icon',
  'illustration',
  'photo',
  'diagram'
]

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - splitIntoTextBlocks
// ═══════════════════════════════════════════════════════════════

describe('splitIntoTextBlocks', () => {
  /**
   * Property 4.1a: Each block has at most MAX_WORDS_PER_BLOCK words
   */
  it('should split text into blocks with at most 150 words each', () => {
    fc.assert(
      fc.property(markdownTextArb, (markdown) => {
        const blocks = splitIntoTextBlocks(markdown)
        
        blocks.forEach(block => {
          expect(countWords(block)).toBeLessThanOrEqual(MAX_WORDS_PER_BLOCK)
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.1b: No content is lost during splitting
   */
  it('should preserve all words when splitting', () => {
    fc.assert(
      fc.property(shortTextArb, (text) => {
        const blocks = splitIntoTextBlocks(text)
        const originalWords = countWords(text)
        const blockWords = blocks.reduce((sum, block) => sum + countWords(block), 0)
        
        expect(blockWords).toBe(originalWords)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.1c: Long text is properly split into multiple blocks
   */
  it('should create multiple blocks for long text', () => {
    fc.assert(
      fc.property(longTextArb, (text) => {
        const blocks = splitIntoTextBlocks(text)
        
        // Long text should result in multiple blocks
        expect(blocks.length).toBeGreaterThan(1)
        
        // Each block should respect the limit
        blocks.forEach(block => {
          expect(countWords(block)).toBeLessThanOrEqual(MAX_WORDS_PER_BLOCK)
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.1d: Empty text returns empty array
   */
  it('should return empty array for empty text', () => {
    const blocks = splitIntoTextBlocks('')
    expect(blocks).toEqual([])
  })

  /**
   * Property 4.1e: Custom maxWords is respected
   */
  it('should respect custom maxWords parameter', () => {
    fc.assert(
      fc.property(
        markdownTextArb,
        fc.integer({ min: 10, max: 100 }),
        (markdown, maxWords) => {
          const blocks = splitIntoTextBlocks(markdown, maxWords)
          
          blocks.forEach(block => {
            expect(countWords(block)).toBeLessThanOrEqual(maxWords)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - assignVisualToBlock
// ═══════════════════════════════════════════════════════════════

describe('assignVisualToBlock', () => {
  /**
   * Property 4.2a: Visual type is always valid
   */
  it('should assign valid visual type for all inputs', () => {
    fc.assert(
      fc.property(
        shortTextArb,
        topicTypeArb,
        visualThemeArb,
        blockIndexArb,
        (text, topicType, visualTheme, blockIndex) => {
          const visual = assignVisualToBlock(text, topicType, visualTheme, blockIndex)
          
          expect(VALID_VISUAL_TYPES).toContain(visual.type)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.2b: Description is always non-empty
   */
  it('should generate non-empty description for all inputs', () => {
    fc.assert(
      fc.property(
        shortTextArb,
        topicTypeArb,
        visualThemeArb,
        blockIndexArb,
        (text, topicType, visualTheme, blockIndex) => {
          const visual = assignVisualToBlock(text, topicType, visualTheme, blockIndex)
          
          expect(typeof visual.description).toBe('string')
          expect(visual.description.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.2c: Icon type includes iconName
   */
  it('should include iconName when type is icon', () => {
    fc.assert(
      fc.property(
        topicTypeArb,
        visualThemeArb,
        blockIndexArb,
        (topicType, visualTheme, blockIndex) => {
          // Use text that triggers icon type
          const text = 'Это определение важного термина.'
          const visual = assignVisualToBlock(text, topicType, visualTheme, blockIndex)
          
          if (visual.type === 'icon') {
            expect(visual.iconName).toBeDefined()
            expect(typeof visual.iconName).toBe('string')
            expect(visual.iconName!.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - generateTextBlocks
// ═══════════════════════════════════════════════════════════════

describe('generateTextBlocks', () => {
  /**
   * Property 4.3a: All generated blocks have valid structure
   */
  it('should generate valid TextBlock structure for all inputs', () => {
    fc.assert(
      fc.property(
        markdownTextArb,
        topicTypeArb,
        visualThemeArb,
        (markdown, topicType, visualTheme) => {
          const blocks = generateTextBlocks(markdown, topicType, visualTheme)
          
          blocks.forEach(block => {
            // Text exists and is within limit
            expect(typeof block.text).toBe('string')
            expect(countWords(block.text)).toBeLessThanOrEqual(MAX_WORDS_PER_BLOCK)
            
            // Accompanying visual exists and is valid
            expect(block.accompanyingVisual).toBeDefined()
            expect(VALID_VISUAL_TYPES).toContain(block.accompanyingVisual.type)
            expect(block.accompanyingVisual.description.length).toBeGreaterThan(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.3b: All generated blocks pass validation
   */
  it('should generate blocks that pass validation', () => {
    fc.assert(
      fc.property(
        markdownTextArb,
        topicTypeArb,
        visualThemeArb,
        (markdown, topicType, visualTheme) => {
          const blocks = generateTextBlocks(markdown, topicType, visualTheme)
          
          expect(validateTextBlocks(blocks)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 4.3c: Interactive elements have valid structure when present
   */
  it('should generate valid interactive elements when present', () => {
    fc.assert(
      fc.property(
        markdownTextArb,
        topicTypeArb,
        visualThemeArb,
        (markdown, topicType, visualTheme) => {
          const blocks = generateTextBlocks(markdown, topicType, visualTheme)
          
          blocks.forEach(block => {
            if (block.interactiveElement) {
              expect(['toggle_detail', 'flip_card', 'scratch_to_reveal'])
                .toContain(block.interactiveElement.type)
              expect(typeof block.interactiveElement.content).toBe('string')
              expect(block.interactiveElement.content.length).toBeGreaterThan(0)
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - determineVisualType
// ═══════════════════════════════════════════════════════════════

describe('determineVisualType', () => {
  /**
   * Property: Always returns valid visual type
   */
  it('should always return valid visual type', () => {
    fc.assert(
      fc.property(fc.string(), (text) => {
        const type = determineVisualType(text)
        expect(VALID_VISUAL_TYPES).toContain(type)
      }),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 UNIT TESTS (Edge Cases)
// ═══════════════════════════════════════════════════════════════

describe('Text Block Edge Cases', () => {
  describe('countWords', () => {
    it('returns 0 for empty string', () => {
      expect(countWords('')).toBe(0)
    })

    it('returns 0 for whitespace only', () => {
      expect(countWords('   \n\t  ')).toBe(0)
    })

    it('counts words correctly', () => {
      expect(countWords('one two three')).toBe(3)
      expect(countWords('  one   two   three  ')).toBe(3)
    })
  })

  describe('determineVisualType', () => {
    it('returns icon for definition text', () => {
      expect(determineVisualType('Это определение важного термина')).toBe('icon')
      expect(determineVisualType('Понятие означает следующее')).toBe('icon')
    })

    it('returns illustration for example text', () => {
      expect(determineVisualType('Например, рассмотрим следующий случай')).toBe('illustration')
      expect(determineVisualType('Представьте себе ситуацию')).toBe('illustration')
    })

    it('returns photo for practical text', () => {
      expect(determineVisualType('В реальной практике это применяется')).toBe('photo')
      expect(determineVisualType('Использование в жизни')).toBe('photo')
    })

    it('returns diagram for process text', () => {
      expect(determineVisualType('Процесс состоит из следующих этапов')).toBe('diagram')
      expect(determineVisualType('Алгоритм включает шаги')).toBe('diagram')
    })

    it('returns icon as default', () => {
      expect(determineVisualType('Просто какой-то текст')).toBe('icon')
    })
  })

  describe('splitIntoTextBlocks', () => {
    it('handles single sentence', () => {
      const blocks = splitIntoTextBlocks('This is a single sentence.')
      expect(blocks.length).toBe(1)
      expect(blocks[0]).toBe('This is a single sentence.')
    })

    it('handles multiple short sentences', () => {
      const text = 'First sentence. Second sentence. Third sentence.'
      const blocks = splitIntoTextBlocks(text)
      expect(blocks.length).toBe(1)
      expect(blocks[0]).toContain('First')
      expect(blocks[0]).toContain('Third')
    })

    it('splits very long text into multiple blocks', () => {
      const words = Array(300).fill('word').join(' ')
      const blocks = splitIntoTextBlocks(words)
      
      expect(blocks.length).toBeGreaterThan(1)
      blocks.forEach(block => {
        expect(countWords(block)).toBeLessThanOrEqual(MAX_WORDS_PER_BLOCK)
      })
    })
  })

  describe('generateTextBlocks', () => {
    it('generates blocks with correct topic icons', () => {
      const text = 'Это определение важного термина в программировании.'
      const blocks = generateTextBlocks(text, 'programming', 'minimalist-illustrations')
      
      expect(blocks.length).toBeGreaterThan(0)
      const iconBlock = blocks.find(b => b.accompanyingVisual.type === 'icon')
      if (iconBlock) {
        expect(['Code', 'Terminal', 'Braces', 'FileCode', 'GitBranch'])
          .toContain(iconBlock.accompanyingVisual.iconName)
      }
    })

    it('generates interactive elements for important text', () => {
      const text = 'Важно запомнить этот ключевой момент. Обратите внимание на детали.'
      const blocks = generateTextBlocks(text, 'programming', 'minimalist-illustrations')
      
      const hasInteractive = blocks.some(b => b.interactiveElement !== undefined)
      expect(hasInteractive).toBe(true)
    })
  })

  describe('validateTextBlock', () => {
    it('returns true for valid block', () => {
      const validBlock = {
        text: 'Short valid text',
        accompanyingVisual: {
          type: 'icon' as AccompanyingVisualType,
          description: 'A valid description'
        }
      }
      expect(validateTextBlock(validBlock)).toBe(true)
    })

    it('returns false for block exceeding word limit', () => {
      const invalidBlock = {
        text: Array(200).fill('word').join(' '),
        accompanyingVisual: {
          type: 'icon' as AccompanyingVisualType,
          description: 'A valid description'
        }
      }
      expect(validateTextBlock(invalidBlock)).toBe(false)
    })

    it('returns false for empty description', () => {
      const invalidBlock = {
        text: 'Valid text',
        accompanyingVisual: {
          type: 'icon' as AccompanyingVisualType,
          description: ''
        }
      }
      expect(validateTextBlock(invalidBlock)).toBe(false)
    })

    it('returns false for invalid visual type', () => {
      const invalidBlock = {
        text: 'Valid text',
        accompanyingVisual: {
          type: 'invalid' as AccompanyingVisualType,
          description: 'A valid description'
        }
      }
      expect(validateTextBlock(invalidBlock)).toBe(false)
    })
  })
})
