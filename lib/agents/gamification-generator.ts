/**
 * 🏆 GAMIFICATION GENERATOR
 * 
 * Генерирует элементы геймификации для курсов:
 * - Checkpoints (контрольные точки)
 * - Progress visualization
 * - Level badges
 */

import type {
  CourseModule,
  GamificationSpec,
  Checkpoint,
  ProgressVisualization,
  ProgressVisualizationType,
  LevelBadge
} from './types'

// ═══════════════════════════════════════════════════════════════
// 🎯 CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Эмодзи для checkpoints по типу контента
 */
const CONTENT_TYPE_EMOJIS: Record<string, string> = {
  theory: '📚',
  hands_on: '🛠️',
  problem_solving: '🧩',
  project: '🚀',
  review: '✅'
}

/**
 * Эмодзи для уровней
 */
const LEVEL_EMOJIS: string[] = ['🌱', '🌿', '🌳', '🏆', '👑', '⭐', '💎', '🔥', '🎯', '🏅']

/**
 * Названия уровней
 */
const LEVEL_TITLES: string[] = [
  'Новичок',
  'Ученик',
  'Практик',
  'Знаток',
  'Эксперт',
  'Мастер',
  'Гуру',
  'Легенда',
  'Чемпион',
  'Виртуоз'
]

/**
 * Тексты наград по типу контента
 */
const REWARD_TEXTS: Record<string, string> = {
  theory: 'Вы освоили теоретический материал!',
  hands_on: 'Отличная практическая работа!',
  problem_solving: 'Задача решена! Превосходно!',
  project: 'Проект завершён! Вы молодец!',
  review: 'Материал закреплён! Так держать!'
}

/**
 * Типы визуализации прогресса по количеству модулей
 */
const MODULES_TO_PROGRESS_TYPE: Record<number, ProgressVisualizationType> = {
  1: 'progress_bar',
  2: 'progress_bar',
  3: 'progress_bar',
  4: 'pie_chart',
  5: 'pie_chart'
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Генерирует checkpoint для модуля
 */
function createCheckpoint(module: CourseModule, index: number): Checkpoint {
  const emoji = CONTENT_TYPE_EMOJIS[module.contentType] || '✨'
  const rewardText = REWARD_TEXTS[module.contentType] || 'Отличная работа!'
  
  return {
    title: `Модуль ${index + 1}: ${module.name}`,
    emoji,
    rewardText
  }
}

/**
 * Генерирует badge для уровня
 */
function createLevelBadge(level: number): LevelBadge {
  const safeIndex = Math.min(level - 1, LEVEL_EMOJIS.length - 1)
  
  return {
    level,
    emoji: LEVEL_EMOJIS[safeIndex],
    title: LEVEL_TITLES[safeIndex] || `Уровень ${level}`
  }
}

/**
 * Определяет тип визуализации прогресса
 */
function determineProgressType(moduleCount: number): ProgressVisualizationType {
  if (moduleCount <= 3) {
    return 'progress_bar'
  } else if (moduleCount <= 6) {
    return 'pie_chart'
  } else {
    return 'experience_points'
  }
}

/**
 * Рассчитывает количество уровней на основе модулей
 */
function calculateLevelCount(moduleCount: number): number {
  // Минимум 2 уровня, максимум 10
  return Math.min(Math.max(Math.ceil(moduleCount / 2), 2), 10)
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Генерирует checkpoints для модулей
 */
export function generateCheckpoints(modules: CourseModule[]): Checkpoint[] {
  return modules.map((module, index) => createCheckpoint(module, index))
}

/**
 * Генерирует визуализацию прогресса
 */
export function generateProgressVisualization(
  totalModules: number,
  completedModules: number = 0
): ProgressVisualization {
  const type = determineProgressType(totalModules)
  const maxValue = totalModules * 100 // 100 очков за модуль
  const currentValue = Math.min(completedModules * 100, maxValue)
  
  return {
    type,
    maxValue,
    currentValue
  }
}

/**
 * Генерирует badges уровней
 */
export function generateLevelBadges(moduleCount: number): LevelBadge[] {
  const levelCount = calculateLevelCount(moduleCount)
  const badges: LevelBadge[] = []
  
  for (let i = 1; i <= levelCount; i++) {
    badges.push(createLevelBadge(i))
  }
  
  return badges
}

/**
 * Назначает уровни модулям
 */
export function assignLevelsToModules(
  modules: CourseModule[]
): Map<string, number> {
  const levelCount = calculateLevelCount(modules.length)
  const modulesPerLevel = Math.ceil(modules.length / levelCount)
  const levelMap = new Map<string, number>()
  
  modules.forEach((module, index) => {
    const level = Math.min(Math.floor(index / modulesPerLevel) + 1, levelCount)
    levelMap.set(module.id, level)
  })
  
  return levelMap
}

/**
 * Генерирует полную спецификацию геймификации
 */
export function generateGamificationSpec(
  modules: CourseModule[],
  completedModules: number = 0
): GamificationSpec {
  return {
    checkpoints: generateCheckpoints(modules),
    progressVisualization: generateProgressVisualization(modules.length, completedModules),
    levelBadges: generateLevelBadges(modules.length)
  }
}

/**
 * Валидирует GamificationSpec
 */
export function validateGamificationSpec(spec: GamificationSpec): boolean {
  // Проверяем checkpoints
  if (!Array.isArray(spec.checkpoints)) {
    return false
  }
  for (const checkpoint of spec.checkpoints) {
    if (typeof checkpoint.title !== 'string' || checkpoint.title.length === 0) {
      return false
    }
    if (typeof checkpoint.emoji !== 'string' || checkpoint.emoji.length === 0) {
      return false
    }
    if (typeof checkpoint.rewardText !== 'string' || checkpoint.rewardText.length === 0) {
      return false
    }
  }
  
  // Проверяем progressVisualization
  const validProgressTypes: ProgressVisualizationType[] = [
    'progress_bar',
    'pie_chart',
    'experience_points'
  ]
  if (!validProgressTypes.includes(spec.progressVisualization.type)) {
    return false
  }
  if (typeof spec.progressVisualization.maxValue !== 'number' || 
      spec.progressVisualization.maxValue <= 0) {
    return false
  }
  if (typeof spec.progressVisualization.currentValue !== 'number' ||
      spec.progressVisualization.currentValue < 0) {
    return false
  }
  if (spec.progressVisualization.currentValue > spec.progressVisualization.maxValue) {
    return false
  }
  
  // Проверяем levelBadges
  if (!Array.isArray(spec.levelBadges)) {
    return false
  }
  for (const badge of spec.levelBadges) {
    if (typeof badge.level !== 'number' || badge.level <= 0 || !Number.isInteger(badge.level)) {
      return false
    }
    if (typeof badge.emoji !== 'string' || badge.emoji.length === 0) {
      return false
    }
    if (typeof badge.title !== 'string' || badge.title.length === 0) {
      return false
    }
  }
  
  return true
}

/**
 * Рассчитывает текущий уровень пользователя
 */
export function calculateCurrentLevel(
  completedModules: number,
  totalModules: number
): number {
  if (completedModules === 0) return 1
  
  const levelCount = calculateLevelCount(totalModules)
  const progress = completedModules / totalModules
  const level = Math.ceil(progress * levelCount)
  
  return Math.min(Math.max(level, 1), levelCount)
}

/**
 * Проверяет, достигнут ли checkpoint
 */
export function isCheckpointReached(
  moduleIndex: number,
  completedModules: number
): boolean {
  return completedModules > moduleIndex
}

/**
 * Генерирует текст поздравления при достижении уровня
 */
export function generateLevelUpMessage(level: number): string {
  const badge = createLevelBadge(level)
  return `🎉 Поздравляем! Вы достигли уровня "${badge.title}" ${badge.emoji}!`
}
