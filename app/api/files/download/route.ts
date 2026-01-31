import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { FilesystemTool } from '@/lib/mcp/tools/filesystem'
import { MCPClient } from '@/lib/mcp/mcp-client'
import * as path from 'path'

export const dynamic = 'force-dynamic'

// Initialize MCP client and filesystem tool
const mcpClient = new MCPClient([])
const userFilesDir = path.join(process.cwd(), 'user-files')
const filesystemTool = new FilesystemTool(mcpClient, userFilesDir)

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

    // Determine content type based on file extension
    const ext = filename.split('.').pop()?.toLowerCase()
    const contentTypeMap: Record<string, string> = {
      // Text
      'txt': 'text/plain',
      'md': 'text/markdown',
      // Web
      'js': 'application/javascript',
      'ts': 'application/typescript',
      'jsx': 'application/javascript',
      'tsx': 'application/typescript',
      'html': 'text/html',
      'css': 'text/css',
      // Python
      'py': 'text/x-python',
      // C/C++
      'c': 'text/x-c',
      'cpp': 'text/x-c++',
      'h': 'text/x-c',
      'hpp': 'text/x-c++',
      // Java/Kotlin
      'java': 'text/x-java',
      'kt': 'text/x-kotlin',
      // C#
      'cs': 'text/x-csharp',
      // Go
      'go': 'text/x-go',
      // Rust
      'rs': 'text/x-rust',
      // PHP
      'php': 'text/x-php',
      // Ruby
      'rb': 'text/x-ruby',
      // Swift
      'swift': 'text/x-swift',
      // Data
      'json': 'application/json',
      'xml': 'application/xml',
      'yaml': 'text/yaml',
      'yml': 'text/yaml',
      // Shell
      'sh': 'text/x-sh',
      'bash': 'text/x-sh',
      // SQL
      'sql': 'text/x-sql',
      // Word documents
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'doc': 'application/msword',
    }
    const contentType = contentTypeMap[ext || ''] || 'text/plain'

    console.log(`[API Files] File downloaded from DB: ${filename} for user ${user.id}`)
    
    // Check if file is Word document (stored as base64)
    const isWordDoc = ext === 'docx' || ext === 'doc'
    
    if (isWordDoc) {
      // Decode base64 to binary buffer for Word documents
      const buffer = Buffer.from(file.content, 'base64')
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-cache'
        }
      })
    }
    
    // Return text file content from database
    return new NextResponse(file.content, {
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
