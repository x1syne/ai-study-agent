# MADI Schedule Parser - Implementation Plan

> **Для Kiro:** ОБЯЗАТЕЛЬНО: Используй субагентов для реализации этого плана задача за задачей.

**Цель:** Реализовать автоматическое обновление расписания МАДИ с персистентностью в PostgreSQL

**Архитектура:** Улучшенный HTML парсер → PostgreSQL (Prisma) → Sync Service (cron) → REST API → UI/MCP integration

**Технологии:** TypeScript, Prisma, PostgreSQL, Cheerio, Node-cron, Next.js API Routes

---

## Задача 1: Создать Prisma модели для расписания

**Файлы:**
- Изменить: `prisma/schema.prisma`
- Создать: `prisma/migrations/YYYYMMDDHHMMSS_add_schedule_models/migration.sql`

**Шаг 1: Добавить модели в schema.prisma**

Добавить в конец файла `prisma/schema.prisma`:

```prisma
// ==================== РАСПИСАНИЕ МАДИ ====================

model Professor {
  id          String    @id @default(cuid())
  name        String    @unique
  departments String[]
  schedules   Schedule[]
  exams       Exam[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Schedule {
  id           String    @id @default(cuid())
  professorId  String
  professor    Professor @relation(fields: [professorId], references: [id])
  date         DateTime
  dayOfWeek    String
  lessons      Lesson[]
  source       String
  lastSyncAt   DateTime
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  @@unique([professorId, date])
  @@index([professorId, date])
}

model Lesson {
  id                 String    @id @default(cuid())
  scheduleId         String
  schedule           Schedule  @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  time               String
  subject            String
  type               String
  room               String
  building           String?
  group              String?
  subgroup           String?
  periodicity        String?
  onlineLink         String?
  notes              String?
  isDistanceLearning Boolean   @default(false)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  
  @@index([scheduleId])
}

model Exam {
  id                 String    @id @default(cuid())
  professorId        String
  professor          Professor @relation(fields: [professorId], references: [id])
  date               DateTime
  time               String
  subject            String
  type               String
  room               String
  building           String?
  group              String?
  isDistanceLearning Boolean   @default(false)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  
  @@index([professorId, date])
}
```

**Шаг 2: Создать миграцию**

Команда: `npx prisma migrate dev --name add_schedule_models`
Ожидается: Migration created successfully

**Шаг 3: Сгенерировать Prisma Client**

Команда: `npx prisma generate`
Ожидается: Prisma Client generated successfully

**Шаг 4: Закоммитить**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Prisma models for MADI schedule"
```

---

## Задача 2: Завершить HTML парсинг функций

**Файлы:**
- Изменить: `lib/madi/madi-parser.ts:400-600`
- Создать: `lib/madi/__tests__/parser.test.ts`

**Описание:** Реализовать полный парсинг `parseSchedulePage()` и `parseExamPage()` с извлечением всех полей

---

## Задача 3: Создать Database Service для работы с расписанием

**Файлы:**
- Создать: `lib/madi/schedule-db.ts`
- Создать: `lib/madi/__tests__/schedule-db.test.ts`

**Описание:** CRUD операции для Schedule, Lesson, Professor через Prisma

---

## Задача 4: Реализовать Change Detection

**Файлы:**
- Создать: `lib/madi/change-detector.ts`
- Создать: `lib/madi/__tests__/change-detector.test.ts`

**Описание:** Сравнение старого и нового расписания, детекция изменений

---

## Задача 5: Создать Sync Service

**Файлы:**
- Создать: `lib/madi/sync-service.ts`
- Создать: `lib/madi/__tests__/sync-service.test.ts`

**Описание:** Оркестрация: fetch → parse → detect changes → update DB

---

## Задача 6: Добавить Cron Job для автоматической синхронизации

**Файлы:**
- Создать: `lib/madi/scheduler.ts`
- Изменить: `instrumentation.ts` (добавить инициализацию cron)

**Описание:** Node-cron для hourly sync

---

## Задача 7: Создать REST API endpoints

**Файлы:**
- Создать: `app/api/schedule/professor/[name]/route.ts`
- Создать: `app/api/schedule/professor/[name]/week/route.ts`
- Создать: `app/api/schedule/professor/[name]/exams/route.ts`
- Создать: `app/api/schedule/sync/route.ts`

**Описание:** GET/POST endpoints для расписания

---

## Задача 8: Обновить MCP Schedule Tool

**Файлы:**
- Изменить: `lib/mcp/tools/schedule.ts`

**Описание:** Использовать БД вместо прямого парсинга

---

## Задача 9: Обновить Schedule API

**Файлы:**
- Изменить: `lib/madi/schedule-api.ts`

**Описание:** Использовать БД как primary source

---

## Задача 10: Добавить UI для расписания

**Файлы:**
- Изменить: `app/(dashboard)/schedule/page.tsx`
- Создать: `components/schedule/professor-schedule.tsx`

**Описание:** Показ расписания профессора с индикатором обновления

---

## Детальные шаги для критических задач

### Задача 2 (детально): Завершить HTML парсинг

**Шаг 1: Напиши тест для parseSchedulePage**

Файл: `lib/madi/__tests__/parser.test.ts`

```typescript
import { parseSchedulePage } from '../madi-parser'
import fs from 'fs'
import path from 'path'

describe('parseSchedulePage', () => {
  test('should parse task-8 HTML correctly', () => {
    const html = fs.readFileSync(
      path.join(__dirname, '../madi-task-8.html'),
      'utf-8'
    )
    
    const result = parseSchedulePage(html, 'Остроух А.В.', new Date('2026-02-12'))
    
    expect(result).toBeDefined()
    expect(result.professorName).toBe('Остроух А.В.')
    expect(result.lessons.length).toBeGreaterThan(0)
    expect(result.lessons[0]).toHaveProperty('time')
    expect(result.lessons[0]).toHaveProperty('subject')
    expect(result.lessons[0]).toHaveProperty('type')
    expect(result.lessons[0]).toHaveProperty('room')
    expect(result.lessons[0]).toHaveProperty('subgroup')
    expect(result.lessons[0]).toHaveProperty('periodicity')
  })
})
```

**Шаг 2: Запусти тест**

Команда: `npm test lib/madi/__tests__/parser.test.ts`
Ожидается: FAIL - parseSchedulePage not fully implemented

**Шаг 3: Реализуй parseSchedulePage**

Файл: `lib/madi/madi-parser.ts` (найти функцию и дополнить)

```typescript
function parseSchedulePage(
  html: string,
  professorName: string,
  date: Date
): ParsedSchedule {
  const $ = cheerio.load(html)
  const lessons: ParsedLesson[] = []
  
  // Найти таблицу расписания
  $('table.schedule tr').each((i, row) => {
    if (i === 0) return // skip header
    
    const cells = $(row).find('td')
    if (cells.length < 4) return
    
    const timeText = $(cells[0]).text().trim()
    const subjectCell = $(cells[1])
    const roomText = $(cells[2]).text().trim()
    const groupText = $(cells[3]).text().trim()
    
    const lesson: ParsedLesson = {
      time: timeText,
      subject: extractSubject(subjectCell.text()),
      type: detectLessonType(subjectCell.text()),
      room: extractRoom(roomText),
      building: extractBuilding(roomText),
      group: extractGroup(groupText),
      subgroup: extractSubgroup(groupText),
      periodicity: extractPeriodicity($(cells[4])?.text() || ''),
      onlineLink: subjectCell.find('a').attr('href'),
      notes: $(cells[5])?.text().trim(),
      isDistanceLearning: subjectCell.text().includes('онлайн')
    }
    
    lessons.push(lesson)
  })
  
  return {
    professorName,
    date: date.toISOString().split('T')[0],
    dayOfWeek: getDayOfWeek(date),
    lessons,
    source: 'madi-parser'
  }
}

// Helper functions
function extractSubject(text: string): string {
  return text.split('(')[0].trim()
}

function detectLessonType(text: string): 'lecture' | 'practice' | 'lab' {
  if (text.includes('лекц')) return 'lecture'
  if (text.includes('лаб')) return 'lab'
  return 'practice'
}

function extractRoom(text: string): string {
  const match = text.match(/ауд\.\s*(\d+)/i)
  return match ? match[1] : text
}

function extractBuilding(text: string): string | undefined {
  const match = text.match(/корп\.\s*(\d+)/i)
  return match ? match[1] : undefined
}

function extractGroup(text: string): string {
  return text.split(',')[0].trim()
}

function extractSubgroup(text: string): string | undefined {
  const match = text.match(/подгр\.\s*(\d+)/i)
  return match ? match[1] : undefined
}

function extractPeriodicity(text: string): string | undefined {
  if (text.includes('числ')) return 'numerator'
  if (text.includes('знам')) return 'denominator'
  if (text.includes('1 раз')) return 'once_a_month'
  return 'weekly'
}

function getDayOfWeek(date: Date): string {
  const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
  return days[date.getDay()]
}
```

**Шаг 4: Запусти тест снова**

Команда: `npm test lib/madi/__tests__/parser.test.ts`
Ожидается: PASS

**Шаг 5: Закоммитить**

```bash
git add lib/madi/madi-parser.ts lib/madi/__tests__/parser.test.ts
git commit -m "feat: complete parseSchedulePage implementation with all fields"
```

---

## Примечания

- Каждая задача должна следовать TDD циклу
- Используй субагентов для параллельной работы над независимыми задачами
- Детальные шаги для остальных задач будут добавлены по мере необходимости
- Приоритет: Задачи 1-5 (база), затем 6-7 (автоматизация), затем 8-10 (интеграция)

---

## План готов!

**Два варианта выполнения:**

**1. Субагенты (эта сессия)** - Запускаю свежего субагента на задачу, ревью между задачами, быстрая итерация

**2. Параллельная сессия (отдельная)** - Открой новую сессию с executing-plans, пакетное выполнение с чекпоинтами

**Какой подход выбираешь?**
