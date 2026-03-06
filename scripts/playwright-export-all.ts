import { chromium } from 'playwright'
import * as cheerio from 'cheerio'
import * as fs from 'fs'
import * as path from 'path'

interface Professor {
  id: string
  name: string
}

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

async function main() {
  console.log('🚀 Запуск массового экспорта расписаний МАДИ\n')
  
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage()
  
  try {
    // Загружаем главную страницу
    console.log('📥 Загрузка главной страницы...')
    await page.goto('https://raspisanie.madi.ru/tplan/', { waitUntil: 'networkidle' })
    
    const professors = await extractProfessors(page)

    if (professors.length === 0) {
      throw new Error('Не найдено ни одного преподавателя')
    }
    
  } finally {
    await browser.close()
  }
}

main().catch(console.error)
