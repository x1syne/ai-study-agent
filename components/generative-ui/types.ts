// Types for Generative UI components

export type UIComponentType = 
  | 'text'           // Plain text response
  | 'quiz'           // Interactive quiz
  | 'comparison'     // Comparison table
  | 'code'           // Code example with syntax highlighting
  | 'progress'       // Progress/stats card
  | 'flowchart'      // Visual flowchart/diagram
  | 'info'           // Info card with icon
  | 'steps'          // Step-by-step guide
  | 'list'           // Styled list

export interface GenerativeUIComponent {
  type: UIComponentType
  data: QuizData | ComparisonData | CodeData | ProgressData | FlowchartData | InfoData | StepsData | ListData | TextData
}

export interface TextData {
  content: string
}

export interface QuizData {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface ComparisonData {
  title: string
  headers: string[]
  rows: { feature: string; values: string[] }[]
}

export interface CodeData {
  language: string
  code: string
  title?: string
  description?: string
}

export interface ProgressData {
  title: string
  items: { label: string; value: number; max: number; color?: string }[]
}

export interface FlowchartData {
  title: string
  nodes: { id: string; label: string; type?: 'start' | 'end' | 'process' | 'decision' }[]
  connections: { from: string; to: string; label?: string }[]
}

export interface InfoData {
  title: string
  content: string
  icon?: 'info' | 'warning' | 'success' | 'tip' | 'example'
}

export interface StepsData {
  title: string
  steps: { title: string; description: string }[]
}

export interface ListData {
  title?: string
  items: string[]
  ordered?: boolean
}
