/**
 * RAG Module - Retrieval-Augmented Generation
 * 
 * Объединяет все источники контекста:
 * 1. Векторный поиск (pgvector)
 * 2. Wikipedia
 * 3. arXiv (научные статьи)
 * 4. Web Search (Serper, DuckDuckGo)
 * 5. Open Library (книги)
 * 6. Контекст пользователя
 */

export { 
  cacheGet, 
  cacheSet, 
  cacheKey, 
  withCache, 
  CACHE_TTL 
} from './cache'

export {
  getUserLearningContext,
  formatUserContextForPrompt,
  getRelatedTopicsContext
} from './user-context'

// Re-export from main modules
export { getRAGContext, searchWikipedia, searchSerper, searchDuckDuckGo } from '../search'
export { getVectorContext, searchSimilar, indexRAGContent, generateEmbedding } from '../embeddings'
export { searchArxiv, getScientificContext, enrichContextWithArxiv } from '../arxiv'
export { searchOpenLibrary, getBookContext } from '../openlibrary'

import { getRAGContext } from '../search'
import { getUserLearningContext, formatUserContextForPrompt, getRelatedTopicsContext } from './user-context'
import { getBookContext } from '../openlibrary'

/**
 * Полный RAG контекст с персонализацией
 */
export async function getFullRAGContext(
  topicName: string,
  courseName: string,
  userId?: string
): Promise<string> {
  const contextParts: string[] = []

  // 1. Основной RAG контекст (Wikipedia, arXiv, Web, Vector)
  const ragContext = await getRAGContext(topicName, courseName)
  if (ragContext) {
    contextParts.push(ragContext)
  }

  // 2. Книги (для гуманитарных тем)
  const bookContext = await getBookContext(topicName)
  if (bookContext) {
    contextParts.push(bookContext)
  }

  // 3. Контекст пользователя (если есть userId)
  if (userId) {
    const [userContext, relatedContext] = await Promise.all([
      getUserLearningContext(userId),
      getRelatedTopicsContext(userId, topicName)
    ])

    const userPrompt = formatUserContextForPrompt(userContext)
    if (userPrompt) {
      contextParts.push(userPrompt)
    }

    if (relatedContext) {
      contextParts.push(relatedContext)
    }
  }

  return contextParts.join('\n\n')
}
