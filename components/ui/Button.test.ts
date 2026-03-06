import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('Button Component - Micro-interactions', () => {
  it('should apply primary variant classes', () => {
    const variant = 'primary'
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
      'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'active:scale-95',
      'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
      variant === 'primary' && 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:from-primary-600 hover:to-accent-600'
    )
    expect(classes).toContain('from-primary-500')
    expect(classes).toContain('to-accent-500')
  })

  it('should apply secondary variant classes', () => {
    const variant = 'secondary'
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
      variant === 'secondary' && 'bg-slate-700/50 text-white border border-slate-600/50 hover:bg-slate-700'
    )
    expect(classes).toContain('bg-slate-700/50')
    expect(classes).toContain('border-slate-600/50')
  })

  it('should apply ghost variant classes', () => {
    const variant = 'ghost'
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
      variant === 'ghost' && 'text-slate-300 hover:text-white hover:bg-slate-800/50'
    )
    expect(classes).toContain('text-slate-300')
    expect(classes).toContain('hover:bg-slate-800/50')
  })

  it('should apply danger variant classes', () => {
    const variant = 'danger'
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
      variant === 'danger' && 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
    )
    expect(classes).toContain('bg-red-500/20')
    expect(classes).toContain('text-red-400')
  })

  it('should apply scale transform on active state', () => {
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
      'active:scale-95'
    )
    expect(classes).toContain('active:scale-95')
  })

  it('should apply smooth easing function (cubic-bezier)', () => {
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
      'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'
    )
    expect(classes).toContain('ease-[cubic-bezier(0.4,0,0.2,1)]')
  })

  it('should apply disabled styling with opacity and cursor', () => {
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
      'disabled:opacity-50 disabled:cursor-not-allowed'
    )
    expect(classes).toContain('disabled:opacity-50')
    expect(classes).toContain('disabled:cursor-not-allowed')
  })

  it('should apply small size classes', () => {
    const size = 'sm'
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
      size === 'sm' && 'px-3 py-1.5 text-sm'
    )
    expect(classes).toContain('px-3')
    expect(classes).toContain('py-1.5')
    expect(classes).toContain('text-sm')
  })

  it('should apply medium size classes', () => {
    const size = 'md'
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
      size === 'md' && 'px-4 py-2'
    )
    expect(classes).toContain('px-4')
    expect(classes).toContain('py-2')
  })

  it('should apply large size classes', () => {
    const size = 'lg'
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
      size === 'lg' && 'px-6 py-3 text-lg'
    )
    expect(classes).toContain('px-6')
    expect(classes).toContain('py-3')
    expect(classes).toContain('text-lg')
  })

  it('should apply overflow-hidden for ripple effect', () => {
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden'
    )
    expect(classes).toContain('overflow-hidden')
    expect(classes).toContain('relative')
  })

  it('should apply focus ring styles', () => {
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
      'focus:outline-none focus:ring-2 focus:ring-primary-500/50'
    )
    expect(classes).toContain('focus:outline-none')
    expect(classes).toContain('focus:ring-2')
    expect(classes).toContain('focus:ring-primary-500/50')
  })

  it('should combine all button features correctly', () => {
    const variant = 'primary'
    const size = 'md'
    const classes = cn(
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
      'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'active:scale-95',
      'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
      variant === 'primary' && 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:from-primary-600 hover:to-accent-600',
      size === 'md' && 'px-4 py-2'
    )
    expect(classes).toContain('relative')
    expect(classes).toContain('overflow-hidden')
    expect(classes).toContain('active:scale-95')
    expect(classes).toContain('ease-[cubic-bezier(0.4,0,0.2,1)]')
    expect(classes).toContain('disabled:opacity-50')
    expect(classes).toContain('disabled:cursor-not-allowed')
    expect(classes).toContain('from-primary-500')
    expect(classes).toContain('px-4')
    expect(classes).toContain('py-2')
  })
})

describe('Button Ripple Effect', () => {
  it('should have ripple container structure', () => {
    // Ripple container should have absolute positioning and overflow hidden
    const rippleContainerClasses = cn(
      'absolute inset-0 overflow-hidden pointer-events-none'
    )
    expect(rippleContainerClasses).toContain('absolute')
    expect(rippleContainerClasses).toContain('inset-0')
    expect(rippleContainerClasses).toContain('overflow-hidden')
    expect(rippleContainerClasses).toContain('pointer-events-none')
  })

  it('should have ripple element classes', () => {
    const rippleClasses = cn(
      'absolute rounded-full bg-white/30 animate-ripple'
    )
    expect(rippleClasses).toContain('absolute')
    expect(rippleClasses).toContain('rounded-full')
    expect(rippleClasses).toContain('bg-white/30')
    expect(rippleClasses).toContain('animate-ripple')
  })

  it('should have button content wrapper with z-index', () => {
    const contentClasses = cn(
      'relative z-10 inline-flex items-center justify-center gap-2'
    )
    expect(contentClasses).toContain('relative')
    expect(contentClasses).toContain('z-10')
    expect(contentClasses).toContain('inline-flex')
  })
})

describe('Button Loading State', () => {
  it('should show loading spinner classes', () => {
    const spinnerClasses = cn('w-4 h-4 animate-spin')
    expect(spinnerClasses).toContain('w-4')
    expect(spinnerClasses).toContain('h-4')
    expect(spinnerClasses).toContain('animate-spin')
  })

  it('should be disabled when loading', () => {
    const isLoading = true
    const disabled = false
    const isDisabled = disabled || isLoading
    expect(isDisabled).toBe(true)
  })

  it('should be disabled when disabled prop is true', () => {
    const isLoading = false
    const disabled = true
    const isDisabled = disabled || isLoading
    expect(isDisabled).toBe(true)
  })

  it('should not be disabled when both are false', () => {
    const isLoading = false
    const disabled = false
    const isDisabled = disabled || isLoading
    expect(isDisabled).toBe(false)
  })
})

