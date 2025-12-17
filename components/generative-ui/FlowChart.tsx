'use client'

import { GitBranch } from 'lucide-react'
import type { FlowchartData } from './types'

interface FlowChartProps {
  data: FlowchartData
}

export function FlowChart({ data }: FlowChartProps) {
  const getNodeStyle = (type?: string) => {
    switch (type) {
      case 'start':
        return 'bg-green-500/20 border-green-500/50 text-green-300 rounded-full'
      case 'end':
        return 'bg-red-500/20 border-red-500/50 text-red-300 rounded-full'
      case 'decision':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300 rotate-45'
      default:
        return 'bg-primary-500/20 border-primary-500/50 text-primary-300 rounded-lg'
    }
  }

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-5 h-5 text-primary-400" />
        <h4 className="font-medium text-white">{data.title}</h4>
      </div>

      <div className="flex flex-col items-center gap-2">
        {data.nodes.map((node, i) => (
          <div key={node.id} className="flex flex-col items-center">
            <div
              className={`px-4 py-2 border-2 text-sm font-medium min-w-[120px] text-center ${getNodeStyle(node.type)}`}
            >
              <span className={node.type === 'decision' ? '-rotate-45 block' : ''}>
                {node.label}
              </span>
            </div>
            
            {i < data.nodes.length - 1 && (
              <div className="flex flex-col items-center">
                <div className="w-0.5 h-4 bg-slate-600" />
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-600" />
                {data.connections[i]?.label && (
                  <span className="text-xs text-slate-500 mt-1">{data.connections[i].label}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

