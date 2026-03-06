# MADI Mass Schedule Export Implementation Plan

> **Для Kiro:** ОБЯЗАТЕЛЬНО: Используй субагентов для реализации этого плана задача за задачей.

**Цель:** Автоматически экспортировать расписание всех преподавателей с сайта МАДИ используя Playwright

**Архитектура:** Playwright открывает браузер, перебирает всех преподавателей из dropdown, для каждого извлекает HTML расписания, парсит существующим парсером, сохраняет JSON файлы + создает сводный Excel

**Технологии:** TypeScript, Playwright, Cheerio, ExcelJS

---

## Задача 1: Создать Playwright скрипт для извлечения списка преподавателей

**Файлы:**
- Создать: `scripts/playwright-export-all.ts`

**Шаг 1: Создать базовую структуру скрипта**

```typescript
import { chromium } from 'playwright'
import * as cheerio from 'cheerio'
import * as fs from 'fs'
import * as path from 'path'

interface Professor {
  id: string
  name: string
}

async function main() {
  console.log('🚀 Запуск массового экспорта расписаний МАДИ\n')
  
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    // Загружаем главную страницу
    console.log('📥 Загрузка главной страницы...')
    await page.goto('https://raspisanie.madi.ru/tplan/', { waitUntil: 'networkidle' })
    
    // TODO: Извлечь список преподавателей
    
  } finally {
    await browser.close()
  }
}

main().catch(console.error)
```

**Шаг 2: Добавить функцию извлечения списка преподавателей**

```typescript
async function extractProfessors(page: any): Promise<Professor[]> {
  console.log('🔍 Извлечение списка преподавателей...')
  
  // Ждем загрузки select элемента
  await page.waitForSelector('select#prepChoose, select[name="prepod"]', { timeout: 10000 })
  
  // Получаем HTML select элемента
  const selectHTML = await page.innerHTML('select#prepChoose, select[name="prepod"]')
  
  // Парсим с помощью cheerio
  const $ = cheerio.load(selectHTML)
  const professors: Professor[] = []
  
  $('option').each((i, elem) => {
    const $option = $(elem)
    const id = $option.attr('value')
    const name = $option.text().trim()
    
    if (id && name && id !== '0' && !name.includes('Выберите')) {
      professors.push({ id, name })
    }
  })
  
  console.log(`✅ Найдено преподавателей: ${professors.length}`)
  return professors
}
```

**Шаг 3: Интегрировать в main**

Добавить в main после загрузки страницы:
```typescript
const professors = await extractProfessors(page)

if (professors.length === 0) {
  throw new Error('Не найдено ни одного преподавателя')
}
```

**Шаг 4: Запустить и проверить**

Команда: `npx tsx scripts/playwright-export-all.ts`
Ожидается: Браузер открывается, выводится количество найденных преподавателей

---

## Задача 2: Добавить функцию получения расписания одного преподавателя

**Файлы:**
- Изменить: `scripts/playwright-export-all.ts`

**Шаг 1: Создать функцию выбора преподавателя и получения HTML**

```typescript
async function getProfessorScheduleHTML(page: any, professorId: string): Promise<string> {
  // Выбираем преподавателя в dropdown
  await page.selectOption('select#prepChoose, select[name="prepod"]', professorId)
  
  // Ждем загрузки расписания (таблица появляется)
  await page.waitForSelector('table.timetable', { timeout: 5000 }).catch(() => {
    // Если таблицы нет - значит нет расписания
    return null
  })
  
  // Получаем HTML всей страницы
  const html = await page.content()
  
  return html
}
```

**Шаг 2: Создать функцию парсинга (переиспользуем логику из parse-ostroukh-html.ts)**

```typescript
interface Lesson {
  day: string
  time: string
  group: string
  subject: string
  type: string
  periodicity: string
  room: string
}

function parseScheduleHTML(html: string): Lesson[] {
  const $ = cheerio.load(html)
  const lessons: Lesson[] = []
  let currentDay = ''
  
  $('table.timetable tr').each((i, row) => {
    const $row = $(row)
    
    const dayHeader = $row.find('th[colspan="6"]').text().trim()
    if (dayHeader) {
      currentDay = dayHeader
      return
    }
    
    if ($row.find('b').length > 0) {
      return
    }
    
    const cells = $row.find('td')
    if (cells.length === 6) {
      const lesson: Lesson = {
        day: currentDay,
        time: $(cells[0]).text().trim(),
        group: $(cells[1]).text().trim(),
        subject: $(cells[2]).text().trim(),
        type: $(cells[3]).text().trim(),
        periodicity: $(cells[4]).text().trim(),
        room: $(cells[5]).text().trim()
      }
      
      if (lesson.time && lesson.subject) {
        lessons.push(lesson)
      }
    }
  })
  
  return lessons
}
```

**Шаг 3: Добавить тестовый вызов в main**

После извлечения списка преподавателей:
```typescript
// Тестируем на первом преподавателе
console.log(`\n🧪 Тест на преподавателе: ${professors[0].name}`)
const testHTML = await getProfessorScheduleHTML(page, professors[0].id)
const testLessons = parseScheduleHTML(testHTML)
console.log(`  Найдено занятий: ${testLessons.length}`)
```

**Шаг 4: Запустить и проверить**

Команда: `npx tsx scripts/playwright-export-all.ts`
Ожидается: Выбирается первый преподаватель, выводится количество занятий

---

## Задача 3: Добавить цикл обработки всех преподавателей с сохранением JSON

**Файлы:**
- Изменить: `scripts/playwright-export-all.ts`

**Шаг 1: Создать функцию сохранения JSON**

```typescript
interface ScheduleData {
  professor: string
  professorId: string
  semester: string
  exportDate: string
  lessons: Lesson[]
}

function saveJSON(data: ScheduleData, outputDir: string): string {
  const fileName = `${data.professor.replace(/[\/\\:*?"<>|]/g, '-')}.json`
  const filePath = path.join(outputDir, fileName)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  return filePath
}
```

**Шаг 2: Добавить цикл обработки всех преподавателей**

Заменить тестовый вызов на:
```typescript
// Создаем директории
const outputDir = path.join(process.cwd(), 'user-files/madi-export/professors')
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

const allSchedules: ScheduleData[] = []
let successCount = 0
let emptyCount = 0
let errorCount = 0

// Обрабатываем каждого преподавателя
for (let i = 0; i < professors.length; i++) {
  const prof = professors[i]
  console.log(`\n[${i + 1}/${professors.length}] ${prof.name}`)
  
  try {
    const html = await getProfessorScheduleHTML(page, prof.id)
    const lessons = parseScheduleHTML(html)
    
    if (lessons.length === 0) {
      console.log(`  ⚠️  Нет занятий - пропускаем`)
      emptyCount++
      continue
    }
    
    const scheduleData: ScheduleData = {
      professor: prof.name,
      professorId: prof.id,
      semester: '2025-2026 Весенний',
      exportDate: new Date().toISOString(),
      lessons
    }
    
    saveJSON(scheduleData, outputDir)
    allSchedules.push(scheduleData)
    
    console.log(`  ✅ Занятий: ${lessons.length}`)
    successCount++
    
    // Задержка между запросами
    await page.waitForTimeout(500)
    
  } catch (error) {
    console.error(`  ❌ Ошибка: ${error instanceof Error ? error.message : String(error)}`)
    errorCount++
  }
}

console.log(`\n${'='.repeat(60)}`)
console.log(`Успешно: ${successCount}, Пусто: ${emptyCount}, Ошибок: ${errorCount}`)
```

**Шаг 3: Запустить и проверить**

Команда: `npx tsx scripts/playwright-export-all.ts`
Ожидается: Обрабатываются все преподаватели, создаются JSON файлы

---

## Задача 4: Создать сводный Excel файл

**Файлы:**
- Изменить: `scripts/playwright-export-all.ts`

**Шаг 1: Добавить функцию создания сводного Excel**

```typescript
import ExcelJS from 'exceljs'

async function createSummaryExcel(allSchedules: ScheduleData[], outputPath: string) {
  console.log('\n📊 Создание сводного Excel...')
  
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Все расписания')
  
  // Заголовки
  sheet.columns = [
    { header: 'Преподаватель', key: 'professor', width: 30 },
    { header: 'День', key: 'day', width: 15 },
    { header: 'Время', key: 'time', width: 18 },
    { header: 'Группа', key: 'group', width: 12 },
    { header: 'Дисциплина', key: 'subject', width: 45 },
    { header: 'Вид занятий', key: 'type', width: 25 },
    { header: 'Периодичность', key: 'periodicity', width: 20 },
    { header: 'Аудитория', key: 'room', width: 12 }
  ]
  
  // Стиль заголовков
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  }
  
  // Данные
  for (const schedule of allSchedules) {
    for (const lesson of schedule.lessons) {
      sheet.addRow({
        professor: schedule.professor,
        ...lesson
      })
    }
  }
  
  // Автофильтр
  sheet.autoFilter = {
    from: 'A1',
    to: 'H1'
  }
  
  await workbook.xlsx.writeFile(outputPath)
  console.log(`✅ Excel сохранен: ${outputPath}`)
}
```

**Шаг 2: Вызвать после цикла обработки**

После цикла добавить:
```typescript
// Создаем сводный Excel
if (allSchedules.length > 0) {
  const excelPath = path.join(process.cwd(), 'user-files/madi-export/all-schedules.xlsx')
  await createSummaryExcel(allSchedules, excelPath)
}
```

**Шаг 3: Запустить и проверить**

Команда: `npx tsx scripts/playwright-export-all.ts`
Ожидается: Создается файл `all-schedules.xlsx` со всеми расписаниями

---

## Задача 5: Добавить файл статистики

**Файлы:**
- Изменить: `scripts/playwright-export-all.ts`

**Шаг 1: Создать функцию генерации статистики**

```typescript
interface Summary {
  exportDate: string
  totalProfessors: number
  professorsWithSchedule: number
  professorsWithoutSchedule: number
  errors: number
  totalLessons: number
  byDay: Record<string, number>
  byType: Record<string, number>
  uniqueGroups: string[]
  uniqueSubjects: string[]
}

function generateSummary(allSchedules: ScheduleData[], emptyCount: number, errorCount: number): Summary {
  const allLessons = allSchedules.flatMap(s => s.lessons)
  
  const byDay: Record<string, number> = {}
  const byType: Record<string, number> = {}
  const groups = new Set<string>()
  const subjects = new Set<string>()
  
  for (const lesson of allLessons) {
    byDay[lesson.day] = (byDay[lesson.day] || 0) + 1
    byType[lesson.type] = (byType[lesson.type] || 0) + 1
    groups.add(lesson.group)
    subjects.add(lesson.subject)
  }
  
  return {
    exportDate: new Date().toISOString(),
    totalProfessors: allSchedules.length + emptyCount + errorCount,
    professorsWithSchedule: allSchedules.length,
    professorsWithoutSchedule: emptyCount,
    errors: errorCount,
    totalLessons: allLessons.length,
    byDay,
    byType,
    uniqueGroups: Array.from(groups).sort(),
    uniqueSubjects: Array.from(subjects).sort()
  }
}
```

**Шаг 2: Сохранить статистику**

После создания Excel:
```typescript
// Генерируем и сохраняем статистику
const summary = generateSummary(allSchedules, emptyCount, errorCount)
const summaryPath = path.join(process.cwd(), 'user-files/madi-export/summary.json')
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8')
console.log(`📈 Статистика сохранена: ${summaryPath}`)

// Выводим статистику
console.log('\n📊 ИТОГОВАЯ СТАТИСТИКА')
console.log('='.repeat(60))
console.log(`Всего преподавателей: ${summary.totalProfessors}`)
console.log(`С расписанием: ${summary.professorsWithSchedule}`)
console.log(`Без расписания: ${summary.professorsWithoutSchedule}`)
console.log(`Ошибок: ${summary.errors}`)
console.log(`Всего занятий: ${summary.totalLessons}`)
console.log(`Уникальных групп: ${summary.uniqueGroups.length}`)
console.log(`Уникальных дисциплин: ${summary.uniqueSubjects.length}`)
```

**Шаг 3: Запустить финальную версию**

Команда: `npx tsx scripts/playwright-export-all.ts`
Ожидается: Полный экспорт с JSON файлами, Excel и статистикой

---

## Финальная проверка

После выполнения всех задач проверить:
- ✅ Создана директория `user-files/madi-export/professors/` с JSON файлами
- ✅ Создан файл `user-files/madi-export/all-schedules.xlsx`
- ✅ Создан файл `user-files/madi-export/summary.json`
- ✅ Статистика выводится в консоль
- ✅ Преподаватели без расписания пропускаются
- ✅ Скрипт работает стабильно

