'use client'

import { forwardRef, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  glow?: boolean
}

interface Ripple { x: number; y: number; size: number; id: number }

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    isLoading,
    leftIcon,
    rightIcon,
    glow = false,
    children,
    disabled,
    onClick,
    ...props
  }, ref) => {
    const [ripples, setRipples] = useState<Ripple[]>([])
    const rippleIdRef = useRef(0)

    const base = [
      'relative inline-flex items-center justify-center gap-2 font-semibold',
      'rounded-xl transition-all duration-200 cursor-pointer select-none',
      'overflow-hidden border border-transparent',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
    ].join(' ')

    const variants: Record<string, string> = {
      primary: [
        'text-white',
        'bg-gradient-to-r from-[var(--color-primary)] to-[#4f46e5]',
        'hover:from-[var(--color-primary-dark)] hover:to-[#4338ca]',
        'hover:-translate-y-0.5',
        glow ? 'shadow-glow-sm hover:shadow-glow-md' : 'shadow-md-dark hover:shadow-lg-dark',
      ].join(' '),

      accent: [
        'text-white',
        'bg-gradient-to-r from-[var(--color-accent)] to-[#22d3ee]',
        'hover:from-[#0891b2] hover:to-[var(--color-accent)]',
        'hover:-translate-y-0.5',
        'shadow-md-dark hover:shadow-accent',
      ].join(' '),

      secondary: [
        'text-[var(--color-text)] bg-[var(--color-bg-elevated)]',
        'border-[var(--color-border-light)]',
        'hover:bg-[var(--color-bg-hover)] hover:border-[var(--color-primary)]/40',
        'hover:-translate-y-0.5',
      ].join(' '),

      outline: [
        'text-[var(--color-primary-light)] bg-transparent',
        'border-[var(--color-primary)]/40',
        'hover:bg-[var(--color-primary)]/8 hover:border-[var(--color-primary)]/70',
      ].join(' '),

      ghost: [
        'text-[var(--color-text-secondary)] bg-transparent border-transparent',
        'hover:text-white hover:bg-white/5',
      ].join(' '),

      danger: [
        'text-red-400 bg-red-500/10 border-red-500/25',
        'hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-300',
      ].join(' '),
    }

    const sizes: Record<string, string> = {
      xs: 'h-7  px-2.5 text-[11px] gap-1.5 rounded-lg',
      sm: 'h-8  px-3.5 text-xs',
      md: 'h-10 px-5   text-sm',
      lg: 'h-12 px-7   text-[15px]',
    }

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isLoading) return
      const btn  = e.currentTarget
      const rect = btn.getBoundingClientRect()
      const rpl: Ripple = {
        x:    e.clientX - rect.left,
        y:    e.clientY - rect.top,
        size: Math.max(rect.width, rect.height) * 2,
        id:   rippleIdRef.current++,
      }
      setRipples(p => [...p, rpl])
      setTimeout(() => setRipples(p => p.filter(r => r.id !== rpl.id)), 600)
      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {/* Shimmer overlay on primary */}
        {(variant === 'primary' || variant === 'accent') && (
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 pointer-events-none" />
        )}

        {/* Ripple effect */}
        {ripples.map(r => (
          <span
            key={r.id}
            className="absolute rounded-full bg-white/20 animate-[ripple_0.6s_ease-out_forwards] pointer-events-none"
            style={{
              left:   r.x - r.size / 2,
              top:    r.y - r.size / 2,
              width:  r.size,
              height: r.size,
            }}
          />
        ))}

        {/* Content */}
        {isLoading ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <>
            {leftIcon  && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
export { Button }
export default Button
