/**
 * 🧪 DIAGRAM PROPERTY TESTS
 * 
 * Feature: visual-interactive-courses
 * Property 5: Diagram Configuration Validity
 * Validates: Requirements 5.1, 5.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  generateMermaidDiagram,
  generateChartConfig,
  generateDiagramFromContent,
  validateDiagramConfig,
  isValidMermaidSyntax,
  isValidChartConfig,
  getDiagramType,
  VALID_MERMAID_PREFIXES,
  type MermaidDiagramType
} from '../diagram-generator'
import type { ChartType, ChartConfig } from '../types'

// ═══════════════════════════════════════════════════════════════
// 🎯 GENERATORS
// ═══════════════════════════════════════════════════════════════

const mermaidDiagramTypeArb = fc.constantFrom<MermaidDiagramType>(
  'flowchart',
  'sequence',
  'class',
  'state',
  'er',
  'journey',
  'gantt',
  'pie',
  'git',
  'mindmap',
  'timeline'
)

const chartTypeArb = fc.constantFrom<ChartType>(
  'bar_chart',
  'pie_chart',
  'line_graph',
  'mind_map'
)

const titleArb = fc.string({ minLength: 1, maxLength: 50 })

const itemsArb = fc.array(
  fc.string({ minLength: 1, maxLength: 30 }),
  { minLength: 1, maxLength: 8 }
)

const labelsArb = fc.array(
  fc.string({ minLength: 1, maxLength: 20 }),
  { minLength: 1, maxLength: 10 }
)

const dataArb = fc.array(
  fc.integer({ min: 0, max: 1000 }),
  { minLength: 1, maxLength: 10 }
)

const interactiveArb = fc.boolean()

const contentArb = fc.array(
  fc.lorem({ mode: 'words' }),
  { minLength: 5, maxLength: 50 }
).map(words => words.join(' '))

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - MermaidDiagram
// ═══════════════════════════════════════════════════════════════

describe('Mermaid Diagram Generation', () => {
  /**
   * Property 5.1a: code is non-empty string
   */
  it('should generate non-empty code for all inputs', () => {
    fc.assert(
      fc.property(
        titleArb,
        itemsArb,
        mermaidDiagramTypeArb,
        interactiveArb,
        (title, items, diagramType, interactive) => {
          const diagram = generateMermaidDiagram(title, items, diagramType, interactive)
          
          expect(typeof diagram.code).toBe('string')
          expect(diagram.code.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.1b: code starts with valid mermaid prefix
   */
  it('should generate code with valid mermaid prefix', () => {
    fc.assert(
      fc.property(
        titleArb,
        itemsArb,
        mermaidDiagramTypeArb,
        interactiveArb,
        (title, items, diagramType, interactive) => {
          const diagram = generateMermaidDiagram(title, items, diagramType, interactive)
          
          expect(isValidMermaidSyntax(diagram.code)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.1c: interactive is boolean
   */
  it('should have boolean interactive property', () => {
    fc.assert(
      fc.property(
        titleArb,
        itemsArb,
        mermaidDiagramTypeArb,
        interactiveArb,
        (title, items, diagramType, interactive) => {
          const diagram = generateMermaidDiagram(title, items, diagramType, interactive)
          
          expect(typeof diagram.interactive).toBe('boolean')
          expect(diagram.interactive).toBe(interactive)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.1d: type is always 'mermaid'
   */
  it('should have type mermaid', () => {
    fc.assert(
      fc.property(
        titleArb,
        itemsArb,
        mermaidDiagramTypeArb,
        (title, items, diagramType) => {
          const diagram = generateMermaidDiagram(title, items, diagramType)
          
          expect(diagram.type).toBe('mermaid')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.1e: Generated diagram passes validation
   */
  it('should generate valid diagram that passes validation', () => {
    fc.assert(
      fc.property(
        titleArb,
        itemsArb,
        mermaidDiagramTypeArb,
        interactiveArb,
        (title, items, diagramType, interactive) => {
          const diagram = generateMermaidDiagram(title, items, diagramType, interactive)
          
          expect(validateDiagramConfig(diagram)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - ChartConfig
// ═══════════════════════════════════════════════════════════════

describe('Chart Config Generation', () => {
  /**
   * Property 5.2a: type is valid chart type
   */
  it('should generate valid chart type for all inputs', () => {
    fc.assert(
      fc.property(
        titleArb,
        labelsArb,
        dataArb,
        chartTypeArb,
        interactiveArb,
        (title, labels, data, chartType, interactive) => {
          const chart = generateChartConfig(title, labels, data, chartType, interactive)
          
          expect(['bar_chart', 'pie_chart', 'line_graph', 'mind_map']).toContain(chart.type)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.2b: data.labels is non-empty array of strings
   */
  it('should generate non-empty labels array', () => {
    fc.assert(
      fc.property(
        titleArb,
        labelsArb,
        dataArb,
        chartTypeArb,
        (title, labels, data, chartType) => {
          const chart = generateChartConfig(title, labels, data, chartType)
          
          expect(Array.isArray(chart.data.labels)).toBe(true)
          expect(chart.data.labels.length).toBeGreaterThan(0)
          chart.data.labels.forEach(label => {
            expect(typeof label).toBe('string')
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.2c: data.datasets is non-empty array
   */
  it('should generate non-empty datasets array', () => {
    fc.assert(
      fc.property(
        titleArb,
        labelsArb,
        dataArb,
        chartTypeArb,
        (title, labels, data, chartType) => {
          const chart = generateChartConfig(title, labels, data, chartType)
          
          expect(Array.isArray(chart.data.datasets)).toBe(true)
          expect(chart.data.datasets.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.2d: each dataset has label and data fields
   */
  it('should generate datasets with label and data fields', () => {
    fc.assert(
      fc.property(
        titleArb,
        labelsArb,
        dataArb,
        chartTypeArb,
        (title, labels, data, chartType) => {
          const chart = generateChartConfig(title, labels, data, chartType)
          
          chart.data.datasets.forEach(dataset => {
            expect(typeof dataset.label).toBe('string')
            expect(Array.isArray(dataset.data)).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.2e: interactive is boolean
   */
  it('should have boolean interactive property', () => {
    fc.assert(
      fc.property(
        titleArb,
        labelsArb,
        dataArb,
        chartTypeArb,
        interactiveArb,
        (title, labels, data, chartType, interactive) => {
          const chart = generateChartConfig(title, labels, data, chartType, interactive)
          
          expect(typeof chart.interactive).toBe('boolean')
          expect(chart.interactive).toBe(interactive)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property 5.2f: Generated chart passes validation
   */
  it('should generate valid chart that passes validation', () => {
    fc.assert(
      fc.property(
        titleArb,
        labelsArb,
        dataArb,
        chartTypeArb,
        interactiveArb,
        (title, labels, data, chartType, interactive) => {
          const chart = generateChartConfig(title, labels, data, chartType, interactive)
          
          expect(validateDiagramConfig(chart)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 PROPERTY TESTS - generateDiagramFromContent
// ═══════════════════════════════════════════════════════════════

describe('generateDiagramFromContent', () => {
  /**
   * Property: Always generates valid diagram
   */
  it('should generate valid diagram from any content', () => {
    fc.assert(
      fc.property(
        contentArb,
        fc.constantFrom<'mermaid' | 'chartjs'>('mermaid', 'chartjs'),
        (content, preferredType) => {
          const diagram = generateDiagramFromContent(content, preferredType)
          
          expect(validateDiagramConfig(diagram)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Property: Returns correct type based on preference
   */
  it('should return correct diagram type based on preference', () => {
    fc.assert(
      fc.property(
        contentArb,
        fc.constantFrom<'mermaid' | 'chartjs'>('mermaid', 'chartjs'),
        (content, preferredType) => {
          const diagram = generateDiagramFromContent(content, preferredType)
          
          expect(getDiagramType(diagram)).toBe(preferredType)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 UNIT TESTS (Edge Cases)
// ═══════════════════════════════════════════════════════════════

describe('Diagram Edge Cases', () => {
  describe('isValidMermaidSyntax', () => {
    it('returns true for valid flowchart', () => {
      expect(isValidMermaidSyntax('graph TD\n    A --> B')).toBe(true)
      expect(isValidMermaidSyntax('flowchart LR\n    A --> B')).toBe(true)
    })

    it('returns true for valid sequence diagram', () => {
      expect(isValidMermaidSyntax('sequenceDiagram\n    A->>B: Hello')).toBe(true)
    })

    it('returns true for valid class diagram', () => {
      expect(isValidMermaidSyntax('classDiagram\n    class Animal')).toBe(true)
    })

    it('returns true for valid pie chart', () => {
      expect(isValidMermaidSyntax('pie title Test\n    "A" : 50')).toBe(true)
    })

    it('returns false for empty string', () => {
      expect(isValidMermaidSyntax('')).toBe(false)
    })

    it('returns false for null/undefined', () => {
      expect(isValidMermaidSyntax(null as unknown as string)).toBe(false)
      expect(isValidMermaidSyntax(undefined as unknown as string)).toBe(false)
    })

    it('returns false for invalid prefix', () => {
      expect(isValidMermaidSyntax('invalid\n    A --> B')).toBe(false)
      expect(isValidMermaidSyntax('random text')).toBe(false)
    })

    it('is case insensitive for prefixes', () => {
      expect(isValidMermaidSyntax('GRAPH TD\n    A --> B')).toBe(true)
      expect(isValidMermaidSyntax('Graph TD\n    A --> B')).toBe(true)
    })
  })

  describe('isValidChartConfig', () => {
    it('returns true for valid config', () => {
      const validConfig: ChartConfig = {
        type: 'bar_chart',
        data: {
          labels: ['A', 'B', 'C'],
          datasets: [{ label: 'Test', data: [1, 2, 3] }]
        },
        interactive: true
      }
      expect(isValidChartConfig(validConfig)).toBe(true)
    })

    it('returns false for invalid type', () => {
      const invalidConfig = {
        type: 'invalid_type' as ChartType,
        data: {
          labels: ['A'],
          datasets: [{ label: 'Test', data: [1] }]
        },
        interactive: true
      }
      expect(isValidChartConfig(invalidConfig)).toBe(false)
    })

    it('returns false for empty labels', () => {
      const invalidConfig: ChartConfig = {
        type: 'bar_chart',
        data: {
          labels: [],
          datasets: [{ label: 'Test', data: [1] }]
        },
        interactive: true
      }
      expect(isValidChartConfig(invalidConfig)).toBe(false)
    })

    it('returns false for empty datasets', () => {
      const invalidConfig: ChartConfig = {
        type: 'bar_chart',
        data: {
          labels: ['A'],
          datasets: []
        },
        interactive: true
      }
      expect(isValidChartConfig(invalidConfig)).toBe(false)
    })

    it('returns false for missing data field', () => {
      const invalidConfig = {
        type: 'bar_chart',
        interactive: true
      } as ChartConfig
      expect(isValidChartConfig(invalidConfig)).toBe(false)
    })

    it('returns false for non-boolean interactive', () => {
      const invalidConfig = {
        type: 'bar_chart',
        data: {
          labels: ['A'],
          datasets: [{ label: 'Test', data: [1] }]
        },
        interactive: 'yes' as unknown as boolean
      }
      expect(isValidChartConfig(invalidConfig)).toBe(false)
    })
  })

  describe('generateMermaidDiagram', () => {
    it('handles empty items array', () => {
      const diagram = generateMermaidDiagram('Test', [])
      expect(isValidMermaidSyntax(diagram.code)).toBe(true)
    })

    it('generates different diagram types', () => {
      const types: MermaidDiagramType[] = ['flowchart', 'sequence', 'class', 'pie', 'mindmap']
      
      types.forEach(type => {
        const diagram = generateMermaidDiagram('Test', ['A', 'B', 'C'], type)
        expect(isValidMermaidSyntax(diagram.code)).toBe(true)
      })
    })

    it('includes title in output', () => {
      const diagram = generateMermaidDiagram('My Title', ['A', 'B'])
      expect(diagram.code).toContain('My Title')
    })
  })

  describe('generateChartConfig', () => {
    it('handles empty labels array', () => {
      const chart = generateChartConfig('Test', [], [])
      expect(isValidChartConfig(chart)).toBe(true)
      expect(chart.data.labels.length).toBeGreaterThan(0)
    })

    it('generates colors for each label', () => {
      const chart = generateChartConfig('Test', ['A', 'B', 'C'], [1, 2, 3])
      expect(chart.data.datasets[0].backgroundColor).toBeDefined()
      expect(chart.data.datasets[0].backgroundColor!.length).toBe(3)
    })

    it('uses provided title as dataset label', () => {
      const chart = generateChartConfig('My Chart', ['A'], [1])
      expect(chart.data.datasets[0].label).toBe('My Chart')
    })
  })

  describe('getDiagramType', () => {
    it('returns mermaid for MermaidDiagram', () => {
      const diagram = generateMermaidDiagram('Test', ['A', 'B'])
      expect(getDiagramType(diagram)).toBe('mermaid')
    })

    it('returns chartjs for ChartConfig', () => {
      const chart = generateChartConfig('Test', ['A'], [1])
      expect(getDiagramType(chart)).toBe('chartjs')
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// 🧪 VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('validateDiagramConfig', () => {
  it('validates MermaidDiagram correctly', () => {
    const validMermaid = {
      type: 'mermaid' as const,
      code: 'graph TD\n    A --> B',
      interactive: true
    }
    expect(validateDiagramConfig(validMermaid)).toBe(true)
    
    const invalidMermaid = {
      type: 'mermaid' as const,
      code: 'invalid code',
      interactive: true
    }
    expect(validateDiagramConfig(invalidMermaid)).toBe(false)
  })

  it('validates ChartConfig correctly', () => {
    const validChart: ChartConfig = {
      type: 'bar_chart',
      data: {
        labels: ['A'],
        datasets: [{ label: 'Test', data: [1] }]
      },
      interactive: true
    }
    expect(validateDiagramConfig(validChart)).toBe(true)
    
    const invalidChart: ChartConfig = {
      type: 'bar_chart',
      data: {
        labels: [],
        datasets: []
      },
      interactive: true
    }
    expect(validateDiagramConfig(invalidChart)).toBe(false)
  })
})
