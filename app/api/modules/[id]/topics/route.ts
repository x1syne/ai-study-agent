import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateWithRouter } from '@/lib/ai-router'
import { SYSTEM_PROMPTS, getSubtopicsGenerationPrompt } from '@/lib/ai/prompts'

export const dynamic = 'force-dynamic'

interface GeneratedTopic {
  slug: string
  name: string
  description?: string
  icon?: string
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT'
  estimatedMinutes?: number
  order?: number
}

// GET /api/modules/[id]/topics - Get or generate topics for a module
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get module with its goal (using any to bypass type issues)
    const moduleData = await (prisma as any).module.findUnique({
      where: { id: params.id },
      include: {
        goal: true,
        topics: {
          include: {
            progress: {
              where: { userId: user.id },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    })

    if (!moduleData) {
      return NextResponse.json({ error: 'Module not found' }, { status: 404 })
    }

    // Check ownership
    if (moduleData.goal.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // If topics already exist, return them
    if (moduleData.topics.length > 0) {
      const topicsWithProgress = moduleData.topics.map((topic: any) => ({
        ...topic,
        progress: topic.progress[0] || null,
      }))
      return NextResponse.json({ topics: topicsWithProgress, generated: false })
    }

    // Generate topics for this module
    console.log(`[Modules] Generating topics for module: ${moduleData.name}`)
    const startTime = Date.now()

    let generatedTopics: GeneratedTopic[] = []

    try {
      const result = await generateWithRouter(
        'fast',
        SYSTEM_PROMPTS.subtopicsGeneration,
        getSubtopicsGenerationPrompt(moduleData.name, moduleData.description || '', moduleData.goal.title),
        { json: true, temperature: 0.7 }
      )

      const parsed = JSON.parse(result.content)
      if (parsed.topics && Array.isArray(parsed.topics)) {
        generatedTopics = parsed.topics.map((t: any, idx: number) => ({
          slug: t.slug || `${moduleData.id}-topic-${idx + 1}`,
          name: t.name || `Тема ${idx + 1}`,
          description: t.description || null,
          icon: t.icon || '📖',
          difficulty: t.difficulty || 'MEDIUM',
          estimatedMinutes: t.estimatedMinutes || 20,
          order: t.order || idx + 1,
        }))
      }
      console.log(`[Modules] Generated ${generatedTopics.length} topics in ${Date.now() - startTime}ms`)
    } catch (e) {
      console.error('[Modules] Topic generation failed:', e)
      // Fallback topics
      generatedTopics = [
        { slug: `${moduleData.id}-intro`, name: 'Введение', description: 'Знакомство с темой', icon: '📖', difficulty: 'EASY', estimatedMinutes: 15, order: 1 },
        { slug: `${moduleData.id}-basics`, name: 'Основы', description: 'Базовые концепции', icon: '🎯', difficulty: 'MEDIUM', estimatedMinutes: 20, order: 2 },
        { slug: `${moduleData.id}-practice`, name: 'Практика', description: 'Применение знаний', icon: '💻', difficulty: 'MEDIUM', estimatedMinutes: 25, order: 3 },
      ]
    }

    // Create topics in database
    const createdTopics = await Promise.all(
      generatedTopics.map(topic =>
        (prisma as any).topic.create({
          data: {
            moduleId: moduleData.id,
            slug: topic.slug,
            name: topic.name,
            description: topic.description,
            icon: topic.icon,
            difficulty: topic.difficulty,
            estimatedMinutes: topic.estimatedMinutes || 20,
            order: topic.order || 1,
            prerequisiteIds: [],
          },
        })
      )
    )

    // Create progress for all topics
    await prisma.topicProgress.createMany({
      data: createdTopics.map((topic: any) => ({
        userId: user.id,
        topicId: topic.id,
        status: 'AVAILABLE',
      })),
    })

    // Fetch topics with progress
    const topicsWithProgress = await (prisma as any).topic.findMany({
      where: { moduleId: moduleData.id },
      include: {
        progress: {
          where: { userId: user.id },
        },
      },
      orderBy: { order: 'asc' },
    })

    const result = topicsWithProgress.map((topic: any) => ({
      ...topic,
      progress: topic.progress[0] || null,
    }))

    return NextResponse.json({ topics: result, generated: true })
  } catch (error) {
    console.error('Error fetching/generating topics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
