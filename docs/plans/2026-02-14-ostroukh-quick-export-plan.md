# Быстрый экспорт данных Остроух А.В. - Implementation Plan

> **Для Kiro:** ОБЯЗАТЕЛЬНО: Используй субагентов для реализации этого плана задача за задачей.

**Цель:** Экспортировать все данные преподавателя Остроух А.В. (расписание, экзамены, сессии) в JSON и Excel

**Архитектура:** Playwright скрипт → Парсинг HTML → JSON + Excel экспорт

**Технологии:** TypeScript, Playwright, ExcelJS

---

## Задача 1: Создать базовый скрипт для сбора расписания занятий

**Файлы:**
- Создать: `scripts/export-ostroukh.ts`

**Шаг 1: Создать структуру скрипта**

```typescript
import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

interface Lesson {
  day: string
  time: string
  group: string
  subject: string
  type: string
  periodicity: string
  room: string
}

interface ExamSession {
  date: string
  time: string
  group: string
  subject: string
  type: string
  room: string
}

interface ProfessorData {
  professor: string
  exportDate: string
  schedule: Lesson[]
  exams: ExamSession[]
  distanceSessions: ExamSession[]
}

const CONFIG = {
  url: 'https://raspisanie.madi.ru/tplan/',
  professorName: 'Остроух А.В.',
  outputDir: 'ai-study-agent-main/user-files/madi-export',
  headless: false
}

async function exportOstroukhData() {
  console.log('🚀 Начинаем экспорт данных для', CONFIG.professorName)
  
  const browser = await chromium.launch({ headless: CONFIG.headless })
  const page = await browser.newPage()
  
  try {
    // TODO: Реализация
    const data: ProfessorData = {
      professor: CONFIG.professorName,
      exportDate: new Date().toISOString(),
      schedule: [],
      exams: [],
      distanceSessions: []
    }
    
    return data
  } finally {
    await browser.close()
  }
}

exportOstroukhData()
  .then(data => {
    console.log('✅ Экспорт завершен')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  })
```

**Шаг 2: Запустить скрипт для проверки**

Команда: `npx tsx scripts/export-ostroukh.ts`
Ожидается: Браузер открывается и закрывается, выводится "✅ Экспорт завершен"

**Шаг 3: Добавить функцию сбора расписания занятий**

Добавить перед `exportOstroukhData()`:

```typescript
async function fetchSchedule(page: any, professorName: string): Promise<Lesson[]> {
  console.log('📅 Собираем расписание занятий...')
  
  // Открываем главную страницу
  await page.goto(CONFIG.url, { waitUntil: 'networkidle' })
  
  // Выбираем учебный год и семестр
  await page.selectOption('select[name="year"]', '2025-2026')
  await page.check('input[value="Весенний"]')
  
  // Выбираем преподавателя
  const hasSelect = await page.locator('select[name="prep"]').count() > 0
  if (hasSelect) {
    await page.selectOption('select[name="prep"]', { label: professorName })
  }
  
  // Нажимаем кнопку
  await page.click('input[type="submit"]')
  await page.waitForSelector('table', { timeout: 10000 })
  
  // Парсим таблицу
  const lessons = await page.evaluate(() => {
    const results: any[] = []
    let currentDay = ''
    
    document.querySelectorAll('table').forEach(table => {
      table.querySelectorAll('tr').forEach((row, index) => {
        // Проверяем заголовок дня
        const headerText = row.textContent?.trim() || ''
        if (headerText.match(/Понедельник|Вторник|Среда|Четверг|Пятница|Суббота/)) {
          currentDay = headerText.split(/\s+/)[0]
          return
        }
        
        const cells = row.querySelectorAll('td')
        if (cells.length >= 6) {
          const time = cells[0]?.textContent?.trim() || ''
          const group = cells[1]?.textContent?.trim() || ''
          const subject = cells[2]?.textContent?.trim() || ''
          const type = cells[3]?.textContent?.trim() || ''
          const periodicity = cells[4]?.textContent?.trim() || ''
          const room = cells[5]?.textContent?.trim() || ''
          
          if (time && subject) {
            results.push({
              day: currentDay,
              time,
              group,
              subject,
              type,
              periodicity,
              room
            })
          }
        }
      })
    })
    
    return results
  })
  
  console.log(`  ✅ Найдено занятий: ${lessons.length}`)
  return lessons
}
```

**Шаг 4: Использовать функцию в main**

Изменить `exportOstroukhData()`:

```typescript
async function exportOstroukhData() {
  console.log('🚀 Начинаем экспорт данных для', CONFIG.professorName)
  
  const browser = await chromium.launch({ headless: CONFIG.headless })
  const page = await browser.newPage()
  
  try {
    const schedule = await fetchSchedule(page, CONFIG.professorName)
    
    const data: ProfessorData = {
      professor: CONFIG.professorName,
      exportDate: new Date().toISOString(),
      schedule,
      exams: [],
      distanceSessions: []
    }
    
    return data
  } finally {
    await browser.close()
  }
}
```

**Шаг 5: Запустить и проверить**

Команда: `npx tsx scripts/export-ostroukh.ts`
Ожидается: Браузер открывается, загружает расписание, выводит количество найденных занятий

---

## Задача 2: Добавить сбор экзаменов и зачетно-экзаменационных сессий

**Файлы:**
- Изменить: `scripts/export-ostroukh.ts`

**Шаг 1: Добавить функцию сбора экзаменов**

Добавить после `fetchSchedule()`:

```typescript
async function fetchExams(page: any, professorName: string): Promise<ExamSession[]> {
  console.log('📝 Собираем расписание экзаменов...')
  
  // Переходим на страницу экзаменов
  // Вариант 1: Если есть прямая ссылка
  await page.goto('https://raspisanie.madi.ru/tplan/?task=4', { waitUntil: 'networkidle' })
  
  // Выбираем преподавателя
  const hasSelect = await page.locator('select[name="prep"]').count() > 0
  if (hasSelect) {
    await page.selectOption('select[name="prep"]', { label: professorName })
    await page.click('input[type="submit"]')
    await page.waitForSelector('table', { timeout: 10000 })
  }
  
  // Парсим таблицу экзаменов
  const exams = await page.evaluate(() => {
    const results: any[] = []
    
    document.querySelectorAll('table').forEach(table => {
      table.querySelectorAll('tr').forEach((row, index) => {
        if (index === 0) return // skip header
        
        const cells = row.querySelectorAll('td')
        if (cells.length >= 5) {
          const date = cells[0]?.textContent?.trim() || ''
          const time = cells[1]?.textContent?.trim() || ''
          const group = cells[2]?.textContent?.trim() || ''
          const subject = cells[3]?.textContent?.trim() || ''
          const type = cells[4]?.textContent?.trim() || ''
          const room = cells[5]?.textContent?.trim() || ''
          
          if (date && subject) {
            results.push({ date, time, group, subject, type, room })
          }
        }
      })
    })
    
    return results
  })
  
  console.log(`  ✅ Найдено экзаменов: ${exams.length}`)
  return exams
}
```

**Шаг 2: Добавить функцию сбора заочных сессий**

```typescript
async function fetchDistanceSessions(page: any, professorName: string): Promise<ExamSession[]> {
  console.log('🏠 Собираем расписание заочных сессий...')
  
  // Переходим на страницу заочных сессий (task=15)
  await page.goto('https://raspisanie.madi.ru/tplan/?task=15', { waitUntil: 'networkidle' })
  
  // Выбираем преподавателя
  const hasSelect = await page.locator('select[name="prep"]').count() > 0
  if (hasSelect) {
    await page.selectOption('select[name="prep"]', { label: professorName })
    await page.click('input[type="submit"]')
    await page.waitForSelector('table', { timeout: 10000 })
  }
  
  // Парсим таблицу (аналогично экзаменам)
  const sessions = await page.evaluate(() => {
    const results: any[] = []
    
    document.querySelectorAll('table').forEach(table => {
      table.querySelectorAll('tr').forEach((row, index) => {
        if (index === 0) return
        
        const cells = row.querySelectorAll('td')
        if (cells.length >= 5) {
          const date = cells[0]?.textContent?.trim() || ''
          const time = cells[1]?.textContent?.trim() || ''
          const group = cells[2]?.textContent?.trim() || ''
          const subject = cells[3]?.textContent?.trim() || ''
          const type = cells[4]?.textContent?.trim() || ''
          const room = cells[5]?.textContent?.trim() || ''
          
          if (date && subject) {
            results.push({ date, time, group, subject, type, room })
          }
        }
      })
    })
    
    return results
  })
  
  console.log(`  ✅ Найдено сессий: ${sessions.length}`)
  return sessions
}
```

**Шаг 3: Обновить main функцию**

```typescript
async function exportOstroukhData() {
  console.log('🚀 Начинаем экспорт данных для', CONFIG.professorName)
  
  const browser = await chromium.launch({ headless: CONFIG.headless })
  const page = await browser.newPage()
  
  try {
    const schedule = await fetchSchedule(page, CONFIG.professorName)
    const exams = await fetchExams(page, CONFIG.professorName)
    const distanceSessions = await fetchDistanceSessions(page, CONFIG.professorName)
    
    const data: ProfessorData = {
      professor: CONFIG.professorName,
      exportDate: new Date().toISOString(),
      schedule,
      exams,
      distanceSessions
    }
    
    console.log('\n📊 Статистика:')
    console.log(`  Занятий: ${schedule.length}`)
    console.log(`  Экзаменов: ${exams.length}`)
    console.log(`  Заочных сессий: ${distanceSessions.length}`)
    
    return data
  } finally {
    await browser.close()
  }
}
```

**Шаг 4: Запустить и проверить**

Команда: `npx tsx scripts/export-ostroukh.ts`
Ожидается: Собираются все три типа данных, выводится статистика

---

## Задача 3: Экспорт в JSON и Excel

**Файлы:**
- Изменить: `scripts/export-ostroukh.ts`

**Шаг 1: Установить ExcelJS**

Команда: `npm install exceljs`
Ожидается: Package installed successfully

**Шаг 2: Добавить импорт ExcelJS**

В начало файла:

```typescript
import ExcelJS from 'exceljs'
```

**Шаг 3: Создать функцию экспорта в JSON**

```typescript
function saveJSON(data: ProfessorData, outputDir: string): string {
  const fileName = `${data.professor.replace(/\s+/g, '-')}.json`
  const filePath = path.join(outputDir, fileName)
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`💾 JSON сохранен: ${filePath}`)
  
  return filePath
}
```

**Шаг 4: Создать функцию экспорта в Excel**

```typescript
async function saveExcel(data: ProfessorData, outputDir: string): Promise<string> {
  const fileName = `${data.professor.replace(/\s+/g, '-')}.xlsx`
  const filePath = path.join(outputDir, fileName)
  
  const workbook = new ExcelJS.Workbook()
  
  // Лист 1: Расписание занятий
  const scheduleSheet = workbook.addWorksheet('Расписание')
  scheduleSheet.columns = [
    { header: 'День', key: 'day', width: 15 },
    { header: 'Время', key: 'time', width: 15 },
    { header: 'Группа', key: 'group', width: 15 },
    { header: 'Дисциплина', key: 'subject', width: 40 },
    { header: 'Вид', key: 'type', width: 15 },
    { header: 'Периодичность', key: 'periodicity', width: 20 },
    { header: 'Аудитория', key: 'room', width: 15 }
  ]
  scheduleSheet.addRows(data.schedule)
  
  // Лист 2: Экзамены
  const examsSheet = workbook.addWorksheet('Экзамены')
  examsSheet.columns = [
    { header: 'Дата', key: 'date', width: 15 },
    { header: 'Время', key: 'time', width: 15 },
    { header: 'Группа', key: 'group', width: 15 },
    { header: 'Дисциплина', key: 'subject', width: 40 },
    { header: 'Вид', key: 'type', width: 15 },
    { header: 'Аудитория', key: 'room', width: 15 }
  ]
  examsSheet.addRows(data.exams)
  
  // Лист 3: Заочные сессии
  const sessionsSheet = workbook.addWorksheet('Заочные сессии')
  sessionsSheet.columns = [
    { header: 'Дата', key: 'date', width: 15 },
    { header: 'Время', key: 'time', width: 15 },
    { header: 'Группа', key: 'group', width: 15 },
    { header: 'Дисциплина', key: 'subject', width: 40 },
    { header: 'Вид', key: 'type', width: 15 },
    { header: 'Аудитория', key: 'room', width: 15 }
  ]
  sessionsSheet.addRows(data.distanceSessions)
  
  // Стилизация заголовков
  ;[scheduleSheet, examsSheet, sessionsSheet].forEach(sheet => {
    sheet.getRow(1).font = { bold: true }
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    }
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  })
  
  await workbook.xlsx.writeFile(filePath)
  console.log(`📊 Excel сохранен: ${filePath}`)
  
  return filePath
}
```

**Шаг 5: Обновить main функцию для сохранения**

```typescript
exportOstroukhData()
  .then(async data => {
    console.log('\n💾 Сохраняем данные...')
    
    const jsonPath = saveJSON(data, CONFIG.outputDir)
    const excelPath = await saveExcel(data, CONFIG.outputDir)
    
    console.log('\n✅ Экспорт завершен успешно!')
    console.log(`📁 JSON: ${jsonPath}`)
    console.log(`📁 Excel: ${excelPath}`)
    
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  })
```

**Шаг 6: Финальный запуск**

Команда: `npx tsx scripts/export-ostroukh.ts`
Ожидается: 
- Браузер собирает все данные
- Создаются файлы JSON и Excel
- Выводятся пути к файлам

---

## План готов!

**Два варианта выполнения:**

**1. Субагенты (эта сессия)** - Запускаю свежего субагента на задачу, ревью между задачами, быстрая итерация

**2. Я выполню сам** - Выполню все задачи последовательно прямо сейчас

**Какой подход выбираешь?**
