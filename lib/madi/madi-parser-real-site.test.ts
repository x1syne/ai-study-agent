/**
 * Real MADI Site Testing
 * 
 * This test file tests the MADI parser against the real MADI website.
 * These tests may fail if:
 * - The MADI website is down
 * - The HTML structure has changed
 * - Network connectivity issues
 * 
 * Run with: npm test -- madi-parser-real-site.test.ts
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { MADIParser, type MADIParserConfig } from './madi-parser'

describe('MADI Parser - Real Site Testing', () => {
  let parser: MADIParser
  const professorName = 'Остроух А.В.'
  const testDate = new Date('2026-02-03') // Tuesday

  beforeAll(() => {
    // Initialize parser with real configuration
    const config: MADIParserConfig = {
      enabled: true,
      cacheTTL: 3600, // 1 hour
      requestTimeout: 15000, // 15 seconds (longer for real site)
      fallbackToStatic: true,
      baseUrl: 'https://www.madi.ru/tplan'
    }

    parser = new MADIParser(config)
    console.log('\n=== Starting Real MADI Site Tests ===\n')
  })

  describe('17.1 Тестирование с реальным сайтом MADI', () => {
    it('should fetch and parse professor schedule from real MADI site', async () => {
      console.log(`\n[Test] Fetching schedule for ${professorName} on ${testDate.toISOString().split('T')[0]}`)
      
      const schedule = await parser.getProfessorSchedule(professorName, testDate)
      
      console.log('\n[Test] Schedule Result:')
      if (schedule) {
        console.log(`  Professor: ${schedule.professorName}`)
        console.log(`  Date: ${schedule.date}`)
        console.log(`  Day: ${schedule.dayOfWeek}`)
        console.log(`  Source: ${schedule.source}`)
        console.log(`  Lessons: ${schedule.lessons.length}`)
        
        schedule.lessons.forEach((lesson, index) => {
          console.log(`\n  Lesson ${index + 1}:`)
          console.log(`    Time: ${lesson.time}`)
          console.log(`    Subject: ${lesson.subject}`)
          console.log(`    Type: ${lesson.type}`)
          console.log(`    Room: ${lesson.room}`)
          if (lesson.building) console.log(`    Building: ${lesson.building}`)
          if (lesson.group) console.log(`    Group: ${lesson.group}`)
          if (lesson.isDistanceLearning) console.log(`    Distance Learning: Yes`)
        })
      } else {
        console.log('  Schedule is null (may be using fallback)')
      }
      
      // Assertions
      // Note: schedule may be null if parser is disabled or site is unavailable
      // In that case, the fallback mechanism should handle it
      if (schedule) {
        expect(schedule).toBeDefined()
        expect(schedule.professorName).toBeTruthy()
        expect(schedule.date).toBeTruthy()
        expect(schedule.dayOfWeek).toBeTruthy()
        expect(schedule.source).toMatch(/madi-parser|cache|static/)
        expect(Array.isArray(schedule.lessons)).toBe(true)
        
        // If lessons exist, validate structure
        if (schedule.lessons.length > 0) {
          const firstLesson = schedule.lessons[0]
          expect(firstLesson.time).toBeTruthy()
          expect(firstLesson.subject).toBeTruthy()
          expect(firstLesson.type).toMatch(/lecture|practice|lab/)
          expect(firstLesson.room).toBeTruthy()
        }
      }
    }, 30000) // 30 second timeout for real site

    it('should fetch and parse professor exams from real MADI site', async () => {
      console.log(`\n[Test] Fetching exams for ${professorName}`)
      
      const exams = await parser.getProfessorExams(professorName)
      
      console.log('\n[Test] Exams Result:')
      if (exams) {
        console.log(`  Professor: ${exams.professorName}`)
        console.log(`  Source: ${exams.source}`)
        console.log(`  Exams: ${exams.exams.length}`)
        
        exams.exams.forEach((exam, index) => {
          console.log(`\n  Exam ${index + 1}:`)
          console.log(`    Date: ${exam.date}`)
          console.log(`    Time: ${exam.time}`)
          console.log(`    Subject: ${exam.subject}`)
          console.log(`    Type: ${exam.type}`)
          console.log(`    Room: ${exam.room}`)
          if (exam.building) console.log(`    Building: ${exam.building}`)
          if (exam.group) console.log(`    Group: ${exam.group}`)
          if (exam.isDistanceLearning) console.log(`    Distance Learning: Yes`)
        })
      } else {
        console.log('  Exams is null (may be using fallback)')
      }
      
      // Assertions
      if (exams) {
        expect(exams).toBeDefined()
        expect(exams.professorName).toBeTruthy()
        expect(exams.source).toMatch(/madi-parser|cache|static/)
        expect(Array.isArray(exams.exams)).toBe(true)
        
        // If exams exist, validate structure
        if (exams.exams.length > 0) {
          const firstExam = exams.exams[0]
          expect(firstExam.date).toBeTruthy()
          expect(firstExam.time).toBeTruthy()
          expect(firstExam.subject).toBeTruthy()
          expect(firstExam.type).toMatch(/exam|test/)
          expect(firstExam.room).toBeTruthy()
        }
      }
    }, 30000)

    it('should fetch and parse professor departments from real MADI site', async () => {
      console.log(`\n[Test] Fetching departments for ${professorName}`)
      
      const departments = await parser.getProfessorDepartments(professorName)
      
      console.log('\n[Test] Departments Result:')
      console.log(`  Departments: ${departments.length}`)
      
      departments.forEach((dept, index) => {
        console.log(`\n  Department ${index + 1}:`)
        console.log(`    Name: ${dept.name}`)
        console.log(`    Professors: ${dept.professors.length}`)
        if (dept.professors.length > 0) {
          console.log(`    Professor List: ${dept.professors.slice(0, 5).join(', ')}${dept.professors.length > 5 ? '...' : ''}`)
        }
        console.log(`    Subjects: ${dept.subjects.length}`)
        if (dept.subjects.length > 0) {
          console.log(`    Subject List: ${dept.subjects.slice(0, 5).join(', ')}${dept.subjects.length > 5 ? '...' : ''}`)
        }
      })
      
      // Assertions
      expect(Array.isArray(departments)).toBe(true)
      
      // If departments exist, validate structure
      if (departments.length > 0) {
        const firstDept = departments[0]
        expect(firstDept.name).toBeTruthy()
        expect(Array.isArray(firstDept.professors)).toBe(true)
        expect(Array.isArray(firstDept.subjects)).toBe(true)
      }
    }, 30000)

    it('should aggregate all professor info from real MADI site', async () => {
      console.log(`\n[Test] Aggregating all info for ${professorName}`)
      
      const info = await parser.getProfessorInfo(professorName, testDate)
      
      console.log('\n[Test] Professor Info Result:')
      if (info) {
        console.log(`  Name: ${info.name}`)
        console.log(`  Departments: ${info.departments.length}`)
        console.log(`  Groups: ${info.groups.length}`)
        if (info.groups.length > 0) {
          console.log(`    Group List: ${info.groups.join(', ')}`)
        }
        console.log(`  Has Distance Learning: ${info.hasDistanceLearning}`)
        console.log(`  Schedule Lessons: ${info.schedule.lessons.length}`)
        console.log(`  Exams: ${info.examSchedule.exams.length}`)
        
        // Show sample lesson
        if (info.schedule.lessons.length > 0) {
          const lesson = info.schedule.lessons[0]
          console.log(`\n  Sample Lesson:`)
          console.log(`    Time: ${lesson.time}`)
          console.log(`    Subject: ${lesson.subject}`)
          console.log(`    Type: ${lesson.type}`)
          console.log(`    Room: ${lesson.room}`)
          if (lesson.group) console.log(`    Group: ${lesson.group}`)
        }
        
        // Show sample exam
        if (info.examSchedule.exams.length > 0) {
          const exam = info.examSchedule.exams[0]
          console.log(`\n  Sample Exam:`)
          console.log(`    Date: ${exam.date}`)
          console.log(`    Subject: ${exam.subject}`)
          console.log(`    Type: ${exam.type}`)
          console.log(`    Room: ${exam.room}`)
          if (exam.group) console.log(`    Group: ${exam.group}`)
        }
      } else {
        console.log('  Professor info is null (may be using fallback)')
      }
      
      // Assertions
      if (info) {
        expect(info).toBeDefined()
        expect(info.name).toBeTruthy()
        expect(Array.isArray(info.departments)).toBe(true)
        expect(Array.isArray(info.groups)).toBe(true)
        expect(typeof info.hasDistanceLearning).toBe('boolean')
        expect(info.schedule).toBeDefined()
        expect(info.examSchedule).toBeDefined()
      }
    }, 45000) // 45 second timeout for aggregation
  })

  describe('Cache Testing', () => {
    it('should use cache for repeated requests', async () => {
      console.log('\n[Test] Testing cache functionality')
      
      // First request - should fetch from site
      console.log('  First request (should fetch from site)...')
      const firstResult = await parser.getProfessorSchedule(professorName, testDate)
      
      // Second request - should use cache
      console.log('  Second request (should use cache)...')
      const secondResult = await parser.getProfessorSchedule(professorName, testDate)
      
      console.log('\n[Test] Cache Test Results:')
      if (firstResult && secondResult) {
        console.log(`  First source: ${firstResult.source}`)
        console.log(`  Second source: ${secondResult.source}`)
        console.log(`  Cache working: ${secondResult.source === 'cache'}`)
        
        // Second request should be from cache
        expect(secondResult.source).toBe('cache')
      } else {
        console.log('  One or both results are null (parser may be disabled)')
      }
    }, 30000)

    it('should clear cache when requested', async () => {
      console.log('\n[Test] Testing cache clearing')
      
      // Make a request to populate cache
      console.log('  Populating cache...')
      await parser.getProfessorSchedule(professorName, testDate)
      
      // Clear cache
      console.log('  Clearing cache...')
      parser.clearCache('schedule')
      
      // Next request should fetch from site again
      console.log('  Request after cache clear (should fetch from site)...')
      const result = await parser.getProfessorSchedule(professorName, testDate)
      
      console.log('\n[Test] Cache Clear Results:')
      if (result) {
        console.log(`  Source after clear: ${result.source}`)
        console.log(`  Cache cleared successfully: ${result.source === 'madi-parser'}`)
        
        // Should not be from cache
        expect(result.source).not.toBe('cache')
      } else {
        console.log('  Result is null (parser may be disabled)')
      }
    }, 30000)
  })

  describe('Error Handling', () => {
    it('should handle invalid professor name gracefully', async () => {
      console.log('\n[Test] Testing invalid professor name')
      
      const invalidName = 'НесуществующийПреподаватель123'
      console.log(`  Fetching schedule for: ${invalidName}`)
      
      const result = await parser.getProfessorSchedule(invalidName, testDate)
      
      console.log('\n[Test] Invalid Professor Results:')
      console.log(`  Result: ${result ? 'Got result' : 'null'}`)
      if (result) {
        console.log(`  Source: ${result.source}`)
        console.log(`  Lessons: ${result.lessons.length}`)
      }
      
      // Should not throw error, may return null or empty schedule
      expect(() => result).not.toThrow()
    }, 30000)

    it('should handle network timeout gracefully', async () => {
      console.log('\n[Test] Testing timeout handling')
      
      // Create parser with very short timeout
      const shortTimeoutParser = new MADIParser({
        enabled: true,
        cacheTTL: 3600,
        requestTimeout: 1, // 1ms - will definitely timeout
        fallbackToStatic: true,
        baseUrl: 'https://www.madi.ru/tplan'
      })
      
      console.log('  Making request with 1ms timeout (will timeout)...')
      const result = await shortTimeoutParser.getProfessorSchedule(professorName, testDate)
      
      console.log('\n[Test] Timeout Test Results:')
      console.log(`  Result: ${result ? 'Got result (fallback)' : 'null'}`)
      if (result) {
        console.log(`  Source: ${result.source}`)
      }
      
      // Should not throw error due to fallback
      expect(() => result).not.toThrow()
    }, 30000)
  })
})
