'use client'

import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  variant?: 'default' | 'primary' | 'outline'
}

export function Card({ className, hover, variant = 'default', children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'practicum-card',
        variant === 'primary' && 'practicum-card-primary',
        variant === 'outline' && 'bg-transparent border-dashed',
        hover && 'cursor-pointer',
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
    <h3 className={cn('text-lg sm:text-xl font-semibold text-white', className)} {...props}>
      {children}
    </h3>
  )
}

export function CardDescription({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-[var(--color-text-secondary)] mt-1 text-sm', className)} {...props}>
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
    <div className={cn('p-5 sm:p-6 pt-0 flex items-center gap-4', className)} {...props}>
      {children}
    </div>
  )
}

