# Design Document: Enhanced Learning UI

## Overview

Улучшение страницы обучения с sidebar навигацией по модулям/темам, модальным окном завершения урока, доменно-специфичными промптами для генерации качественной теории, поддержкой LaTeX формул и пошаговых вычислений.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Learn Page Layout                         │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│    CourseSidebar │              Main Content                    │
│    (280px fixed) │                                              │
│                  │  ┌────────────────────────────────────────┐  │
│  ┌────────────┐  │  │         TheoryContent                  │  │
│  │ Module 1 ▼ │  │  │  - LaTeX формулы (KaTeX)              │  │
│  │  └ 1.1 ✅  │  │  │  - Calculation блоки                  │  │
│  │  └ 1.2 ▶️  │  │  │  - Интерактивные элементы             │  │
│  │  └ 1.3 🔒  │  │  └────────────────────────────────────────┘  │
│  ├────────────┤  │                                              │
│  │ Module 2 ► │  │  ┌────────────────────────────────────────┐  │
│  │ Module 3 ► │  │  │      Topic Navigation                  │  │
│  └────────────┘  │  │  [← Предыдущая]    [Следующая →]       │  │
│                  │  └────────────────────────────────────────┘  │
└──────────────────┴──────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Completion Modal                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                        ✓                                   │  │
│  │           Отметить урок завершён                          │  │
│  │   Хотели бы вы отметить текущий урок как                  │  │
│  │   завершённый, прежде чем двигаться дальше?               │  │
│  │                                                           │  │
│  │   [Нет, просто продолжай]  [Да, отметьте как готовое]    │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. CourseSidebar Component

```typescript
interface CourseSidebarProps {
  goalId: string
  modules: ModuleWithTopics[]
  currentTopicId: string
  onTopicSelect: (topicId: string) => void
}

interface ModuleWithTopics {
  id: string
  name: string
  icon: string
  order: number
  progress: number
  topics: TopicItem[]
}

interface TopicItem {
  id: string
  name: string
  order: number
  status: 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'MASTERED'
}
```

### 2. CompletionModal Component

```typescript
interface CompletionModalProps {
  isOpen: boolean
  onConfirm: () => void  // Да, отметить как готовое
  onCancel: () => void   // Нет, просто продолжай
  topicName: string
}
```

### 3. AI Domain Detector

```typescript
type Domain = 
  | 'PHYSICS' 
  | 'MATHEMATICS' 
  | 'PROGRAMMING' 
  | 'CHEMISTRY' 
  | 'BIOLOGY' 
  | 'HISTORY' 
  | 'LANGUAGES' 
  | 'ECONOMICS' 
  | 'OTHER'

// AI определяет домен при создании курса
// Добавляем в промпт генерации графа курса
const GRAPH_GENERATION_WITH_DOMAIN = `
...existing prompt...

ВАЖНО: Определи предметную область курса и верни в поле "domain".
Возможные значения: PHYSICS, MATHEMATICS, PROGRAMMING, CHEMISTRY, BIOLOGY, HISTORY, LANGUAGES, ECONOMICS, OTHER

Формат ответа:
{
  "domain": "PHYSICS",
  "modules": [...]
}
`

// AI возвращает домен вместе со структурой курса
interface CourseGenerationResult {
  domain: Domain
  modules: Module[]
}
```

### 4. AI-Powered Content (Всё через AI)

**Принцип: AI генерирует готовый HTML/Markdown с уже отформатированным контентом.**

```typescript
// AI сам форматирует формулы, вычисления, код
// Мы просто рендерим markdown + KaTeX

// Промпт указывает AI как форматировать:
// - Формулы: $inline$ и $$block$$
// - Вычисления: нумерованный список с формулами
// - Код: ```language блоки
// - Таблицы: markdown таблицы

// На клиенте только:
// 1. react-markdown для рендеринга
// 2. KaTeX для формул (автоматически через rehype-katex)
// 3. syntax-highlighter для кода

// Никаких кастомных парсеров!
```

### 5. Упрощённый рендеринг

```typescript
// TheoryContent просто рендерит markdown с плагинами
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

function TheoryContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
    >
      {content}
    </ReactMarkdown>
  )
}
```

## Data Models

### Database Schema Updates

```prisma
model Goal {
  // ... existing fields
  domain    Domain @default(OTHER)
}

enum Domain {
  PHYSICS
  MATHEMATICS
  PROGRAMMING
  CHEMISTRY
  BIOLOGY
  HISTORY
  LANGUAGES
  ECONOMICS
  OTHER
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Sidebar отображает все модули курса

*For any* курс с модулями, CourseSidebar SHALL рендерить все модули в правильном порядке (по полю order).

**Validates: Requirements 1.1**

### Property 2: Статус темы корректно отображается

*For any* тема с любым статусом (LOCKED, AVAILABLE, IN_PROGRESS, COMPLETED, MASTERED), TopicItem SHALL отображать соответствующую иконку статуса.

**Validates: Requirements 1.4**

### Property 3: Прогресс модуля вычисляется корректно

*For any* модуль с темами, прогресс модуля SHALL равняться проценту завершённых тем (COMPLETED или MASTERED) от общего числа тем.

**Validates: Requirements 1.5**

### Property 4: Модал показывается только для незавершённых тем

*For any* переход между темами, CompletionModal SHALL показываться только если текущая тема НЕ имеет статус COMPLETED или MASTERED.

**Validates: Requirements 2.1, 2.7**

### Property 5: Подтверждение в модале обновляет статус

*For any* тема со статусом IN_PROGRESS или AVAILABLE, при подтверждении в CompletionModal статус SHALL измениться на COMPLETED.

**Validates: Requirements 2.5**

### Property 6: Отмена в модале не меняет статус

*For any* тема, при отмене в CompletionModal статус темы SHALL остаться неизменным.

**Validates: Requirements 2.6**

### Property 7: AI возвращает валидный домен

*For any* ответ AI при генерации курса, поле domain SHALL содержать один из валидных доменов (PHYSICS, MATHEMATICS, PROGRAMMING, CHEMISTRY, BIOLOGY, HISTORY, LANGUAGES, ECONOMICS, OTHER).

**Validates: Requirements 3.2, 3.4**

### Property 8: Завершение темы разблокирует следующую

*For any* тема, при изменении статуса на COMPLETED, следующая тема (по order) SHALL получить статус AVAILABLE (если была LOCKED).

**Validates: Requirements 10.3**

## Domain-Specific Prompts

### Архитектура доменных промптов

```typescript
// 13 доменов покрывающих все сферы жизни
type Domain = 
  | 'PHYSICS'      // Физика, механика, термодинамика
  | 'MATHEMATICS'  // Алгебра, геометрия, анализ
  | 'PROGRAMMING'  // Все языки, алгоритмы, веб
  | 'CHEMISTRY'    // Органика, неорганика, биохимия
  | 'BIOLOGY'      // Анатомия, генетика, экология
  | 'HISTORY'      // История, политология, социология
  | 'LANGUAGES'    // Иностранные языки, лингвистика
  | 'ECONOMICS'    // Экономика, финансы, бизнес
  | 'ARTS'         // Музыка, живопись, дизайн
  | 'MEDICINE'     // Медицина, психология, здоровье
  | 'LAW'          // Право, юриспруденция
  | 'ENGINEERING'  // Инженерия, электроника
  | 'GENERAL'      // Всё остальное

// Каждый домен имеет свой промпт с примером эталонного контента
interface DomainPrompt {
  domain: Domain
  systemPrompt: string      // Инструкции для AI
  exampleContent: string    // Пример эталонного контента
  ragSources: string[]      // Приоритетные источники RAG
}
```

### PHYSICS Domain Prompt

```typescript
const PHYSICS_PROMPT = {
  domain: 'PHYSICS',
  systemPrompt: `Ты — лучший преподаватель физики. Создай образовательный материал.

ОБЯЗАТЕЛЬНО:
1. Формулы в LaTeX ($inline$ и $$block$$)
2. Пошаговые вычисления с подстановкой значений
3. Единицы измерения СИ везде
4. Примеры из реальной жизни (двигатели, турбины, природа)
5. Упражнения с ответами

Используй RAG контекст. Структурируй сам до наилучшей версии.`,

  exampleContent: `
## Адиабатический процесс

### Определение
Адиабатический процесс — термодинамический процесс без теплообмена с окружающей средой ($Q = 0$).

### Основные формулы
$$PV^\\gamma = const$$
$$TV^{\\gamma-1} = const$$

где $\\gamma = \\frac{C_p}{C_v}$ — показатель адиабаты.

### Пошаговые вычисления

**Задача:** Газ сжимается адиабатически. $P_1 = 5 \\times 10^6$ Па, $V_1 = 50 \\times 10^{-6}$ м³, $V_2 = 150 \\times 10^{-6}$ м³, $\\gamma = 1.4$. Найти $P_2$.

1. **Запишем уравнение адиабаты:**
   $$P_1 V_1^\\gamma = P_2 V_2^\\gamma$$

2. **Выразим $P_2$:**
   $$P_2 = P_1 \\left(\\frac{V_1}{V_2}\\right)^\\gamma$$

3. **Подставим значения:**
   $$P_2 = 5 \\times 10^6 \\text{ Па} \\times \\left(\\frac{50 \\times 10^{-6}}{150 \\times 10^{-6}}\\right)^{1.4}$$

4. **Вычислим:**
   $$P_2 = 5 \\times 10^6 \\times (1/3)^{1.4} \\approx 5 \\times 10^6 \\times 0.298 \\approx 1.49 \\text{ МПа}$$

### Реальные приложения
1. **Газовые турбины** — сжатие воздуха компрессором
2. **Дизельные двигатели** — воспламенение от сжатия
3. **Атмосфера** — подъём воздушных масс
`,
  ragSources: ['wikipedia', 'arxiv']
}
```

### MATHEMATICS Domain Prompt

```typescript
const MATHEMATICS_PROMPT = {
  domain: 'MATHEMATICS',
  systemPrompt: `Ты — лучший преподаватель математики. Создай образовательный материал.

ОБЯЗАТЕЛЬНО:
1. Строгие определения и теоремы
2. Доказательства с пояснениями каждого шага
3. Формулы в LaTeX
4. Пошаговые решения задач
5. Геометрические интерпретации где возможно
6. Задачи разной сложности с решениями

Используй RAG контекст. Структурируй сам до наилучшей версии.`,

  exampleContent: `
## Производная функции

### Определение
Производная функции $f(x)$ в точке $x_0$:
$$f'(x_0) = \\lim_{\\Delta x \\to 0} \\frac{f(x_0 + \\Delta x) - f(x_0)}{\\Delta x}$$

### Основные правила
| Функция | Производная |
|---------|-------------|
| $x^n$ | $nx^{n-1}$ |
| $e^x$ | $e^x$ |
| $\\ln x$ | $\\frac{1}{x}$ |
| $\\sin x$ | $\\cos x$ |

### Пошаговое решение

**Найти производную:** $f(x) = x^3 - 2x^2 + 5x - 3$

1. Применяем правило суммы: $(f + g)' = f' + g'$
2. Для $x^3$: $(x^3)' = 3x^2$
3. Для $-2x^2$: $(-2x^2)' = -4x$
4. Для $5x$: $(5x)' = 5$
5. Для $-3$: $(-3)' = 0$

**Ответ:** $f'(x) = 3x^2 - 4x + 5$
`,
  ragSources: ['wikipedia', 'arxiv']
}
```

### PROGRAMMING Domain Prompt

```typescript
const PROGRAMMING_PROMPT = {
  domain: 'PROGRAMMING',
  systemPrompt: `Ты — senior разработчик и преподаватель. Создай образовательный материал.

ОБЯЗАТЕЛЬНО:
1. Рабочие примеры кода с комментариями
2. Объяснение "почему", а не только "как"
3. Анализ сложности (Big O) где применимо
4. Best practices и типичные ошибки
5. Практические задачи с тестами

Используй RAG контекст (StackOverflow, GitHub). Структурируй сам.`,

  exampleContent: `
## Бинарный поиск

### Концепция
Бинарный поиск — алгоритм поиска в **отсортированном** массиве за $O(\\log n)$.

### Реализация
\`\`\`python
def binary_search(arr: list, target: int) -> int:
    """Возвращает индекс элемента или -1 если не найден."""
    left, right = 0, len(arr) - 1
    
    while left <= right:
        mid = (left + right) // 2
        
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    
    return -1
\`\`\`

### Сложность
| Операция | Время | Память |
|----------|-------|--------|
| Поиск | $O(\\log n)$ | $O(1)$ |

### Типичные ошибки
❌ Забыть что массив должен быть отсортирован
❌ Неправильно вычислять mid (переполнение)
✅ Использовать \`mid = left + (right - left) // 2\`
`,
  ragSources: ['stackoverflow', 'github', 'wikipedia']
}
```

### CHEMISTRY Domain Prompt

```typescript
const CHEMISTRY_PROMPT = {
  domain: 'CHEMISTRY',
  systemPrompt: `Ты — лучший преподаватель химии. Создай образовательный материал.

ОБЯЗАТЕЛЬНО:
1. Сбалансированные уравнения реакций
2. Расчёты с молярными массами
3. Структурные формулы где нужно
4. Механизмы реакций
5. Применение в жизни и промышленности

Используй RAG контекст. Структурируй сам до наилучшей версии.`,

  exampleContent: `
## Реакции нейтрализации

### Определение
Нейтрализация — реакция между кислотой и основанием с образованием соли и воды.

### Общее уравнение
$$\\text{Кислота} + \\text{Основание} \\rightarrow \\text{Соль} + \\text{Вода}$$

### Пример расчёта

**Задача:** Сколько NaOH нужно для нейтрализации 100 мл 0.5 М HCl?

1. **Уравнение реакции:**
   $$\\ce{NaOH + HCl -> NaCl + H2O}$$

2. **Количество HCl:**
   $$n(HCl) = C \\cdot V = 0.5 \\text{ моль/л} \\times 0.1 \\text{ л} = 0.05 \\text{ моль}$$

3. **По уравнению:** $n(NaOH) = n(HCl) = 0.05$ моль

4. **Масса NaOH:**
   $$m = n \\cdot M = 0.05 \\text{ моль} \\times 40 \\text{ г/моль} = 2 \\text{ г}$$
`,
  ragSources: ['wikipedia', 'arxiv']
}
```

### Остальные домены (краткие промпты)

```typescript
const DOMAIN_PROMPTS: Record<Domain, DomainPrompt> = {
  PHYSICS: PHYSICS_PROMPT,
  MATHEMATICS: MATHEMATICS_PROMPT,
  PROGRAMMING: PROGRAMMING_PROMPT,
  CHEMISTRY: CHEMISTRY_PROMPT,
  
  BIOLOGY: {
    systemPrompt: `Преподаватель биологии. Схемы процессов, классификации, связь с медициной и экологией. Используй RAG.`,
    ragSources: ['wikipedia', 'arxiv']
  },
  
  HISTORY: {
    systemPrompt: `Преподаватель истории. Даты, события, причинно-следственные связи, исторические личности, первоисточники. Используй RAG.`,
    ragSources: ['wikipedia', 'wikidata']
  },
  
  LANGUAGES: {
    systemPrompt: `Преподаватель языков. Грамматика с примерами, упражнения на перевод, произношение, идиомы, культурный контекст. Используй RAG.`,
    ragSources: ['wikipedia']
  },
  
  ECONOMICS: {
    systemPrompt: `Преподаватель экономики. Графики спроса/предложения, формулы, реальные кейсы компаний, финансовые расчёты. Используй RAG.`,
    ragSources: ['wikipedia', 'web']
  },
  
  ARTS: {
    systemPrompt: `Преподаватель искусства. Техники, стили, известные работы, практические упражнения. Используй RAG (Met Museum).`,
    ragSources: ['wikipedia', 'metmuseum', 'wikidata']
  },
  
  MEDICINE: {
    systemPrompt: `Преподаватель медицины. Анатомия, симптомы, диагностика, лечение. Научная точность, ссылки на исследования. Используй RAG.`,
    ragSources: ['wikipedia', 'arxiv']
  },
  
  LAW: {
    systemPrompt: `Преподаватель права. Статьи законов, прецеденты, юридические термины, практические кейсы. Используй RAG.`,
    ragSources: ['wikipedia', 'web']
  },
  
  ENGINEERING: {
    systemPrompt: `Преподаватель инженерии. Схемы, расчёты, стандарты, практические примеры. Формулы в LaTeX. Используй RAG.`,
    ragSources: ['wikipedia', 'arxiv', 'stackoverflow']
  },
  
  GENERAL: {
    systemPrompt: `Универсальный преподаватель. Определи лучший формат для темы. Примеры из жизни, упражнения. Используй RAG.`,
    ragSources: ['wikipedia', 'web']
  }
}
```

### Функция выбора промпта

```typescript
function getDomainPrompt(domain: Domain): DomainPrompt {
  return DOMAIN_PROMPTS[domain] || DOMAIN_PROMPTS.GENERAL
}

// Использование
async function generateTheory(topic: string, domain: Domain) {
  const prompt = getDomainPrompt(domain)
  const ragContext = await getDomainRAGContext(topic, courseName, domain)
  
  return generateCompletion(
    prompt.systemPrompt,
    `Тема: ${topic}\n\n${ragContext}\n\nСоздай подробный материал.`
  )
}
```

## Error Handling

1. **LaTeX Parse Error**: При ошибке парсинга формулы — показать исходный текст
2. **Calculation Block Error**: При невалидном JSON — показать как обычный код
3. **Domain Detection Failure**: При неопределённом домене — использовать OTHER
4. **API Error**: При ошибке загрузки курса — показать сообщение и кнопку повтора
5. **Modal State Error**: При потере состояния — не показывать модал

## Testing Strategy

### Unit Tests
- Тесты для detectDomain с разными входными данными
- Тесты для parseLatex с inline и block формулами
- Тесты для парсинга calculation блоков
- Тесты для calculateModuleProgress

### Property-Based Tests
- Property 1: Sidebar рендерит все модули
- Property 3: Прогресс модуля вычисляется корректно
- Property 7: Domain Detector возвращает валидный домен
- Property 8: LaTeX парсер корректно разделяет формулы

### Integration Tests
- Тест полного flow: клик на тему → модал → подтверждение → обновление статуса
- Тест рендеринга теории с LaTeX и calculation блоками

### Libraries
- **vitest**: Unit и property тесты
- **fast-check**: Property-based testing
- **@testing-library/react**: Компонентные тесты
