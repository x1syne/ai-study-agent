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

import { generateWithRouter } from '@/lib/ai-router'
import { 
  getCachedLesson,
  getCachedTasks,
  getCachedAnalysis, setCachedAnalysis,
  setCachedLessonSmart, setCachedTasksSmart
} from '@/lib/ai-cache'
import { getFullRAGContext, getDomainRAGContext } from '@/lib/rag'
import { getFallbackTheory, getFallbackTasks } from './fallback-content'
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
async function analyzeTopicFast(
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


// Результат генерации секции с информацией о провайдере
interface SectionResult {
  content: string
  provider?: string
}

// Генерация одной секции с domain-specific промптом
// Requirements: 4.2 - использовать getDomainPrompt для выбора промпта
// Requirements: 4.5 - AI сам структурирует контент до наилучшей версии
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

  try {
    const result = await generateWithRouter('heavy', fullSystemPrompt, sectionPrompt, {
      temperature: 0.7,
      maxTokens: 2500  // Увеличено для более детального контента
    })
    return {
      content: result.content && result.content.length > 50 ? result.content : '',
      provider: result.provider
    }
  } catch (e) {
    console.error(`[Fast Agent] Section "${template.title}" failed:`, e)
    return { content: '', provider: undefined }
  }
}

// ПАРАЛЛЕЛЬНАЯ генерация всех секций с domain-specific шаблонами
// Requirements: 4.2 - использовать getDomainPrompt для выбора промпта
async function generateAllSectionsParallel(
  analysis: TopicAnalysis,
  ragContext: string = ''
): Promise<{ content: string; providers: string[] }> {
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

  // Собираем результаты и провайдеры
  const contentParts: string[] = []
  const usedProviders: string[] = []
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const template = domainConfig.sectionTemplates[i]
    
    if (result.status === 'fulfilled' && result.value.content) {
      contentParts.push(`## ${template.title}\n\n${result.value.content}`)
      if (result.value.provider && !usedProviders.includes(result.value.provider)) {
        usedProviders.push(result.value.provider)
      }
    } else if (template.required) {
      // Для обязательных секций добавляем placeholder
      contentParts.push(`## ${template.title}\n\n*Раздел генерируется...*`)
    }
  }

  return {
    content: contentParts.join('\n\n---\n\n'),
    providers: usedProviders
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
  
  const prompt = `Создай 10 заданий по теме "${analysis.topic}" (${domainConfig.name}).

Требования:
- 4 лёгких, 4 средних, 2 сложных
- Разные типы: single (выбор), multiple (несколько), text (ввод), number (число)
- Реальные примеры из жизни
- ${domainTaskInstructions[analysis.domain]}

JSON формат:
{
  "tasks": [
    {
      "id": 1,
      "type": "single",
      "difficulty": "easy",
      "question": "Вопрос?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Объяснение"
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
    const tasks = (data.tasks || []).map((t: any, i: number) => ({
      id: t.id || i + 1,
      type: t.type || 'single',
      difficulty: t.difficulty || 'medium',
      question: t.question || 'Вопрос',
      options: t.options || [],
      correctAnswer: t.correctAnswer ?? 0,
      correctAnswers: t.correctAnswers || [],
      explanation: t.explanation || '',
      hint: t.hint || ''
    }))
    
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
