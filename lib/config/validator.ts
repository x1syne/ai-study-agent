/**
 * Configuration Validator
 * 
 * Validates environment variables and configuration on application startup.
 * Ensures all required API keys are present and tests connectivity.
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import Groq from 'groq-sdk'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface MCPServerConfig {
  command: string
  args: string[]
  env?: Record<string, string>
  disabled?: boolean
  autoApprove?: string[]
}

interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>
}

export class ConfigValidator {
  /**
   * Validate all configuration
   */
  validate(): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate environment variables
    const envErrors = this.validateEnvVars()
    errors.push(...envErrors)

    // Validate MCP configuration
    const mcpWarnings = this.validateMCPConfig()
    warnings.push(...mcpWarnings)

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Validate required environment variables
   */
  validateEnvVars(): string[] {
    const errors: string[] = []
    const required = [
      'GROQ_API_KEY',
      'DATABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ]

    for (const key of required) {
      if (!process.env[key]) {
        errors.push(`Missing required environment variable: ${key}`)
      }
    }

    return errors
  }

  /**
   * Validate MCP configuration
   */
  validateMCPConfig(): string[] {
    const warnings: string[] = []

    // Check if MCP is enabled
    const mcpEnabled = process.env.MCP_ENABLED === 'true'
    
    if (!mcpEnabled) {
      return warnings
    }

    // Try to load MCP config
    const configPath = join(process.cwd(), '.kiro', 'settings', 'mcp.json')
    
    if (!existsSync(configPath)) {
      warnings.push('MCP is enabled but no configuration file found at .kiro/settings/mcp.json')
      return warnings
    }

    try {
      const configContent = readFileSync(configPath, 'utf-8')
      const config: MCPConfig = JSON.parse(configContent)

      // Check if any servers are configured
      const serverNames = Object.keys(config.mcpServers || {})
      
      if (serverNames.length === 0) {
        warnings.push('MCP is enabled but no servers are configured')
        return warnings
      }

      // Check if all servers are disabled
      const enabledServers = serverNames.filter(
        name => !config.mcpServers[name].disabled
      )

      if (enabledServers.length === 0) {
        warnings.push('MCP is enabled but all configured servers are disabled')
      }
    } catch (error) {
      warnings.push(`Failed to parse MCP configuration: ${error instanceof Error ? error.message : String(error)}`)
    }

    return warnings
  }

  /**
   * Test API connectivity to Groq
   */
  async testGroqConnection(): Promise<boolean> {
    const apiKey = process.env.GROQ_API_KEY
    
    if (!apiKey) {
      return false
    }

    try {
      const groq = new Groq({ apiKey })
      
      // Make a minimal test request
      const response = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      })

      return !!response.choices[0]?.message?.content
    } catch (error) {
      console.error('[ConfigValidator] Groq connection test failed:', error)
      return false
    }
  }

  /**
   * Display validation status in console
   */
  displayStatus(result: ValidationResult): void {
    console.log('\n=== Configuration Validation ===\n')

    if (result.valid) {
      console.log('✅ Configuration is valid')
    } else {
      console.log('❌ Configuration has errors')
    }

    if (result.errors.length > 0) {
      console.log('\n🔴 Errors:')
      result.errors.forEach(error => {
        console.log(`  - ${error}`)
      })
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:')
      result.warnings.forEach(warning => {
        console.log(`  - ${warning}`)
      })
    }

    console.log('\n================================\n')
  }
}
