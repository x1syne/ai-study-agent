/**
 * Property-Based Tests for CompletionModal
 * 
 * Feature: enhanced-learning-ui
 * 
 * These tests validate that the completion modal is shown only for
 * topics that are NOT completed or mastered, and that confirming
 * the modal updates the topic status correctly.
 * 
 * **Property 4: Модал показывается только для незавершённых тем**
 * **Validates: Requirements 2.1, 2.7**
 * 
 * **Property 5: Подтверждение в модале обновляет статус**
 * **Validates: Requirements 2.5**
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { shouldShowCompletionModal, getStatusAfterConfirmation } from './CompletionModal'
import type { TopicStatus } from '@/types'

// All valid topic statuses
const ALL_TOPIC_STATUSES: TopicStatus[] = [
  'LOCKED',
  'AVAILABLE',
  'IN_PROGRESS',
  'COMPLETED',
  'MASTERED'
]

// Statuses that should show the modal (incomplete topics)
const INCOMPLETE_STATUSES: TopicStatus[] = [
  'LOCKED',
  'AVAILABLE',
  'IN_PROGRESS'
]

// Statuses that should NOT show the modal (completed topics)
const COMPLETED_STATUSES: TopicStatus[] = [
  'COMPLETED',
  'MASTERED'
]

// Arbitraries for property-based testing
const incompleteStatusArb: fc.Arbitrary<TopicStatus> = fc.constantFrom(...INCOMPLETE_STATUSES)
const completedStatusArb: fc.Arbitrary<TopicStatus> = fc.constantFrom(...COMPLETED_STATUSES)
const anyStatusArb: fc.Arbitrary<TopicStatus> = fc.constantFrom(...ALL_TOPIC_STATUSES)

describe('CompletionModal Properties', () => {
  /**
   * Property 4: Модал показывается только для незавершённых тем
   * 
   * For any topic transition, the CompletionModal SHALL be shown only if
   * the current topic does NOT have status COMPLETED or MASTERED.
   * 
   * **Validates: Requirements 2.1, 2.7**
   */
  
  it('Property 4: Modal shows for incomplete topics (LOCKED, AVAILABLE, IN_PROGRESS)', () => {
    fc.assert(
      fc.property(
        incompleteStatusArb,
        (status) => {
          const shouldShow = shouldShowCompletionModal(status)
          expect(shouldShow).toBe(true)
          return shouldShow === true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4: Modal does NOT show for completed topics (COMPLETED, MASTERED)', () => {
    fc.assert(
      fc.property(
        completedStatusArb,
        (status) => {
          const shouldShow = shouldShowCompletionModal(status)
          expect(shouldShow).toBe(false)
          return shouldShow === false
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4: shouldShowCompletionModal returns boolean for any valid status', () => {
    fc.assert(
      fc.property(
        anyStatusArb,
        (status) => {
          const result = shouldShowCompletionModal(status)
          expect(typeof result).toBe('boolean')
          return typeof result === 'boolean'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4: Modal visibility is determined solely by completion status', () => {
    fc.assert(
      fc.property(
        anyStatusArb,
        (status) => {
          const shouldShow = shouldShowCompletionModal(status)
          const isCompleted = status === 'COMPLETED' || status === 'MASTERED'
          
          // Modal should show if and only if topic is NOT completed
          expect(shouldShow).toBe(!isCompleted)
          return shouldShow === !isCompleted
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4: All 5 topic statuses are handled correctly', () => {
    // Verify we cover all statuses
    expect(ALL_TOPIC_STATUSES.length).toBe(5)
    expect(INCOMPLETE_STATUSES.length).toBe(3)
    expect(COMPLETED_STATUSES.length).toBe(2)
    
    // Verify each status is handled
    for (const status of ALL_TOPIC_STATUSES) {
      const shouldShow = shouldShowCompletionModal(status)
      const expectedShow = INCOMPLETE_STATUSES.includes(status)
      expect(shouldShow).toBe(expectedShow)
    }
  })
})

describe('CompletionModal Status Transitions', () => {
  /**
   * Additional property tests for topic transitions
   */
  
  it('Property 4: Transitioning from incomplete to any topic shows modal', () => {
    fc.assert(
      fc.property(
        incompleteStatusArb,
        anyStatusArb,
        (currentStatus, _targetStatus) => {
          // When current topic is incomplete, modal should show
          const shouldShow = shouldShowCompletionModal(currentStatus)
          expect(shouldShow).toBe(true)
          return shouldShow === true
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 4: Transitioning from completed to any topic does NOT show modal', () => {
    fc.assert(
      fc.property(
        completedStatusArb,
        anyStatusArb,
        (currentStatus, _targetStatus) => {
          // When current topic is completed, modal should NOT show
          const shouldShow = shouldShowCompletionModal(currentStatus)
          expect(shouldShow).toBe(false)
          return shouldShow === false
        }
      ),
      { numRuns: 100 }
    )
  })
})


// Statuses that can be confirmed (modal shows for these)
const CONFIRMABLE_STATUSES: TopicStatus[] = [
  'LOCKED',
  'AVAILABLE',
  'IN_PROGRESS'
]

// Arbitraries for Property 5 testing
const confirmableStatusArb: fc.Arbitrary<TopicStatus> = fc.constantFrom(...CONFIRMABLE_STATUSES)

describe('CompletionModal Status Update Properties', () => {
  /**
   * Property 5: Подтверждение в модале обновляет статус
   * 
   * For any topic with status IN_PROGRESS or AVAILABLE, when confirming
   * in CompletionModal, the status SHALL change to COMPLETED.
   * 
   * **Validates: Requirements 2.5**
   */

  it('Property 5: Confirmation changes status to COMPLETED for confirmable statuses', () => {
    fc.assert(
      fc.property(
        confirmableStatusArb,
        (currentStatus) => {
          // When modal is confirmed, status should become COMPLETED
          const newStatus = getStatusAfterConfirmation(currentStatus)
          expect(newStatus).toBe('COMPLETED')
          return newStatus === 'COMPLETED'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 5: Confirmation always results in COMPLETED status regardless of initial confirmable status', () => {
    fc.assert(
      fc.property(
        confirmableStatusArb,
        fc.string({ minLength: 1, maxLength: 50 }), // topic name
        fc.uuid(), // topic id
        (currentStatus, _topicName, _topicId) => {
          // For any confirmable status, confirmation should result in COMPLETED
          const newStatus = getStatusAfterConfirmation(currentStatus)
          
          // The new status must be COMPLETED
          expect(newStatus).toBe('COMPLETED')
          
          // The new status must be different from incomplete statuses
          expect(['LOCKED', 'AVAILABLE', 'IN_PROGRESS']).not.toContain(newStatus)
          
          return newStatus === 'COMPLETED'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 5: Status transition is deterministic - same input always produces same output', () => {
    fc.assert(
      fc.property(
        confirmableStatusArb,
        (currentStatus) => {
          // Multiple calls with same status should produce same result
          const result1 = getStatusAfterConfirmation(currentStatus)
          const result2 = getStatusAfterConfirmation(currentStatus)
          const result3 = getStatusAfterConfirmation(currentStatus)
          
          expect(result1).toBe(result2)
          expect(result2).toBe(result3)
          expect(result1).toBe('COMPLETED')
          
          return result1 === result2 && result2 === result3 && result1 === 'COMPLETED'
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 5: Confirmation for already completed statuses returns same status', () => {
    fc.assert(
      fc.property(
        completedStatusArb,
        (currentStatus) => {
          // For already completed statuses, confirmation should keep the status
          const newStatus = getStatusAfterConfirmation(currentStatus)
          
          // COMPLETED stays COMPLETED, MASTERED stays MASTERED
          expect(newStatus).toBe(currentStatus)
          
          return newStatus === currentStatus
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 5: All confirmable statuses transition to COMPLETED', () => {
    // Verify all confirmable statuses are handled
    expect(CONFIRMABLE_STATUSES.length).toBe(3)
    
    for (const status of CONFIRMABLE_STATUSES) {
      const newStatus = getStatusAfterConfirmation(status)
      expect(newStatus).toBe('COMPLETED')
    }
  })
})
