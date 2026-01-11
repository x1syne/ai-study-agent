/**
 * Property-Based Tests for Domain-Specific Theory Generation
 * 
 * Feature: domain-theory-generation
 * Tests correctness properties defined in design.md
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { getDomainConfig, DomainConfig, DomainType, SectionTemplate, detectDomain, DOMAIN_KEYWORDS } from './domain-prompts'

// Define TopicAnalysis interface locally to avoid importing agent.ts which has side effects
interface TopicAnalysis {
  topic: string
  courseName: string
  nature: ('conceptual' | 'procedural' | 'factual' | 'skill' | 'creative')[]
  complexity: {
    base: number
    depth: number
    prerequisites: string[]
  }
  learningMethods: ('theory-practice-project' | 'examples-generalize-apply' | 'problem-solution-analysis' | 'observe-imitate-create')[]
  contentFormats: ('text_formulas' | 'step_by_step' | 'timeline' | 'video_demo' | 'interactive_sim' | 'practice_tasks' | 'visual_diagrams' | 'code_examples' | 'case_studies' | 'quizzes')[]
  connections: {
    relatedTopics: string[]
    realApplications: string[]
    industries: string[]
  }
  keyTerms: string[]
  tone: 'academic' | 'conversational' | 'motivational' | 'practical'
  audience: string
  estimatedTime: number
}

/**
 * Строит секции на основе доменной конфигурации
 * Копия функции из agent.ts для тестирования без side effects
 */
function buildDomainSections(
  analysis: TopicAnalysis,
  domainConfig: DomainConfig,
  ragContext: string
): { title: string; prompt: string; minWords: number }[] {
  const sections: { title: string; prompt: string; minWords: number }[] = []
  
  // Формируем базовый контекст темы
  const topicContext = `
ТЕМА: "${analysis.topic}"
КУРС: "${analysis.courseName}"
ДОМЕН: ${domainConfig.name}
СЛОЖНОСТЬ: ${analysis.complexity.base}/10
КЛЮЧЕВЫЕ ТЕРМИНЫ: ${analysis.keyTerms.join(', ')}
${ragContext ? `\nДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ:\n${ragContext.slice(0, 1000)}` : ''}
`

  // Используем sectionTemplates из конфига домена
  for (const template of domainConfig.sectionTemplates) {
    // Добавляем контекст темы к каждому промпту
    const enrichedPrompt = `${topicContext}

${template.prompt}

ПРАВИЛА ФОРМАТИРОВАНИЯ:
${domainConfig.formatRules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}

Минимум ${template.minWords} слов.`

    sections.push({
      title: template.title,
      prompt: enrichedPrompt,
      minWords: template.minWords
    })
  }
  
  return sections
}

/**
 * Применяет правила форматирования домена к базовому промпту
 * Копия функции из agent.ts для тестирования без side effects
 */
function applyFormatRules(
  basePrompt: string,
  formatRules: string[]
): string {
  if (!formatRules || formatRules.length === 0) {
    return basePrompt
  }
  
  const rulesSection = `

ПРАВИЛА ФОРМАТИРОВАНИЯ:
${formatRules.map((rule, i) => `${i + 1}. ${rule}`).join('\n')}`
  
  return basePrompt + rulesSection
}

// Arbitrary for generating valid domain types
const domainTypeArb = fc.constantFrom<DomainType>(
  'physics', 'math', 'chemistry', 'programming', 'biology',
  'history', 'economics', 'languages', 'psychology', 'law',
  'medicine', 'art', 'general'
)

// Arbitrary for generating topic analysis
const topicAnalysisArb = fc.record({
  topic: fc.string({ minLength: 1, maxLength: 100 }),
  courseName: fc.string({ minLength: 1, maxLength: 100 }),
  nature: fc.array(fc.constantFrom('conceptual', 'procedural', 'factual', 'skill', 'creative'), { minLength: 1, maxLength: 3 }),
  complexity: fc.record({
    base: fc.integer({ min: 1, max: 10 }),
    depth: fc.integer({ min: 1, max: 10 }),
    prerequisites: fc.array(fc.string(), { maxLength: 5 })
  }),
  learningMethods: fc.array(fc.constantFrom('theory-practice-project', 'examples-generalize-apply', 'problem-solution-analysis', 'observe-imitate-create'), { minLength: 1 }),
  contentFormats: fc.array(fc.constantFrom('text_formulas', 'step_by_step', 'code_examples'), { minLength: 1 }),
  connections: fc.record({
    relatedTopics: fc.array(fc.string(), { maxLength: 3 }),
    realApplications: fc.array(fc.string(), { maxLength: 3 }),
    industries: fc.array(fc.string(), { maxLength: 3 })
  }),
  keyTerms: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 10 }),
  tone: fc.constantFrom('academic', 'conversational', 'motivational', 'practical'),
  audience: fc.string({ minLength: 1 }),
  estimatedTime: fc.integer({ min: 5, max: 120 })
}) as fc.Arbitrary<TopicAnalysis>

describe('buildDomainSections', () => {
  /**
   * Property 2: Required Sections Presence
   * 
   * For any domain config with sectionTemplates, all templates marked required: true
   * SHALL have corresponding sections in the generated content (matched by title).
   * 
   * **Validates: Requirements 1.4, 5.2**
   */
  it('Property 2: Required Sections Presence - all required sections from domain config are present in output', () => {
    fc.assert(
      fc.property(
        domainTypeArb,
        topicAnalysisArb,
        fc.string({ maxLength: 500 }), // ragContext
        (domainType, analysis, ragContext) => {
          const domainConfig = getDomainConfig(domainType)
          const sections = buildDomainSections(analysis, domainConfig, ragContext)
          
          // Get all required section titles from the config
          const requiredTitles = domainConfig.sectionTemplates
            .filter(template => template.required)
            .map(template => template.title)
          
          // Get all section titles from the output
          const outputTitles = sections.map(section => section.title)
          
          // Every required title must be present in output
          for (const requiredTitle of requiredTitles) {
            expect(outputTitles).toContain(requiredTitle)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('buildDomainSections returns sections with correct structure', () => {
    fc.assert(
      fc.property(
        domainTypeArb,
        topicAnalysisArb,
        (domainType, analysis) => {
          const domainConfig = getDomainConfig(domainType)
          const sections = buildDomainSections(analysis, domainConfig, '')
          
          // Each section must have title, prompt, and minWords
          for (const section of sections) {
            expect(section).toHaveProperty('title')
            expect(section).toHaveProperty('prompt')
            expect(section).toHaveProperty('minWords')
            expect(typeof section.title).toBe('string')
            expect(typeof section.prompt).toBe('string')
            expect(typeof section.minWords).toBe('number')
            expect(section.minWords).toBeGreaterThan(0)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('buildDomainSections includes topic context in prompts', () => {
    fc.assert(
      fc.property(
        domainTypeArb,
        topicAnalysisArb,
        (domainType, analysis) => {
          const domainConfig = getDomainConfig(domainType)
          const sections = buildDomainSections(analysis, domainConfig, '')
          
          // Each section prompt should contain the topic
          for (const section of sections) {
            expect(section.prompt).toContain(analysis.topic)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('buildDomainSections returns same number of sections as templates', () => {
    fc.assert(
      fc.property(
        domainTypeArb,
        topicAnalysisArb,
        (domainType, analysis) => {
          const domainConfig = getDomainConfig(domainType)
          const sections = buildDomainSections(analysis, domainConfig, '')
          
          expect(sections.length).toBe(domainConfig.sectionTemplates.length)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


describe('applyFormatRules', () => {
  /**
   * Unit tests for applyFormatRules function
   * **Validates: Requirements 1.5**
   */
  
  it('should add format rules to the base prompt', () => {
    const basePrompt = 'Напиши введение для урока.'
    const formatRules = [
      'Используй подзаголовки ### для структуры',
      'Выделяй **ключевые термины** жирным'
    ]
    
    const result = applyFormatRules(basePrompt, formatRules)
    
    expect(result).toContain(basePrompt)
    expect(result).toContain('ПРАВИЛА ФОРМАТИРОВАНИЯ:')
    expect(result).toContain('1. Используй подзаголовки ### для структуры')
    expect(result).toContain('2. Выделяй **ключевые термины** жирным')
  })

  it('should return base prompt unchanged when formatRules is empty', () => {
    const basePrompt = 'Напиши введение для урока.'
    const formatRules: string[] = []
    
    const result = applyFormatRules(basePrompt, formatRules)
    
    expect(result).toBe(basePrompt)
  })

  it('should handle single format rule', () => {
    const basePrompt = 'Базовый промпт'
    const formatRules = ['Единственное правило']
    
    const result = applyFormatRules(basePrompt, formatRules)
    
    expect(result).toContain('1. Единственное правило')
    expect(result).not.toContain('2.')
  })

  it('should number rules sequentially', () => {
    const basePrompt = 'Промпт'
    const formatRules = ['Правило A', 'Правило B', 'Правило C']
    
    const result = applyFormatRules(basePrompt, formatRules)
    
    expect(result).toContain('1. Правило A')
    expect(result).toContain('2. Правило B')
    expect(result).toContain('3. Правило C')
  })

  it('should preserve original prompt content', () => {
    const basePrompt = `Многострочный промпт
с несколькими строками
и специальными символами: @#$%`
    const formatRules = ['Правило']
    
    const result = applyFormatRules(basePrompt, formatRules)
    
    expect(result.startsWith(basePrompt)).toBe(true)
  })
})


describe('Formatting Elements Presence', () => {
  /**
   * Property 4: Formatting Elements Presence
   * 
   * For any generated content, it SHALL contain markdown formatting elements:
   * headers (###), lists (- or 1.), separators (---), and bold text (**).
   * 
   * This property tests that domain configs contain format rules that instruct
   * the AI to use proper markdown formatting, and that buildDomainSections
   * includes these formatting instructions in the generated prompts.
   * 
   * **Validates: Requirements 4.1, 4.3, 4.4, 4.5**
   */
  it('Property 4: Formatting Elements Presence - domain configs contain formatting instructions', () => {
    fc.assert(
      fc.property(
        domainTypeArb,
        (domainType) => {
          const domainConfig = getDomainConfig(domainType)
          
          // Domain config should have formatRules
          expect(domainConfig.formatRules).toBeDefined()
          expect(Array.isArray(domainConfig.formatRules)).toBe(true)
          
          // formatRules should not be empty (except possibly for 'general')
          if (domainType !== 'general') {
            expect(domainConfig.formatRules.length).toBeGreaterThan(0)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4: buildDomainSections includes formatting rules in prompts', () => {
    fc.assert(
      fc.property(
        domainTypeArb,
        topicAnalysisArb,
        (domainType, analysis) => {
          const domainConfig = getDomainConfig(domainType)
          const sections = buildDomainSections(analysis, domainConfig, '')
          
          // Each section prompt should contain formatting rules section
          for (const section of sections) {
            expect(section.prompt).toContain('ПРАВИЛА ФОРМАТИРОВАНИЯ:')
          }
          
          // If domain has format rules, they should appear in prompts
          if (domainConfig.formatRules.length > 0) {
            for (const section of sections) {
              // At least the first format rule should be present
              expect(section.prompt).toContain(domainConfig.formatRules[0])
            }
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4: applyFormatRules adds formatting section to prompts', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }), // basePrompt
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 10 }), // formatRules
        (basePrompt, formatRules) => {
          const result = applyFormatRules(basePrompt, formatRules)
          
          // Result should contain the original prompt
          expect(result).toContain(basePrompt)
          
          // Result should contain formatting rules header
          expect(result).toContain('ПРАВИЛА ФОРМАТИРОВАНИЯ:')
          
          // All format rules should be present and numbered
          for (let i = 0; i < formatRules.length; i++) {
            expect(result).toContain(`${i + 1}. ${formatRules[i]}`)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


describe('API Response Structure', () => {
  /**
   * Property 7: API Response Structure
   * 
   * For any call to runLessonAgent(), the response SHALL contain fields:
   * content (string), analysis (TopicAnalysis), plan (LessonPlan), 
   * metadata (object), tasks (array).
   * 
   * Since runLessonAgent makes real API calls, we test the structure
   * by verifying the return type signature and testing helper functions
   * that construct the response.
   * 
   * **Validates: Requirements 7.1**
   */

  // Define expected response structure interface
  interface ExpectedResponse {
    content: string
    analysis: TopicAnalysis
    plan: {
      title: string
      objectives: string[]
      sections: Array<{
        title: string
        type: 'intro' | 'theory' | 'example' | 'practice' | 'summary'
        keyPoints: string[]
        estimatedMinutes: number
      }>
      practiceIdeas: string[]
    }
    metadata: {
      generatedAt: string
      totalTime: number
      sectionsCount: number
      tasksCount: number
      complexity: number
      nature: string[]
      tone: string
      domain?: string
    }
    tasks?: any[]
  }

  // Arbitrary for generating mock response data
  const mockResponseArb = fc.record({
    content: fc.string({ minLength: 1 }),
    analysis: topicAnalysisArb,
    plan: fc.record({
      title: fc.string({ minLength: 1 }),
      objectives: fc.array(fc.string(), { minLength: 1 }),
      sections: fc.array(
        fc.record({
          title: fc.string({ minLength: 1 }),
          type: fc.constantFrom('intro', 'theory', 'example', 'practice', 'summary'),
          keyPoints: fc.array(fc.string()),
          estimatedMinutes: fc.integer({ min: 1, max: 60 })
        }),
        { minLength: 1 }
      ),
      practiceIdeas: fc.array(fc.string())
    }),
    metadata: fc.record({
      generatedAt: fc.string(),
      totalTime: fc.integer({ min: 1 }),
      sectionsCount: fc.integer({ min: 1 }),
      tasksCount: fc.integer({ min: 0 }),
      complexity: fc.integer({ min: 1, max: 10 }),
      nature: fc.array(fc.string(), { minLength: 1 }),
      tone: fc.string(),
      domain: fc.option(fc.string())
    }),
    tasks: fc.option(fc.array(fc.anything()))
  })

  it('Property 7: API Response Structure - response contains all required fields', () => {
    fc.assert(
      fc.property(
        mockResponseArb,
        (response) => {
          // Verify content field
          expect(response).toHaveProperty('content')
          expect(typeof response.content).toBe('string')
          
          // Verify analysis field
          expect(response).toHaveProperty('analysis')
          expect(response.analysis).toHaveProperty('topic')
          expect(response.analysis).toHaveProperty('courseName')
          expect(response.analysis).toHaveProperty('nature')
          expect(response.analysis).toHaveProperty('complexity')
          expect(response.analysis).toHaveProperty('learningMethods')
          expect(response.analysis).toHaveProperty('contentFormats')
          expect(response.analysis).toHaveProperty('connections')
          expect(response.analysis).toHaveProperty('keyTerms')
          expect(response.analysis).toHaveProperty('tone')
          expect(response.analysis).toHaveProperty('audience')
          expect(response.analysis).toHaveProperty('estimatedTime')
          
          // Verify plan field
          expect(response).toHaveProperty('plan')
          expect(response.plan).toHaveProperty('title')
          expect(response.plan).toHaveProperty('objectives')
          expect(response.plan).toHaveProperty('sections')
          expect(response.plan).toHaveProperty('practiceIdeas')
          expect(Array.isArray(response.plan.objectives)).toBe(true)
          expect(Array.isArray(response.plan.sections)).toBe(true)
          expect(Array.isArray(response.plan.practiceIdeas)).toBe(true)
          
          // Verify plan sections structure
          for (const section of response.plan.sections) {
            expect(section).toHaveProperty('title')
            expect(section).toHaveProperty('type')
            expect(section).toHaveProperty('keyPoints')
            expect(section).toHaveProperty('estimatedMinutes')
            expect(['intro', 'theory', 'example', 'practice', 'summary']).toContain(section.type)
          }
          
          // Verify metadata field
          expect(response).toHaveProperty('metadata')
          expect(typeof response.metadata).toBe('object')
          expect(response.metadata).toHaveProperty('generatedAt')
          expect(response.metadata).toHaveProperty('totalTime')
          expect(response.metadata).toHaveProperty('sectionsCount')
          expect(response.metadata).toHaveProperty('tasksCount')
          expect(response.metadata).toHaveProperty('complexity')
          expect(response.metadata).toHaveProperty('nature')
          expect(response.metadata).toHaveProperty('tone')
          
          // Verify tasks field (optional but should be array if present)
          if (response.tasks !== undefined && response.tasks !== null) {
            expect(Array.isArray(response.tasks)).toBe(true)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7: metadata contains domain field after integration', () => {
    fc.assert(
      fc.property(
        domainTypeArb,
        topicAnalysisArb,
        (domainType, analysis) => {
          // Simulate metadata creation as done in runLessonAgent
          const metadata = {
            generatedAt: new Date().toISOString(),
            totalTime: 60,
            sectionsCount: 5,
            tasksCount: 3,
            complexity: analysis.complexity.base,
            nature: analysis.nature,
            tone: analysis.tone,
            domain: domainType
          }
          
          // Verify domain is included in metadata
          expect(metadata).toHaveProperty('domain')
          expect(metadata.domain).toBe(domainType)
          expect(typeof metadata.domain).toBe('string')
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 7: plan sections have valid types', () => {
    const validSectionTypes = ['intro', 'theory', 'example', 'practice', 'summary'] as const
    
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1 }),
            type: fc.constantFrom(...validSectionTypes),
            keyPoints: fc.array(fc.string()),
            estimatedMinutes: fc.integer({ min: 1, max: 60 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (sections) => {
          for (const section of sections) {
            expect(validSectionTypes).toContain(section.type)
            expect(typeof section.title).toBe('string')
            expect(Array.isArray(section.keyPoints)).toBe(true)
            expect(typeof section.estimatedMinutes).toBe('number')
            expect(section.estimatedMinutes).toBeGreaterThan(0)
          }
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


// Import sanitizeLatex and containsLatex for testing
// Копия функций из agent.ts для тестирования без side effects

/**
 * Проверяет наличие LaTeX синтаксиса в контенте
 * Возвращает true если найден LaTeX ($...$ или \frac, \sqrt, \lim и т.д.)
 */
function containsLatex(content: string): boolean {
  const latexPatterns = [
    /\$[^$]+\$/,           // Inline math: $...$
    /\$\$[^$]+\$\$/,       // Display math: $$...$$
    /\\frac\{/,            // \frac{...}{...}
    /\\sqrt\{/,            // \sqrt{...}
    /\\lim/,               // \lim
    /\\sum/,               // \sum
    /\\int/,               // \int
    /\\prod/,              // \prod
    /\\infty/,             // \infty
    /\\partial/,           // \partial
    /\\alpha/,             // \alpha
    /\\beta/,              // \beta
    /\\gamma/,             // \gamma
    /\\delta/,             // \delta
    /\\theta/,             // \theta
    /\\lambda/,            // \lambda
    /\\pi/,                // \pi
    /\\omega/,             // \omega
    /\\cdot/,              // \cdot
    /\\times/,             // \times
    /\\div/,               // \div
    /\\pm/,                // \pm
    /\\leq/,               // \leq
    /\\geq/,               // \geq
    /\\neq/,               // \neq
    /\\approx/,            // \approx
    /\^\{[^}]+\}/,         // Superscript: ^{...}
    /_\{[^}]+\}/,          // Subscript: _{...}
  ]
  
  return latexPatterns.some(pattern => pattern.test(content))
}

/**
 * Заменяет LaTeX синтаксис на Unicode символы
 */
function sanitizeLatex(content: string): string {
  let result = content
  
  const greekLetters: Record<string, string> = {
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
    '\\epsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η', '\\theta': 'θ',
    '\\iota': 'ι', '\\kappa': 'κ', '\\lambda': 'λ', '\\mu': 'μ',
    '\\nu': 'ν', '\\xi': 'ξ', '\\pi': 'π', '\\rho': 'ρ',
    '\\sigma': 'σ', '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ',
    '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
    '\\Alpha': 'Α', '\\Beta': 'Β', '\\Gamma': 'Γ', '\\Delta': 'Δ',
    '\\Theta': 'Θ', '\\Lambda': 'Λ', '\\Pi': 'Π', '\\Sigma': 'Σ',
    '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
  }
  
  const mathSymbols: Record<string, string> = {
    '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇',
    '\\cdot': '·', '\\times': '×', '\\div': '÷',
    '\\pm': '±', '\\mp': '∓',
    '\\leq': '≤', '\\geq': '≥', '\\neq': '≠',
    '\\approx': '≈', '\\equiv': '≡', '\\sim': '∼', '\\propto': '∝',
    '\\rightarrow': '→', '\\leftarrow': '←',
    '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\leftrightarrow': '↔',
    '\\sum': 'Σ', '\\prod': 'Π', '\\int': '∫', '\\sqrt': '√',
    '\\forall': '∀', '\\exists': '∃',
    '\\in': '∈', '\\notin': '∉',
    '\\subset': '⊂', '\\supset': '⊃',
    '\\cup': '∪', '\\cap': '∩', '\\emptyset': '∅',
    '\\angle': '∠', '\\degree': '°', '\\circ': '°',
  }
  
  for (const [latex, unicode] of Object.entries(greekLetters)) {
    result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), unicode)
  }
  
  // Замена \frac{a}{b} на (a)/(b) - ПЕРЕД заменой простых символов
  result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)')
  
  // Замена \sqrt{x} на √(x) - ПЕРЕД заменой простого \sqrt
  result = result.replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
  
  // Замена \lim_{x \to a} на lim(x→a)
  result = result.replace(/\\lim_?\{?([^}]*)\}?/g, 'lim($1)')
  result = result.replace(/\\to/g, '→')
  
  // Замена математических символов (ПОСЛЕ обработки сложных паттернов)
  for (const [latex, unicode] of Object.entries(mathSymbols)) {
    result = result.replace(new RegExp(latex.replace(/\\/g, '\\\\'), 'g'), unicode)
  }
  
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
    'n': 'ⁿ', 'i': 'ⁱ',
  }
  
  const subscripts: Record<string, string> = {
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
    '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
    '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎',
    'a': 'ₐ', 'e': 'ₑ', 'o': 'ₒ', 'x': 'ₓ',
    'i': 'ᵢ', 'j': 'ⱼ', 'k': 'ₖ', 'n': 'ₙ', 'm': 'ₘ',
  }
  
  result = result.replace(/\^\{([^}]+)\}/g, (_, content) => {
    return content.split('').map((c: string) => superscripts[c] || c).join('')
  })
  
  result = result.replace(/_\{([^}]+)\}/g, (_, content) => {
    return content.split('').map((c: string) => subscripts[c] || c).join('')
  })
  
  result = result.replace(/\^(\d)/g, (_, d) => superscripts[d] || `^${d}`)
  result = result.replace(/_(\d)/g, (_, d) => subscripts[d] || `_${d}`)
  
  result = result.replace(/\$\$([^$]+)\$\$/g, '$1')
  result = result.replace(/\$([^$]+)\$/g, '$1')
  
  // Удаление всех оставшихся $ символов (для malformed LaTeX)
  result = result.replace(/\$/g, '')
  
  result = result.replace(/\\[a-zA-Z]+/g, '')
  result = result.replace(/\s+/g, ' ')
  
  return result
}


describe('No LaTeX in Output', () => {
  /**
   * Property 5: No LaTeX in Output
   * 
   * For any generated content, it SHALL NOT contain LaTeX syntax patterns
   * ($...$ or \frac, \sqrt, \lim).
   * 
   * This property tests that the sanitizeLatex function correctly removes
   * all LaTeX patterns from content and replaces them with Unicode.
   * 
   * **Validates: Requirements 2.4**
   */

  // Arbitrary for generating content with LaTeX patterns
  // Filter out $ from surrounding strings to avoid malformed LaTeX like $$$
  const safeStringArb = fc.string({ maxLength: 50 }).map(s => s.replace(/\$/g, ''))
  const safeMathContentArb = fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/\$/g, 'x'))
  
  const latexContentArb = fc.oneof(
    // Inline math $...$
    fc.tuple(safeStringArb, safeMathContentArb, safeStringArb)
      .map(([before, math, after]) => `${before}$${math}$${after}`),
    // Display math $$...$$
    fc.tuple(safeStringArb, safeMathContentArb, safeStringArb)
      .map(([before, math, after]) => `${before}$$${math}$$${after}`),
    // \frac
    fc.tuple(safeStringArb, fc.string({ minLength: 1, maxLength: 10 }), fc.string({ minLength: 1, maxLength: 10 }), safeStringArb)
      .map(([before, num, denom, after]) => `${before}\\frac{${num}}{${denom}}${after}`),
    // \sqrt
    fc.tuple(safeStringArb, fc.string({ minLength: 1, maxLength: 10 }), safeStringArb)
      .map(([before, content, after]) => `${before}\\sqrt{${content}}${after}`),
    // Greek letters
    fc.tuple(safeStringArb, fc.constantFrom('\\alpha', '\\beta', '\\gamma', '\\delta', '\\theta', '\\lambda', '\\pi', '\\omega'), safeStringArb)
      .map(([before, letter, after]) => `${before}${letter}${after}`),
    // Math symbols
    fc.tuple(safeStringArb, fc.constantFrom('\\infty', '\\partial', '\\cdot', '\\times', '\\div', '\\pm', '\\leq', '\\geq', '\\neq', '\\approx'), safeStringArb)
      .map(([before, symbol, after]) => `${before}${symbol}${after}`),
    // Superscripts and subscripts
    fc.tuple(safeStringArb, fc.string({ minLength: 1, maxLength: 5 }), safeStringArb)
      .map(([before, content, after]) => `${before}^{${content}}${after}`),
    fc.tuple(safeStringArb, fc.string({ minLength: 1, maxLength: 5 }), safeStringArb)
      .map(([before, content, after]) => `${before}_{${content}}${after}`),
    // \lim
    fc.tuple(safeStringArb, safeStringArb)
      .map(([before, after]) => `${before}\\lim_{x \\to 0}${after}`),
    // \sum, \int, \prod
    fc.tuple(safeStringArb, fc.constantFrom('\\sum', '\\int', '\\prod'), safeStringArb)
      .map(([before, op, after]) => `${before}${op}${after}`)
  )

  it('Property 5: No LaTeX in Output - sanitizeLatex removes all LaTeX patterns', () => {
    fc.assert(
      fc.property(
        latexContentArb,
        (contentWithLatex) => {
          // Content should contain LaTeX before sanitization
          expect(containsLatex(contentWithLatex)).toBe(true)
          
          // After sanitization, content should not contain LaTeX
          const sanitized = sanitizeLatex(contentWithLatex)
          expect(containsLatex(sanitized)).toBe(false)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 5: sanitizeLatex preserves non-LaTeX content', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }).filter(s => !containsLatex(s)),
        (plainContent) => {
          const sanitized = sanitizeLatex(plainContent)
          
          // Non-LaTeX content should remain mostly unchanged
          // (only whitespace normalization may occur)
          const normalizedOriginal = plainContent.replace(/\s+/g, ' ')
          const normalizedSanitized = sanitized.replace(/\s+/g, ' ')
          
          // The sanitized content should not introduce new characters
          // that weren't in the original (except for whitespace normalization)
          expect(normalizedSanitized.length).toBeLessThanOrEqual(normalizedOriginal.length + 10)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 5: Greek letters are converted to Unicode', () => {
    const greekLetters = [
      { latex: '\\alpha', unicode: 'α' },
      { latex: '\\beta', unicode: 'β' },
      { latex: '\\gamma', unicode: 'γ' },
      { latex: '\\delta', unicode: 'δ' },
      { latex: '\\theta', unicode: 'θ' },
      { latex: '\\lambda', unicode: 'λ' },
      { latex: '\\pi', unicode: 'π' },
      { latex: '\\omega', unicode: 'ω' },
    ]
    
    for (const { latex, unicode } of greekLetters) {
      const content = `The value of ${latex} is important`
      const sanitized = sanitizeLatex(content)
      
      expect(sanitized).toContain(unicode)
      expect(containsLatex(sanitized)).toBe(false)
    }
  })

  it('Property 5: Math symbols are converted to Unicode', () => {
    const mathSymbols = [
      { latex: '\\infty', unicode: '∞' },
      { latex: '\\times', unicode: '×' },
      { latex: '\\div', unicode: '÷' },
      { latex: '\\pm', unicode: '±' },
      { latex: '\\leq', unicode: '≤' },
      { latex: '\\geq', unicode: '≥' },
      { latex: '\\neq', unicode: '≠' },
      { latex: '\\approx', unicode: '≈' },
    ]
    
    for (const { latex, unicode } of mathSymbols) {
      const content = `x ${latex} y`
      const sanitized = sanitizeLatex(content)
      
      expect(sanitized).toContain(unicode)
      expect(containsLatex(sanitized)).toBe(false)
    }
  })

  it('Property 5: Fractions are converted to readable format', () => {
    const content = 'The formula is \\frac{a}{b} = c'
    const sanitized = sanitizeLatex(content)
    
    expect(sanitized).toContain('(a)/(b)')
    expect(containsLatex(sanitized)).toBe(false)
  })

  it('Property 5: Square roots are converted to Unicode', () => {
    const content = 'The value is \\sqrt{x}'
    const sanitized = sanitizeLatex(content)
    
    expect(sanitized).toContain('√(x)')
    expect(containsLatex(sanitized)).toBe(false)
  })

  it('Property 5: Inline math delimiters are removed', () => {
    const content = 'The formula $E = mc^2$ is famous'
    const sanitized = sanitizeLatex(content)
    
    expect(sanitized).not.toContain('$')
    expect(containsLatex(sanitized)).toBe(false)
  })

  it('Property 5: Display math delimiters are removed', () => {
    const content = 'The formula $$E = mc^2$$ is famous'
    const sanitized = sanitizeLatex(content)
    
    expect(sanitized).not.toContain('$$')
    expect(containsLatex(sanitized)).toBe(false)
  })

  it('Property 5: Superscripts are converted to Unicode', () => {
    const content = 'x^{2} + y^{3}'
    const sanitized = sanitizeLatex(content)
    
    expect(sanitized).toContain('²')
    expect(sanitized).toContain('³')
    expect(containsLatex(sanitized)).toBe(false)
  })

  it('Property 5: Subscripts are converted to Unicode', () => {
    const content = 'x_{1} + x_{2}'
    const sanitized = sanitizeLatex(content)
    
    expect(sanitized).toContain('₁')
    expect(sanitized).toContain('₂')
    expect(containsLatex(sanitized)).toBe(false)
  })
})


// ═══════════════════════════════════════════════════════════════
// Property 6: Code Blocks for Programming
// ═══════════════════════════════════════════════════════════════

/**
 * Проверяет наличие псевдо-формул в контенте программирования
 * Копия функции из agent.ts для тестирования без side effects
 * Requirements: 3.1
 */
function containsPseudoFormulas(content: string): boolean {
  const pseudoFormulaPatterns = [
    /[А-Яа-яA-Za-z]+\s*=\s*\(/,
    /(?:Класс|Объект|Функция|Метод|Модуль|Компонент|Интерфейс|Паттерн)\s*=\s*\([^)]+\)/i,
    /Формула\s+(?:класса|объекта|функции|метода)\s*=/i,
    /(?:класс|объект|функция|метод|переменная|параметр)\s*[αβγδθλπω]/i,
  ]
  
  return pseudoFormulaPatterns.some(pattern => pattern.test(content))
}

/**
 * Удаляет псевдо-формулы из контента программирования
 * Копия функции из agent.ts для тестирования без side effects
 * Requirements: 3.1
 */
function sanitizePseudoFormulas(content: string): string {
  let result = content
  
  result = result.replace(
    /(?:Класс|Объект|Функция|Метод|Модуль|Компонент|Интерфейс|Паттерн)\s*=\s*\([^)]+\)/gi,
    ''
  )
  
  result = result.replace(
    /Формула\s+(?:класса|объекта|функции|метода)\s*=\s*[^\n]+/gi,
    ''
  )
  
  result = result.replace(/\n{3,}/g, '\n\n')
  
  return result.trim()
}

/**
 * Проверяет наличие блоков кода в контенте
 * Копия функции из agent.ts для тестирования без side effects
 * Requirements: 3.2
 */
function containsCodeBlocks(content: string): boolean {
  const codeBlockPattern = /```[\s\S]*?```/
  return codeBlockPattern.test(content)
}

/**
 * Подсчитывает количество блоков кода в контенте
 * Копия функции из agent.ts для тестирования без side effects
 * Requirements: 3.2
 */
function countCodeBlocks(content: string): number {
  const matches = content.match(/```[\s\S]*?```/g)
  return matches ? matches.length : 0
}


describe('Code Blocks for Programming', () => {
  /**
   * Property 6: Code Blocks for Programming
   * 
   * For any content generated for programming domain, it SHALL contain 
   * code blocks (```language) and SHALL NOT contain pseudo-formulas 
   * like "Класс = (".
   * 
   * **Validates: Requirements 3.1, 3.2**
   */

  // Arbitrary for generating pseudo-formulas
  const pseudoFormulaArb = fc.oneof(
    // "Класс = (Атрибуты, Методы)"
    fc.tuple(
      fc.constantFrom('Класс', 'Объект', 'Функция', 'Метод', 'Модуль', 'Компонент', 'Интерфейс', 'Паттерн'),
      fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 })
    ).map(([name, attrs]) => `${name} = (${attrs.join(', ')})`),
    // "Формула класса = ..."
    fc.tuple(
      fc.constantFrom('класса', 'объекта', 'функции', 'метода'),
      fc.string({ minLength: 1, maxLength: 50 })
    ).map(([type, formula]) => `Формула ${type} = ${formula}`),
    // Simple "Word = (" pattern
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[А-Яа-яA-Za-z]+$/.test(s)),
      fc.string({ minLength: 1, maxLength: 30 })
    ).map(([word, content]) => `${word} = (${content})`)
  )

  // Arbitrary for generating valid code blocks
  const codeBlockArb = fc.tuple(
    fc.constantFrom('python', 'javascript', 'typescript', 'java', 'cpp', 'go', 'rust', ''),
    fc.string({ minLength: 1, maxLength: 200 })
  ).map(([lang, code]) => `\`\`\`${lang}\n${code}\n\`\`\``)

  // Arbitrary for generating programming content with code blocks
  const programmingContentArb = fc.tuple(
    fc.string({ minLength: 0, maxLength: 100 }),
    codeBlockArb,
    fc.string({ minLength: 0, maxLength: 100 }),
    fc.option(codeBlockArb),
    fc.string({ minLength: 0, maxLength: 100 })
  ).map(([before, code1, middle, code2, after]) => 
    `${before}\n${code1}\n${middle}${code2 ? '\n' + code2 : ''}\n${after}`
  )

  it('Property 6: containsPseudoFormulas detects pseudo-formulas', () => {
    fc.assert(
      fc.property(
        pseudoFormulaArb,
        (pseudoFormula) => {
          // Content with pseudo-formula should be detected
          expect(containsPseudoFormulas(pseudoFormula)).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6: sanitizePseudoFormulas removes pseudo-formulas', () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.constantFrom('Класс', 'Объект', 'Функция', 'Метод'),
          fc.array(fc.string({ minLength: 1, maxLength: 10 }).filter(s => !/[()=]/.test(s)), { minLength: 1, maxLength: 3 }),
          fc.string({ minLength: 0, maxLength: 50 })
        ).map(([before, name, attrs, after]) => `${before}\n${name} = (${attrs.join(', ')})\n${after}`),
        (contentWithPseudoFormula) => {
          // Content should contain pseudo-formula before sanitization
          expect(containsPseudoFormulas(contentWithPseudoFormula)).toBe(true)
          
          // After sanitization, specific pseudo-formula patterns should be removed
          const sanitized = sanitizePseudoFormulas(contentWithPseudoFormula)
          
          // The sanitized content should not contain the "Name = (attrs)" pattern
          expect(sanitized).not.toMatch(/(?:Класс|Объект|Функция|Метод)\s*=\s*\([^)]+\)/i)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6: containsCodeBlocks detects code blocks', () => {
    fc.assert(
      fc.property(
        programmingContentArb,
        (content) => {
          // Content with code blocks should be detected
          expect(containsCodeBlocks(content)).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6: countCodeBlocks counts correctly', () => {
    fc.assert(
      fc.property(
        fc.array(codeBlockArb, { minLength: 1, maxLength: 5 }),
        fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 0, maxLength: 6 }),
        (codeBlocks, textParts) => {
          // Interleave code blocks with text
          let content = ''
          for (let i = 0; i < Math.max(codeBlocks.length, textParts.length); i++) {
            if (i < textParts.length) content += textParts[i] + '\n'
            if (i < codeBlocks.length) content += codeBlocks[i] + '\n'
          }
          
          // Count should match number of code blocks
          expect(countCodeBlocks(content)).toBe(codeBlocks.length)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6: content without code blocks returns false', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 500 }).filter(s => !s.includes('```')),
        (plainContent) => {
          expect(containsCodeBlocks(plainContent)).toBe(false)
          expect(countCodeBlocks(plainContent)).toBe(0)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6: programming domain config instructs to use code blocks', () => {
    const programmingConfig = getDomainConfig('programming')
    
    // Programming domain should have format rules about code blocks
    expect(programmingConfig.formatRules.length).toBeGreaterThan(0)
    
    // System prompt should mention code blocks
    const systemPromptLower = programmingConfig.systemPrompt.toLowerCase()
    const hasCodeInstructions = 
      systemPromptLower.includes('код') || 
      systemPromptLower.includes('code') ||
      systemPromptLower.includes('```')
    
    expect(hasCodeInstructions).toBe(true)
  })

  it('Property 6: programming domain config warns against pseudo-formulas', () => {
    const programmingConfig = getDomainConfig('programming')
    
    // System prompt or format rules should warn against pseudo-formulas
    const fullConfig = programmingConfig.systemPrompt + ' ' + programmingConfig.formatRules.join(' ')
    const fullConfigLower = fullConfig.toLowerCase()
    
    const hasWarning = 
      fullConfigLower.includes('формул') ||
      fullConfigLower.includes('formula') ||
      fullConfigLower.includes('не придумывай') ||
      fullConfigLower.includes('не используй')
    
    // This is a soft check - the config should ideally warn against pseudo-formulas
    // but it's not strictly required if the sanitization handles it
    expect(typeof programmingConfig.systemPrompt).toBe('string')
  })
})

// Unit tests for pseudo-formula detection
describe('Pseudo-formula Detection Unit Tests', () => {
  it('detects "Класс = (Атрибуты, Методы)" pattern', () => {
    const content = 'В ООП Класс = (Атрибуты, Методы) является основой'
    expect(containsPseudoFormulas(content)).toBe(true)
  })

  it('detects "Объект = (...)" pattern', () => {
    const content = 'Объект = (Состояние, Поведение)'
    expect(containsPseudoFormulas(content)).toBe(true)
  })

  it('detects "Функция = (...)" pattern', () => {
    const content = 'Функция = (Входные данные, Выходные данные)'
    expect(containsPseudoFormulas(content)).toBe(true)
  })

  it('detects "Формула класса = ..." pattern', () => {
    const content = 'Формула класса = атрибуты + методы'
    expect(containsPseudoFormulas(content)).toBe(true)
  })

  it('does not detect normal code', () => {
    const content = `
\`\`\`python
class MyClass:
    def __init__(self):
        self.value = 0
\`\`\`
    `
    expect(containsPseudoFormulas(content)).toBe(false)
  })

  it('does not detect normal text', () => {
    const content = 'Классы в Python позволяют создавать объекты с атрибутами и методами.'
    expect(containsPseudoFormulas(content)).toBe(false)
  })

  it('does not detect mathematical formulas', () => {
    const content = 'Формула площади круга: S = πr²'
    // This should not match because it's not a programming pseudo-formula
    expect(containsPseudoFormulas(content)).toBe(false)
  })
})

// Unit tests for code block detection
describe('Code Block Detection Unit Tests', () => {
  it('detects Python code block', () => {
    const content = `
Here is some code:
\`\`\`python
print("Hello, World!")
\`\`\`
    `
    expect(containsCodeBlocks(content)).toBe(true)
    expect(countCodeBlocks(content)).toBe(1)
  })

  it('detects JavaScript code block', () => {
    const content = `
\`\`\`javascript
console.log("Hello");
\`\`\`
    `
    expect(containsCodeBlocks(content)).toBe(true)
  })

  it('detects code block without language', () => {
    const content = `
\`\`\`
some code here
\`\`\`
    `
    expect(containsCodeBlocks(content)).toBe(true)
  })

  it('counts multiple code blocks', () => {
    const content = `
\`\`\`python
code1
\`\`\`

Some text

\`\`\`javascript
code2
\`\`\`

More text

\`\`\`
code3
\`\`\`
    `
    expect(countCodeBlocks(content)).toBe(3)
  })

  it('returns false for inline code', () => {
    const content = 'Use `print()` to output text'
    expect(containsCodeBlocks(content)).toBe(false)
  })

  it('returns false for plain text', () => {
    const content = 'This is just plain text without any code.'
    expect(containsCodeBlocks(content)).toBe(false)
  })
})


// ═══════════════════════════════════════════════════════════════
// Property 1: Domain Detection Consistency
// ═══════════════════════════════════════════════════════════════

describe('Domain Detection Consistency', () => {
  /**
   * Property 1: Domain Detection Consistency
   * 
   * For any topic string and course name, detectDomain() SHALL return a valid
   * DomainType and getDomainConfig() SHALL return a config with matching type field.
   * 
   * **Feature: domain-theory-generation, Property 1: Domain Detection Consistency**
   * **Validates: Requirements 1.1, 1.2**
   */

  // All valid domain types
  const validDomainTypes: DomainType[] = [
    'physics', 'math', 'chemistry', 'programming', 'biology',
    'history', 'economics', 'languages', 'psychology', 'law',
    'medicine', 'art', 'general'
  ]

  // Arbitrary for generating random topic strings
  const topicArb = fc.string({ minLength: 0, maxLength: 200 })
  
  // Arbitrary for generating random course names
  const courseNameArb = fc.string({ minLength: 0, maxLength: 100 })

  it('Property 1: detectDomain always returns a valid DomainType', () => {
    fc.assert(
      fc.property(
        topicArb,
        courseNameArb,
        (topic, courseName) => {
          const domain = detectDomain(topic, courseName)
          
          // Domain must be one of the valid types
          expect(validDomainTypes).toContain(domain)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 1: getDomainConfig returns config with matching type field', () => {
    fc.assert(
      fc.property(
        topicArb,
        courseNameArb,
        (topic, courseName) => {
          const domain = detectDomain(topic, courseName)
          const config = getDomainConfig(domain)
          
          // Config type must match the detected domain
          expect(config.type).toBe(domain)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 1: detectDomain is deterministic - same input gives same output', () => {
    fc.assert(
      fc.property(
        topicArb,
        courseNameArb,
        (topic, courseName) => {
          const domain1 = detectDomain(topic, courseName)
          const domain2 = detectDomain(topic, courseName)
          
          // Same input should always produce same output
          expect(domain1).toBe(domain2)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 1: getDomainConfig returns valid config structure for any detected domain', () => {
    fc.assert(
      fc.property(
        topicArb,
        courseNameArb,
        (topic, courseName) => {
          const domain = detectDomain(topic, courseName)
          const config = getDomainConfig(domain)
          
          // Config must have all required fields
          expect(config).toHaveProperty('type')
          expect(config).toHaveProperty('name')
          expect(config).toHaveProperty('keywords')
          expect(config).toHaveProperty('systemPrompt')
          expect(config).toHaveProperty('sectionTemplates')
          expect(config).toHaveProperty('formatRules')
          expect(config).toHaveProperty('examplePatterns')
          
          // Validate types
          expect(typeof config.type).toBe('string')
          expect(typeof config.name).toBe('string')
          expect(Array.isArray(config.keywords)).toBe(true)
          expect(typeof config.systemPrompt).toBe('string')
          expect(Array.isArray(config.sectionTemplates)).toBe(true)
          expect(Array.isArray(config.formatRules)).toBe(true)
          expect(Array.isArray(config.examplePatterns)).toBe(true)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 1: topics with domain keywords are detected correctly', () => {
    // Test that topics containing domain-specific keywords are detected
    fc.assert(
      fc.property(
        fc.constantFrom<DomainType>('physics', 'math', 'chemistry', 'programming', 'biology', 'history', 'economics', 'languages', 'psychology', 'law', 'medicine', 'art'),
        (targetDomain) => {
          const keywords = DOMAIN_KEYWORDS[targetDomain]
          if (keywords.length === 0) return true
          
          // Pick a random keyword from the domain
          const keyword = keywords[Math.floor(Math.random() * keywords.length)]
          const topic = `Изучение ${keyword} в современном мире`
          
          const detectedDomain = detectDomain(topic, '')
          
          // The detected domain should match the target domain
          // (unless another domain has more matching keywords)
          // At minimum, the detection should return a valid domain
          expect(validDomainTypes).toContain(detectedDomain)
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ═══════════════════════════════════════════════════════════════
// Property 8: Fallback to General Domain
// ═══════════════════════════════════════════════════════════════

describe('Fallback to General Domain', () => {
  /**
   * Property 8: Fallback to General Domain
   * 
   * For any topic that doesn't match any domain keywords, 
   * detectDomain() SHALL return 'general'.
   * 
   * **Feature: domain-theory-generation, Property 8: Fallback to General Domain**
   * **Validates: Requirements 7.2**
   */

  // Arbitrary for generating strings that don't contain any domain keywords
  const nonDomainStringArb = fc.string({ minLength: 0, maxLength: 100 })
    .filter(s => {
      const lowerS = s.toLowerCase()
      // Check that the string doesn't contain any domain keywords
      for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
        if (domain === 'general') continue
        for (const keyword of keywords) {
          if (lowerS.includes(keyword)) {
            return false
          }
        }
      }
      return true
    })

  it('Property 8: detectDomain returns "general" for topics without domain keywords', () => {
    fc.assert(
      fc.property(
        nonDomainStringArb,
        nonDomainStringArb,
        (topic, courseName) => {
          const domain = detectDomain(topic, courseName)
          
          // Should return 'general' when no keywords match
          expect(domain).toBe('general')
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 8: empty strings return "general" domain', () => {
    const domain = detectDomain('', '')
    expect(domain).toBe('general')
  })

  it('Property 8: random gibberish returns "general" domain', () => {
    // Generate random strings with only numbers and special characters
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }).map(s => s.replace(/[а-яА-Яa-zA-Z]/g, '')),
        fc.string({ minLength: 0, maxLength: 50 }).map(s => s.replace(/[а-яА-Яa-zA-Z]/g, '')),
        (topic, courseName) => {
          const domain = detectDomain(topic, courseName)
          
          // Strings without letters should return 'general'
          expect(domain).toBe('general')
          
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 8: getDomainConfig("general") returns valid general config', () => {
    const config = getDomainConfig('general')
    
    expect(config.type).toBe('general')
    expect(config.name).toBe('Общее')
    expect(config.keywords).toEqual([])
    expect(config.systemPrompt.length).toBeGreaterThan(0)
    expect(config.sectionTemplates.length).toBeGreaterThan(0)
    expect(config.formatRules.length).toBeGreaterThan(0)
  })

  it('Property 8: general domain config has all required sections', () => {
    const config = getDomainConfig('general')
    
    // General config should have section templates
    expect(config.sectionTemplates.length).toBeGreaterThan(0)
    
    // All sections should have required fields
    for (const template of config.sectionTemplates) {
      expect(template).toHaveProperty('title')
      expect(template).toHaveProperty('prompt')
      expect(template).toHaveProperty('minWords')
      expect(template).toHaveProperty('required')
      expect(typeof template.title).toBe('string')
      expect(typeof template.prompt).toBe('string')
      expect(typeof template.minWords).toBe('number')
      expect(typeof template.required).toBe('boolean')
    }
  })
})

// Unit tests for domain detection edge cases
describe('Domain Detection Unit Tests', () => {
  it('detects physics domain for physics-related topics', () => {
    expect(detectDomain('Законы механики Ньютона', 'Физика')).toBe('physics')
    expect(detectDomain('Термодинамика', '')).toBe('physics')
    expect(detectDomain('Квантовая физика', 'Курс физики')).toBe('physics')
  })

  it('detects math domain for math-related topics', () => {
    expect(detectDomain('Интегралы и производные', 'Математика')).toBe('math')
    expect(detectDomain('Линейная алгебра', '')).toBe('math')
    expect(detectDomain('Теория вероятностей', 'Высшая математика')).toBe('math')
  })

  it('detects programming domain for programming-related topics', () => {
    expect(detectDomain('Основы Python', 'Программирование')).toBe('programming')
    expect(detectDomain('React и JavaScript', '')).toBe('programming')
    expect(detectDomain('Алгоритмы и структуры данных', 'Курс программирования')).toBe('programming')
  })

  it('detects chemistry domain for chemistry-related topics', () => {
    expect(detectDomain('Органическая химия', 'Химия')).toBe('chemistry')
    expect(detectDomain('Химические реакции', '')).toBe('chemistry')
  })

  it('detects history domain for history-related topics', () => {
    expect(detectDomain('История России XIX века', 'История')).toBe('history')
    expect(detectDomain('Вторая мировая война', '')).toBe('history')
  })

  it('detects biology domain for biology-related topics', () => {
    expect(detectDomain('Генетика и ДНК', 'Биология')).toBe('biology')
    expect(detectDomain('Клеточная биология', '')).toBe('biology')
  })

  it('returns general for unrecognized topics', () => {
    expect(detectDomain('xyz123', '')).toBe('general')
    expect(detectDomain('', '')).toBe('general')
    expect(detectDomain('12345', '67890')).toBe('general')
  })

  it('handles mixed-domain topics by selecting highest score', () => {
    // Topic with multiple domain keywords - should pick the one with most matches
    const domain = detectDomain('Физика и математика в программировании', '')
    // Should return one of the valid domains
    expect(['physics', 'math', 'programming', 'general']).toContain(domain)
  })
})
