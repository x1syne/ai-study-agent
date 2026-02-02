# Design Document: MADI Schedule Parser

## Overview

Комплексный парсер для извлечения всей информации о преподавателях с официального сайта МАДИ. Система предоставляет:
- Расписание занятий (очная и заочная формы)
- Расписание экзаменов и зачётов
- Информация о кафедрах
- Расписание групп
- Агрегированная информация о преподавателе

Использует веб-скрейпинг, кэширование, параллельную загрузку данных и graceful degradation для обеспечения надежности.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Schedule API Layer                               │
│  (lib/madi/schedule-api.ts - existing interface)                    │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   MADI Parser Module                                 │
│  (lib/madi/madi-parser.ts - NEW)                                    │
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Data Source Parsers                        │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │  │
│  │  │  Schedule   │ │    Exams    │ │ Department  │           │  │
│  │  │   Parser    │ │   Parser    │ │   Parser    │           │  │
│  │  │  (task=8)   │ │  (task=4)   │ │  (task=11)  │           │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘           │  │
│  │  ┌─────────────┐ ┌─────────────┐                            │  │
│  │  │   Group     │ │  Distance   │                            │  │
│  │  │   Parser    │ │  Learning   │                            │  │
│  │  │  (task=7)   │ │  (task=15)  │                            │  │
│  │  └─────────────┘ └─────────────┘                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Fetcher    │  │    Parser    │  │    Cache     │             │
│  │  (HTTP)      │→ │  (HTML)      │→ │  (Memory)    │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│         │                  │                  │                      │
│         ▼                  ▼                  ▼                      │
│  ┌──────────────────────────────────────────────────┐              │
│  │      Aggregator & Error Handler & Fallback        │              │
│  └──────────────────────────────────────────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Static Schedule Fallback                            │
│  (lib/madi/schedule-api.ts - existing static data)                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. MADI Parser Module (lib/madi/madi-parser.ts)

**Purpose**: Основной модуль для парсинга всей информации о преподавателе с сайта MADI.

**Exports**:
```typescript
export interface MADIParserConfig {
  enabled: boolean
  cacheTTL: number // seconds
  requestTimeout: number // milliseconds
  fallbackToStatic: boolean
  baseUrl: string
}

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

export class MADIParser {
  constructor(config: MADIParserConfig)
  
  // Основные методы парсинга
  async getProfessorSchedule(
    professorName: string, 
    date: Date
  ): Promise<ParsedSchedule | null>
  
  async getProfessorExams(
    professorName: string
  ): Promise<ParsedExamSchedule | null>
  
  async getProfessorDepartments(
    professorName: string
  ): Promise<ParsedDepartment[]>
  
  async getGroupSchedule(
    groupName: string,
    date: Date
  ): Promise<ParsedSchedule | null>
  
  async getDistanceLearningSchedule(
    professorName: string
  ): Promise<ParsedSchedule | null>
  
  // Агрегированный метод
  async getProfessorInfo(
    professorName: string,
    date: Date
  ): Promise<ProfessorInfo | null>
  
  // Утилиты
  async searchProfessor(name: string): Promise<string[]>
  clearCache(dataType?: 'schedule' | 'exams' | 'department' | 'all'): void
}
```

### 2. Data Source Parsers

#### 2.1 Schedule Parser (task=8)
**URL**: `https://www.madi.ru/tplan/r/?task=8`
**Purpose**: Парсинг расписания занятий преподавателя

**HTML Structure** (expected):
```html
<table class="table-schedule">
  <tr>
    <td>Понедельник</td>
    <td>9:00-10:30</td>
    <td>Автоматизированные системы управления (лекция)</td>
    <td>301, Главный корпус</td>
    <td>АСУ-41</td>
  </tr>
</table>
```

#### 2.2 Exam Parser (task=4)
**URL**: `https://www.madi.ru/tplan/r/?task=4`
**Purpose**: Парсинг расписания экзаменов преподавателя

**HTML Structure** (expected):
```html
<table class="table-exams">
  <tr>
    <td>15.06.2026</td>
    <td>10:00</td>
    <td>Автоматизированные системы управления (экзамен)</td>
    <td>405, Главный корпус</td>
    <td>АСУ-41</td>
  </tr>
</table>
```

#### 2.3 Department Parser (task=11)
**URL**: `https://www.madi.ru/tplan/r/?task=11`
**Purpose**: Парсинг информации о кафедре

#### 2.4 Group Parser (task=7)
**URL**: `https://www.madi.ru/tplan/r/?task=7`
**Purpose**: Парсинг расписания группы

#### 2.5 Distance Learning Parser (task=15, task=17)
**URL**: `https://www.madi.ru/tplan/r/?task=15` (преподаватели)
**URL**: `https://www.madi.ru/tplan/r/?task=17` (группы)
**Purpose**: Парсинг расписания заочной формы обучения

### 3. HTTP Fetcher

**Purpose**: Выполнение HTTP запросов к сайту MADI с обработкой ошибок и таймаутами.

**Implementation**:
```typescript
async function fetchMADIPage(url: string, timeout: number): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (MADI Schedule Bot)',
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return await response.text()
  } finally {
    clearTimeout(timeoutId)
  }
}
```

### 4. HTML Parser

**Purpose**: Извлечение данных из HTML таблиц расписания.

**Implementation Strategy**:
- Использовать `cheerio` для парсинга HTML на сервере
- Найти таблицу с расписанием по селекторам
- Извлечь строки таблицы и преобразовать в структурированные данные
- Обработать различные форматы (лекции, практики, лабораторные, экзамены)

**Example Selectors**:
```typescript
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
```

### 5. Cache Manager

**Purpose**: Кэширование распарсенных данных для уменьшения нагрузки на сайт MADI.

**Implementation**:
```typescript
interface CacheEntry<T> {
  data: T
  timestamp: Date
  expiresAt: Date
  dataType: 'schedule' | 'exams' | 'department' | 'group'
}

class ScheduleCache {
  private cache: Map<string, CacheEntry<any>> = new Map()
  private maxEntries = 100 // LRU limit
  
  set<T>(key: string, data: T, ttl: number, dataType: string): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.findOldestEntry()
      this.cache.delete(oldestKey)
    }
    
    const now = new Date()
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: new Date(now.getTime() + ttl * 1000),
      dataType
    })
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    if (new Date() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }
  
  clear(dataType?: string): void {
    if (!dataType) {
      this.cache.clear()
      return
    }
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.dataType === dataType) {
        this.cache.delete(key)
      }
    }
  }
  
  private findOldestEntry(): string {
    let oldestKey = ''
    let oldestTime = new Date()
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }
    
    return oldestKey
  }
}
```

### 6. Data Aggregator

**Purpose**: Параллельная загрузка и агрегация всех данных о преподавателе.

**Implementation**:
```typescript
async function aggregateProfessorInfo(
  parser: MADIParser,
  professorName: string,
  date: Date
): Promise<ProfessorInfo> {
  // Параллельная загрузка всех данных
  const [schedule, exams, departments, distanceLearning] = await Promise.allSettled([
    parser.getProfessorSchedule(professorName, date),
    parser.getProfessorExams(professorName),
    parser.getProfessorDepartments(professorName),
    parser.getDistanceLearningSchedule(professorName)
  ])
  
  // Извлечение успешных результатов
  const scheduleData = schedule.status === 'fulfilled' ? schedule.value : null
  const examsData = exams.status === 'fulfilled' ? exams.value : null
  const departmentsData = departments.status === 'fulfilled' ? departments.value : []
  const distanceData = distanceLearning.status === 'fulfilled' ? distanceLearning.value : null
  
  // Объединение расписаний (очное + заочное)
  const mergedSchedule = mergeSchedules(scheduleData, distanceData)
  
  // Извлечение списка групп
  const groups = extractGroups(mergedSchedule, examsData)
  
  return {
    name: professorName,
    departments: departmentsData,
    schedule: mergedSchedule,
    examSchedule: examsData || { professorName, exams: [], source: 'static' },
    groups,
    hasDistanceLearning: distanceData !== null && distanceData.lessons.length > 0
  }
}

function mergeSchedules(
  regular: ParsedSchedule | null,
  distance: ParsedSchedule | null
): ParsedSchedule {
  if (!regular && !distance) {
    return { professorName: '', date: '', dayOfWeek: '', lessons: [], source: 'static' }
  }
  
  if (!distance) return regular!
  if (!regular) return distance
  
  return {
    ...regular,
    lessons: [
      ...regular.lessons,
      ...distance.lessons.map(l => ({ ...l, isDistanceLearning: true }))
    ]
  }
}

function extractGroups(
  schedule: ParsedSchedule,
  exams: ParsedExamSchedule | null
): string[] {
  const groups = new Set<string>()
  
  schedule.lessons.forEach(lesson => {
    if (lesson.group) groups.add(lesson.group)
  })
  
  exams?.exams.forEach(exam => {
    if (exam.group) groups.add(exam.group)
  })
  
  return Array.from(groups).sort()
}
```

### 7. Integration with Schedule Tool

**Purpose**: Интеграция парсера с существующим ScheduleTool для function calling.

**Modification to lib/mcp/tools/schedule.ts**:
```typescript
import { MADIParser } from '@/lib/madi/madi-parser'

export class ScheduleTool {
  private parser: MADIParser | null
  
  constructor() {
    // Initialize parser if enabled
    this.parser = process.env.USE_MADI_PARSER === 'true'
      ? new MADIParser({
          enabled: true,
          cacheTTL: parseInt(process.env.MADI_CACHE_TTL || '3600'),
          requestTimeout: parseInt(process.env.MADI_REQUEST_TIMEOUT || '10000'),
          fallbackToStatic: process.env.MADI_FALLBACK_TO_STATIC !== 'false',
          baseUrl: 'https://www.madi.ru/tplan'
        })
      : null
  }
  
  async execute(params: ScheduleToolParams): Promise<string> {
    const { query_type, date, day_of_week, info_type } = params
    
    // Determine target date
    let targetDate = new Date()
    if (date) {
      targetDate = new Date(date)
    } else if (day_of_week) {
      targetDate = this.getNextDayOfWeek(targetDate, day_of_week)
    }
    
    // Handle different info types
    switch (info_type) {
      case 'schedule':
        return await this.getSchedule(query_type, targetDate)
      
      case 'exams':
        return await this.getExams()
      
      case 'department':
        return await this.getDepartment()
      
      case 'groups':
        return await this.getGroups()
      
      case 'all':
        return await this.getAllInfo(targetDate)
      
      default:
        return await this.getSchedule(query_type, targetDate)
    }
  }
  
  private async getSchedule(queryType: string, date: Date): Promise<string> {
    if (this.parser) {
      try {
        const schedule = await this.parser.getProfessorSchedule('Остроух А.В.', date)
        if (schedule) {
          return this.formatSchedule(schedule, queryType)
        }
      } catch (error) {
        console.error('[ScheduleTool] Parser failed:', error)
      }
    }
    
    // Fallback to static data
    const staticSchedule = await getOstroukhSchedule(date)
    return staticSchedule ? formatScheduleForChat(staticSchedule) : 'Расписание недоступно.'
  }
  
  private async getExams(): Promise<string> {
    if (this.parser) {
      try {
        const exams = await this.parser.getProfessorExams('Остроух А.В.')
        if (exams && exams.exams.length > 0) {
          return this.formatExams(exams)
        }
      } catch (error) {
        console.error('[ScheduleTool] Exam parser failed:', error)
      }
    }
    
    return 'Расписание экзаменов пока не опубликовано.'
  }
  
  private async getDepartment(): Promise<string> {
    if (this.parser) {
      try {
        const departments = await this.parser.getProfessorDepartments('Остроух А.В.')
        if (departments.length > 0) {
          return this.formatDepartments(departments)
        }
      } catch (error) {
        console.error('[ScheduleTool] Department parser failed:', error)
      }
    }
    
    return 'Я работаю на кафедре Автоматизированных систем управления (АСУ) МАДИ.'
  }
  
  private async getGroups(): Promise<string> {
    if (this.parser) {
      try {
        const info = await this.parser.getProfessorInfo('Остроух А.В.', new Date())
        if (info && info.groups.length > 0) {
          return `Я работаю со следующими группами: ${info.groups.join(', ')}`
        }
      } catch (error) {
        console.error('[ScheduleTool] Groups extraction failed:', error)
      }
    }
    
    return 'Я работаю с группами АСУ-21, АСУ-31, АСУ-41.'
  }
  
  private async getAllInfo(date: Date): Promise<string> {
    if (this.parser) {
      try {
        const info = await this.parser.getProfessorInfo('Остроух А.В.', date)
        if (info) {
          return this.formatProfessorInfo(info)
        }
      } catch (error) {
        console.error('[ScheduleTool] Full info aggregation failed:', error)
      }
    }
    
    // Fallback to basic schedule
    return await this.getSchedule('day', date)
  }
  
  // Formatting methods
  private formatSchedule(schedule: ParsedSchedule, queryType: string): string {
    // Implementation similar to existing formatScheduleForChat
    // but with support for distance learning flag
  }
  
  private formatExams(exams: ParsedExamSchedule): string {
    let result = '📝 **Расписание экзаменов:**\n\n'
    exams.exams.forEach(exam => {
      const typeEmoji = exam.type === 'exam' ? '📚' : '✅'
      const typeRu = exam.type === 'exam' ? 'Экзамен' : 'Зачёт'
      result += `${typeEmoji} **${exam.date}** в ${exam.time}\n`
      result += `   ${exam.subject} (${typeRu})\n`
      result += `   📍 ${exam.room}${exam.building ? `, ${exam.building}` : ''}\n`
      if (exam.group) {
        result += `   👥 Группа: ${exam.group}\n`
      }
      if (exam.isDistanceLearning) {
        result += `   🏠 Заочная форма\n`
      }
      result += '\n'
    })
    return result
  }
  
  private formatDepartments(departments: ParsedDepartment[]): string {
    let result = '🏛️ **Кафедры:**\n\n'
    departments.forEach(dept => {
      result += `**${dept.name}**\n`
      if (dept.subjects.length > 0) {
        result += `Дисциплины: ${dept.subjects.join(', ')}\n`
      }
      result += '\n'
    })
    return result
  }
  
  private formatProfessorInfo(info: ProfessorInfo): string {
    let result = `📋 **Полная информация о ${info.name}**\n\n`
    
    // Departments
    if (info.departments.length > 0) {
      result += this.formatDepartments(info.departments)
    }
    
    // Groups
    if (info.groups.length > 0) {
      result += `👥 **Группы:** ${info.groups.join(', ')}\n\n`
    }
    
    // Distance learning
    if (info.hasDistanceLearning) {
      result += `🏠 **Заочная форма:** Да\n\n`
    }
    
    // Schedule
    result += this.formatSchedule(info.schedule, 'day')
    
    // Exams
    if (info.examSchedule.exams.length > 0) {
      result += '\n' + this.formatExams(info.examSchedule)
    }
    
    return result
  }
}
```

**Updated Tool Parameters**:
```typescript
export interface ScheduleToolParams {
  query_type: 'day' | 'week' | 'current'
  date?: string // YYYY-MM-DD format
  day_of_week?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  info_type?: 'schedule' | 'exams' | 'department' | 'groups' | 'all' // NEW
}
```

**Updated Tool Description**:
```typescript
get parameters() {
  return {
    type: 'object',
    properties: {
      query_type: {
        type: 'string',
        enum: ['day', 'week', 'current'],
        description: 'Тип запроса: day - расписание на день, week - на неделю, current - текущая пара'
      },
      date: {
        type: 'string',
        description: 'Дата в формате YYYY-MM-DD (опционально)'
      },
      day_of_week: {
        type: 'string',
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        description: 'День недели (опционально)'
      },
      info_type: {
        type: 'string',
        enum: ['schedule', 'exams', 'department', 'groups', 'all'],
        description: 'Тип информации: schedule - расписание занятий, exams - экзамены, department - кафедра, groups - список групп, all - вся информация'
      }
    },
    required: ['query_type']
  }
}
```

### ParsedLesson
```typescript
interface ParsedLesson {
  time: string           // "9:00-10:30"
  subject: string        // "Автоматизированные системы управления"
  type: 'lecture' | 'practice' | 'lab'
  room: string           // "301"
  building?: string      // "Главный корпус"
  group?: string         // "АСУ-41"
}
```

### ParsedSchedule
```typescript
interface ParsedSchedule {
  professorName: string  // "Остроух А.В."
  date: string           // "2026-02-03"
  dayOfWeek: string      // "Понедельник"
  lessons: ParsedLesson[]
  source: 'madi-parser' | 'static' | 'cache'
  cachedAt?: Date
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Parser returns valid schedule structure
*For any* professor name and date, when the parser successfully fetches data, the returned ParsedSchedule should have non-empty professorName, valid date string, and lessons array (may be empty for days off).
**Validates: Requirements 1.2, 4.1**

### Property 2: Cache respects TTL
*For any* cached schedule entry, if the current time is less than (cachedAt + TTL), then get() should return the cached data; otherwise it should return null.
**Validates: Requirements 2.2, 2.3**

### Property 3: Fallback preserves interface
*For any* schedule request, whether data comes from parser, cache, or static fallback, the returned structure should conform to DaySchedule interface.
**Validates: Requirements 6.2, 6.3**

### Property 4: Error handling never crashes
*For any* network error, parsing error, or timeout, the system should catch the error, log it, and return either cached data or static data - never throw unhandled exception.
**Validates: Requirements 5.1, 5.2, 5.3, 5.5**

### Property 5: Lesson type inference is consistent
*For any* lesson without explicit type, if the subject contains "лекция" then type should be "lecture", if it contains "практика" then "practice", if it contains "лабораторная" then "lab", otherwise default to "lecture".
**Validates: Requirements 4.3**

### Property 6: Cache key uniqueness
*For any* two different (professor, date) pairs, the cache keys should be different to prevent data collision.
**Validates: Requirements 2.1**

### Property 7: Timeout enforcement
*For any* HTTP request, if the request takes longer than requestTimeout milliseconds, the request should be aborted and error should be thrown.
**Validates: Requirements 5.3**

### Property 8: Configuration validation
*For any* MADIParserConfig, if enabled is false, then getProfessorSchedule should immediately return null without making HTTP requests.
**Validates: Requirements 7.2**

## Error Handling

### Network Errors
- **Timeout**: Abort request after configured timeout, return cached data or error
- **Connection Failed**: Log error, return cached data or static fallback
- **HTTP 4xx/5xx**: Log status code, return cached data or static fallback
- **Rate Limiting**: Implement exponential backoff, max 3 retries

### Parsing Errors
- **Invalid HTML**: Log error with HTML snippet, return cached data
- **Missing Elements**: Use default values, log warning
- **Unexpected Structure**: Log error, attempt partial parsing, fallback if critical

### Cache Errors
- **Memory Limit**: Implement LRU eviction (max 100 entries)
- **Corrupted Data**: Clear cache entry, re-fetch from source

### Fallback Strategy
```
1. Try MADI Parser
   ↓ (on error)
2. Try Cache (even if stale)
   ↓ (on error)
3. Use Static Data
   ↓ (always succeeds)
4. Return schedule
```

## Testing Strategy

### Unit Tests
- Test HTML parsing with various table structures
- Test cache TTL expiration logic
- Test error handling for network failures
- Test lesson type inference
- Test date formatting and day of week calculation

### Property-Based Tests
- Property 1: Parser output structure validation (100+ random professor/date combinations)
- Property 2: Cache TTL correctness (100+ random timestamps)
- Property 3: Interface consistency across all data sources
- Property 4: Error handling never crashes (100+ random error scenarios)
- Property 5: Lesson type inference consistency (100+ random subject names)
- Property 6: Cache key uniqueness (100+ random professor/date pairs)
- Property 7: Timeout enforcement (simulate slow responses)
- Property 8: Configuration validation (various config combinations)

### Integration Tests
- Test full flow: fetch → parse → cache → return
- Test fallback chain: parser fails → cache → static
- Test with real MADI site (mark as optional, may fail if site is down)
- Test concurrent requests (ensure cache thread-safety)

### Manual Testing
- Verify parsed data matches actual MADI site
- Test with different professors
- Test with different dates (weekdays, weekends, holidays)
- Verify cache behavior in browser dev tools

## Performance Considerations

- **Caching**: Reduce MADI site load, improve response time (target: <100ms for cached data)
- **Timeout**: Prevent hanging requests (10s default)
- **Concurrent Requests**: Use cache to handle multiple simultaneous requests
- **Memory**: Limit cache size to 100 entries (LRU eviction)
- **Parsing**: Use efficient HTML parser (cheerio or native DOMParser)

## Security Considerations

- **User-Agent**: Identify as bot to be respectful to MADI site
- **Rate Limiting**: Implement delays between requests to avoid overwhelming site
- **Input Validation**: Sanitize professor names to prevent injection attacks
- **Error Messages**: Don't expose internal URLs or stack traces to end users
- **HTTPS**: Always use HTTPS for requests to MADI site

## Deployment Notes

### Environment Variables
```bash
# Enable MADI parser
USE_MADI_PARSER=true

# Cache TTL in seconds (default: 3600 = 1 hour)
MADI_CACHE_TTL=3600

# Request timeout in milliseconds (default: 10000 = 10 seconds)
MADI_REQUEST_TIMEOUT=10000

# Fallback to static data on error (default: true)
MADI_FALLBACK_TO_STATIC=true
```

### Dependencies
```json
{
  "cheerio": "^1.0.0-rc.12"  // HTML parsing
}
```

### Monitoring
- Log all parser operations with timestamps
- Track cache hit/miss ratio
- Monitor MADI site availability
- Alert on repeated parser failures

## Future Enhancements

1. **Database Caching**: Move from memory cache to Redis/database for persistence
2. **Multiple Professors**: Support parsing schedules for any professor, not just Остроух
3. **Student Schedules**: Add support for parsing student group schedules
4. **Exam Schedules**: Parse exam schedules in addition to regular classes
5. **Change Detection**: Notify when schedule changes
6. **Offline Mode**: Store last known good schedule for offline access
7. **API Endpoint**: Expose parser as standalone API endpoint
8. **Admin Dashboard**: UI for monitoring parser status and cache


## Data Models

### ParsedLesson
```typescript
interface ParsedLesson {
  time: string           // "9:00-10:30"
  subject: string        // "Автоматизированные системы управления"
  type: 'lecture' | 'practice' | 'lab'
  room: string           // "301"
  building?: string      // "Главный корпус"
  group?: string         // "АСУ-41"
  isDistanceLearning?: boolean // true для заочной формы
}
```

### ParsedExam
```typescript
interface ParsedExam {
  date: string           // "2026-06-15"
  time: string           // "10:00"
  subject: string        // "Автоматизированные системы управления"
  type: 'exam' | 'test'  // экзамен или зачёт
  room: string           // "405"
  building?: string      // "Главный корпус"
  group?: string         // "АСУ-41"
  isDistanceLearning?: boolean
}
```

### ParsedDepartment
```typescript
interface ParsedDepartment {
  name: string           // "Кафедра АСУ"
  professors: string[]   // ["Остроух А.В.", "Иванов И.И."]
  subjects: string[]     // ["АСУ ТП", "Робототехника"]
}
```

### ParsedSchedule
```typescript
interface ParsedSchedule {
  professorName: string  // "Остроух А.В."
  date: string           // "2026-02-03"
  dayOfWeek: string      // "Понедельник"
  lessons: ParsedLesson[]
  source: 'madi-parser' | 'static' | 'cache'
  cachedAt?: Date
}
```

### ParsedExamSchedule
```typescript
interface ParsedExamSchedule {
  professorName: string
  exams: ParsedExam[]
  source: 'madi-parser' | 'static' | 'cache'
  cachedAt?: Date
}
```

### ProfessorInfo
```typescript
interface ProfessorInfo {
  name: string
  departments: ParsedDepartment[]
  schedule: ParsedSchedule
  examSchedule: ParsedExamSchedule
  groups: string[]       // ["АСУ-21", "АСУ-31", "АСУ-41"]
  hasDistanceLearning: boolean
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Parser returns valid schedule structure
*For any* professor name and date, when the parser successfully fetches data, the returned ParsedSchedule should have non-empty professorName, valid date string, and lessons array (may be empty for days off).
**Validates: Requirements 1.2, 4.1**

### Property 2: Cache respects TTL
*For any* cached entry, if the current time is less than (cachedAt + TTL), then get() should return the cached data; otherwise it should return null.
**Validates: Requirements 2.2, 2.3**

### Property 3: Fallback preserves interface
*For any* schedule request, whether data comes from parser, cache, or static fallback, the returned structure should conform to the expected interface.
**Validates: Requirements 6.2, 6.3**

### Property 4: Error handling never crashes
*For any* network error, parsing error, or timeout, the system should catch the error, log it, and return either cached data or static data - never throw unhandled exception.
**Validates: Requirements 5.1, 5.2, 5.3, 5.5**

### Property 5: Lesson type inference is consistent
*For any* lesson without explicit type, if the subject contains "лекция" then type should be "lecture", if it contains "практика" then "practice", if it contains "лабораторная" then "lab", otherwise default to "lecture".
**Validates: Requirements 4.3**

### Property 6: Cache key uniqueness
*For any* two different (professor, date, dataType) tuples, the cache keys should be different to prevent data collision.
**Validates: Requirements 2.1**

### Property 7: Timeout enforcement
*For any* HTTP request, if the request takes longer than requestTimeout milliseconds, the request should be aborted and error should be thrown.
**Validates: Requirements 5.3**

### Property 8: Configuration validation
*For any* MADIParserConfig, if enabled is false, then all get methods should immediately return null without making HTTP requests.
**Validates: Requirements 7.2**

### Property 9: Parallel aggregation consistency
*For any* professor info request, if some data sources fail, the returned ProfessorInfo should contain partial data from successful sources and empty arrays/objects for failed sources.
**Validates: Requirements 9.3**

### Property 10: Distance learning flag consistency
*For any* lesson marked with isDistanceLearning=true, it should have been fetched from task=15 or task=17 endpoints.
**Validates: Requirements 5.2, 5.4**

### Property 11: Group extraction completeness
*For any* ProfessorInfo, the groups array should contain all unique group names from both schedule.lessons and examSchedule.exams.
**Validates: Requirements 9.2**

### Property 12: Exam type inference
*For any* exam, if the subject contains "экзамен" then type should be "exam", if it contains "зачёт" or "зачет" then "test", otherwise default to "exam".
**Validates: Requirements 2.2**

## Error Handling

### Network Errors
- **Timeout**: Abort request after configured timeout, return cached data or error
- **Connection Failed**: Log error, return cached data or static fallback
- **HTTP 4xx/5xx**: Log status code, return cached data or static fallback
- **Rate Limiting**: Implement exponential backoff, max 3 retries

### Parsing Errors
- **Invalid HTML**: Log error with HTML snippet, return cached data
- **Missing Elements**: Use default values, log warning
- **Unexpected Structure**: Log error, attempt partial parsing, fallback if critical

### Cache Errors
- **Memory Limit**: Implement LRU eviction (max 100 entries)
- **Corrupted Data**: Clear cache entry, re-fetch from source

### Aggregation Errors
- **Partial Failure**: Return successful data sources, log failures
- **Complete Failure**: Return cached aggregate or static data

### Fallback Strategy
```
1. Try MADI Parser (parallel for aggregation)
   ↓ (on error)
2. Try Cache (even if stale)
   ↓ (on error)
3. Use Static Data
   ↓ (always succeeds)
4. Return data
```

## Testing Strategy

### Unit Tests
- Test HTML parsing with various table structures
- Test cache TTL expiration logic
- Test error handling for network failures
- Test lesson type inference
- Test exam type inference
- Test date formatting and day of week calculation
- Test group extraction from schedule and exams
- Test distance learning flag handling

### Property-Based Tests
- Property 1: Parser output structure validation (100+ random professor/date combinations)
- Property 2: Cache TTL correctness (100+ random timestamps)
- Property 3: Interface consistency across all data sources
- Property 4: Error handling never crashes (100+ random error scenarios)
- Property 5: Lesson type inference consistency (100+ random subject names)
- Property 6: Cache key uniqueness (100+ random professor/date/type tuples)
- Property 7: Timeout enforcement (simulate slow responses)
- Property 8: Configuration validation (various config combinations)
- Property 9: Parallel aggregation consistency (simulate partial failures)
- Property 10: Distance learning flag consistency
- Property 11: Group extraction completeness
- Property 12: Exam type inference consistency

### Integration Tests
- Test full flow: fetch → parse → cache → return
- Test fallback chain: parser fails → cache → static
- Test with real MADI site (mark as optional, may fail if site is down)
- Test concurrent requests (ensure cache thread-safety)
- Test parallel aggregation with mixed success/failure
- Test all data source endpoints (schedule, exams, department, group, distance learning)

### Manual Testing
- Verify parsed data matches actual MADI site
- Test with different professors
- Test with different dates (weekdays, weekends, holidays)
- Verify cache behavior in browser dev tools
- Test all info_type parameters in ScheduleTool

## Performance Considerations

- **Caching**: Reduce MADI site load, improve response time (target: <100ms for cached data)
- **Timeout**: Prevent hanging requests (10s default)
- **Parallel Aggregation**: Load all data sources simultaneously (target: <3s for full info)
- **Concurrent Requests**: Use cache to handle multiple simultaneous requests
- **Memory**: Limit cache size to 100 entries (LRU eviction)
- **Parsing**: Use efficient HTML parser (cheerio)

## Security Considerations

- **User-Agent**: Identify as bot to be respectful to MADI site
- **Rate Limiting**: Implement delays between requests to avoid overwhelming site
- **Input Validation**: Sanitize professor names to prevent injection attacks
- **Error Messages**: Don't expose internal URLs or stack traces to end users
- **HTTPS**: Always use HTTPS for requests to MADI site
- **Cache Poisoning**: Validate parsed data before caching

## Deployment Notes

### Environment Variables
```bash
# Enable MADI parser
USE_MADI_PARSER=true

# Cache TTL in seconds (default: 3600 = 1 hour)
MADI_CACHE_TTL=3600

# Request timeout in milliseconds (default: 10000 = 10 seconds)
MADI_REQUEST_TIMEOUT=10000

# Fallback to static data on error (default: true)
MADI_FALLBACK_TO_STATIC=true
```

### Dependencies
```json
{
  "cheerio": "^1.0.0-rc.12"  // HTML parsing
}
```

### Monitoring
- Log all parser operations with timestamps
- Track cache hit/miss ratio by data type
- Monitor MADI site availability
- Alert on repeated parser failures
- Track aggregation success rate

## Future Enhancements

1. **Database Caching**: Move from memory cache to Redis/database for persistence
2. **Multiple Professors**: Support parsing schedules for any professor, not just Остроух
3. **Student Schedules**: Add support for parsing student group schedules
4. **Change Detection**: Notify when schedule changes
5. **Offline Mode**: Store last known good schedule for offline access
6. **API Endpoint**: Expose parser as standalone API endpoint
7. **Admin Dashboard**: UI for monitoring parser status and cache
8. **Webhook Integration**: Push schedule updates to external systems
9. **Calendar Export**: Export schedule to iCal/Google Calendar format
10. **Mobile App Integration**: Provide optimized API for mobile apps
