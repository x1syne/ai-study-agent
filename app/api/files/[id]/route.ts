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

// DELETE /api/files/[id] - Delete a file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Find the file in database
    const file = await prisma.userFile.findUnique({
      where: { id }
    })

    if (!file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Verify user owns the file
    if (file.userId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own this file' },
        { status: 403 }
      )
    }

    // Delete file from filesystem
    try {
      await filesystemTool.deleteFile({
        userId: user.id,
        filename: file.filename
      })
    } catch (error) {
      // Log error but continue to delete from database
      console.warn(`[API Files] Failed to delete file from filesystem: ${error}`)
    }

    // Delete file from database
    await prisma.userFile.delete({
      where: { id }
    })

    console.log(`[API Files] File deleted: ${file.filename} for user ${user.id}`)

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
