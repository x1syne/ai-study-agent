// Filesystem Tool - MCP wrapper for file operations

import { MCPClient } from '../mcp-client'
import { MCPError } from '../errors'
import { prisma } from '@/lib/prisma'
import * as path from 'path'
import * as fs from 'fs/promises'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

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
  
  // Construct safe path (without 'user-files' prefix since baseDir already includes it)
  return path.join(userId, sanitized)
}

/**
 * Create Word document from text content with GOST formatting
 * GOST requirements:
 * - Font: Times New Roman, 14pt
 * - Line spacing: 1.5
 * - First line indent: 1.25cm (708 twips)
 * - Alignment: Justified
 * - Headings: Bold, centered for H1, left-aligned for H2/H3
 */
async function createWordDocument(content: string): Promise<Buffer> {
  // Parse content into paragraphs
  const lines = content.split('\n')
  const paragraphs: Paragraph[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    
    if (!trimmed) {
      // Empty line
      paragraphs.push(new Paragraph({ text: '' }))
      continue
    }

    // Check for headings (lines starting with #)
    if (trimmed.startsWith('# ')) {
      // Heading 1 - GOST: Bold, 14pt, centered, no indent
      paragraphs.push(new Paragraph({
        text: trimmed.substring(2),
        heading: HeadingLevel.HEADING_1,
        alignment: 'center',
        spacing: {
          before: 240, // 12pt before
          after: 120   // 6pt after
        },
        style: 'Heading1'
      }))
    } else if (trimmed.startsWith('## ')) {
      // Heading 2 - GOST: Bold, 14pt, left-aligned, no indent
      paragraphs.push(new Paragraph({
        text: trimmed.substring(3),
        heading: HeadingLevel.HEADING_2,
        alignment: 'left',
        spacing: {
          before: 240,
          after: 120
        },
        style: 'Heading2'
      }))
    } else if (trimmed.startsWith('### ')) {
      // Heading 3 - GOST: Bold, 14pt, left-aligned, no indent
      paragraphs.push(new Paragraph({
        text: trimmed.substring(4),
        heading: HeadingLevel.HEADING_3,
        alignment: 'left',
        spacing: {
          before: 240,
          after: 120
        },
        style: 'Heading3'
      }))
    } else {
      // Regular paragraph - GOST: Times New Roman 14pt, justified, 1.25cm indent, 1.5 line spacing
      paragraphs.push(new Paragraph({
        children: [
          new TextRun({
            text: trimmed,
            font: 'Times New Roman',
            size: 28 // 14pt = 28 half-points
          })
        ],
        alignment: 'both', // Justified (по ширине)
        indent: {
          firstLine: 708 // 1.25cm = 708 twips (1cm = 566.93 twips)
        },
        spacing: {
          line: 360, // 1.5 line spacing (240 = single, 360 = 1.5, 480 = double)
          lineRule: 'auto'
        }
      }))
    }
  }

  // Create document with GOST styles
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: true
          },
          paragraph: {
            alignment: 'center',
            spacing: {
              before: 240,
              after: 120
            }
          }
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: true
          },
          paragraph: {
            alignment: 'left',
            spacing: {
              before: 240,
              after: 120
            }
          }
        },
        {
          id: 'Heading3',
          name: 'Heading 3',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: 'Times New Roman',
            size: 28, // 14pt
            bold: true
          },
          paragraph: {
            alignment: 'left',
            spacing: {
              before: 240,
              after: 120
            }
          }
        }
      ]
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1134,    // 2cm = 1134 twips
            right: 850,   // 1.5cm = 850 twips
            bottom: 1134, // 2cm
            left: 1701    // 3cm = 1701 twips (GOST left margin)
          }
        }
      },
      children: paragraphs
    }]
  })

  // Generate buffer
  const buffer = await Packer.toBuffer(doc)
  return buffer
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
  private allowedExtensions: string[] = [
    // Текст и документация
    '.txt', '.md', '.rst', '.tex',
    // Документы
    '.docx', '.doc',
    // Web
    '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.scss', '.sass', '.less',
    // Python
    '.py', '.pyw', '.pyx',
    // C/C++
    '.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx',
    // Java/Kotlin
    '.java', '.kt', '.kts',
    // C#
    '.cs',
    // Go
    '.go',
    // Rust
    '.rs',
    // PHP
    '.php',
    // Ruby
    '.rb',
    // Swift
    '.swift',
    // Данные
    '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg',
    // Shell
    '.sh', '.bash', '.zsh', '.fish',
    // SQL
    '.sql',
    // R
    '.r', '.R'
  ]

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

      // Check if file is Word document
      const ext = filename.split('.').pop()?.toLowerCase()
      if (ext === 'docx' || ext === 'doc') {
        // Create Word document
        const buffer = await createWordDocument(content)
        await fs.writeFile(fullPath, buffer)
      } else {
        // Write regular text file
        await fs.writeFile(fullPath, content, 'utf-8')
      }

      // Save to database
      await prisma.userFile.upsert({
        where: {
          userId_filename: {
            userId,
            filename
          }
        },
        update: {
          content,
          type,
          path: filePath
        },
        create: {
          userId,
          filename,
          content,
          type,
          path: filePath
        }
      })

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
    const userDir = path.join(this.baseDir, userId)

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
            path: path.join(userId, file),
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
      '.txt': 'note',
      '.docx': 'note',
      '.doc': 'note'
    }

    return typeMap[ext.toLowerCase()] || 'example'
  }
}
