'use client'

import { forwardRef, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

interface Ripple {
  x: number
  y: number
  size: number
  id: number
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    isLoading, 
    leftIcon,
    rightIcon,
    children, 
    disabled,
    onClick,
    ...props 
  }, ref) => {
    const [ripples, setRipples] = useState<Ripple[]>([])
    const rippleIdRef = useRef(0)

    const variants = {
      primary: 'bg-gradient-to-r from-primary-500 to-accent-500 text-white hover:from-primary-600 hover:to-accent-600',
      secondary: 'bg-slate-700/50 text-white border border-slate-600/50 hover:bg-slate-700',
      ghost: 'text-slate-300 hover:text-white hover:bg-slate-800/50',
      danger: 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    }

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isLoading) return

      const button = e.currentTarget
      const rect = button.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const size = Math.max(rect.width, rect.height) * 2

      const newRipple: Ripple = {
        x,
        y,
        size,
        id: rippleIdRef.current++
      }

      setRipples(prev => [...prev, newRipple])

      // Cleanup ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id))
      }, 600)

      onClick?.(e)
    }

    return (
      <button
        ref={ref}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 font-medium rounded-lg overflow-hidden',
          'focus:outline-none focus:ring-2 focus:ring-primary-500/50',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'active:scale-95',
          'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        onClick={handleClick}
        {...props}
      >
        {/* Ripple container */}
        <span className="absolute inset-0 overflow-hidden pointer-events-none">
          {ripples.map(ripple => (
            <span
              key={ripple.id}
              className="absolute rounded-full bg-white/30 animate-ripple"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: ripple.size,
                height: ripple.size,
                transform: 'translate(-50%, -50%) scale(0)',
                animation: 'ripple 0.6s ease-out'
              }}
            />
          ))}
        </span>

        {/* Button content */}
        <span className="relative z-10 inline-flex items-center justify-center gap-2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : leftIcon}
          {children}
          {!isLoading && rightIcon}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }

