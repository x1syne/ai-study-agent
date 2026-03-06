/**
 * MADI Parser Monitoring System
 * 
 * Отслеживает:
 * - Ошибки парсинга
 * - Доступность MADI сайта
 * - Метрики производительности
 * - Использование кэша
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

export interface MonitoringMetrics {
  // Parser metrics
  totalRequests: number
  successfulParses: number
  failedParses: number
  parseErrors: ParseError[]
  
  // Cache metrics
  cacheHits: number
  cacheMisses: number
  cacheHitRate: number
  
  // Performance metrics
  averageResponseTime: number
  slowestRequest: number
  fastestRequest: number
  
  // Site availability
  siteAvailable: boolean
  lastSuccessfulFetch: Date | null
  consecutiveFailures: number
  
  // Fallback usage
  fallbackCount: number
  staticDataUsed: number
}

export interface ParseError {
  timestamp: Date
  errorType: 'network' | 'parsing' | 'timeout' | 'unknown'
  message: string
  url?: string
  stackTrace?: string
}

export interface MonitoringAlert {
  level: 'info' | 'warning' | 'error' | 'critical'
  message: string
  timestamp: Date
  metrics?: Partial<MonitoringMetrics>
}

class MADIMonitoring {
  private metrics: MonitoringMetrics = {
    totalRequests: 0,
    successfulParses: 0,
    failedParses: 0,
    parseErrors: [],
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: 0,
    averageResponseTime: 0,
    slowestRequest: 0,
    fastestRequest: Infinity,
    siteAvailable: true,
    lastSuccessfulFetch: null,
    consecutiveFailures: 0,
    fallbackCount: 0,
    staticDataUsed: 0
  }
  
  private responseTimes: number[] = []
  private readonly MAX_ERRORS_STORED = 100
  private readonly ALERT_THRESHOLD_FAILURES = 5
  private readonly ALERT_THRESHOLD_SLOW_RESPONSE = 5000 // 5 seconds
  
  /**
   * Записать успешный парсинг
   */
  recordSuccess(responseTime: number): void {
    this.metrics.totalRequests++
    this.metrics.successfulParses++
    this.metrics.consecutiveFailures = 0
    this.metrics.siteAvailable = true
    this.metrics.lastSuccessfulFetch = new Date()
    
    this.updateResponseTime(responseTime)
    
    console.log(`[MADI Monitoring] ✅ Successful parse (${responseTime}ms)`)
  }
  
  /**
   * Записать ошибку парсинга
   */
  recordFailure(error: Error, errorType: ParseError['errorType'], url?: string): void {
    this.metrics.totalRequests++
    this.metrics.failedParses++
    this.metrics.consecutiveFailures++
    
    const parseError: ParseError = {
      timestamp: new Date(),
      errorType,
      message: error.message,
      url,
      stackTrace: error.stack
    }
    
    // Хранить только последние N ошибок
    this.metrics.parseErrors.push(parseError)
    if (this.metrics.parseErrors.length > this.MAX_ERRORS_STORED) {
      this.metrics.parseErrors.shift()
    }
    
    console.error(`[MADI Monitoring] ❌ Parse failure (${errorType}):`, error.message)
    
    // Проверить пороги для алертов
    this.checkAlertThresholds()
  }
  
  /**
   * Записать использование кэша
   */
  recordCacheHit(): void {
    this.metrics.cacheHits++
    this.updateCacheHitRate()
    console.log('[MADI Monitoring] 💾 Cache hit')
  }
  
  /**
   * Записать промах кэша
   */
  recordCacheMiss(): void {
    this.metrics.cacheMisses++
    this.updateCacheHitRate()
    console.log('[MADI Monitoring] 🔍 Cache miss')
  }
  
  /**
   * Записать использование fallback
   */
  recordFallback(toStatic: boolean = false): void {
    this.metrics.fallbackCount++
    if (toStatic) {
      this.metrics.staticDataUsed++
    }
    console.log(`[MADI Monitoring] 🔄 Fallback used${toStatic ? ' (static data)' : ''}`)
  }
  
  /**
   * Получить текущие метрики
   */
  getMetrics(): MonitoringMetrics {
    return { ...this.metrics }
  }
  
  /**
   * Получить статус здоровья системы
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    message: string
    metrics: MonitoringMetrics
  } {
    const { consecutiveFailures, cacheHitRate, siteAvailable } = this.metrics
    
    if (consecutiveFailures >= this.ALERT_THRESHOLD_FAILURES) {
      return {
        status: 'unhealthy',
        message: `MADI parser experiencing ${consecutiveFailures} consecutive failures`,
        metrics: this.getMetrics()
      }
    }
    
    if (!siteAvailable || cacheHitRate < 0.3) {
      return {
        status: 'degraded',
        message: 'MADI parser performance degraded',
        metrics: this.getMetrics()
      }
    }
    
    return {
      status: 'healthy',
      message: 'MADI parser operating normally',
      metrics: this.getMetrics()
    }
  }
  
  /**
   * Сбросить метрики
   */
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      successfulParses: 0,
      failedParses: 0,
      parseErrors: [],
      cacheHits: 0,
      cacheMisses: 0,
      cacheHitRate: 0,
      averageResponseTime: 0,
      slowestRequest: 0,
      fastestRequest: Infinity,
      siteAvailable: true,
      lastSuccessfulFetch: null,
      consecutiveFailures: 0,
      fallbackCount: 0,
      staticDataUsed: 0
    }
    this.responseTimes = []
    console.log('[MADI Monitoring] 🔄 Metrics reset')
  }
  
  /**
   * Получить последние ошибки
   */
  getRecentErrors(count: number = 10): ParseError[] {
    return this.metrics.parseErrors.slice(-count)
  }
  
  /**
   * Экспортировать метрики для внешних систем мониторинга
   */
  exportMetrics(): string {
    const health = this.getHealthStatus()
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      health: health.status,
      metrics: this.metrics,
      recentErrors: this.getRecentErrors(5)
    }, null, 2)
  }
  
  // Private methods
  
  private updateResponseTime(responseTime: number): void {
    this.responseTimes.push(responseTime)
    
    // Обновить среднее время
    const sum = this.responseTimes.reduce((a, b) => a + b, 0)
    this.metrics.averageResponseTime = Math.round(sum / this.responseTimes.length)
    
    // Обновить min/max
    if (responseTime > this.metrics.slowestRequest) {
      this.metrics.slowestRequest = responseTime
    }
    if (responseTime < this.metrics.fastestRequest) {
      this.metrics.fastestRequest = responseTime
    }
    
    // Проверить медленные запросы
    if (responseTime > this.ALERT_THRESHOLD_SLOW_RESPONSE) {
      this.sendAlert({
        level: 'warning',
        message: `Slow response detected: ${responseTime}ms`,
        timestamp: new Date()
      })
    }
  }
  
  private updateCacheHitRate(): void {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses
    this.metrics.cacheHitRate = total > 0 
      ? Math.round((this.metrics.cacheHits / total) * 100) / 100
      : 0
  }
  
  private checkAlertThresholds(): void {
    const { consecutiveFailures, failedParses, totalRequests } = this.metrics
    
    // Критический алерт: много последовательных ошибок
    if (consecutiveFailures >= this.ALERT_THRESHOLD_FAILURES) {
      this.metrics.siteAvailable = false
      this.sendAlert({
        level: 'critical',
        message: `MADI site may be down: ${consecutiveFailures} consecutive failures`,
        timestamp: new Date(),
        metrics: this.getMetrics()
      })
    }
    
    // Предупреждение: высокий процент ошибок
    if (totalRequests > 10 && failedParses / totalRequests > 0.5) {
      this.sendAlert({
        level: 'error',
        message: `High failure rate: ${Math.round((failedParses / totalRequests) * 100)}%`,
        timestamp: new Date(),
        metrics: this.getMetrics()
      })
    }
  }
  
  private sendAlert(alert: MonitoringAlert): void {
    const emoji = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨'
    }
    
    console.log(`[MADI Monitoring] ${emoji[alert.level]} ${alert.level.toUpperCase()}: ${alert.message}`)
    
    // В production можно отправлять в внешние системы мониторинга
    // например, Sentry, DataDog, или webhook для Telegram/Slack
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalMonitoring(alert)
    }
  }
  
  private async sendToExternalMonitoring(alert: MonitoringAlert): Promise<void> {
    // Интеграция с внешними системами мониторинга
    
    // 1. Pipedream webhook (уже настроен в проекте)
    if (process.env.PIPEDREAM_WEBHOOK_URL && alert.level === 'critical') {
      try {
        await fetch(process.env.PIPEDREAM_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.PIPEDREAM_AUTH_KEY}`
          },
          body: JSON.stringify({
            type: 'madi_parser_alert',
            alert,
            timestamp: new Date().toISOString()
          })
        })
      } catch (error) {
        console.error('[MADI Monitoring] Failed to send alert to Pipedream:', error)
      }
    }
    
    // 2. Можно добавить интеграцию с Sentry
    // if (typeof Sentry !== 'undefined') {
    //   Sentry.captureMessage(alert.message, alert.level)
    // }
  }
}

// Singleton instance
export const monitoring = new MADIMonitoring()

/**
 * Middleware для автоматического мониторинга
 */
export function withMonitoring<T>(
  operation: () => Promise<T>,
  operationType: 'parse' | 'cache' | 'fallback'
): Promise<T> {
  const startTime = Date.now()
  
  return operation()
    .then(result => {
      const responseTime = Date.now() - startTime
      
      if (operationType === 'parse') {
        monitoring.recordSuccess(responseTime)
      } else if (operationType === 'cache') {
        monitoring.recordCacheHit()
      }
      
      return result
    })
    .catch(error => {
      if (operationType === 'parse') {
        const errorType = error.message.includes('timeout') ? 'timeout'
          : error.message.includes('fetch') ? 'network'
          : 'parsing'
        
        monitoring.recordFailure(error, errorType)
      } else if (operationType === 'cache') {
        monitoring.recordCacheMiss()
      } else if (operationType === 'fallback') {
        monitoring.recordFallback(true)
      }
      
      throw error
    })
}
