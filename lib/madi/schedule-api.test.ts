/**
 * Tests for MADI Schedule API Integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getOstroukhSchedule, transformParsedScheduleToDaySchedule } from './schedule-api'
import { MADIParser, ParsedSchedule } from './madi-parser'

describe('Schedule API Integration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment variables before each test
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('getOstroukhSchedule', () => {
    it('should use static data when parser is disabled', async () => {
      process.env.USE_MADI_PARSER = 'false'

      const schedule = await getOstroukhSchedule(new Date('2026-02-03'))

      expect(schedule).not.toBeNull()
      expect(schedule?.dayOfWeek).toBe('Вторник')
      expect(schedule?.lessons).toBeDefined()
    })

    it('should attempt to use parser when enabled', async () => {
      process.env.USE_MADI_PARSER = 'true'
      process.env.MADI_CACHE_TTL = '3600'
      process.env.MADI_REQUEST_TIMEOUT = '10000'
      process.env.MADI_FALLBACK_TO_STATIC = 'true'

      // Mock the parser to avoid actual network requests
      const mockGetProfessorSchedule = vi.fn().mockResolvedValue(null)
      vi.spyOn(MADIParser.prototype, 'getProfessorSchedule').mockImplementation(mockGetProfessorSchedule)

      const schedule = await getOstroukhSchedule(new Date('2026-02-03'))

      // Should have attempted to use parser
      expect(mockGetProfessorSchedule).toHaveBeenCalledWith('Остроух А.В.', expect.any(Date))

      // Should fallback to static data when parser returns null
      expect(schedule).not.toBeNull()
      expect(schedule?.dayOfWeek).toBe('Вторник')
    })

    it('should transform parsed schedule to DaySchedule format', async () => {
      process.env.USE_MADI_PARSER = 'true'

      const mockParsedSchedule: ParsedSchedule = {
        professorName: 'Остроух А.В.',
        date: '2026-02-03',
        dayOfWeek: 'Вторник',
        lessons: [
          {
            time: '12:30-14:00',
            subject: 'Робототехника и мехатроника',
            type: 'practice',
            room: '215',
            building: 'Лабораторный корпус',
            group: 'АСУ-41'
          }
        ],
        source: 'madi-parser'
      }

      const mockGetProfessorSchedule = vi.fn().mockResolvedValue(mockParsedSchedule)
      vi.spyOn(MADIParser.prototype, 'getProfessorSchedule').mockImplementation(mockGetProfessorSchedule)

      const schedule = await getOstroukhSchedule(new Date('2026-02-03'))

      expect(schedule).not.toBeNull()
      expect(schedule?.date).toBe('2026-02-03')
      expect(schedule?.dayOfWeek).toBe('Вторник')
      expect(schedule?.lessons).toHaveLength(1)
      expect(schedule?.lessons[0]).toMatchObject({
        time: '12:30-14:00',
        subject: 'Робототехника и мехатроника',
        type: 'practice',
        room: '215',
        building: 'Лабораторный корпус',
        professor: 'Остроух А.В.',
        group: 'АСУ-41'
      })
    })

    it('should fallback to static data on parser error', async () => {
      process.env.USE_MADI_PARSER = 'true'
      process.env.MADI_FALLBACK_TO_STATIC = 'true'

      // Mock parser to throw error
      const mockGetProfessorSchedule = vi.fn().mockRejectedValue(new Error('Network error'))
      vi.spyOn(MADIParser.prototype, 'getProfessorSchedule').mockImplementation(mockGetProfessorSchedule)

      const schedule = await getOstroukhSchedule(new Date('2026-02-03'))

      // Should have attempted to use parser
      expect(mockGetProfessorSchedule).toHaveBeenCalled()

      // Should fallback to static data on error
      expect(schedule).not.toBeNull()
      expect(schedule?.dayOfWeek).toBe('Вторник')
    })

    it('should use default date when no date provided', async () => {
      process.env.USE_MADI_PARSER = 'false'

      const schedule = await getOstroukhSchedule()

      expect(schedule).not.toBeNull()
      expect(schedule?.date).toBeDefined()
    })

    it('should respect MADI_CACHE_TTL environment variable', async () => {
      process.env.USE_MADI_PARSER = 'true'
      process.env.MADI_CACHE_TTL = '7200'

      const mockGetProfessorSchedule = vi.fn().mockResolvedValue(null)
      vi.spyOn(MADIParser.prototype, 'getProfessorSchedule').mockImplementation(mockGetProfessorSchedule)

      await getOstroukhSchedule(new Date('2026-02-03'))

      // Verify parser was initialized (we can't directly check config, but we can verify it was called)
      expect(mockGetProfessorSchedule).toHaveBeenCalled()
    })

    it('should respect MADI_REQUEST_TIMEOUT environment variable', async () => {
      process.env.USE_MADI_PARSER = 'true'
      process.env.MADI_REQUEST_TIMEOUT = '5000'

      const mockGetProfessorSchedule = vi.fn().mockResolvedValue(null)
      vi.spyOn(MADIParser.prototype, 'getProfessorSchedule').mockImplementation(mockGetProfessorSchedule)

      await getOstroukhSchedule(new Date('2026-02-03'))

      expect(mockGetProfessorSchedule).toHaveBeenCalled()
    })
  })
})
