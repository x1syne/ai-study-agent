import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateWithRouter, generateWithVision } from '@/lib/ai-router'
import { 
  getCharacterById, 
  getCharacterPrompt, 
  getCharacterTemperature,
  updateStateAfterMessage,
  getOrCreateState 
} from '@/lib/ai/characters'
import { searchArxiv, formatArxivForContext, shouldSearchArxiv, extractSearchQuery } from '@/lib/arxiv'

// Обёртка для совместимости
async function generateCompletion(system: string, user: string, opts?: { json?: boolean; temperature?: number; maxTokens?: number }) {
  const result = await generateWithRouter('chat', system, user, opts)
  return result.content
}

export const dynamic = 'force-dynamic'

// GET /api/chat - Get chat history for specific character
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const characterId = searchParams.get('characterId') || 'default'

    // Try to filter by characterId, fallback to all messages if field doesn't exist yet
    let messages
    try {
      messages = await prisma.chatMessage.findMany({
        where: { 
          userId: user.id,
          characterId: characterId,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    } catch {
      // Fallback if characterId field doesn't exist in DB yet
      messages = await prisma.chatMessage.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      })
    }

    return NextResponse.json(messages.reverse())
  } catch (error) {
    console.error('Error fetching chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chat - Send message to AI
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, topicSlug, characterId = 'default', files = [] } = body

    if (!message && files.length === 0) {
      return NextResponse.json({ error: 'Message or files required' }, { status: 400 })
    }

    // Process attached files
    let fileContext = ''
    const imageContents: { type: 'image_url'; image_url: { url: string } }[] = []
    
    for (const file of files) {
      if (file.type === 'text') {
        fileContext += `\n\n📄 Содержимое файла "${file.name}":\n\`\`\`\n${file.content}\n\`\`\`\n`
      } else if (file.type === 'image') {
        imageContents.push({
          type: 'image_url',
          image_url: { url: file.content }
        })
      }
    }

    // Get selected AI character
    const character = getCharacterById(characterId)

    // Build message content with file indicators
    let displayContent = message
    if (files.length > 0) {
      const fileNames = files.map((f: { type: string; name: string }) => f.type === 'image' ? `📷 ${f.name}` : `📄 ${f.name}`).join(', ')
      displayContent = message ? `${message}\n\n[Прикреплено: ${fileNames}]` : `[Прикреплено: ${fileNames}]`
    }

    // Save user message (with characterId if supported)
    let userMessage
    try {
      userMessage = await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: 'USER',
          content: displayContent,
          topicSlug,
          characterId,
        },
      })
    } catch {
      // Fallback without characterId
      userMessage = await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: 'USER',
          content: displayContent,
          topicSlug,
        },
      })
    }

    // Get recent chat history
    let recentMessages
    try {
      recentMessages = await prisma.chatMessage.findMany({
        where: { 
          userId: user.id,
          characterId: characterId,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    } catch {
      recentMessages = await prisma.chatMessage.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    }

    const historyText = recentMessages
      .reverse()
      .map((m: { role: string; content: string }) => 
        `${m.role === 'USER' ? 'Студент' : 'Репетитор'}: ${m.content}`
      )
      .join('\n')

    // Get current learning context (universal, not just programming)
    let context = 'Свободный диалог на любые темы'
    let courseContext = ''
    
    // Получаем контекст из курса пользователя
    const userGoals = await prisma.goal.findMany({
      where: { userId: user.id },
      include: { topics: true },
      take: 5,
    })
    
    if (userGoals.length > 0) {
      courseContext = '\n📚 Твои курсы:\n' + userGoals.map(g => 
        `- ${g.title}: ${g.topics.map(t => t.name).join(', ')}`
      ).join('\n')
    }
    
    if (topicSlug) {
      const topic = await prisma.topic.findFirst({
        where: { slug: topicSlug },
        include: { goal: true },
      })
      if (topic) {
        context = `Изучение: ${topic.goal.title}, тема: ${topic.name}`
      }
    }

    // Поиск научных статей на arXiv если вопрос научный
    let arxivContext = ''
    if (shouldSearchArxiv(message)) {
      const searchQuery = extractSearchQuery(message)
      if (searchQuery) {
        const arxivResult = await searchArxiv(searchQuery, 3)
        arxivContext = formatArxivForContext(arxivResult)
      }
    }

    // Объединяем все источники информации
    const fullContext = `${context}${courseContext}${arxivContext}`

    // Update character state based on conversation
    const historyArray = recentMessages.map((m: { content: string }) => m.content)
    const characterState = updateStateAfterMessage(user.id, characterId, message, historyArray)
    
    // Calculate dynamic temperature based on character state
    const dynamicTemperature = getCharacterTemperature(character, characterState)

    // Generate AI response with selected character and dynamic state
    let response: string
    try {
      // Add file context to the prompt
      const messageWithFiles = fileContext ? `${message}\n${fileContext}` : message
      const prompt = getCharacterPrompt(characterId, fullContext, historyText, characterState) + `\n\nСообщение студента: ${messageWithFiles}`
      
      // If there are images, use vision model with fallback
      if (imageContents.length > 0) {
        try {
          const imageUrls = imageContents.map(img => img.image_url.url)
          const visionResult = await generateWithVision(
            character.systemPrompt,
            prompt,
            imageUrls,
            { temperature: dynamicTemperature, maxTokens: 4096 }
          )
          response = visionResult.content || 'Не удалось проанализировать изображение'
        } catch (visionError) {
          console.error('Vision generation failed:', visionError)
          response = 'Не удалось проанализировать изображение. Попробуйте ещё раз или опишите содержимое текстом.'
        }
      } else {
        response = await generateCompletion(
          character.systemPrompt,
          prompt,
          { temperature: dynamicTemperature }
        )
      }
    } catch (aiError: unknown) {
      console.error('AI generation error:', aiError)
      const errorStatus = aiError && typeof aiError === 'object' && 'status' in aiError ? aiError.status : 'unknown'
      response = `К сожалению, AI временно недоступен. Ошибка: ${errorStatus}. 

Возможные причины:
- API ключ Groq истёк или неверный
- Превышен лимит запросов

Пожалуйста, проверьте GROQ_API_KEY в файле .env и получите новый ключ на https://console.groq.com/keys`
    }

    // Save AI response (with characterId if supported)
    let aiMessage
    try {
      aiMessage = await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: 'ASSISTANT',
          content: response,
          topicSlug,
          characterId,
        },
      })
    } catch {
      aiMessage = await prisma.chatMessage.create({
        data: {
          userId: user.id,
          role: 'ASSISTANT',
          content: response,
          topicSlug,
        },
      })
    }

    return NextResponse.json({
      userMessage,
      aiMessage,
    })
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
