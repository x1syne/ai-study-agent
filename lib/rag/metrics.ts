/**
 * RAG Metrics Module
 * Отслеживание качества RAG системы
 */

// ==================== ТИПЫ ====================

export interface RAGMetrics {
  query: string
  timestamp: number
  
  // Результаты поиска
  sourcesFound: number
  sourcesByType: {
    vector: number
    wikipedia: number
    arxiv: number
    web: number
    book: number
  }
  
  // Качество
  avgRelevance: number
  maxRelevance: number
  minRelevance: number
  
  // Производительность
  searchTimeMs: number
  cacheHit: boolean
  
  // Контекст
  contextLength: number
  tokensEstimate: number
}

export interface RAGStats {
  totalQueries: number
  avgSourcesFound: number
  avgRelevance: number
  avgSearchTimeMs: number
  cacheHitRate: number
  emptyResultsRate: number
  sourceDistribution: Record<string, number>
}

// ==================== IN-MEMORY STORAGE ====================

const metricsHistory: RAGMetrics[] = []
const MAX_HISTORY = 1000 // Храним последние 1000 запросов

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Логирование метрик RAG запроса
 */
export function logRAGMetrics(metrics: RAGMetrics): void {
  // Добавляем в историю
  metricsHistory.push(metrics)
  
  // Ограничиваем размер истории
  if (metricsHistory.length > MAX_HISTORY) {
    metricsHistory.shift()
  }
  
  // Логируем в консоль
  const sourcesList = Object.entries(metrics.sourcesByType)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => `${type}:${count}`)
    .join(', ')
  
  console.log(
    `[RAG Metrics] "${metrics.query.slice(0, 30)}..." | ` +
    `${metrics.sourcesFound} sources (${sourcesList}) | ` +
    `relevance: ${(metrics.avgRelevance * 100).toFixed(0)}% | ` +
    `${metrics.searchTimeMs}ms | ` +
    `cache: ${metrics.cacheHit ? 'HIT' : 'MISS'}`
  )
}

/**
 * Создание объекта метрик
 */
export function createRAGMetrics(
  query: string,
  results: Array<{ score?: number; type?: string }>,
  searchTimeMs: number,
  cacheHit: boolean = false,
  contextLength: number = 0
): RAGMetrics {
  const sourcesByType = {
    vector: 0,
    wikipedia: 0,
    arxiv: 0,
    web: 0,
    book: 0
  }
  
  const scores: number[] = []
  
  for (const result of results) {
    // Подсчёт по типам
    const type = result.type as keyof typeof sourcesByType
    if (type && type in sourcesByType) {
      sourcesByType[type]++
    }
    
    // Собираем скоры
    if (typeof result.score === 'number') {
      scores.push(result.score)
    }
  }
  
  const avgRelevance = scores.length > 0 
    ? scores.reduce((a, b) => a + b, 0) / scores.length 
    : 0
  
  return {
    query,
    timestamp: Date.now(),
    sourcesFound: results.length,
    sourcesByType,
    avgRelevance,
    maxRelevance: scores.length > 0 ? Math.max(...scores) : 0,
    minRelevance: scores.length > 0 ? Math.min(...scores) : 0,
    searchTimeMs,
    cacheHit,
    contextLength,
    tokensEstimate: Math.ceil(contextLength / 4) // ~4 символа на токен
  }
}


/**
 * Получение агрегированной статистики
 */
export function getRAGStats(lastN?: number): RAGStats {
  const history = lastN 
    ? metricsHistory.slice(-lastN) 
    : metricsHistory
  
  if (history.length === 0) {
    return {
      totalQueries: 0,
      avgSourcesFound: 0,
      avgRelevance: 0,
      avgSearchTimeMs: 0,
      cacheHitRate: 0,
      emptyResultsRate: 0,
      sourceDistribution: {}
    }
  }
  
  const totalQueries = history.length
  const totalSources = history.reduce((sum, m) => sum + m.sourcesFound, 0)
  const totalRelevance = history.reduce((sum, m) => sum + m.avgRelevance, 0)
  const totalTime = history.reduce((sum, m) => sum + m.searchTimeMs, 0)
  const cacheHits = history.filter(m => m.cacheHit).length
  const emptyResults = history.filter(m => m.sourcesFound === 0).length
  
  // Распределение по источникам
  const sourceDistribution: Record<string, number> = {}
  for (const m of history) {
    for (const [type, count] of Object.entries(m.sourcesByType)) {
      sourceDistribution[type] = (sourceDistribution[type] || 0) + count
    }
  }
  
  return {
    totalQueries,
    avgSourcesFound: totalSources / totalQueries,
    avgRelevance: totalRelevance / totalQueries,
    avgSearchTimeMs: totalTime / totalQueries,
    cacheHitRate: cacheHits / totalQueries,
    emptyResultsRate: emptyResults / totalQueries,
    sourceDistribution
  }
}

/**
 * Получение истории метрик
 */
export function getMetricsHistory(lastN: number = 100): RAGMetrics[] {
  return metricsHistory.slice(-lastN)
}

/**
 * Очистка истории метрик
 */
export function clearMetricsHistory(): void {
  metricsHistory.length = 0
}

/**
 * Форматирование статистики для отображения
 */
export function formatRAGStats(stats: RAGStats): string {
  if (stats.totalQueries === 0) {
    return 'Нет данных о RAG запросах'
  }
  
  const lines = [
    `📊 RAG Статистика (${stats.totalQueries} запросов)`,
    ``,
    `Источники: ${stats.avgSourcesFound.toFixed(1)} в среднем`,
    `Релевантность: ${(stats.avgRelevance * 100).toFixed(0)}%`,
    `Время поиска: ${stats.avgSearchTimeMs.toFixed(0)}ms`,
    `Кэш: ${(stats.cacheHitRate * 100).toFixed(0)}% попаданий`,
    `Пустые результаты: ${(stats.emptyResultsRate * 100).toFixed(0)}%`,
    ``,
    `Распределение источников:`
  ]
  
  const totalSources = Object.values(stats.sourceDistribution).reduce((a, b) => a + b, 0)
  for (const [type, count] of Object.entries(stats.sourceDistribution)) {
    const percent = totalSources > 0 ? (count / totalSources * 100).toFixed(0) : 0
    const emoji = {
      vector: '💾',
      wikipedia: '📚',
      arxiv: '🔬',
      web: '🌐',
      book: '📖'
    }[type] || '📄'
    lines.push(`  ${emoji} ${type}: ${count} (${percent}%)`)
  }
  
  return lines.join('\n')
}

/**
 * Проверка здоровья RAG системы
 */
export function checkRAGHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy'
  issues: string[]
  recommendations: string[]
} {
  const stats = getRAGStats(100) // Последние 100 запросов
  const issues: string[] = []
  const recommendations: string[] = []
  
  if (stats.totalQueries < 10) {
    return {
      status: 'healthy',
      issues: [],
      recommendations: ['Недостаточно данных для анализа']
    }
  }
  
  // Проверяем пустые результаты
  if (stats.emptyResultsRate > 0.3) {
    issues.push(`Высокий процент пустых результатов: ${(stats.emptyResultsRate * 100).toFixed(0)}%`)
    recommendations.push('Проверьте индексацию документов и настройки threshold')
  }
  
  // Проверяем релевантность
  if (stats.avgRelevance < 0.3) {
    issues.push(`Низкая средняя релевантность: ${(stats.avgRelevance * 100).toFixed(0)}%`)
    recommendations.push('Рассмотрите улучшение качества эмбеддингов или reranking')
  }
  
  // Проверяем время поиска
  if (stats.avgSearchTimeMs > 5000) {
    issues.push(`Медленный поиск: ${stats.avgSearchTimeMs.toFixed(0)}ms`)
    recommendations.push('Оптимизируйте индексы или увеличьте кэширование')
  }
  
  // Проверяем кэш
  if (stats.cacheHitRate < 0.2) {
    issues.push(`Низкий cache hit rate: ${(stats.cacheHitRate * 100).toFixed(0)}%`)
    recommendations.push('Увеличьте TTL кэша или проверьте ключи кэширования')
  }
  
  // Определяем статус
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (issues.length >= 3) {
    status = 'unhealthy'
  } else if (issues.length >= 1) {
    status = 'degraded'
  }
  
  return { status, issues, recommendations }
}
