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

// POST /api/files - Save a new file
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { filename, content, type } = body

    if (!filename || !content) {
      return NextResponse.json(
        { error: 'Filename and content are required' },
        { status: 400 }
      )
    }

    if (!type || !['code', 'note', 'example'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be one of: code, note, example' },
        { status: 400 }
      )
    }

    // Save file using FilesystemTool
    const result = await filesystemTool.saveFile({
      userId: user.id,
      filename,
      content,
      type
    })

    // Save file metadata to database
    const userFile = await prisma.userFile.create({
      data: {
        userId: user.id,
        filename,
        path: result.path,
        type,
        content
      }
    })

    console.log(`[API Files] File saved: ${filename} for user ${user.id}`)

    return NextResponse.json({
      id: userFile.id,
      filename: userFile.filename,
      path: userFile.path,
      type: userFile.type,
      url: result.url,
      createdAt: userFile.createdAt
    }, { status: 201 })
  } catch (error) {
    console.error('Error saving file:', error)
    
    // Handle specific errors
    if (error instanceof Error) {
      if (error.message.includes('Invalid filename') || 
          error.message.includes('Invalid file extension')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'File with this name already exists' },
          { status: 409 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/files - List user's files
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get type filter from query params
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    // Build query
    const where: any = { userId: user.id }
    if (type && ['code', 'note', 'example'].includes(type)) {
      where.type = type
    }

    // Fetch files from database
    const files = await prisma.userFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        path: true,
        type: true,
        createdAt: true
      }
    })

    // Add download URLs
    const filesWithUrls = files.map(file => ({
      ...file,
      url: `/api/files/download?userId=${user.id}&filename=${encodeURIComponent(file.filename)}`
    }))

    console.log(`[API Files] Listed ${files.length} files for user ${user.id}`)

    return NextResponse.json(filesWithUrls)
  } catch (error) {
    console.error('Error listing files:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
