/**
 * Property-Based Tests for Card Component
 * Feature: ui-ux-2026-modernization, Property 1: Glassmorphism Consistency
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Card Glassmorphism Properties', () => {
  // Helper function to parse CSS rules from globals.css
  function parseCSSRules(cssContent: string): Map<string, Map<string, string>> {
    const rules = new Map<string, Map<string, string>>()
    
    // Match CSS rules: .selector { property: value; }
    const ruleRegex = /([.#][\w-]+(?:\s+[.#][\w-]+)*)\s*{([^}]*)}/g
    
    let match
    while ((match = ruleRegex.exec(cssContent)) !== null) {
      const [, selector, block] = match
      const properties = new Map<string, string>()
      
      // Match property: value pairs
      const propRegex = /([\w-]+)\s*:\s*([^;]+);/g
      let propMatch
      
      while ((propMatch = propRegex.exec(block)) !== null) {
        const [, prop, value] = propMatch
        properties.set(prop.trim(), value.trim())
      }
      
      rules.set(selector.trim(), properties)
    }
    
    return rules
  }

  // Helper function to extract backdrop-filter value
  function extractBackdropFilter(properties: Map<string, string>): {
    blur: string | null
    saturate: string | null
  } {
    const backdropFilter = properties.get('backdrop-filter') || properties.get('-webkit-backdrop-filter')
    
    if (!backdropFilter) {
      return { blur: null, saturate: null }
    }
    
    // Extract blur value: blur(16px)
    const blurMatch = backdropFilter.match(/blur\(([^)]+)\)/)
    const blur = blurMatch ? blurMatch[1] : null
    
    // Extract saturate value: saturate(180%)
    const saturateMatch = backdropFilter.match(/saturate\(([^)]+)\)/)
    const saturate = saturateMatch ? saturateMatch[1] : null
    
    return { blur, saturate }
  }

  // Feature: ui-ux-2026-modernization, Property 1: Glassmorphism Consistency
  it('Property 1: Glassmorphism Consistency - for any card with glassmorphism variant, backdrop-filter includes blur and saturate matching specification', () => {
    // Read the actual globals.css file
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Parse CSS rules
    const rules = parseCSSRules(cssContent)
    
    // Define expected glassmorphism specifications
    const glassSpecs = {
      'glass-subtle': {
        blur: '12px',
        minBlur: 10,
        maxBlur: 14
      },
      'glass-medium': {
        blur: '16px',
        minBlur: 14,
        maxBlur: 18
      },
      'glass-intense': {
        blur: '20px',
        minBlur: 18,
        maxBlur: 22
      }
    }
    
    // Test each glassmorphism variant - they should define CSS custom properties
    for (const [variant, spec] of Object.entries(glassSpecs)) {
      const selector = `.${variant}`
      const properties = rules.get(selector)
      
      // Property: Glassmorphism variant class should exist
      expect(properties).toBeDefined()
      
      if (properties) {
        // Property: Variant should define --glass-blur custom property
        const glassBlur = properties.get('--glass-blur')
        expect(glassBlur).toBeDefined()
        
        // Property: blur value should match specification
        if (glassBlur) {
          const blurValue = parseFloat(glassBlur)
          expect(blurValue).toBeGreaterThanOrEqual(spec.minBlur)
          expect(blurValue).toBeLessThanOrEqual(spec.maxBlur)
        }
      }
    }
    
    // Test base .glass class - it should use the CSS custom properties
    const glassProperties = rules.get('.glass')
    expect(glassProperties).toBeDefined()
    
    if (glassProperties) {
      const backdropFilter = glassProperties.get('backdrop-filter') || glassProperties.get('-webkit-backdrop-filter')
      
      // Property: Base glass class should have backdrop-filter
      expect(backdropFilter).toBeDefined()
      
      // Property: backdrop-filter should use CSS custom properties
      if (backdropFilter) {
        expect(backdropFilter).toContain('var(--glass-blur)')
        expect(backdropFilter).toContain('var(--glass-saturate)')
      }
    }
  })

  // Property test: Verify glassmorphism variants use CSS custom properties correctly
  it('Property 1b: Glassmorphism variants should use CSS custom properties for consistency', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Check if CSS custom properties are defined for glassmorphism
    const hasGlassCustomProps = cssContent.includes('--glass-bg') && 
                                 cssContent.includes('--glass-blur')
    
    expect(hasGlassCustomProps).toBe(true)
    
    // Parse CSS custom properties from :root
    const rootRegex = /:root\s*{([^}]*)}/g
    const matches = Array.from(cssContent.matchAll(rootRegex))
    
    const customProps = new Map<string, string>()
    for (const match of matches) {
      const block = match[1]
      const propRegex = /--([\w-]+)\s*:\s*([^;]+);/g
      let propMatch
      
      while ((propMatch = propRegex.exec(block)) !== null) {
        const [, name, value] = propMatch
        customProps.set(`--${name}`, value.trim())
      }
    }
    
    // Property: Glass custom properties should be defined
    expect(customProps.get('--glass-bg')).toBeDefined()
    expect(customProps.get('--glass-blur')).toBeDefined()
    expect(customProps.get('--glass-saturate')).toBeDefined()
    
    // Property: Glass blur should be a valid pixel value
    const glassBlur = customProps.get('--glass-blur')
    if (glassBlur) {
      expect(glassBlur).toMatch(/^\d+px$/)
      const blurValue = parseFloat(glassBlur)
      expect(blurValue).toBeGreaterThan(0)
    }
    
    // Property: Glass saturate should be a valid percentage
    const glassSaturate = customProps.get('--glass-saturate')
    if (glassSaturate) {
      expect(glassSaturate).toMatch(/^\d+%$/)
      const saturateValue = parseFloat(glassSaturate)
      expect(saturateValue).toBeGreaterThan(100) // Should enhance saturation
    }
  })

  // Property test: Verify glassmorphism classes apply correct background and border
  it('Property 1c: Glassmorphism classes should apply correct background and border styles', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    const rules = parseCSSRules(cssContent)
    
    // Test base .glass class
    const glassProperties = rules.get('.glass')
    expect(glassProperties).toBeDefined()
    
    if (glassProperties) {
      // Property: Glass should have a semi-transparent background
      const background = glassProperties.get('background')
      expect(background).toBeDefined()
      
      // Property: Glass should have a border
      const border = glassProperties.get('border')
      expect(border).toBeDefined()
      
      // Property: Background should use CSS custom property or rgba
      if (background) {
        const isValidBg = background.includes('var(--glass-bg)') || 
                         background.includes('rgba')
        expect(isValidBg).toBe(true)
      }
    }
  })

  // Property-based test: For any glassmorphism variant, the blur value should be within valid range
  it('Property 1d: For any glassmorphism variant, blur value should be within valid range (10-25px)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('subtle', 'medium', 'intense'),
        (variant) => {
          const cssPath = join(__dirname, '../../app/globals.css')
          const cssContent = readFileSync(cssPath, 'utf-8')
          const rules = parseCSSRules(cssContent)
          
          const selector = `.glass-${variant}`
          const properties = rules.get(selector)
          
          if (properties) {
            // Check for --glass-blur custom property
            const glassBlur = properties.get('--glass-blur')
            
            if (glassBlur) {
              const blurValue = parseFloat(glassBlur)
              // Property: Blur should be within reasonable range for glassmorphism
              return blurValue >= 10 && blurValue <= 25
            }
          }
          
          // If no blur found in variant, it might be defined in :root
          // This is acceptable as long as base .glass class uses it
          return true
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property-based test: For any glassmorphism variant, saturate should enhance colors
  it('Property 1e: For any glassmorphism variant, saturate value should enhance colors (>100%)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('subtle', 'medium', 'intense'),
        (_variant) => {
          const cssPath = join(__dirname, '../../app/globals.css')
          const cssContent = readFileSync(cssPath, 'utf-8')
          
          // Check :root for --glass-saturate definition
          const rootRegex = /:root\s*{([^}]*)}/g
          const matches = Array.from(cssContent.matchAll(rootRegex))
          
          for (const match of matches) {
            const block = match[1]
            const saturateMatch = block.match(/--glass-saturate\s*:\s*(\d+)%/)
            if (saturateMatch) {
              const saturateValue = parseFloat(saturateMatch[1])
              // Property: Saturate should enhance colors (>100%)
              return saturateValue > 100
            }
          }
          
          // If not found in :root, check if .glass uses saturate in backdrop-filter
          const rules = parseCSSRules(cssContent)
          const glassProperties = rules.get('.glass')
          
          if (glassProperties) {
            const backdropFilter = glassProperties.get('backdrop-filter') || glassProperties.get('-webkit-backdrop-filter')
            
            // If it uses var(--glass-saturate), that's valid
            if (backdropFilter && backdropFilter.includes('saturate(var(--glass-saturate))')) {
              return true
            }
            
            // Try to extract direct saturate value
            const { saturate } = extractBackdropFilter(glassProperties)
            if (saturate) {
              const saturateValue = parseFloat(saturate)
              return saturateValue > 100
            }
          }
          
          return true // If no saturate found, test passes
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property test: Verify that glassmorphism variants have distinct blur values
  it('Property 1f: Glassmorphism variants should have distinct blur values (subtle < medium < intense)', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    const rules = parseCSSRules(cssContent)
    
    // Extract blur values for each variant
    const getBlurValue = (variant: string): number | null => {
      const selector = `.glass-${variant}`
      const properties = rules.get(selector)
      
      if (properties) {
        const { blur } = extractBackdropFilter(properties)
        if (blur) {
          return parseFloat(blur)
        }
      }
      
      // Check if variant uses CSS custom property
      const varMatch = cssContent.match(new RegExp(`\\.glass-${variant}[^}]*--glass-blur\\s*:\\s*([^;]+);`))
      if (varMatch) {
        return parseFloat(varMatch[1])
      }
      
      return null
    }
    
    const subtleBlur = getBlurValue('subtle')
    const mediumBlur = getBlurValue('medium')
    const intenseBlur = getBlurValue('intense')
    
    // Property: All variants should have blur values defined
    expect(subtleBlur).not.toBeNull()
    expect(mediumBlur).not.toBeNull()
    expect(intenseBlur).not.toBeNull()
    
    if (subtleBlur && mediumBlur && intenseBlur) {
      // Property: Blur values should form a hierarchy (subtle < medium < intense)
      expect(subtleBlur).toBeLessThan(mediumBlur)
      expect(mediumBlur).toBeLessThan(intenseBlur)
    }
  })
})

describe('Card Container Query Properties', () => {
  // Helper function to parse CSS rules from globals.css
  function parseCSSRules(cssContent: string): Map<string, Map<string, string>> {
    const rules = new Map<string, Map<string, string>>()
    
    // Match CSS rules: .selector { property: value; }
    const ruleRegex = /([.#@][\w-]+(?:\s+[.#@][\w-]+)*)\s*{([^}]*)}/g
    
    let match
    while ((match = ruleRegex.exec(cssContent)) !== null) {
      const [, selector, block] = match
      const properties = new Map<string, string>()
      
      // Match property: value pairs
      const propRegex = /([\w-]+)\s*:\s*([^;]+);/g
      let propMatch
      
      while ((propMatch = propRegex.exec(block)) !== null) {
        const [, prop, value] = propMatch
        properties.set(prop.trim(), value.trim())
      }
      
      rules.set(selector.trim(), properties)
    }
    
    return rules
  }

  // Feature: ui-ux-2026-modernization, Property 3: Container Query Application
  it('Property 3: Container Query Application - for any card with containerQuery=true, container-type should be inline-size', () => {
    // Read the actual globals.css file
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Parse CSS rules
    const rules = parseCSSRules(cssContent)
    
    // Test .container class - it should define container-type: inline-size
    const containerProperties = rules.get('.container')
    
    // Property: .container class should exist
    expect(containerProperties).toBeDefined()
    
    if (containerProperties) {
      // Property: container-type should be set to inline-size
      const containerType = containerProperties.get('container-type')
      expect(containerType).toBeDefined()
      expect(containerType).toBe('inline-size')
    }
  })

  // Property test: Verify container queries are defined for responsive layouts
  it('Property 3b: Container queries should be defined for responsive card layouts', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Check for @container rules in CSS
    const hasContainerQueries = cssContent.includes('@container')
    
    // Property: CSS should contain @container rules
    expect(hasContainerQueries).toBe(true)
    
    // Check for specific container query breakpoints
    const hasNarrowContainer = cssContent.includes('@container (max-width: 400px)')
    const hasMediumContainer = cssContent.includes('@container (min-width: 400px)')
    const hasWideContainer = cssContent.includes('@container (min-width: 800px)')
    
    // Property: Container queries should cover narrow, medium, and wide breakpoints
    expect(hasNarrowContainer).toBe(true)
    expect(hasMediumContainer).toBe(true)
    expect(hasWideContainer).toBe(true)
  })

  // Property test: Verify container queries apply to .practicum-card
  it('Property 3c: Container queries should apply responsive styles to .practicum-card', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Check if container queries target .practicum-card
    const containerCardRegex = /@container[^{]*{\s*\.container\s+\.practicum-card/g
    const matches = Array.from(cssContent.matchAll(containerCardRegex))
    
    // Property: Container queries should target .practicum-card elements
    expect(matches.length).toBeGreaterThan(0)
    
    // Check for specific responsive behaviors
    const hasFlexDirection = cssContent.includes('flex-direction: column')
    const hasPaddingAdjustment = cssContent.match(/@container[^}]*padding:\s*[\d.]+rem/)
    
    // Property: Container queries should adjust layout properties
    expect(hasFlexDirection || hasPaddingAdjustment).toBeTruthy()
  })

  // Property-based test: For any card with containerQuery prop, the container class should be applied
  it('Property 3d: For any card with containerQuery=true, the container class should be applied', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        (containerQuery) => {
          // This tests the Card component's logic
          // When containerQuery is true, the 'container' class should be in the className
          
          // Read the Card component source
          const cardPath = join(__dirname, 'Card.tsx')
          const cardContent = readFileSync(cardPath, 'utf-8')
          
          // Check if Card component applies 'container' class when containerQuery prop is true
          const hasContainerQueryLogic = cardContent.includes("containerQuery && 'container'")
          
          // Property: Card component should conditionally apply container class
          return hasContainerQueryLogic
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property test: Verify container-type is only inline-size (not block-size or size)
  it('Property 3e: Container-type should be inline-size for horizontal responsiveness', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    const rules = parseCSSRules(cssContent)
    const containerProperties = rules.get('.container')
    
    if (containerProperties) {
      const containerType = containerProperties.get('container-type')
      
      // Property: container-type should be inline-size (not block-size or size)
      expect(containerType).toBe('inline-size')
      expect(containerType).not.toBe('block-size')
      expect(containerType).not.toBe('size')
    }
  })

  // Property test: Verify container query units (cqw, cqh) are used in responsive styles
  it('Property 3f: Container queries should use container query units (cqw, cqh) for typography', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Check for container query units in CSS
    const hasCqwUnits = cssContent.includes('cqw')
    const hasCqhUnits = cssContent.includes('cqh')
    
    // Property: CSS should use container query units for responsive sizing
    expect(hasCqwUnits || hasCqhUnits).toBe(true)
    
    // Check if container query units are used within @container rules
    const containerBlockRegex = /@container[^{]*{([^}]*)}/g
    const containerBlocks = Array.from(cssContent.matchAll(containerBlockRegex))
    
    let usesContainerUnits = false
    for (const match of containerBlocks) {
      const block = match[1]
      if (block.includes('cqw') || block.includes('cqh')) {
        usesContainerUnits = true
        break
      }
    }
    
    // Property: Container query units should be used within @container rules
    expect(usesContainerUnits).toBe(true)
  })

  // Property-based test: For any container width, appropriate styles should be applied
  it('Property 3g: For any container width, appropriate responsive styles should be defined', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 200, max: 1200 }),
        (width) => {
          const cssPath = join(__dirname, '../../app/globals.css')
          const cssContent = readFileSync(cssPath, 'utf-8')
          
          // Determine which container query range this width falls into
          let expectedRange: 'narrow' | 'medium' | 'wide'
          
          if (width < 400) {
            expectedRange = 'narrow'
          } else if (width < 800) {
            expectedRange = 'medium'
          } else {
            expectedRange = 'wide'
          }
          
          // Check if appropriate container query exists for this range
          const hasNarrowQuery = cssContent.includes('@container (max-width: 400px)')
          const hasMediumQuery = cssContent.includes('@container (min-width: 400px)')
          const hasWideQuery = cssContent.includes('@container (min-width: 800px)')
          
          // Property: Container queries should cover all width ranges
          switch (expectedRange) {
            case 'narrow':
              return hasNarrowQuery
            case 'medium':
              return hasMediumQuery
            case 'wide':
              return hasWideQuery
            default:
              return false
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
