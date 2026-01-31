/**
 * MCP Server Management Component
 * Main component for managing MCP servers
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

'use client'

import { useState, useEffect } from 'react'
import { MCPServerCard } from './MCPServerCard'
import { Server, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MCPServer {
  name: string
  status: 'running' | 'stopped' | 'error'
  enabled: boolean
  lastPing?: number
  error?: string
  tools: string[]
  logs: string[]
}

export function MCPServerManagement() {
  const [servers, setServers] = useState<MCPServer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchServers = async () => {
    try {
      setError(null)
      const response = await fetch('/api/mcp/servers')
      
      if (!response.ok) {
        throw new Error('Failed to fetch MCP servers')
      }

      const data = await response.json()
      setServers(data.servers || [])
    } catch (err) {
      console.error('Error fetching MCP servers:', err)
      setError(err instanceof Error ? err.message : 'Failed to load servers')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchServers()
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchServers()
  }

  const handleToggleServer = async (serverName: string, enabled: boolean) => {
    try {
      const action = enabled ? 'enable' : 'disable'
      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverName,
          action
        })
      })

      if (!response.ok) {
        throw new Error('Failed to toggle server')
      }

      // Update local state
      setServers(prev =>
        prev.map(server =>
          server.name === serverName
            ? { ...server, enabled, status: enabled ? 'running' : 'stopped' }
            : server
        )
      )

      console.log(`[MCP] Server ${serverName} ${action}d`)
    } catch (err) {
      console.error('Error toggling server:', err)
      alert('Не удалось изменить статус сервера')
    }
  }

  const handleRestartServer = async (serverName: string) => {
    try {
      const response = await fetch('/api/mcp/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          serverName,
          action: 'restart'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to restart server')
      }

      // Refresh server list
      await fetchServers()

      console.log(`[MCP] Server ${serverName} restarted`)
    } catch (err) {
      console.error('Error restarting server:', err)
      alert('Не удалось перезапустить сервер')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Загрузка серверов...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-red-300 font-medium">Ошибка загрузки серверов</p>
            <p className="text-red-400 text-sm mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-3 bg-red-500/20 border-red-500/30 text-red-300 hover:bg-red-500/30"
            >
              Попробовать снова
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Server className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">MCP Серверы</h3>
            <p className="text-sm text-slate-400">
              {servers.filter(s => s.status === 'running').length} из {servers.length} работают
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      {/* Info Box */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          MCP (Model Context Protocol) серверы предоставляют AI доступ к внешним инструментам.
          Вы можете включать/отключать серверы без перезапуска приложения.
        </p>
      </div>

      {/* Server List */}
      {servers.length === 0 ? (
        <div className="text-center py-12">
          <Server className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Нет настроенных MCP серверов</p>
          <p className="text-sm text-slate-500 mt-1">
            Добавьте серверы в .kiro/settings/mcp.json
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {servers.map(server => (
            <MCPServerCard
              key={server.name}
              name={server.name}
              status={server.status}
              enabled={server.enabled}
              lastPing={server.lastPing}
              error={server.error}
              tools={server.tools}
              logs={server.logs}
              onToggle={(enabled) => handleToggleServer(server.name, enabled)}
              onRestart={() => handleRestartServer(server.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
