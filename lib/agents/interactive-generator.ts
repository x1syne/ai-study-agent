/**
 * 🎮 INTERACTIVE COMPONENT GENERATOR
 * 
 * Генерирует интерактивные компоненты для модулей курса:
 * - drag_and_drop
 * - quiz_with_feedback
 * - code_sandbox
 * - simulation
 * - progress_checklist
 */

import type {
  CourseModule,
  TopicType,
  InteractiveComponentConfig,
  InteractiveComponentType,
  DragDropDifficulty,
  RewardVisual
} from './types'

// ═══════════════════════════════════════════════════════════════
// 🎯 CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Маппинг типа контента модуля на тип интерактива
 */
const CONTENT_TO_INTERACTIVE: Record<string, InteractiveComponentType> = {
  theory: 'quiz_with_feedback',
  hands_on: 'code_sandbox',
  problem_solving: 'drag_and_drop',
  project: 'progress_checklist',
  review: 'quiz_with_feedback'
}

/**
 * Маппинг типа темы на предпочтительный интерактив
 */
const TOPIC_TO_INTERACTIVE: Record<TopicType, InteractiveComponentType> = {
  programming: 'code_sandbox',
  scientific: 'simulation',
  creative: 'drag_and_drop',
  practical: 'progress_checklist',
  business: 'quiz_with_feedback',
  humanities: 'quiz_with_feedback',
  technical: 'simulation'
}

/**
 * Сложность drag-and-drop по уровню модуля
 */
const DIFFICULTY_TO_DRAGDROP: Record<string, DragDropDifficulty> = {
  beginner: 'matching',
  intermediate: 'ordering',
  advanced: 'fill_blank',
  expert: 'fill_blank'
}

/**
 * Награды по типу интерактива
 */
const INTERACTIVE_TO_REWARD: Record<InteractiveComponentType, RewardVisual> = {
  drag_and_drop: 'confetti',
  code_sandbox: 'badge',
  quiz_with_feedback: 'progress_bar',
  simulation: 'badge',
  progress_checklist: 'progress_bar'
}

/**
 * Количество подсказок по сложности
 */
const DIFFICULTY_TO_HINTS: Record<string, number> = {
  beginner: 3,
  intermediate: 2,
  advanced: 1,
  expert: 0
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Определяет тип интерактивного компонента
 */
function determineInteractiveType(
  module: CourseModule,
  topicType: TopicType
): InteractiveComponentType {
  // Сначала проверяем тип контента модуля
  const contentBased = CONTENT_TO_INTERACTIVE[module.contentType]
  if (contentBased) {
    return contentBased
  }
  
  // Fallback на основе типа темы
  return TOPIC_TO_INTERACTIVE[topicType]
}

/**
 * Определяет сложность drag-and-drop
 */
function determineDragDropDifficulty(module: CourseModule): DragDropDifficulty {
  return DIFFICULTY_TO_DRAGDROP[module.difficulty] || 'matching'
}

/**
 * Определяет количество подсказок
 */
function determineHintsCount(module: CourseModule): number {
  const hints = DIFFICULTY_TO_HINTS[module.difficulty]
  return hints !== undefined ? hints : 2
}

/**
 * Генерирует данные для drag_and_drop
 */
function generateDragAndDropData(
  module: CourseModule,
  difficulty: DragDropDifficulty
): Record<string, unknown> {
  const keyTerms = module.keyTerms.slice(0, 5)
  
  switch (difficulty) {
    case 'matching':
      return {
        pairs: keyTerms.map((term, i) => ({
          id: `pair-${i}`,
          left: term,
          right: `Определение ${term}`
        })),
        instruction: 'Сопоставьте термины с их определениями'
      }
    
    case 'ordering':
      return {
        items: keyTerms.map((term, i) => ({
          id: `item-${i}`,
          content: term,
          correctPosition: i
        })),
        instruction: 'Расположите элементы в правильном порядке'
      }
    
    case 'fill_blank':
      return {
        sentence: `В модуле "${module.name}" ключевыми понятиями являются: ___, ___, ___.`,
        blanks: keyTerms.slice(0, 3).map((term, i) => ({
          id: `blank-${i}`,
          answer: term,
          position: i
        })),
        options: [...keyTerms, 'Неверный вариант 1', 'Неверный вариант 2'],
        instruction: 'Заполните пропуски, перетащив правильные варианты'
      }
    
    default:
      return { items: keyTerms }
  }
}

/**
 * Генерирует данные для quiz_with_feedback
 */
function generateQuizData(module: CourseModule): Record<string, unknown> {
  const keyTerms = module.keyTerms.slice(0, 4)
  
  return {
    questions: [
      {
        id: 'q1',
        question: `Что является ключевым понятием в "${module.name}"?`,
        options: [
          keyTerms[0] || 'Вариант A',
          'Неверный вариант B',
          'Неверный вариант C',
          'Неверный вариант D'
        ],
        correctIndex: 0,
        explanation: `Правильно! ${keyTerms[0]} — это основное понятие данного модуля.`,
        points: 10
      },
      {
        id: 'q2',
        question: `Какое утверждение верно для "${module.name}"?`,
        options: [
          'Неверное утверждение 1',
          `${module.description.split('.')[0]}.`,
          'Неверное утверждение 2',
          'Неверное утверждение 3'
        ],
        correctIndex: 1,
        explanation: 'Это утверждение соответствует описанию модуля.',
        points: 10
      }
    ],
    passingScore: 15,
    showExplanations: true,
    allowRetry: true
  }
}

/**
 * Генерирует данные для code_sandbox
 */
function generateCodeSandboxData(module: CourseModule): Record<string, unknown> {
  return {
    language: 'python',
    starterCode: `# ${module.name}\n# Напишите ваш код здесь\n\ndef solution():\n    pass\n`,
    testCases: [
      {
        input: '',
        expectedOutput: 'Expected output',
        description: 'Базовый тест'
      }
    ],
    hints: module.keyTerms.slice(0, 3).map(term => `Используйте концепцию: ${term}`),
    timeLimit: 300 // 5 минут
  }
}

/**
 * Генерирует данные для simulation
 */
function generateSimulationData(module: CourseModule): Record<string, unknown> {
  return {
    type: 'step_by_step',
    steps: module.keyTerms.slice(0, 5).map((term, i) => ({
      id: `step-${i}`,
      title: `Шаг ${i + 1}: ${term}`,
      description: `Изучите концепцию "${term}"`,
      action: 'click_to_proceed',
      completed: false
    })),
    visualFeedback: true,
    autoProgress: false
  }
}

/**
 * Генерирует данные для progress_checklist
 */
function generateChecklistData(module: CourseModule): Record<string, unknown> {
  return {
    title: `Чеклист: ${module.name}`,
    items: [
      { id: 'item-1', text: 'Прочитать теоретический материал', checked: false },
      { id: 'item-2', text: 'Изучить ключевые термины', checked: false },
      ...module.keyTerms.slice(0, 3).map((term, i) => ({
        id: `term-${i}`,
        text: `Понять концепцию: ${term}`,
        checked: false
      })),
      { id: 'item-last', text: 'Выполнить практическое задание', checked: false }
    ],
    showProgress: true,
    celebrateCompletion: true
  }
}

/**
 * Генерирует данные компонента по типу
 */
function generateComponentData(
  type: InteractiveComponentType,
  module: CourseModule,
  difficulty?: DragDropDifficulty
): Record<string, unknown> {
  switch (type) {
    case 'drag_and_drop':
      return generateDragAndDropData(module, difficulty || 'matching')
    case 'quiz_with_feedback':
      return generateQuizData(module)
    case 'code_sandbox':
      return generateCodeSandboxData(module)
    case 'simulation':
      return generateSimulationData(module)
    case 'progress_checklist':
      return generateChecklistData(module)
    default:
      return {}
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Генерирует интерактивный компонент для модуля
 */
export function generateInteractiveComponent(
  module: CourseModule,
  topicType: TopicType
): InteractiveComponentConfig {
  const type = determineInteractiveType(module, topicType)
  const difficulty = type === 'drag_and_drop' 
    ? determineDragDropDifficulty(module) 
    : undefined
  const rewardVisual = INTERACTIVE_TO_REWARD[type]
  const hintsAvailable = determineHintsCount(module)
  const data = generateComponentData(type, module, difficulty)
  
  return {
    type,
    difficulty,
    rewardVisual,
    hintsAvailable,
    data
  }
}

/**
 * Генерирует интерактивные компоненты для всех модулей
 */
export function generateAllInteractiveComponents(
  modules: CourseModule[],
  topicType: TopicType
): InteractiveComponentConfig[] {
  return modules.map(module => generateInteractiveComponent(module, topicType))
}

/**
 * Валидирует InteractiveComponentConfig
 */
export function validateInteractiveComponent(
  config: InteractiveComponentConfig
): boolean {
  const validTypes: InteractiveComponentType[] = [
    'drag_and_drop',
    'code_sandbox',
    'quiz_with_feedback',
    'simulation',
    'progress_checklist'
  ]
  
  const validDifficulties: DragDropDifficulty[] = ['matching', 'ordering', 'fill_blank']
  const validRewards: RewardVisual[] = ['confetti', 'badge', 'progress_bar']
  
  // Проверяем тип
  if (!validTypes.includes(config.type)) {
    return false
  }
  
  // Проверяем difficulty для drag_and_drop
  if (config.type === 'drag_and_drop') {
    if (!config.difficulty || !validDifficulties.includes(config.difficulty)) {
      return false
    }
  }
  
  // Проверяем rewardVisual
  if (!validRewards.includes(config.rewardVisual)) {
    return false
  }
  
  // Проверяем hintsAvailable (0-3)
  if (config.hintsAvailable < 0 || config.hintsAvailable > 3) {
    return false
  }
  
  // Проверяем наличие data
  if (!config.data || typeof config.data !== 'object') {
    return false
  }
  
  return true
}
