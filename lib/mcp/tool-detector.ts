// Tool Detector - Detect when user wants to use MCP tools

export interface ToolDetectionResult {
  needsFileSave: boolean
  needsSearch: boolean
  fileInfo?: {
    filename: string
    content: string
    type: 'code' | 'note' | 'example'
  }
  searchQuery?: string
}

/**
 * Detect if user wants to save a file
 * Requirements: 1.1 - Detect when user wants to save a file
 */
export function detectFileSave(message: string): { detected: boolean; filename?: string; content?: string; type?: 'code' | 'note' | 'example' } {
  const lowerMessage = message.toLowerCase()

  // Keywords that indicate file save intent
  const saveKeywords = [
    'save', 'сохрани', 'сохранить', 'запиши', 'записать',
    'create file', 'создай файл', 'создать файл',
    'download', 'скачать', 'загрузить',
    'export', 'экспорт', 'экспортировать',
    'write', 'напиши', 'написать'
  ]

  // Check for save keywords
  const hasSaveKeyword = saveKeywords.some(keyword => lowerMessage.includes(keyword))
  
  // Extract filename first
  let filename: string | undefined
  let content: string | undefined
  let type: 'code' | 'note' | 'example' = 'code'

  // Pattern 1: "save to file.js" or "сохрани в file.js"
  const filenamePattern1 = /(?:save|сохрани|сохранить|запиши|записать|create|создай|создать|write|напиши|написать).*?(?:to|в|file|файл)?\s+([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)/i
  const match1 = message.match(filenamePattern1)
  if (match1) {
    filename = match1[1]
  }

  // Pattern 2: "file.js:" or "файл file.js:"
  const filenamePattern2 = /(?:file|файл)?\s*([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)\s*:/i
  const match2 = message.match(filenamePattern2)
  if (match2 && !filename) {
    filename = match2[1]
  }

  // Pattern 3: Just a filename with extension mentioned
  const filenamePattern3 = /\b([a-zA-Z0-9_-]+\.(js|ts|py|txt|md|json|jsx|tsx|css|html|docx|doc))\b/i
  const match3 = message.match(filenamePattern3)
  if (match3 && !filename) {
    filename = match3[1]
  }

  // If filename is found, consider it as save intent even without explicit keywords
  const hasFilename = !!filename
  
  if (!hasSaveKeyword && !hasFilename) {
    return { detected: false }
  }

  // Extract code blocks
  const codeBlockPattern = /```[\w]*\n([\s\S]*?)```/g
  const codeBlocks = Array.from(message.matchAll(codeBlockPattern))
  if (codeBlocks.length > 0) {
    // Use the first code block as content
    content = codeBlocks[0][1].trim()
  }

  // Determine file type from extension
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'md' || ext === 'txt' || ext === 'docx' || ext === 'doc') {
      type = 'note'
    } else if (ext === 'js' || ext === 'ts' || ext === 'py' || ext === 'jsx' || ext === 'tsx' || ext === 'json' || ext === 'css' || ext === 'html') {
      type = 'code'
    } else {
      type = 'example'
    }
  }

  // If we have a filename or content, consider it detected
  if (filename || content) {
    return {
      detected: true,
      filename,
      content,
      type
    }
  }

  return { detected: false }
}

/**
 * Detect if user needs web search
 * Requirements: 2.1 - Detect when user needs web search
 */
export function detectSearchNeed(message: string): { detected: boolean; query?: string } {
  const lowerMessage = message.toLowerCase()

  // Keywords that indicate search intent
  const searchKeywords = [
    // Explicit search requests
    'search', 'find', 'look up', 'google',
    'поиск', 'найди', 'найти', 'поищи', 'погугли',
    
    // Time-related (need current info)
    'latest', 'recent', 'new', 'current', 'today', 'now', 'this year',
    'последние', 'новые', 'текущие', 'сегодня', 'сейчас', 'этом году',
    
    // Version-related
    'version', 'release', 'update', 'changelog',
    'версия', 'релиз', 'обновление',
    
    // Comparison and trends
    'vs', 'versus', 'compare', 'comparison', 'best', 'top',
    'против', 'сравнить', 'сравнение', 'лучший', 'топ',
    
    // News and events
    'news', 'announcement', 'event', 'conference',
    'новости', 'анонс', 'событие', 'конференция'
  ]

  // Check for search keywords
  const hasSearchKeyword = searchKeywords.some(keyword => lowerMessage.includes(keyword))

  // Check for question marks (often indicate need for information)
  const hasQuestion = message.includes('?')

  // Check for year mentions (e.g., "React 19", "Python 3.12")
  const hasVersionNumber = /\d{4}|\d+\.\d+/.test(message)

  // Detect if search is needed
  const needsSearch = hasSearchKeyword || (hasQuestion && hasVersionNumber)

  if (!needsSearch) {
    return { detected: false }
  }

  // Extract search query
  let query = message

  // If explicit search request, extract the query part
  const explicitSearchPattern = /(?:search|find|look up|google|поиск|найди|найти|поищи|погугли)\s+(?:for|about|про|о)?\s*(.+?)(?:\?|$)/i
  const match = message.match(explicitSearchPattern)
  if (match) {
    query = match[1].trim()
  }

  // Clean up query (remove code blocks, etc.)
  query = query.replace(/```[\s\S]*?```/g, '').trim()

  // Limit query length
  if (query.length > 200) {
    query = query.substring(0, 200)
  }

  return {
    detected: true,
    query
  }
}

/**
 * Analyze message and detect all tool needs
 * Requirements: 1.1, 2.1
 */
export function detectToolNeeds(message: string): ToolDetectionResult {
  const fileSaveDetection = detectFileSave(message)
  const searchDetection = detectSearchNeed(message)

  return {
    needsFileSave: fileSaveDetection.detected,
    needsSearch: searchDetection.detected,
    fileInfo: fileSaveDetection.detected ? {
      filename: fileSaveDetection.filename || 'untitled.txt',
      content: fileSaveDetection.content || '',
      type: fileSaveDetection.type || 'code'
    } : undefined,
    searchQuery: searchDetection.detected ? searchDetection.query : undefined
  }
}
