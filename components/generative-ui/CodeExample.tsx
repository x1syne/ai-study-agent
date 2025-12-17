'use client'

import { useState } from 'react'
import { Code, Copy, Check } from 'lucide-react'
import type { CodeData } from './types'

interface CodeExampleProps {
  data: CodeData
}

export function CodeExample({ data }: CodeExampleProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(data.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-primary-400" />
          <span className="text-sm text-slate-400">{data.title || data.language}</span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded hover:bg-slate-700 transition-colors"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Copy className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>
      
      {data.description && (
        <p className="px-4 py-2 text-sm text-slate-400 border-b border-slate-700/50">
          {data.description}
        </p>
      )}
      
      <pre className="p-4 overflow-x-auto">
        <code className="text-sm text-slate-300 font-mono">{data.code}</code>
      </pre>
    </div>
  )
}

