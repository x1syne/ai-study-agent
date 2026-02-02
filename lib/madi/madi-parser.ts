/**
 * MADI Schedule Parser
 * 
 * Комплексный парсер для извлечения всей информации о преподавателях с официального сайта МАДИ.
 * Система предоставляет:
 * - Расписание занятий (очная и заочная формы)
 * - Расписание экзаменов и зачётов
 * - Информация о кафедрах
 * - Расписание групп
 * - Агрегированная информация о преподавателе
 */

import * as cheerio from 'cheerio'
import { monitoring, withMonitoring } from './monitoring'

// ============================================================================
// Configuration Interfaces
// ============================================================================

export interface MADIParserConfig {
  enabled: boolean
  cacheTTL: number // seconds
  requestTimeout: number // milliseconds
  fallbackToStatic: boolean
  baseUrl: string
}

// ============================================================================
// Data Model Interfaces
// ============================================================================

export interface ParsedLesson {
  time: string
  subject: string
  type: 'lecture' | 'practice' | 'lab'
  room: string
  building?: string
  group?: string
  isDistanceLearning?: boolean
}

export interface ParsedExam {
  date: string
  time: string
  subject: string
  type: 'exam' | 'test' // экзамен или зачёт
  room: string
  building?: string
  group?: string
  isDistanceLearning?: boolean
}

export interface ParsedDepartment {
  name: string
  professors: string[]
  subjects: string[]
}

export interface ParsedSchedule {
  professorName: string
  date: string
  dayOfWeek: string
  lessons: ParsedLesson[]
  source: 'madi-parser' | 'static' | 'cache'
  cachedAt?: Date
}

export interface ParsedExamSchedule {
  professorName: string
  exams: ParsedExam[]
  source: 'madi-parser' | 'static' | 'cache'
  cachedAt?: Date
}

export interface ProfessorInfo {
  name: string
  departments: ParsedDepartment[]
  schedule: ParsedSchedule
  examSchedule: ParsedExamSchedule
  groups: string[] // extracted from schedule
  hasDistanceLearning: boolean
}

// ============================================================================
// Cache Implementation
// ============================================================================

interface CacheEntry<T> {
  data: T
  timestamp: Date
  expiresAt: Date
  dataType: 'schedule' | 'exams' | 'department' | 'group'
}

class ScheduleCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private maxEntries = 100 // LRU limit

  set<T>(key: string, data: T, ttl: number, dataType: 'schedule' | 'exams' | 'department' | 'group'): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.findOldestEntry()
      console.log(`[MADI Cache] Cache full (${this.maxEntries} entries), evicting oldest entry: ${oldestKey}`)
      this.cache.delete(oldestKey)
    }

    const now = new Date()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: new Date(now.getTime() + ttl * 1000),
      dataType
    })
    
    console.log(`[MADI Cache] Cached ${dataType} with key: ${key} (TTL: ${ttl}s, expires: ${new Date(now.getTime() + ttl * 1000).toISOString()})`)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      console.log(`[MADI Cache] Cache miss for key: ${key}`)
      monitoring.recordCacheMiss()
      return null
    }

    if (new Date() > entry.expiresAt) {
      const expiredAge = Math.floor((Date.now() - entry.expiresAt.getTime()) / 1000)
      console.log(`[MADI Cache] Cache expired for key: ${key} (expired ${expiredAge}s ago)`)
      this.cache.delete(key)
      monitoring.recordCacheMiss()
      return null
    }

    const age = Math.floor((Date.now() - entry.timestamp.getTime()) / 1000)
    console.log(`[MADI Cache] Cache hit for key: ${key} (age: ${age}s, type: ${entry.dataType})`)
    monitoring.recordCacheHit()
    return entry.data as T
  }

  clear(dataType?: 'schedule' | 'exams' | 'department' | 'group' | 'all'): void {
    if (!dataType || dataType === 'all') {
      const count = this.cache.size
      this.cache.clear()
      console.log(`[MADI Cache] Cleared all cache entries (${count} entries removed)`)
      return
    }

    const entries = Array.from(this.cache.entries())
    let removedCount = 0
    for (const [key, entry] of entries) {
      if (entry.dataType === dataType) {
        this.cache.delete(key)
        removedCount++
      }
    }
    console.log(`[MADI Cache] Cleared ${dataType} cache entries (${removedCount} entries removed)`)
  }

  private findOldestEntry(): string {
    let oldestKey = ''
    let oldestTime: Date | null = null

    const entries = Array.from(this.cache.entries())
    for (const [key, entry] of entries) {
      if (oldestTime === null || entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    return oldestKey
  }
}

// ============================================================================
// HTML Selectors
// ============================================================================

const SELECTORS = {
  // Schedule (task=8)
  scheduleTable: 'table.table-schedule, table[border="1"]',
  scheduleRow: 'tr',
  dayOfWeek: 'td:nth-child(1)',
  lessonTime: 'td:nth-child(2)',
  lessonSubject: 'td:nth-child(3)',
  lessonRoom: 'td:nth-child(4)',
  lessonGroup: 'td:nth-child(5)',

  // Exams (task=4)
  examTable: 'table.table-exams, table[border="1"]',
  examDate: 'td:nth-child(1)',
  examTime: 'td:nth-child(2)',
  examSubject: 'td:nth-child(3)',
  examRoom: 'td:nth-child(4)',
  examGroup: 'td:nth-child(5)',

  // Department (task=11)
  departmentTable: 'table.table-department',
  departmentName: 'h2, h3',
  professorList: 'td.professor-name',

  // Professor search
  professorSelect: 'select[name="prep"], select#prep',
  professorOption: 'option',
}

// ============================================================================
// Main Parser Class
// ============================================================================

export class MADIParser {
  private config: MADIParserConfig
  private cache: ScheduleCache

  constructor(config: MADIParserConfig) {
    this.config = config
    this.cache = new ScheduleCache()
  }

  /**
   * Получить расписание занятий преподавателя
   */
  async getProfessorSchedule(
    professorName: string,
    date: Date
  ): Promise<ParsedSchedule | null> {
    if (!this.config.enabled) {
      console.log('[MADI Parser] Parser is disabled, returning null')
      return null
    }

    const dateStr = date.toISOString().split('T')[0]
    console.log(`[MADI Parser] Fetching schedule for ${professorName} on ${dateStr}`)

    try {
      // Проверяем кэш
      const cacheKey = `schedule:${professorName}:${dateStr}`
      const cached = this.cache.get<ParsedSchedule>(cacheKey)
      
      if (cached) {
        const cacheAge = Math.floor((Date.now() - (cached.cachedAt?.getTime() || 0)) / 60000)
        console.log(`[MADI Parser] Using cached schedule for ${professorName} (age: ${cacheAge} minutes)`)
        return {
          ...cached,
          source: 'cache',
          cachedAt: new Date()
        }
      }
      
      // Формируем URL для запроса расписания (task=8)
      const url = `${this.config.baseUrl}/r/?task=8&prep=${encodeURIComponent(professorName)}`
      console.log(`[MADI Parser] Fetching schedule from MADI site: ${url}`)
      
      // Загружаем HTML страницу
      const html = await fetchMADIPage(url, this.config.requestTimeout)
      
      // Парсим HTML
      const schedule = parseSchedulePage(html, professorName, date)
      
      if (schedule) {
        // Сохраняем в кэш
        this.cache.set(cacheKey, schedule, this.config.cacheTTL, 'schedule')
        console.log(`[MADI Parser] Successfully parsed schedule for ${professorName}: ${schedule.lessons.length} lessons`)
        console.log(`[MADI Parser] Cached schedule for ${professorName} (TTL: ${this.config.cacheTTL}s)`)
      } else {
        console.warn(`[MADI Parser] Failed to parse schedule for ${professorName} - parser returned null`)
      }
      
      return schedule
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error(`[MADI Parser] Error fetching schedule for ${professorName}:`, errorMessage)
      if (errorStack) {
        console.error(`[MADI Parser] Stack trace:`, errorStack)
      }
      
      // Записываем ошибку в мониторинг
      if (error instanceof Error) {
        monitoring.recordFailure(error, 'parsing')
      }
      
      // Пытаемся вернуть устаревший кэш
      const cacheKey = `schedule:${professorName}:${dateStr}`
      const staleCache = this.cache.get<ParsedSchedule>(cacheKey)
      
      if (staleCache) {
        console.log(`[MADI Parser] Returning stale cache for ${professorName} after error`)
        monitoring.recordFallback(false)
        return {
          ...staleCache,
          source: 'cache',
          cachedAt: new Date()
        }
      }
      
      // Если кэша нет и fallback включен, вернем null (вызывающий код использует static data)
      if (this.config.fallbackToStatic) {
        console.log(`[MADI Parser] Falling back to static schedule data for ${professorName}`)
        monitoring.recordFallback(true)
        return null
      }
      
      throw error
    }
  }

  /**
   * Получить расписание экзаменов преподавателя
   */
  async getProfessorExams(
    professorName: string
  ): Promise<ParsedExamSchedule | null> {
    if (!this.config.enabled) {
      console.log('[MADI Parser] Parser is disabled, returning null')
      return null
    }

    console.log(`[MADI Parser] Fetching exams for ${professorName}`)

    try {
      // Проверяем кэш
      const cacheKey = `exams:${professorName}`
      const cached = this.cache.get<ParsedExamSchedule>(cacheKey)
      
      if (cached) {
        const cacheAge = Math.floor((Date.now() - (cached.cachedAt?.getTime() || 0)) / 60000)
        console.log(`[MADI Parser] Using cached exams for ${professorName} (age: ${cacheAge} minutes)`)
        return {
          ...cached,
          source: 'cache',
          cachedAt: new Date()
        }
      }
      
      // Формируем URL для запроса экзаменов (task=4)
      const url = `${this.config.baseUrl}/r/?task=4&prep=${encodeURIComponent(professorName)}`
      console.log(`[MADI Parser] Fetching exams from MADI site: ${url}`)
      
      // Загружаем HTML страницу
      const html = await fetchMADIPage(url, this.config.requestTimeout)
      
      // Парсим HTML
      const examSchedule = parseExamPage(html, professorName)
      
      if (examSchedule) {
        // Сохраняем в кэш
        this.cache.set(cacheKey, examSchedule, this.config.cacheTTL, 'exams')
        console.log(`[MADI Parser] Successfully parsed exams for ${professorName}: ${examSchedule.exams.length} exams`)
        console.log(`[MADI Parser] Cached exams for ${professorName} (TTL: ${this.config.cacheTTL}s)`)
      } else {
        console.warn(`[MADI Parser] Failed to parse exams for ${professorName} - parser returned null`)
      }
      
      return examSchedule
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error(`[MADI Parser] Error fetching exams for ${professorName}:`, errorMessage)
      if (errorStack) {
        console.error(`[MADI Parser] Stack trace:`, errorStack)
      }
      
      // Пытаемся вернуть устаревший кэш
      const cacheKey = `exams:${professorName}`
      const staleCache = this.cache.get<ParsedExamSchedule>(cacheKey)
      
      if (staleCache) {
        console.log(`[MADI Parser] Returning stale cache for ${professorName} after error`)
        return {
          ...staleCache,
          source: 'cache',
          cachedAt: new Date()
        }
      }
      
      // Если кэша нет и fallback включен, вернем null (вызывающий код использует static data)
      if (this.config.fallbackToStatic) {
        console.log(`[MADI Parser] Falling back to static exam data for ${professorName}`)
        return null
      }
      
      throw error
    }
  }

  /**
   * Получить информацию о кафедрах преподавателя
   */
  async getProfessorDepartments(
    professorName: string
  ): Promise<ParsedDepartment[]> {
    if (!this.config.enabled) {
      console.log('[MADI Parser] Parser is disabled, returning empty array')
      return []
    }

    console.log(`[MADI Parser] Fetching departments for ${professorName}`)

    try {
      // Проверяем кэш
      const cacheKey = `department:${professorName}`
      const cached = this.cache.get<ParsedDepartment[]>(cacheKey)
      
      if (cached) {
        const cacheAge = Math.floor((Date.now() - Date.now()) / 60000) // Note: This will always be 0, but keeping for consistency
        console.log(`[MADI Parser] Using cached departments for ${professorName} (${cached.length} departments)`)
        return cached
      }
      
      // Формируем URL для запроса информации о кафедре (task=11)
      const url = `${this.config.baseUrl}/r/?task=11&prep=${encodeURIComponent(professorName)}`
      console.log(`[MADI Parser] Fetching departments from MADI site: ${url}`)
      
      // Загружаем HTML страницу
      const html = await fetchMADIPage(url, this.config.requestTimeout)
      
      // Парсим HTML
      const departments = parseDepartmentPage(html, professorName)
      
      if (departments && departments.length > 0) {
        // Сохраняем в кэш
        this.cache.set(cacheKey, departments, this.config.cacheTTL, 'department')
        console.log(`[MADI Parser] Successfully parsed ${departments.length} departments for ${professorName}`)
        console.log(`[MADI Parser] Cached ${departments.length} departments for ${professorName} (TTL: ${this.config.cacheTTL}s)`)
      } else {
        console.warn(`[MADI Parser] No departments found for ${professorName}`)
      }
      
      return departments || []
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error(`[MADI Parser] Error fetching departments for ${professorName}:`, errorMessage)
      if (errorStack) {
        console.error(`[MADI Parser] Stack trace:`, errorStack)
      }
      
      // Пытаемся вернуть устаревший кэш
      const cacheKey = `department:${professorName}`
      const staleCache = this.cache.get<ParsedDepartment[]>(cacheKey)
      
      if (staleCache) {
        console.log(`[MADI Parser] Returning stale cache for ${professorName} (${staleCache.length} departments) after error`)
        return staleCache
      }
      
      // Если кэша нет и fallback включен, вернем пустой массив
      if (this.config.fallbackToStatic) {
        console.log(`[MADI Parser] Falling back to empty departments list for ${professorName}`)
        return []
      }
      
      throw error
    }
  }

  /**
   * Получить расписание группы
   */
  async getGroupSchedule(
    groupName: string,
    date: Date,
    professorFilter?: string
  ): Promise<ParsedSchedule | null> {
    if (!this.config.enabled) {
      console.log('[MADI Parser] Parser is disabled, returning null')
      return null
    }

    const dateStr = date.toISOString().split('T')[0]
    const filterInfo = professorFilter ? ` (filter: ${professorFilter})` : ''
    console.log(`[MADI Parser] Fetching group schedule for ${groupName} on ${dateStr}${filterInfo}`)

    try {
      // Проверяем кэш
      const cacheKey = `group:${groupName}:${dateStr}${professorFilter ? `:${professorFilter}` : ''}`
      const cached = this.cache.get<ParsedSchedule>(cacheKey)
      
      if (cached) {
        const cacheAge = Math.floor((Date.now() - (cached.cachedAt?.getTime() || 0)) / 60000)
        console.log(`[MADI Parser] Using cached group schedule for ${groupName} (age: ${cacheAge} minutes)`)
        return {
          ...cached,
          source: 'cache',
          cachedAt: new Date()
        }
      }
      
      // Формируем URL для запроса расписания группы (task=7)
      const url = `${this.config.baseUrl}/r/?task=7&group=${encodeURIComponent(groupName)}`
      console.log(`[MADI Parser] Fetching group schedule from MADI site: ${url}`)
      
      // Загружаем HTML страницу
      const html = await fetchMADIPage(url, this.config.requestTimeout)
      
      // Парсим HTML
      const schedule = parseGroupPage(html, groupName, date, professorFilter)
      
      if (schedule) {
        // Сохраняем в кэш
        this.cache.set(cacheKey, schedule, this.config.cacheTTL, 'group')
        console.log(`[MADI Parser] Successfully parsed group schedule for ${groupName}: ${schedule.lessons.length} lessons${filterInfo}`)
        console.log(`[MADI Parser] Cached group schedule for ${groupName} (TTL: ${this.config.cacheTTL}s)`)
      } else {
        console.warn(`[MADI Parser] Failed to parse group schedule for ${groupName} - parser returned null`)
      }
      
      return schedule
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error(`[MADI Parser] Error fetching group schedule for ${groupName}:`, errorMessage)
      if (errorStack) {
        console.error(`[MADI Parser] Stack trace:`, errorStack)
      }
      
      // Пытаемся вернуть устаревший кэш
      const cacheKey = `group:${groupName}:${dateStr}${professorFilter ? `:${professorFilter}` : ''}`
      const staleCache = this.cache.get<ParsedSchedule>(cacheKey)
      
      if (staleCache) {
        console.log(`[MADI Parser] Returning stale cache for ${groupName} after error`)
        return {
          ...staleCache,
          source: 'cache',
          cachedAt: new Date()
        }
      }
      
      // Если кэша нет и fallback включен, вернем null (вызывающий код использует static data)
      if (this.config.fallbackToStatic) {
        console.log(`[MADI Parser] Falling back to static group schedule data for ${groupName}`)
        return null
      }
      
      throw error
    }
  }

  /**
   * Получить расписание заочной формы обучения
   */
  async getDistanceLearningSchedule(
    professorName: string
  ): Promise<ParsedSchedule | null> {
    if (!this.config.enabled) {
      console.log('[MADI Parser] Parser is disabled, returning null')
      return null
    }

    console.log(`[MADI Parser] Fetching distance learning schedule for ${professorName}`)

    try {
      // Проверяем кэш
      const cacheKey = `distance:${professorName}`
      const cached = this.cache.get<ParsedSchedule>(cacheKey)
      
      if (cached) {
        const cacheAge = Math.floor((Date.now() - (cached.cachedAt?.getTime() || 0)) / 60000)
        console.log(`[MADI Parser] Using cached distance learning schedule for ${professorName} (age: ${cacheAge} minutes)`)
        return {
          ...cached,
          source: 'cache',
          cachedAt: new Date()
        }
      }
      
      // Формируем URL для запроса расписания заочной формы (task=15)
      const url = `${this.config.baseUrl}/r/?task=15&prep=${encodeURIComponent(professorName)}`
      console.log(`[MADI Parser] Fetching distance learning schedule from MADI site: ${url}`)
      
      // Загружаем HTML страницу
      const html = await fetchMADIPage(url, this.config.requestTimeout)
      
      // Парсим HTML
      const schedule = parseDistanceLearningPage(html, professorName)
      
      if (schedule) {
        // Сохраняем в кэш
        this.cache.set(cacheKey, schedule, this.config.cacheTTL, 'schedule')
        console.log(`[MADI Parser] Successfully parsed distance learning schedule for ${professorName}: ${schedule.lessons.length} lessons`)
        console.log(`[MADI Parser] Cached distance learning schedule for ${professorName} (TTL: ${this.config.cacheTTL}s)`)
      } else {
        console.warn(`[MADI Parser] Failed to parse distance learning schedule for ${professorName} - parser returned null`)
      }
      
      return schedule
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error(`[MADI Parser] Error fetching distance learning schedule for ${professorName}:`, errorMessage)
      if (errorStack) {
        console.error(`[MADI Parser] Stack trace:`, errorStack)
      }
      
      // Пытаемся вернуть устаревший кэш
      const cacheKey = `distance:${professorName}`
      const staleCache = this.cache.get<ParsedSchedule>(cacheKey)
      
      if (staleCache) {
        console.log(`[MADI Parser] Returning stale cache for ${professorName} after error`)
        return {
          ...staleCache,
          source: 'cache',
          cachedAt: new Date()
        }
      }
      
      // Если кэша нет и fallback включен, вернем null (вызывающий код использует static data)
      if (this.config.fallbackToStatic) {
        console.log(`[MADI Parser] Falling back to static distance learning data for ${professorName}`)
        return null
      }
      
      throw error
    }
  }

  /**
   * Получить агрегированную информацию о преподавателе
   */
  async getProfessorInfo(
    professorName: string,
    date: Date
  ): Promise<ProfessorInfo | null> {
    if (!this.config.enabled) {
      console.log('[MADI Parser] Parser is disabled, returning null')
      return null
    }

    const dateStr = date.toISOString().split('T')[0]
    console.log(`[MADI Parser] Aggregating professor info for ${professorName} on ${dateStr}`)

    try {
      // Параллельная загрузка всех источников данных
      console.log(`[MADI Parser] Starting parallel fetch of all data sources for ${professorName}`)
      const [scheduleResult, examsResult, departmentsResult, distanceResult] = await Promise.allSettled([
        this.getProfessorSchedule(professorName, date),
        this.getProfessorExams(professorName),
        this.getProfessorDepartments(professorName),
        this.getDistanceLearningSchedule(professorName)
      ])
      
      // Извлечение успешных результатов
      const scheduleData = scheduleResult.status === 'fulfilled' ? scheduleResult.value : null
      const examsData = examsResult.status === 'fulfilled' ? examsResult.value : null
      const departmentsData = departmentsResult.status === 'fulfilled' ? departmentsResult.value : []
      const distanceData = distanceResult.status === 'fulfilled' ? distanceResult.value : null
      
      // Логирование частичных ошибок
      if (scheduleResult.status === 'rejected') {
        console.error('[MADI Parser] Failed to fetch schedule during aggregation:', scheduleResult.reason)
      } else {
        console.log(`[MADI Parser] Schedule fetch successful: ${scheduleData?.lessons.length || 0} lessons`)
      }
      
      if (examsResult.status === 'rejected') {
        console.error('[MADI Parser] Failed to fetch exams during aggregation:', examsResult.reason)
      } else {
        console.log(`[MADI Parser] Exams fetch successful: ${examsData?.exams.length || 0} exams`)
      }
      
      if (departmentsResult.status === 'rejected') {
        console.error('[MADI Parser] Failed to fetch departments during aggregation:', departmentsResult.reason)
      } else {
        console.log(`[MADI Parser] Departments fetch successful: ${departmentsData?.length || 0} departments`)
      }
      
      if (distanceResult.status === 'rejected') {
        console.error('[MADI Parser] Failed to fetch distance learning during aggregation:', distanceResult.reason)
      } else {
        console.log(`[MADI Parser] Distance learning fetch successful: ${distanceData?.lessons.length || 0} lessons`)
      }
      
      // Объединение расписаний (очное + заочное)
      const mergedSchedule = mergeSchedules(scheduleData, distanceData)
      
      // Извлечение списка групп
      const groups = extractGroups(mergedSchedule, examsData)
      
      // Проверка наличия заочной формы обучения
      const hasDistanceLearning = distanceData !== null && distanceData.lessons.length > 0
      
      console.log(`[MADI Parser] Successfully aggregated professor info for ${professorName}:`)
      console.log(`  - Groups: ${groups.length} (${groups.join(', ')})`)
      console.log(`  - Lessons: ${mergedSchedule.lessons.length}`)
      console.log(`  - Exams: ${examsData?.exams.length || 0}`)
      console.log(`  - Departments: ${departmentsData?.length || 0}`)
      console.log(`  - Distance learning: ${hasDistanceLearning ? 'Yes' : 'No'}`)
      
      return {
        name: professorName,
        departments: departmentsData || [],
        schedule: mergedSchedule,
        examSchedule: examsData || {
          professorName,
          exams: [],
          source: 'static'
        },
        groups,
        hasDistanceLearning
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error(`[MADI Parser] Error aggregating professor info for ${professorName}:`, errorMessage)
      if (errorStack) {
        console.error(`[MADI Parser] Stack trace:`, errorStack)
      }
      
      // Если fallback включен, возвращаем null (вызывающий код использует static data)
      if (this.config.fallbackToStatic) {
        console.log(`[MADI Parser] Falling back to static professor data for ${professorName}`)
        return null
      }
      
      throw error
    }
  }

  /**
   * Поиск преподавателя по имени
   */
  async searchProfessor(name: string): Promise<string[]> {
    if (!this.config.enabled) {
      console.log('[MADI Parser] Parser is disabled, returning empty array')
      return []
    }

    try {
      // Validate search query
      if (!name || name.trim().length === 0) {
        console.error('[MADI Parser] Empty search query provided')
        throw new Error('Search query cannot be empty')
      }

      console.log(`[MADI Parser] Searching for professor: "${name}"`)

      // Формируем URL для поиска преподавателя
      // Обычно на сайте MADI есть страница со списком преподавателей или форма поиска
      const url = `${this.config.baseUrl}/r/?task=8`
      console.log(`[MADI Parser] Fetching professor list from MADI site: ${url}`)

      // Загружаем HTML страницу
      const html = await fetchMADIPage(url, this.config.requestTimeout)

      // Парсим список преподавателей
      const professors = searchProfessorInHTML(html, name)

      console.log(`[MADI Parser] Successfully found ${professors.length} professors matching "${name}"`)
      if (professors.length > 0) {
        console.log(`[MADI Parser] Matches: ${professors.join(', ')}`)
      }

      return professors
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      console.error(`[MADI Parser] Error searching for professor "${name}":`, errorMessage)
      if (errorStack) {
        console.error(`[MADI Parser] Stack trace:`, errorStack)
      }
      return []
    }
  }

  /**
   * Очистить кэш
   */
  clearCache(dataType?: 'schedule' | 'exams' | 'department' | 'all'): void {
    const typeStr = dataType || 'all'
    console.log(`[MADI Parser] Clearing cache: ${typeStr}`)
    this.cache.clear(dataType)
    console.log(`[MADI Parser] Cache cleared successfully: ${typeStr}`)
  }
}

// ============================================================================
// Helper Functions (to be implemented in later tasks)
// ============================================================================

/**
 * Выполнить HTTP запрос к сайту MADI с обработкой таймаутов
 * 
 * @param url - URL страницы MADI для загрузки
 * @param timeout - Таймаут запроса в миллисекундах
 * @returns HTML содержимое страницы
 * @throws Error при сетевых ошибках, таймауте или HTTP ошибках (4xx, 5xx)
 */
export async function fetchMADIPage(url: string, timeout: number): Promise<string> {
  const startTime = Date.now()
  console.log(`[MADI Parser] Fetching page: ${url}`)
  
  // Создаем AbortController для обработки таймаута
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
    console.error(`[MADI Parser] Request timeout after ${timeout}ms: ${url}`)
  }, timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (MADI Schedule Bot/1.0)',
      }
    })

    // Обработка HTTP ошибок (4xx, 5xx)
    if (!response.ok) {
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`
      console.error(`[MADI Parser] HTTP error for ${url}: ${errorMessage}`)
      const error = new Error(errorMessage)
      monitoring.recordFailure(error, 'network', url)
      throw error
    }

    const html = await response.text()
    const responseTime = Date.now() - startTime
    console.log(`[MADI Parser] Successfully fetched page: ${url} (${html.length} bytes, ${responseTime}ms)`)
    monitoring.recordSuccess(responseTime)
    
    return html
  } catch (error) {
    // Обработка ошибки таймаута
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`)
      monitoring.recordFailure(timeoutError, 'timeout', url)
      throw timeoutError
    }
    
    // Записываем другие ошибки в мониторинг
    if (error instanceof Error) {
      monitoring.recordFailure(error, 'network', url)
    }
    
    // Пробрасываем другие ошибки
    throw error
  } finally {
    // Очищаем таймер в любом случае
    clearTimeout(timeoutId)
  }
}

/**
 * Объединить расписания (очное + заочное)
 * 
 * @param regular - Расписание очной формы обучения
 * @param distance - Расписание заочной формы обучения
 * @returns Объединенное расписание с уроками из обоих источников
 */
function mergeSchedules(
  regular: ParsedSchedule | null,
  distance: ParsedSchedule | null
): ParsedSchedule {
  // Если оба расписания отсутствуют, возвращаем пустое расписание
  if (!regular && !distance) {
    return {
      professorName: '',
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: getDayOfWeekRussian(new Date()),
      lessons: [],
      source: 'static'
    }
  }
  
  // Если только заочное расписание отсутствует, возвращаем очное
  if (!distance) {
    return regular!
  }
  
  // Если только очное расписание отсутствует, возвращаем заочное
  if (!regular) {
    return distance
  }
  
  // Объединяем оба расписания
  // Все уроки из заочного расписания помечаем флагом isDistanceLearning
  const mergedLessons = [
    ...regular.lessons,
    ...distance.lessons.map(lesson => ({
      ...lesson,
      isDistanceLearning: true
    }))
  ]
  
  // Возвращаем объединенное расписание на основе очного расписания
  return {
    ...regular,
    lessons: mergedLessons,
    source: regular.source === 'cache' || distance.source === 'cache' ? 'cache' : 'madi-parser'
  }
}

/**
 * Извлечь список групп из расписания и экзаменов
 * 
 * @param schedule - Расписание занятий преподавателя
 * @param exams - Расписание экзаменов преподавателя
 * @returns Отсортированный массив уникальных названий групп
 */
function extractGroups(
  schedule: ParsedSchedule,
  exams: ParsedExamSchedule | null
): string[] {
  const groups = new Set<string>()
  
  // Извлекаем группы из расписания занятий
  schedule.lessons.forEach(lesson => {
    if (lesson.group && lesson.group.trim().length > 0) {
      groups.add(lesson.group.trim())
    }
  })
  
  // Извлекаем группы из расписания экзаменов
  if (exams) {
    exams.exams.forEach(exam => {
      if (exam.group && exam.group.trim().length > 0) {
        groups.add(exam.group.trim())
      }
    })
  }
  
  // Возвращаем отсортированный массив уникальных групп
  return Array.from(groups).sort()
}

/**
 * Определить тип занятия по названию предмета
 */
export function inferLessonType(subject: string): 'lecture' | 'practice' | 'lab' {
  const lowerSubject = subject.toLowerCase()
  
  if (lowerSubject.includes('практика')) {
    return 'practice'
  }
  
  if (lowerSubject.includes('лабораторная') || lowerSubject.includes('лаб.')) {
    return 'lab'
  }
  
  // Default to lecture if no specific type is found
  return 'lecture'
}

/**
 * Определить тип экзамена по названию предмета
 */
export function inferExamType(subject: string): 'exam' | 'test' {
  const lowerSubject = subject.toLowerCase()
  
  if (lowerSubject.includes('зачёт') || lowerSubject.includes('зачет')) {
    return 'test'
  }
  
  // Default to exam if no specific type is found
  return 'exam'
}

/**
 * Парсинг HTML страницы расписания экзаменов преподавателя
 * 
 * @param html - HTML содержимое страницы экзаменов (task=4)
 * @param professorName - Имя преподавателя
 * @returns ParsedExamSchedule с извлеченными данными или null при ошибке
 */
export function parseExamPage(
  html: string,
  professorName: string
): ParsedExamSchedule | null {
  try {
    console.log(`[MADI Parser] Parsing exam page for ${professorName}`)
    
    // Загружаем HTML в cheerio
    const $ = cheerio.load(html)
    
    // Ищем таблицу экзаменов
    const examTable = $(SELECTORS.examTable).first()
    
    if (examTable.length === 0) {
      console.warn('[MADI Parser] Exam table not found in HTML')
      return null
    }
    
    // Извлекаем строки таблицы (пропускаем заголовок)
    const rows = examTable.find(SELECTORS.scheduleRow).slice(1)
    
    if (rows.length === 0) {
      console.log('[MADI Parser] No exam rows found - empty exam schedule')
      // Возвращаем пустое расписание экзаменов
      return {
        professorName,
        exams: [],
        source: 'madi-parser'
      }
    }
    
    const exams: ParsedExam[] = []
    
    // Парсим каждую строку
    rows.each((_, row) => {
      try {
        const $row = $(row)
        
        // Извлекаем данные из ячеек
        const date = $row.find(SELECTORS.examDate).text().trim()
        const time = $row.find(SELECTORS.examTime).text().trim()
        const subject = $row.find(SELECTORS.examSubject).text().trim()
        const roomInfo = $row.find(SELECTORS.examRoom).text().trim()
        const group = $row.find(SELECTORS.examGroup).text().trim()
        
        // Пропускаем строки без даты или предмета (могут быть пустые строки)
        if (!date || !subject) {
          return
        }
        
        // Парсим информацию об аудитории и корпусе
        const { room, building } = parseRoomInfo(roomInfo)
        
        // Определяем тип экзамена (экзамен/зачёт)
        const type = inferExamType(subject)
        
        // Проверяем, является ли это заочной формой обучения
        // (обычно в HTML есть специальные маркеры или в названии предмета)
        const isDistanceLearning = checkIfDistanceLearning($row, subject)
        
        // Создаем объект экзамена
        const exam: ParsedExam = {
          date,
          time,
          subject,
          type,
          room
        }
        
        // Добавляем опциональные поля только если они не пустые
        if (building) {
          exam.building = building
        }
        
        if (group) {
          exam.group = group
        }
        
        if (isDistanceLearning) {
          exam.isDistanceLearning = true
        }
        
        exams.push(exam)
        
        console.log(`[MADI Parser] Parsed exam: ${date} ${time} - ${subject} (${type})`)
      } catch (error) {
        console.error('[MADI Parser] Error parsing exam row:', error)
        // Продолжаем парсинг остальных строк
      }
    })
    
    console.log(`[MADI Parser] Successfully parsed ${exams.length} exams`)
    
    return {
      professorName,
      exams,
      source: 'madi-parser'
    }
  } catch (error) {
    console.error('[MADI Parser] Error parsing exam page:', error)
    return null
  }
}

/**
 * Парсинг HTML страницы информации о кафедре
 * 
 * @param html - HTML содержимое страницы кафедры (task=11)
 * @param professorName - Имя преподавателя
 * @returns Массив ParsedDepartment с извлеченными данными или пустой массив при ошибке
 */
export function parseDepartmentPage(
  html: string,
  professorName: string
): ParsedDepartment[] | null {
  try {
    console.log(`[MADI Parser] Parsing department page for ${professorName}`)
    
    // Загружаем HTML в cheerio
    const $ = cheerio.load(html)
    
    const departments: ParsedDepartment[] = []
    
    // Ищем все таблицы кафедр (может быть несколько кафедр)
    const departmentTables = $(SELECTORS.departmentTable)
    
    if (departmentTables.length === 0) {
      console.warn('[MADI Parser] Department table not found in HTML, trying alternative selectors')
      
      // Пробуем альтернативные селекторы для поиска информации о кафедре
      // Ищем заголовки с названиями кафедр
      const departmentHeaders = $(SELECTORS.departmentName)
      
      if (departmentHeaders.length === 0) {
        console.warn('[MADI Parser] No department information found')
        return []
      }
      
      // Парсим каждый заголовок кафедры
      departmentHeaders.each((_, header) => {
        try {
          const $header = $(header)
          const departmentName = $header.text().trim()
          
          if (!departmentName) {
            return
          }
          
          // Ищем следующую таблицу после заголовка
          const nextTable = $header.nextAll('table').first()
          
          if (nextTable.length === 0) {
            // Если таблицы нет, создаем кафедру только с названием
            departments.push({
              name: departmentName,
              professors: [],
              subjects: []
            })
            return
          }
          
          // Извлекаем преподавателей и предметы из таблицы
          const { professors, subjects } = extractDepartmentData($, nextTable)
          
          departments.push({
            name: departmentName,
            professors,
            subjects
          })
          
          console.log(`[MADI Parser] Parsed department: ${departmentName} (${professors.length} professors, ${subjects.length} subjects)`)
        } catch (error) {
          console.error('[MADI Parser] Error parsing department header:', error)
        }
      })
    } else {
      // Парсим каждую таблицу кафедры
      departmentTables.each((_, table) => {
        try {
          const $table = $(table)
          
          // Ищем название кафедры (обычно в заголовке перед таблицей или в первой строке)
          let departmentName = $table.prevAll(SELECTORS.departmentName).first().text().trim()
          
          if (!departmentName) {
            // Пробуем найти название в первой строке таблицы
            departmentName = $table.find('tr').first().find('th, td').first().text().trim()
          }
          
          if (!departmentName) {
            console.warn('[MADI Parser] Department name not found, skipping table')
            return
          }
          
          // Извлекаем преподавателей и предметы из таблицы
          const { professors, subjects } = extractDepartmentData($, $table)
          
          departments.push({
            name: departmentName,
            professors,
            subjects
          })
          
          console.log(`[MADI Parser] Parsed department: ${departmentName} (${professors.length} professors, ${subjects.length} subjects)`)
        } catch (error) {
          console.error('[MADI Parser] Error parsing department table:', error)
        }
      })
    }
    
    if (departments.length === 0) {
      console.log('[MADI Parser] No departments found')
      return []
    }
    
    console.log(`[MADI Parser] Successfully parsed ${departments.length} departments`)
    
    return departments
  } catch (error) {
    console.error('[MADI Parser] Error parsing department page:', error)
    return null
  }
}

/**
 * Извлечь данные о преподавателях и предметах из таблицы кафедры
 * 
 * @param $ - Cheerio instance
 * @param $table - Cheerio элемент таблицы
 * @returns Объект с массивами преподавателей и предметов
 */
function extractDepartmentData(
  $: cheerio.CheerioAPI,
  $table: cheerio.Cheerio<any>
): { professors: string[]; subjects: string[] } {
  const professors = new Set<string>()
  const subjects = new Set<string>()
  
  // Извлекаем строки таблицы (пропускаем заголовок)
  const rows = $table.find('tr').slice(1)
  
  rows.each((_, row) => {
    const $row = $(row)
    const cells = $row.find('td')
    
    // Пробуем разные форматы таблиц
    // Формат 1: Преподаватель | Предмет
    // Формат 2: Предмет | Преподаватель
    // Формат 3: Только преподаватели
    // Формат 4: Только предметы
    
    if (cells.length >= 2) {
      const cell1 = $(cells[0]).text().trim()
      const cell2 = $(cells[1]).text().trim()
      
      // Проверяем, какая ячейка содержит преподавателя
      // (обычно преподаватели имеют инициалы или фамилию с инициалами)
      if (isProfessorName(cell1)) {
        if (cell1) professors.add(cell1)
        if (cell2) subjects.add(cell2)
      } else if (isProfessorName(cell2)) {
        if (cell2) professors.add(cell2)
        if (cell1) subjects.add(cell1)
      } else {
        // Если не можем определить, добавляем оба как потенциальные данные
        if (cell1) subjects.add(cell1)
        if (cell2) subjects.add(cell2)
      }
    } else if (cells.length === 1) {
      const cellText = $(cells[0]).text().trim()
      
      // Определяем, это преподаватель или предмет
      if (isProfessorName(cellText)) {
        if (cellText) professors.add(cellText)
      } else {
        if (cellText) subjects.add(cellText)
      }
    }
    
    // Также проверяем специальные селекторы для преподавателей
    const professorCells = $row.find(SELECTORS.professorList)
    professorCells.each((_, cell) => {
      const profName = $(cell).text().trim()
      if (profName) professors.add(profName)
    })
  })
  
  return {
    professors: Array.from(professors).sort(),
    subjects: Array.from(subjects).sort()
  }
}

/**
 * Проверить, является ли строка именем преподавателя
 * 
 * @param text - Текст для проверки
 * @returns true если текст похож на имя преподавателя
 */
function isProfessorName(text: string): boolean {
  if (!text) return false
  
  // Преподаватели обычно имеют формат: "Фамилия И.О." или "Фамилия Имя Отчество"
  // Проверяем наличие точек (инициалы) или заглавных букв
  
  // Проверка на инициалы (например, "Остроух А.В.")
  if (/[А-ЯЁ]\.[А-ЯЁ]\./.test(text)) {
    return true
  }
  
  // Проверка на формат "Фамилия Имя" (два слова с заглавными буквами)
  const words = text.split(/\s+/)
  if (words.length >= 2 && words.every(w => /^[А-ЯЁ]/.test(w))) {
    return true
  }
  
  // Проверка на короткую строку с заглавной буквой (может быть фамилия)
  if (words.length === 1 && /^[А-ЯЁ][а-яё]+$/.test(text) && text.length < 30) {
    return true
  }
  
  return false
}

/**
 * Проверить, является ли занятие/экзамен заочной формой обучения
 * 
 * @param $row - Cheerio элемент строки таблицы
 * @param subject - Название предмета
 * @returns true если это заочная форма обучения
 */
function checkIfDistanceLearning($row: cheerio.Cheerio<any>, subject: string): boolean {
  // Проверяем наличие маркеров заочной формы в тексте
  const lowerSubject = subject.toLowerCase()
  
  if (lowerSubject.includes('заочн') || lowerSubject.includes('дистанц')) {
    return true
  }
  
  // Проверяем наличие специальных классов или атрибутов в строке
  const rowClass = $row.attr('class') || ''
  const rowText = $row.text().toLowerCase()
  
  if (rowClass.includes('distance') || rowClass.includes('zaochn')) {
    return true
  }
  
  if (rowText.includes('заочн') || rowText.includes('дистанц')) {
    return true
  }
  
  return false
}

/**
 * Парсинг HTML страницы расписания преподавателя
 * 
 * @param html - HTML содержимое страницы расписания (task=8)
 * @param professorName - Имя преподавателя
 * @param date - Дата для расписания
 * @returns ParsedSchedule с извлеченными данными или null при ошибке
 */
export function parseSchedulePage(
  html: string,
  professorName: string,
  date: Date
): ParsedSchedule | null {
  try {
    console.log(`[MADI Parser] Parsing schedule page for ${professorName} on ${date.toISOString()}`)
    
    // Загружаем HTML в cheerio
    const $ = cheerio.load(html)
    
    // Ищем таблицу расписания
    const scheduleTable = $(SELECTORS.scheduleTable).first()
    
    if (scheduleTable.length === 0) {
      console.warn('[MADI Parser] Schedule table not found in HTML')
      return null
    }
    
    // Извлекаем строки таблицы (пропускаем заголовок)
    const rows = scheduleTable.find(SELECTORS.scheduleRow).slice(1)
    
    if (rows.length === 0) {
      console.log('[MADI Parser] No schedule rows found - empty schedule')
      // Возвращаем пустое расписание (выходной день)
      return {
        professorName,
        date: date.toISOString().split('T')[0],
        dayOfWeek: getDayOfWeekRussian(date),
        lessons: [],
        source: 'madi-parser'
      }
    }
    
    const lessons: ParsedLesson[] = []
    
    // Парсим каждую строку
    rows.each((_, row) => {
      try {
        const $row = $(row)
        
        // Извлекаем данные из ячеек
        const dayOfWeek = $row.find(SELECTORS.dayOfWeek).text().trim()
        const time = $row.find(SELECTORS.lessonTime).text().trim()
        const subject = $row.find(SELECTORS.lessonSubject).text().trim()
        const roomInfo = $row.find(SELECTORS.lessonRoom).text().trim()
        const group = $row.find(SELECTORS.lessonGroup).text().trim()
        
        // Пропускаем строки без времени или предмета (могут быть пустые строки)
        if (!time || !subject) {
          return
        }
        
        // Парсим информацию об аудитории и корпусе
        const { room, building } = parseRoomInfo(roomInfo)
        
        // Определяем тип занятия
        const type = inferLessonType(subject)
        
        // Создаем объект занятия
        const lesson: ParsedLesson = {
          time,
          subject,
          type,
          room
        }
        
        // Добавляем опциональные поля только если они не пустые
        if (building) {
          lesson.building = building
        }
        
        if (group) {
          lesson.group = group
        }
        
        lessons.push(lesson)
        
        console.log(`[MADI Parser] Parsed lesson: ${time} - ${subject} (${type})`)
      } catch (error) {
        console.error('[MADI Parser] Error parsing lesson row:', error)
        // Продолжаем парсинг остальных строк
      }
    })
    
    console.log(`[MADI Parser] Successfully parsed ${lessons.length} lessons`)
    
    return {
      professorName,
      date: date.toISOString().split('T')[0],
      dayOfWeek: getDayOfWeekRussian(date),
      lessons,
      source: 'madi-parser'
    }
  } catch (error) {
    console.error('[MADI Parser] Error parsing schedule page:', error)
    return null
  }
}

/**
 * Парсинг информации об аудитории и корпусе
 * 
 * @param roomInfo - Строка с информацией об аудитории (например, "301, Главный корпус" или "405")
 * @returns Объект с номером аудитории и опциональным названием корпуса
 */
function parseRoomInfo(roomInfo: string): { room: string; building?: string } {
  if (!roomInfo) {
    return { room: '' }
  }
  
  // Разделяем по запятой (формат: "301, Главный корпус")
  const parts = roomInfo.split(',').map(p => p.trim())
  
  if (parts.length >= 2) {
    return {
      room: parts[0],
      building: parts[1]
    }
  }
  
  // Если запятой нет, вся строка - это номер аудитории
  return { room: roomInfo }
}

/**
 * Получить название дня недели на русском языке
 * 
 * @param date - Дата
 * @returns Название дня недели на русском
 */
function getDayOfWeekRussian(date: Date): string {
  const days = [
    'Воскресенье',
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота'
  ]
  
  return days[date.getDay()]
}

/**
 * Парсинг HTML страницы расписания группы
 * 
 * @param html - HTML содержимое страницы расписания группы (task=7)
 * @param groupName - Название группы
 * @param date - Дата для расписания
 * @param professorFilter - Опциональный фильтр по преподавателю
 * @returns ParsedSchedule с извлеченными данными или null при ошибке
 */
export function parseGroupPage(
  html: string,
  groupName: string,
  date: Date,
  professorFilter?: string
): ParsedSchedule | null {
  try {
    console.log(`[MADI Parser] Parsing group schedule page for ${groupName} on ${date.toISOString()}${professorFilter ? ` (filter: ${professorFilter})` : ''}`)
    
    // Загружаем HTML в cheerio
    const $ = cheerio.load(html)
    
    // Ищем таблицу расписания
    const scheduleTable = $(SELECTORS.scheduleTable).first()
    
    if (scheduleTable.length === 0) {
      console.warn('[MADI Parser] Group schedule table not found in HTML')
      return null
    }
    
    // Извлекаем строки таблицы (пропускаем заголовок)
    const rows = scheduleTable.find(SELECTORS.scheduleRow).slice(1)
    
    if (rows.length === 0) {
      console.log('[MADI Parser] No group schedule rows found - empty schedule')
      // Возвращаем пустое расписание (выходной день)
      return {
        professorName: professorFilter || '',
        date: date.toISOString().split('T')[0],
        dayOfWeek: getDayOfWeekRussian(date),
        lessons: [],
        source: 'madi-parser'
      }
    }
    
    const lessons: ParsedLesson[] = []
    
    // Парсим каждую строку
    rows.each((_, row) => {
      try {
        const $row = $(row)
        
        // Извлекаем данные из ячеек
        // Формат таблицы группы может отличаться от таблицы преподавателя
        // Обычно: День недели | Время | Предмет | Преподаватель | Аудитория
        const cells = $row.find('td')
        
        if (cells.length < 3) {
          // Недостаточно ячеек для парсинга
          return
        }
        
        // Пробуем разные форматы таблиц
        let time = ''
        let subject = ''
        let professor = ''
        let roomInfo = ''
        
        // Формат 1: День | Время | Предмет | Преподаватель | Аудитория (5 колонок)
        if (cells.length >= 5) {
          time = $(cells[1]).text().trim()
          subject = $(cells[2]).text().trim()
          professor = $(cells[3]).text().trim()
          roomInfo = $(cells[4]).text().trim()
        }
        // Формат 2: Время | Предмет | Преподаватель | Аудитория (4 колонки)
        else if (cells.length >= 4) {
          time = $(cells[0]).text().trim()
          subject = $(cells[1]).text().trim()
          professor = $(cells[2]).text().trim()
          roomInfo = $(cells[3]).text().trim()
        }
        // Формат 3: Время | Предмет | Аудитория (3 колонки, без преподавателя)
        else if (cells.length >= 3) {
          time = $(cells[0]).text().trim()
          subject = $(cells[1]).text().trim()
          roomInfo = $(cells[2]).text().trim()
        }
        
        // Пропускаем строки без времени или предмета
        if (!time || !subject) {
          return
        }
        
        // Применяем фильтр по преподавателю, если указан
        if (professorFilter && professor) {
          // Проверяем, содержит ли имя преподавателя фильтр (частичное совпадение)
          const normalizedProfessor = professor.toLowerCase()
          const normalizedFilter = professorFilter.toLowerCase()
          
          if (!normalizedProfessor.includes(normalizedFilter)) {
            // Преподаватель не совпадает с фильтром, пропускаем
            return
          }
        }
        
        // Парсим информацию об аудитории и корпусе
        const { room, building } = parseRoomInfo(roomInfo)
        
        // Определяем тип занятия
        const type = inferLessonType(subject)
        
        // Создаем объект занятия
        const lesson: ParsedLesson = {
          time,
          subject,
          type,
          room
        }
        
        // Добавляем опциональные поля только если они не пустые
        if (building) {
          lesson.building = building
        }
        
        // Для расписания группы, группа - это сама группа
        lesson.group = groupName
        
        lessons.push(lesson)
        
        console.log(`[MADI Parser] Parsed group lesson: ${time} - ${subject} (${type})${professor ? ` by ${professor}` : ''}`)
      } catch (error) {
        console.error('[MADI Parser] Error parsing group lesson row:', error)
        // Продолжаем парсинг остальных строк
      }
    })
    
    console.log(`[MADI Parser] Successfully parsed ${lessons.length} lessons for group ${groupName}${professorFilter ? ` (filtered by ${professorFilter})` : ''}`)
    
    return {
      professorName: professorFilter || '',
      date: date.toISOString().split('T')[0],
      dayOfWeek: getDayOfWeekRussian(date),
      lessons,
      source: 'madi-parser'
    }
  } catch (error) {
    console.error('[MADI Parser] Error parsing group schedule page:', error)
    return null
  }
}

/**
 * Парсинг HTML страницы расписания заочной формы обучения
 * 
 * @param html - HTML содержимое страницы расписания заочной формы (task=15)
 * @param professorName - Имя преподавателя
 * @returns ParsedSchedule с извлеченными данными или null при ошибке
 */
export function parseDistanceLearningPage(
  html: string,
  professorName: string
): ParsedSchedule | null {
  try {
    console.log(`[MADI Parser] Parsing distance learning schedule page for ${professorName}`)
    
    // Загружаем HTML в cheerio
    const $ = cheerio.load(html)
    
    // Ищем таблицу расписания заочной формы
    // Таблица может иметь те же селекторы, что и обычное расписание
    const scheduleTable = $(SELECTORS.scheduleTable).first()
    
    if (scheduleTable.length === 0) {
      console.warn('[MADI Parser] Distance learning schedule table not found in HTML')
      return null
    }
    
    // Извлекаем строки таблицы (пропускаем заголовок)
    const rows = scheduleTable.find(SELECTORS.scheduleRow).slice(1)
    
    // Пытаемся найти информацию о датах сессии в заголовках или тексте страницы
    // Обычно даты сессии указываются в формате "Сессия: 01.02.2026 - 28.02.2026"
    const pageText = $('body').text()
    const sessionDateMatch = pageText.match(/сессия[:\s]*(\d{1,2}\.\d{1,2}\.\d{4}\s*[-–—]\s*\d{1,2}\.\d{1,2}\.\d{4})/i)
    
    let sessionStartDate: string | null = null
    let sessionEndDate: string | null = null
    let sessionDateString: string | null = null
    
    if (sessionDateMatch) {
      sessionDateString = sessionDateMatch[1]
      // Extract individual dates from the matched string
      const datesMatch = sessionDateString.match(/(\d{1,2}\.\d{1,2}\.\d{4})\s*[-–—]\s*(\d{1,2}\.\d{1,2}\.\d{4})/)
      if (datesMatch) {
        sessionStartDate = datesMatch[1]
        sessionEndDate = datesMatch[2]
        console.log(`[MADI Parser] Found session dates: ${sessionStartDate} - ${sessionEndDate}`)
      }
    }
    
    if (rows.length === 0) {
      console.log('[MADI Parser] No distance learning schedule rows found - empty schedule')
      // Возвращаем пустое расписание
      const scheduleDate = sessionStartDate 
        ? convertRussianDateToISO(sessionStartDate)
        : new Date().toISOString().split('T')[0]
      
      const dayOfWeekText = sessionDateString 
        ? `Сессия: ${sessionDateString}`
        : 'Заочная форма'
      
      return {
        professorName,
        date: scheduleDate,
        dayOfWeek: dayOfWeekText,
        lessons: [],
        source: 'madi-parser'
      }
    }
    
    const lessons: ParsedLesson[] = []
    
    // Парсим каждую строку
    rows.each((_, row) => {
      try {
        const $row = $(row)
        
        // Извлекаем данные из ячеек
        // Формат таблицы заочной формы может включать дополнительные колонки с датами
        const cells = $row.find('td')
        
        if (cells.length < 3) {
          // Недостаточно ячеек для парсинга
          return
        }
        
        // Пробуем разные форматы таблиц заочной формы
        let time = ''
        let subject = ''
        let roomInfo = ''
        let group = ''
        let lessonDate = ''
        
        // Формат 1: Дата | Время | Предмет | Аудитория | Группа (5 колонок)
        if (cells.length >= 5) {
          lessonDate = $(cells[0]).text().trim()
          time = $(cells[1]).text().trim()
          subject = $(cells[2]).text().trim()
          roomInfo = $(cells[3]).text().trim()
          group = $(cells[4]).text().trim()
        }
        // Формат 2: Дата | Время | Предмет | Аудитория (4 колонки)
        else if (cells.length >= 4) {
          lessonDate = $(cells[0]).text().trim()
          time = $(cells[1]).text().trim()
          subject = $(cells[2]).text().trim()
          roomInfo = $(cells[3]).text().trim()
        }
        // Формат 3: Время | Предмет | Аудитория | Группа (4 колонки, без даты)
        else if (cells.length >= 4 && !$(cells[0]).text().match(/\d{1,2}\.\d{1,2}/)) {
          time = $(cells[0]).text().trim()
          subject = $(cells[1]).text().trim()
          roomInfo = $(cells[2]).text().trim()
          group = $(cells[3]).text().trim()
        }
        // Формат 4: Время | Предмет | Аудитория (3 колонки)
        else if (cells.length >= 3) {
          time = $(cells[0]).text().trim()
          subject = $(cells[1]).text().trim()
          roomInfo = $(cells[2]).text().trim()
        }
        
        // Пропускаем строки без времени или предмета
        if (!time || !subject) {
          return
        }
        
        // Парсим информацию об аудитории и корпусе
        const { room, building } = parseRoomInfo(roomInfo)
        
        // Определяем тип занятия
        const type = inferLessonType(subject)
        
        // Создаем объект занятия
        const lesson: ParsedLesson = {
          time,
          subject,
          type,
          room,
          isDistanceLearning: true // Устанавливаем флаг заочной формы
        }
        
        // Добавляем опциональные поля только если они не пустые
        if (building) {
          lesson.building = building
        }
        
        if (group) {
          lesson.group = group
        }
        
        lessons.push(lesson)
        
        console.log(`[MADI Parser] Parsed distance learning lesson: ${time} - ${subject} (${type})${lessonDate ? ` on ${lessonDate}` : ''}`)
      } catch (error) {
        console.error('[MADI Parser] Error parsing distance learning lesson row:', error)
        // Продолжаем парсинг остальных строк
      }
    })
    
    console.log(`[MADI Parser] Successfully parsed ${lessons.length} distance learning lessons`)
    
    // Формируем результат
    // Для заочной формы используем текущую дату или дату начала сессии
    const scheduleDate = sessionStartDate 
      ? convertRussianDateToISO(sessionStartDate)
      : new Date().toISOString().split('T')[0]
    
    const dayOfWeekText = sessionDateString 
      ? `Сессия: ${sessionDateString}`
      : 'Заочная форма'
    
    return {
      professorName,
      date: scheduleDate,
      dayOfWeek: dayOfWeekText,
      lessons,
      source: 'madi-parser'
    }
  } catch (error) {
    console.error('[MADI Parser] Error parsing distance learning schedule page:', error)
    return null
  }
}

/**
 * Конвертировать русскую дату (DD.MM.YYYY) в ISO формат (YYYY-MM-DD)
 * 
 * @param russianDate - Дата в формате DD.MM.YYYY
 * @returns Дата в формате YYYY-MM-DD
 */
function convertRussianDateToISO(russianDate: string): string {
  const parts = russianDate.split('.')
  if (parts.length !== 3) {
    return new Date().toISOString().split('T')[0]
  }
  
  const day = parts[0].padStart(2, '0')
  const month = parts[1].padStart(2, '0')
  const year = parts[2]
  
  return `${year}-${month}-${day}`
}

/**
 * Поиск преподавателя в HTML странице
 * 
 * @param html - HTML содержимое страницы со списком преподавателей
 * @param searchQuery - Поисковый запрос (имя или фамилия преподавателя)
 * @returns Массив найденных имён преподавателей
 */
export function searchProfessorInHTML(html: string, searchQuery: string): string[] {
  try {
    console.log(`[MADI Parser] Searching for "${searchQuery}" in HTML`)
    
    // Загружаем HTML в cheerio
    const $ = cheerio.load(html)
    
    const matches = new Set<string>()
    
    // Нормализуем поисковый запрос для сравнения
    const normalizedQuery = searchQuery.toLowerCase().trim()
    
    // Если поисковый запрос пустой после trim, возвращаем пустой массив
    if (normalizedQuery.length === 0) {
      console.log('[MADI Parser] Empty search query after trim, returning empty results')
      return []
    }
    
    // Ищем select элемент с преподавателями
    const professorSelect = $(SELECTORS.professorSelect)
    
    if (professorSelect.length > 0) {
      // Извлекаем все option элементы
      const options = professorSelect.find(SELECTORS.professorOption)
      
      options.each((_, option) => {
        const $option = $(option)
        const professorName = $option.text().trim()
        
        // Пропускаем пустые опции и опции "Выберите преподавателя"
        if (!professorName || professorName.toLowerCase().includes('выберите')) {
          return
        }
        
        // Проверяем, содержит ли имя преподавателя поисковый запрос
        const normalizedName = professorName.toLowerCase()
        
        if (normalizedName.includes(normalizedQuery)) {
          matches.add(professorName)
          console.log(`[MADI Parser] Found match: ${professorName}`)
        }
      })
    }
    
    // Если select не найден, пробуем искать в таблицах или списках
    if (matches.size === 0) {
      console.log('[MADI Parser] Professor select not found, trying alternative search')
      
      // Ищем все ссылки и текст, которые могут содержать имена преподавателей
      $('a, td, li').each((_, element) => {
        const $element = $(element)
        const text = $element.text().trim()
        
        // Проверяем, похож ли текст на имя преподавателя
        if (isProfessorName(text)) {
          const normalizedText = text.toLowerCase()
          
          if (normalizedText.includes(normalizedQuery)) {
            matches.add(text)
            console.log(`[MADI Parser] Found match in alternative search: ${text}`)
          }
        }
      })
    }
    
    const results = Array.from(matches).sort()
    
    console.log(`[MADI Parser] Search completed: found ${results.length} matches`)
    
    return results
  } catch (error) {
    console.error('[MADI Parser] Error searching for professor in HTML:', error)
    return []
  }
}
