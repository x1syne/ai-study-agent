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
  maxRetries?: number
  /** Начальная задержка в мс (default: 1000) */
  baseDelayMs?: number
  /** Максимальная задержка в мс (default: 10000) */
  maxDelayMs?: number
  /** Множитель задержки (default: 2) */
  backoffFactor?: number
  /** Функция для определения, стоит ли повторять (default: retryable errors) */
  shouldRetry?: (error: unknown) => boolean
  /** Callback при каждой попытке */
  onRetry?: (attempt: number, error: unknown, delayMs: number) => void
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: unknown
  attempts: number
  totalTimeMs: number
}

// ==================== КОНФИГУРАЦИЯ ====================

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> & { onRetry?: RetryOptions['onRetry'] } = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
  shouldRetry: isRetryableError,
  onRetry: undefined
}

/**
 * Определяет, является ли ошибка "повторяемой"
 */
export function isRetryableError(error: unknown): boolean {
  if (!error) return false
  
  const message = getErrorMessage(error).toLowerCase()
  
  // Rate limit errors
  if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
    return true
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

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Выполняет функцию с retry и экспоненциальной задержкой
 * 
 * @example
 * const result = await withRetry(
 *   () => fetchFromAPI(),
 *   { maxRetries: 3, baseDelayMs: 1000 }
 * )
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
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

      // Экспоненциальная задержка с jitter
      const delay = calculateDelay(attempt, opts.baseDelayMs, opts.maxDelayMs, opts.backoffFactor)
      
      // Callback
      if (opts.onRetry) {
        opts.onRetry(attempt, error, delay)
      }

      await sleep(delay)
    }
  }

  throw lastError
}

/**
 * Версия withRetry которая возвращает результат вместо throw
 */
export async function withRetryResult<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const startTime = Date.now()
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let attempts = 0
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxRetries; attempt++) {
    attempts = attempt
    try {
      const data = await fn()
      return {
        success: true,
        data,
        attempts,
        totalTimeMs: Date.now() - startTime
      }
    } catch (error) {
      lastError = error
      
      if (!opts.shouldRetry(error) || attempt === opts.maxRetries) {
        break
      }

      const delay = calculateDelay(attempt, opts.baseDelayMs, opts.maxDelayMs, opts.backoffFactor)
      
      if (opts.onRetry) {
        opts.onRetry(attempt, error, delay)
      }

      await sleep(delay)
    }
  }

  return {
    success: false,
    error: lastError,
    attempts,
    totalTimeMs: Date.now() - startTime
  }
}

// ==================== AI-СПЕЦИФИЧНЫЕ ФУНКЦИИ ====================

/**
 * Retry для AI вызовов с оптимизированными настройками
 */
export async function withAIRetry<T>(
  fn: () => Promise<T>,
  context: string = 'AI call'
): Promise<T> {
  return withRetry(fn, {
    maxRetries: 2,  // Для AI достаточно 2 попыток (потом fallback провайдер)
    baseDelayMs: 2000,
    maxDelayMs: 8000,
    backoffFactor: 2,
    shouldRetry: isAIRetryableError,
    onRetry: (attempt, error, delay) => {
      console.log(`[${context}] Attempt ${attempt} failed, retrying in ${delay}ms...`)
      console.log(`[${context}] Error: ${getErrorMessage(error).slice(0, 100)}`)
    }
  })
}

/**
 * Определяет, является ли AI ошибка "повторяемой"
 */
export function isAIRetryableError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  
  // Rate limit — точно повторяем
  if (message.includes('rate limit') || message.includes('429')) {
    return true
  }
  
  // Timeout — повторяем
  if (message.includes('timeout') || message.includes('aborted')) {
    return true
  }
  
  // Сервер перегружен
  if (message.includes('overloaded') || message.includes('503') || message.includes('capacity')) {
    return true
  }
  
  // Сетевые ошибки
  if (message.includes('network') || message.includes('econnreset')) {
    return true
  }
  
  // НЕ повторяем: invalid API key, bad request, content policy
  if (message.includes('invalid') || message.includes('401') || message.includes('400')) {
    return false
  }
  
  if (message.includes('content policy') || message.includes('safety')) {
    return false
  }
  
  return false
}

// ==================== УТИЛИТЫ ====================

/**
 * Вычисляет задержку с экспоненциальным backoff и jitter
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  factor: number
): number {
  // Экспоненциальная задержка: base * factor^(attempt-1)
  const exponentialDelay = baseDelay * Math.pow(factor, attempt - 1)
  
  // Ограничиваем максимумом
  const cappedDelay = Math.min(exponentialDelay, maxDelay)
  
  // Добавляем jitter ±20% для избежания thundering herd
  const jitter = cappedDelay * 0.2 * (Math.random() * 2 - 1)
  
  return Math.round(cappedDelay + jitter)
}

/**
 * Промис-based sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Создаёт retry-обёртку для функции
 */
export function createRetryWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), options)
}
