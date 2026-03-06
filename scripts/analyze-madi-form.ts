/**
 * Анализ формы на главной странице МАДИ
 */

import * as cheerio from 'cheerio'
import * as fs from 'fs'
import * as path from 'path'

async function main() {
  console.log('📥 Загружаем главную страницу МАДИ...')
  
  const response = await fetch('https://raspisanie.madi.ru/tplan/')
  const html = await response.text()
  
  // Сохраняем HTML
  const htmlPath = path.join(process.cwd(), 'lib/madi/main-page.html')
  fs.writeFileSync(htmlPath, html, 'utf-8')
  console.log(`💾 HTML сохранен: ${htmlPath}`)
  
  // Парсим
  const $ = cheerio.load(html)
  
  console.log('\n🔍 Анализ формы:')
  console.log('=' .repeat(60))
  
  // Ищем все select элементы
  $('select').each((i, elem) => {
    const $select = $(elem)
    const id = $select.attr('id')
    const name = $select.attr('name')
    const optionsCount = $select.find('option').length
    
    console.log(`\nSelect #${i + 1}:`)
    console.log(`  ID: ${id || 'нет'}`)
    console.log(`  Name: ${name || 'нет'}`)
    console.log(`  Опций: ${optionsCount}`)
    
    // Показываем первые 3 опции
    $select.find('option').slice(0, 3).each((j, opt) => {
      const $opt = $(opt)
      console.log(`    - value="${$opt.attr('value')}" text="${$opt.text().trim()}"`)
    })
    
    if (optionsCount > 3) {
      console.log(`    ... и еще ${optionsCount - 3}`)
    }
  })
  
  // Ищем input элементы
  console.log('\n\n🔍 Input элементы:')
  console.log('='.repeat(60))
  
  $('input[type="radio"], input[type="checkbox"]').each((i, elem) => {
    const $input = $(elem)
    console.log(`\nInput #${i + 1}:`)
    console.log(`  Type: ${$input.attr('type')}`)
    console.log(`  ID: ${$input.attr('id') || 'нет'}`)
    console.log(`  Name: ${$input.attr('name') || 'нет'}`)
    console.log(`  Value: ${$input.attr('value') || 'нет'}`)
  })
  
  // Ищем формы
  console.log('\n\n🔍 Формы:')
  console.log('='.repeat(60))
  
  $('form').each((i, elem) => {
    const $form = $(elem)
    console.log(`\nForm #${i + 1}:`)
    console.log(`  Action: ${$form.attr('action') || 'нет'}`)
    console.log(`  Method: ${$form.attr('method') || 'GET'}`)
    console.log(`  ID: ${$form.attr('id') || 'нет'}`)
  })
  
  console.log('\n✅ Анализ завершен!')
}

main().catch(console.error)
