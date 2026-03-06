/**
 * HTTP-based скрипт для экспорта расписаний всех преподавателей
 * Использует прямые HTTP запросы вместо Playwright
 */

import * as cheerio from 'cheerio'
import * as fs from 'fs'
import * as path from 'path'
import ExcelJS from 'exceljs'

interface Lesson {
  day: string
  time: string
  group: string
  subject: string
  type: string
  periodicity: string
  room: string
}

interface Professor {
  id: string
  name: string
}

interface ScheduleData {
  professor: string
  professorId: string
  semester: string
  exportDate: string
  lessons: Lesson[]
}

const BASE_URL = 'https://raspisanie.madi.ru/tplan'
const DELAY_MS = 1000 // Задержка между запросами

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchMainPage(): Promise<string> {
  console.log('📥 Загружаем главную страницу...')
  const response = await fetch(BASE_URL)
  return await response.text()
}

async function extractProfessors(html: string): Promise<Professor[]> {
  console.log('🔍 Извлекаем список преподавателей...')
  const $ = cheerio.load(html)
  const professors: Professor[] = []
  
  // Ищем select с преподавателями
  $('select#prepChoose option, select[name="prepod"] option').each((i, elem) => {
    const $option = $(elem)
    const id = $option.attr('value')
    const name = $option.text().trim()
    
    if (id && name && id !== '0' && name !== 'Выберите преподавателя') {
      professors.push({ id, name })
    }
  })
  
  console.log(`✅ Найдено преподавателей: ${professors.length}`)
  return professors
}

async function fetchProfessorSchedule(professorId: string): Promise<string> {
  // Пробуем разные варианты URL
  const urls = [
    `${BASE_URL}/r/?task=8&prepod_id=${professorId}`,
    `${BASE_URL}/?prepod=${professorId}`,
    `${BASE_URL}/index.php?prepod=${professorId}`
  ]
  
  for (const url of urls) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return await response.text()
      }
    } catch (e) {
      // Пробуем следующий URL
    }
  }
  
  throw new Error(`Не удалось загрузить расписание для ID ${professorId}`)
}

function parseScheduleHTML(html: string, professorName: string, professorId: string): ScheduleData {
  const $ = cheerio.load(html)
  const lessons: Lesson[] = []
  let currentDay = ''
  
  $('table.timetable tr').each((i, row) => {
    const $row = $(row)
    
    // Проверяем заголовок дня
    const dayHeader = $row.find('th[colspan="6"]').text().trim()
    if (dayHeader) {
      currentDay = dayHeader
      return
    }
    
    // Пропускаем заголовок таблицы
    if ($row.find('b').length > 0) {
      return
    }
    
    // Извлекаем данные занятия
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
  
  return {
    professor: professorName,
    professorId,
    semester: '2025-2026 Весенний',
    exportDate: new Date().toISOString(),
    lessons
  }
}

async function exportToJSON(data: ScheduleData, outputDir: string) {
  const fileName = `${data.professor.replace(/[\/\\:*?"<>|]/g, '-')}.json`
  const filePath = path.join(outputDir, fileName)
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  return filePath
}

async function main() {
  console.log('🚀 Начинаем экспорт расписаний всех преподавателей\n')
  
  try {
    // 1. Загружаем главную страницу
    const mainPageHTML = await fetchMainPage()
    
    // 2. Извлекаем список преподавателей
    const professors = await extractProfessors(mainPageHTML)
    
    if (professors.length === 0) {
      console.error('❌ Не найдено ни одного преподавателя')
      console.log('\n💡 Попробуйте сохранить HTML главной страницы и проверить селекторы')
      
      // Сохраняем HTML для анализа
      const debugPath = path.join(process.cwd(), 'lib/madi/main-page-debug.html')
      fs.writeFileSync(debugPath, mainPageHTML, 'utf-8')
      console.log(`📄 HTML сохранен для анализа: ${debugPath}`)
      
      return
    }
    
    // Создаем директорию для экспорта
    const outputDir = path.join(process.cwd(), 'user-files/madi-export/all-professors')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    
    // 3. Экспортируем расписание каждого преподавателя
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < professors.length; i++) {
      const prof = professors[i]
      console.log(`\n[${i + 1}/${professors.length}] ${prof.name} (ID: ${prof.id})`)
      
      try {
        // Загружаем расписание
        const scheduleHTML = await fetchProfessorSchedule(prof.id)
        
        // Парсим
        const scheduleData = parseScheduleHTML(scheduleHTML, prof.name, prof.id)
        
        // Сохраняем
        const jsonPath = await exportToJSON(scheduleData, outputDir)
        
        console.log(`  ✅ Занятий: ${scheduleData.lessons.length}`)
        console.log(`  💾 Сохранено: ${path.basename(jsonPath)}`)
        
        successCount++
        
      } catch (error) {
        console.error(`  ❌ Ошибка: ${error instanceof Error ? error.message : String(error)}`)
        errorCount++
      }
      
      // Задержка между запросами
      if (i < professors.length - 1) {
        await sleep(DELAY_MS)
      }
    }
    
    // Итоговая статистика
    console.log('\n' + '='.repeat(60))
    console.log('📊 ИТОГОВАЯ СТАТИСТИКА')
    console.log('='.repeat(60))
    console.log(`Всего преподавателей: ${professors.length}`)
    console.log(`Успешно экспортировано: ${successCount}`)
    console.log(`Ошибок: ${errorCount}`)
    console.log(`Директория: ${outputDir}`)
    console.log('\n✅ Экспорт завершен!')
    
  } catch (error) {
    console.error('\n❌ Критическая ошибка:', error)
    process.exit(1)
  }
}

// Запуск
main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  })
