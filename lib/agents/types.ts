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

// ═══════════════════════════════════════════════════════════════
// 📚 LESSON & PROGRESS TYPES (Enhanced Course Experience)
// ═══════════════════════════════════════════════════════════════

/**
 * Статус урока в прогрессе пользователя
 */
export type LessonStatus = 'not_started' | 'theory_done' | 'practice_done' | 'completed'

/**
 * Определение ключевого термина
 */
export interface TermDefinition {
  /** Термин */
  term: string
  /** Определение */
  definition: string
  /** Примеры использования */
  examples?: string[]
}

/**
 * Урок внутри модуля
 */
export interface Lesson {
  /** Уникальный ID урока */
  id: string
  /** ID родительского модуля */
  moduleId: string
  /** Порядковый номер в модуле */
  order: number
  /** Название урока */
  title: string
  /** Краткое описание */
  description: string
  /** Теория в Markdown с ==highlights== */
  theoryMarkdown: string
  /** Ключевые термины урока */
  keyTerms: TermDefinition[]
  /** Время на чтение (минуты) */
  estimatedReadTime: number
  /** Количество слов */
  wordCount: number
  /** ID практических заданий */
  practiceTaskIds: string[]
}

/**
 * Прогресс по уроку
 */
export interface LessonProgress {
  /** ID урока */
  lessonId: string
  /** Статус */
  status: LessonStatus
  /** Дата завершения */
  completedAt?: string
}

/**
 * Прогресс по модулю
 */
export interface ModuleProgress {
  /** ID модуля */
  moduleId: string
  /** Прогресс по урокам */
  lessons: LessonProgress[]
  /** Процент завершения (0-100) */
  completionPercent: number
}

/**
 * Прогресс по курсу
 */
export interface CourseProgress {
  /** ID курса */
  courseId: string
  /** Прогресс по модулям */
  modules: ModuleProgress[]
  /** ID последнего открытого урока */
  lastAccessedLessonId: string
  /** Общий процент завершения */
  overallPercent: number
}

/**
 * Модуль с уроками (расширение CourseModule)
 */
export interface ModuleWithLessons extends CourseModule {
  /** Уроки модуля */
  lessons: Lesson[]
}

/**
 * Структура курса с уроками
 */
export interface CourseStructureWithLessons extends Omit<CourseStructure, 'modules'> {
  /** Модули с уроками */
  modules: ModuleWithLessons[]
}

// ═══════════════════════════════════════════════════════════════
// 🎨 VISUAL IDENTITY TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Цветовая схема курса на основе типа темы
 */
export type ColorScheme = 
  | 'blue-gradient'    // programming, technical
  | 'green-gradient'   // scientific
  | 'purple-gradient'  // creative, humanities
  | 'orange-gradient'  // business, practical

/**
 * Визуальная тема на основе уровня сложности
 */
export type VisualTheme = 
  | 'minimalist-illustrations'  // beginner
  | 'data-driven-infographics'  // intermediate
  | 'animated-diagrams'         // advanced, expert

/**
 * Уровень интерактивности курса
 */
export type InteractivityLevel = 'high' | 'medium' | 'low'

/**
 * Визуальная идентичность курса
 */
export interface VisualIdentity {
  /** Основной цвет (hex) */
  primaryColor: string
  
  /** CSS градиент */
  gradient: string
  
  /** Пара шрифтов [основной, моноширинный] */
  fontPairing: [string, string]
  
  /** Семейство иконок */
  iconFamily: string
  
  /** Цветовая схема */
  colorScheme: ColorScheme
  
  /** Визуальная тема */
  visualTheme: VisualTheme
}

// ═══════════════════════════════════════════════════════════════
// 📊 MODULE VISUAL SPEC TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Тип основного визуального элемента модуля
 */
export type PrimaryVisualType = 
  | 'diagram' 
  | 'infographic' 
  | 'timeline' 
  | 'comparison_table' 
  | 'flowchart'

/**
 * Основной визуальный элемент модуля
 */
export interface PrimaryVisual {
  /** Тип визуала */
  type: PrimaryVisualType
  
  /** Описание для генерации */
  description: string
  
  /** Mermaid код (для diagram/flowchart) */
  mermaidCode?: string
}

/**
 * Тип вторичного визуального элемента
 */
export type SecondaryVisualType = 'icon_set' | 'badge' | 'illustration'

/**
 * Вторичный визуальный элемент
 */
export interface SecondaryVisual {
  /** Тип визуала */
  type: SecondaryVisualType
  
  /** Иконки/эмодзи */
  icons?: string[]
  
  /** Назначение */
  purpose: string
}

/**
 * Декоративные элементы
 */
export type DecorationElement = 'geometric_shape' | 'gradient_orb' | 'floating_icon'

/**
 * Визуальная спецификация модуля
 */
export interface ModuleVisualSpec {
  /** Промпт для генерации hero изображения */
  heroImagePrompt: string
  
  /** Цветовая схема модуля */
  colorScheme: {
    primary: string
    secondary: string
    accent: string
  }
  
  /** Декоративные элементы */
  decorationElements: DecorationElement[]
  
  /** Основной визуальный элемент */
  primaryVisual: PrimaryVisual
  
  /** Вторичные визуальные элементы */
  secondaryVisuals: SecondaryVisual[]
}

// ═══════════════════════════════════════════════════════════════
// 📝 TEXT BLOCK TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Тип контента секции
 */
export type ContentType = 'theory' | 'example' | 'practice' | 'review'

/**
 * Тип сопровождающего визуала
 */
export type AccompanyingVisualType = 'icon' | 'illustration' | 'photo' | 'diagram'

/**
 * Сопровождающий визуальный элемент для текстового блока
 */
export interface AccompanyingVisual {
  /** Тип визуала */
  type: AccompanyingVisualType
  
  /** Описание/поисковый запрос */
  description: string
  
  /** Имя иконки (для type: icon) */
  iconName?: string
  
  /** Mermaid код (для type: diagram) */
  mermaidCode?: string
  
  /** Конфигурация графика */
  chartConfig?: ChartConfig
}

/**
 * Тип интерактивного элемента в текстовом блоке
 */
export type TextBlockInteractiveType = 'toggle_detail' | 'flip_card' | 'scratch_to_reveal'

/**
 * Интерактивный элемент текстового блока
 */
export interface TextBlockInteractive {
  /** Тип интерактива */
  type: TextBlockInteractiveType
  
  /** Скрытый контент */
  content: string
}

/**
 * Текстовый блок (max 150 слов)
 */
export interface TextBlock {
  /** Текст блока */
  text: string
  
  /** Сопровождающий визуал */
  accompanyingVisual: AccompanyingVisual
  
  /** Интерактивный элемент (опционально) */
  interactiveElement?: TextBlockInteractive
}

// ═══════════════════════════════════════════════════════════════
// 📈 DIAGRAM AND CHART TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Тип диаграммы
 */
export type DiagramType = 'mermaid' | 'chartjs'

/**
 * Mermaid диаграмма
 */
export interface MermaidDiagram {
  /** Тип */
  type: 'mermaid'
  
  /** Mermaid синтаксис */
  code: string
  
  /** Интерактивность */
  interactive: boolean
}

/**
 * Тип графика Chart.js
 */
export type ChartType = 'bar_chart' | 'pie_chart' | 'line_graph' | 'mind_map'

/**
 * Конфигурация Chart.js
 */
export interface ChartConfig {
  /** Тип графика */
  type: ChartType
  
  /** Данные */
  data: {
    labels: string[]
    datasets: Array<{
      label: string
      data: number[]
      backgroundColor?: string[]
    }>
  }
  
  /** Интерактивность */
  interactive: boolean
}

/**
 * Конфигурация диаграммы (union type)
 */
export type DiagramConfig = MermaidDiagram | ChartConfig

// ═══════════════════════════════════════════════════════════════
// 🎮 INTERACTIVE COMPONENT TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Тип интерактивного компонента
 */
export type InteractiveComponentType = 
  | 'drag_and_drop' 
  | 'code_sandbox' 
  | 'quiz_with_feedback' 
  | 'simulation' 
  | 'progress_checklist'

/**
 * Сложность drag-and-drop
 */
export type DragDropDifficulty = 'matching' | 'ordering' | 'fill_blank'

/**
 * Визуальная награда
 */
export type RewardVisual = 'confetti' | 'badge' | 'progress_bar'

/**
 * Конфигурация интерактивного компонента
 */
export interface InteractiveComponentConfig {
  /** Тип компонента */
  type: InteractiveComponentType
  
  /** Сложность (для drag_and_drop) */
  difficulty?: DragDropDifficulty
  
  /** Визуальная награда */
  rewardVisual: RewardVisual
  
  /** Количество доступных подсказок (0-3) */
  hintsAvailable: number
  
  /** Данные компонента */
  data: Record<string, unknown>
}

// ═══════════════════════════════════════════════════════════════
// 🎬 MULTIMEDIA TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Промпт для генерации изображения
 */
export interface ImageGenerationPrompt {
  /** Стиль изображения */
  style: string
  
  /** Объект изображения */
  subject: string
  
  /** Действие/контекст */
  action: string
  
  /** Уровень детализации */
  detailLevel: string
}

/**
 * Платформа для встраивания
 */
export type EmbedPlatform = 'youtube' | 'codepen' | 'observable'

/**
 * Соотношение сторон
 */
export type AspectRatio = '16:9' | '1:1' | '4:3'

/**
 * Источник видео
 */
export interface VideoSource {
  /** Платформа */
  platform: EmbedPlatform
  
  /** Поисковый запрос */
  searchQuery: string
  
  /** Предпочтительная длительность */
  durationPreference: string
  
  /** Наличие субтитров */
  hasCaptions: boolean
  
  /** Соотношение сторон */
  aspectRatio: AspectRatio
}

/**
 * Мультимедиа спецификация
 */
export interface MultimediaSpec {
  /** Промпты для генерации изображений */
  imagePrompts: ImageGenerationPrompt[]
  
  /** Источники видео */
  videoSources: VideoSource[]
  
  /** Диаграммы */
  diagrams: DiagramConfig[]
  
  /** Встраиваемые элементы */
  embeds: VideoSource[]
}

// ═══════════════════════════════════════════════════════════════
// 🏆 GAMIFICATION TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Checkpoint (контрольная точка)
 */
export interface Checkpoint {
  /** Название */
  title: string
  
  /** Эмодзи */
  emoji: string
  
  /** Текст награды */
  rewardText: string
}

/**
 * Тип визуализации прогресса
 */
export type ProgressVisualizationType = 'progress_bar' | 'pie_chart' | 'experience_points'

/**
 * Визуализация прогресса
 */
export interface ProgressVisualization {
  /** Тип визуализации */
  type: ProgressVisualizationType
  
  /** Максимальное значение */
  maxValue: number
  
  /** Текущее значение */
  currentValue: number
}

/**
 * Badge уровня
 */
export interface LevelBadge {
  /** Номер уровня */
  level: number
  
  /** Эмодзи */
  emoji: string
  
  /** Название */
  title: string
}

/**
 * Спецификация геймификации
 */
export interface GamificationSpec {
  /** Контрольные точки */
  checkpoints: Checkpoint[]
  
  /** Визуализация прогресса */
  progressVisualization: ProgressVisualization
  
  /** Badges уровней */
  levelBadges: LevelBadge[]
}

// ═══════════════════════════════════════════════════════════════
// 📦 EXTENDED VISUAL COURSE TYPES
// ═══════════════════════════════════════════════════════════════

/**
 * Визуальные метаданные курса
 */
export interface VisualCourseMetadata {
  /** Визуальная идентичность */
  visualIdentity: VisualIdentity
  
  /** Уровень интерактивности */
  interactivityLevel: InteractivityLevel
}

/**
 * Визуальная секция модуля
 */
export interface VisualSection {
  /** Тип контента */
  contentType: ContentType
  
  /** Текстовые блоки */
  textBlocks: TextBlock[]
  
  /** Мультимедиа */
  multimedia: MultimediaSpec
  
  /** Геймификация */
  gamification: GamificationSpec
  
  /** Интерактивный компонент (опционально) */
  interactiveComponent?: InteractiveComponentConfig
}

/**
 * Визуальный модуль (расширение CourseModule)
 */
export interface VisualModule extends CourseModule {
  /** Визуальная спецификация */
  visualSpec: ModuleVisualSpec
  
  /** Секции модуля */
  sections: VisualSection[]
}

/**
 * Визуальная структура курса (расширение CourseStructure)
 */
export interface VisualCourseStructure extends Omit<CourseStructure, 'modules' | 'metadata'> {
  /** Метаданные с визуальной информацией */
  metadata: CourseStructure['metadata'] & VisualCourseMetadata
  
  /** Визуальные модули */
  modules: VisualModule[]
}

/**
 * Сгенерированный визуальный контент модуля
 */
export interface GeneratedVisualModuleContent extends GeneratedModuleContent {
  /** Визуальная спецификация */
  visualSpec: ModuleVisualSpec
  
  /** Секции с визуальным контентом */
  sections: VisualSection[]
}

