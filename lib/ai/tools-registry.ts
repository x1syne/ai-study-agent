/**
 * Registry of AI tools (function calling)
 */

import { ScheduleTool } from '@/lib/mcp/tools/schedule'

// Singleton instances
const scheduleTool = new ScheduleTool()

/**
 * Get all available tools for AI
 */
export function getAvailableTools(characterId?: string) {
  const tools = []

  // Schedule tool only for professor Ostroukh
  if (characterId === 'ostroukh') {
    tools.push({
      type: 'function' as const,
      function: {
        name: scheduleTool.name,
        description: scheduleTool.description,
        parameters: scheduleTool.parameters,
      },
    })
  }

  return tools
}

/**
 * Execute a tool call
 */
export async function executeTool(toolName: string, args: any): Promise<string> {
  console.log(`[Tools] Executing ${toolName} with args:`, args)

  switch (toolName) {
    case 'get_schedule':
      return await scheduleTool.execute(args)
    
    default:
      return `Error: Unknown tool "${toolName}"`
  }
}
