import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { streamWithRouter } from '@/lib/ai-router'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { getFullRAGContext } from '@/lib/rag'
import { enrichContentWithImages } from '@/lib/ai/agent-fast'
import { isFallbackContent } from '@/lib/ai/fallback-content'
import { validateTheoryContent } from '@/lib/ai/validators/content-validator'
import { enrichContentWithVideos, injectVideosIntoContent } from '@/lib/youtube'
import type { Domain } from '@/lib/ai/domain-prompts'
import { DOMAIN_TO_TYPE, getDomainPrompt } from '@/lib/ai/domain-prompts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Таймаут генерации (5 минут) — защита от зависших стримов */
const STREAM_TIMEOUT_MS = 5 * 60 * 1000
/** Минимальный score для сохранения в БД */
const MIN_QUALITY_SCORE = 30

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
      let content = (existingLesson.content as any)?.markdown || ''

      // Обогащаем видео для старого контента, если их ещё нет
      const hasYouTubeBlocks = /:::youtube\{/.test(content)
      if (!hasYouTubeBlocks && content.length > 500) {
        try {
          content = await injectVideosIntoContent(content, topic.name, topic.module.goal.title)
          // Сохраняем обогащённый контент обратно в БД
          if (content !== ((existingLesson.content as any)?.markdown || '')) {
            await prisma.lesson.update({
              where: { id: existingLesson.id },
              data: {
                content: {
                  ...((existingLesson.content as any) || {}),
                  markdown: content,
                },
              },
            })
          }
        } catch (e) {
          console.warn('[Stream] Video enrichment for cached content failed:', e)
        }
      }
      
      return new Response(JSON.stringify({
        cached: true,
        topic: { id: topic.id, name: topic.name, description: topic.description, icon: topic.icon },
        goalId: topic.module.goal.id,
        content,
        lessonId: existingLesson.id,
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const goalDomain = topic.module.goal.domain as Domain

    const encoder = new TextEncoder()
    let fullContent = ''

    const stream = new ReadableStream({
      async start(controller) {
        // Таймаут: защита от зависших генераций
        const timeout = setTimeout(() => {
          console.error('[Stream] Timeout reached, closing stream')
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Generation timeout' })}\n\n`))
          controller.close()
        }, STREAM_TIMEOUT_MS)

        try {
          // 1. Отправляем start мгновенно — UI убирает кружок загрузки
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', topic: { id: topic.id, name: topic.name }, goalId: topic.module.goal.id })}\n\n`))

          // 2. Прогресс + RAG параллельно
          const [ragContext] = await Promise.all([
            getFullRAGContext(topic.name, topic.module.goal.title, user.id),
            (async () => {
              let progress = topic.progress[0]
              if (!progress) {
                await prisma.topicProgress.create({ data: { userId: user.id, topicId: topic.id, status: 'IN_PROGRESS' } })
              } else if (progress.status === 'AVAILABLE') {
                await prisma.topicProgress.update({ where: { id: progress.id }, data: { status: 'IN_PROGRESS' } })
              }
            })()
          ])

          // 3. Формируем domain-specific системный промпт + user промпт
          const systemPrompt = buildDomainSystemPrompt(goalDomain)
          const userPrompt = getStreamingTheoryPrompt(topic.name, topic.module.goal.title, ragContext, goalDomain)

          const streamGenerator = streamWithRouter(
            'heavy',
            systemPrompt,
            userPrompt,
            { temperature: 0.7, maxTokens: 16000 }
          )

          for await (const chunk of streamGenerator) {
            fullContent += chunk
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`))
          }

          // 4. Валидация качества перед сохранением
          const validation = validateTheoryContent(fullContent, goalDomain)
          console.log(`[Stream] Quality score: ${validation.score}/100, issues: ${validation.issues.length}`)

          if (validation.score < MIN_QUALITY_SCORE) {
            console.warn(`[Stream] Content quality too low (${validation.score}), marking for re-generation`)
          }

          // 5. Генерируем иллюстрации (только для нормального контента, не fallback)
          if (!isFallbackContent(fullContent) && validation.score >= MIN_QUALITY_SCORE) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'images_loading' })}\n\n`))
            const domainType = DOMAIN_TO_TYPE[goalDomain] || 'general'
            const enrichedContent = await enrichContentWithImages(fullContent, {
              topic: topic.name,
              domain: domainType as any,
            })

            if (enrichedContent !== fullContent) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content_replace', content: enrichedContent })}\n\n`))
              fullContent = enrichedContent
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'images_done' })}\n\n`))
          }

          // 5b. Обогащаем видеоматериалами из YouTube
          if (!isFallbackContent(fullContent)) {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'videos_loading' })}\n\n`))
              // Сначала обрабатываем :::video{query="..."} если AI их сгенерировал
              let videoContent = await enrichContentWithVideos(fullContent)
              // Если видео-блоков нет — инжектим автоматически
              videoContent = await injectVideosIntoContent(videoContent, topic.name, topic.module.goal.title)

              if (videoContent !== fullContent) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content_replace', content: videoContent })}\n\n`))
                fullContent = videoContent
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'videos_done' })}\n\n`))
            } catch (videoError) {
              console.warn('[Stream] Video enrichment failed:', videoError)
            }
          }

          // 6. Сохраняем в базу
          const lesson = await prisma.lesson.create({
            data: {
              topicId: topic.id,
              userId: user.id,
              type: 'THEORY',
              title: 'Теория: ' + topic.name,
              content: {
                markdown: fullContent,
                quality: { score: validation.score, issues: validation.issues.slice(0, 5) }
              },
              difficulty: topic.difficulty,
              hints: [],
            },
          })

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', lessonId: lesson.id })}\n\n`))
          clearTimeout(timeout)
          controller.close()
        } catch (error) {
          clearTimeout(timeout)
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

/**
 * Строит domain-specific системный промпт.
 * Объединяет базовый SYSTEM_PROMPTS.theory с domain-specific инструкциями.
 */
function buildDomainSystemPrompt(domain: Domain): string {
  const basePrompt = SYSTEM_PROMPTS.theory

  // Пробуем получить domain-specific промпт
  try {
    const domainPrompt = getDomainPrompt(domain)
    if (domainPrompt && domainPrompt.systemPrompt) {
      return `${basePrompt}\n\n═══════════════════════════════════════════════════════════════
🔬 DOMAIN-SPECIFIC ИНСТРУКЦИИ (${domain}):
═══════════════════════════════════════════════════════════════
${domainPrompt.systemPrompt}

${domainPrompt.exampleContent ? `ПРИМЕР ЭТАЛОННОГО КОНТЕНТА:\n${domainPrompt.exampleContent.slice(0, 1000)}` : ''}`
    }
  } catch (e) {
    console.warn(`[Stream] Failed to get domain prompt for ${domain}:`, e)
  }

  return basePrompt
}

function getStreamingTheoryPrompt(topicName: string, courseTitle: string, context: string, domain: Domain): string {
  const domainHints: Record<Domain, string> = {
    PROGRAMMING: 'Включи минимум 5 рабочих примеров кода с комментариями и выводом. Покажи паттерны и антипаттерны. Биг-О сложность где релевантно.',
    MATHEMATICS: 'Формулы в LaTeX. Пошаговые выводы с конкретными числами. Геометрическая интуиция. Доказательства ключевых теорем.',
    PHYSICS: 'Формулы в LaTeX. Физическая интуиция через мысленные эксперименты. Единицы СИ. Численные примеры с подстановкой значений.',
    CHEMISTRY: 'Уравнения реакций с коэффициентами. Молекулярные структуры. Механизмы реакций. Практические примеры из жизни.',
    BIOLOGY: 'Схемы биологических процессов. Классификации с примерами. Сравнительные таблицы. Эволюционный контекст.',
    HISTORY: 'Даты и хронология. ПРИЧИНЫ → СОБЫТИЯ → ПОСЛЕДСТВИЯ. Разные точки зрения. Первоисточники.',
    LANGUAGES: 'Примеры в контексте. Грамматические правила с исключениями. Сравнение с родным языком. Мнемоники.',
    ECONOMICS: 'Модели с формулами. Реальные данные и статистика. Кейсы компаний/стран. Графики спроса/предложения.',
    ARTS: 'Примеры конкретных произведений. Анализ стилей и техник. Исторический контекст эпохи. Влияние на современность.',
    MEDICINE: 'Анатомические детали. Клинические примеры. Доказательная медицина. Дифференциальная диагностика.',
    LAW: 'Ссылки на конкретные статьи законов. Судебная практика с примерами дел. Комментарии к нормам.',
    ENGINEERING: 'Технические расчёты с формулами. Схемы и чертежи. Стандарты (ГОСТ/ISO). Практические примеры проектирования.',
    GENERAL: 'Адаптируй под тему: конкретные примеры, сравнительные таблицы, практические применения.',
  }

  const hint = domainHints[domain] || domainHints.GENERAL

  return `══════════════════════════════════════════════════════
🎯 ТЕМА: "${topicName}"
📚 КУРС: "${courseTitle}"
🌐 ДОМЕН: ${domain}
══════════════════════════════════════════════════════

Напиши ПОЛНОЦЕННУЮ ЛЕКЦИЮ по теме "${topicName}" по структуре из system prompt.
Это должен быть материал уровня лучших онлайн-курсов, после которого студент РЕАЛЬНО разберётся в теме.

СПЕЦИФИКА ДОМЕНА:
${hint}

${context ? `[ДОПОЛНИТЕЛЬНЫЕ ИСТОЧНИКИ (используй для обогащения материала)]:
${context}
` : ''}
ТРЕБОВАНИЯ К КАЧЕСТВУ:
- МИНИМУМ 4000 слов. Каждая концепция — 3-5 абзацев с конкретными примерами
- Каждое предложение = новая информация (НИКАКОЙ воды!)
- Год 2026: если тема устарела — честно скажи и объясни, зачем учить
- Сравнительные таблицы — обязательно, где есть что сравнить
- Код рабочий и копируемый, с выводом/результатом после каждого блока
- LaTeX формулы НЕ внутри ячеек таблиц (рендерятся криво) — только до/после таблицы
- 2-3 интерактивных quiz-блока ВНУТРИ текста (после объяснения концепции, не в конце)
- Минимум 3-5 ключевых концепций с глубоким разбором каждой`
}
