import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateCompletion } from '@/lib/groq'
import { SYSTEM_PROMPTS, getGraphGenerationPrompt } from '@/lib/ai/prompts'
import { enrichContextWithArxiv } from '@/lib/arxiv'
import { getBookContext } from '@/lib/openlibrary'

export const dynamic = 'force-dynamic'

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

    // Получаем контекст из внешних источников для создания более качественного курса
    const [{ arxivContext }, bookContext] = await Promise.all([
      enrichContextWithArxiv(title, { maxPapers: 2, forceSearch: true }),
      getBookContext(title)
    ])
    
    // Generate knowledge graph using AI
    const basePrompt = getGraphGenerationPrompt(title, level)
    const externalContext = arxivContext || bookContext 
      ? `\n\n[ДОПОЛНИТЕЛЬНЫЕ ИСТОЧНИКИ - проанализируй и используй для создания актуальных тем]:\n${arxivContext}${bookContext}`
      : ''
    const prompt = basePrompt + externalContext
    let topicsData: any[] = []
    
    try {
      const response = await generateCompletion(
        SYSTEM_PROMPTS.graphGeneration,
        prompt,
        { json: true, temperature: 0.7 }
      )
      const parsed = JSON.parse(response)
      topicsData = parsed.topics || []
    } catch (e) {
      console.error('Failed to generate topics with AI:', e)
      // Fallback to basic topics
      topicsData = [
        { slug: 'intro', name: 'Введение', description: 'Знакомство с темой', icon: '📚', difficulty: 'EASY', estimatedMinutes: 20, prerequisites: [], order: 1 },
        { slug: 'basics', name: 'Основы', description: 'Базовые концепции', icon: '🎯', difficulty: 'EASY', estimatedMinutes: 30, prerequisites: ['intro'], order: 2 },
        { slug: 'practice', name: 'Практика', description: 'Применение знаний', icon: '💻', difficulty: 'MEDIUM', estimatedMinutes: 45, prerequisites: ['basics'], order: 3 },
        { slug: 'advanced', name: 'Продвинутые темы', description: 'Углублённое изучение', icon: '🚀', difficulty: 'HARD', estimatedMinutes: 60, prerequisites: ['practice'], order: 4 },
      ]
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

    // Create progress for ALL topics as AVAILABLE (no locking)
    await prisma.topicProgress.createMany({
      data: goal.topics.map((topic: { id: string }) => ({
        userId: user.id,
        topicId: topic.id,
        status: 'AVAILABLE',
      })),
    })

    // Generate 50 review cards for the course
    try {
      const cardsPrompt = `Создай 50 карточек для запоминания по теме "${title}".
Карточки должны покрывать все аспекты темы: определения, факты, примеры, формулы.

Формат JSON:
{
  "cards": [
    {"front": "Вопрос или термин", "back": "Ответ или определение"}
  ]
}`
      const cardsResponse = await generateCompletion(
        'Ты создаёшь карточки для интервального повторения. Отвечай ТОЛЬКО валидным JSON.',
        cardsPrompt,
        { json: true, temperature: 0.7 }
      )
      const cardsData = JSON.parse(cardsResponse)
      
      if (cardsData.cards?.length > 0) {
        await prisma.reviewCard.createMany({
          data: cardsData.cards.slice(0, 50).map((card: { front: string; back: string }) => ({
            userId: user.id,
            front: card.front,
            back: card.back,
            topicSlug: goal.topics[0]?.slug || 'general',
          })),
        })
      }
    } catch (e) {
      console.error('Failed to generate review cards:', e)
    }

    return NextResponse.json(goal, { status: 201 })
  } catch (error) {
    console.error('Error creating goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
