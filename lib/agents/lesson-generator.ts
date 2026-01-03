/**
 * 📚 LESSON GENERATOR - Split modules into lessons
 * 
 * Разбивает модули на отдельные уроки (3-7 уроков на модуль)
 * Извлекает ключевые термины и рассчитывает время чтения
 */

import type {
  CourseModule,
  Lesson,
  TermDefinition,
  TopicType
} from './types'

// ═══════════════════════════════════════════════════════════════
// 🔧 CONSTANTS
// ═══════════════════════════════════════════════════════════════

const MIN_LESSONS_PER_MODULE = 3
const MAX_LESSONS_PER_MODULE = 7
const WORDS_PER_MINUTE = 200 // Average reading speed
const MIN_WORDS_PER_LESSON = 800
const MAX_WORDS_PER_LESSON = 2000

// ═══════════════════════════════════════════════════════════════
// 📝 LESSON SPLITTING
// ═══════════════════════════════════════════════════════════════

/**
 * Split module theory into separate lessons
 */
export function splitModuleIntoLessons(
  module: CourseModule,
  theoryMarkdown: string,
  topicType: TopicType
): Lesson[] {
  console.log(`[LessonGenerator] Splitting module "${module.name}" into lessons`)
  
  // Parse sections from markdown
  const sections = parseMarkdownSections(theoryMarkdown)
  
  if (sections.length === 0) {
    // Fallback: create single lesson from entire content
    return [createLessonFromContent(module, theoryMarkdown, 1)]
  }
  
  // Group sections into lessons (3-7 lessons per module)
  const lessons = groupSectionsIntoLessons(module, sections, topicType)
  
  console.log(`[LessonGenerator] Created ${lessons.length} lessons for "${module.name}"`)
  
  return lessons
}

/**
 * Parse markdown into sections by ## headers
 */
function parseMarkdownSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = []
  const lines = markdown.split('\n')
  
  let currentSection: MarkdownSection | null = null
  let contentLines: string[] = []
  
  for (const line of lines) {
    // Check for ## header (main sections)
    const headerMatch = line.match(/^##\s+(.+)$/)
    
    if (headerMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim()
        currentSection.wordCount = countWords(currentSection.content)
        sections.push(currentSection)
      }
      
      // Start new section
      currentSection = {
        title: headerMatch[1].trim(),
        content: '',
        wordCount: 0
      }
      contentLines = []
    } else if (currentSection) {
      contentLines.push(line)
    }
  }
  
  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim()
    currentSection.wordCount = countWords(currentSection.content)
    sections.push(currentSection)
  }
  
  return sections
}

interface MarkdownSection {
  title: string
  content: string
  wordCount: number
}

/**
 * Group sections into lessons based on word count
 */
function groupSectionsIntoLessons(
  module: CourseModule,
  sections: MarkdownSection[],
  topicType: TopicType
): Lesson[] {
  const lessons: Lesson[] = []
  
  // Calculate target number of lessons
  const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0)
  const targetLessons = Math.min(
    MAX_LESSONS_PER_MODULE,
    Math.max(MIN_LESSONS_PER_MODULE, Math.ceil(totalWords / MAX_WORDS_PER_LESSON))
  )
  
  const targetWordsPerLesson = Math.ceil(totalWords / targetLessons)
  
  let currentLessonSections: MarkdownSection[] = []
  let currentWordCount = 0
  let lessonOrder = 1
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    currentLessonSections.push(section)
    currentWordCount += section.wordCount
    
    // Check if we should create a lesson
    const isLastSection = i === sections.length - 1
    const reachedTargetWords = currentWordCount >= targetWordsPerLesson
    const hasEnoughLessons = lessons.length >= targetLessons - 1
    
    if (isLastSection || (reachedTargetWords && !hasEnoughLessons)) {
      // Create lesson from accumulated sections
      const lessonContent = currentLessonSections
        .map(s => `## ${s.title}\n\n${s.content}`)
        .join('\n\n')
      
      const lesson = createLessonFromContent(
        module,
        lessonContent,
        lessonOrder,
        currentLessonSections[0].title
      )
      
      lessons.push(lesson)
      lessonOrder++
      currentLessonSections = []
      currentWordCount = 0
    }
  }
  
  // Ensure we have at least MIN_LESSONS_PER_MODULE
  if (lessons.length < MIN_LESSONS_PER_MODULE && lessons.length > 0) {
    // Redistribute content if needed
    return redistributeLessons(lessons, module)
  }
  
  return lessons
}

/**
 * Redistribute lessons to meet minimum count
 */
function redistributeLessons(lessons: Lesson[], module: CourseModule): Lesson[] {
  if (lessons.length >= MIN_LESSONS_PER_MODULE) {
    return lessons
  }
  
  // If we have fewer lessons, just return what we have
  // (better to have quality content than artificial splits)
  return lessons
}

/**
 * Create a lesson from markdown content
 */
function createLessonFromContent(
  module: CourseModule,
  content: string,
  order: number,
  titleOverride?: string
): Lesson {
  const wordCount = countWords(content)
  const keyTerms = extractKeyTerms(content)
  const estimatedReadTime = Math.ceil(wordCount / WORDS_PER_MINUTE)
  
  // Generate title from first header or module name
  let title = titleOverride || `${module.name} - Часть ${order}`
  
  // Clean up title
  title = title.replace(/^\d+\.\s*/, '').trim()
  
  return {
    id: `${module.id}-lesson-${order}`,
    moduleId: module.id,
    order,
    title,
    description: generateLessonDescription(content, title),
    theoryMarkdown: content,
    keyTerms,
    estimatedReadTime: Math.max(5, Math.min(15, estimatedReadTime)), // 5-15 min
    wordCount,
    practiceTaskIds: [] // Will be filled later
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔍 KEY TERM EXTRACTION
// ═══════════════════════════════════════════════════════════════

/**
 * Extract key terms from markdown content
 * Looks for ==term== markup
 */
export function extractKeyTerms(markdown: string): TermDefinition[] {
  const terms: TermDefinition[] = []
  const seenTerms = new Set<string>()
  
  // Find all ==term== patterns
  const termPattern = /==([^=]+)==/g
  let match
  
  while ((match = termPattern.exec(markdown)) !== null) {
    const term = match[1].trim().toLowerCase()
    
    if (seenTerms.has(term)) continue
    seenTerms.add(term)
    
    // Try to find definition near the term
    const definition = findTermDefinition(markdown, match[1].trim(), match.index)
    
    terms.push({
      term: match[1].trim(),
      definition: definition || `Ключевой термин: ${match[1].trim()}`,
      examples: findTermExamples(markdown, match[1].trim())
    })
  }
  
  return terms
}

/**
 * Find definition for a term in surrounding context
 */
function findTermDefinition(markdown: string, term: string, termIndex: number): string | null {
  // Look for patterns like "Term — definition" or "Term - definition"
  const surroundingText = markdown.slice(
    Math.max(0, termIndex - 200),
    Math.min(markdown.length, termIndex + 500)
  )
  
  // Pattern: term — definition (до точки или конца строки)
  const dashPattern = new RegExp(
    `==?${escapeRegex(term)}==?\\s*[—–-]\\s*([^.\\n]+)`,
    'i'
  )
  const dashMatch = surroundingText.match(dashPattern)
  if (dashMatch) {
    return dashMatch[1].trim()
  }
  
  // Pattern: term это/является definition
  const isPattern = new RegExp(
    `==?${escapeRegex(term)}==?\\s*(?:это|является|представляет собой)\\s+([^.]+)`,
    'i'
  )
  const isMatch = surroundingText.match(isPattern)
  if (isMatch) {
    return isMatch[1].trim()
  }
  
  return null
}

/**
 * Find examples for a term in the content
 */
function findTermExamples(markdown: string, term: string): string[] {
  const examples: string[] = []
  
  // Look for code blocks near the term
  const termIndex = markdown.toLowerCase().indexOf(term.toLowerCase())
  if (termIndex === -1) return examples
  
  const surroundingText = markdown.slice(
    termIndex,
    Math.min(markdown.length, termIndex + 1000)
  )
  
  // Find code blocks
  const codePattern = /```[\w]*\n([\s\S]*?)```/g
  let match
  
  while ((match = codePattern.exec(surroundingText)) !== null) {
    if (examples.length >= 2) break
    const code = match[1].trim()
    if (code.length < 200) {
      examples.push(code)
    }
  }
  
  return examples
}

// ═══════════════════════════════════════════════════════════════
// 🔧 UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Count words in text
 */
function countWords(text: string): number {
  // Remove code blocks for word count
  const textWithoutCode = text.replace(/```[\s\S]*?```/g, '')
  return textWithoutCode.split(/\s+/).filter(w => w.length > 0).length
}

/**
 * Generate lesson description from content
 */
function generateLessonDescription(content: string, title: string): string {
  // Get first paragraph after title
  const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#'))
  
  if (lines.length > 0) {
    const firstParagraph = lines[0].trim()
    if (firstParagraph.length > 20 && firstParagraph.length < 200) {
      return firstParagraph
    }
  }
  
  return `Изучите ${title.toLowerCase()}`
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Calculate reading time in minutes
 */
export function calculateReadingTime(wordCount: number): number {
  return Math.ceil(wordCount / WORDS_PER_MINUTE)
}
