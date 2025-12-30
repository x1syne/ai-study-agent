/**
 * 🔍 ANALYST AGENT - Topic Classification & RAG
 * 
 * Первый агент в цепочке: Analyst → Constructor → Generator
 * 
 * Задачи:
 * 1. Классификация темы (programming/scientific/creative/practical/etc.)
 * 2. Определение сложности и prerequisites
 * 3. RAG поиск лучших course outlines (Harvard, MIT, Coursera)
 * 4. Извлечение ключевых концепций
 * 
 * Использует: Groq LLM + Tavily Search + Wikipedia
 */

import { callLLMJson } from '../llm'
import { getEnhancedRAGContext } from '../tavily'
import { searchWikipedia, searchSerper } from '../search'
import type {
  TopicAnalysisResult,
  TopicType,
  DifficultyLevel,
  PracticeFormat,
  RAGContext
} from './types'

// ═══════════════════════════════════════════════════════════════
// 🎯 TOPIC TYPE DETECTION
// ═══════════════════════════════════════════════════════════════

/**
 * Keywords for topic type detection
 */
const TOPIC_KEYWORDS: Record<TopicType, RegExp> = {
  programming: /программ|python|javascript|java|c\+\+|react|vue|angular|sql|код|функци|алгоритм|ооп|oop|class|api|backend|frontend|web|разработ|typescript|node|database|git|devops|machine learning|ml|ai|нейросет|data science/i,
  
  scientific: /физик|химик|математ|биолог|астроном|геолог|механик|термодинам|оптик|электр|магнит|кинематик|динамик|геометр|алгебр|тригонометр|квантов|атом|молекул|генетик|эволюц|экосистем|формул|уравнен|теорем/i,
  
  creative: /дизайн|рисован|живопис|музык|композиц|фотограф|видео|монтаж|анимац|3d|blender|photoshop|illustrator|figma|ui|ux|творчеств|искусств|писательств|сценар|режиссур/i,
  
  practical: /кулинар|готов|рецепт|ремонт|строительств|сантехник|электрик|садовод|шить|вязан|рукодел|спорт|фитнес|йога|массаж|макияж|стилист|вожден|автомобил/i,
  
  business: /бизнес|менеджмент|маркетинг|продаж|финанс|инвестиц|стартап|предприниматель|управлен|лидерств|переговор|презентац|excel|аналитик|crm|b2b|b2c|roi|kpi/i,
  
  humanities: /истор|философ|психолог|социолог|политолог|экономик|право|юриспруденц|литератур|лингвист|язык|культур|религи|этик|антрополог|археолог/i,
  
  technical: /инженер|электроник|схем|микроконтроллер|arduino|raspberry|робот|автоматизац|плк|cad|cam|cnc|3d печат|лазер|сварк|токар|фрезер|механизм/i
}

/**
 * Practice formats by topic type
 */
const PRACTICE_FORMATS: Record<TopicType, PracticeFormat[]> = {
  programming: ['code_challenges', 'quizzes', 'case_studies'],
  scientific: ['calculations', 'simulations', 'quizzes'],
  creative: ['creative_tasks', 'step_by_step', 'case_studies'],
  practical: ['step_by_step', 'quizzes', 'simulations'],
  business: ['case_studies', 'quizzes', 'simulations'],
  humanities: ['quizzes', 'case_studies', 'creative_tasks'],
  technical: ['calculations', 'step_by_step', 'simulations']
}

/**
 * Detect topic type from query using keywords
 */
function detectTopicType(query: string): TopicType {
  const normalizedQuery = query.toLowerCase()
  
  // Check each type's keywords
  for (const [type, regex] of Object.entries(TOPIC_KEYWORDS)) {
    if (regex.test(normalizedQuery)) {
      return type as TopicType
    }
  }
  
  // Default to programming for tech-related queries
  if (/learn|tutorial|course|guide|how to/i.test(normalizedQuery)) {
    return 'programming'
  }
  
  return 'humanities' // Most generic fallback
}

// ═══════════════════════════════════════════════════════════════
// 🧠 LLM CLASSIFICATION
// ═══════════════════════════════════════════════════════════════

interface LLMClassificationResult {
  normalizedTopic: string
  type: TopicType
  subtypes: string[]
  difficulty: DifficultyLevel
  keyConcepts: string[]
  prerequisites: string[]
  estimatedDuration: number
  recommendedSources: string[]
}

/**
 * Use LLM for deep topic classification
 */
async function classifyWithLLM(query: string): Promise<LLMClassificationResult> {
  const systemPrompt = `Ты — эксперт по образовательному контенту. Классифицируй тему для создания курса.

ТИПЫ ТЕМ:
- programming: код, алгоритмы, разработка, ML/AI
- scientific: физика, химия, математика, биология
- creative: дизайн, искусство, музыка, писательство
- practical: кулинария, ремонт, спорт, рукоделие
- business: менеджмент, маркетинг, финансы
- humanities: история, философия, психология, языки
- technical: инженерия, электроника, робототехника

УРОВНИ СЛОЖНОСТИ:
- beginner: для новичков, без предварительных знаний
- intermediate: базовые знания нужны
- advanced: требуется опыт
- expert: профессиональный уровень

Отвечай ТОЛЬКО валидным JSON.`

  const userPrompt = `Классифицируй тему: "${query}"

Верни JSON:
{
  "normalizedTopic": "Нормализованное название темы",
  "type": "programming|scientific|creative|practical|business|humanities|technical",
  "subtypes": ["подтип1", "подтип2"],
  "difficulty": "beginner|intermediate|advanced|expert",
  "keyConcepts": ["концепция1", "концепция2", "концепция3", "концепция4", "концепция5"],
  "prerequisites": ["что нужно знать заранее"],
  "estimatedDuration": число_минут_на_курс,
  "recommendedSources": ["Harvard CS50", "MIT OCW", "Coursera", etc.]
}`

  try {
    const { data } = await callLLMJson<LLMClassificationResult>(
      systemPrompt,
      userPrompt,
      { temperature: 0.3, maxTokens: 1000 }
    )
    
    return data
  } catch (error) {
    console.error('[Analyst] LLM classification failed:', error)
    
    // Fallback to keyword detection
    const detectedType = detectTopicType(query)
    
    return {
      normalizedTopic: query,
      type: detectedType,
      subtypes: [],
      difficulty: 'intermediate',
      keyConcepts: [query],
      prerequisites: [],
      estimatedDuration: 60,
      recommendedSources: []
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔍 RAG CONTEXT GATHERING
// ═══════════════════════════════════════════════════════════════

/**
 * Gather RAG context from multiple sources
 */
async function gatherRAGContext(
  topic: string,
  topicType: TopicType
): Promise<RAGContext> {
  console.log(`[Analyst] Gathering RAG context for "${topic}"`)
  
  // Try Tavily first (best quality)
  try {
    const tavilyContext = await getEnhancedRAGContext(topic, topicType)
    
    if (tavilyContext.courseOutlines.length > 0 || tavilyContext.articles.length > 0) {
      console.log('[Analyst] Using Tavily RAG context')
      return tavilyContext
    }
  } catch (error) {
    console.warn('[Analyst] Tavily failed:', error)
  }
  
  // Fallback to Wikipedia + Serper
  console.log('[Analyst] Falling back to Wikipedia + Serper')
  
  const [wikiResult, serperResults] = await Promise.all([
    searchWikipedia(topic),
    searchSerper(`${topic} course outline tutorial`, 5)
  ])
  
  const context: RAGContext = {
    courseOutlines: [],
    articles: serperResults.map(r => ({
      title: r.title,
      snippet: r.snippet,
      url: r.link,
      relevance: 0.5
    })),
    keyFacts: wikiResult ? [wikiResult.extract.slice(0, 500)] : [],
    suggestedStructure: []
  }
  
  return context
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN ANALYST FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Analyze topic and prepare for course generation
 * 
 * @param query - User's topic query
 * @returns Complete topic analysis with RAG context
 * 
 * @example
 * const analysis = await analyzeTopic("ООП в Python")
 * // Returns: { type: 'programming', keyConcepts: ['классы', 'наследование', ...], ... }
 */
export async function analyzeTopic(query: string): Promise<TopicAnalysisResult> {
  console.log(`[Analyst] Analyzing topic: "${query}"`)
  const startTime = Date.now()
  
  // Step 1: Quick keyword detection for type
  const quickType = detectTopicType(query)
  console.log(`[Analyst] Quick detection: ${quickType}`)
  
  // Step 2: Parallel - LLM classification + RAG context
  const [llmClassification, ragContext] = await Promise.all([
    classifyWithLLM(query),
    gatherRAGContext(query, quickType)
  ])
  
  // Step 3: Merge and validate
  const finalType = llmClassification.type || quickType
  const practiceFormats = PRACTICE_FORMATS[finalType]
  
  // Step 4: Build result
  const result: TopicAnalysisResult = {
    query,
    normalizedTopic: llmClassification.normalizedTopic || query,
    type: finalType,
    subtypes: llmClassification.subtypes,
    difficulty: llmClassification.difficulty,
    keyConcepts: llmClassification.keyConcepts,
    prerequisites: llmClassification.prerequisites,
    recommendedSources: llmClassification.recommendedSources,
    practiceFormats,
    estimatedDuration: llmClassification.estimatedDuration,
    ragContext,
    metadata: {
      analyzedAt: new Date().toISOString(),
      confidence: calculateConfidence(llmClassification, ragContext),
      ragSourcesUsed: ragContext.courseOutlines.length + ragContext.articles.length
    }
  }
  
  console.log(`[Analyst] Analysis complete in ${Date.now() - startTime}ms`)
  console.log(`[Analyst] Type: ${result.type}, Difficulty: ${result.difficulty}, Concepts: ${result.keyConcepts.length}`)
  
  return result
}

/**
 * Calculate confidence score based on available data
 */
function calculateConfidence(
  classification: LLMClassificationResult,
  ragContext: RAGContext
): number {
  let confidence = 0.5 // Base confidence
  
  // More concepts = higher confidence
  if (classification.keyConcepts.length >= 5) confidence += 0.1
  
  // RAG sources boost confidence
  if (ragContext.courseOutlines.length > 0) confidence += 0.15
  if (ragContext.articles.length >= 3) confidence += 0.1
  if (ragContext.keyFacts.length > 0) confidence += 0.05
  
  // Prerequisites defined = better understanding
  if (classification.prerequisites.length > 0) confidence += 0.05
  
  // Recommended sources = validated topic
  if (classification.recommendedSources.length > 0) confidence += 0.05
  
  return Math.min(confidence, 1.0)
}

// ═══════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Format RAG context for LLM prompt
 */
export function formatRAGContextForPrompt(ragContext: RAGContext): string {
  const parts: string[] = []
  
  // Course outlines
  if (ragContext.courseOutlines.length > 0) {
    parts.push('📚 НАЙДЕННЫЕ СТРУКТУРЫ КУРСОВ:')
    for (const outline of ragContext.courseOutlines.slice(0, 3)) {
      parts.push(`\n[${outline.source}] ${outline.title}`)
      if (outline.modules.length > 0) {
        parts.push(`Модули: ${outline.modules.slice(0, 5).join(', ')}`)
      }
    }
  }
  
  // Key facts
  if (ragContext.keyFacts.length > 0) {
    parts.push('\n\n📖 КЛЮЧЕВЫЕ ФАКТЫ:')
    for (const fact of ragContext.keyFacts.slice(0, 5)) {
      parts.push(`• ${fact}`)
    }
  }
  
  // Suggested structure
  if (ragContext.suggestedStructure.length > 0) {
    parts.push('\n\n🏗️ РЕКОМЕНДУЕМАЯ СТРУКТУРА:')
    ragContext.suggestedStructure.forEach((item, i) => {
      parts.push(`${i + 1}. ${item}`)
    })
  }
  
  if (parts.length === 0) {
    return ''
  }
  
  return `
═══════════════════════════════════════════════════════════════
                    RAG КОНТЕКСТ (актуальные источники)
═══════════════════════════════════════════════════════════════

${parts.join('\n')}

═══════════════════════════════════════════════════════════════
ИНСТРУКЦИЯ: Используй эту информацию как основу для создания курса.
Адаптируй структуру под найденные лучшие практики.
═══════════════════════════════════════════════════════════════
`
}

/**
 * Get topic type description for prompts
 */
export function getTopicTypeDescription(type: TopicType): string {
  const descriptions: Record<TopicType, string> = {
    programming: 'Программирование и разработка. Фокус на коде, примерах, практических задачах. Используй code blocks, объясняй синтаксис.',
    scientific: 'Точные науки. Используй формулы, расчёты, эксперименты. Объясняй через аналогии, визуализируй процессы.',
    creative: 'Творчество и дизайн. Вдохновляй, показывай примеры работ, давай пошаговые инструкции по техникам.',
    practical: 'Практические навыки. Пошаговые инструкции, чек-листы, таймеры. Фокус на действиях и результате.',
    business: 'Бизнес и менеджмент. Кейсы, фреймворки, метрики. Практические инструменты и шаблоны.',
    humanities: 'Гуманитарные науки. Контекст, анализ, разные точки зрения. Связь с современностью.',
    technical: 'Техническое направление. Схемы, спецификации, расчёты. Практические проекты.'
  }
  
  return descriptions[type]
}

/**
 * Validate analysis result
 */
export function validateAnalysis(analysis: TopicAnalysisResult): boolean {
  return (
    analysis.query.length > 0 &&
    analysis.normalizedTopic.length > 0 &&
    analysis.keyConcepts.length > 0 &&
    analysis.practiceFormats.length > 0
  )
}
