import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { streamWithRouter } from '@/lib/ai-router'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { getFullRAGContext } from '@/lib/rag'
import type { Domain } from '@/lib/ai/domain-prompts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Streaming API для генерации теории в реальном времени
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const topic = await prisma.topic.findUnique({
      where: { id: params.id },
      include: {
        module: { include: { goal: true } },
        lessons: { where: { type: 'THEORY' }, orderBy: { order: 'asc' } },
        progress: { where: { userId: user.id } },
      },
    })

    if (!topic) {
      return new Response('Topic not found', { status: 404 })
    }

    if (topic.module.goal.userId !== user.id) {
      return new Response('Access denied', { status: 403 })
    }

    // Если теория уже есть — возвращаем её сразу (не стримим)
    if (topic.lessons.length > 0) {
      const existingLesson = topic.lessons[0]
      const content = (existingLesson.content as any)?.markdown || ''
      
      // Возвращаем как обычный JSON
      return new Response(JSON.stringify({
        cached: true,
        topic: { id: topic.id, name: topic.name, description: topic.description, icon: topic.icon },
        content,
        lessonId: existingLesson.id,
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Создаём прогресс если нет
    let progress = topic.progress[0]
    if (!progress) {
      progress = await prisma.topicProgress.create({
        data: { userId: user.id, topicId: topic.id, status: 'IN_PROGRESS' },
      })
    } else if (progress.status === 'AVAILABLE') {
      await prisma.topicProgress.update({
        where: { id: progress.id },
        data: { status: 'IN_PROGRESS' },
      })
    }

    // Получаем RAG контекст
    const ragContext = await getFullRAGContext(topic.name, topic.module.goal.title, user.id)
    const goalDomain = topic.module.goal.domain as Domain

    // Формируем промпт
    const userPrompt = getStreamingTheoryPrompt(topic.name, topic.module.goal.title, ragContext, goalDomain)

    // Создаём ReadableStream для SSE
    const encoder = new TextEncoder()
    let fullContent = ''

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Отправляем начальное событие
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', topic: { id: topic.id, name: topic.name } })}\n\n`))

          // Стримим генерацию
          const streamGenerator = streamWithRouter(
            'heavy',
            SYSTEM_PROMPTS.theory,
            userPrompt,
            { temperature: 0.7, maxTokens: 16000 }
          )

          for await (const chunk of streamGenerator) {
            fullContent += chunk
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`))
          }

          // Сохраняем в базу
          const lesson = await prisma.lesson.create({
            data: {
              topicId: topic.id,
              userId: user.id,
              type: 'THEORY',
              title: 'Теория: ' + topic.name,
              content: { markdown: fullContent },
              difficulty: topic.difficulty,
              hints: [],
            },
          })

          // Отправляем финальное событие
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', lessonId: lesson.id })}\n\n`))
          controller.close()
        } catch (error) {
          console.error('[Stream] Error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Generation failed' })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[Stream] Error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

function getStreamingTheoryPrompt(topicName: string, courseTitle: string, context: string, domain: Domain): string {
  const domainHints: Record<Domain, string> = {
    PROGRAMMING: 'Включи примеры кода, объясни синтаксис и паттерны.',
    MATHEMATICS: 'Включи формулы, доказательства и пошаговые решения.',
    PHYSICS: 'Включи формулы, физические законы и примеры из реальной жизни.',
    CHEMISTRY: 'Включи уравнения реакций, молекулярные структуры.',
    BIOLOGY: 'Включи схемы процессов, классификации.',
    HISTORY: 'Включи даты, причинно-следственные связи, исторический контекст.',
    LANGUAGES: 'Включи примеры использования, грамматические правила.',
    ECONOMICS: 'Включи графики, формулы, экономические модели.',
    ARTS: 'Включи примеры произведений, анализ стилей.',
    MEDICINE: 'Включи анатомические детали, клинические примеры.',
    LAW: 'Включи ссылки на законы, судебную практику.',
    ENGINEERING: 'Включи технические расчёты, схемы.',
    GENERAL: 'Адаптируй под тему.',
  }

  const hint = domainHints[domain] || domainHints.GENERAL

  return `Напиши подробную лекцию по теме: "${topicName}"

Контекст курса: ${courseTitle}
Домен: ${domain}
${hint}

${context ? `\n[ДОПОЛНИТЕЛЬНЫЕ ИСТОЧНИКИ]:\n${context}` : ''}

ТРЕБОВАНИЯ:
- Минимум 3000 слов
- Структурированный материал с заголовками (## и ###)
- Примеры и практические применения
- Интерактивные блоки (quiz, code) где уместно
- Markdown форматирование`
}
