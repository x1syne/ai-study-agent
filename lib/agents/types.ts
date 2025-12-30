/**
 * 🎯 AI COURSE AGENTS - Type Definitions
 * 
 * Типы для системы агентов генерации курсов уровня Harvard/MIT
 * Analyst → Constructor → Generator pipeline
 */

// ═══════════════════════════════════════════════════════════════
// 📊 TOPIC CLASSIFICATION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Тип темы для адаптации контента
 */
export type TopicType = 
  | 'programming'    // Код, алгоритмы, разработка
  | 'scientific'     // Физика, химия, математика, биология
  | 'creative'       // Искусство, дизайн, музыка, писательство
  | 'practical'      // Кулинария, ремонт, спорт, навыки
  | 'business'       // Менеджмент, маркетинг, финансы
  | 'humanities'     // История, философия, языки, психология
  | 'technical'      // Инженерия, электроника, механика

/**
 * Уровень сложности
 */
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

/**
 * Формат практики
 */
export type PracticeFormat = 
  | 'code_challenges'    // Codewars-style задачи
  | 'calculations'       // Расчёты и формулы
  | 'creative_tasks'     // Творческие задания
  | 'step_by_step'       // Пошаговые инструкции
  | 'case_studies'       // Разбор кейсов
  | 'quizzes'            // Тесты и викторины
  | 'simulations'        // Симуляции и эксперименты

// ═══════════════════════════════════════════════════════════════
// 🔍 ANALYST AGENT TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Результат анализа темы от Analyst агента
 */
export interface TopicAnalysisResult {
  /** Оригинальный запрос пользователя */
  query: string
  
  /** Нормализованное название темы */
  normalizedTopic: string
  
  /** Тип темы для адаптации */
  type: TopicType
  
  /** Подтипы для более точной адаптации */
  subtypes: string[]
  
  /** Уровень сложности */
  difficulty: DifficultyLevel
  
  /** Ключевые концепции для изучения */
  keyConcepts: string[]
  
  /** Предварительные требования */
  prerequisites: string[]
  
  /** Рекомендуемые источники (Harvard, MIT, etc.) */
  recommendedSources: string[]
  
  /** Формат практики */
  practiceFormats: PracticeFormat[]
  
  /** Оценка времени на курс (минуты) */
  estimatedDuration: number
  
  /** RAG контекст из поиска */
  ragContext: RAGContext
  
  /** Метаданные анализа */
  metadata: {
    analyzedAt: string
    confidence: number
    ragSourcesUsed: number
  }
}

/**
 * RAG контекст из внешних источников
 */
export interface RAGContext {
  /** Найденные outline'ы курсов */
  courseOutlines: CourseOutlineSource[]
  
  /** Релевантные статьи */
  articles: ArticleSource[]
  
  /** Ключевые факты */
  keyFacts: string[]
  
  /** Рекомендуемая структура */
  suggestedStructure: string[]
}

export interface CourseOutlineSource {
  source: string  // "Harvard CS50", "MIT OCW", etc.
  title: string
  modules: string[]
  url?: string
}

export interface ArticleSource {
  title: string
  snippet: string
  url: string
  relevance: number
}

// ═══════════════════════════════════════════════════════════════
// 🏗️ CONSTRUCTOR AGENT TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Структура курса от Constructor агента
 */
export interface CourseStructure {
  /** Название курса */
  title: string
  
  /** Подзаголовок */
  subtitle: string
  
  /** Описание курса */
  description: string
  
  /** Цели обучения */
  objectives: string[]
  
  /** Модули курса */
  modules: CourseModule[]
  
  /** Общее время (минуты) */
  totalDuration: number
  
  /** Тип темы (из анализа) */
  topicType: TopicType
  
  /** Метаданные */
  metadata: {
    createdAt: string
    version: string
    basedOnSources: string[]
  }
}

/**
 * Модуль курса
 */
export interface CourseModule {
  /** Уникальный ID */
  id: string
  
  /** Порядковый номер */
  order: number
  
  /** Название модуля */
  name: string
  
  /** Описание */
  description: string
  
  /** Промпт для генерации теории */
  theoryPrompt: string
  
  /** Промпт для генерации практики */
  practicePrompt: string
  
  /** Ключевые термины */
  keyTerms: string[]
  
  /** Время на модуль (минуты) */
  duration: number
  
  /** Сложность модуля */
  difficulty: DifficultyLevel
  
  /** Тип контента */
  contentType: ModuleContentType
}

export type ModuleContentType = 
  | 'theory'           // Теоретический материал
  | 'hands_on'         // Практика с кодом/действиями
  | 'problem_solving'  // Решение задач
  | 'project'          // Мини-проект
  | 'review'           // Повторение и закрепление

// ═══════════════════════════════════════════════════════════════
// 🎨 GENERATOR AGENT TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Сгенерированный контент модуля
 */
export interface GeneratedModuleContent {
  /** ID модуля */
  moduleId: string
  
  /** Теоретический контент (Markdown) */
  theory: TheoryContent
  
  /** Практические задания */
  practice: PracticeContent
  
  /** Метаданные генерации */
  metadata: {
    generatedAt: string
    tokensUsed: number
    provider: string
  }
}

/**
 * Теоретический контент
 */
export interface TheoryContent {
  /** Markdown контент */
  markdown: string
  
  /** Встроенные медиа */
  media: MediaEmbed[]
  
  /** Интерактивные элементы */
  interactiveElements: InteractiveElement[]
  
  /** Количество слов */
  wordCount: number
}

export interface MediaEmbed {
  type: 'image' | 'video' | 'diagram' | 'code'
  description: string
  url?: string
  content?: string
}

export interface InteractiveElement {
  type: 'quiz' | 'code_sandbox' | 'calculator' | 'timer' | 'checklist'
  data: Record<string, unknown>
}

/**
 * Практический контент
 */
export interface PracticeContent {
  /** Задания */
  tasks: PracticeTask[]
  
  /** Тип проверки */
  verificationType: 'auto' | 'llm' | 'self'
}

/**
 * Практическое задание (Codewars-style)
 */
export interface PracticeTask {
  /** Уникальный ID */
  id: string
  
  /** Название */
  title: string
  
  /** Описание задания */
  description: string
  
  /** Уровень сложности */
  difficulty: 'easy' | 'medium' | 'hard'
  
  /** Тип задания */
  type: TaskType
  
  /** Данные задания (зависит от типа) */
  data: TaskData
  
  /** Подсказки */
  hints: string[]
  
  /** Очки за выполнение */
  points: number
}

export type TaskType = 
  | 'code'           // Написать код
  | 'multiple_choice' // Выбор из вариантов
  | 'fill_blank'     // Заполнить пропуски
  | 'calculation'    // Расчёт
  | 'ordering'       // Упорядочить шаги
  | 'matching'       // Сопоставление
  | 'free_text'      // Свободный ответ

export type TaskData = 
  | CodeTaskData 
  | MultipleChoiceData 
  | CalculationData 
  | FreeTextData
  | OrderingData
  | MatchingData

export interface CodeTaskData {
  language: string
  starterCode: string
  solution: string
  testCases: TestCase[]
}

export interface TestCase {
  input: string
  expectedOutput: string
  description?: string
}

export interface MultipleChoiceData {
  options: string[]
  correctIndices: number[]
  explanation: string
}

export interface CalculationData {
  formula?: string
  variables: Record<string, number>
  correctAnswer: number
  tolerance?: number
  unit?: string
}

export interface FreeTextData {
  sampleAnswer: string
  keywords: string[]
  minLength?: number
}

export interface OrderingData {
  items: string[]
  correctOrder: number[]
}

export interface MatchingData {
  leftItems: string[]
  rightItems: string[]
  correctPairs: [number, number][]
}

// ═══════════════════════════════════════════════════════════════
// 💾 CACHE TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Кэшированный курс в Supabase
 */
export interface CachedCourse {
  id: string
  query: string
  queryHash: string
  analysis: TopicAnalysisResult
  structure: CourseStructure
  modules: GeneratedModuleContent[]
  createdAt: string
  expiresAt: string
  accessCount: number
  lastAccessedAt: string
}

// ═══════════════════════════════════════════════════════════════
// 🔧 UTILITY TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Результат LLM вызова
 */
export interface LLMResponse {
  content: string
  provider: 'groq' | 'huggingface' | 'gemini' | 'deepseek'
  tokensUsed: number
  latencyMs: number
}

/**
 * Конфигурация генерации
 */
export interface GenerationConfig {
  temperature?: number
  maxTokens?: number
  json?: boolean
  retries?: number
  timeout?: number
}

/**
 * Ошибка агента
 */
export interface AgentError {
  code: string
  message: string
  agent: 'analyst' | 'constructor' | 'generator'
  recoverable: boolean
  context?: Record<string, unknown>
}
