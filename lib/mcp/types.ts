// MCP Type Definitions

export interface MCPServerConfig {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  disabled?: boolean
  autoApprove?: string[]
}

export interface MCPToolCall {
  server: string
  tool: string
  arguments: Record<string, any>
}

export interface MCPToolResult {
  success: boolean
  content: any
  error?: string
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: any
}

export interface ServerStatus {
  name: string
  running: boolean
  lastError?: string
  lastPing?: number
  tools: MCPTool[]
}
