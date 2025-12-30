'use client'

import { cn } from '@/lib/utils'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-slate-700 border-t-primary-500',
        sizes[size],
        className
      )}
    />
  )
}

interface LoadingPageProps {
  message?: string
}

export function LoadingPage({ message = 'Загрузка...' }: LoadingPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-slate-400">{message}</p>
    </div>
  )
}

interface LoadingOverlayProps {
  message?: string
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <LoadingSpinner size="lg" />
        {message && <p className="mt-4 text-white">{message}</p>}
      </div>
    </div>
  )
}

