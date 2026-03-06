/**
 * Векторные эмбеддинги для RAG системы
 * Использует pgvector в Supabase + бесплатные эмбеддинги
 * 
 * SETUP: Выполни prisma/migrations/add_vector_search.sql в Supabase SQL Editor
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cacheGet, cacheSet, cacheKey, CACHE_TTL } from './rag/cache'

// Ленивая инициализация клиента
let _supabase: SupabaseClient | null = null

function getSupabase(): SupabaseClient | null {
  if (_supabase) return _supabase
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!url || !key) {
    console.warn('[Embeddings] Supabase credentials not configured')
    return null
  }
  
  _supabase = createClient(url, key)
  return _supabase
}

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
  similarity?: number
}

/**
 * Простой хэш для дедупликации контента
 */
function hashContent(content: string): string {
  let hash = 0
  const str = content.toLowerCase().replace(/\s+/g, ' ').trim()
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `h_${Math.abs(hash).toString(36)}`
}

/**
 * Генерация эмбеддингов через бесплатный HuggingFace API
 * С кэшированием для экономии запросов
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const textHash = hashContent(text)
  const key = cacheKey('emb', textHash)
  
  // Проверяем кэш
  const cached = await cacheGet<number[]>(key)
  if (cached) return cached
  
  try {
    // Пробуем использовать HuggingFace API (может не работать)
    if (process.env.HUGGINGFACE_API_KEY) {
      try {
        const response = await fetch(
          'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`
            },
            body: JSON.stringify({
              inputs: text.slice(0, 512),
              options: { wait_for_model: true }
            })
          }
        )

        if (response.ok) {
          const embedding = await response.json()
          
          let result: number[]
          if (Array.isArray(embedding) && Array.isArray(embedding[0])) {
            result = embedding[0]
          } else {
            result = embedding
          }
          
          await cacheSet(key, result, { ttl: CACHE_TTL.EMBEDDINGS })
          return result
        }
      } catch (hfError) {
        console.warn('[Embeddings] HuggingFace API failed, using fallback')
      }
    }
    
    // Fallback: используем простые эмбеддинги
    console.log('[Embeddings] Using simple embeddings (fallback)')
    const result = generateSimpleEmbedding(text)
    await cacheSet(key, result, { ttl: CACHE_TTL.EMBEDDINGS })
    return result
    
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
 * С дедупликацией по хэшу контента
 */
export async function storeDocument(chunk: DocumentChunk): Promise<string | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  
  // Проверяем минимальную длину контента
  if (chunk.content.length < 50) {
    console.log('[Embeddings] Content too short, skipping')
    return null
  }
  
  const contentHash = hashContent(chunk.content)
  
  try {
    // Проверяем дубликат
    const { data: existing } = await supabase
      .from('documents')
      .select('id')
      .eq('content_hash', contentHash)
      .single()
    
    if (existing) {
      console.log('[Embeddings] Duplicate found, skipping')
      return existing.id
    }
    
    const embedding = chunk.embedding || await generateEmbedding(chunk.content)
    
    const { data, error } = await supabase
      .from('documents')
      .insert({
        content: chunk.content,
        content_hash: contentHash,
        metadata: chunk.metadata,
        embedding: embedding
      })
      .select('id')
      .single()

    if (error) {
      // Игнорируем ошибку если таблица не существует
      if (error.code === '42P01') {
        console.warn('[Embeddings] Table "documents" not found. Run add_vector_search.sql')
        return null
      }
      // Игнорируем дубликаты (unique constraint)
      if (error.code === '23505') {
        console.log('[Embeddings] Duplicate detected by constraint')
        return null
      }
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
 * Пакетное сохранение документов с дедупликацией
 */
export async function storeDocuments(chunks: DocumentChunk[]): Promise<number> {
  const supabase = getSupabase()
  if (!supabase) return 0
  
  // Фильтруем слишком короткие
  const validChunks = chunks.filter(c => c.content.length >= 50)
  if (validChunks.length === 0) return 0
  
  // Вычисляем хэши
  const chunksWithHash = validChunks.map(chunk => ({
    ...chunk,
    contentHash: hashContent(chunk.content)
  }))
  
  // Проверяем существующие хэши
  const hashes = chunksWithHash.map(c => c.contentHash)
  const { data: existing } = await supabase
    .from('documents')
    .select('content_hash')
    .in('content_hash', hashes)
  
  const existingHashes = new Set((existing || []).map((e: any) => e.content_hash))
  
  // Фильтруем дубликаты
  const newChunks = chunksWithHash.filter(c => !existingHashes.has(c.contentHash))
  
  if (newChunks.length === 0) {
    console.log('[Embeddings] All documents are duplicates')
    return 0
  }
  
  let stored = 0
  
  // Генерируем эмбеддинги параллельно (по 5 за раз)
  const batchSize = 5
  for (let i = 0; i < newChunks.length; i += batchSize) {
    const batch = newChunks.slice(i, i + batchSize)
    
    const embeddings = await Promise.all(
      batch.map(chunk => generateEmbedding(chunk.content))
    )
    
    const documents = batch.map((chunk, idx) => ({
      content: chunk.content,
      content_hash: chunk.contentHash,
      metadata: chunk.metadata,
      embedding: embeddings[idx]
    }))

    const { error } = await supabase
      .from('documents')
      .insert(documents)

    if (error) {
      if (error.code === '42P01') {
        console.warn('[Embeddings] Table "documents" not found. Run add_vector_search.sql')
        return 0
      }
    } else {
      stored += batch.length
    }
  }

  console.log(`[Embeddings] Stored ${stored}/${chunks.length} documents (${chunks.length - validChunks.length} too short, ${validChunks.length - newChunks.length} duplicates)`)
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
  const supabase = getSupabase()
  if (!supabase) return []
  
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
      // Игнорируем если функция не существует
      if (error.code === '42883' || error.code === '42P01') {
        console.warn('[Embeddings] Vector search not configured. Run add_vector_search.sql')
        return []
      }
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
 * Разбиение текста на чанки с overlap по предложениям
 * 
 * Улучшения:
 * - Overlap по целым предложениям (не режет слова)
 * - Сохраняет контекст между чанками
 * - Умная обработка коротких/длинных предложений
 */
export function chunkText(
  text: string,
  options: { 
    chunkSize?: number
    overlapSentences?: number
    minChunkSize?: number 
  } = {}
): string[] {
  const { 
    chunkSize = 500, 
    overlapSentences = 2,
    minChunkSize = 100 
  } = options
  
  // Разбиваем по предложениям (учитываем разные знаки препинания)
  const sentences = text
    .split(/(?<=[.!?。])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
  
  if (sentences.length === 0) return []
  
  // Если текст короткий — возвращаем как есть
  if (text.length <= chunkSize) {
    return [text.trim()]
  }
  
  const chunks: string[] = []
  let currentSentences: string[] = []
  let currentLength = 0
  
  for (const sentence of sentences) {
    const sentenceLength = sentence.length
    
    // Если одно предложение длиннее chunkSize — разбиваем его
    if (sentenceLength > chunkSize) {
      // Сначала сохраняем текущий чанк
      if (currentSentences.length > 0) {
        chunks.push(currentSentences.join(' '))
      }
      
      // Разбиваем длинное предложение по словам
      const words = sentence.split(/\s+/)
      let wordChunk = ''
      
      for (const word of words) {
        if ((wordChunk + ' ' + word).length > chunkSize && wordChunk) {
          chunks.push(wordChunk.trim())
          // Overlap: берём последние слова
          const overlapWords = wordChunk.split(/\s+/).slice(-5).join(' ')
          wordChunk = overlapWords + ' ' + word
        } else {
          wordChunk += (wordChunk ? ' ' : '') + word
        }
      }
      
      if (wordChunk.trim()) {
        currentSentences = [wordChunk.trim()]
        currentLength = wordChunk.length
      } else {
        currentSentences = []
        currentLength = 0
      }
      continue
    }
    
    // Проверяем, поместится ли предложение
    if (currentLength + sentenceLength + 1 > chunkSize && currentSentences.length > 0) {
      // Сохраняем текущий чанк
      chunks.push(currentSentences.join(' '))
      
      // Overlap: берём последние N предложений для контекста
      const overlapStart = Math.max(0, currentSentences.length - overlapSentences)
      currentSentences = currentSentences.slice(overlapStart)
      currentLength = currentSentences.join(' ').length
    }
    
    currentSentences.push(sentence)
    currentLength += sentenceLength + 1
  }
  
  // Добавляем последний чанк
  if (currentSentences.length > 0) {
    const lastChunk = currentSentences.join(' ')
    // Не добавляем если слишком короткий и уже есть чанки
    if (lastChunk.length >= minChunkSize || chunks.length === 0) {
      chunks.push(lastChunk)
    } else if (chunks.length > 0) {
      // Присоединяем к предыдущему чанку
      chunks[chunks.length - 1] += ' ' + lastChunk
    }
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
