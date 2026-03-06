/**
 * Content Validator - Валидация контента перед кэшированием
 * 
 * Проверяет качество сгенерированного контента:
 * - Теория: длина, структура, наличие примеров, таблицы, domain-specific
 * - Задания: структура, типы, разнообразие, explanation, распределение сложности
 */

import type { Domain } from '../domain-prompts'

export interface ValidationResult {
  isValid: boolean
  score: number        // 0-100
  issues: string[]     // Список проблем
  suggestions: string[] // Как исправить
}

// ==================== КОНСТАНТЫ ====================

/** Минимальная длина теории для жёсткого reject */
const THEORY_MIN_LENGTH = 5000
/** Длина, ниже которой снимаем баллы */
const THEORY_WARN_LENGTH = 10000
/** Минимальное количество секций H2 */
const THEORY_MIN_SECTIONS = 3
/** Минимум вариантов ответа в single/multiple */
const MIN_ANSWER_OPTIONS = 2
/** Минимальное количество заданий */
const TASKS_MIN_COUNT = 5
/** Минимальное количество заданий для предупреждения */
const TASKS_WARN_COUNT = 3
/** Порог уникальности параграфов */
const UNIQUE_PARAGRAPH_RATIO = 0.6
/** Минимальная доля кириллицы */
const MIN_CYRILLIC_RATIO = 0.2
/** Минимальная длина вопроса */
const MIN_QUESTION_LENGTH = 5
/** Минимальная длина explanation */
const MIN_EXPLANATION_LENGTH = 10

/** Типы заданий, которые мы поддерживаем */
const VALID_TASK_TYPES = ['single', 'multiple', 'text', 'number', 'code', 'matching'] as const
/** Уровни сложности */
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const

/** Какие домены требуют код-блоки */
const CODE_REQUIRED_DOMAINS: Domain[] = ['PROGRAMMING', 'ENGINEERING']
/** Какие домены требуют формулы LaTeX */
const FORMULA_REQUIRED_DOMAINS: Domain[] = ['MATHEMATICS', 'PHYSICS', 'ECONOMICS']
/** Паттерны placeholder-контента */
const PLACEHOLDER_PATTERNS = [
  /раздел генерируется/i,
  /lorem ipsum/i,
  /\[placeholder\]/i,
  /контент будет добавлен/i,
  /TODO:/,
  /FIXME:/,
  /секция в разработке/i,
] as const

// ==================== ТЕОРИЯ ====================

/**
 * Валидация теории перед кэшированием
 */
export function validateTheoryContent(content: string, domain?: string): ValidationResult {
  const issues: string[] = []
  const suggestions: string[] = []
  let score = 100
  const typedDomain = (domain ?? 'GENERAL') as Domain

  score -= checkTheoryLength(content, issues, suggestions)
  score -= checkTheoryStructure(content, issues, suggestions)
  score -= checkTheoryExamples(content, issues, suggestions)
  score -= checkTheoryTables(content, issues, suggestions)
  score -= checkTheoryPlaceholders(content, issues)
  score -= checkTheoryRepetitions(content, issues)
  score -= checkTheoryLanguage(content, issues)
  score -= checkTheoryTruncation(content, issues)
  score -= checkDomainSpecific(content, typedDomain, issues, suggestions)

  return {
    isValid: score >= 50,
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions,
  }
}

/** Проверка длины контента */
function checkTheoryLength(content: string, issues: string[], suggestions: string[]): number {
  if (content.length < THEORY_MIN_LENGTH) {
    issues.push(`Слишком короткий контент: ${content.length} символов (минимум ${THEORY_MIN_LENGTH})`)
    suggestions.push('Увеличить maxTokens или переформулировать промпт')
    return 35
  }
  if (content.length < THEORY_WARN_LENGTH) {
    issues.push(`Короткий контент: ${content.length} символов (рекомендуется ${THEORY_WARN_LENGTH}+)`)
    return 10
  }
  return 0
}

/** Проверка структуры (заголовки) */
function checkTheoryStructure(content: string, issues: string[], suggestions: string[]): number {
  let penalty = 0
  const h2Count = (content.match(/^## /gm) || []).length
  const h3Count = (content.match(/^### /gm) || []).length

  if (h2Count < THEORY_MIN_SECTIONS) {
    issues.push(`Мало секций: ${h2Count} H2 (минимум ${THEORY_MIN_SECTIONS})`)
    suggestions.push('Проверить шаблоны секций в domain-prompts')
    penalty += 20
  }

  if (h2Count >= THEORY_MIN_SECTIONS && h3Count < 2) {
    issues.push(`Мало подзаголовков: ${h3Count} H3 (рекомендуется 2+)`)
    penalty += 5
  }

  return penalty
}

/** Проверка наличия примеров/кода/формул/списков */
function checkTheoryExamples(content: string, issues: string[], suggestions: string[]): number {
  const hasCodeBlocks = content.includes('```')
  const hasExamples = /пример|example|например/i.test(content)
  const hasFormulas = /\$[^$]+\$/.test(content) || content.includes('\\frac') || content.includes('\\sum')
  const hasLists = (content.match(/^[-*]\s/gm) || []).length >= 2

  if (!hasCodeBlocks && !hasExamples && !hasFormulas && !hasLists) {
    issues.push('Нет примеров, кода, формул или списков')
    suggestions.push('Добавить примеры в промпт')
    return 10
  }
  return 0
}

/** Проверка наличия markdown-таблиц */
function checkTheoryTables(content: string, issues: string[], suggestions: string[]): number {
  // Ищем markdown-таблицу: строка с | и разделитель |---|
  const hasTable = /\|.+\|/.test(content) && /\|[-:]+\|/.test(content)

  if (!hasTable) {
    issues.push('Нет сравнительных таблиц (мы их требуем где есть что сравнивать)')
    suggestions.push('Добавить хотя бы одну markdown-таблицу')
    return 5
  }
  return 0
}

/** Проверка placeholder-контента */
function checkTheoryPlaceholders(content: string, issues: string[]): number {
  let penalty = 0
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(content)) {
      issues.push(`Найден placeholder: ${pattern.source}`)
      penalty += 25
    }
  }
  return penalty
}

/** Проверка на повторяющийся контент */
function checkTheoryRepetitions(content: string, issues: string[]): number {
  const paragraphs = content.split(/\n\n+/).filter(p => p.length > 100)
  if (paragraphs.length > 3) {
    const uniqueParagraphs = new Set(paragraphs.map(p => p.slice(0, 150).toLowerCase()))
    const uniqueRatio = uniqueParagraphs.size / paragraphs.length

    if (uniqueRatio < UNIQUE_PARAGRAPH_RATIO) {
      issues.push(`Много повторяющегося контента (${Math.round(uniqueRatio * 100)}% уникальных)`)
      return 20
    }
  }
  return 0
}

/** Проверка языка — контент должен быть на русском */
function checkTheoryLanguage(content: string, issues: string[]): number {
  const totalChars = content.replace(/\s/g, '').length
  const cyrillicChars = (content.match(/[а-яёА-ЯЁ]/g) || []).length
  const cyrillicRatio = totalChars > 0 ? cyrillicChars / totalChars : 0

  if (cyrillicRatio < MIN_CYRILLIC_RATIO && totalChars > 500) {
    issues.push(`Контент преимущественно не на русском (${Math.round(cyrillicRatio * 100)}% кириллицы)`)
    return 10
  }
  return 0
}

/** Проверка обрезанного контента */
function checkTheoryTruncation(content: string, issues: string[]): number {
  const trimmed = content.trim()
  const lastChars = trimmed.slice(-50)
  if (lastChars.includes('...') || /[а-яa-z]$/i.test(trimmed)) {
    if (!trimmed.endsWith('.') && !trimmed.endsWith('```') && !trimmed.endsWith(':') && !trimmed.endsWith('|')) {
      issues.push('Контент может быть обрезан')
      return 5
    }
  }
  return 0
}

/** Domain-specific проверки */
function checkDomainSpecific(content: string, domain: Domain, issues: string[], suggestions: string[]): number {
  let penalty = 0

  // Код обязателен для программирования и инженерии
  if (CODE_REQUIRED_DOMAINS.includes(domain) && !content.includes('```')) {
    issues.push(`[${domain}] Нет блоков кода — для этого домена они обязательны`)
    suggestions.push('Убедиться что промпт требует рабочие примеры кода')
    penalty += 10
  }

  // Формулы обязательны для математики, физики, экономики
  if (FORMULA_REQUIRED_DOMAINS.includes(domain)) {
    const hasLatex = /\$[^$]+\$/.test(content) || content.includes('\\frac') || content.includes('\\sum')
    if (!hasLatex) {
      issues.push(`[${domain}] Нет LaTeX-формул — для этого домена они обязательны`)
      suggestions.push('Добавить формулы в LaTeX-формате')
      penalty += 10
    }
  }

  // Для медицины — проверка доказательной базы
  if (domain === 'MEDICINE') {
    const hasEvidence = /доказательн|EBM|рандомизированн|мета-анализ|систематическ|клинических рекомендац/i.test(content)
    if (!hasEvidence) {
      issues.push('[MEDICINE] Нет ссылок на доказательную медицину')
      penalty += 5
    }
  }

  // Для права — ссылки на нормативные акты
  if (domain === 'LAW') {
    const hasLegalRefs = /ст\.\s*\d|статья\s+\d|ГК РФ|УК РФ|ФЗ|федеральн/i.test(content)
    if (!hasLegalRefs) {
      issues.push('[LAW] Нет ссылок на нормативные акты')
      penalty += 5
    }
  }

  return penalty
}

// ==================== ЗАДАНИЯ ====================

/**
 * Валидация заданий перед кэшированием
 */
export function validateTasks(tasks: unknown): ValidationResult {
  const issues: string[] = []
  const suggestions: string[] = []
  let score = 100

  // 1. Проверка что это массив
  if (!Array.isArray(tasks)) {
    return {
      isValid: false,
      score: 0,
      issues: ['tasks не является массивом'],
      suggestions: ['Проверить парсинг JSON'],
    }
  }

  // 2. Количество
  score -= checkTasksCount(tasks, issues, suggestions)

  // 3. Структура каждого задания
  const { penalty: structurePenalty, invalidCount } = checkTasksStructure(tasks, issues)
  score -= structurePenalty

  // 4. Разнообразие типов
  score -= checkTasksTypeDiversity(tasks, issues, suggestions)

  // 5. Наличие explanation
  score -= checkTasksExplanation(tasks, issues, suggestions)

  // 6. Распределение сложности
  score -= checkTasksDifficulty(tasks, issues, suggestions)

  // 7. Дубликаты
  score -= checkTasksDuplicates(tasks, issues)

  // 8. Слишком много невалидных
  if (invalidCount > tasks.length * 0.5) {
    issues.push(`Более половины заданий невалидны (${invalidCount}/${tasks.length})`)
    score -= 20
  }

  return {
    isValid: score >= 40,
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions,
  }
}

/** Проверка количества заданий */
function checkTasksCount(tasks: unknown[], issues: string[], suggestions: string[]): number {
  if (tasks.length < TASKS_WARN_COUNT) {
    issues.push(`Мало заданий: ${tasks.length} (минимум ${TASKS_WARN_COUNT})`)
    suggestions.push('Увеличить количество заданий в промпте')
    return 30
  }
  if (tasks.length < TASKS_MIN_COUNT) {
    issues.push(`Недостаточно заданий: ${tasks.length} (рекомендуется ${TASKS_MIN_COUNT}+)`)
    return 10
  }
  return 0
}

/** Проверка структуры каждого задания */
function checkTasksStructure(tasks: unknown[], issues: string[]): { penalty: number, invalidCount: number } {
  let penalty = 0
  let invalidCount = 0

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i] as Record<string, unknown>
    let taskValid = true

    // Вопрос
    if (!task.question || typeof task.question !== 'string' || (task.question as string).length < MIN_QUESTION_LENGTH) {
      issues.push(`Задание ${i + 1}: пустой или короткий вопрос`)
      penalty += 3
      taskValid = false
    }

    // Тип
    if (!task.type || !VALID_TASK_TYPES.includes(task.type as typeof VALID_TASK_TYPES[number])) {
      issues.push(`Задание ${i + 1}: неизвестный тип "${task.type}"`)
      penalty += 3
      taskValid = false
    }

    // Варианты для single/multiple
    if ((task.type === 'single' || task.type === 'multiple') &&
        (!Array.isArray(task.options) || (task.options as unknown[]).length < MIN_ANSWER_OPTIONS)) {
      issues.push(`Задание ${i + 1}: мало вариантов ответа`)
      penalty += 3
      taskValid = false
    }

    // Правильный ответ
    const hasCorrectAnswer = task.correctAnswer !== undefined ||
                             task.correctAnswers !== undefined ||
                             task.answer !== undefined
    if (!hasCorrectAnswer) {
      issues.push(`Задание ${i + 1}: нет правильного ответа`)
      penalty += 5
      taskValid = false
    }

    if (!taskValid) invalidCount++
  }

  return { penalty, invalidCount }
}

/** Проверка разнообразия типов заданий */
function checkTasksTypeDiversity(tasks: unknown[], issues: string[], suggestions: string[]): number {
  if (tasks.length < 4) return 0 // мало заданий — не проверяем

  const types = tasks.map(t => (t as Record<string, unknown>).type as string).filter(Boolean)
  const uniqueTypes = new Set(types)

  if (uniqueTypes.size === 1) {
    issues.push(`Все задания одного типа (${types[0]}) — нет разнообразия`)
    suggestions.push('Смешать типы: single, multiple, text, code, matching')
    return 10
  }

  if (uniqueTypes.size === 2 && tasks.length >= 6) {
    issues.push(`Только 2 типа заданий при ${tasks.length} вопросах`)
    return 5
  }

  return 0
}

/** Проверка наличия explanation в заданиях */
function checkTasksExplanation(tasks: unknown[], issues: string[], suggestions: string[]): number {
  if (tasks.length === 0) return 0

  const withExplanation = tasks.filter(t => {
    const task = t as Record<string, unknown>
    return task.explanation && typeof task.explanation === 'string' &&
           (task.explanation as string).length >= MIN_EXPLANATION_LENGTH
  }).length

  const ratio = withExplanation / tasks.length

  if (ratio < 0.5) {
    issues.push(`Только ${withExplanation}/${tasks.length} заданий имеют explanation`)
    suggestions.push('Добавить объяснение правильного ответа к каждому заданию')
    return 10
  }

  if (ratio < 0.8) {
    issues.push(`Не у всех заданий есть explanation (${withExplanation}/${tasks.length})`)
    return 5
  }

  return 0
}

/** Проверка распределения сложности */
function checkTasksDifficulty(tasks: unknown[], issues: string[], suggestions: string[]): number {
  if (tasks.length < TASKS_MIN_COUNT) return 0

  let penalty = 0
  const difficulties = tasks.map(t => (t as Record<string, unknown>).difficulty as string)
  const easyCount = difficulties.filter(d => d === 'easy').length
  const hardCount = difficulties.filter(d => d === 'hard' || d === 'expert').length

  if (easyCount === 0) {
    issues.push('Нет лёгких заданий — нужны для разогрева')
    suggestions.push('Добавить easy задания в промпт')
    penalty += 5
  }

  if (hardCount === 0) {
    issues.push('Нет сложных заданий (hard/expert)')
    penalty += 3
  }

  // Если все одной сложности
  const uniqueDiffs = new Set(difficulties.filter(Boolean))
  if (uniqueDiffs.size === 1 && tasks.length >= 5) {
    issues.push(`Все задания одной сложности (${difficulties[0]}) — нужно разнообразие`)
    penalty += 7
  }

  return penalty
}

/** Проверка на дубликаты */
function checkTasksDuplicates(tasks: unknown[], issues: string[]): number {
  if (tasks.length < 3) return 0

  const questions = tasks.map(t =>
    ((t as Record<string, unknown>).question as string || '').toLowerCase().slice(0, 50)
  )
  const uniqueQuestions = new Set(questions.filter(q => q.length > 0))

  if (uniqueQuestions.size < tasks.length * 0.7) {
    issues.push('Есть дублирующиеся вопросы')
    return 15
  }
  return 0
}

// ==================== БЫСТРЫЕ ПРОВЕРКИ ====================

/**
 * Быстрая проверка - можно ли кэшировать контент
 */
export function canCacheContent(content: string): boolean {
  if (content.length < 1000) return false
  if ((content.match(/^## /gm) || []).length < 1) return false

  // Проверка на placeholder
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(content)) return false
  }

  return true
}

/**
 * Быстрая проверка - можно ли кэшировать задания
 */
export function canCacheTasks(tasks: unknown): boolean {
  if (!Array.isArray(tasks)) return false
  if (tasks.length < 2) return false

  // Проверяем что хотя бы половина заданий имеет вопрос
  const validCount = tasks.filter(t => {
    const task = t as Record<string, unknown>
    return task.question && typeof task.question === 'string' && (task.question as string).length > MIN_QUESTION_LENGTH
  }).length

  return validCount >= tasks.length * 0.5
}
