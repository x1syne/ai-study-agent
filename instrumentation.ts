/**
 * Instrumentation file for Next.js
 * 
 * This file runs once when the server starts up.
 * Used for startup validation and initialization.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import { ConfigValidator } from './lib/config/validator'

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Startup] Running configuration validation...')
    
    const validator = new ConfigValidator()
    
    // Validate configuration
    const result = validator.validate()
    
    // Display validation results
    validator.displayStatus(result)
    
    // Throw error for critical missing configuration
    if (!result.valid) {
      const errorMessage = `Configuration validation failed:\n${result.errors.join('\n')}`
      console.error('[Startup] ' + errorMessage)
      throw new Error(errorMessage)
    }
    
    // Test Groq API connection (non-blocking)
    try {
      console.log('[Startup] Testing Groq API connection...')
      const groqConnected = await validator.testGroqConnection()
      
      if (groqConnected) {
        console.log('✅ Groq API connection successful')
      } else {
        console.warn('⚠️  Groq API connection test failed - check your GROQ_API_KEY')
      }
    } catch (error) {
      console.warn('⚠️  Groq API connection test failed:', error instanceof Error ? error.message : String(error))
    }
    
    console.log('[Startup] Configuration validation complete\n')
  }
}
