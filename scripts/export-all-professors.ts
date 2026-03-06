/**
 * Экспорт расписания для ВСЕХ преподавателей МАДИ
 * 
 * Использование:
 * npx tsx scripts/export-all-professors.ts
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

interface ProfessorSchedule {
  professor: string
  semester: string
  exportDate: string
  lessons: Lesson[]
}

// ============================================================================
// Конфигурация
// ============================================================================

const CONFIG = {
  url: 'https://raspisanie.madi.ru/tplan/',
  outputDir: 'ai-study-agent-main/user-files/madi-export',
  headless: false,
  timeout: 30000,
  delayBetweenRequests: 2000 // 2 секунды между запросами
}

// ============================================================================
// Функции парсинга
// ============================================================================

async function getAllProfessors(page: any): Promise<string[]> {
  console.log('📋 Получаем список всех преподавателей...')
  
  const professors = await page.evaluate(() => {
    const select = document.querySelector('select[name="prep"]')
    if (!select) return []
    
    const options = Array.from(select.querySelectorAll('option'))
    return options
      .map(opt => opt.textContent?.trim() || '')
      .filter(name => name && name !== '' && name !== 'Выберите преподавателя')
  })
  
  console.log(`✅ Найдено преподавателей: ${professors.length}`)
  return professors
}

async function getProfessorSchedule(page: any, professorName: string): Promise<Lesson[]> {
  console.log(`  📊 Загружаем расписание для: ${professorName}`)
  
  try {
    // Выбираем преподавателя
    await page.selectOption('select[name="prep"]', { label: professorName })
    
    // Нажимаем кнопку
    const submitButton = page.locator('input[type="submit"], button[type="submit"]').first()
    await submitButton.click()
    
    // Ждем загрузки
    await page.waitForSelector('table', { timeout: 10000 })
    
    // Парсим таблицу
    const lessons = await page.evaluate(() => {
      const results: any[] = []
      let currentDay = ''
      
      const tables = document.querySelectorAll('table')
      
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr')
        
        rows.forEach((row, index) => {
          if (index === 0) {
            const headerText = row.textContent?.trim() || ''
            if (headerText.match(/Понедельник|Вторник|Среда|Четверг|Пятница|Суббота/)) {
              currentDay = headerText
            }
            return
          }
          
          const cells = row.querySelectorAll('td')
          
          if (cells.length >= 4) {
            const timeText = cells[0]?.textContent?.trim() || ''
            const groupText = cells[1]?.textContent?.trim() || ''
            const subjectText = cells[2]?.textContent?.trim() || ''
            const typeText = cells[3]?.textContent?.trim() || ''
            const periodicityText = cells[4]?.textContent?.trim() || ''
            const roomText = cells[5]?.textContent?.trim() || ''
            
            if (!timeText || !subjectText) return
            
            results.push({
              day: currentDay,
              time: timeText,
              group: groupText,
              subject: subjectText,
              type: typeText,
              periodicity: periodicityText,
              room: roomText
            })
          }
        })
      })
      
      return results
    })
    
    console.log(`  ✅ Найдено занятий: ${lessons.length}`)
    return lessons
    
  } catch (error) {
    console.error(`  ❌ Ошибка для ${professorName}:`, error)
    return []
  }
}

// ============================================================================
// Главная функция
// ============================================================================

async function exportAllProfessors() {
  console.log('🚀 Запуск массового экспорта расписания МАДИ...')
  
  const browser = await chromium.launch({ 
    headless: CONFIG.headless,
    timeout: CONFIG.timeout
  })
  
  try {
    const page = await browser.newPage()
    
    // Открываем страницу
    console.log('🌐 Открываем страницу расписания...')
    await page.goto(CONFIG.url, { waitUntil: 'networkidle' })
    
    // Выбираем учебный год и семестр
    console.log('📅 Выбираем учебный год и семестр...')
    await page.selectOption('select[name="year"]', '2025-2026')
    await page.check('input[value="Весенний"]')
    
    // Получаем список всех преподавателей
    const professors = await getAllProfessors(page)
    
    if (professors.length === 0) {
      console.error('❌ Не удалось получить список преподавателей')
      return
    }
    
    // Создаем директорию для экспорта
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true })
    }
    
    // Экспортируем расписание для каждого преподавателя
    const allSchedules: ProfessorSchedule[] = []
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < professors.length; i++) {
      const professor = professors[i]
      console.log(`\n[${i + 1}/${professors.length}] Обрабатываем: ${professor}`)
      
      try {
        const lessons = await getProfessorSchedule(page, professor)
        
        const schedule: ProfessorSchedule = {
          professor,
          semester: '2025-2026 Весенний',
          exportDate: new Date().toISOString(),
          lessons
        }
        
        allSchedules.push(schedule)
        
        // Сохраняем индивидуальный файл
        const fileName = professor.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
        const filePath = path.join(CONFIG.outputDir, `${fileName}.json`)
        fs.writeFileSync(filePath, JSON.stringify(schedule, null, 2), 'utf-8')
        
        successCount++
        
        // Задержка между запросами
        if (i < professors.length - 1) {
          await page.waitForTimeout(CONFIG.delayBetweenRequests)
        }
        
      } catch (error) {
        console.error(`  ❌ Ошибка при обработке ${professor}:`, error)
        errorCount++
      }
    }
    
    // Сохраняем общий файл со всеми расписаниями
    const allSchedulesPath = path.join(CONFIG.outputDir, 'all-schedules.json')
    fs.writeFileSync(allSchedulesPath, JSON.stringify(allSchedules, null, 2), 'utf-8')
    
    console.log('\n' + '='.repeat(60))
    console.log('📊 Статистика экспорта:')
    console.log(`  ✅ Успешно: ${successCount}`)
    console.log(`  ❌ Ошибок: ${errorCount}`)
    console.log(`  📁 Всего файлов: ${successCount + 1}`)
    console.log(`  💾 Общий файл: ${allSchedulesPath}`)
    console.log('='.repeat(60))
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error)
    throw error
  } finally {
    await browser.close()
    console.log('✅ Браузер закрыт')
  }
}

// ============================================================================
// Запуск
// ============================================================================

exportAllProfessors()
  .then(() => {
    console.log('\n🎉 Массовый экспорт завершен успешно!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Экспорт завершился с ошибкой:', error)
    process.exit(1)
  })
