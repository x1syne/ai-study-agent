// Property-based tests for Filesystem Tool

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { FilesystemTool, validatePath, getUserFilePath } from './filesystem'
import { MCPClient } from '../mcp-client'
import * as fs from 'fs/promises'
import * as path from 'path'

describe('Filesystem Tool Properties', () => {
  let filesystemTool: FilesystemTool
  let testBaseDir: string

  beforeEach(async () => {
    // Create a test directory
    testBaseDir = path.join(process.cwd(), 'test-user-files')
    
    // Create mock MCP client (not used directly by FilesystemTool in current implementation)
    const mockMcpClient = {} as MCPClient
    
    filesystemTool = new FilesystemTool(mockMcpClient, testBaseDir)
    
    // Ensure test directory exists
    await fs.mkdir(testBaseDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testBaseDir, { recursive: true, force: true })
    } catch (error) {
      console.warn('Failed to clean up test directory:', error)
    }
  })

  // Feature: mcp-integration, Property 1: File Operations Safety
  it('Property 1: File operations safety', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)), // userId (alphanumeric)
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), // filename base
        fc.constantFrom('.js', '.ts', '.py', '.txt', '.md', '.json'), // extension
        fc.string({ minLength: 1, maxLength: 500 }), // content
        async (userId, filenameBase, extension, content) => {
          const filename = filenameBase + extension

          // Save file
          const result = await filesystemTool.saveFile({
            userId,
            filename,
            content,
            type: 'code'
          })

          // Property 1: Path safety - file should be in user-specific directory
          expect(result.path).toContain(`user-files${path.sep}${userId}`)
          expect(result.path).not.toContain('..')
          
          // Property 2: Path validation - no directory traversal
          expect(validatePath(result.path)).toBe(true)
          
          // Property 3: URL generation - should be valid
          expect(result.url).toMatch(/^\/api\/files\/download\?userId=.+&filename=.+/)
          expect(result.url).toContain(userId)
          
          // Property 4: File actually exists at the path
          const fullPath = path.join(testBaseDir, result.path)
          const fileExists = await fs.access(fullPath).then(() => true).catch(() => false)
          expect(fileExists).toBe(true)
          
          // Property 5: Content is preserved
          const readResult = await filesystemTool.readFile({ userId, filename })
          expect(readResult.content).toBe(content)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 1b: Path validation prevents directory traversal', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)), // userId
        fc.constantFrom(
          '../etc/passwd',
          '../../secret.txt',
          'folder/../../../etc/passwd',
          '/etc/passwd',
          'C:\\Windows\\System32\\config\\sam'
        ), // malicious paths
        async (userId, maliciousFilename) => {
          // Attempt to save file with malicious path should throw
          await expect(
            filesystemTool.saveFile({
              userId,
              filename: maliciousFilename,
              content: 'malicious content',
              type: 'code'
            })
          ).rejects.toThrow(/Invalid filename|unsafe path/)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 1c: User isolation - files are isolated per user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)), // userId1
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)), // userId2
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+\.js$/.test(s)), // filename
        fc.string({ minLength: 1, maxLength: 200 }), // content1
        fc.string({ minLength: 1, maxLength: 200 }), // content2
        async (userId1, userId2, filename, content1, content2) => {
          // Skip if users are the same
          if (userId1 === userId2) return

          // Save same filename for two different users
          const result1 = await filesystemTool.saveFile({
            userId: userId1,
            filename,
            content: content1,
            type: 'code'
          })

          const result2 = await filesystemTool.saveFile({
            userId: userId2,
            filename,
            content: content2,
            type: 'code'
          })

          // Property: Paths should be different
          expect(result1.path).not.toBe(result2.path)
          expect(result1.path).toContain(userId1)
          expect(result2.path).toContain(userId2)

          // Property: Each user can only read their own file
          const read1 = await filesystemTool.readFile({ userId: userId1, filename })
          const read2 = await filesystemTool.readFile({ userId: userId2, filename })

          expect(read1.content).toBe(content1)
          expect(read2.content).toBe(content2)
          expect(read1.content).not.toBe(read2.content)
        }
      ),
      { numRuns: 2 }
    )
  }, 120000)

  it('Property 1d: File extension validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)), // userId
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)), // filename base
        fc.constantFrom('.exe', '.bat', '.sh', '.dll', '.so'), // dangerous extensions
        async (userId, filenameBase, dangerousExt) => {
          const filename = filenameBase + dangerousExt

          // Attempt to save file with dangerous extension should throw
          await expect(
            filesystemTool.saveFile({
              userId,
              filename,
              content: 'content',
              type: 'code'
            })
          ).rejects.toThrow(/Invalid file extension/)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('Property 1e: Delete operation safety', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)), // userId
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => /^[a-zA-Z0-9_-]+\.js$/.test(s)), // filename
        fc.string({ minLength: 1, maxLength: 200 }), // content
        async (userId, filename, content) => {
          // Save file
          await filesystemTool.saveFile({
            userId,
            filename,
            content,
            type: 'code'
          })

          // Delete file
          const deleteResult = await filesystemTool.deleteFile({ userId, filename })
          expect(deleteResult.success).toBe(true)

          // Property: File should no longer exist
          await expect(
            filesystemTool.readFile({ userId, filename })
          ).rejects.toThrow(/File not found/)
        }
      ),
      { numRuns: 3 }
    )
  }, 90000)

  it('Property 1f: List files returns only user files', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)), // userId
        fc.array(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_-]+$/.test(s)),
            fc.constantFrom('.js', '.ts', '.py', '.txt')
          ),
          { minLength: 1, maxLength: 5 }
        ), // files array
        async (userId, filesData) => {
          // Save multiple files
          for (const [base, ext] of filesData) {
            const filename = base + ext
            await filesystemTool.saveFile({
              userId,
              filename,
              content: `content for ${filename}`,
              type: 'code'
            })
          }

          // List files
          const files = await filesystemTool.listFiles({ userId })

          // Property: Should return all saved files
          expect(files.length).toBeGreaterThanOrEqual(filesData.length)

          // Property: All returned files should belong to this user
          for (const file of files) {
            expect(file.path).toContain(userId)
          }
        }
      ),
      { numRuns: 15 }
    )
  }, 30000)
})
