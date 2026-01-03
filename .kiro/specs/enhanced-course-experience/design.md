# Design Document: Enhanced Course Experience

## Overview

Улучшение качества генерации теоретического контента и пользовательского интерфейса курсов в AI Study Agent. Основные изменения:
- Улучшенные промпты для генерации структурированной теории
- Боковая навигация с иерархией модулей/уроков
- Прогресс-бар по этапам урока (Теория → Практика → Готово)
- Выделение ключевых терминов с tooltip
- Разбиение модулей на отдельные уроки
- Сохранение прогресса пользователя

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Course Page                               │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                               │
│  CourseNavigation│              LessonContent                    │
│  ┌────────────┐  │  ┌─────────────────────────────────────────┐ │
│  │ Module 1   │  │  │ LessonProgressBar                       │ │
│  │  ├ Lesson 1│  │  │ [Теория ●────────● Практика ○ Готово ○] │ │
│  │  ├ Lesson 2│  │  └─────────────────────────────────────────┘ │
│  │  └ Lesson 3│  │  ┌─────────────────────────────────────────┐ │
│  │ Module 2   │  │  │ TheoryContent                           │ │
│  │  ├ Lesson 1│  │  │ - Highlighted terms ==термин==          │ │
│  │  └ Lesson 2│  │  │ - Short paragraphs (max 4 sentences)    │ │
│  └────────────┘  │  │ - Real examples with numbers            │ │
│                  │  └─────────────────────────────────────────┘ │
└──────────────────┴──────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced Theory Generator

Модификация `lib/agents/generator.ts` для улучшения качества теории.

```typescript
interface EnhancedTheoryConfig {
  maxSentencesPerParagraph: number  // 4
  highlightKeyTerms: boolean        // true
  includeRealExamples: boolean      // true
  requiredSections: string[]        // ['Введение', 'Основные понятия', ...]
}

interface GeneratedLesson {
  id: string
  title: string
  order: number
  content: {
    theory: string           // Markdown с ==highlights==
    keyTerms: TermDefinition[]
    estimatedReadTime: number // минуты
  }
  status: 'not_started' | 'theory_done' | 'practice_done' | 'completed'
}

interface TermDefinition {
  term: string
  definition: string
  examples?: string[]
}
```

### 2. Course Navigation Component

Новый компонент `components/course/CourseNavigation.tsx`.

```typescript
interface CourseNavigationProps {
  modules: ModuleWithLessons[]
  currentLessonId: string
  progress: CourseProgress
  onLessonSelect: (lessonId: string) => void
}

interface ModuleWithLessons {
  id: string
  name: string
  order: number
  lessons: LessonSummary[]
  isExpanded: boolean
  completionPercent: number
}

interface LessonSummary {
  id: string
  title: string
  order: number
  status: LessonStatus
  estimatedTime: number
}

type LessonStatus = 'not_started' | 'in_progress' | 'completed'
```

### 3. Lesson Progress Bar Component

Новый компонент `components/course/LessonProgressBar.tsx`.

```typescript
interface LessonProgressBarProps {
  currentStage: 'theory' | 'practice' | 'completed'
  onStageClick?: (stage: string) => void
}

// Визуальные этапы:
// [📖 Теория] ──── [✏️ Практика] ──── [✅ Готово]
```

### 4. Progress Tracker Service

Новый сервис `lib/progress-tracker.ts`.

```typescript
interface ProgressTracker {
  // Сохранение прогресса
  saveLessonProgress(userId: string | null, lessonId: string, status: LessonStatus): Promise<void>
  
  // Загрузка прогресса
  loadCourseProgress(userId: string | null, courseId: string): Promise<CourseProgress>
  
  // Синхронизация localStorage → DB
  syncLocalProgress(userId: string): Promise<void>
}

interface CourseProgress {
  courseId: string
  modules: ModuleProgress[]
  lastAccessedLessonId: string
  overallPercent: number
}

interface ModuleProgress {
  moduleId: string
  lessons: LessonProgress[]
  completionPercent: number
}

interface LessonProgress {
  lessonId: string
  status: LessonStatus
  completedAt?: string
}
```

## Data Models

### Lesson Model (расширение CourseModule)

```typescript
interface Lesson {
  id: string
  moduleId: string
  order: number
  title: string
  description: string
  
  // Контент
  theoryMarkdown: string      // С ==highlights==
  keyTerms: TermDefinition[]
  
  // Метаданные
  estimatedReadTime: number   // минуты (5-10)
  wordCount: number           // 1000-2000 слов
  
  // Практика
  practiceTaskIds: string[]
}
```

### Progress Storage (localStorage)

```typescript
interface LocalProgress {
  courses: {
    [courseId: string]: {
      lastAccessed: string
      lessons: {
        [lessonId: string]: {
          status: LessonStatus
          completedAt?: string
        }
      }
    }
  }
}
```

### Database Schema (Prisma)

```prisma
model LessonProgress {
  id        String   @id @default(cuid())
  lessonId  String
  userId    String
  status    String   // 'not_started' | 'theory_done' | 'practice_done' | 'completed'
  completedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@unique([lessonId, userId])
  @@index([userId])
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Theory Content Structure

*For any* generated theory content, each paragraph SHALL contain at most 4 sentences, and the content SHALL include all required sections (Введение, Основные понятия, Как это работает, Примеры, Частые ошибки, Итоги).

**Validates: Requirements 1.1, 1.5**

### Property 2: Key Term Highlighting

*For any* generated theory content and its associated keyTerms list, all terms from keyTerms SHALL appear in the content wrapped with ==term== markup.

**Validates: Requirements 1.2, 4.1**

### Property 3: Lesson Count Per Module

*For any* generated module, the number of lessons SHALL be between 3 and 7 inclusive.

**Validates: Requirements 5.1**

### Property 4: Lesson Length Constraint

*For any* generated lesson, the word count SHALL be between 1000 and 2000 words (approximately 5-10 minutes reading time at 200 words/minute).

**Validates: Requirements 5.2**

### Property 5: Navigation Shows All Lessons

*For any* module in CourseNavigation, all lessons belonging to that module SHALL be displayed when the module is expanded.

**Validates: Requirements 2.2**

### Property 6: Progress Bar State Transitions

*For any* lesson, the progress state SHALL transition in order: not_started → theory_done → practice_done → completed. No state can be skipped.

**Validates: Requirements 3.2, 3.3**

### Property 7: Module Completion Calculation

*For any* module, the completion percentage SHALL equal (completed lessons / total lessons) × 100.

**Validates: Requirements 3.4, 3.5**

### Property 8: Progress Persistence Round-Trip

*For any* saved lesson progress, loading the progress SHALL return the same status that was saved.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 9: Real Examples with Numbers

*For any* generated theory content for scientific/technical topics, examples SHALL contain at least one numeric value with a unit of measurement.

**Validates: Requirements 1.4**

## Error Handling

| Error | Cause | Handling |
|-------|-------|----------|
| Theory generation timeout | LLM slow response | Retry with shorter content, show partial content |
| Progress save failed | Network/DB error | Queue for retry, show warning |
| localStorage full | Too much cached data | Clear old progress, keep recent |
| Invalid lesson ID | Corrupted URL/state | Redirect to first lesson of module |

## Testing Strategy

### Unit Tests
- Theory content parsing and validation
- Progress state transitions
- Completion percentage calculations
- localStorage serialization/deserialization

### Property-Based Tests (fast-check, 100+ iterations)
- Property 1: Theory structure validation
- Property 2: Key term highlighting
- Property 3: Lesson count bounds
- Property 4: Lesson length bounds
- Property 6: Progress state machine
- Property 7: Completion calculation
- Property 8: Progress round-trip

### Integration Tests
- Full lesson generation pipeline
- Progress sync between localStorage and DB
- Navigation component with real data

### E2E Tests
- Complete lesson flow: Theory → Practice → Complete
- Navigation between modules/lessons
- Progress persistence across page reloads
