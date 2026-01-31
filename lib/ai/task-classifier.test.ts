/**
 * Unit tests for TaskClassifier
 * Tests manual override functionality and distribution validation
 * Requirements: 6.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TaskClassifier, Task, TaskClassification } from './task-classifier'

// Mock the AI router
vi.mock('@/lib/ai-router', () => ({
  generateWithRouter: vi.fn(async () => ({
    content: JSON.stringify({
      difficulty: 'medium',
      confidence: 0.8,
      factors: {
        complexity: 6,
        knowledgeRequired: 6,
        timeEstimate: 5
      }
    }),
    provider: 'mock',
    latencyMs: 10
  }))
}))

describe('TaskClassifier Unit Tests', () => {
  let classifier: TaskClassifier

  beforeEach(() => {
    classifier = new TaskClassifier()
  })

  describe('Manual Override Functionality', () => {
    // Requirement 6.4: Allow manual override when task is misclassified
    it('should allow manual override of task difficulty', async () => {
      const task: Task = {
        id: 1,
        type: 'single',
        question: 'What is 2 + 2?'
      }

      // Override to easy
      classifier.override(1, 'easy')
      
      const classification = await classifier.classify(task)
      
      expect(classification.difficulty).toBe('easy')
      expect(classification.confidence).toBe(1.0)
    })

    it('should allow overriding multiple tasks', async () => {
      classifier.override(1, 'easy')
      classifier.override(2, 'hard')
      classifier.override(3, 'medium')

      const task1: Task = { id: 1, type: 'single', question: 'Q1' }
      const task2: Task = { id: 2, type: 'single', question: 'Q2' }
      const task3: Task = { id: 3, type: 'single', question: 'Q3' }

      const c1 = await classifier.classify(task1)
      const c2 = await classifier.classify(task2)
      const c3 = await classifier.classify(task3)

      expect(c1.difficulty).toBe('easy')
      expect(c2.difficulty).toBe('hard')
      expect(c3.difficulty).toBe('medium')
    })

    it('should allow changing an override', async () => {
      const task: Task = { id: 1, type: 'single', question: 'Test' }

      classifier.override(1, 'easy')
      let classification = await classifier.classify(task)
      expect(classification.difficulty).toBe('easy')

      // Change override
      classifier.override(1, 'hard')
      classification = await classifier.classify(task)
      expect(classification.difficulty).toBe('hard')
    })

    it('should clear all overrides', async () => {
      classifier.override(1, 'easy')
      classifier.override(2, 'hard')

      classifier.clearOverrides()

      const overrides = classifier.getOverrides()
      expect(overrides.size).toBe(0)
    })

    it('should get all current overrides', () => {
      classifier.override(1, 'easy')
      classifier.override(2, 'hard')
      classifier.override(3, 'medium')

      const overrides = classifier.getOverrides()
      
      expect(overrides.size).toBe(3)
      expect(overrides.get(1)).toBe('easy')
      expect(overrides.get(2)).toBe('hard')
      expect(overrides.get(3)).toBe('medium')
    })

    it('should not affect non-overridden tasks', async () => {
      classifier.override(1, 'easy')

      const task1: Task = { id: 1, type: 'single', question: 'Q1' }
      const task2: Task = { id: 2, type: 'single', question: 'Q2' }

      const c1 = await classifier.classify(task1)
      const c2 = await classifier.classify(task2)

      expect(c1.difficulty).toBe('easy')
      // Task 2 should use AI classification (mocked to 'medium')
      expect(c2.difficulty).toBe('medium')
    })
  })

  describe('Distribution Validation', () => {
    // Requirement 6.3: Ensure distribution matches 40% easy, 40% medium, 20% hard
    it('should validate perfect distribution', () => {
      const classifications: TaskClassification[] = [
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'hard', confidence: 0.8, factors: { complexity: 9, knowledgeRequired: 9, timeEstimate: 10 } },
        { difficulty: 'hard', confidence: 0.8, factors: { complexity: 9, knowledgeRequired: 9, timeEstimate: 10 } }
      ]

      const isValid = classifier.validateDistribution(classifications)
      expect(isValid).toBe(true)
    })

    it('should reject distribution with too many easy tasks', () => {
      const classifications: TaskClassification[] = [
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'hard', confidence: 0.8, factors: { complexity: 9, knowledgeRequired: 9, timeEstimate: 10 } }
      ]

      const isValid = classifier.validateDistribution(classifications)
      expect(isValid).toBe(false)
    })

    it('should reject distribution with too few hard tasks', () => {
      // 40% easy, 55% medium, 5% hard - hard is too low (outside 10% tolerance of 20%)
      const classifications: TaskClassification[] = [
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'hard', confidence: 0.8, factors: { complexity: 9, knowledgeRequired: 9, timeEstimate: 10 } }
      ]

      const isValid = classifier.validateDistribution(classifications)
      expect(isValid).toBe(false)
    })

    it('should accept distribution within tolerance (10%)', () => {
      // 35% easy, 45% medium, 20% hard (within 10% tolerance)
      const classifications: TaskClassification[] = [
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'medium', confidence: 0.8, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
        { difficulty: 'hard', confidence: 0.8, factors: { complexity: 9, knowledgeRequired: 9, timeEstimate: 10 } },
        { difficulty: 'hard', confidence: 0.8, factors: { complexity: 9, knowledgeRequired: 9, timeEstimate: 10 } },
        { difficulty: 'hard', confidence: 0.8, factors: { complexity: 9, knowledgeRequired: 9, timeEstimate: 10 } },
        { difficulty: 'hard', confidence: 0.8, factors: { complexity: 9, knowledgeRequired: 9, timeEstimate: 10 } }
      ]

      const isValid = classifier.validateDistribution(classifications)
      expect(isValid).toBe(true)
    })

    it('should reject empty classification array', () => {
      const isValid = classifier.validateDistribution([])
      expect(isValid).toBe(false)
    })

    it('should reject distribution with only one difficulty level', () => {
      const classifications: TaskClassification[] = [
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
        { difficulty: 'easy', confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } }
      ]

      const isValid = classifier.validateDistribution(classifications)
      expect(isValid).toBe(false)
    })
  })

  describe('Fallback Classification', () => {
    it('should use fallback when AI fails', async () => {
      // Mock AI to fail
      const { generateWithRouter } = await import('@/lib/ai-router')
      vi.mocked(generateWithRouter).mockRejectedValueOnce(new Error('AI failed'))

      const task: Task = {
        id: 1,
        type: 'single',
        question: 'Short question'
      }

      const classification = await classifier.classify(task)

      // Should still return valid classification
      expect(['easy', 'medium', 'hard']).toContain(classification.difficulty)
      expect(classification.confidence).toBeGreaterThanOrEqual(0)
      expect(classification.confidence).toBeLessThanOrEqual(1)
    })

    it('should classify short questions as easier', async () => {
      const { generateWithRouter } = await import('@/lib/ai-router')
      vi.mocked(generateWithRouter).mockRejectedValueOnce(new Error('AI failed'))

      const task: Task = {
        id: 1,
        type: 'single',
        question: 'Short?'
      }

      const classification = await classifier.classify(task)

      // Short questions tend to be easier in fallback
      expect(classification.factors.complexity).toBeLessThan(7)
    })

    it('should classify long questions as harder', async () => {
      const { generateWithRouter } = await import('@/lib/ai-router')
      vi.mocked(generateWithRouter).mockRejectedValueOnce(new Error('AI failed'))

      const task: Task = {
        id: 1,
        type: 'text',
        question: 'This is a very long and complex question that requires a lot of thought and analysis to answer correctly. It involves multiple concepts and requires deep understanding of the subject matter.'
      }

      const classification = await classifier.classify(task)

      // Long text questions tend to be harder in fallback
      expect(classification.factors.complexity).toBeGreaterThan(5)
    })
  })
})
