export type TopicStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'MASTERED'
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'
export type LessonType = 'THEORY' | 'QUIZ' | 'CODING' | 'FILL_BLANK'
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'ABANDONED'

export interface Topic {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  difficulty: Difficulty
  estimatedMinutes: number
  order: number
  prerequisiteIds: string[]
  progress?: TopicProgress
}

export interface TopicProgress {
  status: TopicStatus
  masteryLevel: number
  theoryCompleted: boolean
  practiceScore: number | null
  timeSpentMinutes: number
}

export interface Goal {
  id: string
  title: string
  skill: string
  description: string | null
  targetDate: string | null
  status: GoalStatus
  topics: Topic[]
  createdAt: string
}

export interface DiagnosisQuestion {
  question: string
  type: 'multiple_choice' | 'code' | 'fill_blank'
  options: string[]
  correctAnswer: number
  explanation: string
  topicSlug: string
  difficulty: Difficulty
}

export interface Task {
  title: string
  description: string
  examples: { input: string; output: string }[]
  starterCode: string
  hints: string[]
  solution: string
  testCases: { input: string; expected: string }[]
}

export interface CodeReviewResult {
  isCorrect: boolean
  score: number
  feedback: string
  issues: { type: string; message: string }[]
  suggestions: string[]
  encouragement: string
}

export interface ReviewCard {
  id: string
  front: string
  back: string
  topicSlug: string
  nextReviewDate: string
  repetitions?: number
  easeFactor?: number
  interval?: number
}

export interface UserStats {
  currentStreak: number
  longestStreak: number
  totalMinutes: number
  totalLessons: number
  totalTasks: number
  correctAnswers: number
}

export interface Achievement {
  type: string
  unlockedAt: string
}

export interface ChatMessage {
  id: string
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
}
