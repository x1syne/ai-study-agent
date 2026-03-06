'use client'

import { TrendingUp } from 'lucide-react'
import type { ProgressData } from './types'

interface ProgressCardProps {
  data: ProgressData
}

export function ProgressCard({ data }: ProgressCardProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-primary-400" />
        <h4 className="font-medium text-white">{data.title}</h4>
      </div>

      <div className="space-y-4">
        {data.items.map((item, i) => {
          const percentage = Math.round((item.value / item.max) * 100)
          const color = item.color || 'primary'
          
          return (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-300">{item.label}</span>
                <span className="text-slate-400">{item.value}/{item.max}</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    color === 'green' ? 'bg-green-500' :
                    color === 'yellow' ? 'bg-yellow-500' :
                    color === 'red' ? 'bg-red-500' :
                    'bg-primary-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

