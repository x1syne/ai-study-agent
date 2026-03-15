'use client'

import { useAppStore } from '@/lib/store'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { GraduationCap } from 'lucide-react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarOpen } = useAppStore()
  const { isLoading }   = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-center">
          <div className="relative mx-auto mb-5 w-fit">
            <div className="w-16 h-16 bg-gradient-to-br from-[var(--color-primary)] to-[#4f46e5] rounded-2xl flex items-center justify-center animate-pulse">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[#4f46e5] blur-xl opacity-30 animate-glow-pulse" />
          </div>
          <div className="flex items-center gap-2 justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Global ambient glow — subtle background effect */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        aria-hidden
        style={{
          background: [
            'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(124,58,237,0.07) 0%, transparent 60%)',
            'radial-gradient(ellipse 50% 30% at 85% 85%, rgba(6,182,212,0.04) 0%, transparent 50%)',
          ].join(', '),
        }}
      />

      <Sidebar />

      <div
        className={cn(
          'relative z-10 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          'ml-0',
          sidebarOpen ? 'lg:ml-72' : 'lg:ml-[72px]'
        )}
      >
        <Header />

        <main className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>
    </div>
  )
}
