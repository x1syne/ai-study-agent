// Filesystem Tool - MCP wrapper for file operations

import { MCPClient } from '../mcp-client'
import { MCPError } from '../errors'
import * as path from 'path'
import * as fs from 'fs/promises'

export interface SaveFileParams {
  userId: string
  filename: string
  content: string
  type: 'code' | 'note' | 'example'
}

export interface ReadFileParams {
  userId: string
  filename: string
}

export interface ListFilesParams {
  userId: string
  type?: string
}

export interface DeleteFileParams {
  userId: string
  filename: string
}

export interface FileInfo {
  filename: string
  path: string
  type: string
  size: number
  createdAt: Date
}

export interface SaveFileResult {
  path: string
  url: string
}

export interface ReadFileResult {
  content: string
}

/**
 * Validate file path to prevent directory traversal attacks
 */
export function validatePath(filePath: string): boolean {
  // Check for directory traversal patterns
  if (filePath.includes('..')) {
    return false
  }
  
  // Check for absolute paths
  if (filePath.startsWith('/') || filePath.startsWith('\\')) {
    return false
  }
  
  // Check for drive letters (Windows)
  if (/^[a-zA-Z]:/.test(filePath)) {
    return false
  }
  
  return true
}

/**
 * Generate safe user-specific file path
 */
export function getUserFilePath(userId: string, filename: string): string {
  // Sanitize filename - remove dangerous characters
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  
  // Construct safe path
  return path.join('user-files', userId, sanitized)
}

/**
 * Validate file extension against allowed types
 */
export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = path.extname(filename).toLowerCase()
  return allowedExtensions.includes(ext)
}

/**
 * FilesystemTool class for managing file operations through MCP
 */
export class FilesystemTool {
  private mcpClient: MCPClient
  private baseDir: string
  private allowedExtensions: string[] = ['.txt', '.md', '.js', '.py', '.json', '.ts', '.jsx', '.tsx', '.css', '.html']

  constructor(mcpClient: MCPClient, baseDir: string = './user-files') {
    this.mcpClient = mcpClient
    this.baseDir = baseDir
  }

  /**
   * Save a file for a user
   */
  async saveFile(params: SaveFileParams): Promise<SaveFileResult> {
    const { userId, filename, content, type } = params

    // Validate filename
    if (!filename || filename.trim() === '') {
      throw new Error('Filename cannot be empty')
    }

    // Validate path
    if (!validatePath(filename)) {
      throw new Error('Invalid filename: contains unsafe path components')
    }

    // Validate file extension
    if (!validateFileExtension(filename, this.allowedExtensions)) {
      throw new Error(`Invalid file extension. Allowed: ${this.allowedExtensions.join(', ')}`)
    }

    // Generate safe path
    const filePath = getUserFilePath(userId, filename)
    const fullPath = path.join(this.baseDir, filePath)

    try {
      // Ensure directory exists
      const dir = path.dirname(fullPath)
      await fs.mkdir(dir, { recursive: true })

      // Write file
      await fs.writeFile(fullPath, content, 'utf-8')

      // Generate download URL
      const url = `/api/files/download?userId=${userId}&filename=${encodeURIComponent(filename)}`

      console.log(`[FilesystemTool] File saved: ${filePath}`)

      return {
        path: filePath,
        url
      }
    } catch (error) {
      console.error(`[FilesystemTool] Error saving file:`, error)
      throw new Error(`Failed to save file: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Read a file for a user
   */
  async readFile(params: ReadFileParams): Promise<ReadFileResult> {
    const { userId, filename } = params

    // Validate filename
    if (!filename || filename.trim() === '') {
      throw new Error('Filename cannot be empty')
    }

    // Validate path
    if (!validatePath(filename)) {
      throw new Error('Invalid filename: contains unsafe path components')
    }

    // Generate safe path
    const filePath = getUserFilePath(userId, filename)
    const fullPath = path.join(this.baseDir, filePath)

    try {
      // Read file
      const content = await fs.readFile(fullPath, 'utf-8')

      console.log(`[FilesystemTool] File read: ${filePath}`)

      return { content }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filename}`)
      }
      console.error(`[FilesystemTool] Error reading file:`, error)
      throw new Error(`Failed to read file: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * List files for a user
   */
  async listFiles(params: ListFilesParams): Promise<FileInfo[]> {
    const { userId, type } = params

    // Generate user directory path
    const userDir = path.join(this.baseDir, 'user-files', userId)

    try {
      // Check if directory exists
      try {
        await fs.access(userDir)
      } catch {
        // Directory doesn't exist, return empty array
        return []
      }

      // Read directory
      const files = await fs.readdir(userDir)

      // Get file info
      const fileInfos: FileInfo[] = []
      for (const file of files) {
        const filePath = path.join(userDir, file)
        const stats = await fs.stat(filePath)

        if (stats.isFile()) {
          const ext = path.extname(file)
          const fileType = this.getFileType(ext)

          // Filter by type if specified
          if (type && fileType !== type) {
            continue
          }

          fileInfos.push({
            filename: file,
            path: path.join('user-files', userId, file),
            type: fileType,
            size: stats.size,
            createdAt: stats.birthtime
          })
        }
      }

      console.log(`[FilesystemTool] Listed ${fileInfos.length} files for user ${userId}`)

      return fileInfos
    } catch (error) {
      console.error(`[FilesystemTool] Error listing files:`, error)
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Delete a file for a user
   */
  async deleteFile(params: DeleteFileParams): Promise<{ success: boolean }> {
    const { userId, filename } = params

    // Validate filename
    if (!filename || filename.trim() === '') {
      throw new Error('Filename cannot be empty')
    }

    // Validate path
    if (!validatePath(filename)) {
      throw new Error('Invalid filename: contains unsafe path components')
    }

    // Generate safe path
    const filePath = getUserFilePath(userId, filename)
    const fullPath = path.join(this.baseDir, filePath)

    try {
      // Delete file
      await fs.unlink(fullPath)

      console.log(`[FilesystemTool] File deleted: ${filePath}`)

      return { success: true }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`File not found: ${filename}`)
      }
      console.error(`[FilesystemTool] Error deleting file:`, error)
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Get file type from extension
   */
  private getFileType(ext: string): string {
    const typeMap: Record<string, string> = {
      '.js': 'code',
      '.ts': 'code',
      '.jsx': 'code',
      '.tsx': 'code',
      '.py': 'code',
      '.json': 'code',
      '.html': 'code',
      '.css': 'code',
      '.md': 'note',
      '.txt': 'note'
    }

    return typeMap[ext.toLowerCase()] || 'example'
  }
}
