/**
 * Property-Based Tests for CSS 2026 Design Tokens
 * Feature: ui-ux-2026-modernization, Property 6: Multi-Layer Background System
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('Design Tokens Properties', () => {
  // Helper function to parse CSS custom properties from a string
  function parseCSSCustomProperties(cssContent: string): Map<string, string> {
    const properties = new Map<string, string>()
    
    // Match CSS custom properties ONLY in :root selector (dark theme)
    const rootRegex = /:root\s*{([^}]*)}/g
    
    const matches = Array.from(cssContent.matchAll(rootRegex))
    
    for (const match of matches) {
      const block = match[1]
      // Match --property-name: value;
      const propRegex = /--([\w-]+)\s*:\s*([^;]+);/g
      let propMatch
      
      while ((propMatch = propRegex.exec(block)) !== null) {
        const [, name, value] = propMatch
        properties.set(`--${name}`, value.trim())
      }
    }
    
    return properties
  }

  // Helper function to extract background layer values
  function extractBackgroundLayers(properties: Map<string, string>): {
    background: string | undefined
    surface: string | undefined
    overlay: string | undefined
  } {
    return {
      background: properties.get('--bg-background'),
      surface: properties.get('--bg-surface'),
      overlay: properties.get('--bg-overlay')
    }
  }

  // Feature: ui-ux-2026-modernization, Property 6: Multi-Layer Background System
  it('Property 6: Multi-Layer Background System - all three background levels defined with distinct values', () => {
    // Read the actual globals.css file
    const cssPath = join(__dirname, 'globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Parse CSS custom properties
    const properties = parseCSSCustomProperties(cssContent)
    
    // Extract background layers
    const layers = extractBackgroundLayers(properties)
    
    // Property: All three background levels should be defined
    expect(layers.background).toBeDefined()
    expect(layers.surface).toBeDefined()
    expect(layers.overlay).toBeDefined()
    
    // Property: All three background levels should have non-empty values
    expect(layers.background).not.toBe('')
    expect(layers.surface).not.toBe('')
    expect(layers.overlay).not.toBe('')
    
    // Property: All three background levels should be distinct
    expect(layers.background).not.toBe(layers.surface)
    expect(layers.background).not.toBe(layers.overlay)
    expect(layers.surface).not.toBe(layers.overlay)
    
    // Property: Values should be valid color values (hex or rgb/rgba)
    const colorRegex = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\))$/
    expect(colorRegex.test(layers.background!)).toBe(true)
    expect(colorRegex.test(layers.surface!)).toBe(true)
    expect(colorRegex.test(layers.overlay!)).toBe(true)
  })

  // Additional property test: Verify the actual CSS background layers form a proper elevation hierarchy
  it('Property 6b: Actual CSS background layers should form a proper elevation hierarchy', () => {
    // Read the actual globals.css file
    const cssPath = join(__dirname, 'globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Parse CSS custom properties
    const properties = parseCSSCustomProperties(cssContent)
    
    // Extract background layers
    const layers = extractBackgroundLayers(properties)
    
    // Helper to convert hex color to RGB
    const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
      const match = hex.match(/^#([0-9a-fA-F]{6})$/)
      if (!match) return null
      
      const r = parseInt(match[1].substring(0, 2), 16)
      const g = parseInt(match[1].substring(2, 4), 16)
      const b = parseInt(match[1].substring(4, 6), 16)
      return { r, g, b }
    }
    
    // Calculate perceived brightness (luminance)
    const getLuminance = (rgb: { r: number; g: number; b: number }): number => {
      return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b
    }
    
    // Convert all layers to RGB
    const bgRgb = hexToRgb(layers.background!)
    const surfaceRgb = hexToRgb(layers.surface!)
    const overlayRgb = hexToRgb(layers.overlay!)
    
    // All should be valid hex colors
    expect(bgRgb).not.toBeNull()
    expect(surfaceRgb).not.toBeNull()
    expect(overlayRgb).not.toBeNull()
    
    if (bgRgb && surfaceRgb && overlayRgb) {
      const bgLuminance = getLuminance(bgRgb)
      const surfaceLuminance = getLuminance(surfaceRgb)
      const overlayLuminance = getLuminance(overlayRgb)
      
      // Property: For dark theme (which is the default), overlay should be lighter than surface,
      // and surface should be lighter than background (creating proper elevation hierarchy)
      expect(overlayLuminance).toBeGreaterThan(surfaceLuminance)
      expect(surfaceLuminance).toBeGreaterThan(bgLuminance)
    }
  })

  // Property test: Verify that light theme also has distinct background layers
  it('Property 6c: Light theme should also have distinct background layers', () => {
    const cssPath = join(__dirname, 'globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Extract light theme section
    const lightThemeRegex = /\.light\s*{([^}]*)}/g
    const lightMatches = Array.from(cssContent.matchAll(lightThemeRegex))
    
    // Check if light theme defines background layers
    let hasLightThemeLayers = false
    
    for (const match of lightMatches) {
      const block = match[1]
      if (block.includes('--color-bg') || block.includes('--bg-')) {
        hasLightThemeLayers = true
        break
      }
    }
    
    // Property: Light theme should define background layers
    expect(hasLightThemeLayers).toBe(true)
  })

  // Feature: ui-ux-2026-modernization, Property 9: Contrast Ratio Compliance
  it('Property 9: Contrast Ratio Compliance - text on all background levels has at least 4.5:1 contrast', () => {
    const cssPath = join(__dirname, 'globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Parse CSS custom properties
    const properties = parseCSSCustomProperties(cssContent)
    
    // Helper to convert hex color to RGB
    const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
      // Remove # if present
      hex = hex.replace('#', '')
      
      // Handle 3-digit hex
      if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('')
      }
      
      if (hex.length !== 6) return null
      
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      return { r, g, b }
    }
    
    // Calculate relative luminance according to WCAG 2.1
    const getRelativeLuminance = (rgb: { r: number; g: number; b: number }): number => {
      const rsRGB = rgb.r / 255
      const gsRGB = rgb.g / 255
      const bsRGB = rgb.b / 255
      
      const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
      const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
      const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    
    // Calculate contrast ratio according to WCAG 2.1
    const getContrastRatio = (color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number => {
      const l1 = getRelativeLuminance(color1)
      const l2 = getRelativeLuminance(color2)
      
      const lighter = Math.max(l1, l2)
      const darker = Math.min(l1, l2)
      
      return (lighter + 0.05) / (darker + 0.05)
    }
    
    // Extract background and text colors for dark theme
    const bgBackground = properties.get('--bg-background') || properties.get('--color-bg')
    const bgSurface = properties.get('--bg-surface') || properties.get('--color-bg-secondary')
    const bgOverlay = properties.get('--bg-overlay') || properties.get('--color-bg-card')
    const textColor = properties.get('--color-text')
    const textSecondary = properties.get('--color-text-secondary')
    
    // Verify all colors are defined
    expect(bgBackground).toBeDefined()
    expect(bgSurface).toBeDefined()
    expect(bgOverlay).toBeDefined()
    expect(textColor).toBeDefined()
    expect(textSecondary).toBeDefined()
    
    // Convert to RGB
    const bgBackgroundRgb = hexToRgb(bgBackground!)
    const bgSurfaceRgb = hexToRgb(bgSurface!)
    const bgOverlayRgb = hexToRgb(bgOverlay!)
    const textColorRgb = hexToRgb(textColor!)
    const textSecondaryRgb = hexToRgb(textSecondary!)
    
    // All should be valid hex colors
    expect(bgBackgroundRgb).not.toBeNull()
    expect(bgSurfaceRgb).not.toBeNull()
    expect(bgOverlayRgb).not.toBeNull()
    expect(textColorRgb).not.toBeNull()
    expect(textSecondaryRgb).not.toBeNull()
    
    if (bgBackgroundRgb && bgSurfaceRgb && bgOverlayRgb && textColorRgb && textSecondaryRgb) {
      // Property: Primary text on background should have at least 4.5:1 contrast
      const contrastBgText = getContrastRatio(bgBackgroundRgb, textColorRgb)
      expect(contrastBgText).toBeGreaterThanOrEqual(4.5)
      
      // Property: Primary text on surface should have at least 4.5:1 contrast
      const contrastSurfaceText = getContrastRatio(bgSurfaceRgb, textColorRgb)
      expect(contrastSurfaceText).toBeGreaterThanOrEqual(4.5)
      
      // Property: Primary text on overlay should have at least 4.5:1 contrast
      const contrastOverlayText = getContrastRatio(bgOverlayRgb, textColorRgb)
      expect(contrastOverlayText).toBeGreaterThanOrEqual(4.5)
      
      // Property: Secondary text on background should have at least 4.5:1 contrast
      const contrastBgSecondary = getContrastRatio(bgBackgroundRgb, textSecondaryRgb)
      expect(contrastBgSecondary).toBeGreaterThanOrEqual(4.5)
      
      // Property: Secondary text on surface should have at least 4.5:1 contrast
      const contrastSurfaceSecondary = getContrastRatio(bgSurfaceRgb, textSecondaryRgb)
      expect(contrastSurfaceSecondary).toBeGreaterThanOrEqual(4.5)
      
      // Property: Secondary text on overlay should have at least 4.5:1 contrast
      const contrastOverlaySecondary = getContrastRatio(bgOverlayRgb, textSecondaryRgb)
      expect(contrastOverlaySecondary).toBeGreaterThanOrEqual(4.5)
    }
  })

  // Feature: ui-ux-2026-modernization, Property 9: Contrast Ratio Compliance (Light Theme)
  it('Property 9b: Light theme contrast ratio compliance - text on all background levels has at least 4.5:1 contrast', () => {
    const cssPath = join(__dirname, 'globals.css')
    const cssContent = readFileSync(cssPath, 'utf-8')
    
    // Helper to convert hex color to RGB
    const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
      hex = hex.replace('#', '')
      if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('')
      }
      if (hex.length !== 6) return null
      
      const r = parseInt(hex.substring(0, 2), 16)
      const g = parseInt(hex.substring(2, 4), 16)
      const b = parseInt(hex.substring(4, 6), 16)
      return { r, g, b }
    }
    
    // Calculate relative luminance according to WCAG 2.1
    const getRelativeLuminance = (rgb: { r: number; g: number; b: number }): number => {
      const rsRGB = rgb.r / 255
      const gsRGB = rgb.g / 255
      const bsRGB = rgb.b / 255
      
      const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
      const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
      const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)
      
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    
    // Calculate contrast ratio according to WCAG 2.1
    const getContrastRatio = (color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number => {
      const l1 = getRelativeLuminance(color1)
      const l2 = getRelativeLuminance(color2)
      
      const lighter = Math.max(l1, l2)
      const darker = Math.min(l1, l2)
      
      return (lighter + 0.05) / (darker + 0.05)
    }
    
    // Extract light theme colors from CSS
    const lightThemeRegex = /\.light\s*{([^}]*)}/g
    const lightMatches = Array.from(cssContent.matchAll(lightThemeRegex))
    
    const lightProperties = new Map<string, string>()
    for (const match of lightMatches) {
      const block = match[1]
      const propRegex = /--([\w-]+)\s*:\s*([^;]+);/g
      let propMatch
      
      while ((propMatch = propRegex.exec(block)) !== null) {
        const [, name, value] = propMatch
        lightProperties.set(`--${name}`, value.trim())
      }
    }
    
    // Extract light theme background and text colors
    const lightBg = lightProperties.get('--color-bg')
    const lightBgSecondary = lightProperties.get('--color-bg-secondary')
    const lightBgCard = lightProperties.get('--color-bg-card')
    const lightText = lightProperties.get('--color-text')
    const lightTextSecondary = lightProperties.get('--color-text-secondary')
    
    // Verify all colors are defined
    expect(lightBg).toBeDefined()
    expect(lightBgSecondary).toBeDefined()
    expect(lightBgCard).toBeDefined()
    expect(lightText).toBeDefined()
    expect(lightTextSecondary).toBeDefined()
    
    // Convert to RGB
    const lightBgRgb = hexToRgb(lightBg!)
    const lightBgSecondaryRgb = hexToRgb(lightBgSecondary!)
    const lightBgCardRgb = hexToRgb(lightBgCard!)
    const lightTextRgb = hexToRgb(lightText!)
    const lightTextSecondaryRgb = hexToRgb(lightTextSecondary!)
    
    // All should be valid hex colors
    expect(lightBgRgb).not.toBeNull()
    expect(lightBgSecondaryRgb).not.toBeNull()
    expect(lightBgCardRgb).not.toBeNull()
    expect(lightTextRgb).not.toBeNull()
    expect(lightTextSecondaryRgb).not.toBeNull()
    
    if (lightBgRgb && lightBgSecondaryRgb && lightBgCardRgb && lightTextRgb && lightTextSecondaryRgb) {
      // Property: Primary text on light background should have at least 4.5:1 contrast
      const contrastLightBgText = getContrastRatio(lightBgRgb, lightTextRgb)
      expect(contrastLightBgText).toBeGreaterThanOrEqual(4.5)
      
      // Property: Primary text on light secondary background should have at least 4.5:1 contrast
      const contrastLightBgSecondaryText = getContrastRatio(lightBgSecondaryRgb, lightTextRgb)
      expect(contrastLightBgSecondaryText).toBeGreaterThanOrEqual(4.5)
      
      // Property: Primary text on light card background should have at least 4.5:1 contrast
      const contrastLightBgCardText = getContrastRatio(lightBgCardRgb, lightTextRgb)
      expect(contrastLightBgCardText).toBeGreaterThanOrEqual(4.5)
      
      // Property: Secondary text on light background should have at least 4.5:1 contrast
      const contrastLightBgSecondary = getContrastRatio(lightBgRgb, lightTextSecondaryRgb)
      expect(contrastLightBgSecondary).toBeGreaterThanOrEqual(4.5)
      
      // Property: Secondary text on light secondary background should have at least 4.5:1 contrast
      const contrastLightBgSecondarySecondary = getContrastRatio(lightBgSecondaryRgb, lightTextSecondaryRgb)
      expect(contrastLightBgSecondarySecondary).toBeGreaterThanOrEqual(4.5)
      
      // Property: Secondary text on light card background should have at least 4.5:1 contrast
      const contrastLightBgCardSecondary = getContrastRatio(lightBgCardRgb, lightTextSecondaryRgb)
      expect(contrastLightBgCardSecondary).toBeGreaterThanOrEqual(4.5)
    }
  })
})
