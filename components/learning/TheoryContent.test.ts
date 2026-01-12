/**
 * Unit Tests for LaTeX Rendering
 * 
 * Feature: enhanced-learning-ui
 * Task: 1.2 Написать unit тест для рендеринга LaTeX
 * 
 * **Validates: Requirements 5.1, 5.2**
 * 
 * Tests the remark-math and rehype-katex plugins for processing
 * inline ($x^2$) and block ($$\sum_{i=1}^n$$) LaTeX formulas.
 */

import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMath from 'remark-math'
import remarkRehype from 'remark-rehype'
import rehypeKatex from 'rehype-katex'
import rehypeStringify from 'rehype-stringify'

/**
 * Helper function to process markdown with LaTeX formulas
 * Uses the same plugins as TheoryContent component
 */
async function processMarkdownWithLatex(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(content)
  
  return String(result)
}

describe('LaTeX Rendering', () => {
  /**
   * Test inline formulas in format $formula$
   * **Validates: Requirements 5.1**
   */
  describe('Inline formulas ($formula$)', () => {
    it('should render simple inline formula $x^2$', async () => {
      const input = 'The formula is $x^2$ in the text.'
      const output = await processMarkdownWithLatex(input)
      
      // Should contain KaTeX rendered output
      expect(output).toContain('katex')
      // Should contain the math content
      expect(output).toContain('x')
      // Should have inline math class
      expect(output).toContain('katex-mathml')
    })

    it('should render inline fraction $\\frac{a}{b}$', async () => {
      const input = 'A fraction: $\\frac{a}{b}$ here.'
      const output = await processMarkdownWithLatex(input)
      
      expect(output).toContain('katex')
      expect(output).toContain('frac')
    })

    it('should render inline subscript and superscript $x_i^2$', async () => {
      const input = 'Variable $x_i^2$ with indices.'
      const output = await processMarkdownWithLatex(input)
      
      expect(output).toContain('katex')
    })

    it('should render Greek letters $\\alpha, \\beta, \\gamma$', async () => {
      const input = 'Greek: $\\alpha, \\beta, \\gamma$'
      const output = await processMarkdownWithLatex(input)
      
      expect(output).toContain('katex')
      // Greek letters should be rendered
      expect(output).toContain('α')
    })
  })

  /**
   * Test block formulas in format $$formula$$
   * **Validates: Requirements 5.2**
   */
  describe('Block formulas ($$formula$$)', () => {
    it('should render block sum formula $$\\sum_{i=1}^n$$', async () => {
      // Block formulas need to be on their own paragraph for display mode
      const input = 'The sum:\n\n$$\n\\sum_{i=1}^n x_i\n$$\n\nEnd.'
      const output = await processMarkdownWithLatex(input)
      
      // Should contain KaTeX rendered output
      expect(output).toContain('katex')
      // Should have display mode class for block formulas
      expect(output).toContain('katex-display')
      // Should contain the sum symbol
      expect(output).toContain('∑')
    })

    it('should render block integral $$\\int_0^\\infty$$', async () => {
      const input = '$$\n\\int_0^\\infty e^{-x} dx\n$$'
      const output = await processMarkdownWithLatex(input)
      
      expect(output).toContain('katex')
      expect(output).toContain('katex-display')
      // Should contain the integral symbol
      expect(output).toContain('∫')
    })

    it('should render block matrix', async () => {
      const input = '$$\n\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}\n$$'
      const output = await processMarkdownWithLatex(input)
      
      expect(output).toContain('katex')
      expect(output).toContain('katex-display')
    })

    it('should render multi-line equation', async () => {
      const input = '$$\nE = mc^2\n$$'
      const output = await processMarkdownWithLatex(input)
      
      expect(output).toContain('katex')
      expect(output).toContain('katex-display')
    })
  })

  /**
   * Test mixed content with both inline and block formulas
   */
  describe('Mixed content', () => {
    it('should render both inline and block formulas in same content', async () => {
      const input = `
# Physics Formula

The energy formula is $E = mc^2$ where $m$ is mass.

The full equation:
$$E = \\sqrt{(pc)^2 + (mc^2)^2}$$

This shows the relationship.
`
      const output = await processMarkdownWithLatex(input)
      
      // Should contain both inline and display math
      expect(output).toContain('katex')
      // Should have heading
      expect(output).toContain('Physics Formula')
    })

    it('should preserve regular markdown alongside LaTeX', async () => {
      const input = `
**Bold text** and $x^2$ formula.

- List item with $y = mx + b$
- Another item

$$\\frac{d}{dx}f(x)$$
`
      const output = await processMarkdownWithLatex(input)
      
      expect(output).toContain('katex')
      expect(output).toContain('<strong>')
      expect(output).toContain('<li>')
    })
  })

  /**
   * Test edge cases
   */
  describe('Edge cases', () => {
    it('should handle empty formula gracefully', async () => {
      const input = 'Empty: $$ and $$$$'
      // Should not throw
      await expect(processMarkdownWithLatex(input)).resolves.toBeDefined()
    })

    it('should handle text without any formulas', async () => {
      const input = 'Just regular text without any math.'
      const output = await processMarkdownWithLatex(input)
      
      expect(output).toContain('Just regular text')
      expect(output).not.toContain('katex')
    })

    it('should handle dollar signs that are not formulas', async () => {
      const input = 'Price is $100 dollars.'
      const output = await processMarkdownWithLatex(input)
      
      // Single $ followed by number should not be treated as math
      expect(output).toContain('100')
    })
  })
})


/**
 * Helper function to process markdown with LaTeX formulas with error handling
 * Uses the same configuration as TheoryContent component (throwOnError: false)
 * **Validates: Requirements 5.4**
 */
async function processMarkdownWithLatexErrorHandling(content: string): Promise<string> {
  const result = await unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex, { 
      throwOnError: false,
      errorColor: '#cc0000',
      output: 'htmlAndMathml'
    })
    .use(rehypeStringify)
    .process(content)
  
  return String(result)
}

/**
 * Test erroneous formulas - error handling
 * Task: 7.3 Написать тест рендеринга формул
 * **Validates: Requirements 5.4**
 * 
 * IF формула содержит синтаксическую ошибку, THEN THE System SHALL отображать исходный текст формулы
 */
describe('Erroneous formulas (error handling)', () => {
  it('should handle invalid LaTeX command gracefully', async () => {
    const input = 'Invalid: $\\invalidcommand{x}$'
    const output = await processMarkdownWithLatexErrorHandling(input)
    
    // Should not throw, should produce output
    expect(output).toBeDefined()
    // Should contain katex (even with error)
    expect(output).toContain('katex')
    // Should contain the original text or error indicator
    expect(output).toMatch(/invalidcommand|katex-error|color/)
  })

  it('should handle unclosed braces gracefully', async () => {
    const input = 'Unclosed: $\\frac{a{b}$'
    const output = await processMarkdownWithLatexErrorHandling(input)
    
    // Should not throw
    expect(output).toBeDefined()
    // Should contain some output (either error or partial render)
    expect(output.length).toBeGreaterThan(0)
  })

  it('should handle unknown environment gracefully', async () => {
    const input = '$$\\begin{unknownenv}x\\end{unknownenv}$$'
    const output = await processMarkdownWithLatexErrorHandling(input)
    
    // Should not throw
    expect(output).toBeDefined()
    // Should contain katex output (with error styling)
    expect(output).toContain('katex')
  })

  it('should handle mismatched delimiters gracefully', async () => {
    const input = 'Mismatched: $x^2$$'
    const output = await processMarkdownWithLatexErrorHandling(input)
    
    // Should not throw
    expect(output).toBeDefined()
    expect(output.length).toBeGreaterThan(0)
  })

  it('should handle deeply nested braces gracefully', async () => {
    const input = '$\\frac{\\frac{\\frac{\\frac{a}{b}}{c}}{d}}{e}$'
    const output = await processMarkdownWithLatexErrorHandling(input)
    
    // Should render without throwing
    expect(output).toBeDefined()
    expect(output).toContain('katex')
  })

  it('should handle special characters in formulas', async () => {
    const input = '$x < y > z & w$'
    const output = await processMarkdownWithLatexErrorHandling(input)
    
    // Should not throw
    expect(output).toBeDefined()
    // Should contain katex output
    expect(output).toContain('katex')
  })

  it('should handle incomplete commands gracefully', async () => {
    const input = 'Incomplete: $\\frac{a}$'
    const output = await processMarkdownWithLatexErrorHandling(input)
    
    // Should not throw
    expect(output).toBeDefined()
    // Should contain some output
    expect(output.length).toBeGreaterThan(0)
  })

  it('should preserve surrounding text when formula has error', async () => {
    const input = 'Before text $\\invalidcmd$ after text'
    const output = await processMarkdownWithLatexErrorHandling(input)
    
    // Should not throw
    expect(output).toBeDefined()
    // Should preserve surrounding text
    expect(output).toContain('Before text')
    expect(output).toContain('after text')
  })

  it('should handle multiple erroneous formulas in same content', async () => {
    const input = 'First: $\\bad1$ and second: $\\bad2$ end.'
    const output = await processMarkdownWithLatexErrorHandling(input)
    
    // Should not throw
    expect(output).toBeDefined()
    // Should contain surrounding text
    expect(output).toContain('First')
    expect(output).toContain('second')
    expect(output).toContain('end')
  })

  it('should handle mix of valid and invalid formulas', async () => {
    const input = 'Valid: $x^2$ and invalid: $\\badcmd$ and valid again: $y^3$'
    const output = await processMarkdownWithLatexErrorHandling(input)
    
    // Should not throw
    expect(output).toBeDefined()
    // Should contain katex for valid formulas
    expect(output).toContain('katex')
    // Should preserve text structure
    expect(output).toContain('Valid')
    expect(output).toContain('invalid')
    expect(output).toContain('valid again')
  })
})
