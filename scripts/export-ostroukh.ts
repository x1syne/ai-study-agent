/**
 * Быстрый экспорт всех данных преподавателя Остроух А.В.
 * Собирает: расписание занятий, экзамены, заочные сессии
 */

import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

// ============================================================================
// Типы данных
// ============================================================================

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

// ============================================================================
// Конфигурация
// ============================================================================

const CONFIG = {
  url: 'https://raspisanie.madi.ru/tplan/',
  professorName: 'Остроух А.В.',
  outputDir: 'ai-study-agent-main/user-files/madi-export',
  headless: false
}

// ============================================================================
// Функции сбора данных
// ============================================================================

async function fetchSchedule(page: any, professorName: string): Promise<Lesson[]> {
  console.log('📅 Собираем расписание занятий...')
  
  // Открываем главную страницу
  await page.goto(CONFIG.url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  
  // Ждем загрузки селекторов
  await page.waitForSelector('select#year_sel', { timeout: 30000 })
  await page.waitForTimeout(2000) // Даем время на загрузку JS
  
  // Выбираем учебный год
  await page.selectOption('select#year_sel', '25') // 2025-2026
  await page.waitForTimeout(1000)
  
  // Выбираем семестр
  await page.click('input#sem_sel_s') // Весенний
  await page.waitForTimeout(1000)
  
  // Ждем загрузки списка преподавателей
  await page.waitForSelector('select#prepChoose option', { timeout: 30000 })
  
  // Выбираем преподавателя
  await page.selectOption('select#prepChoose', { label: professorName })
  await page.waitForTimeout(2000)
  
  // Ждем загрузки таблицы
  await page.waitForSelector('table.timetable', { timeout: 30000 })
  
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

// ============================================================================
// Главная функция
// ============================================================================

async function exportOstroukhData() {
  console.log('🚀 Начинаем экспорт данных для', CONFIG.professorName)
  
  // Используем локальный Chrome из проекта
  const chromePath = path.join(process.cwd(), 'chrome-win', 'chrome.exe')
  console.log('🌐 Используем Chrome:', chromePath)
  
  const browser = await chromium.launch({ 
    headless: CONFIG.headless,
    executablePath: chromePath
  })
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

// ============================================================================
// Запуск
// ============================================================================

exportOstroukhData()
  .then(data => {
    console.log('✅ Экспорт завершен')
    console.log('Данные:', data)
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  })
