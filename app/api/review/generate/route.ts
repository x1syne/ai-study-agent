import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { groq } from '@/lib/groq'

export const dynamic = 'force-dynamic'

// POST /api/review/generate - Generate cards or quiz using AI
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, topicName, topicSlug, count } = body

    if (!topicName || !count) {
      return NextResponse.json({ error: 'Topic and count are required' }, { status: 400 })
    }

    // Limit counts
    const safeCount = type === 'cards' 
      ? Math.min(Math.max(count, 5), 120)
      : Math.min(Math.max(count, 5), 60)

    if (type === 'cards') {
      // Generate flashcards
      const prompt = `Создай ${safeCount} карточек для запоминания по теме "${topicName}".

Каждая карточка должна содержать:
- front: вопрос или термин (короткий, до 100 символов)
- back: ответ или определение (информативный, до 300 символов)

Карточки должны покрывать разные аспекты темы: определения, примеры, факты, сравнения.

Ответь ТОЛЬКО валидным JSON массивом без markdown:
[
  {"front": "Что такое X?", "back": "X - это..."},
  {"front": "Пример Y", "back": "Примером является..."}
]`

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Ты создаёшь образовательные карточки для запоминания. Отвечай только JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      })

      const content = response.choices[0]?.message?.content || '[]'
      
      // Parse JSON from response
      let cards: { front: string; back: string }[] = []
      try {
        // Try to extract JSON from response
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          cards = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        console.error('Failed to parse cards JSON:', e)
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
      }

      // Save cards to database
      const createdCards = await Promise.all(
        cards.slice(0, safeCount).map(card =>
          prisma.reviewCard.create({
            data: {
              userId: user.id,
              front: card.front,
              back: card.back,
              topicSlug: topicSlug || topicName.toLowerCase().replace(/\s+/g, '-'),
            },
          })
        )
      )

      return NextResponse.json({ 
        success: true, 
        count: createdCards.length,
        cards: createdCards 
      })

    } else if (type === 'quiz') {
      // Generate quiz questions
      const prompt = `Создай ${safeCount} вопросов для квиза по теме "${topicName}".

Каждый вопрос должен содержать:
- question: текст вопроса
- options: массив из 4 вариантов ответа
- correctAnswer: индекс правильного ответа (0-3)
- explanation: краткое объяснение правильного ответа

Вопросы должны быть разной сложности и покрывать разные аспекты темы.

Ответь ТОЛЬКО валидным JSON массивом без markdown:
[
  {
    "question": "Какой из вариантов...?",
    "options": ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
    "correctAnswer": 0,
    "explanation": "Правильный ответ A, потому что..."
  }
]`

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: 'Ты создаёшь образовательные квизы. Отвечай только JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      })

      const content = response.choices[0]?.message?.content || '[]'
      
      // Parse JSON from response
      let questions: { question: string; options: string[]; correctAnswer: number; explanation: string }[] = []
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          questions = JSON.parse(jsonMatch[0])
        }
      } catch (e) {
        console.error('Failed to parse quiz JSON:', e)
        return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
      }

      // Add IDs and topic to questions
      const questionsWithIds = questions.slice(0, safeCount).map((q, idx) => ({
        id: `q-${Date.now()}-${idx}`,
        ...q,
        topicName,
      }))

      return NextResponse.json({ 
        success: true, 
        count: questionsWithIds.length,
        questions: questionsWithIds 
      })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  } catch (error) {
    console.error('Error generating content:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
