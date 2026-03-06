/**
 * OPTIMIZED AI COURSE ARCHITECT
 * 
 * Ключевые оптимизации:
 * 1. Параллельная генерация секций (вместо последовательной)
 * 2. Кэширование результатов с валидацией
 * 3. Мульти-провайдер с fallback
 * 4. Уменьшенные задержки
 * 5. RAG интеграция с персонализацией
 * 6. Domain-specific prompts (13 доменов)
 * 7. Fallback контент при ошибках
 */

import { generateWithRouter, generateImage } from '@/lib/ai-router'
import { 
  getCachedLesson,
  getCachedTasks,
  getCachedAnalysis, setCachedAnalysis,
  setCachedLessonSmart, setCachedTasksSmart
} from '@/lib/ai-cache'
import { getFullRAGContext, getDomainRAGContext } from '@/lib/rag'
import { getFallbackTheory, getFallbackTasks, isFallbackContent } from './fallback-content'
import { 
  detectDomain, 
  getConfigForTopic,
  getDomainConfig,
  getDomainPrompt,
  normalizeDomain,
  Domain,
  DomainPrompt,
  DomainConfig, 
  DomainType,
  SectionTemplate,
  DOMAIN_TO_TYPE
} from '@/lib/ai/domain-prompts'
import { withRetry } from '@/lib/utils/retry'

// Types
export interface TopicAnalysis {
  topic: string
  courseName: string
  domain: DomainType  // Определённый домен (legacy type)
  domainEnum?: Domain // Домен из базы данных (Prisma enum)
  nature: string[]
  complexity: { base: number; depth: number; prerequisites: string[] }
  learningMethods: string[]
  contentFormats: string[]
  connections: { relatedTopics: string[]; realApplications: string[]; industries: string[] }
  keyTerms: string[]
  tone: string
  audience: string
  estimatedTime: number
}

export interface LessonPlan {
  title: string
  objectives: string[]
  sections: { title: string; type: string; keyPoints: string[]; estimatedMinutes: number }[]
  practiceIdeas: string[]
}

// Быстрый анализ темы (с кэшем)
// Requirements: 4.2, 4.4 - получать домен курса из базы данных
export async function analyzeTopicFast(
  topic: string, 
  courseName: string,
  dbDomain?: Domain  // Домен из базы данных (если передан)
): Promise<TopicAnalysis> {
  // Проверяем кэш
  const cached = getCachedAnalysis(topic, courseName)
  if (cached) {
    console.log('[Fast Agent] Using cached analysis')
    // Если передан домен из БД, обновляем его в кэшированном анализе
    if (dbDomain) {
      cached.domainEnum = dbDomain
      cached.domain = DOMAIN_TO_TYPE[dbDomain] || 'general'
    }
    return cached
  }

  console.log('[Fast Agent] Analyzing topic...')
  
  // Используем домен из БД если передан, иначе определяем автоматически
  // Requirements: 4.2 - использовать getDomainPrompt для выбора промпта
  let domain: DomainType
  let domainEnum: Domain
  
  if (dbDomain) {
    domainEnum = normalizeDomain(dbDomain)
    domain = DOMAIN_TO_TYPE[domainEnum] || 'general'
    console.log(`[Fast Agent] Using domain from database: ${domainEnum} -> ${domain}`)
  } else {
    domain = detectDomain(topic, courseName)
    domainEnum = Object.entries(DOMAIN_TO_TYPE).find(([_, v]) => v === domain)?.[0] as Domain || 'GENERAL'
    console.log(`[Fast Agent] Detected domain: ${domain} -> ${domainEnum}`)
  }
  
  const prompt = `Проанализируй тему "${topic}" для курса "${courseName}".

Верни JSON:
{
  "nature": ["conceptual"|"procedural"|"factual"|"skill"|"creative"],
  "complexity": {"base": 1-10, "depth": 1-10, "prerequisites": []},
  "contentFormats": ["code_examples"|"text_formulas"|"practice_tasks"],
  "connections": {"realApplications": [], "industries": []},
  "keyTerms": ["5-7 терминов"],
  "tone": "conversational",
  "estimatedTime": 20
}

ТОЛЬКО валидный JSON.`

  try {
    const result = await generateWithRouter(
      'fast',
      'Ты аналитик. Отвечай ТОЛЬКО JSON.',
      prompt,
      { json: true, temperature: 0.3, maxTokens: 1000 }
    )
    
    const data = JSON.parse(result.content)
    const analysis: TopicAnalysis = {
      topic,
      courseName,
      domain,  // Добавлено
      nature: data.nature || ['conceptual'],
      complexity: data.complexity || { base: 5, depth: 5, prerequisites: [] },
      learningMethods: ['theory-practice-project'],
      contentFormats: data.contentFormats || ['practice_tasks'],
      connections: data.connections || { relatedTopics: [], realApplications: [], industries: [] },
      keyTerms: data.keyTerms || [topic],
      tone: data.tone || 'conversational',
      audience: 'Студенты',
      estimatedTime: data.estimatedTime || 20,
      domainEnum  // Домен из БД (Prisma enum)
    }
    
    setCachedAnalysis(topic, courseName, analysis)
    return analysis
  } catch (e) {
    console.error('[Fast Agent] Analysis failed:', e)
    return {
      topic, courseName,
      domain,
      domainEnum,  // Домен из БД (Prisma enum)
      nature: ['conceptual'],
      complexity: { base: 5, depth: 5, prerequisites: [] },
      learningMethods: ['theory-practice-project'],
      contentFormats: ['practice_tasks'],
      connections: { relatedTopics: [], realApplications: [], industries: [] },
      keyTerms: [topic],
      tone: 'conversational',
      audience: 'Студенты',
      estimatedTime: 20
    }
  }
}


// === ГЕНЕРАЦИЯ ИЛЛЮСТРАЦИЙ ===

/** Максимальное количество изображений на урок */
const MAX_IMAGES_PER_LESSON = 4
/** Минимальная длина секции (символов) для генерации иллюстрации */
const MIN_SECTION_LENGTH_FOR_IMAGE = 300

/**
 * Обогащает markdown-контент AI-сгенерированными иллюстрациями.
 * Выбирает до MAX_IMAGES_PER_LESSON ключевых секций (## заголовков),
 * генерирует для них изображения через NVIDIA FLUX.1 и вставляет
 * base64-картинки прямо в markdown.
 */
export async function enrichContentWithImages(
  markdown: string,
  analysis: TopicAnalysis | { topic: string; domain: DomainType }
): Promise<string> {
  // Проверяем наличие API-ключа — если нет, просто возвращаем контент как есть
  if (!process.env.NVIDIA_IMAGE_API_KEY && !process.env.NVIDIA_API_KEY) {
    console.log('[Images] No NVIDIA API key configured, skipping image generation')
    return markdown
  }

  console.log('[Images] Enriching content with illustrations...')

  // Разбиваем markdown на секции по ## заголовкам
  const sectionRegex = /^## (.+)$/gm
  const sections: { title: string; index: number }[] = []
  let match: RegExpExecArray | null

  while ((match = sectionRegex.exec(markdown)) !== null) {
    sections.push({ title: match[1].trim(), index: match.index })
  }

  if (sections.length === 0) {
    console.log('[Images] No sections found, skipping')
    return markdown
  }

  // Приоритетно берём секции где визуализация полезна (таблицы, код, формулы, кейсы),
  // затем добираем равномерно
  const VISUAL_KEYWORDS = /кейс|пример|концеп|основ|ключев|работает|метод|алгоритм|схем|структур|архитект|модел|диаграм|визуал|таблиц|сравнен|тип|классифик/i
  const visualSections = sections.filter(s => VISUAL_KEYWORDS.test(s.title))
  const otherSections = sections.filter(s => !VISUAL_KEYWORDS.test(s.title))

  // Сначала визуальные, потом равномерно из остальных
  const selected = [...visualSections]
  if (selected.length < MAX_IMAGES_PER_LESSON) {
    const step = Math.max(1, Math.floor(otherSections.length / (MAX_IMAGES_PER_LESSON - selected.length)))
    for (let i = 0; i < otherSections.length && selected.length < MAX_IMAGES_PER_LESSON; i += step) {
      selected.push(otherSections[i])
    }
  }
  const selectedSections = selected.slice(0, MAX_IMAGES_PER_LESSON)

  // Генерируем изображения параллельно
  const imageResults = await Promise.allSettled(
    selectedSections.map(async (section) => {
      // LLM генерирует осмысленный визуальный промпт для FLUX.1
      const imagePrompt = await buildImagePrompt(analysis.topic, section.title, analysis.domain)
      console.log(`[Images] Generating for "${section.title}": "${imagePrompt.slice(0, 100)}..."`)

      const result = await generateImage(imagePrompt, {
        width: 1024,
        height: 768, // 4:3 — поддерживается FLUX.1 API
      })
      return { section, image: result.image }
    })
  )

  // Логируем ошибки генерации изображений
  imageResults.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.error(`[Images] Failed to generate image for "${selectedSections[i]?.title}": ${r.reason}`)
    }
  })

  // Вставляем изображения в markdown (идём с конца, чтобы не сбивать индексы)
  let enriched = markdown
  const successfulImages = imageResults
    .map((r, i) => r.status === 'fulfilled' ? r.value : null)
    .filter(Boolean) as { section: { title: string; index: number }; image: string }[]

  // Сортируем по позиции в тексте (с конца)
  successfulImages.sort((a, b) => b.section.index - a.section.index)

  for (const { section, image } of successfulImages) {
    // Находим конец строки заголовка
    const headingEnd = enriched.indexOf('\n', section.index)
    if (headingEnd === -1) continue

    const imageMarkdown = `\n\n![Иллюстрация: ${section.title}](data:image/jpeg;base64,${image})\n`
    enriched = enriched.slice(0, headingEnd + 1) + imageMarkdown + enriched.slice(headingEnd + 1)
  }

  console.log(`[Images] Successfully added ${successfulImages.length}/${selectedSections.length} illustrations`)
  return enriched
}

/** Строгий запрет на текст — FLUX.1 генерирует нечитаемые надписи */
const NO_TEXT_DIRECTIVE = 'Absolutely no text, no letters, no labels, no watermarks, no writing, no numbers, no captions anywhere in the image.'

/** Системный промпт для LLM, которая генерирует промпты для FLUX.1 */
const IMAGE_PROMPT_SYSTEM = `You are an expert at writing prompts for the FLUX.1 image generation model.
Your task: given an educational topic and section title, produce ONE short English prompt (2-3 sentences max) that describes a vivid, concrete visual scene illustrating the concept.

Rules:
- Describe ONLY visual objects, colors, composition, lighting — things a camera could capture.
- NEVER include any text, letters, labels, watermarks, numbers or captions in the description.
- Use concrete nouns ("glass flask with blue liquid", not "chemistry concept").
- Mention art style: photorealistic, 3D render, flat vector, watercolor, etc.
- Output ONLY the prompt text, nothing else.`

/**
 * Генерирует промпт для FLUX.1 через быструю LLM.
 * Если LLM недоступна — fallback на шаблонный промпт.
 */
async function buildImagePrompt(topic: string, sectionTitle: string, domain: DomainType): Promise<string> {
  try {
    const userPrompt = `Topic: "${topic}"
Section: "${sectionTitle}"
Domain: ${domain}

Write a FLUX.1 image prompt for this section.`

    const result = await generateWithRouter(
      'fast',
      IMAGE_PROMPT_SYSTEM,
      userPrompt,
      { temperature: 0.9, maxTokens: 200 }
    )

    const aiPrompt = result.content.trim()
    if (aiPrompt.length < 20) throw new Error('Prompt too short')

    console.log(`[Images] AI-generated prompt for "${sectionTitle}": "${aiPrompt.slice(0, 100)}..."`)
    // Добавляем запрет на текст как страховку — LLM может забыть
    return `${aiPrompt} ${NO_TEXT_DIRECTIVE}`
  } catch (e: any) {
    console.warn(`[Images] Failed to generate AI prompt for "${sectionTitle}": ${e.message}, using fallback`)
    return buildImagePromptFallback(topic, sectionTitle, domain)
  }
}

/** Шаблонный fallback-промпт, если LLM недоступна */
function buildImagePromptFallback(topic: string, sectionTitle: string, domain: DomainType): string {
  const domainVisuals: Record<DomainType, string> = {
    physics: 'photorealistic physics laboratory, light rays through prisms, pendulums, magnetic field lines',
    math: '3D colorful geometric shapes floating in space, golden ratio spiral, abstract mathematical surfaces',
    chemistry: 'glass flasks with colorful glowing liquids, molecular models, crystal structures',
    programming: 'futuristic holographic interface, glowing circuit board, data stream visualization',
    biology: 'detailed cell cross-section, DNA helix, vivid ecosystem diorama',
    history: 'oil painting of ancient architecture, historical artifacts, sepia toned scene',
    economics: 'golden coins stacked in rising columns, miniature cityscape, stock charts as 3D ribbons',
    languages: 'vintage typewriter, open books, world map with cultural symbols',
    psychology: 'transparent human head with glowing brain, neural pathways, abstract thought clouds',
    law: 'marble scales of justice, ancient scroll with wax seal, courthouse columns',
    medicine: 'anatomical heart model, stethoscope, medical lab with microscope',
    art: 'artist palette with oil paints, canvas on easel, sculpture gallery',
    general: 'glowing lightbulb above an open book, magnifying glass, educational tools'
  }
  const visual = domainVisuals[domain] || domainVisuals.general
  return `Concept illustration about "${sectionTitle}" related to "${topic}". ${visual}. Soft lighting, muted colors, high detail. ${NO_TEXT_DIRECTIVE}`
}

// Результат генерации секции с информацией о провайдере и retry
interface SectionResult {
  content: string
  provider?: string
  retryCount?: number
  failed?: boolean
}

// Генерация одной секции с domain-specific промптом и retry механизмом
// Requirements: 4.2 - использовать getDomainPrompt для выбора промпта
// Requirements: 4.5 - AI сам структурирует контент до наилучшей версии
// Requirements: 3.1, 3.2, 3.3 - retry механизм с экспоненциальной задержкой
async function generateSection(
  template: SectionTemplate,
  domainConfig: DomainConfig,
  analysis: TopicAnalysis,
  ragContext: string = '',
  domainPrompt?: DomainPrompt  // Промпт из getDomainPrompt (если есть домен из БД)
): Promise<SectionResult> {
  const baseContext = `Тема: "${analysis.topic}", Курс: "${analysis.courseName}"`
  
  // Добавляем RAG контекст
  // Requirements: 4.4, 4.5 - интегрировать RAG контекст
  const ragInstruction = ragContext ? `

ИСПОЛЬЗУЙ СЛЕДУЮЩИЙ КОНТЕКСТ ДЛЯ ТОЧНОСТИ:
${ragContext.slice(0, 2000)}

Цитируй факты из контекста, упоминай источники.` : ''

  // Формируем полный системный промпт
  // Requirements: 4.5, 4.6 - включить systemPrompt домена и пример эталонного контента
  let fullSystemPrompt: string
  
  if (domainPrompt) {
    // Используем промпт из getDomainPrompt (новый API)
    fullSystemPrompt = `${domainPrompt.systemPrompt}

${domainPrompt.exampleContent ? `ПРИМЕР ЭТАЛОННОГО КОНТЕНТА:
${domainPrompt.exampleContent}

Создавай контент в таком же стиле и качестве.` : ''}

ПРАВИЛА ФОРМАТИРОВАНИЯ:
${domainConfig.formatRules.map(r => `- ${r}`).join('\n')}

ПРИМЕРЫ ОФОРМЛЕНИЯ:
${domainConfig.examplePatterns.map(p => `- ${p}`).join('\n')}${ragInstruction}`
  } else {
    // Fallback на старый формат
    fullSystemPrompt = `${domainConfig.systemPrompt}

ПРАВИЛА ФОРМАТИРОВАНИЯ:
${domainConfig.formatRules.map(r => `- ${r}`).join('\n')}

ПРИМЕРЫ ОФОРМЛЕНИЯ:
${domainConfig.examplePatterns.map(p => `- ${p}`).join('\n')}${ragInstruction}`
  }

  // Формируем промпт для секции
  // Requirements: 4.6 - указать минимум 2500 слов
  const sectionPrompt = `${baseContext}

Напиши раздел "${template.title}" (минимум ${template.minWords} слов).

ЗАДАНИЕ: ${template.prompt}

Ключевые термины для включения: ${analysis.keyTerms.join(', ')}

НЕ повторяй заголовок секции. Сразу начинай с контента.
Используй ### для подзаголовков, **жирный** для терминов, списки для структуры.`

  // Счётчик попыток для логирования
  let retryCount = 0

  try {
    console.log(`[Fast Agent] Generating section "${template.title}" with ${template.minWords} words...`)
    
    // Requirements: 3.1, 3.2, 3.3 - retry до 3 раз с экспоненциальной задержкой
    const result = await withRetry(
      async () => {
        const genResult = await generateWithRouter('heavy', fullSystemPrompt, sectionPrompt, {
          temperature: 0.7,
          maxTokens: 2500  // Увеличено для более детального контента
        })
        
        // Валидация результата
        if (!genResult.content || genResult.content.length < 50) {
          throw new Error(`Section content too short: ${genResult.content?.length || 0} chars`)
        }
        
        return genResult
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
        // Requirements: 3.3 - логирование попыток
        onRetry: (attempt, error) => {
          retryCount = attempt
          console.warn(`[Fast Agent] Retry ${attempt}/3 for section "${template.title}":`, error instanceof Error ? error.message : String(error))
        }
      }
    )
    
    console.log(`[Fast Agent] Section "${template.title}" generated: ${result.content.length} chars by ${result.provider}${retryCount > 0 ? ` (after ${retryCount} retries)` : ''}`)
    return {
      content: result.content,
      provider: result.provider,
      retryCount,
      failed: false
    }
  } catch (e) {
    // Requirements: 3.2, 3.4 - использовать fallback при исчерпании попыток
    console.error(`[Fast Agent] Section "${template.title}" failed after ${retryCount} retries:`, e)
    return { 
      content: '', 
      provider: undefined,
      retryCount,
      failed: true
    }
  }
}

// ПАРАЛЛЕЛЬНАЯ генерация всех секций с domain-specific шаблонами и retry tracking
// Requirements: 4.2 - использовать getDomainPrompt для выбора промпта
// Requirements: 3.4 - отслеживать успешные и неудачные секции
async function generateAllSectionsParallel(
  analysis: TopicAnalysis,
  ragContext: string = ''
): Promise<{ content: string; providers: string[]; retryStats: { total: number; retried: number; failed: number } }> {
  console.log('[Fast Agent] Generating sections in PARALLEL...')
  console.log(`[Fast Agent] Domain: ${analysis.domain}`)
  console.log(`[Fast Agent] Domain Enum: ${analysis.domainEnum || 'not set'}`)
  if (ragContext) {
    console.log(`[Fast Agent] Using RAG context: ${ragContext.length} chars`)
  }
  
  // Получаем конфигурацию домена (legacy)
  const domainConfig = getConfigForTopic(analysis.topic, analysis.courseName)
  console.log(`[Fast Agent] Using ${domainConfig.name} config with ${domainConfig.sectionTemplates.length} sections`)
  
  // Получаем промпт домена из getDomainPrompt если есть domainEnum
  // Requirements: 4.2 - использовать getDomainPrompt для выбора промпта
  let domainPrompt: DomainPrompt | undefined
  if (analysis.domainEnum) {
    domainPrompt = getDomainPrompt(analysis.domainEnum)
    console.log(`[Fast Agent] Using domain prompt for: ${analysis.domainEnum}`)
  }

  // ПАРАЛЛЕЛЬНАЯ генерация всех секций
  const startTime = Date.now()
  
  const results = await Promise.allSettled(
    domainConfig.sectionTemplates.map(template => 
      generateSection(template, domainConfig, analysis, ragContext, domainPrompt)
    )
  )
  
  console.log(`[Fast Agent] Parallel generation took ${Date.now() - startTime}ms`)

  // Собираем результаты, провайдеры и статистику retry
  const contentParts: string[] = []
  const usedProviders: string[] = []
  
  let successfulSections = 0
  let retriedSections = 0
  let failedSections = 0
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const template = domainConfig.sectionTemplates[i]
    
    if (result.status === 'fulfilled' && result.value.content) {
      contentParts.push(`## ${template.title}\n\n${result.value.content}`)
      if (result.value.provider && !usedProviders.includes(result.value.provider)) {
        usedProviders.push(result.value.provider)
      }
      successfulSections++
      
      // Requirements: 3.4 - отслеживать retry
      if (result.value.retryCount && result.value.retryCount > 0) {
        retriedSections++
      }
    } else {
      failedSections++
      
      if (template.required) {
        // Requirements: 3.2 - использовать fallback для обязательных секций
        console.warn(`[Fast Agent] Required section "${template.title}" failed, adding placeholder`)
        contentParts.push(`## ${template.title}\n\n*Раздел временно недоступен. Попробуйте обновить страницу.*`)
      }
    }
  }
  
  // Requirements: 3.4 - логирование статистики
  console.log(`[Fast Agent] Successfully generated ${successfulSections}/${results.length} sections`)
  console.log(`[Fast Agent] Retry stats: ${retriedSections} sections retried, ${failedSections} sections failed`)
  
  // Если ни одна секция не сгенерировалась - используем fallback
  if (successfulSections === 0) {
    console.error('[Fast Agent] All sections failed! Using fallback content')
    return {
      content: getFallbackTheory(analysis.topic, analysis.courseName, analysis.domainEnum || 'GENERAL'),
      providers: ['fallback'],
      retryStats: { total: results.length, retried: retriedSections, failed: failedSections }
    }
  }

  return {
    content: contentParts.join('\n\n---\n\n'),
    providers: usedProviders,
    retryStats: { total: results.length, retried: retriedSections, failed: failedSections }
  }
}

// Version for state machine - returns sections as array
// Requirements: 7.1, 7.2, 7.3 - state machine integration
export async function generateAllSectionsParallelForStateMachine(
  analysis: TopicAnalysis,
  ragContext: string = ''
): Promise<{ sections: string[]; providers: string[]; retryStats: { total: number; retried: number; failed: number } }> {
  console.log('[Fast Agent] Generating sections in PARALLEL (for state machine)...')
  console.log(`[Fast Agent] Domain: ${analysis.domain}`)
  console.log(`[Fast Agent] Domain Enum: ${analysis.domainEnum || 'not set'}`)
  if (ragContext) {
    console.log(`[Fast Agent] Using RAG context: ${ragContext.length} chars`)
  }
  
  // Получаем конфигурацию домена (legacy)
  const domainConfig = getConfigForTopic(analysis.topic, analysis.courseName)
  console.log(`[Fast Agent] Using ${domainConfig.name} config with ${domainConfig.sectionTemplates.length} sections`)
  
  // Получаем промпт домена из getDomainPrompt если есть domainEnum
  let domainPrompt: DomainPrompt | undefined
  if (analysis.domainEnum) {
    domainPrompt = getDomainPrompt(analysis.domainEnum)
    console.log(`[Fast Agent] Using domain prompt for: ${analysis.domainEnum}`)
  }

  // ПАРАЛЛЕЛЬНАЯ генерация всех секций
  const startTime = Date.now()
  
  const results = await Promise.allSettled(
    domainConfig.sectionTemplates.map(template => 
      generateSection(template, domainConfig, analysis, ragContext, domainPrompt)
    )
  )
  
  console.log(`[Fast Agent] Parallel generation took ${Date.now() - startTime}ms`)

  // Собираем результаты, провайдеры и статистику retry
  const sections: string[] = []
  const usedProviders: string[] = []
  
  let successfulSections = 0
  let retriedSections = 0
  let failedSections = 0
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const template = domainConfig.sectionTemplates[i]
    
    if (result.status === 'fulfilled' && result.value.content) {
      sections.push(`## ${template.title}\n\n${result.value.content}`)
      if (result.value.provider && !usedProviders.includes(result.value.provider)) {
        usedProviders.push(result.value.provider)
      }
      successfulSections++
      
      if (result.value.retryCount && result.value.retryCount > 0) {
        retriedSections++
      }
    } else {
      failedSections++
      
      if (template.required) {
        console.warn(`[Fast Agent] Required section "${template.title}" failed, adding placeholder`)
        sections.push(`## ${template.title}\n\n*Раздел временно недоступен. Попробуйте обновить страницу.*`)
      }
    }
  }
  
  console.log(`[Fast Agent] Successfully generated ${successfulSections}/${results.length} sections`)
  console.log(`[Fast Agent] Retry stats: ${retriedSections} sections retried, ${failedSections} sections failed`)
  
  return {
    sections,
    providers: usedProviders,
    retryStats: { total: results.length, retried: retriedSections, failed: failedSections }
  }
}


// Генерация практических заданий с domain-specific подходом
async function generateTasksFast(analysis: TopicAnalysis): Promise<any[]> {
  // Проверяем кэш
  const cached = getCachedTasks(analysis.topic, analysis.courseName)
  if (cached) {
    console.log('[Fast Agent] Using cached tasks')
    return cached
  }

  console.log('[Fast Agent] Generating tasks...')
  console.log(`[Fast Agent] Domain for tasks: ${analysis.domain}`)
  
  // Получаем конфигурацию домена для специфичных заданий
  const domainConfig = getConfigForTopic(analysis.topic, analysis.courseName)
  
  // Domain-specific инструкции для заданий
  const domainTaskInstructions: Record<DomainType, string> = {
    physics: 'Включи расчётные задачи с формулами, единицами СИ и проверкой размерности.',
    math: 'Включи задачи на вычисления, доказательства и построение графиков.',
    chemistry: 'Включи задачи на уравнения реакций, расчёт молярных масс и концентраций.',
    programming: 'Включи задания с кодом: найди ошибку, допиши функцию, оптимизируй.',
    biology: 'Включи задания на классификацию, процессы в клетке, экосистемы.',
    history: 'Включи задания на даты, причинно-следственные связи, сравнение эпох.',
    economics: 'Включи задачи на расчёт показателей, анализ графиков спроса/предложения.',
    languages: 'Включи задания на грамматику, перевод, заполнение пропусков.',
    psychology: 'Включи кейсы, анализ поведения, определение механизмов.',
    law: 'Включи задачи на применение статей, анализ ситуаций, квалификацию.',
    medicine: 'Включи задачи на симптомы, дифференциальную диагностику (учебные).',
    art: 'Включи задания на анализ произведений, определение стилей, сравнение.',
    general: 'Включи разнообразные типы заданий.'
  }
  
  // Generate tasks without AI classification
  const prompt = `Создай 10 заданий по теме "${analysis.topic}" (${domainConfig.name}).

Требования:
- Разные типы: single (выбор), multiple (несколько), text (ввод), number (число)
- Реальные примеры из жизни
- ${domainTaskInstructions[analysis.domain]}
- Варьируй сложность от простых до сложных заданий

JSON формат:
{
  "tasks": [
    {
      "id": 1,
      "type": "single",
      "question": "Вопрос?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Объяснение",
      "hint": "Подсказка (опционально)"
    }
  ]
}

ТОЛЬКО валидный JSON.`

  try {
    const result = await generateWithRouter(
      'heavy',
      `Создатель заданий по ${domainConfig.name}. Отвечай ТОЛЬКО JSON.`,
      prompt,
      { json: true, temperature: 0.6, maxTokens: 3000 }
    )
    
    const data = JSON.parse(result.content)
    let tasks = (data.tasks || []).map((t: any, i: number) => ({
      id: t.id || i + 1,
      type: t.type || 'single',
      difficulty: t.difficulty || 'medium', // Simple default
      question: t.question || 'Вопрос',
      options: t.options || [],
      correctAnswer: t.correctAnswer ?? 0,
      correctAnswers: t.correctAnswers || [],
      explanation: t.explanation || '',
      hint: t.hint || ''
    }))
    
    // Simple difficulty assignment based on task order
    // First 40% = easy, next 40% = medium, last 20% = hard
    const total = tasks.length
    tasks = tasks.map((task: any, index: number) => {
      let difficulty: 'easy' | 'medium' | 'hard'
      if (index < total * 0.4) {
        difficulty = 'easy'
      } else if (index < total * 0.8) {
        difficulty = 'medium'
      } else {
        difficulty = 'hard'
      }
      
      return {
        ...task,
        difficulty
      }
    })
    
    console.log('[Fast Agent] Tasks difficulty assigned')
    
    // Кэширование перенесено в runLessonAgentFast с валидацией
    return tasks
  } catch (e) {
    console.error('[Fast Agent] Tasks generation failed:', e)
    return getDefaultTasks(analysis.topic)
  }
}

function getDefaultTasks(topic: string): any[] {
  return [
    { id: 1, type: 'single', difficulty: 'easy', question: `Что такое ${topic}?`, options: ['A', 'B', 'C', 'D'], correctAnswer: 0, explanation: 'Базовое понятие' },
    { id: 2, type: 'single', difficulty: 'easy', question: `Где применяется ${topic}?`, options: ['A', 'B', 'C', 'D'], correctAnswer: 0, explanation: 'Применение' },
    { id: 3, type: 'single', difficulty: 'medium', question: `Как работает ${topic}?`, options: ['A', 'B', 'C', 'D'], correctAnswer: 0, explanation: 'Механизм' },
  ]
}

// ГЛАВНАЯ ФУНКЦИЯ - оптимизированная версия с RAG и Domain-Specific Prompts
// Requirements: 4.2, 4.4 - получать домен курса из базы данных, использовать getDomainPrompt
export async function runLessonAgentFast(
  topic: string,
  courseName: string,
  userId?: string,
  dbDomain?: Domain  // Домен из базы данных (Goal.domain)
): Promise<{ content: string; analysis: TopicAnalysis; plan: LessonPlan; metadata: any; tasks: any[] }> {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`[Fast Agent] Starting: "${topic}"`)
  console.log(`[Fast Agent] Course: "${courseName}"`)
  console.log(`[Fast Agent] User: ${userId || 'anonymous'}`)
  console.log(`[Fast Agent] DB Domain: ${dbDomain || 'not provided'}`)
  console.log(`${'='.repeat(50)}\n`)
  
  const startTime = Date.now()

  // Проверяем кэш урока
  const cachedLesson = getCachedLesson(topic, courseName)
  if (cachedLesson) {
    console.log('[Fast Agent] Using CACHED lesson!')
    const analysis = getCachedAnalysis(topic, courseName) || await analyzeTopicFast(topic, courseName, dbDomain)
    const tasks = getCachedTasks(topic, courseName) || await generateTasksFast(analysis)
    
    return {
      content: cachedLesson,
      analysis,
      plan: { title: topic, objectives: [], sections: [], practiceIdeas: [] },
      metadata: { 
        fromCache: true, 
        generatedAt: new Date().toISOString(), 
        domain: analysis.domain, 
        domainEnum: analysis.domainEnum,
        provider: 'cache',  // Из кэша
        providers: ['cache']
      },
      tasks
    }
  }

  // Нормализуем домен из БД
  const normalizedDomain = dbDomain ? normalizeDomain(dbDomain) : undefined
  const domainType = normalizedDomain ? DOMAIN_TO_TYPE[normalizedDomain] : undefined
  
  // 1. Параллельно: анализ темы + RAG контекст
  // Requirements: 4.4, 4.5 - интегрировать RAG контекст с приоритизацией по домену
  const [analysis, ragContext] = await Promise.all([
    analyzeTopicFast(topic, courseName, normalizedDomain),
    // Используем getDomainRAGContext если есть домен, иначе getFullRAGContext
    (domainType 
      ? getDomainRAGContext(topic, courseName, domainType)
      : getFullRAGContext(topic, courseName, userId)
    ).catch(e => {
      console.warn('[Fast Agent] RAG context failed:', e)
      return ''
    })
  ])
  
  // Получаем конфигурацию домена для метаданных
  const domainConfig = getConfigForTopic(topic, courseName)
  
  console.log(`[Fast Agent] Analysis done in ${Date.now() - startTime}ms`)
  console.log(`[Fast Agent] Domain: ${analysis.domain} (${domainConfig.name})`)
  console.log(`[Fast Agent] Sections: ${domainConfig.sectionTemplates.length}`)
  if (ragContext) {
    console.log(`[Fast Agent] RAG context: ${ragContext.length} chars`)
  }

  // 2. ПАРАЛЛЕЛЬНАЯ генерация контента И заданий (с RAG контекстом)
  let [contentResult, tasks] = await Promise.all([
    generateAllSectionsParallel(analysis, ragContext),
    generateTasksFast(analysis)
  ])
  
  let content = contentResult.content
  const usedProviders = contentResult.providers
  const retryStats = contentResult.retryStats
  
  // Requirements: 3.4 - логирование статистики retry
  console.log(`[Fast Agent] Retry statistics: ${retryStats.retried}/${retryStats.total} sections retried, ${retryStats.failed} failed`)
  
  // Обогащаем контент AI-иллюстрациями (пропускаем для fallback-контента)
  if (!isFallbackContent(content)) {
    content = await enrichContentWithImages(content, analysis)
  } else {
    console.log('[Fast Agent] Skipping image enrichment for fallback content')
  }

  // Умное кэширование с валидацией
  const lessonCacheResult = setCachedLessonSmart(topic, courseName, content, analysis.domain)
  const tasksCacheResult = setCachedTasksSmart(topic, courseName, tasks)

  // Fallback при очень низком качестве
  let usedFallback = false
  
  if (lessonCacheResult.validation.score < 30) {
    console.warn(`[Fast Agent] ⚠️ Content quality too low (${lessonCacheResult.validation.score}), using fallback`)
    content = getFallbackTheory(topic, courseName, analysis.domainEnum || 'GENERAL')
    usedFallback = true
  }
  
  if (tasksCacheResult.validation.score < 25) {
    console.warn(`[Fast Agent] ⚠️ Tasks quality too low (${tasksCacheResult.validation.score}), using fallback`)
    tasks = getFallbackTasks(topic, analysis.domainEnum || 'GENERAL')
    usedFallback = true
  }

  const totalTime = Date.now() - startTime
  console.log(`\n[Fast Agent] DONE in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`)
  console.log(`[Fast Agent] Domain: ${domainConfig.name}`)
  console.log(`[Fast Agent] Content: ${content.length} chars, Tasks: ${tasks.length}`)
  console.log(`[Fast Agent] Cached: lesson=${lessonCacheResult.cached}, tasks=${tasksCacheResult.cached}`)
  if (usedFallback) {
    console.log(`[Fast Agent] ⚠️ Used fallback content`)
  }

  const plan: LessonPlan = {
    title: topic,
    objectives: [`Понять ${topic}`, 'Применить на практике'],
    sections: domainConfig.sectionTemplates.map((t, i) => ({
      title: t.title,
      type: i === 0 ? 'intro' : i === domainConfig.sectionTemplates.length - 1 ? 'summary' : 'theory',
      keyPoints: analysis.keyTerms.slice(0, 3),
      estimatedMinutes: Math.ceil(t.minWords / 100)
    })),
    practiceIdeas: tasks.slice(0, 3).map(t => t.question)
  }

  return {
    content,
    analysis,
    plan,
    metadata: {
      generatedAt: new Date().toISOString(),
      totalTimeMs: totalTime,
      domain: analysis.domain,
      domainEnum: analysis.domainEnum,
      domainName: domainConfig.name,
      sectionsCount: domainConfig.sectionTemplates.length,
      tasksCount: tasks.length,
      fromCache: false,
      ragContextLength: ragContext.length,
      usedFallback,
      // Информация о провайдере
      provider: usedProviders.length > 0 ? usedProviders[0] : 'unknown',
      providers: usedProviders,
      // Информация о retry
      retryStats: {
        totalSections: retryStats.total,
        retriedSections: retryStats.retried,
        failedSections: retryStats.failed,
        successRate: ((retryStats.total - retryStats.failed) / retryStats.total * 100).toFixed(1) + '%'
      },
      // Информация о валидации
      validation: {
        lessonCached: lessonCacheResult.cached,
        lessonScore: lessonCacheResult.validation.score,
        tasksCached: tasksCacheResult.cached,
        tasksScore: tasksCacheResult.validation.score,
        issues: [
          ...lessonCacheResult.validation.issues,
          ...tasksCacheResult.validation.issues
        ]
      }
    },
    tasks
  }
}

// Экспорт для обратной совместимости
export { runLessonAgentFast as runLessonAgent }

// НОВАЯ ФУНКЦИЯ - генерация с использованием State Machine
// Requirements: 7.1, 7.2, 7.3, 7.4, 7.5 - state machine integration
export async function runLessonAgentWithStateMachine(
  topic: string,
  courseName: string,
  userId?: string,
  dbDomain?: Domain,
  onProgress?: (state: any) => void  // Callback for progress events
): Promise<{ content: string; analysis: TopicAnalysis; plan: LessonPlan; metadata: any; tasks: any[] }> {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`[Fast Agent] Starting WITH STATE MACHINE: "${topic}"`)
  console.log(`[Fast Agent] Course: "${courseName}"`)
  console.log(`[Fast Agent] User: ${userId || 'anonymous'}`)
  console.log(`[Fast Agent] DB Domain: ${dbDomain || 'not provided'}`)
  console.log(`${'='.repeat(50)}\n`)
  
  const startTime = Date.now()

  // Проверяем кэш урока
  const cachedLesson = getCachedLesson(topic, courseName)
  if (cachedLesson) {
    console.log('[Fast Agent] Using CACHED lesson!')
    const analysis = getCachedAnalysis(topic, courseName) || await analyzeTopicFast(topic, courseName, dbDomain)
    const tasks = getCachedTasks(topic, courseName) || await generateTasksFast(analysis)
    
    return {
      content: cachedLesson,
      analysis,
      plan: { title: topic, objectives: [], sections: [], practiceIdeas: [] },
      metadata: { 
        fromCache: true, 
        generatedAt: new Date().toISOString(), 
        domain: analysis.domain, 
        domainEnum: analysis.domainEnum,
        provider: 'cache',
        providers: ['cache'],
        usedStateMachine: true
      },
      tasks
    }
  }

  // Import state machine
  const { TheoryStateMachine } = await import('./theory-state-machine')
  
  // Create state machine
  const machine = new TheoryStateMachine(topic, courseName, dbDomain)
  
  // Add progress event listeners
  // Requirements: 7.5 - emit progress events for UI
  if (onProgress) {
    machine.on('analyze', (state) => {
      console.log(`[StateMachine Event] analyze - domain: ${state.analysis?.domain}`)
      onProgress({ phase: 'analyze', state })
    })
    machine.on('generate', (state) => {
      console.log(`[StateMachine Event] generate - sections: ${state.sections.length}`)
      onProgress({ phase: 'generate', state })
    })
    machine.on('validate', (state) => {
      console.log(`[StateMachine Event] validate - errors: ${state.errors.length}`)
      onProgress({ phase: 'validate', state })
    })
    machine.on('retry', (state) => {
      console.log(`[StateMachine Event] retry - attempt: ${state.retryCount}`)
      onProgress({ phase: 'retry', state })
    })
    machine.on('complete', (state) => {
      console.log(`[StateMachine Event] complete - total sections: ${state.sections.length}`)
      onProgress({ phase: 'complete', state })
    })
    machine.on('failed', (state) => {
      console.error(`[StateMachine Event] failed - errors: ${state.errors.join(', ')}`)
      onProgress({ phase: 'failed', state })
    })
  }

  // Run state machine
  // Requirements: 7.1, 7.2, 7.3 - state transitions and error handling
  let content: string
  let analysis: TopicAnalysis
  let usedFallback = false
  
  try {
    content = await machine.run()
    const finalState = machine.getState()
    
    if (!finalState.analysis) {
      throw new Error('State machine completed without analysis')
    }
    
    analysis = finalState.analysis
    
    console.log(`[Fast Agent] State machine completed successfully`)
  } catch (error) {
    console.error('[Fast Agent] State machine failed:', error)
    
    // Fallback to regular generation
    const normalizedDomain = dbDomain ? normalizeDomain(dbDomain) : undefined
    analysis = await analyzeTopicFast(topic, courseName, normalizedDomain)
    content = getFallbackTheory(topic, courseName, analysis.domainEnum || 'GENERAL')
    usedFallback = true
  }

  // Enrich content with AI-generated illustrations (пропускаем для fallback)
  if (!isFallbackContent(content)) {
    content = await enrichContentWithImages(content, analysis)
  } else {
    console.log('[Fast Agent] Skipping image enrichment for fallback content')
  }

  // Generate tasks in parallel
  let tasks = await generateTasksFast(analysis)
  
  // Get domain config for metadata
  const domainConfig = getConfigForTopic(topic, courseName)
  
  // Cache results
  const lessonCacheResult = setCachedLessonSmart(topic, courseName, content, analysis.domain)
  const tasksCacheResult = setCachedTasksSmart(topic, courseName, tasks)

  // Check quality and use fallback if needed
  if (lessonCacheResult.validation.score < 30) {
    console.warn(`[Fast Agent] ⚠️ Content quality too low (${lessonCacheResult.validation.score}), using fallback`)
    content = getFallbackTheory(topic, courseName, analysis.domainEnum || 'GENERAL')
    usedFallback = true
  }
  
  if (tasksCacheResult.validation.score < 25) {
    console.warn(`[Fast Agent] ⚠️ Tasks quality too low (${tasksCacheResult.validation.score}), using fallback`)
    tasks = getFallbackTasks(topic, analysis.domainEnum || 'GENERAL')
    usedFallback = true
  }

  const totalTime = Date.now() - startTime
  console.log(`\n[Fast Agent] DONE WITH STATE MACHINE in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`)
  console.log(`[Fast Agent] Domain: ${domainConfig.name}`)
  console.log(`[Fast Agent] Content: ${content.length} chars, Tasks: ${tasks.length}`)
  console.log(`[Fast Agent] Cached: lesson=${lessonCacheResult.cached}, tasks=${tasksCacheResult.cached}`)
  if (usedFallback) {
    console.log(`[Fast Agent] ⚠️ Used fallback content`)
  }

  const plan: LessonPlan = {
    title: topic,
    objectives: [`Понять ${topic}`, 'Применить на практике'],
    sections: domainConfig.sectionTemplates.map((t, i) => ({
      title: t.title,
      type: i === 0 ? 'intro' : i === domainConfig.sectionTemplates.length - 1 ? 'summary' : 'theory',
      keyPoints: analysis.keyTerms.slice(0, 3),
      estimatedMinutes: Math.ceil(t.minWords / 100)
    })),
    practiceIdeas: tasks.slice(0, 3).map(t => t.question)
  }

  return {
    content,
    analysis,
    plan,
    metadata: {
      generatedAt: new Date().toISOString(),
      totalTimeMs: totalTime,
      domain: analysis.domain,
      domainEnum: analysis.domainEnum,
      domainName: domainConfig.name,
      sectionsCount: domainConfig.sectionTemplates.length,
      tasksCount: tasks.length,
      fromCache: false,
      usedFallback,
      usedStateMachine: true,  // Flag to indicate state machine was used
      // Информация о валидации
      validation: {
        lessonCached: lessonCacheResult.cached,
        lessonScore: lessonCacheResult.validation.score,
        tasksCached: tasksCacheResult.cached,
        tasksScore: tasksCacheResult.validation.score,
        issues: [
          ...lessonCacheResult.validation.issues,
          ...tasksCacheResult.validation.issues
        ]
      }
    },
    tasks
  }
}
