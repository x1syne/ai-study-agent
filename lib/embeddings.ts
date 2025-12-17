/**
 * Векторные эмбеддинги для RAG системы
 * Использует pgvector в Supabase + бесплатные эмбеддинги
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Размерность эмбеддингов (для all-MiniLM-L6-v2 = 384)
const EMBEDDING_DIM = 384

export interface DocumentChunk {
  id?: string
  content: string
  metadata: {
    source: string
    topic?: string
    type?: 'wikipedia' | 'arxiv' | 'book' | 'web'
    url?: string
  }
  embedding?: number[]
}

/**
 * Генерация эмбеддингов через бесплатный HuggingFace API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Используем бесплатный HuggingFace Inference API
    const response = await fetch(
      'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // HuggingFace позволяет ограниченное использование без ключа
          ...(process.env.HUGGINGFACE_API_KEY && {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`
          })
        },
        body: JSON.stringify({
          inputs: text.slice(0, 512), // Ограничиваем длину
          options: { wait_for_model: true }
        })
      }
    )

    if (!response.ok) {
      console.error('[Embeddings] HuggingFace API error:', response.status)
      return generateSimpleEmbedding(text)
    }

    const embedding = await response.json()
    
    // API возвращает массив массивов, берём первый
    if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
      return embedding[0]
    }
    
    return embedding
  } catch (error) {
    console.error('[Embeddings] Error generating embedding:', error)
    return generateSimpleEmbedding(text)
  }
}

/**
 * Простые эмбеддинги на основе TF-IDF (fallback)
 */
function generateSimpleEmbedding(text: string): number[] {
  const words = text.toLowerCase().split(/\s+/)
  const embedding = new Array(EMBEDDING_DIM).fill(0)
  
  words.forEach((word, i) => {
    const hash = simpleHash(word)
    const index = Math.abs(hash) % EMBEDDING_DIM
    embedding[index] += 1 / (1 + i * 0.1) // Позиционное взвешивание
  })
  
  // Нормализация
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return magnitude > 0 ? embedding.map(v => v / magnitude) : embedding
}

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash
}

/**
 * Сохранение документа с эмбеддингом в Supabase
 */
export async function storeDocument(chunk: DocumentChunk): Promise<string | null> {
  try {
    const embedding = chunk.embedding || await generateEmbedding(chunk.content)
    
    const { data, error } = await supabase
      .from('documents')
      .insert({
        content: chunk.content,
        metadata: chunk.metadata,
        embedding: embedding
      })
      .select('id')
      .single()

    if (error) {
      console.error('[Embeddings] Store error:', error)
      return null
    }

    return data?.id || null
  } catch (error) {
    console.error('[Embeddings] Store error:', error)
    return null
  }
}

/**
 * Пакетное сохранение документов
 */
export async function storeDocuments(chunks: DocumentChunk[]): Promise<number> {
  let stored = 0
  
  // Генерируем эмбеддинги параллельно (по 5 за раз)
  const batchSize = 5
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize)
    
    const embeddings = await Promise.all(
      batch.map(chunk => generateEmbedding(chunk.content))
    )
    
    const documents = batch.map((chunk, idx) => ({
      content: chunk.content,
      metadata: chunk.metadata,
      embedding: embeddings[idx]
    }))

    const { error } = await supabase
      .from('documents')
      .insert(documents)

    if (!error) {
      stored += batch.length
    }
  }

  console.log(`[Embeddings] Stored ${stored}/${chunks.length} documents`)
  return stored
}

/**
 * Семантический поиск похожих документов
 */
export async function searchSimilar(
  query: string,
  options: {
    limit?: number
    topic?: string
    threshold?: number
  } = {}
): Promise<DocumentChunk[]> {
  const { limit = 5, topic, threshold = 0.5 } = options

  try {
    const queryEmbedding = await generateEmbedding(query)

    // Используем RPC функцию для векторного поиска
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit,
      filter_topic: topic || null
    })

    if (error) {
      console.error('[Embeddings] Search error:', error)
      return []
    }

    return (data || []).map((doc: any) => ({
      id: doc.id,
      content: doc.content,
      metadata: doc.metadata,
      similarity: doc.similarity
    }))
  } catch (error) {
    console.error('[Embeddings] Search error:', error)
    return []
  }
}

/**
 * Разбиение текста на чанки
 */
export function chunkText(
  text: string,
  options: { chunkSize?: number; overlap?: number } = {}
): string[] {
  const { chunkSize = 500, overlap = 50 } = options
  const chunks: string[] = []
  
  // Разбиваем по предложениям
  const sentences = text.split(/(?<=[.!?])\s+/)
  let currentChunk = ''
  
  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim())
      // Overlap: берём последние N символов
      currentChunk = currentChunk.slice(-overlap) + sentence
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  return chunks
}

/**
 * Индексация контента из RAG источников
 */
export async function indexRAGContent(
  content: string,
  metadata: DocumentChunk['metadata']
): Promise<number> {
  const chunks = chunkText(content)
  
  const documents: DocumentChunk[] = chunks.map((chunk, i) => ({
    content: chunk,
    metadata: {
      ...metadata,
      chunkIndex: i
    } as any
  }))

  return storeDocuments(documents)
}

/**
 * Получение релевантного контекста для темы
 */
export async function getVectorContext(
  topic: string,
  courseName: string
): Promise<string> {
  const query = `${topic} ${courseName}`
  
  const results = await searchSimilar(query, {
    limit: 10,
    threshold: 0.3
  })

  if (results.length === 0) {
    return ''
  }

  const context = results
    .map((doc, i) => `[${i + 1}] ${doc.content}`)
    .join('\n\n')

  return `[КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ]:\n${context}`
}
