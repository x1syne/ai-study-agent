/**
 * 🧪 MULTIMEDIA SPEC PROPERTY TESTS
 * 
 * Feature: visual-interactive-courses
 * Property 6: Multimedia Spec Completeness
 * Validates: Requirements 6.1, 6.2, 6.4, 6.6
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  generateImagePrompts,
  generateVideoSources,
  generateEmbeds,
  generateModuleDiagrams,
  generateMultimediaSpec,
  generateAllMultimediaSpecs,
  validateMultimediaSpec
} from '../multimedia-generator'
import type {
  TopicType,
  DifficultyLevel,
  CourseModule,
  ModuleContentType,
  VisualTheme,
  EmbedPlatform
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

const visualThemeArb = fc.constantFrom<VisualTheme>(
  'minimalist-illustrations',
  'data-driven-infographics',
  'animated-diagrams'
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

const VALID_PLATFORMS: EmbedPlatform[] = ['youtube', 'codepen', 'observable']

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - ImagePrompts
// ═══════════════════════════════════════════════════════════════

describe('Image Prompts Generation', () => {
  /**
   * Property 6.1a: imagePrompts is an array
   */
  it('should generate imagePrompts as array for all inputs', () => {
    fc.assert(
      fc.property(
        courseModuleArb,
        visualThemeArb,
        topicTypeArb,
        (module, visualTheme, topicType) => {
          const prompts = generateImagePrompts(module, visualTheme, topicType)
          
          expect(Array.isArray(prompts)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.1b: each prompt has all required fields
   */
  it('should generate prompts with all required fields', () => {
    fc.assert(
      fc.property(
        courseModuleArb,
        visualThemeArb,
        topicTypeArb,
        (module, visualTheme, topicType) => {
          const prompts = generateImagePrompts(module, visualTheme, topicType)
          
          prompts.forEach(prompt => {
            expect(typeof prompt.style).toBe('string')
            expect(prompt.style.length).toBeGreaterThan(0)
            
            expect(typeof prompt.subject).toBe('string')
            expect(prompt.subject.length).toBeGreaterThan(0)
            
            expect(typeof prompt.action).toBe('string')
            expect(prompt.action.length).toBeGreaterThan(0)
            
            expect(typeof prompt.detailLevel).toBe('string')
            expect(prompt.detailLevel.length).toBeGreaterThan(0)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - VideoSources
// ═══════════════════════════════════════════════════════════════

describe('Video Sources Generation', () => {
  /**
   * Property 6.2a: videoSources is an array
   */
  it('should generate videoSources as array for all inputs', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const sources = generateVideoSources(module, topicType)
        
        expect(Array.isArray(sources)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.2b: each source has valid platform
   */
  it('should generate sources with valid platform', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const sources = generateVideoSources(module, topicType)
        
        sources.forEach(source => {
          expect(VALID_PLATFORMS).toContain(source.platform)
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.2c: each source has non-empty searchQuery
   */
  it('should generate sources with non-empty searchQuery', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const sources = generateVideoSources(module, topicType)
        
        sources.forEach(source => {
          expect(typeof source.searchQuery).toBe('string')
          expect(source.searchQuery.length).toBeGreaterThan(0)
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.2d: each source has durationPreference
   */
  it('should generate sources with durationPreference', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const sources = generateVideoSources(module, topicType)
        
        sources.forEach(source => {
          expect(typeof source.durationPreference).toBe('string')
        })
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.2e: each source has boolean hasCaptions
   */
  it('should generate sources with boolean hasCaptions', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const sources = generateVideoSources(module, topicType)
        
        sources.forEach(source => {
          expect(typeof source.hasCaptions).toBe('boolean')
        })
      }),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - Embeds
// ═══════════════════════════════════════════════════════════════

describe('Embeds Generation', () => {
  /**
   * Property 6.4a: embeds is an array
   */
  it('should generate embeds as array for all inputs', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const embeds = generateEmbeds(module, topicType)
        
        expect(Array.isArray(embeds)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.4b: each embed has valid platform
   */
  it('should generate embeds with valid platform', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const embeds = generateEmbeds(module, topicType)
        
        embeds.forEach(embed => {
          expect(VALID_PLATFORMS).toContain(embed.platform)
        })
      }),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - Diagrams
// ═══════════════════════════════════════════════════════════════

describe('Module Diagrams Generation', () => {
  /**
   * Property 6.6a: diagrams is an array
   */
  it('should generate diagrams as array for all inputs', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const diagrams = generateModuleDiagrams(module, topicType)
        
        expect(Array.isArray(diagrams)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.6b: at least one diagram is generated
   */
  it('should generate at least one diagram', () => {
    fc.assert(
      fc.property(courseModuleArb, topicTypeArb, (module, topicType) => {
        const diagrams = generateModuleDiagrams(module, topicType)
        
        expect(diagrams.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - Full MultimediaSpec
// ═══════════════════════════════════════════════════════════════

describe('Full Multimedia Spec Generation', () => {
  /**
   * Property 6.7a: Generated spec has all required fields
   */
  it('should generate spec with all required fields', () => {
    fc.assert(
      fc.property(
        courseModuleArb,
        topicTypeArb,
        visualThemeArb,
        (module, topicType, visualTheme) => {
          const spec = generateMultimediaSpec(module, topicType, visualTheme)
          
          expect(spec).toHaveProperty('imagePrompts')
          expect(spec).toHaveProperty('videoSources')
          expect(spec).toHaveProperty('diagrams')
          expect(spec).toHaveProperty('embeds')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 6.7b: Generated spec passes validation
   */
  it('should generate valid spec that passes validation', () => {
    fc.assert(
      fc.property(
        courseModuleArb,
        topicTypeArb,
        visualThemeArb,
        (module, topicType, visualTheme) => {
          const spec = generateMultimediaSpec(module, topicType, visualTheme)
          
          expect(validateMultimediaSpec(spec)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 BATCH GENERATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Batch Multimedia Spec Generation', () => {
  /**
   * Property: generateAllMultimediaSpecs returns correct count
   */
  it('should generate specs for all modules', () => {
    fc.assert(
      fc.property(
        fc.array(courseModuleArb, { minLength: 1, maxLength: 10 }),
        topicTypeArb,
        visualThemeArb,
        (modules, topicType, visualTheme) => {
          const specs = generateAllMultimediaSpecs(modules, topicType, visualTheme)
          
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
        visualThemeArb,
        (modules, topicType, visualTheme) => {
          const specs = generateAllMultimediaSpecs(modules, topicType, visualTheme)
          
          specs.forEach(spec => {
            expect(validateMultimediaSpec(spec)).toBe(true)
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

describe('Multimedia Edge Cases', () => {
  const createTestModule = (overrides: Partial<CourseModule> = {}): CourseModule => ({
    id: 'test-module-1',
    order: 1,
    name: 'Test Module',
    description: 'A test module for unit testing',
    theoryPrompt: 'Generate theory about testing',
    practicePrompt: 'Generate practice tasks',
    keyTerms: ['testing', 'unit', 'module', 'validation'],
    duration: 30,
    difficulty: 'beginner',
    contentType: 'theory',
    ...overrides
  })

  describe('generateImagePrompts', () => {
    it('generates hero image prompt', () => {
      const module = createTestModule()
      const prompts = generateImagePrompts(module, 'minimalist-illustrations', 'programming')
      
      expect(prompts.length).toBeGreaterThan(0)
      expect(prompts[0].subject).toBe(module.name)
    })

    it('generates prompts for key terms', () => {
      const module = createTestModule({ keyTerms: ['term1', 'term2', 'term3', 'term4'] })
      const prompts = generateImagePrompts(module, 'minimalist-illustrations', 'programming')
      
      // Hero + up to 3 key terms
      expect(prompts.length).toBe(4)
    })

    it('uses correct style for visual theme', () => {
      const module = createTestModule()
      
      const minimalist = generateImagePrompts(module, 'minimalist-illustrations', 'programming')
      expect(minimalist[0].style).toContain('minimalist')
      
      const infographic = generateImagePrompts(module, 'data-driven-infographics', 'programming')
      expect(infographic[0].style).toContain('infographic')
    })
  })

  describe('generateVideoSources', () => {
    it('always includes YouTube source', () => {
      const module = createTestModule()
      const sources = generateVideoSources(module, 'programming')
      
      const youtube = sources.find(s => s.platform === 'youtube')
      expect(youtube).toBeDefined()
      expect(youtube!.hasCaptions).toBe(true)
    })

    it('includes CodePen for programming topics', () => {
      const module = createTestModule()
      const sources = generateVideoSources(module, 'programming')
      
      const codepen = sources.find(s => s.platform === 'codepen')
      expect(codepen).toBeDefined()
    })

    it('includes Observable for scientific topics', () => {
      const module = createTestModule()
      const sources = generateVideoSources(module, 'scientific')
      
      const observable = sources.find(s => s.platform === 'observable')
      expect(observable).toBeDefined()
    })

    it('uses correct duration for difficulty', () => {
      const beginner = createTestModule({ difficulty: 'beginner' })
      const expert = createTestModule({ difficulty: 'expert' })
      
      const beginnerSources = generateVideoSources(beginner, 'programming')
      const expertSources = generateVideoSources(expert, 'programming')
      
      expect(beginnerSources[0].durationPreference).toContain('2-5')
      expect(expertSources[0].durationPreference).toContain('15-20')
    })
  })

  describe('generateModuleDiagrams', () => {
    it('generates flowchart for problem_solving content', () => {
      const module = createTestModule({ contentType: 'problem_solving' })
      const diagrams = generateModuleDiagrams(module, 'programming')
      
      const mermaid = diagrams.find(d => 'code' in d)
      expect(mermaid).toBeDefined()
    })

    it('generates chart for business topics', () => {
      const module = createTestModule()
      const diagrams = generateModuleDiagrams(module, 'business')
      
      const chart = diagrams.find(d => 'data' in d)
      expect(chart).toBeDefined()
    })

    it('generates mindmap for theory content', () => {
      const module = createTestModule({ contentType: 'theory' })
      const diagrams = generateModuleDiagrams(module, 'programming')
      
      const mermaid = diagrams.find(d => 'code' in d && d.code.includes('mindmap'))
      expect(mermaid).toBeDefined()
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('validateMultimediaSpec', () => {
  it('returns true for valid spec', () => {
    const validSpec = {
      imagePrompts: [{
        style: 'flat design',
        subject: 'test',
        action: 'illustration',
        detailLevel: 'detailed'
      }],
      videoSources: [{
        platform: 'youtube' as EmbedPlatform,
        searchQuery: 'test query',
        durationPreference: '5 minutes',
        hasCaptions: true,
        aspectRatio: '16:9' as const
      }],
      diagrams: [],
      embeds: [{
        platform: 'youtube' as EmbedPlatform,
        searchQuery: 'test',
        durationPreference: '5 minutes',
        hasCaptions: true,
        aspectRatio: '16:9' as const
      }]
    }
    
    expect(validateMultimediaSpec(validSpec)).toBe(true)
  })

  it('returns false for invalid platform', () => {
    const invalidSpec = {
      imagePrompts: [],
      videoSources: [{
        platform: 'invalid' as EmbedPlatform,
        searchQuery: 'test',
        durationPreference: '5 minutes',
        hasCaptions: true,
        aspectRatio: '16:9' as const
      }],
      diagrams: [],
      embeds: []
    }
    
    expect(validateMultimediaSpec(invalidSpec)).toBe(false)
  })

  it('returns false for empty searchQuery', () => {
    const invalidSpec = {
      imagePrompts: [],
      videoSources: [{
        platform: 'youtube' as EmbedPlatform,
        searchQuery: '',
        durationPreference: '5 minutes',
        hasCaptions: true,
        aspectRatio: '16:9' as const
      }],
      diagrams: [],
      embeds: []
    }
    
    expect(validateMultimediaSpec(invalidSpec)).toBe(false)
  })

  it('returns false for missing image prompt fields', () => {
    const invalidSpec = {
      imagePrompts: [{
        style: 'flat design',
        subject: '',
        action: 'illustration',
        detailLevel: 'detailed'
      }],
      videoSources: [],
      diagrams: [],
      embeds: []
    }
    
    expect(validateMultimediaSpec(invalidSpec)).toBe(false)
  })
})
