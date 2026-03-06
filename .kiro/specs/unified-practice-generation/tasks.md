# Tasks Document: Унификация генерации практических заданий

## Task 1: Добавить BASE_PRACTICE_PROMPT и константы

### Description
Добавить базовый промпт и константы для унифицированной генерации практики в domain-prompts.ts

### Files to modify
- `lib/ai/domain-prompts.ts`

### Implementation details
1. Добавить константу DIFFICULTY_DISTRIBUTION:
```typescript
export const DIFFICULTY_DISTRIBUTION = {
  easy: 0.2,    // 20% — 3-4 задания из 15-20
  medium: 0.4,  // 40% — 6-8 заданий
  hard: 0.4     // 40% — 6-8 заданий
}
```

2. Добавить BASE_PRACTICE_PROMPT с общими правилами:
- Количество заданий: 15-20
- Прогрессия от easy к hard
- Привязка к теории
- Разнообразие формулировок
- Запрет однотипных задач

### Acceptance criteria
- [x] DIFFICULTY_DISTRIBUTION экспортируется
- [x] BASE_PRACTICE_PROMPT содержит все общие правила
- [x] Константы доступны для импорта

---

## Task 2: Создать функцию buildUnifiedPracticePrompt

### Description
Создать функцию, которая собирает финальный промпт из базовых правил и специфики домена

### Files to modify
- `lib/ai/domain-prompts.ts`

### Implementation details
```typescript
export function buildUnifiedPracticePrompt(
  domain: Domain,
  topicName: string,
  courseTitle: string,
  theoryContent: string
): string {
  const domainPrompt = getDomainPracticePrompt(domain)
  
  return `
═══════════════════════════════════════════════════════════════
📚 БАЗОВЫЕ ПРАВИЛА
═══════════════════════════════════════════════════════════════
${BASE_PRACTICE_PROMPT}

═══════════════════════════════════════════════════════════════
🎯 СПЕЦИФИКА ДОМЕНА: ${domain}
═══════════════════════════════════════════════════════════════
${domainPrompt.systemPrompt}

Предпочтительные типы заданий: ${domainPrompt.taskTypes.join(', ')}

═══════════════════════════════════════════════════════════════
📊 РАСПРЕДЕЛЕНИЕ СЛОЖНОСТИ (СТРОГО ОБЯЗАТЕЛЬНО!)
═══════════════════════════════════════════════════════════════
Создай 15-20 заданий с распределением:
- 3-4 задания easy (20%) — базовое понимание
- 6-8 заданий medium (40%) — применение знаний
- 6-8 заданий hard (40%) — анализ, нестандартные задачи

ВАЖНО: Не делай большинство заданий easy! Студенту нужны сложные задачи!

═══════════════════════════════════════════════════════════════
📝 ПРИМЕРЫ ЗАДАНИЙ
═══════════════════════════════════════════════════════════════
${domainPrompt.exampleTasks}

═══════════════════════════════════════════════════════════════
📖 ТЕОРИЯ (используй ТОЛЬКО этот материал)
═══════════════════════════════════════════════════════════════
Тема: "${topicName}"
Курс: "${courseTitle}"

${theoryContent}

═══════════════════════════════════════════════════════════════
Верни JSON: { "tasks": [...] }
`
}
```

### Acceptance criteria
- [x] Функция экспортируется
- [x] Принимает domain, topicName, courseTitle, theoryContent
- [x] Включает BASE_PRACTICE_PROMPT
- [x] Включает domainPrompt.systemPrompt
- [x] Включает распределение сложности
- [x] Включает примеры заданий

---

## Task 3: Создать функцию validateDifficultyDistribution

### Description
Создать функцию валидации распределения сложности заданий

### Files to modify
- `lib/ai/domain-prompts.ts`

### Implementation details
```typescript
export interface DifficultyValidationResult {
  isValid: boolean
  distribution: { easy: number; medium: number; hard: number }
  total: number
  issues: string[]
}

export function validateDifficultyDistribution(
  tasks: Array<{ difficulty?: string }>
): DifficultyValidationResult {
  const counts = { easy: 0, medium: 0, hard: 0 }
  
  tasks.forEach(task => {
    const diff = task.difficulty || 'medium'
    if (diff in counts) counts[diff as keyof typeof counts]++
  })
  
  const total = tasks.length
  const issues: string[] = []
  
  // Минимальные требования
  if (counts.easy < 2) issues.push('Недостаточно easy заданий (минимум 2)')
  if (counts.medium < 4) issues.push('Недостаточно medium заданий (минимум 4)')
  if (counts.hard < 4) issues.push('Недостаточно hard заданий (минимум 4)')
  
  // Проверка пропорций
  if (total > 0) {
    const easyRatio = counts.easy / total
    if (easyRatio > 0.35) {
      issues.push(`Слишком много easy заданий: ${Math.round(easyRatio * 100)}% (макс 35%)`)
    }
  }
  
  return {
    isValid: issues.length === 0,
    distribution: counts,
    total,
    issues
  }
}
```

### Acceptance criteria
- [x] Функция экспортируется
- [x] Возвращает isValid, distribution, total, issues
- [x] Проверяет минимумы для каждой сложности
- [x] Проверяет что easy не превышает 35%

---

## Task 4: Дополнить exampleTasks для всех доменов

### Description
Добавить качественные примеры заданий для доменов, где они отсутствуют или неполные

### Files to modify
- `lib/ai/domain-prompts.ts`

### Implementation details
Дополнить exampleTasks для:
- BIOLOGY_PRACTICE — добавить пример matching задания
- HISTORY_PRACTICE — добавить пример multiple задания
- ECONOMICS_PRACTICE — улучшить пример с реальными данными
- GENERAL_PRACTICE — добавить примеры разных типов

Каждый пример должен включать:
- type, difficulty, question
- correctAnswer/correctAnswers
- hint, explanation
- Для code: language, starterCode, testCases, solution

### Acceptance criteria
- [x] Все домены имеют непустые exampleTasks
- [x] Примеры соответствуют taskTypes домена
- [x] Примеры показывают правильный формат JSON

---

## Task 5: Рефакторинг generatePracticeFromTheory

### Description
Удалить дублирующий код и использовать унифицированную систему

### Files to modify
- `app/api/topics/[id]/lesson/route.ts`

### Implementation details

**Удалить (~400 строк):**
1. Все regex-проверки доменов:
   - isProgramming, isPhysics, isChemistry, isMath, isEconomics, isEngineering, isDataScience, isLanguage
2. Все inline practiceInstructions блоки:
   - if (isProgramming) { practiceInstructions = `...` }
   - if (isPhysics) { practiceInstructions = `...` }
   - и т.д.

**Заменить на:**
```typescript
import { 
  buildUnifiedPracticePrompt, 
  validateDifficultyDistribution,
  Domain 
} from '@/lib/ai/domain-prompts'

async function generatePracticeFromTheory(
  topicName: string,
  courseTitle: string,
  theoryContent: string,
  domain: Domain = 'GENERAL'
) {
  try {
    const theoryExcerpt = theoryContent.slice(0, 8000)
    
    // Единый промпт для всех доменов
    const prompt = buildUnifiedPracticePrompt(
      domain,
      topicName,
      courseTitle,
      theoryExcerpt
    )
    
    console.log('[Practice] Generating for domain:', domain)
    
    const response = await generateCompletion(
      SYSTEM_PROMPTS.taskGeneration,
      prompt,
      { json: true, temperature: 0.7, maxTokens: 12000 }
    )
    
    const content = JSON.parse(response)
    
    if (!content.tasks || content.tasks.length < 3) {
      throw new Error('Invalid tasks')
    }
    
    // Существующая валидация заданий (сохраняем)
    const validatedTasks = validateAndFixTasks(content.tasks)
    
    // Новая валидация распределения
    const distribution = validateDifficultyDistribution(validatedTasks)
    console.log('[Practice] Distribution:', distribution.distribution)
    
    if (!distribution.isValid) {
      console.warn('[Practice] Distribution issues:', distribution.issues)
    }
    
    return { tasks: validatedTasks }
  } catch (e) {
    console.error('Practice from theory failed:', e)
    return generatePracticeTasks(topicName, courseTitle)
  }
}
```

**Вынести валидацию в отдельную функцию:**
```typescript
function validateAndFixTasks(tasks: any[]): any[] {
  // Существующая логика валидации из текущего кода
  // (проверка question, options, correctAnswer, etc.)
  // + дедупликация
}
```

### Acceptance criteria
- [x] Удалены все inline practiceInstructions
- [x] Удалены regex-проверки доменов
- [x] Используется buildUnifiedPracticePrompt()
- [x] Используется validateDifficultyDistribution()
- [x] Существующая валидация заданий сохранена
- [x] Логирование показывает domain и distribution

---

## Task 6: Тестирование и отладка

### Description
Проверить работу унифицированной системы для всех доменов

### Files to modify
- Нет (только тестирование)

### Implementation details
1. Создать тестовые курсы для каждого домена:
   - MATHEMATICS: "Математический анализ"
   - PHYSICS: "Механика"
   - PROGRAMMING: "Python основы"
   - CHEMISTRY: "Органическая химия"
   - LANGUAGES: "English Grammar"
   - HISTORY: "История России"

2. Для каждого проверить:
   - Генерируется 15-20 заданий
   - Распределение близко к 20/40/40
   - Типы заданий соответствуют домену
   - Задания разнообразные (не однотипные)
   - Задания привязаны к теории

3. Логировать и анализировать:
   - Фактическое распределение
   - Типы заданий
   - Качество формулировок

### Acceptance criteria
- [ ] Все домены генерируют 15-20 заданий
- [ ] Распределение: easy ≤35%, medium ≥25%, hard ≥25%
- [ ] Нет регрессии качества
- [ ] Задания соответствуют теории

---

## Порядок выполнения

```
Task 1 (константы)
    │
    ▼
Task 2 (buildUnifiedPracticePrompt)
    │
    ▼
Task 3 (validateDifficultyDistribution)
    │
    ▼
Task 4 (exampleTasks) ──────┐
    │                       │
    ▼                       │
Task 5 (рефакторинг) ◄──────┘
    │
    ▼
Task 6 (тестирование)
```

Tasks 1-3 можно делать параллельно.
Task 4 можно делать параллельно с 1-3.
Task 5 зависит от 1-4.
Task 6 зависит от 5.

---

## Оценка времени

| Task | Сложность | Время |
|------|-----------|-------|
| Task 1 | Низкая | 15 мин |
| Task 2 | Средняя | 30 мин |
| Task 3 | Низкая | 20 мин |
| Task 4 | Средняя | 45 мин |
| Task 5 | Высокая | 60 мин |
| Task 6 | Средняя | 30 мин |
| **Итого** | | **~3.5 часа** |
