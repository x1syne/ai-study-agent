'use client'

import { Brain } from '@phosphor-icons/react'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="study-app flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] bg-[#101816] text-[#c6ff4d] shadow-lg">
            <Brain size={27} weight="duotone" />
          </div>
          <p className="text-sm font-semibold text-[var(--color-text-secondary)]">Загружаем рабочее пространство</p>
        </div>
      </div>
    )
  }

  return (
    <div className="study-app">
      <Sidebar />
      <div className="min-h-screen lg:ml-[280px]">
        <Header />
        <main className="mx-auto min-h-[calc(100vh-76px)] max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
