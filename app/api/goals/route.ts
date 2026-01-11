import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateWithRouter } from '@/lib/ai-router'
import { SYSTEM_PROMPTS, getGraphGenerationPrompt } from '@/lib/ai/prompts'
import { getFullRAGContext } from '@/lib/rag'

export const dynamic = 'force-dynamic'

// Типы для иерархической структуры курса
interface GeneratedTopic {
  slug: string
  name: string
  description?: string
  icon?: string
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'
  estimatedMinutes?: number
  order?: number
  prerequisites?: string[]
}

interface GeneratedModule {
  name: string
  description?: string
  icon?: string
  order: number
  topics: GeneratedTopic[]
}

interface GeneratedCourse {
  modules: GeneratedModule[]
}

// Простой кэш для структуры курсов (в памяти)
const courseStructureCache = new Map<string, { data: GeneratedModule[]; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 часа

function getCacheKey(title: string, level: string): string {
  return `${title.toLowerCase().trim()}:${level}`
}

function getCachedStructure(title: string, level: string): GeneratedModule[] | null {
  const key = getCacheKey(title, level)
  const cached = courseStructureCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[Goals] Using cached course structure')
    return cached.data
  }
  return null
}

function setCachedStructure(title: string, level: string, data: GeneratedModule[]): void {
  const key = getCacheKey(title, level)
  courseStructureCache.set(key, { data, timestamp: Date.now() })
}

// Fallback структура с модулями
function getFallbackModules(): GeneratedModule[] {
  return [
    {
      name: 'Введение',
      description: 'Знакомство с темой и базовые понятия',
      icon: '📚',
      order: 1,
      topics: [
        { slug: 'intro', name: 'Введение', description: 'Знакомство с темой', icon: '📖', difficulty: 'EASY', estimatedMinutes: 15, order: 1, prerequisites: [] },
        { slug: 'basics', name: 'Основы', description: 'Базовые концепции', icon: '🎯', difficulty: 'EASY', estimatedMinutes: 20, order: 2, prerequisites: ['intro'] },
      ]
    },
    {
      name: 'Практика',
      description: 'Применение знаний на практике',
      icon: '💻',
      order: 2,
      topics: [
        { slug: 'practice', name: 'Практика', description: 'Применение знаний', icon: '💻', difficulty: 'MEDIUM', estimatedMinutes: 30, order: 1, prerequisites: ['basics'] },
      ]
    },
    {
      name: 'Продвинутый уровень',
      description: 'Углублённое изучение темы',
      icon: '🚀',
      order: 3,
      topics: [
        { slug: 'advanced', name: 'Продвинутые темы', description: 'Углублённое изучение', icon: '🚀', difficulty: 'HARD', estimatedMinutes: 45, order: 1, prerequisites: ['practice'] },
      ]
    },
  ]
}

// Валидация и нормализация структуры модулей
function validateAndNormalizeModules(modules: any[]): GeneratedModule[] | null {
  if (!Array.isArray(modules) || modules.length === 0) {
    return null
  }

  // Проверяем что модули имеют правильную структуру
  const validModules: GeneratedModule[] = []
  
  for (let i = 0; i < modules.length; i++) {
    const mod = modules[i]
    if (!mod.name || !Array.isArray(mod.topics) || mod.topics.length === 0) {
      continue
    }

    const validTopics: GeneratedTopic[] = []
    for (let j = 0; j < mod.topics.length; j++) {
      const topic = mod.topics[j]
      if (!topic.name) continue
      
      validTopics.push({
        slug: topic.slug || `topic-${i + 1}-${j + 1}`,
        name: topic.name,
        description: topic.description || null,
        icon: topic.icon || '📚',
        difficulty: topic.difficulty || 'MEDIUM',
        estimatedMinutes: topic.estimatedMinutes || 30,
        order: topic.order || j + 1,
        prerequisites: topic.prerequisites || [],
      })
    }

    if (validTopics.length > 0) {
      validModules.push({
        name: mod.name,
        description: mod.description || null,
        icon: mod.icon || '📚',
        order: mod.order || i + 1,
        topics: validTopics,
      })
    }
  }

  return validModules.length > 0 ? validModules : null
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
        modules: {
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
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Transform to include progress directly on topics
    const transformedGoals = goals.map(goal => ({
      ...goal,
      modules: goal.modules.map(mod => ({
        ...mod,
        topics: mod.topics.map(topic => ({
          ...topic,
          progress: topic.progress[0] || null,
        })),
      })),
    }))

    return NextResponse.json(transformedGoals)
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
    let modulesData = getCachedStructure(title, level)
    
    if (!modulesData) {
      console.log('[Goals] Generating new course structure...')
      const startTime = Date.now()
      
      // ПАРАЛЛЕЛЬНО: получаем контекст И генерируем базовую структуру
      const [externalContextResult, baseStructureResult] = await Promise.allSettled([
        // Полный RAG контекст с персонализацией
        getFullRAGContext(title, skill, user.id).catch(() => ''),
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
          const parsed = JSON.parse(baseStructureResult.value.content) as GeneratedCourse
          // Новый формат: modules[] с topics[] внутри
          if (parsed.modules && Array.isArray(parsed.modules)) {
            modulesData = validateAndNormalizeModules(parsed.modules)
          }
          console.log(`[Goals] Structure generated via ${baseStructureResult.value.provider} in ${baseStructureResult.value.latencyMs}ms`)
        } catch {
          modulesData = null
        }
      }

      // Если AI не справился - fallback с модулями
      if (!modulesData || modulesData.length === 0) {
        console.log('[Goals] Using fallback structure with modules')
        modulesData = getFallbackModules()
      } else {
        // Кэшируем успешную структуру
        setCachedStructure(title, level, modulesData)
      }
      
      console.log(`[Goals] Total structure time: ${Date.now() - startTime}ms`)
    }

    // Create goal with modules and topics
    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title,
        skill,
        targetDate: targetDate ? new Date(targetDate) : null,
        modules: {
          create: modulesData.map((mod: GeneratedModule) => ({
            name: mod.name,
            description: mod.description || null,
            icon: mod.icon || '📚',
            order: mod.order,
            topics: {
              create: mod.topics.map((topic: GeneratedTopic) => ({
                slug: topic.slug || `topic-${mod.order}-${topic.order}`,
                name: topic.name,
                description: topic.description || null,
                icon: topic.icon || '📚',
                difficulty: topic.difficulty || 'MEDIUM',
                estimatedMinutes: topic.estimatedMinutes || 30,
                order: topic.order || 1,
                prerequisiteIds: topic.prerequisites || [],
              })),
            },
          })),
        },
      },
      include: {
        modules: {
          include: {
            topics: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    // Собираем все topics для создания прогресса и карточек
    const allTopics = goal.modules.flatMap(mod => mod.topics)

    // ПАРАЛЛЕЛЬНО: создаём прогресс И генерируем карточки
    const cardsPrompt = `Создай 30 карточек для запоминания по теме "${title}".
Формат JSON: {"cards": [{"front": "Вопрос", "back": "Ответ"}]}`

    const [, cardsResult] = await Promise.allSettled([
      // Создание прогресса
      prisma.topicProgress.createMany({
        data: allTopics.map((topic: { id: string }) => ({
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
              topicSlug: allTopics[0]?.slug || 'general',
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
