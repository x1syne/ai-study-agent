/**
 * Retry Utility - Повторные попытки с экспоненциальной задержкой
 * 
 * Используется для:
 * - AI вызовов (rate limit, timeout)
 * - Внешних API (network errors)
 * - Любых нестабильных операций
 */

// ==================== ТИПЫ ====================

export interface RetryOptions {
  /** Максимум попыток (default: 3) */
  maxRetries: number
  /** Начальная задержка в мс (default: 1000) */
  initialDelay: number
  /** Максимальная задержка в мс (default: 10000) */
  maxDelay: number
  /** Множитель задержки (default: 2) */
  backoffMultiplier: number
  /** Функция для определения, стоит ли повторять (default: retryable errors) */
  shouldRetry?: (error: unknown) => boolean
  /** Callback при каждой попытке */
  onRetry?: (attempt: number, error: unknown) => void
}

// ==================== УТИЛИТЫ ====================

/**
 * Промис-based sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Извлекает сообщение из ошибки
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

/**
 * Определяет, является ли ошибка "повторяемой"
 * NOTE: Rate limit (429) errors should NOT be retried according to design spec
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false
  
  const message = getErrorMessage(error).toLowerCase()
  
  // Check for status code in error object
  const errorObj = error as any
  if (errorObj?.status === 429 || errorObj?.statusCode === 429) {
    return false // Do NOT retry rate limit errors
  }
  
  // Rate limit errors - do NOT retry
  if (message.includes('429') || message.includes('too many requests')) {
    return false
  }
  
  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out') || message.includes('aborted')) {
    return true
  }
  
  // Server errors (5xx)
  if (message.includes('503') || message.includes('502') || message.includes('500')) {
    return true
  }
  
  // Network errors
  if (message.includes('network') || message.includes('econnreset') || message.includes('enotfound')) {
    return true
  }
  
  // Overloaded
  if (message.includes('overloaded') || message.includes('capacity') || message.includes('busy')) {
    return true
  }
  
  return false
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Выполняет функцию с retry и экспоненциальной задержкой
 * 
 * @example
 * const result = await withRetry(
 *   () => fetchFromAPI(),
 *   { maxRetries: 3, initialDelay: 1000, maxDelay: 10000, backoffMultiplier: 2 }
 * )
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const opts = {
    shouldRetry: isRetryableError,
    ...options
  }
  let lastError: unknown

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Проверяем, стоит ли повторять
      if (!opts.shouldRetry(error)) {
        throw error
      }

      // Последняя попытка — не ждём, просто выбрасываем
      if (attempt === opts.maxRetries) {
        break
      }

      // Экспоненциальная задержка
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      )
      
      // Callback
      if (opts.onRetry) {
        opts.onRetry(attempt + 1, error)
      }

      await sleep(delay)
    }
  }

  throw lastError
}

// ==================== AI-SPECIFIC RETRY ====================

/**
 * Определяет, является ли ошибка AI API "повторяемой"
 * Отличается от isRetryableError тем, что НЕ повторяет rate limit ошибки
 */
export function isAIRetryableError(error: unknown): boolean {
  return isRetryableError(error)
}

/**
 * Retry специально для AI вызовов
 * Использует настройки, оптимизированные для AI API
 */
export async function withAIRetry<T>(
  fn: () => Promise<T>,
  context: string = 'AI call'
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 2,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    shouldRetry: isAIRetryableError,
    onRetry: (attempt, error) => {
      console.warn(`[${context}] Retry attempt ${attempt}:`, getErrorMessage(error))
    }
  })
}
