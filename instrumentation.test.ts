/**
 * Tests for startup validation integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Startup Validation Integration', () => {
  let originalEnv: NodeJS.ProcessEnv
  let consoleLogSpy: any
  let consoleErrorSpy: any
  let consoleWarnSpy: any

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }
    
    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore environment
    process.env = originalEnv
    
    // Restore console methods
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    
    // Clear module cache to allow re-importing
    vi.resetModules()
  })

  it('should validate configuration on startup', async () => {
    // Set up valid environment
    process.env.NEXT_RUNTIME = 'nodejs'
    process.env.GROQ_API_KEY = 'test-key'
    process.env.DATABASE_URL = 'postgresql://test'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    // Import and run register function
    const { register } = await import('./instrumentation')
    
    // Should not throw with valid config
    await expect(register()).resolves.not.toThrow()
    
    // Should log startup messages
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Startup] Running configuration validation')
    )
  })

  it('should throw error for missing critical config', async () => {
    // Set up invalid environment (missing GROQ_API_KEY)
    process.env.NEXT_RUNTIME = 'nodejs'
    process.env.DATABASE_URL = 'postgresql://test'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    delete process.env.GROQ_API_KEY

    // Import and run register function
    const { register } = await import('./instrumentation')
    
    // Should throw with invalid config
    await expect(register()).rejects.toThrow('Configuration validation failed')
    
    // Should log error
    expect(consoleErrorSpy).toHaveBeenCalled()
  })

  it('should display validation results in console', async () => {
    // Set up valid environment
    process.env.NEXT_RUNTIME = 'nodejs'
    process.env.GROQ_API_KEY = 'test-key'
    process.env.DATABASE_URL = 'postgresql://test'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    // Import and run register function
    const { register } = await import('./instrumentation')
    await register()
    
    // Should display validation status
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Configuration Validation')
    )
  })

  it('should not run validation on edge runtime', async () => {
    // Set up edge runtime
    process.env.NEXT_RUNTIME = 'edge'
    process.env.GROQ_API_KEY = 'test-key'
    process.env.DATABASE_URL = 'postgresql://test'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    // Import and run register function
    const { register } = await import('./instrumentation')
    await register()
    
    // Should not log startup messages
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[Startup] Running configuration validation')
    )
  })

  it('should handle Groq connection test gracefully', async () => {
    // Set up valid environment
    process.env.NEXT_RUNTIME = 'nodejs'
    process.env.GROQ_API_KEY = 'invalid-key'
    process.env.DATABASE_URL = 'postgresql://test'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

    // Import and run register function
    const { register } = await import('./instrumentation')
    
    // Should not throw even if Groq test fails
    await expect(register()).resolves.not.toThrow()
    
    // Should log warning about Groq connection
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Groq API connection test failed')
    )
  })
})
