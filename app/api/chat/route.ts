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
import { getProfessorContext } from '@/lib/ai/professor-knowledge'
import { getOstroukhScheduleContext } from '@/lib/ai/professor-schedule'
import { getCheckpointer } from '@/lib/ai/checkpointer'
import { buildPromptContext } from '@/lib/ai/context-builder'
import { getSummarizer } from '@/lib/ai/summarizer'
import { analyzeMessageForPreferences, updateUserPreferences } from '@/lib/ai/user-preferences'
import { MemoryManager } from '@/lib/ai/memory-manager'
import { detectToolNeeds } from '@/lib/mcp/tool-detector'
import { FilesystemTool } from '@/lib/mcp/tools/filesystem'
import * as path from 'path'
import { SearchTool } from '@/lib/mcp/tools/search'
import { MCPClient } from '@/lib/mcp/mcp-client'
import { getAvailableTools, executeTool } from '@/lib/ai/tools-registry'

// Обёртка для совместимости
async function generateCompletion(system: string, user: string, opts?: { json?: boolean; temperature?: number; maxTokens?: number }) {
  const result = await generateWithRouter('chat', system, user, opts)
  return result.content
}

// Singleton instance of MemoryManager
// Requirement 4.4: Store context in memory (not database) for session duration
let memoryManagerInstance: MemoryManager | null = null

function getMemoryManager(): MemoryManager {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManager(10) // Max 10 messages before summarization
  }
  return memoryManagerInstance
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
    const { message, topicSlug, characterId = 'default', files = [], sessionId: requestSessionId, threadId: requestThreadId } = body

    if (!message && files.length === 0) {
      return NextResponse.json({ error: 'Message or files required' }, { status: 400 })
    }

    // Get MemoryManager instance
    const memoryManager = getMemoryManager()

    // Requirement 4.1: Create session on first message
    let threadId = requestThreadId
    if (!threadId) {
      threadId = memoryManager.createSession(user.id)
    }

    // Получаем или создаём сессию для персистентности (Checkpointer)
    const checkpointer = getCheckpointer()
    let sessionId = requestSessionId
    
    if (!sessionId) {
      const session = await checkpointer.getOrCreateSession(user.id, characterId)
      sessionId = session.id
    }

    // ОПТИМИЗАЦИЯ: Отключено для ускорения (не критично для чата)
    // const preferenceUpdates = analyzeMessageForPreferences(message)
    // if (preferenceUpdates) {
    //   await updateUserPreferences(user.id, preferenceUpdates)
    // }

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

    // Requirement 4.2: Add message to memory context
    memoryManager.addMessage(threadId, {
      role: 'user',
      content: displayContent,
      timestamp: Date.now()
    })

    // Requirement 4.3: Summarize old messages when exceeding 10 messages
    await memoryManager.summarizeOldMessages(threadId)

    // Requirement 4.2: Get context from MemoryManager
    const memoryContext = memoryManager.getContext(threadId)

    // ОПТИМИЗАЦИЯ: Tool detection только для основного чата (не для Остроуха)
    let toolDetection = { needsFileSave: false, needsSearch: false, fileInfo: null, searchQuery: null }
    if (characterId !== 'ostroukh') {
      toolDetection = detectToolNeeds(message)
      console.log('[Chat] Tool detection:', toolDetection)
    }

    // Сохраняем сообщение пользователя через Checkpointer (для персистентности)
    const userMessage = await checkpointer.saveMessage({
      sessionId,
      userId: user.id,
      characterId,
      role: 'user',
      content: displayContent,
      topicSlug,
      metadata: files.length > 0 ? { hasFiles: true, fileCount: files.length } : undefined
    })

    // Получаем контекст диалога с историей и предпочтениями
    const promptContext = await buildPromptContext({
      sessionId,
      userId: user.id,
      characterId,
      currentMessage: message,
      topicSlug
    })

    // Get current learning context (universal, not just programming)
    let context = 'Свободный диалог на любые темы'
    
    // ОПТИМИЗАЦИЯ: Отключено для ускорения (не критично для чата)
    // let courseContext = ''
    // const userGoals = await prisma.goal.findMany({
    //   where: { userId: user.id },
    //   include: { 
    //     modules: {
    //       include: { topics: true },
    //       orderBy: { order: 'asc' }
    //     }
    //   },
    //   take: 5,
    // })
    // if (userGoals.length > 0) {
    //   courseContext = '\n📚 Твои курсы:\n' + userGoals.map(g => 
    //     `- ${g.title}: ${g.modules.flatMap(m => m.topics.map(t => t.name)).join(', ')}`
    //   ).join('\n')
    // }
    let courseContext = ''
    
    if (topicSlug) {
      const topic = await prisma.topic.findFirst({
        where: { slug: topicSlug },
        include: { module: { include: { goal: true } } },
      })
      if (topic) {
        context = `Изучение: ${topic.module.goal.title}, тема: ${topic.name}`
      }
    }

    // ОПТИМИЗАЦИЯ: arXiv поиск только для основного чата (не для Остроуха)
    let arxivContext = ''
    if (characterId !== 'ostroukh' && shouldSearchArxiv(message)) {
      const searchQuery = extractSearchQuery(message)
      if (searchQuery) {
        const arxivResult = await searchArxiv(searchQuery, 3)
        arxivContext = formatArxivForContext(arxivResult)
      }
    }

    // Поиск в базе знаний профессора Остроуха (если выбран этот персонаж)
    let professorContext = ''
    if (characterId === 'ostroukh') {
      // Проверяем, спрашивают ли про расписание
      const scheduleKeywords = [
        'расписание', 'пара', 'занятие', 'лекция', 'практика', 
        'когда у тебя', 'где ты', 'аудитория', 'работаешь', 
        'неделя', 'завтра', 'сегодня', 'понедельник', 'вторник', 
        'среда', 'четверг', 'пятница'
      ]
      const isScheduleQuery = scheduleKeywords.some(keyword => message.toLowerCase().includes(keyword))
      
      if (isScheduleQuery) {
        professorContext = await getOstroukhScheduleContext(message)
      } else {
        professorContext = await getProfessorContext(message)
      }
    }

    // Requirement 4.2, 4.5: Include memory context in AI prompts
    // Build memory context string from MemoryManager
    let memoryContextString = ''
    if (memoryContext.summary) {
      memoryContextString += `\n\n📝 Краткое содержание предыдущего разговора: ${memoryContext.summary}\n`
    }
    if (memoryContext.context.lastCodeExample) {
      memoryContextString += `\n💾 Последний пример кода из разговора:\n${memoryContext.context.lastCodeExample}\n`
    }
    if (memoryContext.messages.length > 0) {
      memoryContextString += `\n📜 Последние ${memoryContext.messages.length} сообщений:\n`
      memoryContext.messages.forEach(msg => {
        const role = msg.role === 'user' ? 'Студент' : 'Ассистент'
        const preview = msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content
        memoryContextString += `- ${role}: ${preview}\n`
      })
    }

    // Requirement 4.5: Handle references to earlier content
    // Check if user is referencing earlier content
    const referencePhrases = ['earlier', 'showed', 'mentioned', 'said', 'code', 'ранее', 'показал', 'упоминал', 'говорил', 'код']
    const isReferencingEarlier = referencePhrases.some(phrase => message.toLowerCase().includes(phrase))
    
    if (isReferencingEarlier) {
      const relevantMessages = memoryManager.findInContext(threadId, message)
      if (relevantMessages.length > 0) {
        memoryContextString += `\n\n🔍 Релевантные сообщения из истории:\n`
        relevantMessages.slice(0, 3).forEach(msg => {
          memoryContextString += `- ${msg.role === 'user' ? 'Студент' : 'Ассистент'}: ${msg.content.substring(0, 200)}...\n`
        })
      }
    }

    // Объединяем все источники информации + контекст из истории + память
    const fullContext = `${context}${courseContext}${arxivContext}${professorContext ? '\n\n' + professorContext : ''}${memoryContextString}\n\n${promptContext.historyContext}`

    // Update character state based on conversation
    const dialogContext = await checkpointer.getContext(sessionId)
    const historyArray = dialogContext.messages.map(m => m.content)
    const characterState = updateStateAfterMessage(user.id, characterId, message, historyArray)
    
    // Calculate dynamic temperature based on character state
    const dynamicTemperature = getCharacterTemperature(character, characterState)

    // Generate AI response with selected character and dynamic state
    let response: string
    try {
      // Add file context to the prompt
      const messageWithFiles = fileContext ? `${message}\n${fileContext}` : message
      const prompt = getCharacterPrompt(characterId, fullContext, promptContext.historyContext, characterState) + `\n\nСообщение студента: ${messageWithFiles}`
      
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
        // Get available tools for this character
        const tools = getAvailableTools(characterId)
        
        // Generate with tools support
        const result = await generateWithRouter(
          'chat',
          character.systemPrompt,
          prompt,
          { 
            temperature: dynamicTemperature,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: tools.length > 0 ? 'auto' : undefined
          }
        )
        
        // Handle tool calls if any
        if (result.tool_calls && result.tool_calls.length > 0) {
          console.log('[Chat] AI requested tool calls:', result.tool_calls.length)
          
          // Execute all tool calls
          const toolResults = await Promise.all(
            result.tool_calls.map(async (toolCall) => {
              try {
                const args = JSON.parse(toolCall.function.arguments)
                const toolResult = await executeTool(toolCall.function.name, args)
                return {
                  role: 'tool' as const,
                  tool_call_id: toolCall.id,
                  name: toolCall.function.name,
                  content: toolResult
                }
              } catch (error) {
                console.error(`[Chat] Tool execution failed:`, error)
                return {
                  role: 'tool' as const,
                  tool_call_id: toolCall.id,
                  name: toolCall.function.name,
                  content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
                }
              }
            })
          )
          
          // Generate final response with tool results
          const toolResultsText = toolResults.map(r => `${r.name}: ${r.content}`).join('\n\n')
          const finalPrompt = `${prompt}\n\n[Tool Results]:\n${toolResultsText}\n\nИспользуй результаты инструментов для формирования ответа студенту.`
          
          const finalResult = await generateWithRouter(
            'chat',
            character.systemPrompt,
            finalPrompt,
            { temperature: dynamicTemperature }
          )
          
          response = finalResult.content
        } else {
          response = result.content
        }
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

    // Requirement 4.2: Add AI response to memory context
    memoryManager.addMessage(threadId, {
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    })

    // ОПТИМИЗАЦИЯ: MCP tools только для основного чата (не для Остроуха)
    // Requirements 1.1, 2.1, 2.2: Execute MCP tools if needed
    const toolResults: Array<{ tool: string; result: any; error?: string }> = []
    
    if (characterId !== 'ostroukh') {
      // Execute Filesystem Tool if needed
      if (toolDetection.needsFileSave && toolDetection.fileInfo) {
        try {
          console.log('[Chat] Executing FilesystemTool...')
          const userFilesDir = path.join(process.cwd(), 'user-files')
          const filesystemTool = new FilesystemTool(new MCPClient([]), userFilesDir)
          
          // If content is empty, try to extract from AI response
          let content = toolDetection.fileInfo.content
          if (!content || content.trim() === '') {
            const fileType = toolDetection.fileInfo.type
            
            // For code files, extract from code blocks
            if (fileType === 'code') {
              const codeBlockPattern = /```[\w]*\n([\s\S]*?)```/g
              const codeBlocks = Array.from(response.matchAll(codeBlockPattern))
              if (codeBlocks.length > 0) {
                content = codeBlocks[0][1].trim()
              }
            } else {
              // For text/note files, extract only the main content
              const codeBlockPattern = /```[\w]*\n([\s\S]*?)```/g
              const codeBlocks = Array.from(response.matchAll(codeBlockPattern))
              
              if (codeBlocks.length > 0) {
                content = codeBlocks.map(block => block[1]).join('\n\n').trim()
              } else {
                const lines = response.split('\n')
                const contentLines: string[] = []
                let skipIntro = true
                
                for (const line of lines) {
                  const trimmed = line.trim()
                  if (skipIntro && !trimmed) continue
                  if (skipIntro && (
                    trimmed.match(/^(Конечно|Хорошо|Отлично|Вот|Держи|Пожалуйста|Sure|Here|Okay)/i) ||
                    trimmed.match(/сохран[юи]/i) ||
                    trimmed.match(/созда[мл]/i) ||
                    trimmed.match(/файл/i) && trimmed.length < 50
                  )) {
                    continue
                  }
                  skipIntro = false
                  if (trimmed.match(/^✅.*Файл сохранён/)) continue
                  if (trimmed.match(/^❌.*Не удалось сохранить/)) continue
                  contentLines.push(line)
                }
                content = contentLines.join('\n').trim()
                
                if (content.length < 100 || content.match(/^(Я |Давай |Сейчас |Вот )/)) {
                  content = response
                    .replace(/^.*?(Конечно|Хорошо|Отлично|Вот|Держи).*?\n/i, '')
                    .replace(/\n\n✅.*Файл сохранён.*[\s\S]*$/, '')
                    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                    .trim()
                }
              }
            }
          }
          
          if (content && content.trim() !== '') {
            const saveResult = await filesystemTool.saveFile({
              userId: user.id,
              filename: toolDetection.fileInfo.filename,
              content: content,
              type: toolDetection.fileInfo.type
            })
            
            toolResults.push({
              tool: 'save_file',
              result: saveResult
            })
            
            response += `\n\n✅ Файл сохранён: [${toolDetection.fileInfo.filename}](${saveResult.url})`
            console.log('[Chat] File saved:', saveResult.path)
          } else {
            console.warn('[Chat] No content to save for file:', toolDetection.fileInfo.filename)
          }
        } catch (error) {
          console.error('[Chat] FilesystemTool error:', error)
          toolResults.push({
            tool: 'save_file',
            result: null,
            error: error instanceof Error ? error.message : String(error)
          })
          response += `\n\n❌ Не удалось сохранить файл: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      }
      
      // Execute Search Tool if needed
      if (toolDetection.needsSearch && toolDetection.searchQuery) {
        try {
          console.log('[Chat] Executing SearchTool...')
          const braveApiKey = process.env.BRAVE_API_KEY || ''
          
          if (!braveApiKey) {
            console.warn('[Chat] BRAVE_API_KEY not configured, skipping search')
          } else {
            const searchTool = new SearchTool(braveApiKey)
            const searchResults = await searchTool.search({
              query: toolDetection.searchQuery,
              count: 5
            })
            
            toolResults.push({
              tool: 'search',
              result: searchResults
            })
            
            if (searchResults.length > 0) {
              response += `\n\n🔍 Результаты поиска по запросу "${toolDetection.searchQuery}":\n\n`
              searchResults.forEach((result, index) => {
                response += `${index + 1}. **[${result.title}](${result.url})**\n`
                response += `   ${result.snippet}\n\n`
              })
            }
            console.log('[Chat] Search completed:', searchResults.length, 'results')
          }
        } catch (error) {
          console.error('[Chat] SearchTool error:', error)
          toolResults.push({
            tool: 'search',
            result: null,
            error: error instanceof Error ? error.message : String(error)
          })
          console.warn('[Chat] Search failed, continuing without search results')
        }
      }
    }

    // Сохраняем ответ AI через Checkpointer (для персистентности)
    const aiMessage = await checkpointer.saveMessage({
      sessionId,
      userId: user.id,
      characterId,
      role: 'assistant',
      content: response,
      topicSlug
    })

    // Планируем асинхронную суммаризацию если нужно
    const summarizer = getSummarizer()
    summarizer.scheduleSummary(sessionId)

    return NextResponse.json({
      userMessage: {
        id: userMessage.id,
        role: 'USER',
        content: displayContent,
        createdAt: userMessage.createdAt
      },
      aiMessage: {
        id: aiMessage.id,
        role: 'ASSISTANT',
        content: response,
        createdAt: aiMessage.createdAt
      },
      sessionId,
      threadId, // Return threadId for client to maintain memory context
      toolCalls: toolResults.length > 0 ? toolResults : undefined // Include tool results if any
    })
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
