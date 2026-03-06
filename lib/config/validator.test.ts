/**
 * Unit Tests for Configuration Validator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ConfigValidator } from './validator'
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

describe('ConfigValidator', () => {
  let originalEnv: NodeJS.ProcessEnv
  const testConfigDir = join(process.cwd(), '.kiro', 'settings')
  const testConfigPath = join(testConfigDir, 'mcp.json')

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
    
    // Ensure test config directory exists
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true })
    }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    
    // Clean up test config file if it exists
    try {
      if (existsSync(testConfigPath)) {
        unlinkSync(testConfigPath)
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  })

  describe('validateEnvVars', () => {
    it('should return error when GROQ_API_KEY is missing', () => {
      delete process.env.GROQ_API_KEY
      process.env.DATABASE_URL = 'test'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'test'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test'

      const validator = new ConfigValidator()
      const errors = validator.validateEnvVars()

      expect(errors).toContain('Missing required environment variable: GROQ_API_KEY')
    })

    it('should return error when DATABASE_URL is missing', () => {
      process.env.GROQ_API_KEY = 'test'
      delete process.env.DATABASE_URL
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'test'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test'

      const validator = new ConfigValidator()
      const errors = validator.validateEnvVars()

      expect(errors).toContain('Missing required environment variable: DATABASE_URL')
    })

    it('should return no errors when all required variables are present', () => {
      process.env.GROQ_API_KEY = 'test'
      process.env.DATABASE_URL = 'test'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'test'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test'

      const validator = new ConfigValidator()
      const errors = validator.validateEnvVars()

      expect(errors).toHaveLength(0)
    })
  })

  describe('validateMCPConfig', () => {
    it('should return no warnings when MCP is disabled', () => {
      delete process.env.MCP_ENABLED

      const validator = new ConfigValidator()
      const warnings = validator.validateMCPConfig()

      expect(warnings).toHaveLength(0)
    })

    it('should warn when MCP is enabled but no servers are configured', () => {
      process.env.MCP_ENABLED = 'true'
      
      // Create empty config
      writeFileSync(testConfigPath, JSON.stringify({ mcpServers: {} }))

      const validator = new ConfigValidator()
      const warnings = validator.validateMCPConfig()

      expect(warnings).toContain('MCP is enabled but no servers are configured')
    })

    it('should warn when MCP is enabled but all servers are disabled', () => {
      process.env.MCP_ENABLED = 'true'
      
      // Create config with disabled servers
      writeFileSync(testConfigPath, JSON.stringify({
        mcpServers: {
          'test-server': {
            command: 'test',
            args: [],
            disabled: true
          }
        }
      }))

      const validator = new ConfigValidator()
      const warnings = validator.validateMCPConfig()

      expect(warnings).toContain('MCP is enabled but all configured servers are disabled')
    })

    it('should return no warnings when MCP is enabled with active servers', () => {
      process.env.MCP_ENABLED = 'true'
      
      // Create config with enabled server
      writeFileSync(testConfigPath, JSON.stringify({
        mcpServers: {
          'test-server': {
            command: 'test',
            args: [],
            disabled: false
          }
        }
      }))

      const validator = new ConfigValidator()
      const warnings = validator.validateMCPConfig()

      expect(warnings).toHaveLength(0)
    })

    it('should warn when MCP config file is missing', () => {
      process.env.MCP_ENABLED = 'true'
      
      // Ensure config file doesn't exist
      if (existsSync(testConfigPath)) {
        unlinkSync(testConfigPath)
      }

      const validator = new ConfigValidator()
      const warnings = validator.validateMCPConfig()

      expect(warnings).toContain('MCP is enabled but no configuration file found at .kiro/settings/mcp.json')
    })
  })

  describe('validate', () => {
    it('should return invalid when required env vars are missing', () => {
      delete process.env.GROQ_API_KEY

      const validator = new ConfigValidator()
      const result = validator.validate()

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should return valid when all required env vars are present', () => {
      process.env.GROQ_API_KEY = 'test'
      process.env.DATABASE_URL = 'test'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'test'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test'

      const validator = new ConfigValidator()
      const result = validator.validate()

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('displayStatus', () => {
    it('should display configuration status without throwing', () => {
      const validator = new ConfigValidator()
      const result = {
        valid: true,
        errors: [],
        warnings: []
      }

      // Mock console.log to avoid output during tests
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      expect(() => validator.displayStatus(result)).not.toThrow()
      
      // Verify console.log was called
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('should display errors when present', () => {
      const validator = new ConfigValidator()
      const result = {
        valid: false,
        errors: ['Test error'],
        warnings: []
      }

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      validator.displayStatus(result)
      
      // Verify error was logged
      const calls = consoleSpy.mock.calls.map(call => call.join(' '))
      expect(calls.some(call => call.includes('Test error'))).toBe(true)
      
      consoleSpy.mockRestore()
    })

    it('should display warnings when present', () => {
      const validator = new ConfigValidator()
      const result = {
        valid: true,
        errors: [],
        warnings: ['Test warning']
      }

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      validator.displayStatus(result)
      
      // Verify warning was logged
      const calls = consoleSpy.mock.calls.map(call => call.join(' '))
      expect(calls.some(call => call.includes('Test warning'))).toBe(true)
      
      consoleSpy.mockRestore()
    })
  })

  describe('testGroqConnection', () => {
    it('should return false when GROQ_API_KEY is missing', async () => {
      delete process.env.GROQ_API_KEY

      const validator = new ConfigValidator()
      const result = await validator.testGroqConnection()

      expect(result).toBe(false)
    })

    // Note: We don't test actual API connectivity in unit tests
    // as it would require valid API keys and make real network calls
  })
})
