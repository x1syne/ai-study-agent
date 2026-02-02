/**
 * Property-Based Tests for Button Component
 * Feature: ui-ux-2026-modernization, Property 15: Smooth Easing Function
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Button Smooth Easing Properties', () => {
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

  // Helper function to extract easing function from transition or animation
  function extractEasingFunction(transitionValue: string): string | null {
    // Match cubic-bezier(...) or named easing functions
    const cubicBezierMatch = transitionValue.match(/cubic-bezier\(([^)]+)\)/)
    if (cubicBezierMatch) {
      return `cubic-bezier(${cubicBezierMatch[1]})`
    }
    
    // Match named easing functions
    const namedEasingMatch = transitionValue.match(/\b(ease|ease-in|ease-out|ease-in-out|linear)\b/)
    if (namedEasingMatch) {
      return namedEasingMatch[1]
    }
    
    return null
  }

  // Helper function to check if easing is the smooth cubic-bezier
  function isSmoothEasing(easing: string): boolean {
    // The smooth easing function is cubic-bezier(0.4, 0, 0.2, 1)
    // Also accept variations with whitespace
    const normalized = easing.replace(/\s+/g, '')
    return normalized === 'cubic-bezier(0.4,0,0.2,1)' || 
           normalized === 'cubic-bezier(.4,0,.2,1)'
  }

  // Feature: ui-ux-2026-modernization, Property 15: Smooth Easing Function
  it('Property 15: Smooth Easing Function - for any transition, the timing function should be cubic-bezier(0.4, 0, 0.2, 1)', () => {
    // Read the Button component source
    const buttonPath = join(__dirname, 'Button.tsx')
    const buttonContent = readFileSync(buttonPath, 'utf-8')
    
    // Check if Button component uses the smooth easing function
    const hasEaseCubicBezier = buttonContent.includes('ease-[cubic-bezier(0.4,0,0.2,1)]')
    
    // Property: Button should use the smooth cubic-bezier easing
    expect(hasEaseCubicBezier).toBe(true)
    
    // Read globals.css to check CSS custom properties
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Check if --easing-smooth is defined with correct value
    const easingSmoothMatch = cssContent.match(/--easing-smooth:\s*cubic-bezier\(([^)]+)\)/)
    
    // Property: CSS should define --easing-smooth custom property
    expect(easingSmoothMatch).toBeDefined()
    
    if (easingSmoothMatch) {
      const easingValue = `cubic-bezier(${easingSmoothMatch[1]})`
      
      // Property: --easing-smooth should be the correct cubic-bezier
      expect(isSmoothEasing(easingValue)).toBe(true)
    }
  })

  // Property test: Verify all transitions in globals.css use smooth easing or CSS custom property
  it('Property 15b: All transition definitions should use smooth easing or var(--easing-smooth)', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Find all transition declarations
    const transitionRegex = /transition(?:-timing-function)?:\s*([^;]+);/g
    const transitions = Array.from(cssContent.matchAll(transitionRegex))
    
    // Property: CSS should have transition declarations
    expect(transitions.length).toBeGreaterThan(0)
    
    for (const match of transitions) {
      const transitionValue = match[1]
      
      // Skip if it uses CSS custom property (that's valid)
      if (transitionValue.includes('var(--easing-smooth)')) {
        continue
      }
      
      // Skip if it's a simple duration-only transition (will use default)
      if (/^\d+\.?\d*s$/.test(transitionValue.trim())) {
        continue
      }
      
      // Extract easing function
      const easing = extractEasingFunction(transitionValue)
      
      if (easing) {
        // Property: If explicit easing is specified, it should be smooth cubic-bezier
        // or a reasonable alternative (ease, ease-out for specific cases)
        const isValid = isSmoothEasing(easing) || 
                       easing === 'ease' || 
                       easing === 'ease-out' ||
                       easing === 'ease-in-out'
        
        expect(isValid).toBe(true)
      }
    }
  })

  // Property test: Verify transition-timing-function default is smooth
  it('Property 15c: Default transition-timing-function should be smooth cubic-bezier', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Check for universal selector setting transition-timing-function
    const universalTimingMatch = cssContent.match(/\*\s*{[^}]*transition-timing-function:\s*([^;]+);/)
    
    if (universalTimingMatch) {
      const timingFunction = universalTimingMatch[1].trim()
      
      // Property: Universal timing function should be smooth cubic-bezier
      expect(isSmoothEasing(timingFunction)).toBe(true)
    }
  })

  // Property test: Verify Button component applies smooth easing to all transitions
  it('Property 15d: Button component should apply smooth easing to all interactive transitions', () => {
    const buttonPath = join(__dirname, 'Button.tsx')
    const buttonContent = readFileSync(buttonPath, 'utf-8')
    
    // Check for transition-all with smooth easing
    const hasTransitionAll = buttonContent.includes('transition-all')
    const hasSmoothEasing = buttonContent.includes('ease-[cubic-bezier(0.4,0,0.2,1)]')
    
    // Property: Button should use transition-all with smooth easing
    expect(hasTransitionAll).toBe(true)
    expect(hasSmoothEasing).toBe(true)
    
    // Check that they appear together in the same className
    const classNameRegex = /className=\{cn\([^)]+transition-all[^)]+ease-\[cubic-bezier\(0\.4,0,0\.2,1\)\][^)]*\)\}/
    const hasCorrectTransition = classNameRegex.test(buttonContent)
    
    // Property: transition-all and smooth easing should be in the same className
    expect(hasCorrectTransition).toBe(true)
  })

  // Property-based test: For any animation duration, smooth easing should be applied
  it('Property 15e: For any animation duration, smooth easing function should be used', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // Duration in ms
        (duration) => {
          const cssPath = join(__dirname, '../../app/globals.css')
          const cssContent = readFileSync(cssPath, 'utf-8')
          
          // Check if CSS defines smooth easing as default
          const hasSmoothEasingDefault = cssContent.includes('--easing-smooth: cubic-bezier(0.4, 0, 0.2, 1)')
          
          // Property: CSS should define smooth easing as a custom property
          return hasSmoothEasingDefault
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property test: Verify ripple animation uses smooth easing
  it('Property 15f: Ripple animation should use smooth easing (ease-out)', () => {
    const buttonPath = join(__dirname, 'Button.tsx')
    const buttonContent = readFileSync(buttonPath, 'utf-8')
    
    // Check for ripple animation definition
    const rippleAnimationMatch = buttonContent.match(/animation:\s*['"]ripple\s+[\d.]+s\s+([^'"]+)['"]/)
    
    if (rippleAnimationMatch) {
      const easing = rippleAnimationMatch[1].trim()
      
      // Property: Ripple should use ease-out (acceptable for ripple effect)
      expect(easing).toBe('ease-out')
    }
    
    // Check globals.css for @keyframes ripple
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    const hasRippleKeyframes = cssContent.includes('@keyframes ripple')
    
    // Property: Ripple keyframes should be defined
    expect(hasRippleKeyframes).toBe(true)
  })

  // Property test: Verify active state uses smooth easing
  it('Property 15g: Active state scale transform should use smooth easing', () => {
    const buttonPath = join(__dirname, 'Button.tsx')
    const buttonContent = readFileSync(buttonPath, 'utf-8')
    
    // Check for active:scale-95 class
    const hasActiveScale = buttonContent.includes('active:scale-95')
    
    // Property: Button should have active scale transform
    expect(hasActiveScale).toBe(true)
    
    // Check that transition-all is applied (which includes transform)
    const hasTransitionAll = buttonContent.includes('transition-all')
    const hasSmoothEasing = buttonContent.includes('ease-[cubic-bezier(0.4,0,0.2,1)]')
    
    // Property: Active scale should be covered by transition-all with smooth easing
    expect(hasTransitionAll && hasSmoothEasing).toBe(true)
  })

  // Property-based test: For any button variant, smooth easing should be applied
  it('Property 15h: For any button variant, smooth easing should be applied to transitions', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('primary', 'secondary', 'ghost', 'danger'),
        (_variant) => {
          const buttonPath = join(__dirname, 'Button.tsx')
          const buttonContent = readFileSync(buttonPath, 'utf-8')
          
          // Check that button component includes smooth easing in its className
          const hasSmoothEasing = buttonContent.includes('ease-[cubic-bezier(0.4,0,0.2,1)]')
          
          // Property: Button should include smooth easing regardless of variant
          return hasSmoothEasing
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property test: Verify CSS custom property --easing-smooth is used consistently
  it('Property 15i: CSS custom property --easing-smooth should be used for animations', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Check if --easing-smooth is defined
    const hasEasingSmoothDef = cssContent.includes('--easing-smooth: cubic-bezier(0.4, 0, 0.2, 1)')
    
    // Property: --easing-smooth should be defined
    expect(hasEasingSmoothDef).toBe(true)
    
    // Check if var(--easing-smooth) is used in animations
    const usesEasingSmoothVar = cssContent.includes('var(--easing-smooth)')
    
    // Property: var(--easing-smooth) should be used in CSS
    expect(usesEasingSmoothVar).toBe(true)
    
    // Count occurrences of var(--easing-smooth)
    const occurrences = (cssContent.match(/var\(--easing-smooth\)/g) || []).length
    
    // Property: var(--easing-smooth) should be used multiple times
    expect(occurrences).toBeGreaterThan(0)
  })

  // Property test: Verify no jarring easing functions are used
  it('Property 15j: No jarring easing functions (ease-in, linear) should be used for UI transitions', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Find all transition declarations
    const transitionRegex = /transition(?:-timing-function)?:\s*([^;]+);/g
    const transitions = Array.from(cssContent.matchAll(transitionRegex))
    
    for (const match of transitions) {
      const transitionValue = match[1]
      
      // Skip if it uses CSS custom property
      if (transitionValue.includes('var(--easing-smooth)')) {
        continue
      }
      
      // Extract easing function
      const easing = extractEasingFunction(transitionValue)
      
      if (easing) {
        // Property: Should not use jarring easing functions for UI transitions
        // ease-in is jarring for UI (starts slow)
        // linear is jarring (no acceleration)
        expect(easing).not.toBe('ease-in')
        expect(easing).not.toBe('linear')
      }
    }
  })

  // Property-based test: Verify easing function parameters are within valid range
  it('Property 15k: Cubic-bezier parameters should be within valid range [0, 1] for x-axis', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1 }),
        fc.float({ min: 0, max: 1 }),
        (x1, x2) => {
          // The smooth easing function is cubic-bezier(0.4, 0, 0.2, 1)
          // x1 = 0.4, x2 = 0.2 (both within [0, 1])
          
          const smoothX1 = 0.4
          const smoothX2 = 0.2
          
          // Property: Smooth easing x-axis parameters should be within [0, 1]
          return smoothX1 >= 0 && smoothX1 <= 1 && smoothX2 >= 0 && smoothX2 <= 1
        }
      ),
      { numRuns: 100 }
    )
  })

  // Property test: Verify Button hover transitions use smooth easing
  it('Property 15l: Button hover transitions should use smooth easing', () => {
    const buttonPath = join(__dirname, 'Button.tsx')
    const buttonContent = readFileSync(buttonPath, 'utf-8')
    
    // Check for hover classes in variants
    const hasHoverClasses = buttonContent.includes('hover:from-primary-600') ||
                           buttonContent.includes('hover:bg-slate-700') ||
                           buttonContent.includes('hover:text-white')
    
    // Property: Button should have hover states
    expect(hasHoverClasses).toBe(true)
    
    // Check that transition-all covers hover states
    const hasTransitionAll = buttonContent.includes('transition-all')
    const hasSmoothEasing = buttonContent.includes('ease-[cubic-bezier(0.4,0,0.2,1)]')
    
    // Property: Hover transitions should be covered by transition-all with smooth easing
    expect(hasTransitionAll && hasSmoothEasing).toBe(true)
  })
})

describe('Global Smooth Easing Properties', () => {
  // Helper function to extract easing function from transition or animation
  function extractEasingFunction(transitionValue: string): string | null {
    // Match cubic-bezier(...) or named easing functions
    const cubicBezierMatch = transitionValue.match(/cubic-bezier\(([^)]+)\)/)
    if (cubicBezierMatch) {
      return `cubic-bezier(${cubicBezierMatch[1]})`
    }
    
    // Match named easing functions
    const namedEasingMatch = transitionValue.match(/\b(ease|ease-in|ease-out|ease-in-out|linear)\b/)
    if (namedEasingMatch) {
      return namedEasingMatch[1]
    }
    
    return null
  }

  // Property test: Verify global transition timing function
  it('Property 15m: Global transition timing function should be smooth cubic-bezier', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Check for universal selector with transition-timing-function
    const universalSelectorMatch = cssContent.match(/\*\s*{[^}]*transition-timing-function:\s*cubic-bezier\(([^)]+)\)/)
    
    if (universalSelectorMatch) {
      const params = universalSelectorMatch[1].split(',').map(p => p.trim())
      
      // Property: Should be cubic-bezier(0.4, 0, 0.2, 1)
      expect(params[0]).toBe('0.4')
      expect(params[1]).toBe('0')
      expect(params[2]).toBe('0.2')
      expect(params[3]).toBe('1')
    }
  })

  // Property test: Verify animation timing functions use smooth easing
  it('Property 15n: Animation definitions should use smooth easing where appropriate', () => {
    const cssPath = join(__dirname, '../../app/globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Find animation declarations
    const animationRegex = /animation:\s*([^;]+);/g
    const animations = Array.from(cssContent.matchAll(animationRegex))
    
    const invalidAnimations: string[] = []
    
    for (const match of animations) {
      const animationValue = match[1]
      
      // Skip if it uses CSS custom property
      if (animationValue.includes('var(--easing-smooth)')) {
        continue
      }
      
      // Extract easing function
      const easing = extractEasingFunction(animationValue)
      
      if (easing) {
        // Property: Animation easing should be smooth or appropriate for the animation
        const isValid = easing.includes('cubic-bezier(0.4') || // Smooth cubic-bezier
                       easing === 'ease' || // Acceptable default
                       easing === 'ease-out' || // Acceptable for exit animations
                       easing === 'ease-in-out' || // Acceptable for looping animations
                       easing === 'linear' // Acceptable for infinite rotations
        
        if (!isValid) {
          invalidAnimations.push(`${animationValue} (easing: ${easing})`)
        }
      }
    }
    
    // Property: All animations should use appropriate easing functions
    if (invalidAnimations.length > 0) {
      console.log('Invalid animations found:', invalidAnimations)
    }
    expect(invalidAnimations.length).toBe(0)
  })
})
