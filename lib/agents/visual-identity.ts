/**
 * 🎨 VISUAL IDENTITY GENERATOR
 * 
 * Генерирует визуальную идентичность курса на основе:
 * - TopicType → ColorScheme
 * - DifficultyLevel → VisualTheme
 */

import type {
  TopicType,
  DifficultyLevel,
  ColorScheme,
  VisualTheme,
  VisualIdentity
} from './types'

// ═══════════════════════════════════════════════════════════════
// 🎯 MAPPINGS
// ═══════════════════════════════════════════════════════════════

/**
 * Маппинг TopicType → ColorScheme
 */
export const TOPIC_TO_COLOR_SCHEME: Record<TopicType, ColorScheme> = {
  programming: 'blue-gradient',
  technical: 'blue-gradient',
  scientific: 'green-gradient',
  creative: 'purple-gradient',
  humanities: 'purple-gradient',
  business: 'orange-gradient',
  practical: 'orange-gradient'
}

/**
 * Маппинг DifficultyLevel → VisualTheme
 */
export const DIFFICULTY_TO_VISUAL_THEME: Record<DifficultyLevel, VisualTheme> = {
  beginner: 'minimalist-illustrations',
  intermediate: 'data-driven-infographics',
  advanced: 'animated-diagrams',
  expert: 'animated-diagrams'
}

/**
 * Цветовые палитры для каждой схемы
 */
export const COLOR_PALETTES: Record<ColorScheme, { primary: string; gradient: string }> = {
  'blue-gradient': {
    primary: '#4F46E5',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  },
  'green-gradient': {
    primary: '#10B981',
    gradient: 'linear-gradient(135deg, #34d399 0%, #059669 100%)'
  },
  'purple-gradient': {
    primary: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)'
  },
  'orange-gradient': {
    primary: '#F59E0B',
    gradient: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)'
  }
}

/**
 * Стандартные шрифты
 */
export const DEFAULT_FONT_PAIRING: [string, string] = ['Inter', 'JetBrains Mono']

/**
 * Стандартное семейство иконок
 */
export const DEFAULT_ICON_FAMILY = 'Lucide'

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Генерирует визуальную идентичность курса
 * 
 * @param topicType - Тип темы курса
 * @param difficulty - Уровень сложности
 * @returns VisualIdentity с цветами, градиентами, шрифтами
 * 
 * @example
 * const identity = generateVisualIdentity('programming', 'beginner')
 * // Returns: { primaryColor: '#4F46E5', colorScheme: 'blue-gradient', ... }
 */
export function generateVisualIdentity(
  topicType: TopicType,
  difficulty: DifficultyLevel
): VisualIdentity {
  const colorScheme = TOPIC_TO_COLOR_SCHEME[topicType]
  const visualTheme = DIFFICULTY_TO_VISUAL_THEME[difficulty]
  const palette = COLOR_PALETTES[colorScheme]
  
  return {
    primaryColor: palette.primary,
    gradient: palette.gradient,
    fontPairing: DEFAULT_FONT_PAIRING,
    iconFamily: DEFAULT_ICON_FAMILY,
    colorScheme,
    visualTheme
  }
}

/**
 * Проверяет валидность hex цвета
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

/**
 * Проверяет валидность CSS градиента
 */
export function isValidGradient(gradient: string): boolean {
  return gradient.startsWith('linear-gradient(') && gradient.endsWith(')')
}

/**
 * Валидирует VisualIdentity
 */
export function validateVisualIdentity(identity: VisualIdentity): boolean {
  return (
    isValidHexColor(identity.primaryColor) &&
    isValidGradient(identity.gradient) &&
    identity.fontPairing.length === 2 &&
    identity.fontPairing.every(f => f.length > 0) &&
    identity.iconFamily.length > 0 &&
    Object.values(TOPIC_TO_COLOR_SCHEME).includes(identity.colorScheme as ColorScheme) &&
    Object.values(DIFFICULTY_TO_VISUAL_THEME).includes(identity.visualTheme as VisualTheme)
  )
}
