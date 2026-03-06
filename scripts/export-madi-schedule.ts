/**
 * Быстрый экспорт расписания МАДИ через Playwright
 * 
 * Использование:
 * npx tsx scripts/export-madi-schedule.ts
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
  headless: false, // Показываем браузер для отладки
  timeout: 30000,
  professorName: 'Остроух А.В.' // Можно изменить
}

// ============================================================================
// Главная функция
// ============================================================================

async function exportMADISchedule() {
  console.log('🚀 Запуск экспорта расписания МАДИ...')
  console.log(`📋 Преподаватель: ${CONFIG.professorName}`)
  
  const browser = await chromium.launch({ 
    headless: CONFIG.headless,
    timeout: CONFIG.timeout
  })
  
  try {
    const page = await browser.newPage()
    
    // Шаг 1: Открываем страницу
    console.log('🌐 Открываем страницу расписания...')
    await page.goto(CONFIG.url, { waitUntil: 'networkidle' })
    
    // Шаг 2: Выбираем учебный год и семестр
    console.log('📅 Выбираем учебный год и семестр...')
    await page.selectOption('select[name="year"]', '2025-2026')
    await page.check('input[value="Весенний"]')
    
    // Шаг 3: Вводим имя преподавателя
    console.log(`👨‍🏫 Ищем преподавателя: ${CONFIG.professorName}`)
    
    // Проверяем есть ли поле для ввода или select
    const hasInput = await page.locator('input[name="prep"]').count() > 0
    const hasSelect = await page.locator('select[name="prep"]').count() > 0
    
    if (hasSelect) {
      // Если есть выпадающий список
      await page.selectOption('select[name="prep"]', { label: CONFIG.professorName })
    } else if (hasInput) {
      // Если есть поле ввода
      await page.fill('input[name="prep"]', CONFIG.professorName)
    }
    
    // Шаг 4: Нажимаем кнопку поиска/показа
    console.log('🔍 Загружаем расписание...')
    const submitButton = page.locator('input[type="submit"], button[type="submit"]').first()
    await submitButton.click()
    
    // Ждем загрузки таблицы
    await page.waitForSelector('table', { timeout: 10000 })
    
    // Шаг 5: Парсим таблицу расписания
    console.log('📊 Извлекаем данные из таблицы...')
    
    const lessons = await page.evaluate(() => {
      const results: Lesson[] = []
      let currentDay = ''
      
      // Ищем все таблицы на странице
      const tables = document.querySelectorAll('table')
      
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr')
        
        rows.forEach((row, index) => {
          // Пропускаем заголовок
          if (index === 0) {
            const headerText = row.textContent?.trim() || ''
            // Проверяем, не является ли это заголовком дня
            if (headerText.match(/Понедельник|Вторник|Среда|Четверг|Пятница|Суббота/)) {
              currentDay = headerText
            }
            return
          }
          
          const cells = row.querySelectorAll('td')
          
          // Проверяем что это строка с расписанием (минимум 4 колонки)
          if (cells.length >= 4) {
            const timeText = cells[0]?.textContent?.trim() || ''
            const groupText = cells[1]?.textContent?.trim() || ''
            const subjectText = cells[2]?.textContent?.trim() || ''
            const typeText = cells[3]?.textContent?.trim() || ''
            const periodicityText = cells[4]?.textContent?.trim() || ''
            const roomText = cells[5]?.textContent?.trim() || ''
            
            // Пропускаем пустые строки
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
    
    console.log(`✅ Найдено занятий: ${lessons.length}`)
    
    // Шаг 6: Формируем результат
    const schedule: ProfessorSchedule = {
      professor: CONFIG.professorName,
      semester: '2025-2026 Весенний',
      exportDate: new Date().toISOString(),
      lessons
    }
    
    // Шаг 7: Сохраняем в файл
    const outputPath = path.join(CONFIG.outputDir, `${CONFIG.professorName.replace(/\s+/g, '-')}.json`)
    
    // Создаем директорию если не существует
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true })
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(schedule, null, 2), 'utf-8')
    
    console.log(`💾 Расписание сохранено: ${outputPath}`)
    console.log('\n📋 Пример данных:')
    console.log(JSON.stringify(lessons.slice(0, 3), null, 2))
    
    // Делаем скриншот для проверки
    const screenshotPath = path.join(CONFIG.outputDir, `${CONFIG.professorName.replace(/\s+/g, '-')}-screenshot.png`)
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`📸 Скриншот сохранен: ${screenshotPath}`)
    
  } catch (error) {
    console.error('❌ Ошибка при экспорте:', error)
    throw error
  } finally {
    await browser.close()
    console.log('✅ Браузер закрыт')
  }
}

// ============================================================================
// Запуск
// ============================================================================

exportMADISchedule()
  .then(() => {
    console.log('\n🎉 Экспорт завершен успешно!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Экспорт завершился с ошибкой:', error)
    process.exit(1)
  })
