# Implementation Tasks

## Task 1: Fix Completion Modal Navigation Bug (Requirement 3)
- [x] Modify `useCompletionModal.ts` - remove `onNavigate` call from `handleCancel`
- [x] `handleCancel` should only close modal and reset state
- [x] Test: clicking X/Escape/Cancel button should NOT navigate

## Task 2: Fix Post-Creation Redirect (Requirement 5)
- [x] Modify `app/(dashboard)/goals/new/page.tsx`
- [x] Change `router.push(\`/goals/${goal.id}\`)` to `router.push('/graph')`
- [x] Test: after creating course, user should see graph page

## Task 3: Fix Module Graph Circular Layout (Requirement 6)
- [x] Modify `components/graph/ModuleGraph.tsx`
- [x] Change horizontal layout to circular layout
- [x] Use same positioning logic as `KnowledgeGraph.tsx`
- [x] Test: modules should be arranged in a circle

## Task 4: Fix View Mode Toggle Position (Requirement 7)
- [x] Modify `app/(dashboard)/graph/page.tsx`
- [x] Move toggle above course list in layout
- [x] Ensure no overlap with goal selector buttons
- [x] Test: toggle should be clearly visible above graph

## Task 5: Add Domain Practice Prompts
- [x] Add `DomainPracticePrompt` interface to `lib/ai/domain-prompts.ts`
- [x] Create practice prompts for each domain:
  - [x] PHYSICS: number tasks with formulas and units
  - [x] MATHEMATICS: number tasks with step-by-step solutions
  - [x] PROGRAMMING: code tasks with test cases
  - [x] CHEMISTRY: number tasks with equations
  - [x] LANGUAGES: text tasks for translations
  - [x] HISTORY: single choice with dates/events
  - [x] BIOLOGY: matching tasks with classifications
  - [x] ECONOMICS: number tasks with calculations
  - [x] GENERAL: mixed task types
- [x] Export `getDomainPracticePrompt(domain: Domain)` function

## Task 6: Integrate Domain Practice in API
- [x] Modify `app/api/topics/[id]/lesson/route.ts`
- [x] Pass domain to `generatePracticeFromTheory`
- [x] Use domain-specific prompts for task generation
- [x] Add domain-specific validation rules

## Task 7: Improve Task Relevance (Requirement 2)
- [x] Add topic name validation in generated tasks
- [x] Ensure task questions contain topic keywords
- [x] Add deduplication for similar questions
- [x] Improve diversity of task types per domain

## Task 8: Write Tests
- [ ] Test for `useCompletionModal` cancel behavior
- [ ] Test for domain practice prompt selection
- [ ] Test for task validation per domain
