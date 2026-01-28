/**
 * API для управления базой знаний профессора Остроуха
 * 
 * POST /api/professor/knowledge - загрузить текст публикации
 * GET /api/professor/knowledge - поиск по базе знаний
 * PUT /api/professor/knowledge - индексировать все публикации
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  indexPublication, 
  indexAllPublications,
  searchProfessorKnowledge,
  OSTROUKH_PUBLICATIONS,
  getProfessorContext
} from '@/lib/ai/professor-knowledge'
import { storeDocuments, chunkText, DocumentChunk } from '@/lib/embeddings'
import { getAllContentForIndexing } from '@/lib/ai/professor-content'

// POST - загрузить текст публикации
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { publicationId, content, title, topics, type = 'custom' } = body
    
    if (!content || content.length < 50) {
      return NextResponse.json(
        { error: 'Контент слишком короткий (минимум 50 символов)' },
        { status: 400 }
      )
    }
    
    // Если указан ID существующей публикации - добавляем к ней
    if (publicationId) {
      const pub = OSTROUKH_PUBLICATIONS.find(p => p.id === publicationId)
      if (pub) {
        const indexed = await indexPublication(pub, content)
        return NextResponse.json({
          success: true,
          message: `Проиндексировано ${indexed} чанков для "${pub.title}"`,
          indexed
        })
      }
    }
    
    // Иначе создаём новый документ
    const chunks = chunkText(content, { chunkSize: 500, overlapSentences: 2 })
    
    const documents: DocumentChunk[] = chunks.map((chunk, i) => ({
      content: chunk,
      metadata: {
        source: 'ostroukh',
        type: 'book' as const,
        topic: topics?.[0] || 'общее',
        title: title || 'Материалы профессора Остроуха',
        chunkIndex: i,
        customUpload: true
      }
    }))
    
    const indexed = await storeDocuments(documents)
    
    return NextResponse.json({
      success: true,
      message: `Проиндексировано ${indexed} чанков`,
      indexed,
      totalChunks: chunks.length
    })
    
  } catch (error) {
    console.error('[ProfessorKnowledge API] POST error:', error)
    return NextResponse.json(
      { error: 'Ошибка при загрузке контента' },
      { status: 500 }
    )
  }
}

// GET - поиск по базе знаний
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || searchParams.get('query')
    const limit = parseInt(searchParams.get('limit') || '5')
    const format = searchParams.get('format') || 'json' // json | context
    
    if (!query) {
      // Без запроса - возвращаем список публикаций
      return NextResponse.json({
        publications: OSTROUKH_PUBLICATIONS.map(p => ({
          id: p.id,
          title: p.title,
          authors: p.authors,
          year: p.year,
          type: p.type,
          topics: p.topics
        }))
      })
    }
    
    // С запросом - ищем в базе знаний
    if (format === 'context') {
      const context = await getProfessorContext(query)
      return NextResponse.json({ context })
    }
    
    const { results, citations, relatedTopics } = await searchProfessorKnowledge(query, { limit })
    
    return NextResponse.json({
      query,
      results: results.map(r => ({
        content: r.content,
        similarity: r.similarity,
        metadata: r.metadata
      })),
      citations,
      relatedTopics,
      count: results.length
    })
    
  } catch (error) {
    console.error('[ProfessorKnowledge API] GET error:', error)
    return NextResponse.json(
      { error: 'Ошибка при поиске' },
      { status: 500 }
    )
  }
}

// PUT - индексировать все публикации (метаданные + расширенный контент)
export async function PUT() {
  try {
    // 1. Индексируем базовые публикации (абстракты)
    const basicIndexed = await indexAllPublications()
    
    // 2. Индексируем расширенный контент из глав
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
    }
    
    return NextResponse.json({
      success: true,
      message: `Проиндексировано: ${basicIndexed} базовых + ${extendedIndexed} расширенных чанков`,
      basicIndexed,
      extendedIndexed,
      totalPublications: OSTROUKH_PUBLICATIONS.length,
      totalChapters: extendedContent.length
    })
    
  } catch (error) {
    console.error('[ProfessorKnowledge API] PUT error:', error)
    return NextResponse.json(
      { error: 'Ошибка при индексации' },
      { status: 500 }
    )
  }
}
