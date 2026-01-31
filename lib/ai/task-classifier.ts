/**
 * Task Classifier for AI Study Agent
 * Classifies task difficulty using AI analysis
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { generateWithRouter } from '@/lib/ai-router'

export interface TaskClassification {
  difficulty: 'easy' | 'medium' | 'hard'
  confidence: number
  factors: {
    complexity: number
    knowledgeRequired: number
    timeEstimate: number
  }
}

export interface Task {
  id: number
  type: string
  question: string
  options?: string[]
  correctAnswer?: number
  correctAnswers?: number[]
  explanation?: string
  hint?: string
}

export class TaskClassifier {
  private overrides: Map<number, 'easy' | 'medium' | 'hard'>

  constructor() {
    this.overrides = new Map()
  }

  /**
   * Classify a single task using AI
   * Requirement 6.1: Analyze each task and assign difficulty level
   * Requirement 6.2: Consider complexity, required knowledge, and time estimate
   */
  async classify(task: Task): Promise<TaskClassification> {
    // Check for manual override first
    // Requirement 6.4: Allow manual override
    if (this.overrides.has(task.id)) {
      const difficulty = this.overrides.get(task.id)!
      return {
        difficulty,
        confidence: 1.0,
        factors: {
          complexity: difficulty === 'easy' ? 3 : difficulty === 'medium' ? 6 : 9,
          knowledgeRequired: difficulty === 'easy' ? 3 : difficulty === 'medium' ? 6 : 9,
          timeEstimate: difficulty === 'easy' ? 2 : difficulty === 'medium' ? 5 : 10
        }
      }
    }

    const prompt = `Проанализируй сложность этого задания:

Вопрос: ${task.question}
Тип: ${task.type}
${task.options ? `Варианты: ${task.options.join(', ')}` : ''}
${task.hint ? `Подсказка: ${task.hint}` : ''}

Оцени по шкале 1-10:
- Сложность вопроса (простота формулировки, количество шагов)
- Требуемые знания (базовые, средние, продвинутые)
- Примерное время решения (минуты)

Верни JSON:
{
  "difficulty": "easy"|"medium"|"hard",
  "confidence": 0.0-1.0,
  "factors": {
    "complexity": 1-10,
    "knowledgeRequired": 1-10,
    "timeEstimate": 1-10
  }
}

ТОЛЬКО валидный JSON.`

    try {
      const result = await generateWithRouter(
        'fast',
        'Ты эксперт по оценке сложности учебных заданий. Отвечай ТОЛЬКО JSON.',
        prompt,
        { json: true, temperature: 0.3, maxTokens: 500 }
      )

      const data = JSON.parse(result.content)
      
      // Validate and normalize the response
      const classification: TaskClassification = {
        difficulty: this.normalizeDifficulty(data.difficulty),
        confidence: Math.max(0, Math.min(1, data.confidence || 0.7)),
        factors: {
          complexity: Math.max(1, Math.min(10, data.factors?.complexity || 5)),
          knowledgeRequired: Math.max(1, Math.min(10, data.factors?.knowledgeRequired || 5)),
          timeEstimate: Math.max(1, Math.min(10, data.factors?.timeEstimate || 5))
        }
      }

      return classification
    } catch (e) {
      console.error('[TaskClassifier] Classification failed:', e)
      
      // Fallback: simple heuristic based on question length and type
      return this.fallbackClassify(task)
    }
  }

  /**
   * Classify multiple tasks in batch
   * Requirement 6.1: Analyze each task and assign difficulty level
   */
  async classifyBatch(tasks: Task[]): Promise<TaskClassification[]> {
    console.log(`[TaskClassifier] Classifying ${tasks.length} tasks...`)
    
    // Process tasks in parallel for speed
    const results = await Promise.allSettled(
      tasks.map(task => this.classify(task))
    )

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        console.warn(`[TaskClassifier] Task ${tasks[index].id} classification failed, using fallback`)
        return this.fallbackClassify(tasks[index])
      }
    })
  }

  /**
   * Validate that the distribution matches target: 40% easy, 40% medium, 20% hard
   * Requirement 6.3: Ensure distribution matches 40% easy, 40% medium, 20% hard
   */
  validateDistribution(classifications: TaskClassification[]): boolean {
    if (classifications.length === 0) {
      return false
    }

    const counts = {
      easy: 0,
      medium: 0,
      hard: 0
    }

    classifications.forEach(c => {
      counts[c.difficulty]++
    })

    const total = classifications.length
    const easyPercent = (counts.easy / total) * 100
    const mediumPercent = (counts.medium / total) * 100
    const hardPercent = (counts.hard / total) * 100

    // Allow 10% tolerance
    const tolerance = 10
    
    const easyValid = Math.abs(easyPercent - 40) <= tolerance
    const mediumValid = Math.abs(mediumPercent - 40) <= tolerance
    const hardValid = Math.abs(hardPercent - 20) <= tolerance

    console.log(`[TaskClassifier] Distribution: ${easyPercent.toFixed(1)}% easy, ${mediumPercent.toFixed(1)}% medium, ${hardPercent.toFixed(1)}% hard`)
    console.log(`[TaskClassifier] Valid: easy=${easyValid}, medium=${mediumValid}, hard=${hardValid}`)

    return easyValid && mediumValid && hardValid
  }

  /**
   * Manually override a task's difficulty
   * Requirement 6.4: Allow manual override when task is misclassified
   */
  override(taskId: number, difficulty: 'easy' | 'medium' | 'hard'): void {
    console.log(`[TaskClassifier] Manual override: task ${taskId} -> ${difficulty}`)
    this.overrides.set(taskId, difficulty)
  }

  /**
   * Clear all manual overrides
   */
  clearOverrides(): void {
    this.overrides.clear()
  }

  /**
   * Get all manual overrides
   */
  getOverrides(): Map<number, 'easy' | 'medium' | 'hard'> {
    return new Map(this.overrides)
  }

  /**
   * Normalize difficulty string to valid value
   * Private helper method
   */
  private normalizeDifficulty(difficulty: string): 'easy' | 'medium' | 'hard' {
    const normalized = difficulty.toLowerCase().trim()
    
    if (normalized === 'easy' || normalized === 'легкий' || normalized === 'простой') {
      return 'easy'
    }
    if (normalized === 'hard' || normalized === 'сложный' || normalized === 'трудный') {
      return 'hard'
    }
    
    return 'medium'
  }

  /**
   * Fallback classification using simple heuristics
   * Private helper method
   */
  private fallbackClassify(task: Task): TaskClassification {
    let complexity = 5
    let knowledgeRequired = 5
    let timeEstimate = 5

    // Question length heuristic
    const questionLength = task.question.length
    if (questionLength < 50) {
      complexity -= 2
      timeEstimate -= 2
    } else if (questionLength > 150) {
      complexity += 2
      timeEstimate += 2
    }

    // Type heuristic
    if (task.type === 'single') {
      complexity -= 1
      timeEstimate -= 1
    } else if (task.type === 'multiple') {
      complexity += 1
      timeEstimate += 1
    } else if (task.type === 'text') {
      complexity += 2
      timeEstimate += 2
      knowledgeRequired += 1
    }

    // Options count heuristic
    if (task.options && task.options.length > 4) {
      complexity += 1
    }

    // Normalize to 1-10 range
    complexity = Math.max(1, Math.min(10, complexity))
    knowledgeRequired = Math.max(1, Math.min(10, knowledgeRequired))
    timeEstimate = Math.max(1, Math.min(10, timeEstimate))

    // Calculate average score
    const avgScore = (complexity + knowledgeRequired + timeEstimate) / 3

    // Determine difficulty
    let difficulty: 'easy' | 'medium' | 'hard'
    if (avgScore <= 4) {
      difficulty = 'easy'
    } else if (avgScore <= 7) {
      difficulty = 'medium'
    } else {
      difficulty = 'hard'
    }

    return {
      difficulty,
      confidence: 0.5, // Lower confidence for fallback
      factors: {
        complexity,
        knowledgeRequired,
        timeEstimate
      }
    }
  }
}
