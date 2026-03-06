# Design Document: Domain-Specific Practice Generation

## Overview

Система доменно-специфичной генерации практических заданий, аналогичная системе генерации теории. Практика генерируется с учётом домена курса для создания релевантных заданий с правильными типами вопросов.

## Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Practice Generation Flow                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────────┐    ┌───────────────┐ │
│  │ Learn Page   │───▶│ /api/topics/     │───▶│ Practice      │ │
│  │ (practice)   │    │ [id]/lesson      │    │ Generator     │ │
│  └──────────────┘    └──────────────────┘    └───────┬───────┘ │
│                                                       │         │
│                      ┌────────────────────────────────┘         │
│                      ▼                                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                  Domain Practice Prompts                  │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐ │  │
│  │  │PHYSICS  │ │MATH     │ │PROGRAM  │ │CHEMISTRY/etc    │ │  │
│  │  │number   │ │number   │ │code     │ │number/single    │ │  │
│  │  │formulas │ │proofs   │ │tests    │ │equations        │ │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. User clicks "Практика" on learn page
2. API fetches topic with goal domain from database
3. `generatePracticeFromTheory` receives domain parameter
4. Domain-specific practice prompt is selected from `domain-prompts.ts`
5. AI generates tasks with appropriate types for domain
6. Tasks are validated and returned to frontend

## Detailed Design

### 1. Domain Practice Prompts Interface

```typescript
interface DomainPracticePrompt {
  domain: Domain
  taskTypes: TaskType[]           // Preferred task types for domain
  systemPrompt: string            // Instructions for AI
  exampleTasks: string            // Example tasks format
  validationRules: string[]       // Rules for task validation
}

type TaskType = 'single' | 'multiple' | 'number' | 'text' | 'code' | 'matching'
```

### 2. Domain-Specific Task Types

| Domain | Primary Types | Secondary Types | Special Features |
|--------|--------------|-----------------|------------------|
| PHYSICS | number | single | Formulas, units, tolerance |
| MATHEMATICS | number | single | Step-by-step solutions |
| PROGRAMMING | code | single | Test cases, starter code |
| CHEMISTRY | number | single | Equations, molecular formulas |
| LANGUAGES | text | single, multiple | Translations, grammar |
| HISTORY | single | multiple | Dates, events, causes |
| BIOLOGY | single | matching | Diagrams, classifications |
| ECONOMICS | number | single | Graphs, calculations |

### 3. Practice Generation Flow

```typescript
async function generatePracticeFromTheory(
  topicName: string,
  courseTitle: string,
  theoryContent: string,
  domain: Domain  // NEW: domain parameter
): Promise<PracticeContent> {
  // 1. Get domain-specific practice prompt
  const practicePrompt = getDomainPracticePrompt(domain)
  
  // 2. Build prompt with domain instructions
  const prompt = buildPracticePrompt(topicName, theoryContent, practicePrompt)
  
  // 3. Generate tasks with AI
  const tasks = await generateWithRouter('heavy', practicePrompt.systemPrompt, prompt)
  
  // 4. Validate tasks against domain rules
  const validatedTasks = validateTasks(tasks, practicePrompt.validationRules)
  
  return { tasks: validatedTasks }
}
```

### 4. Task Validation

Each domain has specific validation rules:

- **PROGRAMMING**: Must have `solution`, `testCases`, `language`
- **PHYSICS/MATH**: Must have `tolerance`, numeric `correctAnswer`
- **LANGUAGES**: Must have `correctAnswers` array for text tasks
- **All domains**: Question must contain topic keywords

## Bug Fixes Design

### Bug 3: Completion Modal Navigation

**Problem**: `handleCancel` in `useCompletionModal` calls `onNavigate`, causing navigation even on cancel.

**Solution**: Remove `onNavigate` call from `handleCancel`. Cancel should only close modal.

```typescript
// BEFORE
const handleCancel = useCallback(() => {
  if (pendingTopicId) {
    onNavigate(pendingTopicId)  // BUG: navigates on cancel
  }
  setIsOpen(false)
  setPendingTopicId(null)
}, [pendingTopicId, onNavigate])

// AFTER
const handleCancel = useCallback(() => {
  // Just close modal - DO NOT navigate
  setIsOpen(false)
  setPendingTopicId(null)
}, [])
```

### Bug 5: Post-Creation Redirect

**Problem**: After creating course, redirects to `/goals/${id}` instead of `/graph`.

**Solution**: Change redirect in `goals/new/page.tsx`:

```typescript
// BEFORE
router.push(`/goals/${goal.id}`)

// AFTER
router.push('/graph')
```

### Bug 6: Module Graph Layout

**Problem**: Modules displayed in horizontal line instead of circular layout.

**Solution**: Use circular positioning like `KnowledgeGraph`:

```typescript
const angle = startAngle + index * angleStep
const x = centerX + radius * Math.cos(angle)
const y = centerY + radius * Math.sin(angle)
```

### Bug 7: Toggle Position

**Problem**: View mode toggle overlaps with course list.

**Solution**: Move toggle above course list in flex layout.

## Testing Strategy

1. Unit tests for domain prompt selection
2. Unit tests for task validation per domain
3. Integration tests for practice generation API
4. E2E tests for bug fixes (modal, redirect, layout)
