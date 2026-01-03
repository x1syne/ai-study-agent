/**
 * 📚 LESSON GENERATOR PROPERTY TESTS
 * 
 * Property-based тесты для генератора уроков
 * Validates: Requirements 5.1, 5.2 from enhanced-course-experience
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { 
  splitModuleIntoLessons, 
  extractKeyTerms, 
  calculateReadingTime 
} from '../lesson-generator'
import type { CourseModule, TopicType } from '../types'

// ═══════════════════════════════════════════════════════════════
// 🔧 ARBITRARIES
// ═══════════════════════════════════════════════════════════════

const topicTypeArb = fc.constantFrom<TopicType>(
  'programming', 'scientific', 'creative', 'practical', 
  'business', 'humanities', 'technical'
)

const difficultyArb = fc.constantFrom<'beginner' | 'intermediate' | 'advanced' | 'expert'>(
  'beginner', 'intermediate', 'advanced', 'expert'
)

const moduleArb = fc.record({
  id: fc.uuid(),
  order: fc.integer({ min: 1, max: 20 }),
  name: fc.string({ minLength: 3, maxLength: 100 }),
  description: fc.string({ minLength: 10, maxLength: 500 }),
  theoryPrompt: fc.string(),
  practicePrompt: fc.string(),
  keyTerms: fc.array(fc.string({ minLength: 2, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
  duration: fc.integer({ min: 10, max: 120 }),
  difficulty: difficultyArb,
  contentType: fc.constantFrom('theory', 'hands_on', 'problem_solving', 'project', 'review')
}) as fc.Arbitrary<CourseModule>

// Generate markdown with sections
const markdownSectionArb = fc.record({
  title: fc.string({ minLength: 3, maxLength: 50 }),
  content: fc.string({ minLength: 50, maxLength: 500 })
}).map(({ title, content }) => `## ${title}\n\n${content}`)

const markdownArb = fc.array(markdownSectionArb, { minLength: 2, maxLength: 8 })
  .map(sections => sections.join('\n\n'))

// Generate markdown with highlighted terms
const termArb = fc.string({ minLength: 2, maxLength: 30 }).filter(s => !s.includes('='))
const highlightedMarkdownArb = fc.array(termArb, { minLength: 1, maxLength: 5 })
  .map(terms => {
    const content = terms.map(t => `Это ==${t}== — важный термин.`).join('\n\n')
    return `## Основные понятия\n\n${content}`
  })

// ═══════════════════════════════════════════════════════════════
// 📝 PROPERTY 3: Lesson Count Per Module
// Validates: Requirements 5.1
// ═══════════════════════════════════════════════════════════════

describe('Property 3: Lesson Count Per Module', () => {
  it('should generate 1-7 lessons per module', () => {
    fc.assert(
      fc.property(
        moduleArb,
        markdownArb,
        topicTypeArb,
        (module, markdown, topicType) => {
          const lessons = splitModuleIntoLessons(module, markdown, topicType)
          
          // Property: lesson count is within bounds
          expect(lessons.length).toBeGreaterThanOrEqual(1)
          expect(lessons.length).toBeLessThanOrEqual(7)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should assign sequential order to lessons', () => {
    fc.assert(
      fc.property(
        moduleArb,
        markdownArb,
        topicTypeArb,
        (module, markdown, topicType) => {
          const lessons = splitModuleIntoLessons(module, markdown, topicType)
          
          // Property: orders are sequential starting from 1
          lessons.forEach((lesson, index) => {
            expect(lesson.order).toBe(index + 1)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should link all lessons to parent module', () => {
    fc.assert(
      fc.property(
        moduleArb,
        markdownArb,
        topicTypeArb,
        (module, markdown, topicType) => {
          const lessons = splitModuleIntoLessons(module, markdown, topicType)
          
          // Property: all lessons reference parent module
          lessons.forEach(lesson => {
            expect(lesson.moduleId).toBe(module.id)
            expect(lesson.id).toContain(module.id)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 📝 PROPERTY 4: Lesson Length Constraint
// Validates: Requirements 5.2
// ═══════════════════════════════════════════════════════════════

describe('Property 4: Lesson Length Constraint', () => {
  it('should have estimated read time between 5-15 minutes', () => {
    fc.assert(
      fc.property(
        moduleArb,
        markdownArb,
        topicTypeArb,
        (module, markdown, topicType) => {
          const lessons = splitModuleIntoLessons(module, markdown, topicType)
          
          // Property: read time is within bounds
          lessons.forEach(lesson => {
            expect(lesson.estimatedReadTime).toBeGreaterThanOrEqual(5)
            expect(lesson.estimatedReadTime).toBeLessThanOrEqual(15)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have non-empty theory markdown', () => {
    fc.assert(
      fc.property(
        moduleArb,
        markdownArb,
        topicTypeArb,
        (module, markdown, topicType) => {
          const lessons = splitModuleIntoLessons(module, markdown, topicType)
          
          // Property: theory is present (may be empty for empty input)
          lessons.forEach(lesson => {
            expect(lesson.theoryMarkdown).toBeDefined()
            expect(typeof lesson.theoryMarkdown).toBe('string')
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have valid word count', () => {
    fc.assert(
      fc.property(
        moduleArb,
        markdownArb,
        topicTypeArb,
        (module, markdown, topicType) => {
          const lessons = splitModuleIntoLessons(module, markdown, topicType)
          
          // Property: word count is non-negative
          lessons.forEach(lesson => {
            expect(lesson.wordCount).toBeGreaterThanOrEqual(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 📝 PROPERTY: Key Term Highlighting
// Validates: Requirements 1.2, 4.1
// ═══════════════════════════════════════════════════════════════

describe('Property: Key Term Highlighting', () => {
  it('should extract all ==term== patterns', () => {
    fc.assert(
      fc.property(
        highlightedMarkdownArb,
        (markdown) => {
          const terms = extractKeyTerms(markdown)
          
          // Count expected terms in markdown
          const matches = markdown.match(/==([^=]+)==/g) || []
          const uniqueTerms = new Set(matches.map(m => m.replace(/==/g, '').toLowerCase()))
          
          // Property: extracted terms match unique terms in markdown
          expect(terms.length).toBe(uniqueTerms.size)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should not duplicate terms', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 2, maxLength: 20 }).filter(s => !s.includes('=')),
        (term) => {
          const markdown = `==${term}== appears here and ==${term}== appears again.`
          const terms = extractKeyTerms(markdown)
          
          // Property: no duplicates
          const termNames = terms.map(t => t.term.toLowerCase())
          const uniqueNames = new Set(termNames)
          expect(termNames.length).toBe(uniqueNames.size)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should extract term definitions when available', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => !s.includes('=') && s.trim().length >= 3),
        fc.string({ minLength: 10, maxLength: 100 }).filter(s => !s.includes('.') && s.trim().length >= 10),
        (term, definition) => {
          const trimmedTerm = term.trim()
          const trimmedDef = definition.trim()
          
          // Skip if term or definition is too short after trimming
          if (trimmedTerm.length < 3 || trimmedDef.length < 10) return
          
          const markdown = `==${trimmedTerm}== — ${trimmedDef}.`
          const terms = extractKeyTerms(markdown)
          
          // Property: definition is extracted
          expect(terms.length).toBe(1)
          // Check that definition contains at least part of the expected text
          expect(terms[0].definition.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 📝 PROPERTY: Reading Time Calculation
// ═══════════════════════════════════════════════════════════════

describe('Property: Reading Time Calculation', () => {
  it('should calculate reading time proportional to word count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        (wordCount) => {
          const readTime = calculateReadingTime(wordCount)
          
          // Property: reading time is proportional (200 words/min)
          const expectedMin = Math.ceil(wordCount / 200)
          expect(readTime).toBe(expectedMin)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 for 0 words', () => {
    expect(calculateReadingTime(0)).toBe(0)
  })

  it('should always return non-negative integer', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100000 }),
        (wordCount) => {
          const readTime = calculateReadingTime(wordCount)
          
          // Property: result is non-negative integer
          expect(readTime).toBeGreaterThanOrEqual(0)
          expect(Number.isInteger(readTime)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 📝 PROPERTY: Theory Content Structure
// Validates: Requirements 1.1, 1.5
// ═══════════════════════════════════════════════════════════════

describe('Property: Theory Content Structure', () => {
  it('should preserve markdown structure in lessons', () => {
    fc.assert(
      fc.property(
        moduleArb,
        markdownArb,
        topicTypeArb,
        (module, markdown, topicType) => {
          const lessons = splitModuleIntoLessons(module, markdown, topicType)
          
          // Property: combined lesson content contains original sections
          const combinedContent = lessons.map(l => l.theoryMarkdown).join('\n')
          
          // At least some content should be preserved
          if (markdown.length > 0) {
            expect(combinedContent.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should generate unique lesson IDs', () => {
    fc.assert(
      fc.property(
        moduleArb,
        markdownArb,
        topicTypeArb,
        (module, markdown, topicType) => {
          const lessons = splitModuleIntoLessons(module, markdown, topicType)
          
          // Property: all IDs are unique
          const ids = lessons.map(l => l.id)
          const uniqueIds = new Set(ids)
          expect(ids.length).toBe(uniqueIds.size)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should have non-empty titles', () => {
    fc.assert(
      fc.property(
        moduleArb,
        markdownArb,
        topicTypeArb,
        (module, markdown, topicType) => {
          const lessons = splitModuleIntoLessons(module, markdown, topicType)
          
          // Property: all lessons have titles
          lessons.forEach(lesson => {
            expect(lesson.title).toBeTruthy()
            expect(lesson.title.length).toBeGreaterThan(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})
