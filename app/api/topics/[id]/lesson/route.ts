import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateWithRouter } from '@/lib/ai-router'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { getFullRAGContext } from '@/lib/rag'
// Используем оптимизированный агент с параллельной генерацией и state machine
import { runLessonAgentFast as runLessonAgent, runLessonAgentWithStateMachine } from '@/lib/ai/agent-fast'
import { getFallbackTheory } from '@/lib/ai/fallback-content'
import type { Domain } from '@/lib/ai/domain-prompts'
import { 
  buildUnifiedPracticePrompt,
  validateDifficultyDistribution 
} from '@/lib/ai/domain-prompts'
// Quality Gateway для проверки качества контента
import { 
  processContentThroughGatewaySync,
  logQualityMetrics,
  formatQualityForResponse 
} from '@/lib/ai/quality-gateway'

// Обёртка для совместимости со старым API
async function generateCompletion(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number; json?: boolean }
): Promise<string> {
  const result = await generateWithRouter(
    'heavy', // Используем heavy для генерации контента
    systemPrompt,
    userPrompt,
    options
  )
  return result.content
}

// Всегда используем оптимизированный агент
const USE_AGENT = true

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[API] Fetching lesson for topic:', params.id)
    
    const user = await getCurrentUser()
    if (!user) {
      console.log('[API] User not authenticated')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[API] User authenticated:', user.id)

    const { searchParams } = new URL(_request.url)
    const lessonType = searchParams.get('type') || 'theory'
    console.log('[API] Lesson type:', lessonType)

    const topic = await prisma.topic.findUnique({
      where: { id: params.id },
      include: {
        module: {
          include: { goal: true }
        },
        lessons: { where: { type: lessonType.toUpperCase() as any }, orderBy: { order: 'asc' } },
        progress: { where: { userId: user.id } },
      },
    })

    console.log('[API] Topic found:', !!topic)
    if (topic) {
      console.log('[API] Topic belongs to goal:', topic.module.goal.id, 'owned by:', topic.module.goal.userId)
      console.log('[API] Current user:', user.id)
      console.log('[API] Progress records:', topic.progress.length)
    }

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    // Проверяем доступ к цели
    if (topic.module.goal.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let progress = topic.progress[0]
    if (!progress) {
      progress = await prisma.topicProgress.create({
        data: { userId: user.id, topicId: topic.id, status: 'AVAILABLE' },
      })
    }

    // Если тема заблокирована, проверяем пререквизиты
    if (progress.status === 'LOCKED') {
      // Получаем все темы модуля с прогрессом
      const allTopics = await prisma.topic.findMany({
        where: { moduleId: topic.moduleId },
        include: { progress: { where: { userId: user.id } } }
      })

      // Проверяем, выполнены ли все пререквизиты
      const prerequisitesMet = topic.prerequisiteIds.every((prereqId: string) => {
        const prereqTopic = allTopics.find((t: { id: string }) => t.id === prereqId)
        if (!prereqTopic) return true // Если пререквизит не найден, считаем выполненным
        const prereqProgress = prereqTopic.progress[0]
        return prereqProgress && (prereqProgress.status === 'COMPLETED' || prereqProgress.status === 'MASTERED')
      })

      // Если пререквизиты выполнены, разблокируем тему
      if (prerequisitesMet) {
        progress = await prisma.topicProgress.update({
          where: { id: progress.id },
          data: { status: 'AVAILABLE' }
        })
      }
    }

    if (topic.lessons.length > 0) {
      const existingLesson = topic.lessons[0]
      if (lessonType === 'practice') {
        const content = existingLesson.content as any
        if (!content?.tasks || !Array.isArray(content.tasks) || content.tasks.length === 0) {
          await prisma.lesson.delete({ where: { id: existingLesson.id } })
        } else {
          return NextResponse.json({
            topic: { id: topic.id, name: topic.name, description: topic.description, icon: topic.icon },
            lesson: existingLesson,
            progress,
          })
        }
      } else {
        return NextResponse.json({
          topic: { id: topic.id, name: topic.name, description: topic.description, icon: topic.icon },
          lesson: existingLesson,
          progress,
        })
      }
    }

    let content: any
    let qualityInfo: any = null

    if (lessonType === 'theory') {
      try {
        if (USE_AGENT) {
          // Оптимизированный агент с state machine для надёжной генерации
          // Requirements: 7.1, 7.2, 7.3, 7.4, 7.5 - state machine integration
          const goalDomain = topic.module.goal.domain as Domain
          
          // Use state machine for theory generation with progress tracking
          const agentResult = await runLessonAgentWithStateMachine(
            topic.name, 
            topic.module.goal.title, 
            user.id, 
            goalDomain,
            // Progress callback for UI updates (can be extended later)
            (progressEvent) => {
              console.log(`[API] Theory generation progress: ${progressEvent.phase}`)
            }
          )
          
          // Пропускаем через Quality Gateway (sync — без retry в этом route)
          const gatewayResult = processContentThroughGatewaySync({
            content: agentResult.content,
            tasks: agentResult.tasks || [],
            topicName: topic.name,
            courseName: topic.module.goal.title,
            domain: goalDomain
          })
          
          // Логируем метрики качества
          logQualityMetrics(topic.name, gatewayResult)
          
          // Сохраняем информацию о качестве
          qualityInfo = formatQualityForResponse(gatewayResult)
          
          content = { 
            markdown: gatewayResult.content,
            analysis: agentResult.analysis,
            plan: agentResult.plan,
            metadata: {
              ...agentResult.metadata,
              quality: qualityInfo
            }
          }
        } else {
          // Fallback: используем getFullRAGContext
          const allContext = await getFullRAGContext(topic.name, topic.module.goal.title, user.id)
          const prompt = getTheoryPrompt(topic.name, topic.module.goal.title, allContext)
          const response = await generateCompletion(SYSTEM_PROMPTS.theory, prompt, { temperature: 0.7, maxTokens: 16000 })
          content = { markdown: response }
        }
      } catch (e) {
        console.error('AI generation failed:', e)
        const goalDomainFallback = topic.module.goal.domain as Domain
        content = { markdown: getFallbackTheory(topic.name, topic.module.goal.title, goalDomainFallback) }
      }
    } else if (lessonType === 'practice') {
      const theoryLesson = await prisma.lesson.findFirst({ where: { topicId: topic.id, type: 'THEORY' } })
      // Requirement 1: Pass domain for domain-specific practice generation
      const goalDomain = topic.module.goal.domain as Domain
      if (theoryLesson?.content) {
        const theoryContent = (theoryLesson.content as any).markdown || ''
        content = await generatePracticeFromTheory(topic.name, topic.module.goal.title, theoryContent, goalDomain)
      } else {
        content = await generatePracticeTasks(topic.name, topic.module.goal.title, goalDomain)
      }
    } else {
      // Любой другой тип — генерируем как практику
      const goalDomain = topic.module.goal.domain as Domain
      content = await generatePracticeTasks(topic.name, topic.module.goal.title, goalDomain)
    }

    const lesson = await prisma.lesson.create({
      data: {
        topicId: topic.id,
        userId: user.id,
        type: lessonType.toUpperCase() as any,
        title: lessonType === 'theory' ? 'Теория: ' + topic.name : 'Практика: ' + topic.name,
        content,
        difficulty: topic.difficulty,
        hints: content?.hints || [],
        solution: content?.solution,
      },
    })

    if (progress.status === 'AVAILABLE') {
      await prisma.topicProgress.update({ where: { id: progress.id }, data: { status: 'IN_PROGRESS' } })
    }

    return NextResponse.json({
      topic: { id: topic.id, name: topic.name, description: topic.description, icon: topic.icon },
      lesson,
      progress: { ...progress, status: 'IN_PROGRESS' },
      quality: qualityInfo, // Информация о качестве контента
      provider: content?.metadata?.provider || 'unknown', // Какой AI провайдер использовался
    })
  } catch (error) {
    console.error('Error fetching lesson:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const progress = await prisma.topicProgress.findFirst({ where: { topicId: params.id, userId: user.id } })
    if (!progress) return NextResponse.json({ error: 'Progress not found' }, { status: 404 })

    await prisma.topicProgress.update({
      where: { id: progress.id },
      data: { theoryCompleted: true, masteryLevel: Math.min(progress.masteryLevel + 30, 100) },
    })

    const existingStats = await prisma.userStats.findUnique({ where: { userId: user.id } })
    if (existingStats) {
      await prisma.userStats.update({ where: { userId: user.id }, data: { totalLessons: { increment: 1 }, lastActiveDate: new Date() } })
    } else {
      await prisma.userStats.create({ data: { userId: user.id, totalLessons: 1, lastActiveDate: new Date() } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error completing lesson:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getTheoryPrompt(topicName: string, courseTitle: string, context: string): string {
  const base = 'Ты профессор ведущего университета. Напиши ПОЛНОЦЕННУЮ ЛЕКЦИЮ по теме: "' + topicName + '"\n\nКонтекст курса: ' + courseTitle
  const contextPart = context ? '\n\n[ИСТОЧНИКИ]:\n' + context : ''
  const structure = '\n\n## ВВЕДЕНИЕ\n## ТЕОРЕТИЧЕСКИЕ ОСНОВЫ\n## ГЛУБОКИЙ АНАЛИЗ\n## ПРАКТИЧЕСКИЕ ПРИМЕРЫ\n## ПРОДВИНУТЫЙ УРОВЕНЬ\n## ТИПИЧНЫЕ ОШИБКИ\n## ИТОГИ\n\nТРЕБОВАНИЯ: МИНИМУМ 6000 слов, Markdown'
  return base + contextPart + structure
}

// getFallbackTheory импортирован из @/lib/ai/fallback-content (единый источник)

/** Максимальный размер теории, передаваемой в промпт (не обрезаем слишком агрессивно) */
const MAX_THEORY_EXCERPT_LENGTH = 12000

async function generatePracticeFromTheory(topicName: string, courseTitle: string, theoryContent: string, domain: Domain = 'GENERAL') {
  try {
    const theoryExcerpt = theoryContent.slice(0, MAX_THEORY_EXCERPT_LENGTH)

    // Unified practice prompt — single source of truth from domain-prompts.ts
    const prompt = buildUnifiedPracticePrompt(domain, topicName, courseTitle, theoryExcerpt)

    console.log(`[Practice] Generating tasks for topic="${topicName}", domain=${domain}, theoryLen=${theoryExcerpt.length}`)
    const response = await generateCompletion(SYSTEM_PROMPTS.taskGeneration, prompt, { json: true, temperature: 0.7, maxTokens: 12000 })
    const content = JSON.parse(response)

    if (!content.tasks || content.tasks.length < 3) throw new Error('Invalid tasks count: ' + (content.tasks?.length || 0))

    // Validate, deduplicate, check distribution
    const validatedTasks = validateAndFixTasks(content.tasks)
    const uniqueTasks = deduplicateTasks(validatedTasks)

    const distribution = validateDifficultyDistribution(uniqueTasks)
    console.log('[Practice] Distribution:', distribution.distribution, 'Total:', distribution.total)
    if (!distribution.isValid) {
      console.warn('[Practice] Distribution issues:', distribution.issues)
    }

    console.log(`[Practice] Raw=${content.tasks.length}, validated=${validatedTasks.length}, unique=${uniqueTasks.length}`)

    if (uniqueTasks.length < 3) {
      throw new Error('Not enough valid tasks after validation: ' + uniqueTasks.length)
    }

    return { tasks: uniqueTasks }
  } catch (e) {
    console.error('[Practice] Practice from theory failed:', e)
    // Fallback: генерация без теории, но с domain
    return generatePracticeTasks(topicName, courseTitle, domain)
  }
}

/**
 * Validate and fix individual tasks
 */
function validateAndFixTasks(tasks: any[]): any[] {
  return tasks.map((task: any, idx: number) => {
    // Check question is not empty and long enough
    if (!task.question || task.question.length < 15) {
      console.log('[Practice] Task ' + idx + ' has invalid question, skipping')
      return null
    }
    
    // For code questions - check that code is in the question
    const codeQuestionPatterns = /что выведет|какой результат|что вернёт|что напечатает|что будет выведено|результат выполнения/i
    if (codeQuestionPatterns.test(task.question) && !task.question.includes('```') && task.type === 'single') {
      console.log('[Practice] Task ' + idx + ' asks about code but has no code block, skipping')
      return null
    }
    
    // For single - check options
    if (task.type === 'single') {
      if (!task.options || !Array.isArray(task.options) || task.options.length < 2) {
        console.log('[Practice] Task ' + idx + ' single has invalid options, skipping')
        return null
      }
      if (typeof task.correctAnswer !== 'number' || task.correctAnswer < 0 || task.correctAnswer >= task.options.length) {
        task.correctAnswer = 0
      }
    }
    
    // For multiple - check correctAnswers
    if (task.type === 'multiple') {
      if (!task.options || !Array.isArray(task.options) || task.options.length < 2) {
        console.log('[Practice] Task ' + idx + ' multiple has invalid options, skipping')
        return null
      }
      if (!task.correctAnswers || !Array.isArray(task.correctAnswers) || task.correctAnswers.length === 0) {
        task.correctAnswers = [0]
      }
    }
    
    // For number - check correctAnswer
    if (task.type === 'number') {
      if (typeof task.correctAnswer !== 'number' && typeof task.correctAnswer !== 'string') {
        console.log('[Practice] Task ' + idx + ' number has invalid correctAnswer, skipping')
        return null
      }
      task.correctAnswer = parseFloat(task.correctAnswer)
      if (isNaN(task.correctAnswer)) return null
      task.tolerance = task.tolerance || 0.01
    }
    
    // For text - check correctAnswers
    if (task.type === 'text') {
      if (!task.correctAnswers) {
        if (task.correctAnswer) {
          task.correctAnswers = [String(task.correctAnswer)]
        } else {
          console.log('[Practice] Task ' + idx + ' text has no correctAnswers, skipping')
          return null
        }
      }
      if (!Array.isArray(task.correctAnswers)) {
        task.correctAnswers = [String(task.correctAnswers)]
      }
    }
    
    // For code - check required fields
    if (task.type === 'code') {
      if (!task.language) task.language = 'python'
      if (!task.starterCode) task.starterCode = '// Напишите код здесь\n'
      if (!task.solution) {
        console.log('[Practice] Task ' + idx + ' code has no solution, skipping')
        return null
      }
    }
    
    // For matching - check required fields
    if (task.type === 'matching') {
      if (!task.leftItems || !task.rightItems || !task.correctPairs) {
        console.log('[Practice] Task ' + idx + ' matching has missing fields, skipping')
        return null
      }
    }
    
    // Add id and difficulty if missing
    task.id = task.id || idx + 1
    task.difficulty = task.difficulty || 'medium'
    task.explanation = task.explanation || 'Смотрите теорию по данной теме.'
    
    return task
  }).filter(Boolean)
}

/** Минимальная длина нормализованной строки для сравнения дубликатов */
const DEDUP_SLICE_LENGTH = 80

/**
 * Remove duplicate tasks based on question similarity.
 * Uses longer slice (80 chars) to avoid false positives on questions
 * that start the same way but ask different things.
 */
function deduplicateTasks(tasks: any[]): any[] {
  const seenQuestions = new Set<string>()
  return tasks.filter((task: any) => {
    if (!task.question) return false
    const normalized = task.question.toLowerCase().replace(/[^а-яa-z0-9]/g, '').slice(0, DEDUP_SLICE_LENGTH)
    if (seenQuestions.has(normalized)) {
      console.log('[Practice] Removed duplicate:', task.question.slice(0, 60))
      return false
    }
    seenQuestions.add(normalized)
    return true
  })
}

/**
 * Fallback practice generation (without theory content).
 * Uses buildUnifiedPracticePrompt with empty theory — so the same
 * topic-binding rules apply. Domain is always passed.
 */
async function generatePracticeTasks(topicName: string, courseTitle: string, domain: Domain = 'GENERAL') {
  try {
    // Reuse unified prompt even without theory — keeps topic-binding logic
    const prompt = buildUnifiedPracticePrompt(domain, topicName, courseTitle, '')

    console.log(`[Practice] Fallback generation for topic="${topicName}", domain=${domain}`)
    const response = await generateCompletion(SYSTEM_PROMPTS.taskGeneration, prompt, { json: true, temperature: 0.6, maxTokens: 12000 })
    const content = JSON.parse(response)

    if (!content.tasks || content.tasks.length < 3) throw new Error('Invalid tasks count: ' + (content.tasks?.length || 0))

    const validatedTasks = validateAndFixTasks(content.tasks)
    const uniqueTasks = deduplicateTasks(validatedTasks)

    console.log(`[Practice] Fallback: raw=${content.tasks.length}, validated=${validatedTasks.length}, unique=${uniqueTasks.length}`)

    if (uniqueTasks.length < 3) throw new Error('Not enough valid tasks: ' + uniqueTasks.length)

    return { tasks: uniqueTasks }
  } catch (e) {
    console.error('[Practice] Fallback generation failed:', e)
    return {
      tasks: [{
        id: 1, type: 'single', difficulty: 'easy',
        question: `Какое утверждение о теме "${topicName}" является верным?`,
        options: [
          `Это раздел курса "${courseTitle}"`,
          'Эта тема не связана с курсом',
          'Эта тема устарела',
          'Тема не имеет практического применения'
        ],
        correctAnswer: 0,
        hint: 'Подумай о связи темы с курсом',
        explanation: `Тема "${topicName}" является частью курса "${courseTitle}".`
      }]
    }
  }
}
