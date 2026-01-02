/**
 * 🧪 MEDIA ORCHESTRATOR PROPERTY TESTS
 * 
 * Feature: visual-interactive-courses
 * Property 9: Media Source Selection Logic
 * Validates: Requirements 9.5
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { 
  AccompanyingVisual, 
  AccompanyingVisualType,
  ChartConfig,
  ChartType
} from '@/lib/agents/types'

// ═══════════════════════════════════════════════════════════════
// 🎯 MEDIA SOURCE SELECTION LOGIC
// ═══════════════════════════════════════════════════════════════

/**
 * Определяет источник медиа на основе AccompanyingVisual
 * Эта логика соответствует MediaOrchestrator компоненту
 */
export type MediaSourceType = 
  | 'mermaid'      // Mermaid.js для диаграмм
  | 'chartjs'      // Chart.js для графиков
  | 'lucide'       // Lucide иконки
  | 'unsplash'     // Unsplash для изображений
  | 'placeholder'  // Placeholder если ничего не подходит

export interface MediaSourceSelection {
  source: MediaSourceType
  data: {
    mermaidCode?: string
    chartConfig?: ChartConfig
    iconName?: string
    searchQuery?: string
  }
}

/**
 * Выбирает источник медиа на основе AccompanyingVisual
 * Реализует логику из MediaOrchestrator.tsx
 */
export function selectMediaSource(visual: AccompanyingVisual): MediaSourceSelection {
  switch (visual.type) {
    case 'icon':
      return {
        source: 'lucide',
        data: {
          iconName: visual.iconName || 'HelpCircle'
        }
      }
    
    case 'diagram':
      // Если есть mermaidCode - используем mermaid.js
      if (visual.mermaidCode) {
        return {
          source: 'mermaid',
          data: {
            mermaidCode: visual.mermaidCode
          }
        }
      }
      // Если есть chartConfig - используем chart.js
      if (visual.chartConfig) {
        return {
          source: 'chartjs',
          data: {
            chartConfig: visual.chartConfig
          }
        }
      }
      // Fallback на placeholder
      return {
        source: 'placeholder',
        data: {
          searchQuery: visual.description
        }
      }
    
    case 'illustration':
    case 'photo':
      return {
        source: 'unsplash',
        data: {
          searchQuery: visual.description
        }
      }
    
    default:
      return {
        source: 'placeholder',
        data: {
          searchQuery: visual.description || 'visual element'
        }
      }
  }
}

/**
 * Валидирует что выбор источника корректен
 */
export function validateMediaSourceSelection(
  visual: AccompanyingVisual, 
  selection: MediaSourceSelection
): boolean {
  // Правило 1: icon → lucide
  if (visual.type === 'icon') {
    return selection.source === 'lucide' && !!selection.data.iconName
  }
  
  // Правило 2: diagram + mermaidCode → mermaid
  if (visual.type === 'diagram' && visual.mermaidCode) {
    return selection.source === 'mermaid' && selection.data.mermaidCode === visual.mermaidCode
  }
  
  // Правило 3: diagram + chartConfig → chartjs
  if (visual.type === 'diagram' && visual.chartConfig) {
    return selection.source === 'chartjs' && !!selection.data.chartConfig
  }
  
  // Правило 4: diagram без кода → placeholder
  if (visual.type === 'diagram' && !visual.mermaidCode && !visual.chartConfig) {
    return selection.source === 'placeholder'
  }
  
  // Правило 5: illustration/photo → unsplash
  if (visual.type === 'illustration' || visual.type === 'photo') {
    return selection.source === 'unsplash' && !!selection.data.searchQuery
  }
  
  return true
}

// ═══════════════════════════════════════════════════════════════
// 🎯 GENERATORS
// ═══════════════════════════════════════════════════════════════

const visualTypeArb = fc.constantFrom<AccompanyingVisualType>(
  'icon',
  'illustration', 
  'photo',
  'diagram'
)

const chartTypeArb = fc.constantFrom<ChartType>(
  'bar_chart',
  'pie_chart',
  'line_graph',
  'mind_map'
)

const chartConfigArb: fc.Arbitrary<ChartConfig> = fc.record({
  type: chartTypeArb,
  data: fc.record({
    labels: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
    datasets: fc.array(
      fc.record({
        label: fc.string({ minLength: 1, maxLength: 30 }),
        data: fc.array(fc.integer({ min: 0, max: 1000 }), { minLength: 1, maxLength: 10 }),
        backgroundColor: fc.option(
          fc.array(fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`), { minLength: 1, maxLength: 10 })
        )
      }),
      { minLength: 1, maxLength: 5 }
    )
  }),
  interactive: fc.boolean()
})

const mermaidCodeArb = fc.constantFrom(
  'graph TD\n  A[Start] --> B[End]',
  'flowchart LR\n  A --> B --> C',
  'sequenceDiagram\n  Alice->>Bob: Hello',
  'classDiagram\n  Class01 <|-- Class02',
  'graph TB\n  subgraph one\n    a1-->a2\n  end'
)

const iconNameArb = fc.constantFrom(
  'Book',
  'Code',
  'Database',
  'FileText',
  'Globe',
  'HelpCircle',
  'Info',
  'Lightbulb',
  'Settings',
  'Star',
  'User',
  'Zap'
)

// Generator для icon визуала
const iconVisualArb: fc.Arbitrary<AccompanyingVisual> = fc.record({
  type: fc.constant('icon' as const),
  description: fc.string({ minLength: 1, maxLength: 100 }),
  iconName: fc.option(iconNameArb, { nil: undefined })
})

// Generator для diagram с mermaid
const diagramMermaidVisualArb: fc.Arbitrary<AccompanyingVisual> = fc.record({
  type: fc.constant('diagram' as const),
  description: fc.string({ minLength: 1, maxLength: 100 }),
  mermaidCode: mermaidCodeArb
})

// Generator для diagram с chart
const diagramChartVisualArb: fc.Arbitrary<AccompanyingVisual> = fc.record({
  type: fc.constant('diagram' as const),
  description: fc.string({ minLength: 1, maxLength: 100 }),
  chartConfig: chartConfigArb
})

// Generator для diagram без кода (fallback)
const diagramPlainVisualArb: fc.Arbitrary<AccompanyingVisual> = fc.record({
  type: fc.constant('diagram' as const),
  description: fc.string({ minLength: 1, maxLength: 100 })
})

// Generator для illustration
const illustrationVisualArb: fc.Arbitrary<AccompanyingVisual> = fc.record({
  type: fc.constant('illustration' as const),
  description: fc.string({ minLength: 1, maxLength: 100 })
})

// Generator для photo
const photoVisualArb: fc.Arbitrary<AccompanyingVisual> = fc.record({
  type: fc.constant('photo' as const),
  description: fc.string({ minLength: 1, maxLength: 100 })
})

// Combined generator для любого AccompanyingVisual
const accompanyingVisualArb: fc.Arbitrary<AccompanyingVisual> = fc.oneof(
  iconVisualArb,
  diagramMermaidVisualArb,
  diagramChartVisualArb,
  diagramPlainVisualArb,
  illustrationVisualArb,
  photoVisualArb
)

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS
// ═══════════════════════════════════════════════════════════════

describe('Media Source Selection Logic', () => {
  /**
   * Property 9.1: Icon type always selects Lucide
   * 
   * For any AccompanyingVisual with type 'icon',
   * the selected source should be 'lucide'
   */
  it('should select Lucide for icon type visuals', () => {
    fc.assert(
      fc.property(iconVisualArb, (visual) => {
        const selection = selectMediaSource(visual)
        
        expect(selection.source).toBe('lucide')
        expect(selection.data.iconName).toBeDefined()
        expect(typeof selection.data.iconName).toBe('string')
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.2: Diagram with mermaidCode selects Mermaid.js
   * 
   * For any AccompanyingVisual with type 'diagram' and mermaidCode,
   * the selected source should be 'mermaid'
   */
  it('should select Mermaid.js for diagram with mermaidCode', () => {
    fc.assert(
      fc.property(diagramMermaidVisualArb, (visual) => {
        const selection = selectMediaSource(visual)
        
        expect(selection.source).toBe('mermaid')
        expect(selection.data.mermaidCode).toBe(visual.mermaidCode)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.3: Diagram with chartConfig selects Chart.js
   * 
   * For any AccompanyingVisual with type 'diagram' and chartConfig,
   * the selected source should be 'chartjs'
   */
  it('should select Chart.js for diagram with chartConfig', () => {
    fc.assert(
      fc.property(diagramChartVisualArb, (visual) => {
        const selection = selectMediaSource(visual)
        
        expect(selection.source).toBe('chartjs')
        expect(selection.data.chartConfig).toBeDefined()
        expect(selection.data.chartConfig?.type).toBe(visual.chartConfig?.type)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.4: Diagram without code/config falls back to placeholder
   * 
   * For any AccompanyingVisual with type 'diagram' but no mermaidCode or chartConfig,
   * the selected source should be 'placeholder'
   */
  it('should select placeholder for diagram without code or config', () => {
    fc.assert(
      fc.property(diagramPlainVisualArb, (visual) => {
        const selection = selectMediaSource(visual)
        
        expect(selection.source).toBe('placeholder')
        expect(selection.data.searchQuery).toBe(visual.description)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.5: Illustration type selects Unsplash
   * 
   * For any AccompanyingVisual with type 'illustration',
   * the selected source should be 'unsplash'
   */
  it('should select Unsplash for illustration type', () => {
    fc.assert(
      fc.property(illustrationVisualArb, (visual) => {
        const selection = selectMediaSource(visual)
        
        expect(selection.source).toBe('unsplash')
        expect(selection.data.searchQuery).toBe(visual.description)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.6: Photo type selects Unsplash
   * 
   * For any AccompanyingVisual with type 'photo',
   * the selected source should be 'unsplash'
   */
  it('should select Unsplash for photo type', () => {
    fc.assert(
      fc.property(photoVisualArb, (visual) => {
        const selection = selectMediaSource(visual)
        
        expect(selection.source).toBe('unsplash')
        expect(selection.data.searchQuery).toBe(visual.description)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.7: All selections pass validation
   * 
   * For any AccompanyingVisual, the selection should pass validation
   */
  it('should produce valid selections for all visual types', () => {
    fc.assert(
      fc.property(accompanyingVisualArb, (visual) => {
        const selection = selectMediaSource(visual)
        
        expect(validateMediaSourceSelection(visual, selection)).toBe(true)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * Property 9.8: Selection is deterministic
   * 
   * For any AccompanyingVisual, calling selectMediaSource twice
   * should produce the same result
   */
  it('should be deterministic - same input produces same output', () => {
    fc.assert(
      fc.property(accompanyingVisualArb, (visual) => {
        const selection1 = selectMediaSource(visual)
        const selection2 = selectMediaSource(visual)
        
        expect(selection1.source).toBe(selection2.source)
        expect(selection1.data).toEqual(selection2.data)
      }),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 UNIT TESTS (Edge Cases)
// ═══════════════════════════════════════════════════════════════

describe('Media Source Selection Edge Cases', () => {
  it('uses default icon name when iconName is undefined', () => {
    const visual: AccompanyingVisual = {
      type: 'icon',
      description: 'Help icon'
    }
    
    const selection = selectMediaSource(visual)
    
    expect(selection.source).toBe('lucide')
    expect(selection.data.iconName).toBe('HelpCircle')
  })

  it('prioritizes mermaidCode over chartConfig when both present', () => {
    const visual: AccompanyingVisual = {
      type: 'diagram',
      description: 'Test diagram',
      mermaidCode: 'graph TD\n  A --> B',
      chartConfig: {
        type: 'bar_chart',
        data: { labels: ['A'], datasets: [{ label: 'Test', data: [1] }] },
        interactive: false
      }
    }
    
    const selection = selectMediaSource(visual)
    
    // mermaidCode takes priority
    expect(selection.source).toBe('mermaid')
    expect(selection.data.mermaidCode).toBe(visual.mermaidCode)
  })

  it('handles empty description for illustration', () => {
    const visual: AccompanyingVisual = {
      type: 'illustration',
      description: ''
    }
    
    const selection = selectMediaSource(visual)
    
    expect(selection.source).toBe('unsplash')
    expect(selection.data.searchQuery).toBe('')
  })

  it('handles complex mermaid code', () => {
    const complexMermaid = `
      graph TB
        subgraph Frontend
          A[React App] --> B[Components]
          B --> C[State Management]
        end
        subgraph Backend
          D[API Server] --> E[Database]
        end
        A --> D
    `
    
    const visual: AccompanyingVisual = {
      type: 'diagram',
      description: 'Architecture diagram',
      mermaidCode: complexMermaid
    }
    
    const selection = selectMediaSource(visual)
    
    expect(selection.source).toBe('mermaid')
    expect(selection.data.mermaidCode).toBe(complexMermaid)
  })

  it('handles chart with multiple datasets', () => {
    const visual: AccompanyingVisual = {
      type: 'diagram',
      description: 'Multi-series chart',
      chartConfig: {
        type: 'line_graph',
        data: {
          labels: ['Jan', 'Feb', 'Mar'],
          datasets: [
            { label: 'Series A', data: [10, 20, 30] },
            { label: 'Series B', data: [15, 25, 35] },
            { label: 'Series C', data: [5, 15, 25] }
          ]
        },
        interactive: true
      }
    }
    
    const selection = selectMediaSource(visual)
    
    expect(selection.source).toBe('chartjs')
    expect(selection.data.chartConfig?.data.datasets).toHaveLength(3)
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Media Source Validation', () => {
  it('validates icon selection correctly', () => {
    const visual: AccompanyingVisual = { type: 'icon', description: 'test' }
    const validSelection: MediaSourceSelection = { 
      source: 'lucide', 
      data: { iconName: 'Star' } 
    }
    const invalidSelection: MediaSourceSelection = { 
      source: 'unsplash', 
      data: { searchQuery: 'test' } 
    }
    
    expect(validateMediaSourceSelection(visual, validSelection)).toBe(true)
    expect(validateMediaSourceSelection(visual, invalidSelection)).toBe(false)
  })

  it('validates mermaid selection correctly', () => {
    const visual: AccompanyingVisual = { 
      type: 'diagram', 
      description: 'test',
      mermaidCode: 'graph TD\n  A --> B'
    }
    const validSelection: MediaSourceSelection = { 
      source: 'mermaid', 
      data: { mermaidCode: 'graph TD\n  A --> B' } 
    }
    const invalidSelection: MediaSourceSelection = { 
      source: 'chartjs', 
      data: {} 
    }
    
    expect(validateMediaSourceSelection(visual, validSelection)).toBe(true)
    expect(validateMediaSourceSelection(visual, invalidSelection)).toBe(false)
  })

  it('validates chartjs selection correctly', () => {
    const chartConfig: ChartConfig = {
      type: 'bar_chart',
      data: { labels: ['A'], datasets: [{ label: 'Test', data: [1] }] },
      interactive: false
    }
    const visual: AccompanyingVisual = { 
      type: 'diagram', 
      description: 'test',
      chartConfig
    }
    const validSelection: MediaSourceSelection = { 
      source: 'chartjs', 
      data: { chartConfig } 
    }
    const invalidSelection: MediaSourceSelection = { 
      source: 'mermaid', 
      data: { mermaidCode: 'test' } 
    }
    
    expect(validateMediaSourceSelection(visual, validSelection)).toBe(true)
    expect(validateMediaSourceSelection(visual, invalidSelection)).toBe(false)
  })

  it('validates unsplash selection for illustration', () => {
    const visual: AccompanyingVisual = { 
      type: 'illustration', 
      description: 'beautiful sunset' 
    }
    const validSelection: MediaSourceSelection = { 
      source: 'unsplash', 
      data: { searchQuery: 'beautiful sunset' } 
    }
    const invalidSelection: MediaSourceSelection = { 
      source: 'lucide', 
      data: { iconName: 'Sun' } 
    }
    
    expect(validateMediaSourceSelection(visual, validSelection)).toBe(true)
    expect(validateMediaSourceSelection(visual, invalidSelection)).toBe(false)
  })
})
