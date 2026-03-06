/**
 * Quality Gateway - Централизованная проверка качества контента
 * 
 * Единая точка входа для:
 * - Валидации теории и заданий
 * - Retry при низком качестве (до N попыток)
 * - Применения fallback как последней меры
 * - Логирования метрик качества
 * - Принятия решения о кэшировании
 */

import { validateTheoryContent, validateTasks, type ValidationResult } from './validators/content-validator'
import { getFallbackTheory, getFallbackTasks } from './fallback-content'
import type { Domain } from './domain-prompts'

// ==================== ТИПЫ ====================

export interface QualityGatewayInput {
  content: string
  tasks: any[]
  topicName: string
  courseName: string
  domain?: Domain
}

export interface QualityMetrics {
  theoryScore: number
  tasksScore: number
  overallScore: number
  passed: boolean
  usedFallback: boolean
  theoryFallback: boolean
  tasksFallback: boolean
  retryCount: number
}

export interface QualityGatewayResult {
  content: string
  tasks: any[]
  quality: QualityMetrics
  issues: string[]
  validation: {
    theory: ValidationResult
    tasks: ValidationResult
  }
}

/**
 * Callback для повторной генерации контента.
 * Gateway вызывает его, если качество ниже SERVE порога.
 * Возвращает новый контент / задания, или null если retry невозможен.
 */
export interface RetryCallback {
  retryTheory?: () => Promise<string | null>
  retryTasks?: () => Promise<any[] | null>
}

// ==================== КОНФИГУРАЦИЯ ====================

/** Теория весит 70 % общей оценки */
const THEORY_WEIGHT = 0.7
const TASKS_WEIGHT = 1 - THEORY_WEIGHT

/** Максимальное количество retry */
const MAX_RETRIES = 1

/**
 * Пороги качества для разных действий.
 * Подняты по сравнению с предыдущей версией — мы хотим высокий уровень.
 */
export const QUALITY_THRESHOLDS = {
  /** Минимальный score для кэширования */
  CACHE_THEORY: 60,
  CACHE_TASKS: 50,

  /** Минимальный score для отдачи пользователю (ниже — retry, потом fallback) */
  SERVE_THEORY: 45,
  SERVE_TASKS: 35,

  /** Минимальный общий score для "passed" */
  OVERALL_PASS: 55,
} as const

// ==================== ОСНОВНАЯ ФУНКЦИЯ ====================

/**
 * Пропускает контент через Quality Gateway.
 * Поддерживает retry: если score < SERVE порога и передан callback — повторная генерация.
 */
export async function processContentThroughGateway(
  input: QualityGatewayInput,
  retry?: RetryCallback,
): Promise<QualityGatewayResult> {
  const { topicName, courseName, domain = 'GENERAL' } = input
  const issues: string[] = []
  let retryCount = 0

  // ---------- Теория ----------
  let currentContent = input.content
  let theoryValidation = validateTheoryContent(currentContent, domain)
  let theoryFallback = false

  if (theoryValidation.score < QUALITY_THRESHOLDS.SERVE_THEORY && retry?.retryTheory) {
    retryCount++
    console.log(`[Quality Gateway] Theory score ${theoryValidation.score} < ${QUALITY_THRESHOLDS.SERVE_THEORY}, retrying...`)
    const retried = await retry.retryTheory()
    if (retried) {
      currentContent = retried
      theoryValidation = validateTheoryContent(currentContent, domain)
      issues.push(`[Retry] Теория перегенерирована (было ${input.content.length} → ${currentContent.length} символов)`)
    }
  }

  if (theoryValidation.score < QUALITY_THRESHOLDS.SERVE_THEORY) {
    currentContent = getFallbackTheory(topicName, courseName, domain)
    theoryFallback = true
    issues.push(`Теория заменена на fallback (score: ${theoryValidation.score})`)
  } else if (!theoryValidation.isValid) {
    issues.push(...theoryValidation.issues.map(i => `[Теория] ${i}`))
  }

  // ---------- Задания ----------
  let currentTasks = input.tasks
  let tasksValidation = validateTasks(currentTasks)
  let tasksFallback = false

  if (tasksValidation.score < QUALITY_THRESHOLDS.SERVE_TASKS && retry?.retryTasks) {
    retryCount++
    console.log(`[Quality Gateway] Tasks score ${tasksValidation.score} < ${QUALITY_THRESHOLDS.SERVE_TASKS}, retrying...`)
    const retried = await retry.retryTasks()
    if (retried) {
      currentTasks = retried
      tasksValidation = validateTasks(currentTasks)
      issues.push(`[Retry] Задания перегенерированы (было ${input.tasks.length} → ${currentTasks.length} шт.)`)
    }
  }

  if (tasksValidation.score < QUALITY_THRESHOLDS.SERVE_TASKS) {
    currentTasks = getFallbackTasks(topicName, domain)
    tasksFallback = true
    issues.push(`Задания заменены на fallback (score: ${tasksValidation.score})`)
  } else if (!tasksValidation.isValid) {
    issues.push(...tasksValidation.issues.map(i => `[Задания] ${i}`))
  }

  // ---------- Общий score ----------
  const overallScore = Math.round(
    (theoryValidation.score * THEORY_WEIGHT) + (tasksValidation.score * TASKS_WEIGHT)
  )

  const quality: QualityMetrics = {
    theoryScore: theoryValidation.score,
    tasksScore: tasksValidation.score,
    overallScore,
    passed: overallScore >= QUALITY_THRESHOLDS.OVERALL_PASS,
    usedFallback: theoryFallback || tasksFallback,
    theoryFallback,
    tasksFallback,
    retryCount,
  }

  return {
    content: currentContent,
    tasks: currentTasks,
    quality,
    issues,
    validation: {
      theory: theoryValidation,
      tasks: tasksValidation,
    },
  }
}

/**
 * Синхронная обёртка для обратной совместимости (без retry).
 * Используйте `processContentThroughGateway` с await для retry-логики.
 */
export function processContentThroughGatewaySync(input: QualityGatewayInput): QualityGatewayResult {
  const { topicName, courseName, domain = 'GENERAL' } = input
  const issues: string[] = []

  // Теория
  const theoryValidation = validateTheoryContent(input.content, domain)
  let finalContent = input.content
  let theoryFallback = false

  if (theoryValidation.score < QUALITY_THRESHOLDS.SERVE_THEORY) {
    finalContent = getFallbackTheory(topicName, courseName, domain)
    theoryFallback = true
    issues.push(`Теория заменена на fallback (score: ${theoryValidation.score})`)
  } else if (!theoryValidation.isValid) {
    issues.push(...theoryValidation.issues.map(i => `[Теория] ${i}`))
  }

  // Задания
  const tasksValidation = validateTasks(input.tasks)
  let finalTasks = input.tasks
  let tasksFallback = false

  if (tasksValidation.score < QUALITY_THRESHOLDS.SERVE_TASKS) {
    finalTasks = getFallbackTasks(topicName, domain)
    tasksFallback = true
    issues.push(`Задания заменены на fallback (score: ${tasksValidation.score})`)
  } else if (!tasksValidation.isValid) {
    issues.push(...tasksValidation.issues.map(i => `[Задания] ${i}`))
  }

  const overallScore = Math.round(
    (theoryValidation.score * THEORY_WEIGHT) + (tasksValidation.score * TASKS_WEIGHT)
  )

  return {
    content: finalContent,
    tasks: finalTasks,
    quality: {
      theoryScore: theoryValidation.score,
      tasksScore: tasksValidation.score,
      overallScore,
      passed: overallScore >= QUALITY_THRESHOLDS.OVERALL_PASS,
      usedFallback: theoryFallback || tasksFallback,
      theoryFallback,
      tasksFallback,
      retryCount: 0,
    },
    issues,
    validation: {
      theory: theoryValidation,
      tasks: tasksValidation,
    },
  }
}

// ==================== ЛОГИРОВАНИЕ ====================

/**
 * Логирует метрики качества в консоль
 */
export function logQualityMetrics(
  topicName: string,
  result: QualityGatewayResult,
): void {
  const { quality, issues } = result

  const statusEmoji = quality.passed ? '✅' : quality.usedFallback ? '⚠️' : '❌'
  const retryInfo = quality.retryCount > 0 ? ` (retries: ${quality.retryCount})` : ''

  console.log(`\n[Quality Gateway] ${statusEmoji} Topic: "${topicName}"${retryInfo}`)
  console.log(`  Theory:  ${quality.theoryScore}/100 ${quality.theoryFallback ? '(FALLBACK)' : ''}`)
  console.log(`  Tasks:   ${quality.tasksScore}/100 ${quality.tasksFallback ? '(FALLBACK)' : ''}`)
  console.log(`  Overall: ${quality.overallScore}/100 (${quality.passed ? 'PASS' : 'FAIL'})`)

  if (issues.length > 0) {
    const MAX_DISPLAYED_ISSUES = 5
    console.log(`  Issues (${issues.length}):`)
    issues.slice(0, MAX_DISPLAYED_ISSUES).forEach(issue => console.log(`    - ${issue}`))
    if (issues.length > MAX_DISPLAYED_ISSUES) {
      console.log(`    ... and ${issues.length - MAX_DISPLAYED_ISSUES} more`)
    }
  }
  console.log('')
}

/**
 * Форматирует метрики для API response
 */
export function formatQualityForResponse(result: QualityGatewayResult): {
  score: number
  passed: boolean
  fallback: boolean
  issues: string[]
  retryCount: number
} {
  const MAX_ISSUES_IN_RESPONSE = 10
  return {
    score: result.quality.overallScore,
    passed: result.quality.passed,
    fallback: result.quality.usedFallback,
    issues: result.issues.slice(0, MAX_ISSUES_IN_RESPONSE),
    retryCount: result.quality.retryCount,
  }
}

// ==================== УТИЛИТЫ ====================

/**
 * Проверяет, стоит ли кэшировать контент
 */
export function shouldCacheContent(result: QualityGatewayResult): {
  cacheTheory: boolean
  cacheTasks: boolean
} {
  return {
    cacheTheory: result.quality.theoryScore >= QUALITY_THRESHOLDS.CACHE_THEORY &&
                 !result.quality.theoryFallback,
    cacheTasks: result.quality.tasksScore >= QUALITY_THRESHOLDS.CACHE_TASKS &&
                !result.quality.tasksFallback,
  }
}

/**
 * Быстрая проверка качества без fallback
 */
export function quickQualityCheck(content: string, tasks: any[]): {
  theoryOk: boolean
  tasksOk: boolean
  overallOk: boolean
} {
  const theoryValidation = validateTheoryContent(content)
  const tasksValidation = validateTasks(tasks)

  return {
    theoryOk: theoryValidation.isValid,
    tasksOk: tasksValidation.isValid,
    overallOk: theoryValidation.isValid && tasksValidation.isValid,
  }
}

/**
 * Получить рекомендации по улучшению качества
 */
export function getQualityRecommendations(result: QualityGatewayResult): string[] {
  const recommendations: string[] = []

  if (result.quality.theoryScore < 50) {
    recommendations.push('Увеличить длину генерируемого контента (maxTokens)')
    recommendations.push('Добавить больше примеров в промпт')
  }

  if (result.quality.theoryScore < 70 && result.quality.theoryScore >= 50) {
    recommendations.push('Улучшить структуру контента (больше заголовков)')
  }

  if (result.quality.tasksScore < 50) {
    recommendations.push('Увеличить количество генерируемых заданий')
    recommendations.push('Добавить валидацию типов заданий в промпт')
  }

  if (result.validation.theory.issues.some(i => i.includes('повтор'))) {
    recommendations.push('Уменьшить temperature для более разнообразного контента')
  }

  if (result.validation.tasks.issues.some(i => i.includes('explanation'))) {
    recommendations.push('Требовать explanation в промпте для каждого задания')
  }

  if (result.validation.tasks.issues.some(i => i.includes('одного типа'))) {
    recommendations.push('Указать в промпте разнообразие типов: single, multiple, text, code')
  }

  return recommendations
}
