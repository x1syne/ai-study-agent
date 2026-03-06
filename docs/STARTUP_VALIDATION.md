# Startup Validation

## Overview

The application performs configuration validation on startup to ensure all required environment variables are present and API connections are working.

## How It Works

The startup validation is implemented using Next.js's [instrumentation feature](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation), which runs code once when the server starts.

### Files

- `instrumentation.ts` - Entry point for startup validation
- `lib/config/validator.ts` - ConfigValidator class that performs validation
- `next.config.js` - Enables instrumentation hook

### Validation Steps

1. **Environment Variables Check**
   - Validates presence of required environment variables:
     - `GROQ_API_KEY`
     - `DATABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. **MCP Configuration Check** (if enabled)
   - Checks if MCP servers are configured
   - Warns if MCP is enabled but no servers are available

3. **API Connectivity Test**
   - Tests connection to Groq API
   - Non-blocking - warns if connection fails but doesn't stop startup

### Behavior

- **Critical Errors**: If required environment variables are missing, the application will throw an error and fail to start
- **Warnings**: Configuration warnings (like missing MCP servers) are logged but don't prevent startup
- **Console Output**: Validation results are displayed in the console with clear formatting

### Example Output

```
[Startup] Running configuration validation...

=== Configuration Validation ===

✅ Configuration is valid

⚠️  Warnings:
  - MCP is enabled but no servers are configured

================================

[Startup] Testing Groq API connection...
✅ Groq API connection successful
[Startup] Configuration validation complete
```

## Testing

Run the startup validation tests:

```bash
npm test -- instrumentation.test.ts
```

## Troubleshooting

### Application Won't Start

If you see an error like:

```
Configuration validation failed:
Missing required environment variable: GROQ_API_KEY
```

**Solution**: Add the missing environment variable to your `.env` file.

### Groq API Connection Failed

If you see:

```
⚠️  Groq API connection test failed - check your GROQ_API_KEY
```

**Solution**: Verify your `GROQ_API_KEY` is valid and you have internet connectivity.

### MCP Warnings

If you see:

```
⚠️  MCP is enabled but no servers are configured
```

**Solution**: Either:
1. Disable MCP by setting `MCP_ENABLED=false` in `.env`
2. Add MCP server configuration to `.kiro/settings/mcp.json`

## Requirements

This implementation satisfies:
- **Requirement 5.1**: Validates all required environment variables on startup
- **Requirement 5.5**: Displays configuration status in console
- Throws errors for critical missing configuration
