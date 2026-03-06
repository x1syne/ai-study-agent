# Архитектура AI-генерации контента

## Обзор системы

Платформа использует мульти-провайдерную архитектуру для генерации образовательного контента с автоматическим fallback между провайдерами.

---

## 1. AI Router (lib/ai-router.ts)

### Провайдеры

| Провайдер | Модель | Назначение | Лимиты |
|-----------|--------|------------|--------|
| **Groq** | Llama 3.3 70B | Быстрая генерация | 30 req/min |
| **Gemini** | gemini-1.5-flash | Fallback | 60 req/min |
| **DeepSeek** | deepseek-chat | Тяжёлые задачи (отключён) | 60 req/min |

### Стратегии роутинга

```typescript
const ROUTING = {
  fast: ['groq', 'gemini'],      // Создание курса, анализ
  heavy: ['groq', 'gemini'],     // Теория, практика
  chat: ['groq'],                // Чат с пользователем
}
```

### Порядок fallback

```
Запрос → Groq (30s timeout)
           ↓ fail
         Gemini (30s timeout)
           ↓ fail
         Error / Fallback контент
```

---

## 2. Домены (lib/ai/domain-prompts.ts)

### 13 поддерживаемых доменов

```typescript
type Domain = 
  | 'PHYSICS'      // Физика
  | 'MATHEMATICS'  // Математика
  | 'PROGRAMMING'  // Программирование
  | 'CHEMISTRY'    // Химия
  | 'BIOLOGY'      // Биология
  | 'HISTORY'      // История
  | 'LANGUAGES'    // Языки
  | 'ECONOMICS'    // Экономика
  | 'ARTS'         // Искусство
  | 'MEDICINE'     // Медицина
  | 'LAW'          // Право
  | 'ENGINEERING'  // Инженерия
  | 'GENERAL'      // Общее
```

### Структура домена

Каждый домен имеет:

1. **DomainConfig** (для теории):
   - `systemPrompt` — инструкции для AI
   - `sectionTemplates` — шаблоны секций урока
   - `formatRules` — правила форматирования
   - `examplePatterns` — примеры оформления

2. **DomainPracticePrompt** (для практики):
   - `taskTypes` — типы заданий (number, code, single, etc.)
   - `systemPrompt` — инструкции для генерации заданий
   - `exampleTasks` — примеры заданий
   - `validationRules` — правила валидации

---

## 3. Создание курса (app/api/goals/route.ts)

### Поток создания

```
POST /api/goals { title, skill }
        │
        ▼
┌─────────────────────────────────────┐
│ 1. Проверка кэша структуры курса    │
└─────────────────────────────────────┘
        │ miss
        ▼
┌─────────────────────────────────────┐
│ 2. Параллельно:                     │
│    - getFullRAGContext()            │
│    - generateWithRouter('fast')     │
│      → SYSTEM_PROMPTS.graphGeneration│
│      → getGraphGenerationPrompt()   │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 3. AI возвращает:                   │
│    {                                │
│      domain: "MATHEMATICS",         │
│      modules: [                     │
│        { name, description, order } │
│      ]                              │
│    }                                │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 4. Сохранение в БД:                 │
│    Goal { domain, modules[] }       │
│    (topics генерируются лениво)     │
└─────────────────────────────────────┘
```

### Определение домена

AI сам определяет домен по названию курса и возвращает его в JSON.
Домен сохраняется в `Goal.domain` и используется для всех подтем.

---

## 4. Генерация подтем (app/api/modules/[id]/topics/route.ts)

### Поток генерации

```
GET /api/modules/:id/topics
        │
        ▼
┌─────────────────────────────────────┐
│ 1. Проверка: есть ли topics в БД?   │
└─────────────────────────────────────┘
        │ нет
        ▼
┌─────────────────────────────────────┐
│ 2. generateWithRouter('fast')       │
│    → getSubtopicsGenerationPrompt() │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 3. AI возвращает:                   │
│    { topics: [                      │
│      { slug, name, difficulty,      │
│        estimatedMinutes, order }    │
│    ]}                               │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 4. Сохранение topics в БД           │
│    + создание TopicProgress         │
└─────────────────────────────────────┘
```

---

## 5. Генерация теории (app/api/topics/[id]/lesson/route.ts)

### Поток генерации

```
GET /api/topics/:id/lesson?type=theory
        │
        ▼
┌─────────────────────────────────────┐
│ 1. Проверка: есть ли lesson в БД?   │
└─────────────────────────────────────┘
        │ нет
        ▼
┌─────────────────────────────────────┐
│ 2. runLessonAgentFast()             │
│    (lib/ai/agent-fast.ts)           │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 3. Параллельно:                     │
│    - analyzeTopicFast() → 'fast'    │
│    - getFullRAGContext()            │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 4. Получение конфигурации домена:   │
│    - getDomainConfig(domain)        │
│    - getDomainPrompt(domain)        │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 5. ПАРАЛЛЕЛЬНАЯ генерация секций:   │
│    Promise.allSettled([             │
│      generateSection(template1),    │
│      generateSection(template2),    │
│      ...                            │
│    ])                               │
│    Каждая секция → 'heavy' стратегия│
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 6. Сборка контента + кэширование    │
└─────────────────────────────────────┘
```

### Секции по доменам

**MATHEMATICS:**
- Введение
- Определения и понятия
- Теоремы и формулы
- Методы решения
- Примеры с решениями
- Частые ошибки
- Итоги

**PROGRAMMING:**
- Введение
- Основные понятия
- Синтаксис и примеры
- Практические задачи
- Best Practices
- Частые ошибки
- Итоги

**PHYSICS:**
- Введение
- Физические величины
- Основные законы и формулы
- Решение типовых задач
- Применение в технике
- Частые ошибки
- Итоги

---

## 6. Генерация практики (app/api/topics/[id]/lesson/route.ts)

### Поток генерации

```
GET /api/topics/:id/lesson?type=practice
        │
        ▼
┌─────────────────────────────────────┐
│ 1. Получить теорию из БД            │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 2. generatePracticeFromTheory()     │
│    - buildUnifiedPracticePrompt()   │
│    - domain из Goal.domain          │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 3. Промпт включает:                 │
│    - BASE_PRACTICE_PROMPT           │
│    - DomainPracticePrompt           │
│    - DIFFICULTY_DISTRIBUTION        │
│    - Теория (до 8000 символов)      │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 4. generateWithRouter('heavy')      │
│    → JSON { tasks: [...] }          │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│ 5. Валидация:                       │
│    - validateAndFixTasks()          │
│    - deduplicateTasks()             │
│    - validateDifficultyDistribution │
└─────────────────────────────────────┘
```

### Распределение сложности

```typescript
DIFFICULTY_DISTRIBUTION = {
  easy: 0.2,    // 20% — 3-4 задания
  medium: 0.4,  // 40% — 6-8 заданий
  hard: 0.4     // 40% — 6-8 заданий
}
```

### Типы заданий по доменам

| Домен | Основные типы |
|-------|---------------|
| MATHEMATICS | number, single |
| PHYSICS | number, single |
| PROGRAMMING | code, single |
| CHEMISTRY | number, single |
| LANGUAGES | text, single, multiple |
| HISTORY | single, multiple |
| BIOLOGY | single, multiple, matching |
| ECONOMICS | number, single |
| GENERAL | single, multiple, text |

---

## 7. Кэширование (lib/ai-cache.ts)

### Что кэшируется

| Данные | TTL | Ключ |
|--------|-----|------|
| Структура курса | 24 часа | `title:level` |
| Анализ темы | В памяти | `topic:course` |
| Урок (теория) | В памяти | `topic:course` |
| Задания | В памяти | `topic:course` |

### Проблема

Кэш в памяти не очищается при ошибках генерации.
Если сгенерировалась плохая теория — она будет возвращаться из кэша.

---

## 8. RAG (lib/rag.ts)

### Источники контекста

- Wikipedia API
- Персонализация по истории пользователя
- Domain-specific источники

### Использование

```typescript
// Полный контекст
const context = await getFullRAGContext(topic, course, userId)

// По домену
const context = await getDomainRAGContext(topic, course, domainType)
```

---

## 9. Файловая структура

```
lib/
├── ai-router.ts           # Мульти-провайдер роутер
├── ai-cache.ts            # Кэширование
├── rag.ts                 # RAG контекст
└── ai/
    ├── prompts.ts         # Системные промпты
    ├── domain-prompts.ts  # Домены + практика
    └── agent-fast.ts      # Агент генерации теории

app/api/
├── goals/route.ts         # Создание курса
├── modules/[id]/
│   └── topics/route.ts    # Генерация подтем
└── topics/[id]/
    └── lesson/route.ts    # Теория + практика
```

---

## 10. Переменные окружения

```env
# Обязательные
GROQ_API_KEY=           # Groq API
GEMINI_API_KEY=         # Google Gemini

# Опциональные
DEEPSEEK_API_KEY=       # DeepSeek (отключён)
USE_DIRECT_GROQ=true    # Прямой доступ к Groq (без прокси)

# Supabase (для прокси в России)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
