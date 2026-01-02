/**
 * 📊 MODULE VISUAL SPEC GENERATOR
 * 
 * Генерирует визуальную спецификацию для модуля курса:
 * - Hero image prompt
 * - Color scheme
 * - Primary/secondary visuals
 * - Decoration elements
 */

import { callLLMJson } from '../llm'
import type {
  CourseModule,
  TopicType,
  VisualIdentity,
  ModuleVisualSpec,
  PrimaryVisual,
  PrimaryVisualType,
  SecondaryVisual,
  DecorationElement
} from './types'

// ═══════════════════════════════════════════════════════════════
// 🎯 CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Маппинг типа контента модуля на тип визуала
 */
const CONTENT_TO_VISUAL_TYPE: Record<string, PrimaryVisualType> = {
  theory: 'infographic',
  hands_on: 'diagram',
  problem_solving: 'flowchart',
  project: 'timeline',
  review: 'comparison_table'
}

/**
 * Эмодзи для разных типов тем
 */
const TOPIC_EMOJIS: Record<TopicType, string[]> = {
  programming: ['💻', '🔧', '⚙️', '🚀', '📦'],
  scientific: ['🔬', '🧪', '📊', '🔭', '⚛️'],
  creative: ['🎨', '✨', '🖌️', '💡', '🎭'],
  practical: ['🛠️', '📋', '✅', '🎯', '⏱️'],
  business: ['📈', '💼', '🎯', '💰', '📊'],
  humanities: ['📚', '🏛️', '💭', '🌍', '✍️'],
  technical: ['⚡', '🔩', '📐', '🔌', '🛡️']
}

/**
 * Декоративные элементы по визуальной теме
 */
const THEME_DECORATIONS: Record<string, DecorationElement[]> = {
  'minimalist-illustrations': ['geometric_shape', 'floating_icon'],
  'data-driven-infographics': ['gradient_orb', 'geometric_shape'],
  'animated-diagrams': ['gradient_orb', 'floating_icon', 'geometric_shape']
}

// ═══════════════════════════════════════════════════════════════
// 🎨 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Генерирует промпт для hero изображения
 */
function generateHeroImagePrompt(
  module: CourseModule,
  topicType: TopicType
): string {
  const styleMap: Record<TopicType, string> = {
    programming: 'modern tech illustration, flat design, code elements',
    scientific: 'scientific diagram, clean lines, educational style',
    creative: 'artistic illustration, vibrant colors, creative elements',
    practical: 'step-by-step visual guide, clear icons, instructional',
    business: 'professional infographic, charts, corporate style',
    humanities: 'historical illustration, classic style, scholarly',
    technical: 'engineering diagram, technical drawing, precise'
  }
  
  return `educational illustration flat design, ${styleMap[topicType]}, ${module.name}, ${module.description}, minimalist, modern, high quality`
}

/**
 * Определяет тип основного визуала
 */
function determinePrimaryVisualType(
  module: CourseModule,
  topicType: TopicType
): PrimaryVisualType {
  // Сначала проверяем тип контента модуля
  const contentBasedType = CONTENT_TO_VISUAL_TYPE[module.contentType]
  if (contentBasedType) {
    return contentBasedType
  }
  
  // Fallback на основе типа темы
  const topicBasedTypes: Record<TopicType, PrimaryVisualType> = {
    programming: 'flowchart',
    scientific: 'diagram',
    creative: 'infographic',
    practical: 'timeline',
    business: 'comparison_table',
    humanities: 'timeline',
    technical: 'diagram'
  }
  
  return topicBasedTypes[topicType]
}

/**
 * Генерирует описание для primary visual
 */
function generatePrimaryVisualDescription(
  module: CourseModule,
  visualType: PrimaryVisualType
): string {
  const descriptions: Record<PrimaryVisualType, string> = {
    diagram: `Схема архитектуры/структуры для "${module.name}", показывающая ключевые компоненты и их связи`,
    infographic: `Инфографика с ключевыми фактами и статистикой по теме "${module.name}"`,
    timeline: `Временная шкала развития/этапов для "${module.name}"`,
    comparison_table: `Сравнительная таблица вариантов/подходов в "${module.name}"`,
    flowchart: `Блок-схема процесса/алгоритма для "${module.name}"`
  }
  
  return descriptions[visualType]
}

/**
 * Генерирует Mermaid код для flowchart/diagram
 */
function generateMermaidCode(
  _module: CourseModule,
  visualType: PrimaryVisualType
): string | undefined {
  if (visualType !== 'flowchart' && visualType !== 'diagram') {
    return undefined
  }
  
  // Базовый шаблон Mermaid
  if (visualType === 'flowchart') {
    return `graph TD
    A[Начало] --> B[Шаг 1]
    B --> C[Шаг 2]
    C --> D[Шаг 3]
    D --> E[Результат]`
  }
  
  return `graph LR
    A[Концепция 1] --> B[Концепция 2]
    B --> C[Концепция 3]
    A --> C`
}

/**
 * Генерирует secondary visuals
 */
function generateSecondaryVisuals(
  module: CourseModule,
  topicType: TopicType
): SecondaryVisual[] {
  const emojis = TOPIC_EMOJIS[topicType]
  
  return [
    {
      type: 'icon_set',
      icons: emojis.slice(0, 3),
      purpose: 'Визуальные якоря для ключевых концепций модуля'
    },
    {
      type: 'badge',
      icons: ['🎯'],
      purpose: 'Индикатор цели модуля'
    }
  ]
}

/**
 * Генерирует цветовую схему модуля на основе visual identity
 */
function generateModuleColorScheme(
  visualIdentity: VisualIdentity,
  _moduleIndex: number
): ModuleVisualSpec['colorScheme'] {
  // moduleIndex может использоваться для вариации оттенков в будущем
  return {
    primary: visualIdentity.primaryColor,
    secondary: adjustColorBrightness(visualIdentity.primaryColor, 20),
    accent: adjustColorBrightness(visualIdentity.primaryColor, -20)
  }
}

/**
 * Корректирует яркость hex цвета
 */
function adjustColorBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, Math.max(0, (num >> 16) + amt))
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt))
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt))
  
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1).toUpperCase()}`
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Генерирует визуальную спецификацию для модуля
 * 
 * @param module - Модуль курса
 * @param visualIdentity - Визуальная идентичность курса
 * @param topicType - Тип темы
 * @param moduleIndex - Индекс модуля (для вариации цветов)
 * @returns ModuleVisualSpec
 */
export function generateModuleVisualSpec(
  module: CourseModule,
  visualIdentity: VisualIdentity,
  topicType: TopicType,
  moduleIndex: number = 0
): ModuleVisualSpec {
  const primaryVisualType = determinePrimaryVisualType(module, topicType)
  
  const primaryVisual: PrimaryVisual = {
    type: primaryVisualType,
    description: generatePrimaryVisualDescription(module, primaryVisualType),
    mermaidCode: generateMermaidCode(module, primaryVisualType)
  }
  
  const decorations = THEME_DECORATIONS[visualIdentity.visualTheme] || ['geometric_shape']
  
  return {
    heroImagePrompt: generateHeroImagePrompt(module, topicType),
    colorScheme: generateModuleColorScheme(visualIdentity, moduleIndex),
    decorationElements: decorations,
    primaryVisual,
    secondaryVisuals: generateSecondaryVisuals(module, topicType)
  }
}

/**
 * Генерирует визуальные спецификации для всех модулей курса
 */
export function generateAllModuleVisualSpecs(
  modules: CourseModule[],
  visualIdentity: VisualIdentity,
  topicType: TopicType
): ModuleVisualSpec[] {
  return modules.map((module, index) => 
    generateModuleVisualSpec(module, visualIdentity, topicType, index)
  )
}

/**
 * Валидирует ModuleVisualSpec
 */
export function validateModuleVisualSpec(spec: ModuleVisualSpec): boolean {
  const validPrimaryTypes: PrimaryVisualType[] = [
    'diagram', 'infographic', 'timeline', 'comparison_table', 'flowchart'
  ]
  
  return (
    spec.heroImagePrompt.length > 0 &&
    /^#[0-9A-Fa-f]{6}$/.test(spec.colorScheme.primary) &&
    /^#[0-9A-Fa-f]{6}$/.test(spec.colorScheme.secondary) &&
    /^#[0-9A-Fa-f]{6}$/.test(spec.colorScheme.accent) &&
    validPrimaryTypes.includes(spec.primaryVisual.type) &&
    spec.primaryVisual.description.length > 0 &&
    Array.isArray(spec.secondaryVisuals)
  )
}

/**
 * Генерирует visual spec с помощью LLM (для более сложных случаев)
 */
export async function generateModuleVisualSpecWithLLM(
  module: CourseModule,
  visualIdentity: VisualIdentity,
  topicType: TopicType
): Promise<ModuleVisualSpec> {
  const systemPrompt = `Ты — дизайнер образовательных материалов. 
Создай визуальную спецификацию для модуля курса.
Верни ТОЛЬКО валидный JSON.`

  const userPrompt = `Модуль: ${module.name}
Описание: ${module.description}
Тип темы: ${topicType}
Визуальная тема: ${visualIdentity.visualTheme}
Ключевые термины: ${module.keyTerms.join(', ')}

Создай JSON:
{
  "heroImagePrompt": "промпт для генерации изображения в стиле educational illustration flat design",
  "colorScheme": {
    "primary": "#HEX",
    "secondary": "#HEX", 
    "accent": "#HEX"
  },
  "decorationElements": ["geometric_shape", "gradient_orb", "floating_icon"],
  "primaryVisual": {
    "type": "diagram|infographic|timeline|comparison_table|flowchart",
    "description": "описание визуала"
  },
  "secondaryVisuals": [
    {
      "type": "icon_set",
      "icons": ["emoji1", "emoji2"],
      "purpose": "назначение"
    }
  ]
}`

  try {
    const { data } = await callLLMJson<ModuleVisualSpec>(
      systemPrompt,
      userPrompt,
      { temperature: 0.5, maxTokens: 1000 }
    )
    
    // Валидация и fallback
    if (validateModuleVisualSpec(data)) {
      return data
    }
    
    // Если LLM вернул невалидные данные, используем детерминированную генерацию
    return generateModuleVisualSpec(module, visualIdentity, topicType)
  } catch (error) {
    console.error('[VisualSpec] LLM generation failed:', error)
    return generateModuleVisualSpec(module, visualIdentity, topicType)
  }
}
