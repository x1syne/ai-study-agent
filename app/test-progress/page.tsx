'use client'

import { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/Progress'

export default function TestProgressPage() {
  const [value, setValue] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setValue((prev) => {
        if (prev >= 100) return 0
        return prev + 10
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-[var(--color-bg)] p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <h1 className="text-4xl font-bold text-white mb-8">Progress Component Test</h1>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Basic Progress</h2>
          <Progress value={value} showLabel />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Animated Progress with Count-up</h2>
          <Progress value={value} showLabel animated />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Progress with Glow Effect</h2>
          <Progress value={value} showLabel glow />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Animated + Glow</h2>
          <Progress value={value} showLabel animated glow />
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Size Variants</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-2">Small</p>
              <Progress value={value} size="sm" />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Medium (default)</p>
              <Progress value={value} size="md" />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Large</p>
              <Progress value={value} size="lg" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Color Variants</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-2">Primary</p>
              <Progress value={value} color="primary" showLabel />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Success</p>
              <Progress value={value} color="success" showLabel />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Warning</p>
              <Progress value={value} color="warning" showLabel />
            </div>
            <div>
              <p className="text-sm text-slate-400 mb-2">Danger</p>
              <Progress value={value} color="danger" showLabel />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">Success Animation (at 100%)</h2>
          <Progress value={100} showLabel animated glow color="success" />
          <p className="text-sm text-slate-400">
            Notice the pulse animation and green color when at 100%
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white">All Features Combined</h2>
          <Progress 
            value={value} 
            showLabel 
            animated 
            glow 
            size="lg" 
            color="primary"
          />
        </section>
      </div>
    </div>
  )
}
