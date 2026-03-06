/**
 * Инструменты для чат-агента
 * 
 * Реализация паттерна "Tools" из LangGraph для расширения возможностей чата
 * Агент может вызывать эти инструменты для выполнения специфических задач
 */

import { searchProfessorKnowledge, findPublicationsByTopic } from './professor-knowledge'
import { searchArxiv } from '../arxiv'
import { searchSimilar } from '../embeddings'

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  formatted?: string // Форматированный результат для включения в ответ
}

export interface Tool {
  name: string
  description: string
  parameters: {
    name: string
    type: string
    description: string
    required: boolean
  }[]
  execute: (params: Record<string, unknown>) => Promise<ToolResult>
}

/**
 * Инструмент: Поиск в базе знаний профессора Остроуха
 */
export const searchProfessorKnowledgeTool: Tool = {
  name: 'search_professor_knowledge',
  description: 'Поиск информации в публикациях профессора Остроуха А.В. по автоматизации, ИИ, транспорту',
  parameters: [
    { name: 'query', type: 'string', description: 'Поисковый запрос', required: true },
    { name: 'limit', type: 'number', description: 'Максимум результатов (по умолчанию 5)', required: false }
  ],
  execute: async (params) => {
    try {
      const query = params.query as string
      const limit = (params.limit as number) || 5
      
      const { results, citations, relatedTopics } = await searchProfessorKnowledge(query, { limit })
      
      if (results.length === 0) {
        // Fallback к метаданным публикаций
        const pubs = findPublicationsByTopic(query)
        if (pubs.length > 0) {
          return {
            success: true,
            data: { publications: pubs },
            formatted: `Найдены публикации по теме "${query}":\n` + 
              pubs.slice(0, 3).map(p => `- "${p.title}" (${p.year})`).join('\n')
          }
        }
        return { success: true, data: { results: [] }, formatted: 'Информация не найдена в базе знаний профессора.' }
      }
      
      const formatted = `Из публикаций профессора Остроуха:\n` +
        results.slice(0, 3).map((r, i) => `${i + 1}. ${r.content.slice(0, 200)}...`).join('\n\n') +
        (citations.length > 0 ? `\n\nИсточники: ${citations.slice(0, 2).join('; ')}` : '')
      
      return {
        success: true,
        data: { results, citations, relatedTopics },
        formatted
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}

/**
 * Инструмент: Поиск научных статей на arXiv
 */
export const searchArxivTool: Tool = {
  name: 'search_arxiv',
  description: 'Поиск научных статей на arXiv по теме',
  parameters: [
    { name: 'query', type: 'string', description: 'Поисковый запрос на английском', required: true },
    { name: 'maxResults', type: 'number', description: 'Максимум результатов (по умолчанию 3)', required: false }
  ],
  execute: async (params) => {
    try {
      const query = params.query as string
      const maxResults = (params.maxResults as number) || 3
      
      const result = await searchArxiv(query, maxResults)
      
      if (!result || !result.papers || result.papers.length === 0) {
        return { success: true, data: { results: [] }, formatted: 'Статьи не найдены на arXiv.' }
      }
      
      const formatted = `Научные статьи с arXiv:\n` +
        result.papers.slice(0, 3).map((paper, i) => 
          `${i + 1}. "${paper.title}" (${paper.authors?.slice(0, 2).join(', ')}...)\n   ${paper.summary?.slice(0, 150)}...`
        ).join('\n\n')
      
      return { success: true, data: { papers: result.papers }, formatted }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}

/**
 * Инструмент: Поиск в общей базе знаний (векторный поиск)
 */
export const searchKnowledgeBaseTool: Tool = {
  name: 'search_knowledge_base',
  description: 'Поиск в общей базе знаний системы (Wikipedia, книги, веб)',
  parameters: [
    { name: 'query', type: 'string', description: 'Поисковый запрос', required: true },
    { name: 'limit', type: 'number', description: 'Максимум результатов', required: false }
  ],
  execute: async (params) => {
    try {
      const query = params.query as string
      const limit = (params.limit as number) || 5
      
      const results = await searchSimilar(query, { limit, threshold: 0.3 })
      
      if (results.length === 0) {
        return { success: true, data: { results: [] }, formatted: 'Информация не найдена в базе знаний.' }
      }
      
      const formatted = `Из базы знаний:\n` +
        results.slice(0, 3).map((r, i) => {
          const source = (r.metadata as Record<string, unknown>)?.source || 'unknown'
          return `${i + 1}. [${source}] ${r.content.slice(0, 200)}...`
        }).join('\n\n')
      
      return { success: true, data: { results }, formatted }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}

/**
 * Инструмент: Генерация примера кода
 */
export const generateCodeExampleTool: Tool = {
  name: 'generate_code_example',
  description: 'Генерация примера кода на указанном языке программирования',
  parameters: [
    { name: 'language', type: 'string', description: 'Язык программирования (python, javascript, etc)', required: true },
    { name: 'concept', type: 'string', description: 'Концепция для демонстрации', required: true }
  ],
  execute: async (params) => {
    const language = params.language as string
    const concept = params.concept as string
    
    // Простые примеры для демонстрации (в реальности можно генерировать через LLM)
    const examples: Record<string, Record<string, string>> = {
      python: {
        'цикл': '# Пример цикла for\nfor i in range(5):\n    print(f"Итерация {i}")',
        'функция': '# Пример функции\ndef greet(name: str) -> str:\n    return f"Привет, {name}!"',
        'класс': '# Пример класса\nclass Person:\n    def __init__(self, name: str):\n        self.name = name',
        'список': '# Работа со списком\nnumbers = [1, 2, 3, 4, 5]\nsquares = [x**2 for x in numbers]'
      },
      javascript: {
        'цикл': '// Пример цикла for\nfor (let i = 0; i < 5; i++) {\n  console.log(`Итерация ${i}`);\n}',
        'функция': '// Пример функции\nfunction greet(name) {\n  return `Привет, ${name}!`;\n}',
        'класс': '// Пример класса\nclass Person {\n  constructor(name) {\n    this.name = name;\n  }\n}'
      }
    }
    
    const langExamples = examples[language.toLowerCase()] || examples['python']
    const example = langExamples[concept.toLowerCase()] || `// Пример для "${concept}" на ${language}`
    
    return {
      success: true,
      data: { language, concept, code: example },
      formatted: `\`\`\`${language}\n${example}\n\`\`\``
    }
  }
}

/**
 * Все доступные инструменты
 */
export const ALL_CHAT_TOOLS: Tool[] = [
  searchProfessorKnowledgeTool,
  searchArxivTool,
  searchKnowledgeBaseTool,
  generateCodeExampleTool
]

/**
 * Получить инструменты для конкретного персонажа
 */
export function getToolsForCharacter(characterId: string): Tool[] {
  switch (characterId) {
    case 'ostroukh':
      // Профессор Остроух имеет доступ к своей базе знаний
      return [searchProfessorKnowledgeTool, searchArxivTool, searchKnowledgeBaseTool]
    case 'feynman':
      // Фейнман фокусируется на объяснениях и примерах
      return [searchKnowledgeBaseTool, generateCodeExampleTool]
    case 'socrates':
      // Сократ использует только общую базу знаний
      return [searchKnowledgeBaseTool]
    default:
      return ALL_CHAT_TOOLS
  }
}

/**
 * Форматирование описания инструментов для промпта
 */
export function formatToolsForPrompt(tools: Tool[]): string {
  if (tools.length === 0) return ''
  
  const toolDescriptions = tools.map(t => 
    `- ${t.name}: ${t.description}`
  ).join('\n')
  
  return `
[ДОСТУПНЫЕ ИНСТРУМЕНТЫ]:
${toolDescriptions}

Если тебе нужна дополнительная информация для ответа, ты можешь использовать эти инструменты.
Для вызова инструмента напиши: [TOOL: имя_инструмента(параметры)]
Например: [TOOL: search_professor_knowledge(query="нейронные сети")]
`
}

/**
 * Парсинг вызова инструмента из ответа агента
 */
export function parseToolCall(response: string): { toolName: string; params: Record<string, unknown> } | null {
  const toolCallRegex = /\[TOOL:\s*(\w+)\((.*?)\)\]/
  const match = response.match(toolCallRegex)
  
  if (!match) return null
  
  const toolName = match[1]
  const paramsStr = match[2]
  
  // Парсим параметры
  const params: Record<string, unknown> = {}
  const paramRegex = /(\w+)=["']?([^"',]+)["']?/g
  let paramMatch
  while ((paramMatch = paramRegex.exec(paramsStr)) !== null) {
    params[paramMatch[1]] = paramMatch[2]
  }
  
  return { toolName, params }
}

/**
 * Выполнение инструмента по имени
 */
export async function executeTool(
  toolName: string, 
  params: Record<string, unknown>,
  availableTools: Tool[]
): Promise<ToolResult> {
  const tool = availableTools.find(t => t.name === toolName)
  
  if (!tool) {
    return { success: false, error: `Инструмент "${toolName}" не найден` }
  }
  
  return tool.execute(params)
}
