/**
 * Unit Tests for Data Aggregator
 * 
 * Tests for aggregation functionality covering:
 * - Parallel data loading
 * - Schedule merging (regular + distance learning)
 * - Group extraction
 * - Partial error handling
 * 
 * Requirements: 9.1, 9.2, 9.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MADIParser, ParsedSchedule, ParsedExamSchedule, ParsedDepartment } from './madi-parser'

describe('Data Aggregator Unit Tests', () => {
  let parser: MADIParser

  beforeEach(() => {
    parser = new MADIParser({
      enabled: true,
      cacheTTL: 3600,
      requestTimeout: 10000,
      fallbackToStatic: true,
      baseUrl: 'https://www.madi.ru/tplan'
    })
  })

  describe('getProfessorInfo - Parallel aggregation', () => {
    it('should return null when parser is disabled', async () => {
      const disabledParser = new MADIParser({
        enabled: false,
        cacheTTL: 3600,
        requestTimeout: 10000,
        fallbackToStatic: true,
        baseUrl: 'https://www.madi.ru/tplan'
      })

      const info = await disabledParser.getProfessorInfo('Test Professor', new Date())
      expect(info).toBeNull()
    })

    it('should handle all data sources failing gracefully', async () => {
      // Mock all methods to return null/empty
      vi.spyOn(parser, 'getProfessorSchedule').mockResolvedValue(null)
      vi.spyOn(parser, 'getProfessorExams').mockResolvedValue(null)
      vi.spyOn(parser, 'getProfessorDepartments').mockResolvedValue([])
      vi.spyOn(parser, 'getDistanceLearningSchedule').mockResolvedValue(null)

      const info = await parser.getProfessorInfo('Test Professor', new Date())

      expect(info).not.toBeNull()
      expect(info?.name).toBe('Test Professor')
      expect(info?.departments).toEqual([])
      expect(info?.schedule.lessons).toEqual([])
      expect(info?.examSchedule.exams).toEqual([])
      expect(info?.groups).toEqual([])
      expect(info?.hasDistanceLearning).toBe(false)
    })

    it('should aggregate data from all successful sources', async () => {
      const mockSchedule: ParsedSchedule = {
        professorName: 'Test Professor',
        date: '2026-02-03',
        dayOfWeek: 'Понедельник',
        lessons: [
          {
            time: '9:00-10:30',
            subject: 'Математика',
            type: 'lecture',
            room: '301',
            group: 'АСУ-41'
          }
        ],
        source: 'madi-parser'
      }

      const mockExams: ParsedExamSchedule = {
        professorName: 'Test Professor',
        exams: [
          {
            date: '2026-06-15',
            time: '10:00',
            subject: 'Математика',
            type: 'exam',
            room: '405',
            group: 'АСУ-41'
          }
        ],
        source: 'madi-parser'
      }

      const mockDepartments: ParsedDepartment[] = [
        {
          name: 'Кафедра АСУ',
          professors: ['Test Professor'],
          subjects: ['Математика']
        }
      ]

      vi.spyOn(parser, 'getProfessorSchedule').mockResolvedValue(mockSchedule)
      vi.spyOn(parser, 'getProfessorExams').mockResolvedValue(mockExams)
      vi.spyOn(parser, 'getProfessorDepartments').mockResolvedValue(mockDepartments)
      vi.spyOn(parser, 'getDistanceLearningSchedule').mockResolvedValue(null)

      const info = await parser.getProfessorInfo('Test Professor', new Date())

      expect(info).not.toBeNull()
      expect(info?.name).toBe('Test Professor')
      expect(info?.departments).toEqual(mockDepartments)
      expect(info?.schedule.lessons).toHaveLength(1)
      expect(info?.examSchedule.exams).toHaveLength(1)
      expect(info?.groups).toEqual(['АСУ-41'])
      expect(info?.hasDistanceLearning).toBe(false)
    })

    it('should merge regular and distance learning schedules', async () => {
      const mockRegularSchedule: ParsedSchedule = {
        professorName: 'Test Professor',
        date: '2026-02-03',
        dayOfWeek: 'Понедельник',
        lessons: [
          {
            time: '9:00-10:30',
            subject: 'Математика',
            type: 'lecture',
            room: '301',
            group: 'АСУ-41'
          }
        ],
        source: 'madi-parser'
      }

      const mockDistanceSchedule: ParsedSchedule = {
        professorName: 'Test Professor',
        date: '2026-02-03',
        dayOfWeek: 'Заочная форма',
        lessons: [
          {
            time: '14:00-15:30',
            subject: 'Физика',
            type: 'lecture',
            room: '205',
            group: 'АСУ-31'
          }
        ],
        source: 'madi-parser'
      }

      vi.spyOn(parser, 'getProfessorSchedule').mockResolvedValue(mockRegularSchedule)
      vi.spyOn(parser, 'getProfessorExams').mockResolvedValue(null)
      vi.spyOn(parser, 'getProfessorDepartments').mockResolvedValue([])
      vi.spyOn(parser, 'getDistanceLearningSchedule').mockResolvedValue(mockDistanceSchedule)

      const info = await parser.getProfessorInfo('Test Professor', new Date())

      expect(info).not.toBeNull()
      expect(info?.schedule.lessons).toHaveLength(2)
      expect(info?.schedule.lessons[0].isDistanceLearning).toBeUndefined()
      expect(info?.schedule.lessons[1].isDistanceLearning).toBe(true)
      expect(info?.hasDistanceLearning).toBe(true)
      expect(info?.groups).toEqual(['АСУ-31', 'АСУ-41'])
    })

    it('should extract groups from both schedule and exams', async () => {
      const mockSchedule: ParsedSchedule = {
        professorName: 'Test Professor',
        date: '2026-02-03',
        dayOfWeek: 'Понедельник',
        lessons: [
          {
            time: '9:00-10:30',
            subject: 'Математика',
            type: 'lecture',
            room: '301',
            group: 'АСУ-41'
          },
          {
            time: '11:00-12:30',
            subject: 'Физика',
            type: 'lecture',
            room: '302',
            group: 'АСУ-31'
          }
        ],
        source: 'madi-parser'
      }

      const mockExams: ParsedExamSchedule = {
        professorName: 'Test Professor',
        exams: [
          {
            date: '2026-06-15',
            time: '10:00',
            subject: 'Математика',
            type: 'exam',
            room: '405',
            group: 'АСУ-21'
          }
        ],
        source: 'madi-parser'
      }

      vi.spyOn(parser, 'getProfessorSchedule').mockResolvedValue(mockSchedule)
      vi.spyOn(parser, 'getProfessorExams').mockResolvedValue(mockExams)
      vi.spyOn(parser, 'getProfessorDepartments').mockResolvedValue([])
      vi.spyOn(parser, 'getDistanceLearningSchedule').mockResolvedValue(null)

      const info = await parser.getProfessorInfo('Test Professor', new Date())

      expect(info).not.toBeNull()
      expect(info?.groups).toEqual(['АСУ-21', 'АСУ-31', 'АСУ-41'])
    })

    it('should handle partial failures and return available data', async () => {
      const mockSchedule: ParsedSchedule = {
        professorName: 'Test Professor',
        date: '2026-02-03',
        dayOfWeek: 'Понедельник',
        lessons: [
          {
            time: '9:00-10:30',
            subject: 'Математика',
            type: 'lecture',
            room: '301',
            group: 'АСУ-41'
          }
        ],
        source: 'madi-parser'
      }

      // Mock schedule succeeds, but exams and departments fail
      vi.spyOn(parser, 'getProfessorSchedule').mockResolvedValue(mockSchedule)
      vi.spyOn(parser, 'getProfessorExams').mockRejectedValue(new Error('Network error'))
      vi.spyOn(parser, 'getProfessorDepartments').mockRejectedValue(new Error('Network error'))
      vi.spyOn(parser, 'getDistanceLearningSchedule').mockResolvedValue(null)

      const info = await parser.getProfessorInfo('Test Professor', new Date())

      // Should still return partial data
      expect(info).not.toBeNull()
      expect(info?.schedule.lessons).toHaveLength(1)
      expect(info?.examSchedule.exams).toEqual([])
      expect(info?.departments).toEqual([])
      expect(info?.groups).toEqual(['АСУ-41'])
    })

    it('should deduplicate groups from schedule and exams', async () => {
      const mockSchedule: ParsedSchedule = {
        professorName: 'Test Professor',
        date: '2026-02-03',
        dayOfWeek: 'Понедельник',
        lessons: [
          {
            time: '9:00-10:30',
            subject: 'Математика',
            type: 'lecture',
            room: '301',
            group: 'АСУ-41'
          },
          {
            time: '11:00-12:30',
            subject: 'Физика',
            type: 'lecture',
            room: '302',
            group: 'АСУ-41' // Duplicate group
          }
        ],
        source: 'madi-parser'
      }

      const mockExams: ParsedExamSchedule = {
        professorName: 'Test Professor',
        exams: [
          {
            date: '2026-06-15',
            time: '10:00',
            subject: 'Математика',
            type: 'exam',
            room: '405',
            group: 'АСУ-41' // Duplicate group
          }
        ],
        source: 'madi-parser'
      }

      vi.spyOn(parser, 'getProfessorSchedule').mockResolvedValue(mockSchedule)
      vi.spyOn(parser, 'getProfessorExams').mockResolvedValue(mockExams)
      vi.spyOn(parser, 'getProfessorDepartments').mockResolvedValue([])
      vi.spyOn(parser, 'getDistanceLearningSchedule').mockResolvedValue(null)

      const info = await parser.getProfessorInfo('Test Professor', new Date())

      expect(info).not.toBeNull()
      expect(info?.groups).toEqual(['АСУ-41']) // Should only appear once
    })

    it('should handle empty groups gracefully', async () => {
      const mockSchedule: ParsedSchedule = {
        professorName: 'Test Professor',
        date: '2026-02-03',
        dayOfWeek: 'Понедельник',
        lessons: [
          {
            time: '9:00-10:30',
            subject: 'Математика',
            type: 'lecture',
            room: '301'
            // No group specified
          }
        ],
        source: 'madi-parser'
      }

      vi.spyOn(parser, 'getProfessorSchedule').mockResolvedValue(mockSchedule)
      vi.spyOn(parser, 'getProfessorExams').mockResolvedValue(null)
      vi.spyOn(parser, 'getProfessorDepartments').mockResolvedValue([])
      vi.spyOn(parser, 'getDistanceLearningSchedule').mockResolvedValue(null)

      const info = await parser.getProfessorInfo('Test Professor', new Date())

      expect(info).not.toBeNull()
      expect(info?.groups).toEqual([])
    })
  })
})
