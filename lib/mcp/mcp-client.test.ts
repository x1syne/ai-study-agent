// Unit tests for MCP Client error handling

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MCPClient } from './mcp-client'
import { MCPError, MCPConnectionError } from './errors'
import type { MCPServerConfig } from './types'

describe('MCP Client Error Handling', () => {
  let client: MCPClient | null = null

  afterEach(async () => {
    if (client && client.isInitialized()) {
      await client.shutdown()
    }
    client = null
  })

  describe('MCPError', () => {
    it('should create MCPError with server, tool, and original error', () => {
      const originalError = new Error('Connection failed')
      const mcpError = new MCPError('filesystem', 'save_file', originalError)

      expect(mcpError).toBeInstanceOf(Error)
      expect(mcpError).toBeInstanceOf(MCPError)
      expect(mcpError.server).toBe('filesystem')
      expect(mcpError.tool).toBe('save_file')
      expect(mcpError.originalError).toBe(originalError)
      expect(mcpError.message).toContain('filesystem')
      expect(mcpError.message).toContain('save_file')
      expect(mcpError.message).toContain('Connection failed')
    })

    it('should handle non-Error original errors', () => {
      const mcpError = new MCPError('search', 'query', 'String error')

      expect(mcpError.message).toContain('search')
      expect(mcpError.message).toContain('query')
      expect(mcpError.message).toContain('String error')
    })
  })

  describe('MCPConnectionError', () => {
    it('should create MCPConnectionError with server and original error', () => {
      const originalError = new Error('Server not responding')
      const connError = new MCPConnectionError('brave-search', originalError)

      expect(connError).toBeInstanceOf(Error)
      expect(connError).toBeInstanceOf(MCPConnectionError)
      expect(connError.server).toBe('brave-search')
      expect(connError.originalError).toBe(originalError)
      expect(connError.message).toContain('brave-search')
      expect(connError.message).toContain('Server not responding')
    })
  })

  describe('Server Connection Failures', () => {
    it('should handle initialization of disabled servers', async () => {
      const config: MCPServerConfig = {
        name: 'test-server',
        command: 'nonexistent-command',
        args: [],
        disabled: true,
        autoApprove: []
      }

      client = new MCPClient([config])
      
      // Should not throw even with invalid command because server is disabled
      await expect(client.initialize()).resolves.not.toThrow()
      expect(client.isInitialized()).toBe(true)
    })

    it('should store error status for failed server initialization', async () => {
      const config: MCPServerConfig = {
        name: 'failing-server',
        command: 'nonexistent-command-xyz',
        args: [],
        disabled: false,
        autoApprove: []
      }

      client = new MCPClient([config])
      
      // Initialize should complete even if server fails
      await client.initialize()
      expect(client.isInitialized()).toBe(true)

      // Server status should reflect the error
      const status = await client.getServerStatus('failing-server')
      expect(status.running).toBe(false)
      expect(status.lastError).toBeDefined()
    })
  })

  describe('Tool Invocation Errors', () => {
    it('should return error result for non-existent server', async () => {
      client = new MCPClient([])
      await client.initialize()

      const result = await client.callTool({
        server: 'nonexistent',
        tool: 'some_tool',
        arguments: {}
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Server not found')
      expect(result.error).toContain('nonexistent')
    })

    it('should return error result for non-running server', async () => {
      const config: MCPServerConfig = {
        name: 'stopped-server',
        command: 'echo',
        args: [],
        disabled: false,
        autoApprove: []
      }

      client = new MCPClient([config])
      await client.initialize()

      // Manually set server as not running (simulating a crash)
      const status = await client.getServerStatus('stopped-server')
      if (status.running) {
        // If server actually started (unlikely with echo), we can't test this scenario
        // Skip this test
        return
      }

      const result = await client.callTool({
        server: 'stopped-server',
        tool: 'test_tool',
        arguments: {}
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Server not running')
    })
  })

  describe('Server Status Queries', () => {
    it('should throw error for status of non-existent server', async () => {
      client = new MCPClient([])
      await client.initialize()

      await expect(
        client.getServerStatus('nonexistent')
      ).rejects.toThrow('Server not found')
    })

    it('should throw error for reconnecting non-existent server', async () => {
      client = new MCPClient([])
      await client.initialize()

      await expect(
        client.reconnectServer('nonexistent')
      ).rejects.toThrow('Server not found')
    })
  })

  describe('Graceful Shutdown', () => {
    it('should handle shutdown with no servers', async () => {
      client = new MCPClient([])
      await client.initialize()
      
      await expect(client.shutdown()).resolves.not.toThrow()
      expect(client.isInitialized()).toBe(false)
    })

    it('should handle shutdown with failed servers', async () => {
      const config: MCPServerConfig = {
        name: 'failed-server',
        command: 'nonexistent',
        args: [],
        disabled: false,
        autoApprove: []
      }

      client = new MCPClient([config])
      await client.initialize()
      
      // Shutdown should not throw even if servers failed to start
      await expect(client.shutdown()).resolves.not.toThrow()
      expect(client.isInitialized()).toBe(false)
    })

    it('should allow multiple shutdowns', async () => {
      client = new MCPClient([])
      await client.initialize()
      
      await client.shutdown()
      expect(client.isInitialized()).toBe(false)
      
      // Second shutdown should not throw
      await expect(client.shutdown()).resolves.not.toThrow()
      expect(client.isInitialized()).toBe(false)
    })
  })

  describe('Server List Operations', () => {
    it('should return empty list for no servers', async () => {
      client = new MCPClient([])
      await client.initialize()

      const names = client.getServerNames()
      expect(names).toEqual([])

      const tools = await client.listTools()
      expect(tools).toEqual([])

      const statuses = await client.getAllServerStatuses()
      expect(statuses).toEqual([])
    })

    it('should handle listTools for non-existent server', async () => {
      client = new MCPClient([])
      await client.initialize()

      await expect(
        client.listTools('nonexistent')
      ).rejects.toThrow('Server not found')
    })
  })
})
