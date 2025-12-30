import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateWithRouter } from '@/lib/ai-router'
import { SYSTEM_PROMPTS, getGraphGenerationPrompt } from '@/lib/ai/prompts'
import { enrichContextWithArxiv } from '@/lib/arxiv'
import { getBookContext } from '@/lib/openlibrary'

export const dynamic = 'force-dynamic'

// Простой кэш для структуры курсов (в памяти)
const courseStructureCache = new Map<string, { data: any[]; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 часа

function getCacheKey(title: string, level: string): string {
  return `${title.toLowerCase().trim()}:${level}`
}

function getCachedStructure(title: string, level: string): any[] | null {
  const key = getCacheKey(title, level)
  const cached = courseStructureCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[Goals] Using cached course structure')
    return cached.data
  }
  return null
}

function setCachedStructure(title: string, level: string, data: any[]): void {
  const key = getCacheKey(title, level)
  courseStructureCache.set(key, { data, timestamp: Date.now() })
}

// GET /api/goals - Get all goals for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const goals = await prisma.goal.findMany({
      where: { userId: user.id },
      include: {
        topics: {
          include: {
            progress: {
              where: { userId: user.id },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(goals)
  } catch (error) {
    console.error('Error fetching goals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/goals - Create a new goal with AI-generated knowledge graph
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, skill, targetDate, level = 'beginner' } = body

    if (!title || !skill) {
      return NextResponse.json({ error: 'Title and skill are required' }, { status: 400 })
    }

    // Проверяем кэш структуры курса
    let topicsData = getCachedStructure(title, level)
    
    if (!topicsData) {
      console.log('[Goals] Generating new course structure...')
      const startTime = Date.now()
      
      // ПАРАЛЛЕЛЬНО: получаем контекст И генерируем базовую структуру
      const [externalContextResult, baseStructureResult] = await Promise.allSettled([
        // Внешние источники (не блокируем если упадут)
        Promise.all([
          enrichContextWithArxiv(title, { maxPapers: 2, forceSearch: true }).catch(() => ({ arxivContext: '' })),
          getBookContext(title).catch(() => '')
        ]),
        // Генерация структуры через AI Router (с fallback)
        generateWithRouter(
          'fast',
          SYSTEM_PROMPTS.graphGeneration,
          getGraphGenerationPrompt(title, level),
          { json: true, temperature: 0.7 }
        )
      ])

      // Обрабатываем результат структуры
      if (baseStructureResult.status === 'fulfilled') {
        try {
          const parsed = JSON.parse(baseStructureResult.value.content)
          topicsData = parsed.topics || []
          console.log(`[Goals] Structure generated via ${baseStructureResult.value.provider} in ${baseStructureResult.value.latencyMs}ms`)
        } catch {
          topicsData = null
        }
      }

      // Если AI не справился - fallback
      if (!topicsData || topicsData.length === 0) {
        console.log('[Goals] Using fallback structure')
        topicsData = [
          { slug: 'intro', name: 'Введение', description: 'Знакомство с темой', icon: '📚', difficulty: 'EASY', estimatedMinutes: 20, prerequisites: [], order: 1 },
          { slug: 'basics', name: 'Основы', description: 'Базовые концепции', icon: '🎯', difficulty: 'EASY', estimatedMinutes: 30, prerequisites: ['intro'], order: 2 },
          { slug: 'practice', name: 'Практика', description: 'Применение знаний', icon: '💻', difficulty: 'MEDIUM', estimatedMinutes: 45, prerequisites: ['basics'], order: 3 },
          { slug: 'advanced', name: 'Продвинутые темы', description: 'Углублённое изучение', icon: '🚀', difficulty: 'HARD', estimatedMinutes: 60, prerequisites: ['practice'], order: 4 },
        ]
      } else {
        // Кэшируем успешную структуру
        setCachedStructure(title, level, topicsData)
      }
      
      console.log(`[Goals] Total structure time: ${Date.now() - startTime}ms`)
    }

    // Create goal with topics
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title,
        skill,
        targetDate: targetDate ? new Date(targetDate) : null,
        topics: {
          create: topicsData.map((topic: any, index: number) => ({
            slug: topic.slug || `topic-${index}`,
            name: topic.name,
            description: topic.description || null,
            icon: topic.icon || '📚',
            difficulty: topic.difficulty || 'MEDIUM',
            estimatedMinutes: topic.estimatedMinutes || 30,
            order: topic.order || index + 1,
            prerequisiteIds: topic.prerequisites || [],
          })),
        },
      },
      include: {
        topics: true,
      },
    })

    // ПАРАЛЛЕЛЬНО: создаём прогресс И генерируем карточки
    const cardsPrompt = `Создай 30 карточек для запоминания по теме "${title}".
Формат JSON: {"cards": [{"front": "Вопрос", "back": "Ответ"}]}`

    const [, cardsResult] = await Promise.allSettled([
      // Создание прогресса
      prisma.topicProgress.createMany({
        data: goal.topics.map((topic: { id: string }) => ({
          userId: user.id,
          topicId: topic.id,
          status: 'AVAILABLE',
        })),
      }),
      // Генерация карточек (через heavy - дешевле)
      generateWithRouter(
        'heavy',
        'Создаёшь карточки для запоминания. Отвечай ТОЛЬКО JSON.',
        cardsPrompt,
        { json: true, temperature: 0.7, maxTokens: 3000 }
      )
    ])

    // Сохраняем карточки если получилось
    if (cardsResult.status === 'fulfilled') {
      try {
        const cardsData = JSON.parse(cardsResult.value.content)
        if (cardsData.cards?.length > 0) {
          await prisma.reviewCard.createMany({
            data: cardsData.cards.slice(0, 30).map((card: { front: string; back: string }) => ({
              userId: user.id,
              front: card.front,
              back: card.back,
              topicSlug: goal.topics[0]?.slug || 'general',
            })),
          })
          console.log(`[Goals] Generated ${cardsData.cards.length} cards via ${cardsResult.value.provider}`)
        }
      } catch (cardError) {
        console.warn('[Goals] Card generation failed (non-critical):', cardError)
      }
    }

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
