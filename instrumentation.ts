

/**
 * Instrumentation file for Next.js
 * 
 * This file runs once when the server starts up.
 * Used for startup validation and initialization.
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run on server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamic import to avoid bundling server-only code
    const { ConfigValidator } = await import('./lib/config/validator')
    
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
    
    // Skip Groq direct test in Russia (403 Forbidden) — NVIDIA proxy is primary
    console.log('[Startup] Groq direct test skipped (use NVIDIA proxy or Supabase proxy)')
    
    console.log('[Startup] Configuration validation complete\n')
  }
}
