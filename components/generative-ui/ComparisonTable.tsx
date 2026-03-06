'use client'

import { Scale } from 'lucide-react'
import type { ComparisonData } from './types'

interface ComparisonTableProps {
  data: ComparisonData
}

export function ComparisonTable({ data }: ComparisonTableProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <Scale className="w-5 h-5 text-primary-400" />
        <h4 className="font-medium text-white">{data.title}</h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-2 px-3 text-slate-400 font-medium text-sm">
                Характеристика
              </th>
              {data.headers.map((header, i) => (
                <th key={i} className="text-left py-2 px-3 text-primary-400 font-medium text-sm">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-700/50 last:border-0">
                <td className="py-2 px-3 text-slate-300 text-sm font-medium">
                  {row.feature}
                </td>
                {row.values.map((value, j) => (
                  <td key={j} className="py-2 px-3 text-slate-400 text-sm">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

