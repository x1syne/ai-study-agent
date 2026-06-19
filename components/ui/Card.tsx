'use client'

import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  variant?: 'default' | 'primary' | 'outline'
  glass?: 'subtle' | 'medium' | 'intense' | false
  glow?: boolean
  animatedBorder?: boolean
  containerQuery?: boolean
}

export function Card({
  className,
  hover,
  variant = 'default',
  glass = false,
  containerQuery = false,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        'practicum-card',
        variant === 'primary' && 'practicum-card-primary',
        variant === 'outline' && 'border-dashed bg-transparent',
        hover && 'cursor-pointer',
        glass && 'glass',
        containerQuery && 'container',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 sm:p-6 pb-0', className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-bold text-[var(--color-text)]', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('mt-1 text-sm font-medium text-[var(--color-text-secondary)]', className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-5 sm:p-6', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-4 p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFocusContainer({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('focus-mode-container', className)} {...props}>
      {children}
    </div>
  )
}

export function CardFocusMode({ className, hover, children, ...props }: CardProps) {
  return (
    <div className={cn('practicum-card focus-mode-item', hover && 'cursor-pointer', className)} {...props}>
      {children}
    </div>
  )
}
