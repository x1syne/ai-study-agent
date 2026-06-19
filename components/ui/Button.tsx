'use client'

import { forwardRef } from 'react'
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
    ...props
  }, ref) => {
    const base = [
      'relative inline-flex items-center justify-center gap-2 font-bold',
      'rounded-full border transition-all duration-150 select-none',
      'disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none',
      'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(198,255,77,0.35)]',
    ].join(' ')

    const variants: Record<string, string> = {
      primary: 'border-[#a9e92b] bg-[var(--color-primary)] text-[var(--color-primary-ink)] shadow-[var(--shadow-primary)] hover:bg-[var(--color-primary-light)] hover:-translate-y-0.5',
      accent: 'border-[#101816] bg-[#101816] text-white hover:bg-[#27332f] hover:-translate-y-0.5',
      secondary: 'border-[var(--color-border)] bg-white text-[var(--color-text)] shadow-sm hover:bg-[var(--color-bg-hover)]',
      outline: 'border-[var(--color-border-light)] bg-white text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]',
      ghost: 'border-transparent bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text)]',
      danger: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    }

    const sizes: Record<string, string> = {
      xs: 'h-7 px-3 text-[11px]',
      sm: 'h-8 px-3.5 text-xs',
      md: 'h-10 px-5 text-sm',
      lg: 'h-12 px-7 text-[15px]',
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
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
