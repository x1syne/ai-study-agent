/**
 * OPTIMIZED AI COURSE ARCHITECT
 * 
 * Ключевые оптимизации:
 * 1. Параллельная генерация секций (вместо последовательной)
 * 2. Кэширование результатов
 * 3. Мульти-провайдер с fallback
 * 4. Уменьшенные задержки
 */

import { generateWithRouter } from '@/lib/ai-router'
import { 
  getCachedLesson, setCachedLesson,
  getCachedTasks, setCachedTasks,
  getCachedAnalysis, setCachedAnalysis 
} from '@/lib/ai-cache'

// Types
export interface TopicAnalysis {
  topic: string
  courseName: string
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
async function analyzeTopicFast(topic: string, courseName: string): Promise<TopicAnalysis> {
  // Проверяем кэш
  const cached = getCachedAnalysis(topic, courseName)
  if (cached) {
    console.log('[Fast Agent] Using cached analysis')
    return cached
  }

  console.log('[Fast Agent] Analyzing topic...')
  
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
      nature: data.nature || ['conceptual'],
      complexity: data.complexity || { base: 5, depth: 5, prerequisites: [] },
      learningMethods: ['theory-practice-project'],
      contentFormats: data.contentFormats || ['practice_tasks'],
      connections: data.connections || { relatedTopics: [], realApplications: [], industries: [] },
      keyTerms: data.keyTerms || [topic],
      tone: data.tone || 'conversational',
      audience: 'Студенты',
      estimatedTime: data.estimatedTime || 20
    }
    
    setCachedAnalysis(topic, courseName, analysis)
    return analysis
  } catch (e) {
    console.error('[Fast Agent] Analysis failed:', e)
    return {
      topic, courseName,
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


// Определение типа темы
function getTopicType(analysis: TopicAnalysis): 'programming' | 'science' | 'general' {
  const topicLower = (analysis.topic + ' ' + analysis.courseName).toLowerCase()
  
  if (analysis.contentFormats.includes('code_examples') || 
      /программ|python|javascript|java|react|sql|код|алгоритм|ооп|api|web/i.test(topicLower)) {
    return 'programming'
  }
  
  if (analysis.contentFormats.includes('text_formulas') &&
      /физик|химик|математ|механик|геометр/i.test(topicLower)) {
    return 'science'
  }
  
  return 'general'
}

// Генерация одной секции
async function generateSection(
  title: string,
  prompt: string,
  systemPrompt: string
): Promise<string> {
  try {
    const result = await generateWithRouter('heavy', systemPrompt, prompt, {
      temperature: 0.7,
      maxTokens: 2000
    })
    return result.content && result.content.length > 50 ? result.content : ''
  } catch (e) {
    console.error(`[Fast Agent] Section "${title}" failed:`, e)
    return ''
  }
}

// ПАРАЛЛЕЛЬНАЯ генерация всех секций
async function generateAllSectionsParallel(analysis: TopicAnalysis): Promise<string> {
  console.log('[Fast Agent] Generating sections in PARALLEL...')
  
  const topicType = getTopicType(analysis)
  const baseContext = `Тема: "${analysis.topic}", Курс: "${analysis.courseName}"`
  
  const systemPrompt = `Ты профессор. Пиши на русском, используй ### заголовки, **жирный** текст, списки.
НЕ используй LaTeX. НЕ повторяй заголовок секции. Сразу начинай с контента.
${topicType === 'programming' ? 'Используй примеры кода в блоках ```python```.' : ''}
${topicType === 'science' ? 'Используй символы: ₀₁₂₃ × ÷ ± ≈ √ для формул.' : ''}`

  // Определяем секции для генерации
  const sections = [
    {
      title: 'Введение',
      prompt: `${baseContext}\n\nНапиши введение (400+ слов):\n- Зачем это нужно?\n- Где применяется (3-4 примера)\n- Что узнаете`
    },
    {
      title: 'Основные понятия',
      prompt: `${baseContext}\n\nОбъясни основные понятия (600+ слов):\n${analysis.keyTerms.map(t => `- ${t}`).join('\n')}\n\nДля каждого: определение, пример, связь с другими.`
    },
    {
      title: 'Как это работает',
      prompt: `${baseContext}\n\nОбъясни механизм работы (500+ слов):\n- Принцип работы\n- Пошаговый разбор\n- Аналогия для понимания`
    },
    {
      title: 'Практические примеры',
      prompt: `${baseContext}\n\nПокажи 3-4 практических примера (600+ слов):\n${topicType === 'programming' ? '- С кодом и комментариями' : '- С пошаговым разбором'}`
    },
    {
      title: 'Частые ошибки',
      prompt: `${baseContext}\n\nРазбери 5 частых ошибок (400+ слов):\n- Неправильно: ...\n- Правильно: ...\n- Как избежать`
    },
    {
      title: 'Итоги',
      prompt: `${baseContext}\n\nПодведи итоги (300+ слов):\n- Ключевые выводы\n- Чек-лист навыков\n- Что изучать дальше`
    }
  ]

  // ПАРАЛЛЕЛЬНАЯ генерация всех секций
  const startTime = Date.now()
  
  const results = await Promise.allSettled(
    sections.map(s => generateSection(s.title, s.prompt, systemPrompt))
  )
  
  console.log(`[Fast Agent] Parallel generation took ${Date.now() - startTime}ms`)

  // Собираем результаты
  const contentParts: string[] = []
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const section = sections[i]
    
    if (result.status === 'fulfilled' && result.value) {
      contentParts.push(`## ${section.title}\n\n${result.value}`)
    } else {
      contentParts.push(`## ${section.title}\n\n*Раздел генерируется...*`)
    }
  }

  return contentParts.join('\n\n---\n\n')
}


// Генерация практических заданий
async function generateTasksFast(analysis: TopicAnalysis): Promise<any[]> {
  // Проверяем кэш
  const cached = getCachedTasks(analysis.topic, analysis.courseName)
  if (cached) {
    console.log('[Fast Agent] Using cached tasks')
    return cached
  }

  console.log('[Fast Agent] Generating tasks...')
  
  const topicType = getTopicType(analysis)
  
  const prompt = `Создай 10 заданий по теме "${analysis.topic}".

Требования:
- 4 лёгких, 4 средних, 2 сложных
- Разные типы: single (выбор), multiple (несколько), text (ввод), number (число)
- Реальные примеры из жизни
${topicType === 'programming' ? '- Включи задания с кодом' : ''}

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
      'Создатель заданий. Отвечай ТОЛЬКО JSON.',
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
    
    setCachedTasks(analysis.topic, analysis.courseName, tasks)
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

// ГЛАВНАЯ ФУНКЦИЯ - оптимизированная версия
export async function runLessonAgentFast(
  topic: string,
  courseName: string
): Promise<{ content: string; analysis: TopicAnalysis; plan: LessonPlan; metadata: any; tasks: any[] }> {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`[Fast Agent] Starting: "${topic}"`)
  console.log(`${'='.repeat(50)}\n`)
  
  const startTime = Date.now()

  // Проверяем кэш урока
  const cachedLesson = getCachedLesson(topic, courseName)
  if (cachedLesson) {
    console.log('[Fast Agent] Using CACHED lesson!')
    const analysis = getCachedAnalysis(topic, courseName) || await analyzeTopicFast(topic, courseName)
    const tasks = getCachedTasks(topic, courseName) || await generateTasksFast(analysis)
    
    return {
      content: cachedLesson,
      analysis,
      plan: { title: topic, objectives: [], sections: [], practiceIdeas: [] },
      metadata: { fromCache: true, generatedAt: new Date().toISOString() },
      tasks
    }
  }

  // 1. Анализ темы
  const analysis = await analyzeTopicFast(topic, courseName)
  console.log(`[Fast Agent] Analysis done in ${Date.now() - startTime}ms`)

  // 2. ПАРАЛЛЕЛЬНАЯ генерация контента И заданий
  const [content, tasks] = await Promise.all([
    generateAllSectionsParallel(analysis),
    generateTasksFast(analysis)
  ])
  
  // Кэшируем результат
  if (content.length > 1000) {
    setCachedLesson(topic, courseName, content)
  }

  const totalTime = Date.now() - startTime
  console.log(`\n[Fast Agent] DONE in ${totalTime}ms (${(totalTime/1000).toFixed(1)}s)`)
  console.log(`[Fast Agent] Content: ${content.length} chars, Tasks: ${tasks.length}\n`)

  const plan: LessonPlan = {
    title: topic,
    objectives: [`Понять ${topic}`, 'Применить на практике'],
    sections: [
      { title: 'Введение', type: 'intro', keyPoints: [], estimatedMinutes: 5 },
      { title: 'Основные понятия', type: 'theory', keyPoints: analysis.keyTerms, estimatedMinutes: 10 },
      { title: 'Практика', type: 'practice', keyPoints: [], estimatedMinutes: 15 }
    ],
    practiceIdeas: tasks.slice(0, 3).map(t => t.question)
  }

  return {
    content,
    analysis,
    plan,
    metadata: {
      generatedAt: new Date().toISOString(),
      totalTimeMs: totalTime,
      sectionsCount: 6,
      tasksCount: tasks.length,
      fromCache: false
    },
    tasks
  }
}

// Экспорт для обратной совместимости
export { runLessonAgentFast as runLessonAgent }
