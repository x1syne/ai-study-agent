/**
 * Unit Tests for MADI Parser HTTP Fetcher and Schedule Parser
 * 
 * Tests for fetchMADIPage function covering:
 * - Successful HTTP requests
 * - Timeout handling
 * - HTTP error responses (4xx, 5xx)
 * 
 * Tests for parseSchedulePage function covering:
 * - Parsing correct schedule tables
 * - Handling empty schedules
 * - Handling incorrect HTML
 * 
 * Requirements: 5.3, 1.3, 1.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  fetchMADIPage, 
  parseSchedulePage, 
  parseExamPage, 
  inferLessonType, 
  inferExamType,
  parseDistanceLearningPage,
  searchProfessorInHTML
} from './madi-parser'

describe('HTTP Fetcher Unit Tests', () => {
  // Store original fetch
  const originalFetch = global.fetch

  beforeEach(() => {
    // Reset fetch mock before each test
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore original fetch
    global.fetch = originalFetch
  })

  describe('Successful requests', () => {
    it('should successfully fetch HTML content', async () => {
      const mockHtml = '<html><body>Test Schedule</body></html>'
      
      // Mock successful fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => mockHtml
      } as Response)

      const result = await fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)

      expect(result).toBe(mockHtml)
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.madi.ru/tplan/r/?task=8',
        expect.objectContaining({
          headers: {
            'User-Agent': 'Mozilla/5.0 (MADI Schedule Bot/1.0)',
          }
        })
      )
    })

    it('should include User-Agent header in request', async () => {
      const mockHtml = '<html></html>'
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => mockHtml
      } as Response)

      await fetchMADIPage('https://www.madi.ru/tplan/r/?task=4', 3000)

      const fetchCall = (global.fetch as any).mock.calls[0]
      expect(fetchCall[1].headers['User-Agent']).toBe('Mozilla/5.0 (MADI Schedule Bot/1.0)')
    })

    it('should handle large HTML responses', async () => {
      const largeHtml = '<html><body>' + 'x'.repeat(100000) + '</body></html>'
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => largeHtml
      } as Response)

      const result = await fetchMADIPage('https://www.madi.ru/tplan/r/?task=11', 10000)

      expect(result).toBe(largeHtml)
      expect(result.length).toBeGreaterThan(100000)
    })
  })

  describe('Timeout handling', () => {
    it('should abort request after timeout', async () => {
      // Mock fetch that respects abort signal
      global.fetch = vi.fn().mockImplementation((url, options: any) => {
        return new Promise((resolve, reject) => {
          // Listen for abort signal
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const error = new Error('The operation was aborted')
              error.name = 'AbortError'
              reject(error)
            })
          }
          // Never resolve normally - simulates hanging request
        })
      })

      // Set timeout to 100ms
      await expect(
        fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 100)
      ).rejects.toThrow('Request timeout after 100ms')
    })

    it('should handle AbortError correctly', async () => {
      // Mock fetch that throws AbortError
      global.fetch = vi.fn().mockImplementation(() => {
        const error = new Error('The operation was aborted')
        error.name = 'AbortError'
        return Promise.reject(error)
      })

      await expect(
        fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)
      ).rejects.toThrow('Request timeout after 5000ms')
    })

    it('should clear timeout on successful response', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '<html></html>'
      } as Response)

      await fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)

      // clearTimeout should be called in finally block
      expect(clearTimeoutSpy).toHaveBeenCalled()
      
      clearTimeoutSpy.mockRestore()
    })

    it('should clear timeout even when request fails', async () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await expect(
        fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)
      ).rejects.toThrow('Network error')

      // clearTimeout should be called in finally block
      expect(clearTimeoutSpy).toHaveBeenCalled()
      
      clearTimeoutSpy.mockRestore()
    })
  })

  describe('HTTP error handling', () => {
    it('should throw error on 404 Not Found', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => '<html><body>404 Not Found</body></html>'
      } as Response)

      await expect(
        fetchMADIPage('https://www.madi.ru/tplan/r/?task=999', 5000)
      ).rejects.toThrow('HTTP 404: Not Found')
    })

    it('should throw error on 500 Internal Server Error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => '<html><body>500 Error</body></html>'
      } as Response)

      await expect(
        fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)
      ).rejects.toThrow('HTTP 500: Internal Server Error')
    })

    it('should throw error on 503 Service Unavailable', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => '<html><body>503 Service Unavailable</body></html>'
      } as Response)

      await expect(
        fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)
      ).rejects.toThrow('HTTP 503: Service Unavailable')
    })

    it('should throw error on 403 Forbidden', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => '<html><body>403 Forbidden</body></html>'
      } as Response)

      await expect(
        fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)
      ).rejects.toThrow('HTTP 403: Forbidden')
    })

    it('should throw error on 401 Unauthorized', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '<html><body>401 Unauthorized</body></html>'
      } as Response)

      await expect(
        fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)
      ).rejects.toThrow('HTTP 401: Unauthorized')
    })

    it('should throw error on 502 Bad Gateway', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: async () => '<html><body>502 Bad Gateway</body></html>'
      } as Response)

      await expect(
        fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)
      ).rejects.toThrow('HTTP 502: Bad Gateway')
    })
  })

  describe('Network error handling', () => {
    it('should propagate network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network request failed'))

      await expect(
        fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)
      ).rejects.toThrow('Network request failed')
    })

    it('should propagate connection refused errors', async () => {
      const error = new Error('connect ECONNREFUSED')
      global.fetch = vi.fn().mockRejectedValue(error)

      await expect(
        fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)
      ).rejects.toThrow('connect ECONNREFUSED')
    })

    it('should propagate DNS resolution errors', async () => {
      const error = new Error('getaddrinfo ENOTFOUND')
      global.fetch = vi.fn().mockRejectedValue(error)

      await expect(
        fetchMADIPage('https://invalid-domain.madi.ru/tplan/r/?task=8', 5000)
      ).rejects.toThrow('getaddrinfo ENOTFOUND')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty HTML response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => ''
      } as Response)

      const result = await fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)

      expect(result).toBe('')
    })

    it('should handle response with special characters', async () => {
      const htmlWithSpecialChars = '<html><body>Остроух А.В. — профессор кафедры АСУ</body></html>'
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => htmlWithSpecialChars
      } as Response)

      const result = await fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 5000)

      expect(result).toBe(htmlWithSpecialChars)
      expect(result).toContain('Остроух')
    })

    it('should handle very short timeout', async () => {
      // Mock fetch that respects abort signal
      global.fetch = vi.fn().mockImplementation((url, options: any) => {
        return new Promise((resolve, reject) => {
          // Listen for abort signal
          if (options?.signal) {
            options.signal.addEventListener('abort', () => {
              const error = new Error('The operation was aborted')
              error.name = 'AbortError'
              reject(error)
            })
          }
          // Never resolve normally - simulates hanging request
        })
      })

      // Timeout of 1ms should fail
      await expect(
        fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 1)
      ).rejects.toThrow('Request timeout after 1ms')
    })

    it('should handle very long timeout', async () => {
      const mockHtml = '<html><body>Success</body></html>'
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => mockHtml
      } as Response)

      // Very long timeout (1 hour)
      const result = await fetchMADIPage('https://www.madi.ru/tplan/r/?task=8', 3600000)

      expect(result).toBe(mockHtml)
    })
  })
})


// ============================================================================
// Schedule Parser Unit Tests
// ============================================================================

describe('Schedule Parser Unit Tests', () => {
  const testDate = new Date('2026-02-03T10:00:00Z') // Tuesday
  const professorName = 'Остроух А.В.'

  describe('Parsing correct schedule tables', () => {
    it('should parse a valid schedule table with all fields', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <th>День недели</th>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
                <th>Группа</th>
              </tr>
              <tr>
                <td>Понедельник</td>
                <td>9:00-10:30</td>
                <td>Автоматизированные системы управления (лекция)</td>
                <td>301, Главный корпус</td>
                <td>АСУ-41</td>
              </tr>
              <tr>
                <td>Понедельник</td>
                <td>10:45-12:15</td>
                <td>Робототехника (практика)</td>
                <td>405, Лабораторный корпус</td>
                <td>АСУ-31</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, testDate)

      expect(result).not.toBeNull()
      expect(result?.professorName).toBe(professorName)
      expect(result?.date).toBe('2026-02-03')
      expect(result?.dayOfWeek).toBe('Вторник')
      expect(result?.lessons).toHaveLength(2)
      expect(result?.source).toBe('madi-parser')

      // Check first lesson
      expect(result?.lessons[0]).toEqual({
        time: '9:00-10:30',
        subject: 'Автоматизированные системы управления (лекция)',
        type: 'lecture',
        room: '301',
        building: 'Главный корпус',
        group: 'АСУ-41'
      })

      // Check second lesson
      expect(result?.lessons[1]).toEqual({
        time: '10:45-12:15',
        subject: 'Робототехника (практика)',
        type: 'practice',
        room: '405',
        building: 'Лабораторный корпус',
        group: 'АСУ-31'
      })
    })

    it('should parse schedule with missing optional fields', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <th>День недели</th>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
                <th>Группа</th>
              </tr>
              <tr>
                <td>Вторник</td>
                <td>14:00-15:30</td>
                <td>Теория автоматического управления</td>
                <td>210</td>
                <td></td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, testDate)

      expect(result).not.toBeNull()
      expect(result?.lessons).toHaveLength(1)
      
      const lesson = result?.lessons[0]
      expect(lesson?.time).toBe('14:00-15:30')
      expect(lesson?.subject).toBe('Теория автоматического управления')
      expect(lesson?.type).toBe('lecture')
      expect(lesson?.room).toBe('210')
      expect(lesson?.building).toBeUndefined()
      expect(lesson?.group).toBeUndefined()
    })

    it('should infer lesson type from subject name', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>День</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>Среда</td>
                <td>9:00-10:30</td>
                <td>Программирование (лабораторная работа)</td>
                <td>101</td>
                <td>АСУ-21</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, testDate)

      expect(result?.lessons[0]?.type).toBe('lab')
    })

    it('should handle room info without building', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>День</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>Четверг</td>
                <td>12:00-13:30</td>
                <td>Математика</td>
                <td>505</td>
                <td>АСУ-11</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, testDate)

      expect(result?.lessons[0]?.room).toBe('505')
      expect(result?.lessons[0]?.building).toBeUndefined()
    })

    it('should parse multiple lessons on the same day', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>День</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>Пятница</td>
                <td>9:00-10:30</td>
                <td>Предмет 1</td>
                <td>101</td>
                <td>Группа 1</td>
              </tr>
              <tr>
                <td>Пятница</td>
                <td>10:45-12:15</td>
                <td>Предмет 2</td>
                <td>102</td>
                <td>Группа 2</td>
              </tr>
              <tr>
                <td>Пятница</td>
                <td>14:00-15:30</td>
                <td>Предмет 3</td>
                <td>103</td>
                <td>Группа 3</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, testDate)

      expect(result?.lessons).toHaveLength(3)
      expect(result?.lessons[0]?.time).toBe('9:00-10:30')
      expect(result?.lessons[1]?.time).toBe('10:45-12:15')
      expect(result?.lessons[2]?.time).toBe('14:00-15:30')
    })
  })

  describe('Handling empty schedules', () => {
    it('should return empty lessons array for empty schedule', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <th>День недели</th>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
                <th>Группа</th>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, testDate)

      expect(result).not.toBeNull()
      expect(result?.professorName).toBe(professorName)
      expect(result?.lessons).toEqual([])
      expect(result?.source).toBe('madi-parser')
    })

    it('should skip rows with missing time', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>День</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>Понедельник</td>
                <td></td>
                <td>Предмет без времени</td>
                <td>101</td>
                <td>Группа 1</td>
              </tr>
              <tr>
                <td>Понедельник</td>
                <td>10:00-11:30</td>
                <td>Нормальный предмет</td>
                <td>102</td>
                <td>Группа 2</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, testDate)

      expect(result?.lessons).toHaveLength(1)
      expect(result?.lessons[0]?.subject).toBe('Нормальный предмет')
    })

    it('should skip rows with missing subject', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>День</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>Вторник</td>
                <td>9:00-10:30</td>
                <td></td>
                <td>101</td>
                <td>Группа 1</td>
              </tr>
              <tr>
                <td>Вторник</td>
                <td>10:45-12:15</td>
                <td>Нормальный предмет</td>
                <td>102</td>
                <td>Группа 2</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, testDate)

      expect(result?.lessons).toHaveLength(1)
      expect(result?.lessons[0]?.subject).toBe('Нормальный предмет')
    })
  })

  describe('Handling incorrect HTML', () => {
    it('should return null when table is not found', () => {
      const html = `
        <html>
          <body>
            <p>Нет таблицы расписания</p>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, testDate)

      expect(result).toBeNull()
    })

    it('should return null for completely invalid HTML', () => {
      const html = 'This is not HTML at all!'

      const result = parseSchedulePage(html, professorName, testDate)

      expect(result).toBeNull()
    })

    it('should handle malformed table gracefully', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <td>Incomplete row
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, testDate)

      // Should return empty schedule, not crash
      expect(result).not.toBeNull()
      expect(result?.lessons).toEqual([])
    })

    it('should handle HTML with special characters', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>День</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>Понедельник</td>
                <td>9:00-10:30</td>
                <td>Теория автоматического управления — основы</td>
                <td>301, Корпус №2</td>
                <td>АСУ-41</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, testDate)

      expect(result?.lessons).toHaveLength(1)
      expect(result?.lessons[0]?.subject).toContain('—')
      expect(result?.lessons[0]?.building).toContain('№')
    })

    it('should continue parsing after encountering a bad row', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>День</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>Понедельник</td>
                <td>9:00-10:30</td>
                <td>Хороший предмет 1</td>
                <td>101</td>
                <td>Группа 1</td>
              </tr>
              <tr>
                <td colspan="5">Плохая строка</td>
              </tr>
              <tr>
                <td>Понедельник</td>
                <td>12:00-13:30</td>
                <td>Хороший предмет 2</td>
                <td>102</td>
                <td>Группа 2</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, testDate)

      // Should parse the good rows and skip the bad one
      expect(result?.lessons.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Lesson type inference', () => {
    it('should infer "lecture" for subjects with "лекция"', () => {
      expect(inferLessonType('Математика (лекция)')).toBe('lecture')
      expect(inferLessonType('Физика ЛЕКЦИЯ')).toBe('lecture')
    })

    it('should infer "practice" for subjects with "практика"', () => {
      expect(inferLessonType('Программирование (практика)')).toBe('practice')
      expect(inferLessonType('Химия ПРАКТИКА')).toBe('practice')
    })

    it('should infer "lab" for subjects with "лабораторная"', () => {
      expect(inferLessonType('Физика (лабораторная работа)')).toBe('lab')
      expect(inferLessonType('Химия ЛАБОРАТОРНАЯ')).toBe('lab')
      expect(inferLessonType('Биология (лаб. работа)')).toBe('lab')
    })

    it('should default to "lecture" for unknown types', () => {
      expect(inferLessonType('Математика')).toBe('lecture')
      expect(inferLessonType('Неизвестный тип занятия')).toBe('lecture')
    })

    it('should be case-insensitive', () => {
      expect(inferLessonType('ПРАКТИКА')).toBe('practice')
      expect(inferLessonType('ЛаБоРаТоРнАя')).toBe('lab')
      expect(inferLessonType('ЛеКцИя')).toBe('lecture')
    })
  })

  describe('Date and day of week handling', () => {
    it('should format date correctly', () => {
      const date = new Date('2026-02-03T10:00:00Z')
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>День</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
            </table>
          </body>
        </html>
      `

      const result = parseSchedulePage(html, professorName, date)

      expect(result?.date).toBe('2026-02-03')
    })

    it('should get correct Russian day of week', () => {
      const testCases = [
        { date: new Date('2026-02-02T10:00:00Z'), expected: 'Понедельник' }, // Monday
        { date: new Date('2026-02-03T10:00:00Z'), expected: 'Вторник' },     // Tuesday
        { date: new Date('2026-02-04T10:00:00Z'), expected: 'Среда' },       // Wednesday
        { date: new Date('2026-02-05T10:00:00Z'), expected: 'Четверг' },     // Thursday
        { date: new Date('2026-02-06T10:00:00Z'), expected: 'Пятница' },     // Friday
        { date: new Date('2026-02-07T10:00:00Z'), expected: 'Суббота' },     // Saturday
        { date: new Date('2026-02-08T10:00:00Z'), expected: 'Воскресенье' }, // Sunday
      ]

      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>День</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
            </table>
          </body>
        </html>
      `

      testCases.forEach(({ date, expected }) => {
        const result = parseSchedulePage(html, professorName, date)
        expect(result?.dayOfWeek).toBe(expected)
      })
    })
  })
})


// ============================================================================
// Exam Parser Unit Tests
// ============================================================================

describe('Exam Parser Unit Tests', () => {
  const professorName = 'Остроух А.В.'

  describe('Parsing correct exam tables', () => {
    it('should parse a valid exam table with all fields', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <th>Дата</th>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
                <th>Группа</th>
              </tr>
              <tr>
                <td>15.06.2026</td>
                <td>10:00</td>
                <td>Автоматизированные системы управления (экзамен)</td>
                <td>405, Главный корпус</td>
                <td>АСУ-41</td>
              </tr>
              <tr>
                <td>18.06.2026</td>
                <td>14:00</td>
                <td>Робототехника (зачёт)</td>
                <td>301, Лабораторный корпус</td>
                <td>АСУ-31</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      expect(result).not.toBeNull()
      expect(result?.professorName).toBe(professorName)
      expect(result?.exams).toHaveLength(2)
      expect(result?.source).toBe('madi-parser')

      // Check first exam
      expect(result?.exams[0]).toEqual({
        date: '15.06.2026',
        time: '10:00',
        subject: 'Автоматизированные системы управления (экзамен)',
        type: 'exam',
        room: '405',
        building: 'Главный корпус',
        group: 'АСУ-41'
      })

      // Check second exam (test)
      expect(result?.exams[1]).toEqual({
        date: '18.06.2026',
        time: '14:00',
        subject: 'Робототехника (зачёт)',
        type: 'test',
        room: '301',
        building: 'Лабораторный корпус',
        group: 'АСУ-31'
      })
    })

    it('should parse exam with missing optional fields', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <th>Дата</th>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
                <th>Группа</th>
              </tr>
              <tr>
                <td>20.06.2026</td>
                <td>12:00</td>
                <td>Теория автоматического управления</td>
                <td>210</td>
                <td></td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      expect(result).not.toBeNull()
      expect(result?.exams).toHaveLength(1)
      
      const exam = result?.exams[0]
      expect(exam?.date).toBe('20.06.2026')
      expect(exam?.time).toBe('12:00')
      expect(exam?.subject).toBe('Теория автоматического управления')
      expect(exam?.type).toBe('exam')
      expect(exam?.room).toBe('210')
      expect(exam?.building).toBeUndefined()
      expect(exam?.group).toBeUndefined()
    })

    it('should infer exam type from subject name', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Дата</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>22.06.2026</td>
                <td>9:00</td>
                <td>Программирование (зачет)</td>
                <td>101</td>
                <td>АСУ-21</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      expect(result?.exams[0]?.type).toBe('test')
    })

    it('should handle room info without building', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Дата</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>25.06.2026</td>
                <td>15:00</td>
                <td>Математика (экзамен)</td>
                <td>505</td>
                <td>АСУ-11</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      expect(result?.exams[0]?.room).toBe('505')
      expect(result?.exams[0]?.building).toBeUndefined()
    })

    it('should parse multiple exams', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Дата</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>10.06.2026</td>
                <td>9:00</td>
                <td>Предмет 1 (экзамен)</td>
                <td>101</td>
                <td>Группа 1</td>
              </tr>
              <tr>
                <td>12.06.2026</td>
                <td>10:00</td>
                <td>Предмет 2 (зачёт)</td>
                <td>102</td>
                <td>Группа 2</td>
              </tr>
              <tr>
                <td>15.06.2026</td>
                <td>14:00</td>
                <td>Предмет 3 (экзамен)</td>
                <td>103</td>
                <td>Группа 3</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      expect(result?.exams).toHaveLength(3)
      expect(result?.exams[0]?.date).toBe('10.06.2026')
      expect(result?.exams[1]?.date).toBe('12.06.2026')
      expect(result?.exams[2]?.date).toBe('15.06.2026')
    })

    it('should detect distance learning exams', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Дата</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr class="distance">
                <td>20.06.2026</td>
                <td>10:00</td>
                <td>Математика (заочная форма)</td>
                <td>Online</td>
                <td>АСУ-41з</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      expect(result?.exams[0]?.isDistanceLearning).toBe(true)
    })
  })

  describe('Handling empty exam schedules', () => {
    it('should return empty exams array for empty schedule', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <th>Дата</th>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
                <th>Группа</th>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      expect(result).not.toBeNull()
      expect(result?.professorName).toBe(professorName)
      expect(result?.exams).toEqual([])
      expect(result?.source).toBe('madi-parser')
    })

    it('should skip rows with missing date', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Дата</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td></td>
                <td>10:00</td>
                <td>Экзамен без даты</td>
                <td>101</td>
                <td>Группа 1</td>
              </tr>
              <tr>
                <td>15.06.2026</td>
                <td>12:00</td>
                <td>Нормальный экзамен</td>
                <td>102</td>
                <td>Группа 2</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      expect(result?.exams).toHaveLength(1)
      expect(result?.exams[0]?.subject).toBe('Нормальный экзамен')
    })

    it('should skip rows with missing subject', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Дата</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>15.06.2026</td>
                <td>9:00</td>
                <td></td>
                <td>101</td>
                <td>Группа 1</td>
              </tr>
              <tr>
                <td>18.06.2026</td>
                <td>10:00</td>
                <td>Нормальный экзамен</td>
                <td>102</td>
                <td>Группа 2</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      expect(result?.exams).toHaveLength(1)
      expect(result?.exams[0]?.subject).toBe('Нормальный экзамен')
    })
  })

  describe('Handling incorrect HTML', () => {
    it('should return null when table is not found', () => {
      const html = `
        <html>
          <body>
            <p>Нет таблицы экзаменов</p>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      expect(result).toBeNull()
    })

    it('should return null for completely invalid HTML', () => {
      const html = 'This is not HTML at all!'

      const result = parseExamPage(html, professorName)

      expect(result).toBeNull()
    })

    it('should handle malformed table gracefully', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <td>Incomplete row
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      // Should return empty schedule, not crash
      expect(result).not.toBeNull()
      expect(result?.exams).toEqual([])
    })

    it('should handle HTML with special characters', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Дата</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>15.06.2026</td>
                <td>10:00</td>
                <td>Теория автоматического управления — основы (экзамен)</td>
                <td>301, Корпус №2</td>
                <td>АСУ-41</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      expect(result?.exams).toHaveLength(1)
      expect(result?.exams[0]?.subject).toContain('—')
      expect(result?.exams[0]?.building).toContain('№')
    })

    it('should continue parsing after encountering a bad row', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Дата</th><th>Время</th><th>Предмет</th><th>Аудитория</th><th>Группа</th></tr>
              <tr>
                <td>10.06.2026</td>
                <td>9:00</td>
                <td>Хороший экзамен 1</td>
                <td>101</td>
                <td>Группа 1</td>
              </tr>
              <tr>
                <td colspan="5">Плохая строка</td>
              </tr>
              <tr>
                <td>15.06.2026</td>
                <td>12:00</td>
                <td>Хороший экзамен 2</td>
                <td>102</td>
                <td>Группа 2</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseExamPage(html, professorName)

      // Should parse the good rows and skip the bad one
      expect(result?.exams.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Exam type inference', () => {
    it('should infer "test" for subjects with "зачёт"', () => {
      expect(inferExamType('Математика (зачёт)')).toBe('test')
      expect(inferExamType('Физика ЗАЧЁТ')).toBe('test')
    })

    it('should infer "test" for subjects with "зачет"', () => {
      expect(inferExamType('Программирование (зачет)')).toBe('test')
      expect(inferExamType('Химия ЗАЧЕТ')).toBe('test')
    })

    it('should infer "exam" for subjects with "экзамен"', () => {
      expect(inferExamType('Физика (экзамен)')).toBe('exam')
      expect(inferExamType('Математика ЭКЗАМЕН')).toBe('exam')
    })

    it('should default to "exam" for unknown types', () => {
      expect(inferExamType('Математика')).toBe('exam')
      expect(inferExamType('Неизвестный тип')).toBe('exam')
    })

    it('should be case-insensitive', () => {
      expect(inferExamType('ЗАЧЁТ')).toBe('test')
      expect(inferExamType('ЗаЧеТ')).toBe('test')
      expect(inferExamType('ЭкЗаМеН')).toBe('exam')
    })
  })
})


// ============================================================================
// Distance Learning Parser Unit Tests
// ============================================================================

describe('Distance Learning Parser Unit Tests', () => {
  const professorName = 'Остроух А.В.'

  describe('Parsing correct distance learning tables', () => {
    it('should parse a valid distance learning table with all fields', () => {
      const html = `
        <html>
          <body>
            <p>Сессия: 01.02.2026 - 28.02.2026</p>
            <table border="1">
              <tr>
                <th>Дата</th>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
                <th>Группа</th>
              </tr>
              <tr>
                <td>05.02.2026</td>
                <td>9:00-10:30</td>
                <td>Автоматизированные системы управления (лекция)</td>
                <td>301, Главный корпус</td>
                <td>АСУ-41з</td>
              </tr>
              <tr>
                <td>10.02.2026</td>
                <td>14:00-15:30</td>
                <td>Робототехника (практика)</td>
                <td>405, Лабораторный корпус</td>
                <td>АСУ-31з</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result).not.toBeNull()
      expect(result?.professorName).toBe(professorName)
      expect(result?.date).toBe('2026-02-01')
      expect(result?.dayOfWeek).toBe('Сессия: 01.02.2026 - 28.02.2026')
      expect(result?.lessons).toHaveLength(2)
      expect(result?.source).toBe('madi-parser')

      // Check first lesson
      expect(result?.lessons[0]).toEqual({
        time: '9:00-10:30',
        subject: 'Автоматизированные системы управления (лекция)',
        type: 'lecture',
        room: '301',
        building: 'Главный корпус',
        group: 'АСУ-41з',
        isDistanceLearning: true
      })

      // Check second lesson
      expect(result?.lessons[1]).toEqual({
        time: '14:00-15:30',
        subject: 'Робототехника (практика)',
        type: 'practice',
        room: '405',
        building: 'Лабораторный корпус',
        group: 'АСУ-31з',
        isDistanceLearning: true
      })
    })

    it('should parse distance learning schedule without session dates', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
                <th>Группа</th>
              </tr>
              <tr>
                <td>9:00-10:30</td>
                <td>Математика (лекция)</td>
                <td>210</td>
                <td>АСУ-21з</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result).not.toBeNull()
      expect(result?.dayOfWeek).toBe('Заочная форма')
      expect(result?.lessons).toHaveLength(1)
      expect(result?.lessons[0]?.isDistanceLearning).toBe(true)
    })

    it('should set isDistanceLearning flag for all lessons', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Время</th><th>Предмет</th><th>Аудитория</th></tr>
              <tr>
                <td>9:00-10:30</td>
                <td>Предмет 1</td>
                <td>101</td>
              </tr>
              <tr>
                <td>10:45-12:15</td>
                <td>Предмет 2</td>
                <td>102</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result?.lessons).toHaveLength(2)
      expect(result?.lessons[0]?.isDistanceLearning).toBe(true)
      expect(result?.lessons[1]?.isDistanceLearning).toBe(true)
    })

    it('should extract session dates from page text', () => {
      const html = `
        <html>
          <body>
            <h2>Расписание заочной формы обучения</h2>
            <p>Зимняя сессия: 15.01.2026 - 31.01.2026</p>
            <table border="1">
              <tr><th>Время</th><th>Предмет</th><th>Аудитория</th></tr>
              <tr>
                <td>9:00-10:30</td>
                <td>Физика</td>
                <td>301</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result?.date).toBe('2026-01-15')
      expect(result?.dayOfWeek).toBe('Сессия: 15.01.2026 - 31.01.2026')
    })

    it('should parse table with date column', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <th>Дата</th>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
                <th>Группа</th>
              </tr>
              <tr>
                <td>20.02.2026</td>
                <td>14:00-15:30</td>
                <td>Программирование (лаб.)</td>
                <td>505, Корпус 3</td>
                <td>АСУ-11з</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result?.lessons).toHaveLength(1)
      expect(result?.lessons[0]?.type).toBe('lab')
      expect(result?.lessons[0]?.isDistanceLearning).toBe(true)
    })

    it('should handle missing optional fields', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Время</th><th>Предмет</th><th>Аудитория</th></tr>
              <tr>
                <td>12:00-13:30</td>
                <td>Химия</td>
                <td>Online</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result?.lessons).toHaveLength(1)
      expect(result?.lessons[0]?.building).toBeUndefined()
      expect(result?.lessons[0]?.group).toBeUndefined()
      expect(result?.lessons[0]?.isDistanceLearning).toBe(true)
    })
  })

  describe('Handling empty distance learning schedules', () => {
    it('should return empty lessons array for empty schedule', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result).not.toBeNull()
      expect(result?.professorName).toBe(professorName)
      expect(result?.lessons).toEqual([])
      expect(result?.source).toBe('madi-parser')
    })

    it('should skip rows with missing time', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Время</th><th>Предмет</th><th>Аудитория</th></tr>
              <tr>
                <td></td>
                <td>Предмет без времени</td>
                <td>101</td>
              </tr>
              <tr>
                <td>10:00-11:30</td>
                <td>Нормальный предмет</td>
                <td>102</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result?.lessons).toHaveLength(1)
      expect(result?.lessons[0]?.subject).toBe('Нормальный предмет')
    })

    it('should skip rows with missing subject', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Время</th><th>Предмет</th><th>Аудитория</th></tr>
              <tr>
                <td>9:00-10:30</td>
                <td></td>
                <td>101</td>
              </tr>
              <tr>
                <td>10:45-12:15</td>
                <td>Нормальный предмет</td>
                <td>102</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result?.lessons).toHaveLength(1)
      expect(result?.lessons[0]?.subject).toBe('Нормальный предмет')
    })
  })

  describe('Handling incorrect HTML', () => {
    it('should return null when table is not found', () => {
      const html = `
        <html>
          <body>
            <p>Нет таблицы расписания</p>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result).toBeNull()
    })

    it('should return null for completely invalid HTML', () => {
      const html = 'This is not HTML at all!'

      const result = parseDistanceLearningPage(html, professorName)

      expect(result).toBeNull()
    })

    it('should handle malformed table gracefully', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <td>Incomplete row
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      // Should return empty schedule, not crash
      expect(result).not.toBeNull()
      expect(result?.lessons).toEqual([])
    })

    it('should continue parsing after encountering a bad row', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Время</th><th>Предмет</th><th>Аудитория</th></tr>
              <tr>
                <td>9:00-10:30</td>
                <td>Хороший предмет 1</td>
                <td>101</td>
              </tr>
              <tr>
                <td colspan="3">Плохая строка</td>
              </tr>
              <tr>
                <td>12:00-13:30</td>
                <td>Хороший предмет 2</td>
                <td>102</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      // Should parse the good rows and skip the bad one
      expect(result?.lessons.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Session date parsing', () => {
    it('should parse session dates in various formats', () => {
      const testCases = [
        {
          html: '<p>Сессия: 01.02.2026 - 28.02.2026</p><table border="1"><tr><th>Время</th><th>Предмет</th><th>Аудитория</th></tr></table>',
          expectedDate: '2026-02-01',
          expectedDayOfWeek: 'Сессия: 01.02.2026 - 28.02.2026'
        },
        {
          html: '<p>Зимняя сессия: 15.01.2026 – 31.01.2026</p><table border="1"><tr><th>Время</th><th>Предмет</th><th>Аудитория</th></tr></table>',
          expectedDate: '2026-01-15',
          expectedDayOfWeek: 'Сессия: 15.01.2026 – 31.01.2026'
        },
        {
          html: '<p>Летняя СЕССИЯ: 1.06.2026 — 30.06.2026</p><table border="1"><tr><th>Время</th><th>Предмет</th><th>Аудитория</th></tr></table>',
          expectedDate: '2026-06-01',
          expectedDayOfWeek: 'Сессия: 1.06.2026 — 30.06.2026'
        }
      ]


      testCases.forEach(({ html, expectedDate, expectedDayOfWeek }) => {
        const result = parseDistanceLearningPage(html, professorName)
        expect(result?.date).toBe(expectedDate)
        expect(result?.dayOfWeek).toBe(expectedDayOfWeek)
      })
    })

    it('should use current date when no session dates found', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr><th>Время</th><th>Предмет</th><th>Аудитория</th></tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      // Should use current date
      expect(result?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(result?.dayOfWeek).toBe('Заочная форма')
    })
  })

  describe('Different table formats', () => {
    it('should handle 5-column format (Date, Time, Subject, Room, Group)', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <th>Дата</th>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
                <th>Группа</th>
              </tr>
              <tr>
                <td>10.02.2026</td>
                <td>9:00-10:30</td>
                <td>Математика</td>
                <td>301</td>
                <td>АСУ-41з</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result?.lessons).toHaveLength(1)
      expect(result?.lessons[0]?.group).toBe('АСУ-41з')
    })

    it('should handle 4-column format (Date, Time, Subject, Room)', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <th>Дата</th>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
              </tr>
              <tr>
                <td>10.02.2026</td>
                <td>9:00-10:30</td>
                <td>Физика</td>
                <td>302</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result?.lessons).toHaveLength(1)
      expect(result?.lessons[0]?.group).toBeUndefined()
    })

    it('should handle 3-column format (Time, Subject, Room)', () => {
      const html = `
        <html>
          <body>
            <table border="1">
              <tr>
                <th>Время</th>
                <th>Предмет</th>
                <th>Аудитория</th>
              </tr>
              <tr>
                <td>9:00-10:30</td>
                <td>Химия</td>
                <td>303</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const result = parseDistanceLearningPage(html, professorName)

      expect(result?.lessons).toHaveLength(1)
      expect(result?.lessons[0]?.time).toBe('9:00-10:30')
    })
  })
})


// ============================================================================
// Professor Search Unit Tests
// ============================================================================

describe('Professor Search Unit Tests', () => {
  describe('Searching for professors', () => {
    it('should find professor "Остроух" in select dropdown', () => {
      const html = `
        <html>
          <body>
            <select name="prep" id="prep">
              <option value="">Выберите преподавателя</option>
              <option value="1">Остроух А.В.</option>
              <option value="2">Иванов И.И.</option>
              <option value="3">Петров П.П.</option>
            </select>
          </body>
        </html>
      `

      const results = searchProfessorInHTML(html, 'Остроух')

      expect(results).toHaveLength(1)
      expect(results[0]).toBe('Остроух А.В.')
    })

    it('should find multiple professors matching search query', () => {
      const html = `
        <html>
          <body>
            <select name="prep">
              <option value="">Выберите преподавателя</option>
              <option value="1">Иванов И.И.</option>
              <option value="2">Иванова М.С.</option>
              <option value="3">Петров П.П.</option>
              <option value="4">Иванов С.А.</option>
            </select>
          </body>
        </html>
      `

      const results = searchProfessorInHTML(html, 'Иванов')

      expect(results).toHaveLength(3)
      expect(results).toContain('Иванов И.И.')
      expect(results).toContain('Иванова М.С.')
      expect(results).toContain('Иванов С.А.')
    })

    it('should return empty array when no professors match', () => {
      const html = `
        <html>
          <body>
            <select name="prep">
              <option value="">Выберите преподавателя</option>
              <option value="1">Иванов И.И.</option>
              <option value="2">Петров П.П.</option>
            </select>
          </body>
        </html>
      `

      const results = searchProfessorInHTML(html, 'Сидоров')

      expect(results).toHaveLength(0)
    })

    it('should be case-insensitive', () => {
      const html = `
        <html>
          <body>
            <select name="prep">
              <option value="">Выберите преподавателя</option>
              <option value="1">Остроух А.В.</option>
            </select>
          </body>
        </html>
      `

      const results1 = searchProfessorInHTML(html, 'остроух')
      const results2 = searchProfessorInHTML(html, 'ОСТРОУХ')
      const results3 = searchProfessorInHTML(html, 'ОсТрОуХ')

      expect(results1).toHaveLength(1)
      expect(results2).toHaveLength(1)
      expect(results3).toHaveLength(1)
    })

    it('should handle partial name matches', () => {
      const html = `
        <html>
          <body>
            <select name="prep">
              <option value="">Выберите преподавателя</option>
              <option value="1">Остроух Андрей Владимирович</option>
            </select>
          </body>
        </html>
      `

      const results1 = searchProfessorInHTML(html, 'Остроух')
      const results2 = searchProfessorInHTML(html, 'Андрей')
      const results3 = searchProfessorInHTML(html, 'Владимирович')

      expect(results1).toHaveLength(1)
      expect(results2).toHaveLength(1)
      expect(results3).toHaveLength(1)
    })

    it('should skip empty options and "Выберите" options', () => {
      const html = `
        <html>
          <body>
            <select name="prep">
              <option value="">Выберите преподавателя</option>
              <option value=""></option>
              <option value="1">Остроух А.В.</option>
            </select>
          </body>
        </html>
      `

      const results = searchProfessorInHTML(html, 'Остроух')

      expect(results).toHaveLength(1)
      expect(results[0]).toBe('Остроух А.В.')
    })

    it('should return sorted results', () => {
      const html = `
        <html>
          <body>
            <select name="prep">
              <option value="">Выберите преподавателя</option>
              <option value="1">Яковлев Я.Я.</option>
              <option value="2">Алексеев А.А.</option>
              <option value="3">Борисов Б.Б.</option>
            </select>
          </body>
        </html>
      `

      const results = searchProfessorInHTML(html, 'ев')

      // Should be sorted alphabetically
      // Only "Яковлев" and "Алексеев" contain "ев"
      expect(results).toHaveLength(2)
      expect(results[0]).toBe('Алексеев А.А.')
      expect(results[1]).toBe('Яковлев Я.Я.')
    })
  })

  describe('Alternative search methods', () => {
    it('should search in tables when select is not found', () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <td>Остроух А.В.</td>
                <td>Кафедра АСУ</td>
              </tr>
              <tr>
                <td>Иванов И.И.</td>
                <td>Кафедра ИТ</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const results = searchProfessorInHTML(html, 'Остроух')

      expect(results).toHaveLength(1)
      expect(results[0]).toBe('Остроух А.В.')
    })

    it('should search in links when select is not found', () => {
      const html = `
        <html>
          <body>
            <ul>
              <li><a href="/prof/1">Остроух А.В.</a></li>
              <li><a href="/prof/2">Иванов И.И.</a></li>
            </ul>
          </body>
        </html>
      `

      const results = searchProfessorInHTML(html, 'Остроух')

      expect(results).toHaveLength(1)
      expect(results[0]).toBe('Остроух А.В.')
    })

    it('should filter out non-professor names in alternative search', () => {
      const html = `
        <html>
          <body>
            <table>
              <tr>
                <td>Остроух А.В.</td>
                <td>Кафедра автоматизированных систем управления</td>
              </tr>
              <tr>
                <td>Расписание занятий</td>
                <td>Понедельник</td>
              </tr>
            </table>
          </body>
        </html>
      `

      const results = searchProfessorInHTML(html, 'Остроух')

      expect(results).toHaveLength(1)
      expect(results[0]).toBe('Остроух А.В.')
      expect(results).not.toContain('Кафедра автоматизированных систем управления')
      expect(results).not.toContain('Расписание занятий')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty HTML', () => {
      const html = '<html><body></body></html>'

      const results = searchProfessorInHTML(html, 'Остроух')

      expect(results).toHaveLength(0)
    })

    it('should handle invalid HTML', () => {
      const html = 'This is not HTML!'

      const results = searchProfessorInHTML(html, 'Остроух')

      expect(results).toHaveLength(0)
    })

    it('should handle HTML with special characters', () => {
      const html = `
        <html>
          <body>
            <select name="prep">
              <option value="">Выберите преподавателя</option>
              <option value="1">Остроух А.В. — профессор</option>
            </select>
          </body>
        </html>
      `

      const results = searchProfessorInHTML(html, 'Остроух')

      expect(results).toHaveLength(1)
      expect(results[0]).toContain('Остроух')
    })

    it('should handle empty search query', () => {
      const html = `
        <html>
          <body>
            <select name="prep">
              <option value="1">Остроух А.В.</option>
            </select>
          </body>
        </html>
      `

      const results = searchProfessorInHTML(html, '')

      // Empty query should match nothing (after trim)
      expect(results).toHaveLength(0)
    })

    it('should remove duplicate matches', () => {
      const html = `
        <html>
          <body>
            <select name="prep">
              <option value="1">Остроух А.В.</option>
              <option value="2">Остроух А.В.</option>
            </select>
          </body>
        </html>
      `

      const results = searchProfessorInHTML(html, 'Остроух')

      // Should only return unique names
      expect(results).toHaveLength(1)
      expect(results[0]).toBe('Остроух А.В.')
    })
  })
})
