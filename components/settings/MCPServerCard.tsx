/**
 * MCP Server Card Component
 * Displays individual MCP server status and controls
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Power, 
  RotateCw, 
  ChevronDown, 
  ChevronUp,
  Terminal
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MCPServerCardProps {
  name: string
  status: 'running' | 'stopped' | 'error'
  enabled: boolean
  lastPing?: number
  error?: string
  tools: string[]
  logs: string[]
  onToggle: (enabled: boolean) => void
  onRestart: () => void
}

export function MCPServerCard({
  name,
  status,
  enabled,
  lastPing,
  error,
  tools,
  logs,
  onToggle,
  onRestart
}: MCPServerCardProps) {
  const [showLogs, setShowLogs] = useState(false)
  const [showTools, setShowTools] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const [isRestarting, setIsRestarting] = useState(false)

  const handleToggle = async () => {
    setIsToggling(true)
    try {
      await onToggle(!enabled)
    } finally {
      setIsToggling(false)
    }
  }

  const handleRestart = async () => {
    setIsRestarting(true)
    try {
      await onRestart()
    } finally {
      setIsRestarting(false)
    }
  }

  // Status indicator
  const statusConfig = {
    running: {
      icon: <CheckCircle className="w-5 h-5" />,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/30',
      label: 'Работает'
    },
    stopped: {
      icon: <XCircle className="w-5 h-5" />,
      color: 'text-slate-400',
      bgColor: 'bg-slate-500/20',
      borderColor: 'border-slate-500/30',
      label: 'Остановлен'
    },
    error: {
      icon: <AlertCircle className="w-5 h-5" />,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/30',
      label: 'Ошибка'
    }
  }

  const currentStatus = statusConfig[status]

  return (
    <Card className="bg-slate-900/50 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${currentStatus.bgColor}`}>
              <Server className={`w-5 h-5 ${currentStatus.color}`} />
            </div>
            <div>
              <CardTitle className="text-white text-lg">{name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <div className={`flex items-center gap-1 ${currentStatus.color}`}>
                  {currentStatus.icon}
                  <span className="text-sm">{currentStatus.label}</span>
                </div>
                {lastPing && status === 'running' && (
                  <span className="text-xs text-slate-500">
                    • {Math.round((Date.now() - lastPing) / 1000)}s ago
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestart}
              disabled={!enabled || isRestarting}
              className="text-slate-400 hover:text-white"
              title="Перезапустить сервер"
            >
              <RotateCw className={`w-4 h-4 ${isRestarting ? 'animate-spin' : ''}`} />
            </Button>
            <button
              onClick={handleToggle}
              disabled={isToggling}
              className={`w-12 h-6 rounded-full transition-colors ${
                enabled ? 'bg-green-500' : 'bg-slate-600'
              } ${isToggling ? 'opacity-50' : ''}`}
              title={enabled ? 'Отключить' : 'Включить'}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Tools Section */}
        <div>
          <button
            onClick={() => setShowTools(!showTools)}
            className="flex items-center justify-between w-full text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            <span>Инструменты ({tools.length})</span>
            {showTools ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showTools && (
            <div className="mt-2 space-y-1">
              {tools.map((tool, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-2 rounded"
                >
                  <Terminal className="w-3 h-3" />
                  <code>{tool}</code>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logs Section */}
        <div>
          <button
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center justify-between w-full text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            <span>Логи ({logs.length})</span>
            {showLogs ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showLogs && (
            <div className="mt-2 bg-slate-950 rounded-lg p-3 max-h-48 overflow-y-auto">
              <div className="space-y-1 font-mono text-xs">
                {logs.map((log, index) => (
                  <div key={index} className="text-slate-400">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
