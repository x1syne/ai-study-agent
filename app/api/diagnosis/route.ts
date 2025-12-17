import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateCompletion } from '@/lib/groq'
import { SYSTEM_PROMPTS, getDiagnosisPrompt } from '@/lib/ai/prompts'
import { enrichContextWithArxiv } from '@/lib/arxiv'

export const dynamic = 'force-dynamic'

// POST /api/diagnosis - Generate diagnosis questions for a goal
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { goalId } = body

    if (!goalId) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 })
    }

    // Get goal with topics
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: { topics: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Получаем научный контекст для более точных вопросов
    const { arxivContext } = await enrichContextWithArxiv(goal.skill, { maxPapers: 1 })
    
    // Generate questions for each topic
    const questions = []

    for (const topic of goal.topics.slice(0, 5)) { // Limit to 5 topics
      const basePrompt = getDiagnosisPrompt(goal.skill, topic.name, topic.difficulty)
      const prompt = arxivContext 
        ? `${basePrompt}\n\n[Научный контекст для создания актуальных вопросов]:\n${arxivContext}`
        : basePrompt
      
      try {
        const response = await generateCompletion(
          SYSTEM_PROMPTS.diagnosis,
          prompt,
          { json: true, temperature: 0.8 }
        )

        const question = JSON.parse(response)
        questions.push({
          id: `${topic.id}-${Date.now()}`,
          ...question,
          topicSlug: topic.slug,
          difficulty: topic.difficulty,
        })
      } catch (e) {
        // Fallback question
        questions.push({
          id: `${topic.id}-${Date.now()}`,
          question: `Что вы знаете о теме "${topic.name}"?`,
          type: 'multiple_choice',
          options: ['Ничего не знаю', 'Знаю основы', 'Хорошо разбираюсь', 'Эксперт'],
          correctAnswer: 2,
          explanation: 'Это вопрос для самооценки.',
          topicSlug: topic.slug,
          difficulty: topic.difficulty,
        })
      }
    }

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error generating diagnosis:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/diagnosis - Save diagnosis results
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { goalId, results } = body // results: [{ topicSlug, score }]

    if (!goalId || !results) {
      return NextResponse.json({ error: 'Goal ID and results are required' }, { status: 400 })
    }

    // Get goal with topics
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: { topics: true },
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Update topic progress based on diagnosis
    for (const result of results) {
      const topic = goal.topics.find((t: { slug: string }) => t.slug === result.topicSlug)
      if (!topic) continue

      const status = result.score >= 80 ? 'COMPLETED' : result.score >= 50 ? 'IN_PROGRESS' : 'AVAILABLE'
      const masteryLevel = result.score

      await prisma.topicProgress.upsert({
        where: {
          userId_topicId: { userId: user.id, topicId: topic.id },
        },
        update: {
          diagnosisScore: result.score,
          diagnosisDate: new Date(),
          masteryLevel,
          status,
        },
        create: {
          userId: user.id,
          topicId: topic.id,
          diagnosisScore: result.score,
          diagnosisDate: new Date(),
          masteryLevel,
          status,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving diagnosis:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
