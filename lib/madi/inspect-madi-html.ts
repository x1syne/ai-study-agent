/**
 * Script to inspect the actual HTML structure from MADI site
 * This will help us understand what selectors we need to use
 */

import { fetchMADIPage } from './madi-parser'
import * as fs from 'fs'
import * as path from 'path'

async function inspectMADIHTML() {
  const professorName = 'Остроух А.В.'
  const baseUrl = 'https://www.madi.ru/tplan'
  const timeout = 15000

  console.log('=== Inspecting MADI HTML Structure ===\n')

  // Test different task URLs
  const tasks = [
    { task: 8, name: 'Schedule (task=8)' },
    { task: 4, name: 'Exams (task=4)' },
    { task: 11, name: 'Department (task=11)' },
    { task: 7, name: 'Group (task=7)' },
    { task: 15, name: 'Distance Learning (task=15)' },
  ]

  for (const { task, name } of tasks) {
    try {
      console.log(`\n--- Fetching ${name} ---`)
      const url = `${baseUrl}/r/?task=${task}&prep=${encodeURIComponent(professorName)}`
      console.log(`URL: ${url}`)

      const html = await fetchMADIPage(url, timeout)
      console.log(`Fetched ${html.length} bytes`)

      // Save HTML to file for inspection
      const filename = `madi-task-${task}.html`
      const filepath = path.join(__dirname, filename)
      fs.writeFileSync(filepath, html, 'utf-8')
      console.log(`Saved to: ${filename}`)

      // Show first 500 characters
      console.log('\nFirst 500 characters:')
      console.log(html.substring(0, 500))
      console.log('...')

      // Look for common HTML elements
      console.log('\nHTML Analysis:')
      console.log(`  - Contains <table>: ${html.includes('<table')}`)
      console.log(`  - Contains <form>: ${html.includes('<form')}`)
      console.log(`  - Contains <select>: ${html.includes('<select')}`)
      console.log(`  - Contains "расписание": ${html.toLowerCase().includes('расписание')}`)
      console.log(`  - Contains "экзамен": ${html.toLowerCase().includes('экзамен')}`)
      console.log(`  - Contains "кафедра": ${html.toLowerCase().includes('кафедра')}`)

    } catch (error) {
      console.error(`Error fetching ${name}:`, error)
    }
  }

  console.log('\n=== Inspection Complete ===')
  console.log('\nHTML files saved to lib/madi/ directory')
  console.log('Open them in a browser or text editor to inspect the structure')
}

// Run the inspection
inspectMADIHTML().catch(console.error)
