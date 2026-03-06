// MCP Error Classes

export class MCPError extends Error {
  constructor(
    public server: string,
    public tool: string,
    public originalError: any
  ) {
    super(`MCP Error [${server}/${tool}]: ${originalError.message || originalError}`)
    this.name = 'MCPError'
    
    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPError)
    }
  }
}

export class MCPConnectionError extends Error {
  constructor(
    public server: string,
    public originalError: any
  ) {
    super(`MCP Connection Error [${server}]: ${originalError.message || originalError}`)
    this.name = 'MCPConnectionError'
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPConnectionError)
    }
  }
}

export class MCPConfigurationError extends Error {
  constructor(message: string) {
    super(`MCP Configuration Error: ${message}`)
    this.name = 'MCPConfigurationError'
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MCPConfigurationError)
    }
  }
}
