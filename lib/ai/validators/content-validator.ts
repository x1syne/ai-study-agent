/**
 * Content Validator - Валидация контента перед кэшированием
 * 
 * Проверяет качество сгенерированного контента:
 * - Теория: длина, структура, наличие примеров
 * - Задания: структура, типы, распределение сложности
 */

export interface ValidationResult {
  isValid: boolean
  score: number        // 0-100
  issues: string[]     // Список проблем
  suggestions: string[] // Как исправить
}

/**
 * Валидация теории перед кэшированием
 */
export function validateTheoryContent(content: string, domain?: string): ValidationResult {
  const issues: string[] = []
  const suggestions: string[] = []
  let score = 100

  // 1. Минимальная длина (2500 слов ≈ 15000 символов, но принимаем от 5000)
  if (content.length < 3000) {
    issues.push(`Слишком короткий контент: ${content.length} символов (минимум 3000)`)
    suggestions.push('Увеличить maxTokens или переформулировать промпт')
    score -= 35
  } else if (content.length < 5000) {
    issues.push(`Короткий контент: ${content.length} символов`)
    score -= 15
  }

  // 2. Наличие структуры (заголовки ##)
  const h2Count = (content.match(/^## /gm) || []).length
  const h3Count = (content.match(/^### /gm) || []).length
  
  if (h2Count < 2) {
    issues.push(`Мало секций: ${h2Count} (минимум 2)`)
    suggestions.push('Проверить шаблоны секций в domain-prompts')
    score -= 20
  }
  
  if (h2Count >= 2 && h3Count < 1) {
    issues.push('Нет подзаголовков (###)')
    score -= 5
  }

  // 3. Наличие примеров
  const hasCodeBlocks = content.includes('```')
  const hasExamples = /пример|example|например/i.test(content)
  const hasFormulas = content.includes('$') || content.includes('\\frac') || content.includes('\\sum')
  const hasLists = (content.match(/^[-*]\s/gm) || []).length >= 2
  
  if (!hasCodeBlocks && !hasExamples && !hasFormulas && !hasLists) {
    issues.push('Нет примеров, кода, формул или списков')
    suggestions.push('Добавить примеры в промпт')
    score -= 10
  }

  // 4. Проверка на "мусорный" контент
  const placeholderPatterns = [
    /раздел генерируется/i,
    /lorem ipsum/i,
    /\[placeholder\]/i,
    /контент будет добавлен/i,
    /TODO:/,
    /FIXME:/,
    /секция в разработке/i
  ]
  
  for (const pattern of placeholderPatterns) {
    if (pattern.test(content)) {
      issues.push(`Найден placeholder: ${pattern.source}`)
      score -= 25
    }
  }

  // 5. Проверка на повторения (один абзац повторяется)
  const paragraphs = content.split(/\n\n+/).filter(p => p.length > 100)
  if (paragraphs.length > 3) {
    const uniqueParagraphs = new Set(paragraphs.map(p => p.slice(0, 150).toLowerCase()))
    const uniqueRatio = uniqueParagraphs.size / paragraphs.length
    
    if (uniqueRatio < 0.6) {
      issues.push('Много повторяющегося контента')
      score -= 20
    }
  }

  // 6. Проверка языка (должен быть русский)
  const totalChars = content.replace(/\s/g, '').length
  const cyrillicChars = (content.match(/[а-яёА-ЯЁ]/g) || []).length
  const cyrillicRatio = totalChars > 0 ? cyrillicChars / totalChars : 0
  
  if (cyrillicRatio < 0.2 && totalChars > 500) {
    issues.push(`Контент преимущественно не на русском языке (${Math.round(cyrillicRatio * 100)}% кириллицы)`)
    score -= 10
  }

  // 7. Проверка на обрезанный контент
  const lastChars = content.slice(-50)
  if (lastChars.includes('...') || /[а-яa-z]$/i.test(content.trim())) {
    // Может быть обрезан, но не критично
    if (!content.trim().endsWith('.') && !content.trim().endsWith('```') && !content.trim().endsWith(':')) {
      issues.push('Контент может быть обрезан')
      score -= 5
    }
  }

  return {
    isValid: score >= 50,
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions
  }
}

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
      suggestions: ['Проверить парсинг JSON'] 
    }
  }
  
  // 2. Минимальное количество
  if (tasks.length < 3) {
    issues.push(`Мало заданий: ${tasks.length} (минимум 3)`)
    score -= 30
  } else if (tasks.length < 5) {
    issues.push(`Недостаточно заданий: ${tasks.length} (рекомендуется 5+)`)
    score -= 10
  }

  // 3. Проверка структуры каждого задания
  const validTypes = ['single', 'multiple', 'text', 'number', 'code', 'matching']
  const validDifficulties = ['easy', 'medium', 'hard', 'expert']
  
  let invalidTasks = 0
  
  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i] as Record<string, unknown>
    let taskValid = true
    
    // Проверка вопроса
    if (!task.question || typeof task.question !== 'string' || (task.question as string).length < 5) {
      issues.push(`Задание ${i + 1}: пустой или короткий вопрос`)
      score -= 3
      taskValid = false
    }
    
    // Проверка типа
    if (!task.type || !validTypes.includes(task.type as string)) {
      issues.push(`Задание ${i + 1}: неизвестный тип "${task.type}"`)
      score -= 3
      taskValid = false
    }
    
    // Проверка вариантов для single/multiple
    if ((task.type === 'single' || task.type === 'multiple') && 
        (!Array.isArray(task.options) || (task.options as unknown[]).length < 2)) {
      issues.push(`Задание ${i + 1}: мало вариантов ответа`)
      score -= 3
      taskValid = false
    }
    
    // Проверка правильного ответа
    const hasCorrectAnswer = task.correctAnswer !== undefined || 
                             task.correctAnswers !== undefined ||
                             task.answer !== undefined
    if (!hasCorrectAnswer) {
      issues.push(`Задание ${i + 1}: нет правильного ответа`)
      score -= 5
      taskValid = false
    }
    
    if (!taskValid) invalidTasks++
  }

  // 4. Распределение сложности
  if (tasks.length >= 5) {
    const difficulties = tasks.map(t => (t as Record<string, unknown>).difficulty as string)
    const easyCount = difficulties.filter(d => d === 'easy').length
    const hardCount = difficulties.filter(d => d === 'hard' || d === 'expert').length
    
    if (easyCount === 0) {
      issues.push('Нет лёгких заданий')
      suggestions.push('Добавить easy задания в промпт')
      score -= 5
    }
    
    if (hardCount === 0) {
      issues.push('Нет сложных заданий')
      score -= 3
    }
  }

  // 5. Проверка на дубликаты вопросов
  if (tasks.length >= 3) {
    const questions = tasks.map(t => 
      ((t as Record<string, unknown>).question as string || '').toLowerCase().slice(0, 50)
    )
    const uniqueQuestions = new Set(questions.filter(q => q.length > 0))
    
    if (uniqueQuestions.size < tasks.length * 0.7) {
      issues.push('Есть дублирующиеся вопросы')
      score -= 15
    }
  }

  // 6. Слишком много невалидных заданий
  if (invalidTasks > tasks.length * 0.5) {
    issues.push(`Более половины заданий невалидны (${invalidTasks}/${tasks.length})`)
    score -= 20
  }

  return {
    isValid: score >= 40,
    score: Math.max(0, Math.min(100, score)),
    issues,
    suggestions
  }
}

/**
 * Быстрая проверка - можно ли кэшировать контент
 */
export function canCacheContent(content: string): boolean {
  // Минимальные требования для кэширования
  if (content.length < 1000) return false
  if ((content.match(/^## /gm) || []).length < 1) return false
  
  // Проверка на placeholder
  if (/раздел генерируется|lorem ipsum|\[placeholder\]/i.test(content)) return false
  
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
    return task.question && typeof task.question === 'string' && (task.question as string).length > 5
  }).length
  
  return validCount >= tasks.length * 0.5
}
