/**
 * Парсер HTML расписания Остроух А.В.
 * Экспортирует в JSON и Excel
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

interface ProfessorData {
  professor: string
  semester: string
  exportDate: string
  lessons: Lesson[]
}

async function parseAndExport() {
  console.log('🚀 Начинаем парсинг расписания Остроух А.В.')
  
  // Читаем HTML файл
  const htmlPath = path.join(process.cwd(), 'lib/madi/ostroukh-schedule.html')
  const html = fs.readFileSync(htmlPath, 'utf-8')
  
  // Парсим с помощью cheerio
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
  
  console.log(`✅ Найдено занятий: ${lessons.length}`)
  
  // Формируем данные
  const data: ProfessorData = {
    professor: 'Остроух А.В.',
    semester: '2025-2026 Весенний',
    exportDate: new Date().toISOString(),
    lessons
  }
  
  // Создаем директорию для экспорта
  const outputDir = path.join(process.cwd(), 'user-files/madi-export')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  // Экспорт в JSON
  const jsonPath = path.join(outputDir, 'Остроух-А.В.-расписание.json')
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8')
  console.log(`💾 JSON сохранен: ${jsonPath}`)
  
  // Экспорт в Excel
  const excelPath = await exportToExcel(data, outputDir)
  console.log(`📊 Excel сохранен: ${excelPath}`)
  
  // Статистика
  console.log('\n📊 Статистика:')
  console.log(`  Всего занятий: ${lessons.length}`)
  
  const byDay = lessons.reduce((acc, l) => {
    acc[l.day] = (acc[l.day] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  console.log('  По дням:')
  Object.entries(byDay).forEach(([day, count]) => {
    console.log(`    ${day}: ${count}`)
  })
  
  const groups = Array.from(new Set(lessons.map(l => l.group))).sort()
  console.log(`  Групп: ${groups.length} (${groups.join(', ')})`)
  
  console.log('\n✅ Экспорт завершен успешно!')
}

async function exportToExcel(data: ProfessorData, outputDir: string): Promise<string> {
  const workbook = new ExcelJS.Workbook()
  
  // Лист: Расписание
  const sheet = workbook.addWorksheet('Расписание')
  
  // Заголовок
  sheet.mergeCells('A1:G1')
  const titleCell = sheet.getCell('A1')
  titleCell.value = `Расписание занятий: ${data.professor}`
  titleCell.font = { bold: true, size: 14 }
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
  
  sheet.mergeCells('A2:G2')
  const semesterCell = sheet.getCell('A2')
  semesterCell.value = `Семестр: ${data.semester}`
  semesterCell.font = { size: 12 }
  semesterCell.alignment = { horizontal: 'center' }
  
  // Пустая строка
  sheet.addRow([])
  
  // Колонки
  sheet.columns = [
    { header: 'День', key: 'day', width: 15 },
    { header: 'Время', key: 'time', width: 18 },
    { header: 'Группа', key: 'group', width: 12 },
    { header: 'Дисциплина', key: 'subject', width: 45 },
    { header: 'Вид занятий', key: 'type', width: 25 },
    { header: 'Периодичность', key: 'periodicity', width: 20 },
    { header: 'Аудитория', key: 'room', width: 12 }
  ]
  
  // Стиль заголовков
  const headerRow = sheet.getRow(4)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' }
  }
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
  
  // Данные
  data.lessons.forEach(lesson => {
    sheet.addRow(lesson)
  })
  
  // Автофильтр
  sheet.autoFilter = {
    from: 'A4',
    to: 'G4'
  }
  
  // Границы для всех ячеек с данными
  const lastRow = sheet.rowCount
  for (let row = 4; row <= lastRow; row++) {
    for (let col = 1; col <= 7; col++) {
      const cell = sheet.getCell(row, col)
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    }
  }
  
  // Сохранение
  const fileName = 'Остроух-А.В.-расписание.xlsx'
  const filePath = path.join(outputDir, fileName)
  await workbook.xlsx.writeFile(filePath)
  
  return filePath
}

// Запуск
parseAndExport()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error)
    process.exit(1)
  })
