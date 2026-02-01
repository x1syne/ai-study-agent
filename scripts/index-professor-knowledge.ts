/**
 * Скрипт для индексации базы знаний профессора Остроуха
 * Запуск: npx tsx scripts/index-professor-knowledge.ts
 */

import { indexAllPublications, indexScientificArticles } from '../lib/ai/professor-knowledge'
import { getAllContentForIndexing } from '../lib/ai/professor-content'
import { storeDocuments, chunkText, DocumentChunk } from '../lib/embeddings'

async function main() {
  console.log('🔍 Начинаю индексацию базы знаний профессора Остроуха...\n')
  
  try {
    // 1. Индексируем базовые публикации (метаданные + абстракты)
    console.log('📚 Шаг 1/3: Индексация базовых публикаций...')
    const basicIndexed = await indexAllPublications()
    console.log(`   ✅ Проиндексировано: ${basicIndexed} чанков\n`)
    
    // 2. Индексируем научные статьи (CyberLeninka + PDF)
    console.log('📄 Шаг 2/3: Индексация научных статей и PDF...')
    const articlesIndexed = await indexScientificArticles()
    console.log(`   ✅ Проиндексировано: ${articlesIndexed} чанков\n`)
    
    // 3. Индексируем расширенный контент (главы книг)
    console.log('📖 Шаг 3/3: Индексация расширенного контента...')
    const extendedContent = getAllContentForIndexing()
    let extendedIndexed = 0
    
    for (const item of extendedContent) {
      const chunks = chunkText(item.content, { chunkSize: 400, overlapSentences: 1 })
      
      const documents: DocumentChunk[] = chunks.map((chunk, i) => ({
        content: chunk,
        metadata: {
          source: 'ostroukh',
          type: 'book' as const,
          topic: item.keywords[0] || 'общее',
          title: item.title,
          publicationId: item.publicationId,
          keywords: item.keywords.join(', '),
          chunkIndex: i
        }
      }))
      
      const indexed = await storeDocuments(documents)
      extendedIndexed += indexed
      console.log(`   - ${item.title.slice(0, 60)}...: ${indexed} чанков`)
    }
    console.log(`   ✅ Проиндексировано: ${extendedIndexed} чанков\n`)
    
    // Итоговая статистика
    const total = basicIndexed + articlesIndexed + extendedIndexed
    console.log('🎉 Индексация завершена успешно!\n')
    console.log('📊 Итоговая статистика:')
    console.log(`   Базовые публикации:  ${basicIndexed.toLocaleString()} чанков`)
    console.log(`   Научные статьи:      ${articlesIndexed.toLocaleString()} чанков`)
    console.log(`   Расширенный контент: ${extendedIndexed.toLocaleString()} чанков`)
    console.log(`   ─────────────────────────────────────`)
    console.log(`   ВСЕГО:               ${total.toLocaleString()} чанков`)
    console.log('\n✨ База знаний профессора Остроуха готова к использованию!')
    
  } catch (error) {
    console.error('\n❌ Ошибка при индексации:', error)
    process.exit(1)
  }
}

main()
