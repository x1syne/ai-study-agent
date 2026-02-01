/**
 * Скрипт для тестирования поиска в базе знаний профессора
 * Запуск: npx tsx scripts/test-professor-search.ts
 */

import { searchProfessorKnowledge, getProfessorContext } from '../lib/ai/professor-knowledge'

const TEST_QUERIES = [
  'автоматизация АСУ',
  'искусственный интеллект',
  'транспортные системы',
  'миварный подход',
  'CALS технологии',
  'робототехника'
]

async function testSearch(query: string) {
  console.log(`\n🔍 Поиск: "${query}"`)
  console.log('─'.repeat(80))
  
  try {
    const { results, citations, relatedTopics } = await searchProfessorKnowledge(query, { 
      limit: 3,
      threshold: 0.2 
    })
    
    if (results.length === 0) {
      console.log('   ⚠️  Ничего не найдено')
      return
    }
    
    console.log(`   ✅ Найдено: ${results.length} результатов\n`)
    
    results.forEach((result, i) => {
      const meta = result.metadata as Record<string, unknown>
      console.log(`   ${i + 1}. ${meta.title || 'Без названия'}`)
      console.log(`      Релевантность: ${(result.similarity * 100).toFixed(1)}%`)
      console.log(`      Фрагмент: ${result.content.slice(0, 150)}...`)
      console.log()
    })
    
    if (citations.length > 0) {
      console.log('   📚 Источники:')
      citations.forEach((c, i) => {
        console.log(`      ${i + 1}. ${c}`)
      })
      console.log()
    }
    
    if (relatedTopics.length > 0) {
      console.log(`   🏷️  Связанные темы: ${relatedTopics.join(', ')}`)
    }
    
  } catch (error) {
    console.error(`   ❌ Ошибка: ${error}`)
  }
}

async function testContext(query: string) {
  console.log(`\n📝 Генерация контекста для: "${query}"`)
  console.log('─'.repeat(80))
  
  try {
    const context = await getProfessorContext(query)
    
    if (!context) {
      console.log('   ⚠️  Контекст не сгенерирован')
      return
    }
    
    console.log(`   ✅ Контекст сгенерирован (${context.length} символов)`)
    console.log(`\n${context.slice(0, 500)}...\n`)
    
  } catch (error) {
    console.error(`   ❌ Ошибка: ${error}`)
  }
}

async function main() {
  console.log('🧪 Тестирование поиска в базе знаний профессора Остроуха\n')
  console.log('═'.repeat(80))
  
  // Тест 1: Поиск по разным запросам
  console.log('\n📋 ТЕСТ 1: Поиск по ключевым темам')
  for (const query of TEST_QUERIES) {
    await testSearch(query)
  }
  
  // Тест 2: Генерация контекста
  console.log('\n\n📋 ТЕСТ 2: Генерация контекста для промпта')
  await testContext('автоматизация транспортных систем')
  
  console.log('\n✅ Тестирование завершено!')
}

main().catch(console.error)
