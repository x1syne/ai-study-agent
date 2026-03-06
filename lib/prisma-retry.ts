/**
 * Prisma Retry Helper
 * Автоматический retry при ошибках соединения с БД.
 * 
 * ВАЖНО: НЕ делаем $disconnect/$connect — это создаёт новые TCP-соединения
 * и вызывает MaxClientsInSessionMode на Supabase free tier.
 * Prisma сама переподключается при следующем запросе.
 */

const MAX_RETRIES = 3
/** Задержка между попытками (мс): 300, 600, 900 */
const BASE_DELAY_MS = 300

/** Проверяет, является ли ошибка проблемой соединения с БД */
function isConnectionError(error: any): boolean {
  const code = error?.code
  const msg = error?.message || ''
  return (
    code === 'P1017' ||
    code === 'P2024' ||
    msg.includes('Server has closed the connection') ||
    msg.includes('Connection terminated unexpectedly') ||
    msg.includes('Timed out fetching a new connection') ||
    msg.includes('ConnectionReset') ||
    msg.includes('max clients reached') ||
    msg.includes("Can't reach database server")
  )
}

/**
 * Выполнить Prisma запрос с автоматическим retry при ошибке соединения.
 * Не пересоздаёт соединение — просто ждёт и повторяет запрос.
 */
export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  maxRetries = MAX_RETRIES
): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error

      if (!isConnectionError(error)) {
        throw error // Не ошибка соединения — пробрасываем сразу
      }

      console.warn(`[Prisma Retry] Connection error on attempt ${attempt}/${maxRetries}: ${error.message?.slice(0, 80)}`)

      if (attempt < maxRetries) {
        // Просто ждём — Prisma сама переподключится при следующем запросе
        const delay = BASE_DELAY_MS * attempt
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  console.error(`[Prisma Retry] All ${maxRetries} attempts failed`)
  throw lastError
}
