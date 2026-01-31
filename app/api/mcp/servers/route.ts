/**
 * API endpoint for MCP Server Management
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Mock MCP server status for now
// In production, this would query actual MCP servers
interface MCPServerStatus {
  name: string
  status: 'running' | 'stopped' | 'error'
  enabled: boolean
  lastPing?: number
  error?: string
  tools: string[]
  logs: string[]
}

/**
 * GET /api/mcp/servers
 * Get list of configured MCP servers with their status
 * Requirements: 8.1, 8.2
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mock server data
    // In production, this would read from .kiro/settings/mcp.json and query actual servers
    const servers: MCPServerStatus[] = [
      {
        name: 'filesystem',
        status: 'running',
        enabled: true,
        lastPing: Date.now(),
        tools: ['save_file', 'read_file', 'list_files', 'delete_file'],
        logs: [
          `[${new Date().toISOString()}] Server started successfully`,
          `[${new Date().toISOString()}] Connected to filesystem`,
          `[${new Date().toISOString()}] Ready to accept requests`
        ]
      },
      {
        name: 'brave-search',
        status: 'running',
        enabled: true,
        lastPing: Date.now() - 5000,
        tools: ['search', 'search_cached'],
        logs: [
          `[${new Date().toISOString()}] Server started successfully`,
          `[${new Date().toISOString()}] API key validated`,
          `[${new Date().toISOString()}] Ready to accept requests`
        ]
      },
      {
        name: 'git',
        status: 'stopped',
        enabled: false,
        tools: ['git_status', 'git_commit', 'git_push', 'git_pull'],
        logs: [
          `[${new Date().toISOString()}] Server disabled in configuration`
        ]
      }
    ]

    return NextResponse.json({ servers })
  } catch (error) {
    console.error('Error fetching MCP servers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/mcp/servers
 * Enable/disable or restart an MCP server
 * Requirements: 8.4
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { serverName, action } = body

    if (!serverName || !action) {
      return NextResponse.json(
        { error: 'Server name and action are required' },
        { status: 400 }
      )
    }

    if (!['enable', 'disable', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be enable, disable, or restart' },
        { status: 400 }
      )
    }

    console.log(`[MCP API] ${action} server: ${serverName}`)

    // Mock response
    // In production, this would update .kiro/settings/mcp.json and restart the server
    const newStatus = action === 'enable' ? 'running' : action === 'disable' ? 'stopped' : 'running'

    return NextResponse.json({
      success: true,
      serverName,
      action,
      status: newStatus,
      message: `Server ${serverName} ${action}d successfully`
    })
  } catch (error) {
    console.error('Error managing MCP server:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
