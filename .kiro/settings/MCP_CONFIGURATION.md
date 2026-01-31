# MCP Configuration Guide

## Overview

This directory contains the Model Context Protocol (MCP) configuration for AI Study Agent. MCP extends the AI's capabilities by providing tools for file operations, web search, and other external integrations.

## Configuration File

The main configuration file is `mcp.json` in this directory. It defines:

- **MCP Servers**: External tools that the AI can use
- **Server Settings**: Command, arguments, and environment variables for each server
- **Auto-approve Lists**: Tools that don't require user confirmation
- **Global Settings**: Timeout, retry attempts, and logging configuration

## Environment Variables

Add these variables to your `.env` file:

### Required Variables

#### BRAVE_API_KEY
- **Description**: API key for Brave Search web search functionality
- **Required**: Yes (for web search features)
- **How to get**: 
  1. Visit https://brave.com/search/api/
  2. Sign up for a free account
  3. Get your API key from the dashboard
  4. Free tier includes 2000 queries/month
- **Example**: `BRAVE_API_KEY=BSA_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Optional Variables

#### MCP_ENABLED
- **Description**: Enable or disable MCP integration globally
- **Required**: No
- **Default**: `true`
- **Example**: `MCP_ENABLED=true`

#### MCP_FILESYSTEM_PATH
- **Description**: Base path for user file storage
- **Required**: No
- **Default**: `./user-files`
- **Example**: `MCP_FILESYSTEM_PATH=./user-files`

## Configured MCP Servers

### 1. Filesystem Server

**Purpose**: Provides file system operations for saving and managing user files

**Package**: `@modelcontextprotocol/server-filesystem`

**Tools Available**:
- `read_file` - Read content from a file
- `write_file` - Write content to a file
- `list_directory` - List files in a directory
- `create_directory` - Create a new directory
- `delete_file` - Delete a file

**Use Cases**:
- Save code examples for students to download
- Store generated notes and documentation
- Manage user-specific learning materials

**Security Features**:
- All file paths are validated to prevent directory traversal attacks
- Files are isolated in user-specific directories
- File extensions are validated
- No access to system files or parent directories

**Configuration**:
```json
{
  "name": "filesystem",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "./user-files"],
  "disabled": false
}
```

### 2. Brave Search Server

**Purpose**: Enables web search for current information and up-to-date content

**Package**: `@modelcontextprotocol/server-brave-search`

**Tools Available**:
- `brave_web_search` - Search the web using Brave Search API

**Use Cases**:
- Find current information about programming topics
- Search for up-to-date library documentation
- Discover recent examples and best practices
- Answer questions requiring current knowledge

**Features**:
- Results are cached for 1 hour to reduce API calls
- Limited to top 5 most relevant results
- Includes source attribution and links
- Respects rate limits

**Configuration**:
```json
{
  "name": "brave-search",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "${BRAVE_API_KEY}"
  },
  "disabled": false
}
```

## Setup Instructions

### 1. Install Dependencies

MCP servers are automatically installed via `npx` when first used. No manual installation required.

### 2. Configure Environment Variables

Add the required environment variables to your `.env` file:

```bash
# Copy from .env.example
cp .env.example .env

# Edit .env and add your API keys
nano .env
```

Add:
```env
MCP_ENABLED=true
BRAVE_API_KEY=your_brave_api_key_here
MCP_FILESYSTEM_PATH=./user-files
```

### 3. Verify Configuration

Start the application and check the logs:

```bash
npm run dev
```

Look for these log messages:
```
[MCP] Initializing 2 servers...
[MCP] ✓ Server initialized: filesystem
[MCP] ✓ Server initialized: brave-search
[MCP] Initialization complete
```

### 4. Test Functionality

#### Test File Operations
In the AI chat, try:
```
"Save this code to a file called hello.js:
console.log('Hello, World!');"
```

#### Test Web Search
In the AI chat, try:
```
"What are the new features in React 19?"
```

## Server Management

### Viewing Server Status

Visit the Settings page in the application to see:
- List of configured MCP servers
- Status indicators (running/stopped/error)
- Available tools for each server
- Server logs for debugging

### Enabling/Disabling Servers

You can disable a server without removing it from the configuration:

```json
{
  "filesystem": {
    "disabled": true
  }
}
```

Or set `MCP_ENABLED=false` in your `.env` file to disable all MCP functionality.

### Reconnecting Servers

If a server fails, you can reconnect it from the Settings page without restarting the application.

## Troubleshooting

### Server Not Running

**Symptoms**: Server shows as "stopped" or "error" in settings

**Solutions**:
1. Check that required environment variables are set
2. Verify `npx` can access the MCP server packages
3. Check application logs for specific error messages
4. Try reconnecting the server from the Settings page

### Tool Call Failed

**Symptoms**: Error message when AI tries to use a tool

**Solutions**:
1. Review server logs for specific error messages
2. Common issues:
   - Missing API keys (check `.env` file)
   - Network connectivity issues
   - Invalid tool arguments
   - Rate limits exceeded

### Filesystem Permissions

**Symptoms**: Cannot save files, permission denied errors

**Solutions**:
1. Ensure the application has write permissions to `MCP_FILESYSTEM_PATH`
2. Create the directory manually if it doesn't exist:
   ```bash
   mkdir -p ./user-files
   chmod 755 ./user-files
   ```
3. Check that the path is not in a protected system directory

### Search Rate Limit

**Symptoms**: Search fails with rate limit error

**Solutions**:
1. Brave Search API has rate limits (2000 queries/month on free tier)
2. Results are cached for 1 hour to minimize API calls
3. Consider upgrading to a paid plan if needed
4. Check your usage at https://brave.com/search/api/

### NPX Package Installation Issues

**Symptoms**: Server fails to start, package not found

**Solutions**:
1. Ensure you have Node.js 18+ and npm installed
2. Check internet connectivity
3. Try clearing npm cache:
   ```bash
   npm cache clean --force
   ```
4. Manually install the package:
   ```bash
   npm install -g @modelcontextprotocol/server-filesystem
   npm install -g @modelcontextprotocol/server-brave-search
   ```

## Advanced Configuration

### Custom Server Settings

You can customize server behavior in `mcp.json`:

```json
{
  "globalSettings": {
    "enabled": true,
    "logLevel": "debug",  // Change to "debug" for more verbose logs
    "timeout": 30000,     // Increase timeout for slow operations
    "retryAttempts": 3    // Number of retry attempts on failure
  }
}
```

### Auto-approve Tools

Tools in the `autoApprove` list don't require user confirmation:

```json
{
  "filesystem": {
    "autoApprove": [
      "read_file",
      "write_file",
      "list_directory"
    ]
  }
}
```

Remove tools from this list if you want to manually approve each use.

### Adding New MCP Servers

To add a new MCP server:

1. Add server configuration to `mcp.json`:
```json
{
  "mcpServers": {
    "my-server": {
      "name": "my-server",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-my-server"],
      "env": {},
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

2. Add any required environment variables to `.env`
3. Restart the application
4. Check server status in Settings page

## Security Considerations

### File Operations
- All file paths are validated to prevent directory traversal
- Files are isolated in user-specific directories
- No access to system files or parent directories
- File extensions are validated

### API Keys
- Never commit API keys to version control
- Use environment variables for all sensitive data
- API keys are only used server-side, never exposed to client

### Rate Limiting
- Search results are cached to reduce API calls
- Retry mechanism includes exponential backoff
- Rate limit errors are handled gracefully

### User Isolation
- Each user's files are stored in separate directories
- File paths include user ID to prevent cross-user access
- Database records track file ownership

## Performance Optimization

### Caching
- Search results are cached for 1 hour
- Reduces API calls and improves response time
- Cache is stored in memory (cleared on restart)

### Parallel Operations
- Multiple tool calls can execute in parallel
- Improves performance for batch operations
- Timeout prevents hanging operations

### Resource Management
- MCP servers are started on-demand
- Connections are reused when possible
- Servers can be disabled to save resources

## Monitoring and Logging

### Log Levels
- `error`: Only errors
- `warn`: Errors and warnings
- `info`: Normal operation (default)
- `debug`: Detailed debugging information

### Log Format
```
[MCP] Initializing 2 servers...
[MCP] Calling filesystem/write_file {...}
[MCP] ✓ Server initialized: filesystem
[MCP] ✗ Failed to initialize server: brave-search
```

### Metrics
The system tracks:
- Tool call count per server
- Tool call duration
- Success/failure rates
- Server uptime

## References

- [MCP Official Documentation](https://modelcontextprotocol.io/)
- [MCP SDK on GitHub](https://github.com/modelcontextprotocol/sdk)
- [Brave Search API](https://brave.com/search/api/)
- [MCP Server Filesystem](https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem)
- [MCP Server Brave Search](https://github.com/modelcontextprotocol/servers/tree/main/src/brave-search)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review application logs for error messages
3. Check MCP server status in Settings page
4. Consult the official MCP documentation
5. Open an issue on the project repository
