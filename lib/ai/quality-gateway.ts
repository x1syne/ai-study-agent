/**
 * Quality Gateway - Централизованная проверка качества контента
 * 
 * Единая точка входа для:
 * - Валидации теории и заданий
 * - Применения fallback при низком качестве
 * - Логирования метрик качества
 * - Принятия решения о кэшировании
 */

import { validateTheoryContent, validateTasks, type ValidationResult } from './validators/content-validator'
import { getFallbackTheory, getFallbackTasks, isFallbackContent } from './fallback-content'
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

// ==================== КОНФИГУРАЦИЯ ====================

/**
 * Пороги качества для разных действий
 */
export const QUALITY_THRESHOLDS = {
  // Минимальный score для кэширования
  CACHE_THEORY: 50,
  CACHE_TASKS: 40,
  
  // Минимальный score для отдачи пользователю (ниже — fallback)
  SERVE_THEORY: 30,
  SERVE_TASKS: 25,
  
  // Минимальный общий score для "passed"
  OVERALL_PASS: 45
} as const

// ==================== ОСНОВНАЯ ФУНКЦИЯ ====================

/**
 * Пропускает контент через Quality Gateway
 * 
 * @param input - Контент для проверки
 * @returns Проверенный контент с метриками качества
 */
export function processContentThroughGateway(input: QualityGatewayInput): QualityGatewayResult {
  const { content, tasks, topicName, courseName, domain = 'GENERAL' } = input
  const issues: string[] = []
  
  // 1. Валидация теории
  const theoryValidation = validateTheoryContent(content, domain)
  let finalContent = content
  let theoryFallback = false
  
  if (theoryValidation.score < QUALITY_THRESHOLDS.SERVE_THEORY) {
    finalContent = getFallbackTheory(topicName, courseName, domain)
    theoryFallback = true
    issues.push(`Теория заменена на fallback (score: ${theoryValidation.score})`)
  } else if (!theoryValidation.isValid) {
    issues.push(...theoryValidation.issues.map(i => `[Теория] ${i}`))
  }

  // 2. Валидация заданий
  const tasksValidation = validateTasks(tasks)
  let finalTasks = tasks
  let tasksFallback = false
  
  if (tasksValidation.score < QUALITY_THRESHOLDS.SERVE_TASKS) {
    finalTasks = getFallbackTasks(topicName, domain)
    tasksFallback = true
    issues.push(`Задания заменены на fallback (score: ${tasksValidation.score})`)
  } else if (!tasksValidation.isValid) {
    issues.push(...tasksValidation.issues.map(i => `[Задания] ${i}`))
  }

  // 3. Расчёт общего score (теория важнее — 70%)
  const overallScore = Math.round(
    (theoryValidation.score * 0.7) + (tasksValidation.score * 0.3)
  )

  // 4. Формируем метрики
  const quality: QualityMetrics = {
    theoryScore: theoryValidation.score,
    tasksScore: tasksValidation.score,
    overallScore,
    passed: overallScore >= QUALITY_THRESHOLDS.OVERALL_PASS,
    usedFallback: theoryFallback || tasksFallback,
    theoryFallback,
    tasksFallback
  }

  return {
    content: finalContent,
    tasks: finalTasks,
    quality,
    issues,
    validation: {
      theory: theoryValidation,
      tasks: tasksValidation
    }
  }
}

// ==================== ЛОГИРОВАНИЕ ====================

/**
 * Логирует метрики качества в консоль
 */
export function logQualityMetrics(
  topicName: string,
  result: QualityGatewayResult
): void {
  const { quality, issues } = result
  
  const statusEmoji = quality.passed ? '✅' : quality.usedFallback ? '⚠️' : '❌'
  
  console.log(`\n[Quality Gateway] ${statusEmoji} Topic: "${topicName}"`)
  console.log(`  Theory:  ${quality.theoryScore}/100 ${quality.theoryFallback ? '(FALLBACK)' : ''}`)
  console.log(`  Tasks:   ${quality.tasksScore}/100 ${quality.tasksFallback ? '(FALLBACK)' : ''}`)
  console.log(`  Overall: ${quality.overallScore}/100 (${quality.passed ? 'PASS' : 'FAIL'})`)
  
  if (issues.length > 0) {
    console.log(`  Issues (${issues.length}):`)
    issues.slice(0, 5).forEach(issue => console.log(`    - ${issue}`))
    if (issues.length > 5) {
      console.log(`    ... and ${issues.length - 5} more`)
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
} {
  return {
    score: result.quality.overallScore,
    passed: result.quality.passed,
    fallback: result.quality.usedFallback,
    issues: result.issues.slice(0, 10) // Ограничиваем для response
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
                !result.quality.tasksFallback
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
    overallOk: theoryValidation.isValid && tasksValidation.isValid
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
  
  return recommendations
}
