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
 * 7. Reranking по релевантности
 * 8. Domain-specific источники
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

export {
  rerankResults,
  formatRankedResultsForPrompt,
  type RankedResult
} from './reranker'

export {
  assessContentQuality,
  filterContentByQuality,
  cleanContent,
  extractKeyInfo,
  detectLanguage,
  type ContentQualityResult
} from './content-filter'

export {
  hybridSearch,
  searchKeyword,
  smartSearch,
  type HybridSearchResult,
  type HybridSearchOptions
} from './hybrid-search'

export {
  logRAGMetrics,
  createRAGMetrics,
  getRAGStats,
  getMetricsHistory,
  formatRAGStats,
  checkRAGHealth,
  type RAGMetrics,
  type RAGStats
} from './metrics'

export {
  getDomainSourceConfig,
  getDomainBoostFactors,
  optimizeSearchQuery,
  shouldUseArxiv,
  shouldUseBooks,
  getPreferredSites,
  formatSiteQuery,
  getSearchLanguages,
  getMinRelevanceThreshold,
  getMaxResults,
  type DomainSourceConfig
} from './domain-sources'

// Re-export from main modules
export { getRAGContext, getDomainRAGContext, searchWikipedia, searchSerper, searchDuckDuckGo } from '../search'
export { getVectorContext, searchSimilar, indexRAGContent, generateEmbedding } from '../embeddings'
export { searchArxiv, getScientificContext, enrichContextWithArxiv } from '../arxiv'
export { searchOpenLibrary, getBookContext } from '../openlibrary'

import { getDomainRAGContext } from '../search'
import { getUserLearningContext, formatUserContextForPrompt, getRelatedTopicsContext } from './user-context'
import { getBookContext } from '../openlibrary'
import { shouldUseBooks } from './domain-sources'
import { detectDomain, DomainType } from '@/lib/ai/domain-prompts'

/**
 * Полный RAG контекст с персонализацией и domain-specific источниками
 */
export async function getFullRAGContext(
  topicName: string,
  courseName: string,
  userId?: string
): Promise<string> {
  const contextParts: string[] = []
  
  // Определяем домен для оптимизации источников
  const domain = detectDomain(topicName, courseName)
  console.log(`[RAG] Domain detected: ${domain}`)

  // 1. Domain-specific RAG контекст (Wikipedia, arXiv, Web, Vector)
  const ragContext = await getDomainRAGContext(topicName, courseName, domain)
  if (ragContext) {
    contextParts.push(ragContext)
  }

  // 2. Книги (только для доменов где они полезны)
  if (shouldUseBooks(domain)) {
    const bookContext = await getBookContext(topicName)
    if (bookContext) {
      contextParts.push(bookContext)
    }
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
