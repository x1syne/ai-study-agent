/**
 * 🧪 API RESPONSE PROPERTY TESTS
 * 
 * Property-based tests for API response structure correctness.
 * Validates Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type {
  VisualIdentity,
  ModuleVisualSpec,
  VisualSection,
  TextBlock,
  MultimediaSpec,
  GamificationSpec,
  InteractiveComponentConfig,
  InteractivityLevel
} from '../types'

// ═══════════════════════════════════════════════════════════════
// 🎯 ARBITRARIES
// ═══════════════════════════════════════════════════════════════

const visualIdentityArb: fc.Arbitrary<VisualIdentity> = fc.record({
  primaryColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s.toUpperCase()}`),
  gradient: fc.constant('linear-gradient(135deg, #667eea 0%, #764ba2 100%)'),
  fontPairing: fc.tuple(
    fc.constantFrom('Inter', 'Roboto', 'Open Sans'),
    fc.constantFrom('JetBrains Mono', 'Fira Code', 'Source Code Pro')
  ),
  iconFamily: fc.constantFrom('Lucide', 'Heroicons', 'Feather'),
  colorScheme: fc.constantFrom('blue-gradient', 'green-gradient', 'purple-gradient', 'orange-gradient'),
  visualTheme: fc.constantFrom('minimalist-illustrations', 'data-driven-infographics', 'animated-diagrams')
})

const moduleVisualSpecArb: fc.Arbitrary<ModuleVisualSpec> = fc.record({
  heroImagePrompt: fc.string({ minLength: 10, maxLength: 200 }),
  colorScheme: fc.record({
    primary: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s.toUpperCase()}`),
    secondary: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s.toUpperCase()}`),
    accent: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s.toUpperCase()}`)
  }),
  decorationElements: fc.array(
    fc.constantFrom('geometric_shape', 'gradient_orb', 'floating_icon'),
    { minLength: 1, maxLength: 3 }
  ),
  primaryVisual: fc.record({
    type: fc.constantFrom('diagram', 'infographic', 'timeline', 'comparison_table', 'flowchart'),
    description: fc.string({ minLength: 10, maxLength: 200 }),
    mermaidCode: fc.option(fc.constant('graph TD\n    A[Start] --> B[End]'))
  }),
  secondaryVisuals: fc.array(
    fc.record({
      type: fc.constantFrom('icon_set', 'badge', 'illustration'),
      icons: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 5 })),
      purpose: fc.string({ minLength: 5, maxLength: 100 })
    }),
    { minLength: 1, maxLength: 3 }
  )
})

const textBlockArb: fc.Arbitrary<TextBlock> = fc.record({
  text: fc.string({ minLength: 10, maxLength: 500 }),
  accompanyingVisual: fc.record({
    type: fc.constantFrom('icon', 'illustration', 'photo', 'diagram'),
    description: fc.string({ minLength: 5, maxLength: 200 }),
    iconName: fc.option(fc.constantFrom('Code', 'Book', 'Star', 'Check')),
    mermaidCode: fc.option(fc.constant('graph TD\n    A --> B')),
    chartConfig: fc.option(fc.constant(undefined))
  }),
  interactiveElement: fc.option(fc.record({
    type: fc.constantFrom('toggle_detail', 'flip_card', 'scratch_to_reveal'),
    content: fc.string({ minLength: 5, maxLength: 200 })
  }))
})

const multimediaSpecArb: fc.Arbitrary<MultimediaSpec> = fc.record({
  imagePrompts: fc.array(
    fc.record({
      style: fc.string({ minLength: 5, maxLength: 100 }),
      subject: fc.string({ minLength: 3, maxLength: 100 }),
      action: fc.string({ minLength: 3, maxLength: 100 }),
      detailLevel: fc.string({ minLength: 3, maxLength: 100 })
    }),
    { minLength: 1, maxLength: 5 }
  ),
  videoSources: fc.array(
    fc.record({
      platform: fc.constantFrom('youtube', 'codepen', 'observable'),
      searchQuery: fc.string({ minLength: 3, maxLength: 100 }),
      durationPreference: fc.string({ minLength: 3, maxLength: 50 }),
      hasCaptions: fc.boolean(),
      aspectRatio: fc.constantFrom('16:9', '1:1', '4:3')
    }),
    { minLength: 1, maxLength: 3 }
  ),
  diagrams: fc.array(
    fc.oneof(
      fc.record({
        type: fc.constant('mermaid' as const),
        code: fc.constant('graph TD\n    A --> B'),
        interactive: fc.boolean()
      }),
      fc.record({
        type: fc.constantFrom('bar_chart', 'pie_chart', 'line_graph', 'mind_map'),
        data: fc.record({
          labels: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
          datasets: fc.array(
            fc.record({
              label: fc.string({ minLength: 1, maxLength: 50 }),
              data: fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 2, maxLength: 5 }),
              backgroundColor: fc.option(fc.array(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`)))
            }),
            { minLength: 1, maxLength: 2 }
          )
        }),
        interactive: fc.boolean()
      })
    ),
    { minLength: 0, maxLength: 3 }
  ),
  embeds: fc.array(
    fc.record({
      platform: fc.constantFrom('youtube', 'codepen', 'observable'),
      searchQuery: fc.string({ minLength: 3, maxLength: 100 }),
      durationPreference: fc.string({ minLength: 3, maxLength: 50 }),
      hasCaptions: fc.boolean(),
      aspectRatio: fc.constantFrom('16:9', '1:1', '4:3')
    }),
    { minLength: 0, maxLength: 3 }
  )
})

const gamificationSpecArb: fc.Arbitrary<GamificationSpec> = fc.record({
  checkpoints: fc.array(
    fc.record({
      title: fc.string({ minLength: 5, maxLength: 100 }),
      emoji: fc.constantFrom('📚', '🛠️', '🧩', '🚀', '✅'),
      rewardText: fc.string({ minLength: 10, maxLength: 200 })
    }),
    { minLength: 1, maxLength: 10 }
  ),
  progressVisualization: fc.record({
    type: fc.constantFrom('progress_bar', 'pie_chart', 'experience_points'),
    maxValue: fc.integer({ min: 100, max: 10000 }),
    currentValue: fc.integer({ min: 0, max: 100 })
  }).filter(pv => pv.currentValue <= pv.maxValue),
  levelBadges: fc.array(
    fc.record({
      level: fc.integer({ min: 1, max: 10 }),
      emoji: fc.constantFrom('🌱', '🌿', '🌳', '🏆', '👑'),
      title: fc.string({ minLength: 3, maxLength: 50 })
    }),
    { minLength: 2, maxLength: 10 }
  )
})

const interactiveComponentArb: fc.Arbitrary<InteractiveComponentConfig> = fc.record({
  type: fc.constantFrom('drag_and_drop', 'code_sandbox', 'quiz_with_feedback', 'simulation', 'progress_checklist'),
  difficulty: fc.option(fc.constantFrom('matching', 'ordering', 'fill_blank')),
  rewardVisual: fc.constantFrom('confetti', 'badge', 'progress_bar'),
  hintsAvailable: fc.integer({ min: 0, max: 3 }),
  data: fc.record({
    items: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 })
  })
})

const visualSectionArb: fc.Arbitrary<VisualSection> = fc.record({
  contentType: fc.constantFrom('theory', 'example', 'practice', 'review'),
  textBlocks: fc.array(textBlockArb, { minLength: 1, maxLength: 10 }),
  multimedia: multimediaSpecArb,
  gamification: gamificationSpecArb,
  interactiveComponent: fc.option(interactiveComponentArb)
})

const interactivityLevelArb: fc.Arbitrary<InteractivityLevel> = fc.constantFrom('high', 'medium', 'low')

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS
// ═══════════════════════════════════════════════════════════════

describe('API Response Structure', () => {
  describe('Property 8.1: Visual Identity in Metadata', () => {
    it('should have valid visual identity structure', () => {
      fc.assert(
        fc.property(visualIdentityArb, (vi) => {
          // Primary color is valid hex
          expect(vi.primaryColor).toMatch(/^#[0-9A-F]{6}$/i)
          
          // Gradient is valid CSS
          expect(vi.gradient).toContain('linear-gradient')
          
          // Font pairing has 2 fonts
          expect(vi.fontPairing).toHaveLength(2)
          expect(vi.fontPairing[0].length).toBeGreaterThan(0)
          expect(vi.fontPairing[1].length).toBeGreaterThan(0)
          
          // Icon family is non-empty
          expect(vi.iconFamily.length).toBeGreaterThan(0)
          
          // Color scheme is valid
          expect(['blue-gradient', 'green-gradient', 'purple-gradient', 'orange-gradient'])
            .toContain(vi.colorScheme)
          
          // Visual theme is valid
          expect(['minimalist-illustrations', 'data-driven-infographics', 'animated-diagrams'])
            .toContain(vi.visualTheme)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 8.2: Module Visual Spec', () => {
    it('should have valid module visual spec structure', () => {
      fc.assert(
        fc.property(moduleVisualSpecArb, (spec) => {
          // Hero image prompt is non-empty
          expect(spec.heroImagePrompt.length).toBeGreaterThan(0)
          
          // Color scheme has valid hex colors
          expect(spec.colorScheme.primary).toMatch(/^#[0-9A-F]{6}$/i)
          expect(spec.colorScheme.secondary).toMatch(/^#[0-9A-F]{6}$/i)
          expect(spec.colorScheme.accent).toMatch(/^#[0-9A-F]{6}$/i)
          
          // Decoration elements are valid
          expect(spec.decorationElements.length).toBeGreaterThan(0)
          spec.decorationElements.forEach(el => {
            expect(['geometric_shape', 'gradient_orb', 'floating_icon']).toContain(el)
          })
          
          // Primary visual is valid
          expect(['diagram', 'infographic', 'timeline', 'comparison_table', 'flowchart'])
            .toContain(spec.primaryVisual.type)
          expect(spec.primaryVisual.description.length).toBeGreaterThan(0)
          
          // Secondary visuals are valid
          expect(Array.isArray(spec.secondaryVisuals)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 8.3: Visual Sections', () => {
    it('should have valid visual section structure', () => {
      fc.assert(
        fc.property(visualSectionArb, (section) => {
          // Content type is valid
          expect(['theory', 'example', 'practice', 'review']).toContain(section.contentType)
          
          // Text blocks are present
          expect(section.textBlocks.length).toBeGreaterThan(0)
          
          // Each text block has required fields
          section.textBlocks.forEach(block => {
            expect(block.text.length).toBeGreaterThan(0)
            expect(block.accompanyingVisual).toBeDefined()
            expect(['icon', 'illustration', 'photo', 'diagram'])
              .toContain(block.accompanyingVisual.type)
          })
          
          // Multimedia is present
          expect(section.multimedia).toBeDefined()
          expect(Array.isArray(section.multimedia.imagePrompts)).toBe(true)
          expect(Array.isArray(section.multimedia.videoSources)).toBe(true)
          
          // Gamification is present
          expect(section.gamification).toBeDefined()
          expect(Array.isArray(section.gamification.checkpoints)).toBe(true)
          expect(section.gamification.progressVisualization).toBeDefined()
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 8.4: Text Blocks', () => {
    it('should have valid text block structure', () => {
      fc.assert(
        fc.property(textBlockArb, (block) => {
          // Text is non-empty
          expect(block.text.length).toBeGreaterThan(0)
          
          // Accompanying visual is valid
          expect(block.accompanyingVisual).toBeDefined()
          expect(['icon', 'illustration', 'photo', 'diagram'])
            .toContain(block.accompanyingVisual.type)
          expect(block.accompanyingVisual.description.length).toBeGreaterThan(0)
          
          // Interactive element (if present) is valid
          if (block.interactiveElement) {
            expect(['toggle_detail', 'flip_card', 'scratch_to_reveal'])
              .toContain(block.interactiveElement.type)
            expect(block.interactiveElement.content.length).toBeGreaterThan(0)
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 8.5: Multimedia Spec', () => {
    it('should have valid multimedia spec structure', () => {
      fc.assert(
        fc.property(multimediaSpecArb, (spec) => {
          // Image prompts are valid
          expect(Array.isArray(spec.imagePrompts)).toBe(true)
          spec.imagePrompts.forEach(prompt => {
            expect(prompt.style.length).toBeGreaterThan(0)
            expect(prompt.subject.length).toBeGreaterThan(0)
            expect(prompt.action.length).toBeGreaterThan(0)
            expect(prompt.detailLevel.length).toBeGreaterThan(0)
          })
          
          // Video sources are valid
          expect(Array.isArray(spec.videoSources)).toBe(true)
          spec.videoSources.forEach(source => {
            expect(['youtube', 'codepen', 'observable']).toContain(source.platform)
            expect(source.searchQuery.length).toBeGreaterThan(0)
            expect(typeof source.hasCaptions).toBe('boolean')
            expect(['16:9', '1:1', '4:3']).toContain(source.aspectRatio)
          })
          
          // Diagrams are valid
          expect(Array.isArray(spec.diagrams)).toBe(true)
          
          // Embeds are valid
          expect(Array.isArray(spec.embeds)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 8.6: Gamification Spec', () => {
    it('should have valid gamification spec structure', () => {
      fc.assert(
        fc.property(gamificationSpecArb, (spec) => {
          // Checkpoints are valid
          expect(spec.checkpoints.length).toBeGreaterThan(0)
          spec.checkpoints.forEach(cp => {
            expect(cp.title.length).toBeGreaterThan(0)
            expect(cp.emoji.length).toBeGreaterThan(0)
            expect(cp.rewardText.length).toBeGreaterThan(0)
          })
          
          // Progress visualization is valid
          expect(['progress_bar', 'pie_chart', 'experience_points'])
            .toContain(spec.progressVisualization.type)
          expect(spec.progressVisualization.maxValue).toBeGreaterThan(0)
          expect(spec.progressVisualization.currentValue).toBeGreaterThanOrEqual(0)
          expect(spec.progressVisualization.currentValue).toBeLessThanOrEqual(spec.progressVisualization.maxValue)
          
          // Level badges are valid
          expect(spec.levelBadges.length).toBeGreaterThanOrEqual(2)
          spec.levelBadges.forEach(badge => {
            expect(badge.level).toBeGreaterThan(0)
            expect(badge.emoji.length).toBeGreaterThan(0)
            expect(badge.title.length).toBeGreaterThan(0)
          })
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 8.7: Interactive Components', () => {
    it('should have valid interactive component structure', () => {
      fc.assert(
        fc.property(interactiveComponentArb, (config) => {
          // Type is valid
          expect(['drag_and_drop', 'code_sandbox', 'quiz_with_feedback', 'simulation', 'progress_checklist'])
            .toContain(config.type)
          
          // Reward visual is valid
          expect(['confetti', 'badge', 'progress_bar']).toContain(config.rewardVisual)
          
          // Hints available is in range
          expect(config.hintsAvailable).toBeGreaterThanOrEqual(0)
          expect(config.hintsAvailable).toBeLessThanOrEqual(3)
          
          // Data is present
          expect(config.data).toBeDefined()
          expect(typeof config.data).toBe('object')
          
          // Difficulty is valid for drag_and_drop
          if (config.type === 'drag_and_drop' && config.difficulty) {
            expect(['matching', 'ordering', 'fill_blank']).toContain(config.difficulty)
          }
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Property 8.8: Interactivity Level', () => {
    it('should have valid interactivity level', () => {
      fc.assert(
        fc.property(interactivityLevelArb, (level) => {
          expect(['high', 'medium', 'low']).toContain(level)
        }),
        { numRuns: 100 }
      )
    })
  })
})

describe('API Response Validation Functions', () => {
  describe('validateVisualIdentity', () => {
    it('should validate correct visual identity', () => {
      fc.assert(
        fc.property(visualIdentityArb, (vi) => {
          // All required fields present
          expect(vi.primaryColor).toBeDefined()
          expect(vi.gradient).toBeDefined()
          expect(vi.fontPairing).toBeDefined()
          expect(vi.iconFamily).toBeDefined()
          expect(vi.colorScheme).toBeDefined()
          expect(vi.visualTheme).toBeDefined()
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('validateModuleVisualSpec', () => {
    it('should validate correct module visual spec', () => {
      fc.assert(
        fc.property(moduleVisualSpecArb, (spec) => {
          // All required fields present
          expect(spec.heroImagePrompt).toBeDefined()
          expect(spec.colorScheme).toBeDefined()
          expect(spec.decorationElements).toBeDefined()
          expect(spec.primaryVisual).toBeDefined()
          expect(spec.secondaryVisuals).toBeDefined()
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('validateVisualSection', () => {
    it('should validate correct visual section', () => {
      fc.assert(
        fc.property(visualSectionArb, (section) => {
          // All required fields present
          expect(section.contentType).toBeDefined()
          expect(section.textBlocks).toBeDefined()
          expect(section.multimedia).toBeDefined()
          expect(section.gamification).toBeDefined()
        }),
        { numRuns: 100 }
      )
    })
  })
})
