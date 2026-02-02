// Unit tests for Filesystem Tool path validation

import { describe, it, expect } from 'vitest'
import { validatePath, getUserFilePath, validateFileExtension } from './filesystem'
import * as path from 'path'

describe('Filesystem Tool - Path Validation', () => {
  describe('validatePath', () => {
    it('should accept valid simple filenames', () => {
      expect(validatePath('file.txt')).toBe(true)
      expect(validatePath('document.md')).toBe(true)
      expect(validatePath('script.js')).toBe(true)
    })

    it('should accept valid relative paths', () => {
      expect(validatePath('folder/file.txt')).toBe(true)
      expect(validatePath('a/b/c/file.js')).toBe(true)
    })

    it('should reject directory traversal with ..', () => {
      expect(validatePath('../etc/passwd')).toBe(false)
      expect(validatePath('../../secret.txt')).toBe(false)
      expect(validatePath('folder/../../../etc/passwd')).toBe(false)
      expect(validatePath('valid/../../invalid.txt')).toBe(false)
    })

    it('should reject absolute paths starting with /', () => {
      expect(validatePath('/etc/passwd')).toBe(false)
      expect(validatePath('/home/user/file.txt')).toBe(false)
      expect(validatePath('/var/log/system.log')).toBe(false)
    })

    it('should reject absolute paths starting with \\', () => {
      expect(validatePath('\\Windows\\System32\\config')).toBe(false)
      expect(validatePath('\\etc\\passwd')).toBe(false)
    })

    it('should reject Windows drive letters', () => {
      expect(validatePath('C:\\Windows\\System32\\config\\sam')).toBe(false)
      expect(validatePath('D:\\data\\secret.txt')).toBe(false)
      expect(validatePath('c:\\temp\\file.txt')).toBe(false)
    })

    it('should accept filenames with underscores and hyphens', () => {
      expect(validatePath('my_file.txt')).toBe(true)
      expect(validatePath('my-file.txt')).toBe(true)
      expect(validatePath('file_name-123.js')).toBe(true)
    })
  })

  describe('getUserFilePath', () => {
    it('should generate safe user-specific paths', () => {
      const result = getUserFilePath('user123', 'file.txt')
      // getUserFilePath returns relative path without 'user-files' prefix
      expect(result).toBe(path.join('user123', 'file.txt'))
    })

    it('should sanitize dangerous characters in filename', () => {
      const result = getUserFilePath('user123', 'my file.js')
      expect(result).toBe(path.join('user123', 'my_file.js'))
    })

    it('should sanitize special characters', () => {
      const result = getUserFilePath('user123', 'file@#$%.txt')
      // @ # $ % are replaced with _, but . is allowed (for extension)
      expect(result).toBe(path.join('user123', 'file____.txt'))
    })

    it('should preserve valid characters', () => {
      const result = getUserFilePath('user123', 'my-file_123.js')
      expect(result).toBe(path.join('user123', 'my-file_123.js'))
    })

    it('should handle different user IDs', () => {
      const result1 = getUserFilePath('user1', 'file.txt')
      const result2 = getUserFilePath('user2', 'file.txt')
      
      expect(result1).toContain('user1')
      expect(result2).toContain('user2')
      expect(result1).not.toBe(result2)
    })

    it('should sanitize directory traversal attempts in filename', () => {
      const result = getUserFilePath('user123', '../../../etc/passwd')
      // The / are converted to _, but .. (dots) are allowed by the regex
      // This is why validatePath() is needed as a separate check
      expect(result).toContain('user123')
      // The slashes should be sanitized
      expect(result).toBe(path.join('user123', '.._.._.._etc_passwd'))
    })
  })

  describe('validateFileExtension', () => {
    const allowedExtensions = ['.txt', '.md', '.js', '.py', '.json']

    it('should accept allowed extensions', () => {
      expect(validateFileExtension('file.txt', allowedExtensions)).toBe(true)
      expect(validateFileExtension('script.js', allowedExtensions)).toBe(true)
      expect(validateFileExtension('data.json', allowedExtensions)).toBe(true)
    })

    it('should reject disallowed extensions', () => {
      expect(validateFileExtension('file.exe', allowedExtensions)).toBe(false)
      expect(validateFileExtension('script.bat', allowedExtensions)).toBe(false)
      expect(validateFileExtension('malware.dll', allowedExtensions)).toBe(false)
    })

    it('should be case-insensitive', () => {
      expect(validateFileExtension('file.TXT', allowedExtensions)).toBe(true)
      expect(validateFileExtension('script.JS', allowedExtensions)).toBe(true)
      expect(validateFileExtension('file.EXE', allowedExtensions)).toBe(false)
    })

    it('should handle files without extensions', () => {
      expect(validateFileExtension('README', allowedExtensions)).toBe(false)
      expect(validateFileExtension('Makefile', allowedExtensions)).toBe(false)
    })

    it('should handle multiple dots in filename', () => {
      expect(validateFileExtension('my.file.name.txt', allowedExtensions)).toBe(true)
      expect(validateFileExtension('archive.tar.gz', allowedExtensions)).toBe(false)
    })
  })

  describe('Path Validation - Security Tests', () => {
    it('should prevent common directory traversal patterns', () => {
      const maliciousPaths = [
        '../etc/passwd',
        '../../secret.txt',
        'folder/../../../etc/passwd',
        '..\\..\\Windows\\System32',
        'valid/../../invalid.txt',
        './../../../etc/shadow'
      ]

      for (const maliciousPath of maliciousPaths) {
        expect(validatePath(maliciousPath)).toBe(false)
      }
    })

    it('should prevent absolute path access', () => {
      const absolutePaths = [
        '/etc/passwd',
        '/var/log/system.log',
        '/home/user/.ssh/id_rsa',
        '\\Windows\\System32\\config\\sam',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        'D:\\sensitive\\data.txt'
      ]

      for (const absolutePath of absolutePaths) {
        expect(validatePath(absolutePath)).toBe(false)
      }
    })

    it('should allow safe relative paths', () => {
      const safePaths = [
        'file.txt',
        'folder/file.txt',
        'a/b/c/file.js',
        'my-file_123.txt',
        'project/src/index.js'
      ]

      for (const safePath of safePaths) {
        expect(validatePath(safePath)).toBe(true)
      }
    })
  })

  describe('getUserFilePath - Safe Path Generation', () => {
    it('should always generate paths within user directory', () => {
      const testCases = [
        { userId: 'user1', filename: 'file.txt' },
        { userId: 'user2', filename: 'script.js' },
        { userId: 'admin', filename: 'config.json' }
      ]

      for (const { userId, filename } of testCases) {
        const result = getUserFilePath(userId, filename)
        // getUserFilePath returns relative path without 'user-files' prefix
        expect(result).toContain(userId)
      }
    })

    it('should isolate users by directory', () => {
      const filename = 'shared.txt'
      const path1 = getUserFilePath('user1', filename)
      const path2 = getUserFilePath('user2', filename)

      expect(path1).toContain('user1')
      expect(path2).toContain('user2')
      expect(path1).not.toContain('user2')
      expect(path2).not.toContain('user1')
    })

    it('should sanitize all dangerous characters', () => {
      const dangerousFilenames = [
        'file<script>.txt',
        'file|pipe.txt',
        'file&command.txt',
        'file;semicolon.txt',
        'file$variable.txt'
      ]

      for (const filename of dangerousFilenames) {
        const result = getUserFilePath('user123', filename)
        // Should not contain dangerous characters
        expect(result).not.toMatch(/[<>|&;$]/)
        // Should contain underscores instead
        expect(result).toContain('_')
      }
    })
  })
})
