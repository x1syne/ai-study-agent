import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { FilesystemTool } from '@/lib/mcp/tools/filesystem'
import { MCPClient } from '@/lib/mcp/mcp-client'

export const dynamic = 'force-dynamic'

// Initialize MCP client and filesystem tool
const mcpClient = new MCPClient([])
const filesystemTool = new FilesystemTool(mcpClient)

// GET /api/files/download - Download a file
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const filename = searchParams.get('filename')

    if (!userId || !filename) {
      return NextResponse.json(
        { error: 'userId and filename are required' },
        { status: 400 }
      )
    }

    // Verify user is requesting their own file
    if (userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only download your own files' },
        { status: 403 }
      )
    }

    // Find file in database
    const file = await prisma.userFile.findUnique({
      where: {
        userId_filename: {
          userId,
          filename
        }
      }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Read file content
    const result = await filesystemTool.readFile({
      userId,
      filename
    })

    // Determine content type based on file extension
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypeMap: Record<string, string> = {
      'txt': 'text/plain',
      'md': 'text/markdown',
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'jsx': 'application/javascript',
      'tsx': 'application/typescript',
      'py': 'text/x-python',
      'json': 'application/json',
      'html': 'text/html',
      'css': 'text/css'
    }
    const contentType = contentTypeMap[ext || ''] || 'text/plain'

    console.log(`[API Files] File downloaded: ${filename} for user ${user.id}`)

    // Return file content with appropriate headers
    return new NextResponse(result.content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Error downloading file:', error)
    
    if (error instanceof Error && error.message.includes('File not found')) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
