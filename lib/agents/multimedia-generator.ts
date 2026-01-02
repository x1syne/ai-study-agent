/**
 * 🎬 MULTIMEDIA SPEC GENERATOR
 * 
 * Генерирует мультимедиа спецификации для модулей курса:
 * - Image generation prompts
 * - Video sources (YouTube, CodePen, Observable)
 * - Embeds configuration
 */

import type {
  CourseModule,
  TopicType,
  VisualTheme,
  MultimediaSpec,
  ImageGenerationPrompt,
  VideoSource,
  EmbedPlatform,
  AspectRatio,
  DiagramConfig
} from './types'
import { generateMermaidDiagram, generateChartConfig } from './diagram-generator'

// ═══════════════════════════════════════════════════════════════
// 🎯 CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Стили изображений по визуальной теме
 */
const THEME_TO_IMAGE_STYLE: Record<VisualTheme, string> = {
  'minimalist-illustrations': 'educational illustration flat design, minimalist, clean lines',
  'data-driven-infographics': 'infographic style, data visualization, modern design',
  'animated-diagrams': 'technical diagram, detailed illustration, professional'
}

/**
 * Уровни детализации по теме
 */
const TOPIC_TO_DETAIL_LEVEL: Record<TopicType, string> = {
  programming: 'code-focused, technical details, IDE-style',
  scientific: 'scientific accuracy, labeled diagrams, educational',
  creative: 'artistic, vibrant colors, expressive',
  practical: 'step-by-step, clear instructions, hands-on',
  business: 'professional, corporate style, charts and graphs',
  humanities: 'historical accuracy, cultural context, scholarly',
  technical: 'engineering precision, technical specifications, blueprints'
}

/**
 * Предпочтительные платформы по типу темы
 */
const TOPIC_TO_PLATFORM: Record<TopicType, EmbedPlatform> = {
  programming: 'codepen',
  scientific: 'observable',
  creative: 'youtube',
  practical: 'youtube',
  business: 'youtube',
  humanities: 'youtube',
  technical: 'observable'
}

/**
 * Длительность видео по сложности
 */
const DIFFICULTY_TO_DURATION: Record<string, string> = {
  beginner: '2-5 minutes',
  intermediate: '5-10 minutes',
  advanced: '10-15 minutes',
  expert: '15-20 minutes'
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Генерирует промпт для изображения
 */
function createImagePrompt(
  subject: string,
  action: string,
  visualTheme: VisualTheme,
  topicType: TopicType
): ImageGenerationPrompt {
  return {
    style: THEME_TO_IMAGE_STYLE[visualTheme],
    subject,
    action,
    detailLevel: TOPIC_TO_DETAIL_LEVEL[topicType]
  }
}

/**
 * Генерирует поисковый запрос для YouTube
 */
function createYouTubeQuery(module: CourseModule, topicType: TopicType): string {
  const topicKeywords: Record<TopicType, string> = {
    programming: 'tutorial coding',
    scientific: 'explained science',
    creative: 'tutorial creative',
    practical: 'how to guide',
    business: 'explained business',
    humanities: 'documentary history',
    technical: 'engineering explained'
  }
  
  return `${module.name} ${topicKeywords[topicType]} visual explanation`
}

/**
 * Определяет соотношение сторон по платформе
 */
function getAspectRatio(platform: EmbedPlatform): AspectRatio {
  switch (platform) {
    case 'youtube':
      return '16:9'
    case 'codepen':
      return '4:3'
    case 'observable':
      return '16:9'
    default:
      return '16:9'
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Генерирует промпты для изображений модуля
 */
export function generateImagePrompts(
  module: CourseModule,
  visualTheme: VisualTheme,
  topicType: TopicType
): ImageGenerationPrompt[] {
  const prompts: ImageGenerationPrompt[] = []
  
  // Hero image
  prompts.push(createImagePrompt(
    module.name,
    'overview visualization',
    visualTheme,
    topicType
  ))
  
  // Key terms images
  module.keyTerms.slice(0, 3).forEach(term => {
    prompts.push(createImagePrompt(
      term,
      'concept illustration',
      visualTheme,
      topicType
    ))
  })
  
  return prompts
}

/**
 * Генерирует источники видео для модуля
 */
export function generateVideoSources(
  module: CourseModule,
  topicType: TopicType
): VideoSource[] {
  const primaryPlatform = TOPIC_TO_PLATFORM[topicType]
  const duration = DIFFICULTY_TO_DURATION[module.difficulty] || '5-10 minutes'
  
  const sources: VideoSource[] = [
    {
      platform: 'youtube',
      searchQuery: createYouTubeQuery(module, topicType),
      durationPreference: duration,
      hasCaptions: true,
      aspectRatio: '16:9'
    }
  ]
  
  // Добавляем специфичную платформу если она не YouTube
  if (primaryPlatform !== 'youtube') {
    sources.push({
      platform: primaryPlatform,
      searchQuery: `${module.name} interactive demo`,
      durationPreference: duration,
      hasCaptions: false,
      aspectRatio: getAspectRatio(primaryPlatform)
    })
  }
  
  return sources
}

/**
 * Генерирует embeds для модуля
 */
export function generateEmbeds(
  module: CourseModule,
  topicType: TopicType
): VideoSource[] {
  const embeds: VideoSource[] = []
  
  // YouTube embed
  embeds.push({
    platform: 'youtube',
    searchQuery: `${module.name} explained visually`,
    durationPreference: '2-5 minutes',
    hasCaptions: true,
    aspectRatio: '16:9'
  })
  
  // CodePen для programming тем
  if (topicType === 'programming' || topicType === 'technical') {
    embeds.push({
      platform: 'codepen',
      searchQuery: `${module.keyTerms[0] || module.name} example`,
      durationPreference: 'interactive',
      hasCaptions: false,
      aspectRatio: '4:3'
    })
  }
  
  // Observable для научных тем
  if (topicType === 'scientific' || topicType === 'technical') {
    embeds.push({
      platform: 'observable',
      searchQuery: `${module.name} visualization`,
      durationPreference: 'interactive',
      hasCaptions: false,
      aspectRatio: '16:9'
    })
  }
  
  return embeds
}

/**
 * Генерирует диаграммы для модуля
 */
export function generateModuleDiagrams(
  module: CourseModule,
  topicType: TopicType
): DiagramConfig[] {
  const diagrams: DiagramConfig[] = []
  
  // Flowchart для процессов
  if (module.contentType === 'problem_solving' || module.contentType === 'hands_on') {
    diagrams.push(generateMermaidDiagram(
      module.name,
      module.keyTerms.slice(0, 4),
      'flowchart',
      true
    ))
  }
  
  // Chart для данных
  if (topicType === 'business' || topicType === 'scientific') {
    diagrams.push(generateChartConfig(
      `Статистика: ${module.name}`,
      module.keyTerms.slice(0, 4),
      module.keyTerms.map(() => Math.floor(Math.random() * 100) + 10),
      'bar_chart',
      true
    ))
  }
  
  // Mindmap для теории
  if (module.contentType === 'theory') {
    diagrams.push(generateMermaidDiagram(
      module.name,
      module.keyTerms.slice(0, 5),
      'mindmap',
      true
    ))
  }
  
  // Если нет диаграмм, добавляем базовую
  if (diagrams.length === 0) {
    diagrams.push(generateMermaidDiagram(
      module.name,
      module.keyTerms.slice(0, 3),
      'flowchart',
      true
    ))
  }
  
  return diagrams
}

/**
 * Генерирует полную мультимедиа спецификацию для модуля
 */
export function generateMultimediaSpec(
  module: CourseModule,
  topicType: TopicType,
  visualTheme: VisualTheme
): MultimediaSpec {
  return {
    imagePrompts: generateImagePrompts(module, visualTheme, topicType),
    videoSources: generateVideoSources(module, topicType),
    diagrams: generateModuleDiagrams(module, topicType),
    embeds: generateEmbeds(module, topicType)
  }
}

/**
 * Генерирует мультимедиа спецификации для всех модулей
 */
export function generateAllMultimediaSpecs(
  modules: CourseModule[],
  topicType: TopicType,
  visualTheme: VisualTheme
): MultimediaSpec[] {
  return modules.map(module => generateMultimediaSpec(module, topicType, visualTheme))
}

/**
 * Валидирует MultimediaSpec
 */
export function validateMultimediaSpec(spec: MultimediaSpec): boolean {
  // Проверяем imagePrompts
  if (!Array.isArray(spec.imagePrompts)) {
    return false
  }
  for (const prompt of spec.imagePrompts) {
    if (!prompt.style || !prompt.subject || !prompt.action || !prompt.detailLevel) {
      return false
    }
    if (typeof prompt.style !== 'string' || prompt.style.length === 0) {
      return false
    }
    if (typeof prompt.subject !== 'string' || prompt.subject.length === 0) {
      return false
    }
    if (typeof prompt.action !== 'string' || prompt.action.length === 0) {
      return false
    }
    if (typeof prompt.detailLevel !== 'string' || prompt.detailLevel.length === 0) {
      return false
    }
  }
  
  // Проверяем videoSources
  if (!Array.isArray(spec.videoSources)) {
    return false
  }
  const validPlatforms: EmbedPlatform[] = ['youtube', 'codepen', 'observable']
  for (const source of spec.videoSources) {
    if (!validPlatforms.includes(source.platform)) {
      return false
    }
    if (typeof source.searchQuery !== 'string' || source.searchQuery.length === 0) {
      return false
    }
    if (typeof source.durationPreference !== 'string') {
      return false
    }
    if (typeof source.hasCaptions !== 'boolean') {
      return false
    }
  }
  
  // Проверяем diagrams
  if (!Array.isArray(spec.diagrams)) {
    return false
  }
  
  // Проверяем embeds
  if (!Array.isArray(spec.embeds)) {
    return false
  }
  for (const embed of spec.embeds) {
    if (!validPlatforms.includes(embed.platform)) {
      return false
    }
  }
  
  return true
}
