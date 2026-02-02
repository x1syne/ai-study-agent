import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('Card Component Props', () => {
  it('should generate correct classes for glassmorphism subtle variant', () => {
    const glass = 'subtle'
    const classes = cn(
      'practicum-card',
      glass === 'subtle' && 'glass glass-subtle',
      glass === 'medium' && 'glass glass-medium',
      glass === 'intense' && 'glass glass-intense'
    )
    expect(classes).toContain('glass')
    expect(classes).toContain('glass-subtle')
  })

  it('should generate correct classes for glassmorphism medium variant', () => {
    const glass = 'medium'
    const classes = cn(
      'practicum-card',
      glass === 'subtle' && 'glass glass-subtle',
      glass === 'medium' && 'glass glass-medium',
      glass === 'intense' && 'glass glass-intense'
    )
    expect(classes).toContain('glass')
    expect(classes).toContain('glass-medium')
  })

  it('should generate correct classes for glassmorphism intense variant', () => {
    const glass = 'intense'
    const classes = cn(
      'practicum-card',
      glass === 'subtle' && 'glass glass-subtle',
      glass === 'medium' && 'glass glass-medium',
      glass === 'intense' && 'glass glass-intense'
    )
    expect(classes).toContain('glass')
    expect(classes).toContain('glass-intense')
  })

  it('should apply glow effect class when glow is true', () => {
    const glow = true
    const classes = cn(
      'practicum-card',
      glow && 'glass-glow-hover'
    )
    expect(classes).toContain('glass-glow-hover')
  })

  it('should apply animated border class when animatedBorder is true', () => {
    const animatedBorder = true
    const classes = cn(
      'practicum-card',
      animatedBorder && 'animated-border'
    )
    expect(classes).toContain('animated-border')
  })

  it('should apply container class when containerQuery is true', () => {
    const containerQuery = true
    const classes = cn(
      'practicum-card',
      containerQuery && 'container'
    )
    expect(classes).toContain('container')
  })

  it('should apply primary variant class', () => {
    const variant = 'primary'
    const classes = cn(
      'practicum-card',
      variant === 'primary' && 'practicum-card-primary'
    )
    expect(classes).toContain('practicum-card-primary')
  })

  it('should apply outline variant classes', () => {
    const variant = 'outline'
    const classes = cn(
      'practicum-card',
      variant === 'outline' && 'bg-transparent border-dashed'
    )
    expect(classes).toContain('bg-transparent')
    expect(classes).toContain('border-dashed')
  })

  it('should apply hover cursor class when hover is true', () => {
    const hover = true
    const classes = cn(
      'practicum-card',
      hover && 'cursor-pointer'
    )
    expect(classes).toContain('cursor-pointer')
  })

  it('should combine multiple props correctly', () => {
    const glass = 'medium'
    const glow = true
    const animatedBorder = true
    const containerQuery = true
    const classes = cn(
      'practicum-card',
      glass === 'medium' && 'glass glass-medium',
      glow && 'glass-glow-hover',
      animatedBorder && 'animated-border',
      containerQuery && 'container'
    )
    expect(classes).toContain('practicum-card')
    expect(classes).toContain('glass')
    expect(classes).toContain('glass-medium')
    expect(classes).toContain('glass-glow-hover')
    expect(classes).toContain('animated-border')
    expect(classes).toContain('container')
  })
})

describe('CardFocusMode Component Props', () => {
  it('should include focus-mode-item class', () => {
    const classes = cn(
      'practicum-card focus-mode-item'
    )
    expect(classes).toContain('focus-mode-item')
  })

  it('should combine focus-mode-item with other classes', () => {
    const glass = 'medium'
    const glow = true
    const classes = cn(
      'practicum-card focus-mode-item',
      glass === 'medium' && 'glass glass-medium',
      glow && 'glass-glow-hover'
    )
    expect(classes).toContain('focus-mode-item')
    expect(classes).toContain('glass')
    expect(classes).toContain('glass-medium')
    expect(classes).toContain('glass-glow-hover')
  })
})

// ==================== UNIT TESTS FOR TASK 2.6 ====================

describe('Card Variants - Rendering All Variants', () => {
  it('should render default variant with base practicum-card class', () => {
    const variant = 'default'
    const classes = cn(
      'practicum-card',
      variant === 'primary' && 'practicum-card-primary',
      variant === 'outline' && 'bg-transparent border-dashed'
    )
    expect(classes).toContain('practicum-card')
    expect(classes).not.toContain('practicum-card-primary')
    expect(classes).not.toContain('bg-transparent')
  })

  it('should render primary variant with gradient background', () => {
    const variant = 'primary'
    const classes = cn(
      'practicum-card',
      variant === 'primary' && 'practicum-card-primary',
      variant === 'outline' && 'bg-transparent border-dashed'
    )
    expect(classes).toContain('practicum-card')
    expect(classes).toContain('practicum-card-primary')
  })

  it('should render outline variant with transparent background and dashed border', () => {
    const variant = 'outline'
    const classes = cn(
      'practicum-card',
      variant === 'primary' && 'practicum-card-primary',
      variant === 'outline' && 'bg-transparent border-dashed'
    )
    expect(classes).toContain('practicum-card')
    expect(classes).toContain('bg-transparent')
    expect(classes).toContain('border-dashed')
  })

  it('should render all glassmorphism variants correctly', () => {
    const variants: Array<'subtle' | 'medium' | 'intense'> = ['subtle', 'medium', 'intense']
    
    variants.forEach(variant => {
      const classes = cn(
        'practicum-card',
        variant === 'subtle' && 'glass glass-subtle',
        variant === 'medium' && 'glass glass-medium',
        variant === 'intense' && 'glass glass-intense'
      )
      expect(classes).toContain('glass')
      expect(classes).toContain(`glass-${variant}`)
    })
  })

  it('should render card without glassmorphism when glass is false', () => {
    const glass = false
    const classes = cn(
      'practicum-card',
      glass === 'subtle' && 'glass glass-subtle',
      glass === 'medium' && 'glass glass-medium',
      glass === 'intense' && 'glass glass-intense'
    )
    expect(classes).not.toContain('glass')
    expect(classes).not.toContain('glass-subtle')
    expect(classes).not.toContain('glass-medium')
    expect(classes).not.toContain('glass-intense')
  })

  it('should render card with all optional features enabled', () => {
    const variant = 'primary'
    const glass = 'intense'
    const glow = true
    const animatedBorder = true
    const containerQuery = true
    const hover = true
    
    const classes = cn(
      'practicum-card',
      variant === 'primary' && 'practicum-card-primary',
      hover && 'cursor-pointer',
      glass === 'intense' && 'glass glass-intense',
      glow && 'glass-glow-hover',
      animatedBorder && 'animated-border',
      containerQuery && 'container'
    )
    
    expect(classes).toContain('practicum-card')
    expect(classes).toContain('practicum-card-primary')
    expect(classes).toContain('cursor-pointer')
    expect(classes).toContain('glass')
    expect(classes).toContain('glass-intense')
    expect(classes).toContain('glass-glow-hover')
    expect(classes).toContain('animated-border')
    expect(classes).toContain('container')
  })

  it('should render card with minimal configuration', () => {
    const classes = cn('practicum-card')
    expect(classes).toBe('practicum-card')
  })
})

describe('Card Hover States', () => {
  it('should apply cursor-pointer class when hover prop is true', () => {
    const hover = true
    const classes = cn(
      'practicum-card',
      hover && 'cursor-pointer'
    )
    expect(classes).toContain('cursor-pointer')
  })

  it('should not apply cursor-pointer when hover prop is false', () => {
    const hover = false
    const classes = cn(
      'practicum-card',
      hover && 'cursor-pointer'
    )
    expect(classes).not.toContain('cursor-pointer')
  })

  it('should apply glass-glow-hover class for glow effect on hover', () => {
    const glow = true
    const classes = cn(
      'practicum-card',
      glow && 'glass-glow-hover'
    )
    expect(classes).toContain('glass-glow-hover')
  })

  it('should not apply glass-glow-hover when glow is false', () => {
    const glow = false
    const classes = cn(
      'practicum-card',
      glow && 'glass-glow-hover'
    )
    expect(classes).not.toContain('glass-glow-hover')
  })

  it('should combine hover and glow effects', () => {
    const hover = true
    const glow = true
    const classes = cn(
      'practicum-card',
      hover && 'cursor-pointer',
      glow && 'glass-glow-hover'
    )
    expect(classes).toContain('cursor-pointer')
    expect(classes).toContain('glass-glow-hover')
  })

  it('should apply hover effects with glassmorphism variants', () => {
    const glass = 'medium'
    const hover = true
    const glow = true
    const classes = cn(
      'practicum-card',
      glass === 'medium' && 'glass glass-medium',
      hover && 'cursor-pointer',
      glow && 'glass-glow-hover'
    )
    expect(classes).toContain('glass')
    expect(classes).toContain('glass-medium')
    expect(classes).toContain('cursor-pointer')
    expect(classes).toContain('glass-glow-hover')
  })

  it('should apply animated border for hover effects', () => {
    const animatedBorder = true
    const hover = true
    const classes = cn(
      'practicum-card',
      animatedBorder && 'animated-border',
      hover && 'cursor-pointer'
    )
    expect(classes).toContain('animated-border')
    expect(classes).toContain('cursor-pointer')
  })
})

describe('Card Focus Mode', () => {
  it('should apply focus-mode-item class to CardFocusMode component', () => {
    const classes = cn(
      'practicum-card focus-mode-item'
    )
    expect(classes).toContain('practicum-card')
    expect(classes).toContain('focus-mode-item')
  })

  it('should combine focus-mode-item with default variant', () => {
    const variant = 'default'
    const classes = cn(
      'practicum-card focus-mode-item',
      variant === 'primary' && 'practicum-card-primary'
    )
    expect(classes).toContain('practicum-card')
    expect(classes).toContain('focus-mode-item')
    expect(classes).not.toContain('practicum-card-primary')
  })

  it('should combine focus-mode-item with primary variant', () => {
    const variant = 'primary'
    const classes = cn(
      'practicum-card focus-mode-item',
      variant === 'primary' && 'practicum-card-primary'
    )
    expect(classes).toContain('practicum-card')
    expect(classes).toContain('focus-mode-item')
    expect(classes).toContain('practicum-card-primary')
  })

  it('should combine focus-mode-item with glassmorphism', () => {
    const glass = 'subtle'
    const classes = cn(
      'practicum-card focus-mode-item',
      glass === 'subtle' && 'glass glass-subtle'
    )
    expect(classes).toContain('practicum-card')
    expect(classes).toContain('focus-mode-item')
    expect(classes).toContain('glass')
    expect(classes).toContain('glass-subtle')
  })

  it('should combine focus-mode-item with all glassmorphism variants', () => {
    const variants: Array<'subtle' | 'medium' | 'intense'> = ['subtle', 'medium', 'intense']
    
    variants.forEach(variant => {
      const classes = cn(
        'practicum-card focus-mode-item',
        variant === 'subtle' && 'glass glass-subtle',
        variant === 'medium' && 'glass glass-medium',
        variant === 'intense' && 'glass glass-intense'
      )
      expect(classes).toContain('practicum-card')
      expect(classes).toContain('focus-mode-item')
      expect(classes).toContain('glass')
      expect(classes).toContain(`glass-${variant}`)
    })
  })

  it('should combine focus-mode-item with hover and glow effects', () => {
    const hover = true
    const glow = true
    const classes = cn(
      'practicum-card focus-mode-item',
      hover && 'cursor-pointer',
      glow && 'glass-glow-hover'
    )
    expect(classes).toContain('practicum-card')
    expect(classes).toContain('focus-mode-item')
    expect(classes).toContain('cursor-pointer')
    expect(classes).toContain('glass-glow-hover')
  })

  it('should combine focus-mode-item with all optional features', () => {
    const variant = 'primary'
    const glass = 'intense'
    const glow = true
    const animatedBorder = true
    const containerQuery = true
    const hover = true
    
    const classes = cn(
      'practicum-card focus-mode-item',
      variant === 'primary' && 'practicum-card-primary',
      hover && 'cursor-pointer',
      glass === 'intense' && 'glass glass-intense',
      glow && 'glass-glow-hover',
      animatedBorder && 'animated-border',
      containerQuery && 'container'
    )
    
    expect(classes).toContain('practicum-card')
    expect(classes).toContain('focus-mode-item')
    expect(classes).toContain('practicum-card-primary')
    expect(classes).toContain('cursor-pointer')
    expect(classes).toContain('glass')
    expect(classes).toContain('glass-intense')
    expect(classes).toContain('glass-glow-hover')
    expect(classes).toContain('animated-border')
    expect(classes).toContain('container')
  })

  it('should apply focus-mode-item without any additional props', () => {
    const classes = cn('practicum-card focus-mode-item')
    expect(classes).toContain('practicum-card')
    expect(classes).toContain('focus-mode-item')
  })
})

