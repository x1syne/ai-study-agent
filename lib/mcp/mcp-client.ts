// MCP Client - Central component for managing MCP servers

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import type {
  MCPServerConfig,
  MCPToolCall,
  MCPToolResult,
  MCPTool,
  ServerStatus
} from './types'
import { MCPError, MCPConnectionError } from './errors'

interface MCPServer {
  config: MCPServerConfig
  client: Client
  transport: StdioClientTransport
  status: ServerStatus
}

export class MCPClient {
  private servers: Map<string, MCPServer> = new Map()
  private config: MCPServerConfig[]
  private initialized: boolean = false

  constructor(config: MCPServerConfig[]) {
    this.config = config
  }

  /**
   * Initialize all configured MCP servers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('[MCP] Already initialized')
      return
    }

    console.log(`[MCP] Initializing ${this.config.length} servers...`)

    for (const serverConfig of this.config) {
      if (serverConfig.disabled) {
        console.log(`[MCP] Skipping disabled server: ${serverConfig.name}`)
        continue
      }

      try {
        await this.initializeServer(serverConfig)
        console.log(`[MCP] ✓ Server initialized: ${serverConfig.name}`)
      } catch (error) {
        console.error(`[MCP] ✗ Failed to initialize server: ${serverConfig.name}`, error)
        // Store error but continue with other servers
        this.servers.set(serverConfig.name, {
          config: serverConfig,
          client: null as any,
          transport: null as any,
          status: {
            name: serverConfig.name,
            running: false,
            lastError: error instanceof Error ? error.message : String(error),
            tools: []
          }
        })
      }
    }

    this.initialized = true
    console.log('[MCP] Initialization complete')
  }

  /**
   * Initialize a single MCP server
   */
  private async initializeServer(config: MCPServerConfig): Promise<void> {
    // Create transport for stdio communication
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env
    })

    // Create MCP client
    const client = new Client(
      {
        name: 'ai-study-agent',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    )

    // Connect to server
    await client.connect(transport)

    // List available tools
    const toolsResponse = await client.listTools()
    const tools: MCPTool[] = toolsResponse.tools.map((tool: any) => ({
      name: tool.name,
      description: tool.description || '',
      inputSchema: tool.inputSchema || {}
    }))

    // Store server info
    this.servers.set(config.name, {
      config,
      client,
      transport,
      status: {
        name: config.name,
        running: true,
        lastPing: Date.now(),
        tools
      }
    })
  }

  /**
   * Call a tool on a specific MCP server
   */
  async callTool(call: MCPToolCall): Promise<MCPToolResult> {
    const server = this.servers.get(call.server)

    if (!server) {
      return {
        success: false,
        content: null,
        error: `Server not found: ${call.server}`
      }
    }

    if (!server.status.running) {
      return {
        success: false,
        content: null,
        error: `Server not running: ${call.server}`
      }
    }

    try {
      console.log(`[MCP] Calling ${call.server}/${call.tool}`, call.arguments)

      const result = await server.client.callTool({
        name: call.tool,
        arguments: call.arguments
      })

      // Update last ping
      server.status.lastPing = Date.now()

      return {
        success: true,
        content: result.content,
        error: undefined
      }
    } catch (error) {
      console.error(`[MCP] Tool call failed: ${call.server}/${call.tool}`, error)

      // Update server status
      server.status.lastError = error instanceof Error ? error.message : String(error)

      throw new MCPError(call.server, call.tool, error)
    }
  }

  /**
   * Get list of available tools from all servers or a specific server
   */
  async listTools(serverName?: string): Promise<MCPTool[]> {
    if (serverName) {
      const server = this.servers.get(serverName)
      if (!server) {
        throw new Error(`Server not found: ${serverName}`)
      }
      return server.status.tools
    }

    // Return tools from all servers
    const allTools: MCPTool[] = []
    const servers = Array.from(this.servers.values())
    for (const server of servers) {
      if (server.status.running) {
        allTools.push(...server.status.tools)
      }
    }
    return allTools
  }

  /**
   * Get status of a specific server
   */
  async getServerStatus(serverName: string): Promise<ServerStatus> {
    const server = this.servers.get(serverName)

    if (!server) {
      throw new Error(`Server not found: ${serverName}`)
    }

    return server.status
  }

  /**
   * Get status of all servers
   */
  async getAllServerStatuses(): Promise<ServerStatus[]> {
    return Array.from(this.servers.values()).map(server => server.status)
  }

  /**
   * Reconnect to a specific server
   */
  async reconnectServer(serverName: string): Promise<void> {
    const server = this.servers.get(serverName)

    if (!server) {
      throw new Error(`Server not found: ${serverName}`)
    }

    console.log(`[MCP] Reconnecting to server: ${serverName}`)

    try {
      // Close existing connection if any
      if (server.transport) {
        try {
          await server.transport.close()
        } catch (error) {
          console.warn(`[MCP] Error closing transport for ${serverName}:`, error)
        }
      }

      // Reinitialize the server
      await this.initializeServer(server.config)
      console.log(`[MCP] ✓ Server reconnected: ${serverName}`)
    } catch (error) {
      console.error(`[MCP] ✗ Failed to reconnect server: ${serverName}`, error)
      throw new MCPConnectionError(serverName, error)
    }
  }

  /**
   * Shutdown all servers
   */
  async shutdown(): Promise<void> {
    console.log('[MCP] Shutting down all servers...')

    const serverEntries = Array.from(this.servers.entries())
    for (const [name, server] of serverEntries) {
      try {
        if (server.transport) {
          await server.transport.close()
        }
        console.log(`[MCP] ✓ Server closed: ${name}`)
      } catch (error) {
        console.error(`[MCP] Error closing server ${name}:`, error)
      }
    }

    this.servers.clear()
    this.initialized = false
    console.log('[MCP] Shutdown complete')
  }

  /**
   * Check if client is initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Get list of configured server names
   */
  getServerNames(): string[] {
    return Array.from(this.servers.keys())
  }
}
