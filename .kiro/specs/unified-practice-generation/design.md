# Design Document: Унификация генерации практических заданий

## Введение

Этот документ описывает архитектуру унифицированной системы генерации практических заданий для всех доменов. Цель — устранить дублирование кода, обеспечить консистентность и улучшить качество заданий.

## Текущие проблемы

### 1. Дублирование логики
```
generatePracticeFromTheory() содержит:
├── getDomainPracticePrompt(domain) → вызывается, но НЕ ИСПОЛЬЗУЕТСЯ!
├── isProgramming, isPhysics, isMath... → regex-детекция (дублирует domain)
└── practiceInstructions → 6 огромных inline блоков (500+ строк)
```

### 2. Несогласованность
- DOMAIN_PRACTICE_PROMPTS в domain-prompts.ts — хорошо структурированы
- practiceInstructions в route.ts — дублируют и переопределяют их
- Разные домены запрашивают разное количество заданий (15-20)

### 3. Распределение сложности не контролируется
- Промпт говорит "5 easy, 6 medium, 4 hard"
- AI часто игнорирует это
- Нет валидации распределения после генерации

## Архитектура решения

### Компонентная диаграмма

```
┌─────────────────────────────────────────────────────────────────┐
│                    generatePracticeFromTheory()                  │
│                         (route.ts)                               │
├─────────────────────────────────────────────────────────────────┤
│  1. Получить domain из параметра                                │
│  2. Вызвать buildUnifiedPracticePrompt(domain, theory)          │
│  3. Отправить в AI                                              │
│  4. Валидировать результат (validatePracticeTasks)              │
│  5. Проверить распределение сложности                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              buildUnifiedPracticePrompt()                        │
│                   (domain-prompts.ts)                            │
├─────────────────────────────────────────────────────────────────┤
│  1. Получить DomainPracticePrompt                               │
│  2. Добавить BASE_PRACTICE_PROMPT (общие правила)               │
│  3. Добавить domain.systemPrompt (специфика домена)             │
│  4. Добавить domain.exampleTasks (примеры)                      │
│  5. Добавить DIFFICULTY_DISTRIBUTION (20/40/40)                 │
│  6. Вернуть готовый промпт                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  DomainPracticePrompt                            │
│                   (domain-prompts.ts)                            │
├─────────────────────────────────────────────────────────────────┤
│  domain: Domain                                                  │
│  taskTypes: TaskType[]        // ['number', 'single', 'code']   │
│  systemPrompt: string         // Инструкции для домена          │
│  exampleTasks: string         // Примеры заданий                │
│  validationRules: string[]    // Правила валидации              │
└─────────────────────────────────────────────────────────────────┘
```

### Новые компоненты

#### 1. BASE_PRACTICE_PROMPT (константа)
Общие правила для ВСЕХ доменов:
- Количество заданий: 15-20
- Распределение: 20% easy, 40% medium, 40% hard
- Прогрессия от простого к сложному
- Привязка к теории
- Разнообразие формулировок

#### 2. DIFFICULTY_DISTRIBUTION (константа)
```typescript
const DIFFICULTY_DISTRIBUTION = {
  easy: 0.2,    // 20% — 3-4 задания
  medium: 0.4,  // 40% — 6-8 заданий
  hard: 0.4     // 40% — 6-8 заданий
}
```

#### 3. buildUnifiedPracticePrompt() (функция)
```typescript
function buildUnifiedPracticePrompt(
  domain: Domain,
  topicName: string,
  courseTitle: string,
  theoryContent: string
): string
```

#### 4. validateDifficultyDistribution() (функция)
```typescript
function validateDifficultyDistribution(tasks: Task[]): {
  isValid: boolean
  distribution: { easy: number, medium: number, hard: number }
  issues: string[]
}
```

## Структура промпта

### Финальный промпт (собирается из частей):

```
═══════════════════════════════════════════════════════════════
📚 БАЗОВЫЕ ПРАВИЛА (BASE_PRACTICE_PROMPT)
═══════════════════════════════════════════════════════════════
[Общие правила для всех доменов]

═══════════════════════════════════════════════════════════════
🎯 СПЕЦИФИКА ДОМЕНА: {domain}
═══════════════════════════════════════════════════════════════
[DomainPracticePrompt.systemPrompt]

═══════════════════════════════════════════════════════════════
📊 РАСПРЕДЕЛЕНИЕ СЛОЖНОСТИ (ОБЯЗАТЕЛЬНО!)
═══════════════════════════════════════════════════════════════
Из 15-20 заданий:
- 3-4 задания easy (20%)
- 6-8 заданий medium (40%)
- 6-8 заданий hard (40%)

═══════════════════════════════════════════════════════════════
📝 ПРИМЕРЫ ЗАДАНИЙ
═══════════════════════════════════════════════════════════════
[DomainPracticePrompt.exampleTasks]

═══════════════════════════════════════════════════════════════
📖 ТЕОРИЯ (используй ТОЛЬКО этот материал)
═══════════════════════════════════════════════════════════════
Тема: {topicName}
Курс: {courseTitle}

{theoryContent}

═══════════════════════════════════════════════════════════════
Верни JSON: { "tasks": [...] }
```

## Изменения в файлах

### 1. lib/ai/domain-prompts.ts

**Добавить:**
```typescript
// Базовый промпт для всех доменов
export const BASE_PRACTICE_PROMPT = `...`

// Распределение сложности
export const DIFFICULTY_DISTRIBUTION = { easy: 0.2, medium: 0.4, hard: 0.4 }

// Функция сборки промпта
export function buildUnifiedPracticePrompt(
  domain: Domain,
  topicName: string,
  courseTitle: string,
  theoryContent: string
): string

// Валидация распределения
export function validateDifficultyDistribution(tasks: Task[]): ValidationResult
```

**Улучшить:**
- Добавить exampleTasks для всех доменов (сейчас пустые у некоторых)
- Добавить validationRules для всех доменов

### 2. app/api/topics/[id]/lesson/route.ts

**Удалить:**
- Все inline `practiceInstructions` блоки (~400 строк)
- Regex-детекцию доменов (isProgramming, isPhysics, etc.)

**Изменить:**
```typescript
async function generatePracticeFromTheory(
  topicName: string,
  courseTitle: string,
  theoryContent: string,
  domain: Domain = 'GENERAL'
) {
  const theoryExcerpt = theoryContent.slice(0, 8000)
  
  // Единственный вызов для получения промпта
  const prompt = buildUnifiedPracticePrompt(
    domain,
    topicName,
    courseTitle,
    theoryExcerpt
  )
  
  const response = await generateCompletion(
    SYSTEM_PROMPTS.taskGeneration,
    prompt,
    { json: true, temperature: 0.7, maxTokens: 12000 }
  )
  
  const content = JSON.parse(response)
  
  // Валидация
  const validated = validatePracticeTasks(content.tasks, domain)
  const distribution = validateDifficultyDistribution(validated)
  
  if (!distribution.isValid) {
    console.warn('[Practice] Distribution issues:', distribution.issues)
  }
  
  return { tasks: validated }
}
```

## Валидация заданий

### Существующая валидация (сохраняем):
- Проверка question (не пустой, >15 символов)
- Проверка options для single/multiple
- Проверка correctAnswer/correctAnswers
- Проверка code заданий (solution, testCases)
- Дедупликация по вопросам

### Новая валидация (добавляем):
```typescript
function validateDifficultyDistribution(tasks: Task[]): ValidationResult {
  const counts = { easy: 0, medium: 0, hard: 0 }
  tasks.forEach(t => counts[t.difficulty]++)
  
  const total = tasks.length
  const issues: string[] = []
  
  // Проверяем минимумы
  if (counts.easy < 2) issues.push('Недостаточно easy заданий')
  if (counts.medium < 4) issues.push('Недостаточно medium заданий')
  if (counts.hard < 4) issues.push('Недостаточно hard заданий')
  
  // Проверяем пропорции (с допуском ±10%)
  const easyRatio = counts.easy / total
  const mediumRatio = counts.medium / total
  const hardRatio = counts.hard / total
  
  if (easyRatio > 0.35) issues.push('Слишком много easy заданий')
  if (mediumRatio < 0.25) issues.push('Мало medium заданий')
  if (hardRatio < 0.25) issues.push('Мало hard заданий')
  
  return {
    isValid: issues.length === 0,
    distribution: counts,
    issues
  }
}
```

## Миграция

### Этап 1: Подготовка (без изменения поведения)
1. Добавить BASE_PRACTICE_PROMPT в domain-prompts.ts
2. Добавить buildUnifiedPracticePrompt()
3. Добавить validateDifficultyDistribution()
4. Дополнить exampleTasks для всех доменов

### Этап 2: Рефакторинг route.ts
1. Удалить inline practiceInstructions
2. Удалить regex-детекцию доменов
3. Использовать buildUnifiedPracticePrompt()
4. Добавить валидацию распределения

### Этап 3: Тестирование
1. Проверить генерацию для каждого домена
2. Проверить распределение сложности
3. Проверить качество заданий

## Ожидаемые результаты

| Метрика | До | После |
|---------|-----|-------|
| Строк кода в route.ts | ~430 | ~50 |
| Точек изменения промптов | 2 (route.ts + domain-prompts.ts) | 1 (domain-prompts.ts) |
| Распределение easy | ~40-50% | 20% |
| Распределение medium | ~30-40% | 40% |
| Распределение hard | ~10-20% | 40% |
| Консистентность между доменами | Низкая | Высокая |

## Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| AI игнорирует распределение | Средняя | Добавить валидацию + повторную генерацию |
| Потеря специфики домена | Низкая | Сохраняем DomainPracticePrompt.systemPrompt |
| Регрессия качества | Низкая | Тестирование на всех доменах |
