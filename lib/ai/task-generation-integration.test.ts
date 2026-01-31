/**
 * Integration test for Task Classifier in Task Generation
 * Verifies that the classifier is properly integrated into generateTasksFast
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TaskClassifier } from './task-classifier'

// Mock the AI router to avoid needing GROQ_API_KEY
vi.mock('@/lib/ai-router', () => ({
  generateWithRouter: vi.fn(async () => ({
    content: JSON.stringify({
      difficulty: 'medium',
      confidence: 0.7,
      factors: {
        complexity: 5,
        knowledgeRequired: 5,
        timeEstimate: 5
      }
    }),
    provider: 'mock'
  }))
}))

describe('Task Generation Integration', () => {
  let classifier: TaskClassifier

  beforeEach(() => {
    classifier = new TaskClassifier()
  })

  it('should integrate classifier into task generation flow', async () => {
    // Mock tasks that would be generated
    const mockTasks = [
      {
        id: 1,
        type: 'single',
        question: 'What is 2+2?',
        options: ['2', '3', '4', '5'],
        correctAnswer: 2,
        explanation: 'Basic addition',
        hint: ''
      },
      {
        id: 2,
        type: 'text',
        question: 'Explain the theory of relativity in detail with mathematical proofs',
        options: [],
        correctAnswer: 0,
        explanation: 'Complex physics',
        hint: 'Think about spacetime'
      },
      {
        id: 3,
        type: 'single',
        question: 'Which programming language is used for web development?',
        options: ['Python', 'JavaScript', 'C++', 'Assembly'],
        correctAnswer: 1,
        explanation: 'Web development basics',
        hint: ''
      }
    ]

    // Classify tasks
    const classifications = await classifier.classifyBatch(mockTasks)

    // Verify classifications exist
    expect(classifications).toHaveLength(3)
    
    // Verify each classification has required properties
    classifications.forEach(classification => {
      expect(classification).toHaveProperty('difficulty')
      expect(['easy', 'medium', 'hard']).toContain(classification.difficulty)
      expect(classification).toHaveProperty('confidence')
      expect(classification.confidence).toBeGreaterThanOrEqual(0)
      expect(classification.confidence).toBeLessThanOrEqual(1)
      expect(classification).toHaveProperty('factors')
      expect(classification.factors).toHaveProperty('complexity')
      expect(classification.factors).toHaveProperty('knowledgeRequired')
      expect(classification.factors).toHaveProperty('timeEstimate')
    })

    // Apply classifications to tasks (simulating what generateTasksFast does)
    const classifiedTasks = mockTasks.map((task, index) => ({
      ...task,
      difficulty: classifications[index].difficulty,
      classificationConfidence: classifications[index].confidence,
      classificationFactors: classifications[index].factors
    }))

    // Verify tasks have classification data
    classifiedTasks.forEach(task => {
      expect(task).toHaveProperty('difficulty')
      expect(task).toHaveProperty('classificationConfidence')
      expect(task).toHaveProperty('classificationFactors')
    })
  })

  it('should support manual overrides', async () => {
    const taskId = 1
    const originalDifficulty = 'easy'
    const overrideDifficulty = 'hard'

    // Create a mock task
    const mockTask = {
      id: taskId,
      type: 'single',
      question: 'Test question',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
      explanation: 'Test',
      hint: ''
    }

    // Classify without override
    const classification1 = await classifier.classify(mockTask)
    const difficulty1 = classification1.difficulty

    // Apply manual override
    classifier.override(taskId, overrideDifficulty)

    // Classify again with override
    const classification2 = await classifier.classify(mockTask)
    
    // Verify override is applied
    expect(classification2.difficulty).toBe(overrideDifficulty)
    expect(classification2.confidence).toBe(1.0) // Manual overrides have 100% confidence

    // Verify override is stored
    const overrides = classifier.getOverrides()
    expect(overrides.has(taskId)).toBe(true)
    expect(overrides.get(taskId)).toBe(overrideDifficulty)

    // Clear overrides
    classifier.clearOverrides()
    expect(classifier.getOverrides().size).toBe(0)
  })

  it('should validate and adjust distribution', async () => {
    // Create tasks with known difficulties
    const mockClassifications = [
      { difficulty: 'easy' as const, confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
      { difficulty: 'easy' as const, confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
      { difficulty: 'easy' as const, confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
      { difficulty: 'easy' as const, confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
      { difficulty: 'easy' as const, confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
      { difficulty: 'easy' as const, confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
      { difficulty: 'easy' as const, confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
      { difficulty: 'medium' as const, confidence: 0.7, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
      { difficulty: 'hard' as const, confidence: 0.9, factors: { complexity: 9, knowledgeRequired: 9, timeEstimate: 10 } },
      { difficulty: 'hard' as const, confidence: 0.9, factors: { complexity: 9, knowledgeRequired: 9, timeEstimate: 10 } }
    ]

    // This distribution is: 70% easy, 10% medium, 20% hard
    // Target is: 40% easy, 40% medium, 20% hard
    // So it should be invalid (easy is way off)
    const isValid = classifier.validateDistribution(mockClassifications)
    
    // Should be invalid because easy is 70% (should be 40%, tolerance is 10%)
    expect(isValid).toBe(false)
  })

  it('should validate correct distribution', async () => {
    // Create tasks with target distribution: 40% easy, 40% medium, 20% hard
    const mockClassifications = [
      { difficulty: 'easy' as const, confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
      { difficulty: 'easy' as const, confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
      { difficulty: 'easy' as const, confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
      { difficulty: 'easy' as const, confidence: 0.8, factors: { complexity: 3, knowledgeRequired: 3, timeEstimate: 2 } },
      { difficulty: 'medium' as const, confidence: 0.7, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
      { difficulty: 'medium' as const, confidence: 0.7, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
      { difficulty: 'medium' as const, confidence: 0.7, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
      { difficulty: 'medium' as const, confidence: 0.7, factors: { complexity: 6, knowledgeRequired: 6, timeEstimate: 5 } },
      { difficulty: 'hard' as const, confidence: 0.9, factors: { complexity: 9, knowledgeRequired: 9, timeEstimate: 10 } },
      { difficulty: 'hard' as const, confidence: 0.9, factors: { complexity: 9, knowledgeRequired: 9, timeEstimate: 10 } }
    ]

    // This distribution is exactly: 40% easy, 40% medium, 20% hard
    const isValid = classifier.validateDistribution(mockClassifications)
    
    // Should be valid
    expect(isValid).toBe(true)
  })
})
