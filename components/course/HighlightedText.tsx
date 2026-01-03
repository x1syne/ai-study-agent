'use client'

import { useState, useCallback, useMemo } from 'react'
import type { TermDefinition } from '@/lib/agents/types'

// ═══════════════════════════════════════════════════════════════
// 📝 TYPES
// ═══════════════════════════════════════════════════════════════

interface HighlightedTextProps {
  /** Markdown text with ==term== markup */
  text: string
  /** Glossary of term definitions */
  glossary?: TermDefinition[]
  /** Custom class for highlighted terms */
  highlightClassName?: string
}

interface ParsedSegment {
  type: 'text' | 'term'
  content: string
}

// ═══════════════════════════════════════════════════════════════
// 🔧 PARSING
// ═══════════════════════════════════════════════════════════════

/**
 * Parse text with ==term== markup into segments
 */
function parseHighlightedText(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = []
  const pattern = /==([^=]+)==/g
  
  let lastIndex = 0
  let match
  
  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      })
    }
    
    // Add the highlighted term
    segments.push({
      type: 'term',
      content: match[1]
    })
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex)
    })
  }
  
  return segments
}

// ═══════════════════════════════════════════════════════════════
// 🎨 TOOLTIP COMPONENT
// ═══════════════════════════════════════════════════════════════

interface TermTooltipProps {
  term: string
  definition?: TermDefinition
  children: React.ReactNode
}

function TermTooltip({ term, definition, children }: TermTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  
  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    })
    setIsVisible(true)
  }, [])
  
  const handleMouseLeave = useCallback(() => {
    setIsVisible(false)
  }, [])
  
  return (
    <span className="relative inline">
      <span
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="cursor-help"
      >
        {children}
      </span>
      
      {isVisible && definition && (
        <div 
          className="fixed z-50 max-w-xs p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl transform -translate-x-1/2 -translate-y-full -mt-2"
          style={{ 
            left: position.x, 
            top: position.y,
            pointerEvents: 'none'
          }}
        >
          {/* Arrow */}
          <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
            <div className="border-8 border-transparent border-t-gray-900" />
          </div>
          
          {/* Content */}
          <div className="font-semibold text-yellow-300 mb-1">
            {definition.term}
          </div>
          <div className="text-gray-200">
            {definition.definition}
          </div>
          
          {/* Examples */}
          {definition.examples && definition.examples.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-1">Пример:</div>
              <code className="text-xs text-green-300 bg-gray-800 px-1 py-0.5 rounded">
                {definition.examples[0].slice(0, 50)}
                {definition.examples[0].length > 50 && '...'}
              </code>
            </div>
          )}
        </div>
      )}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function HighlightedText({
  text,
  glossary = [],
  highlightClassName = ''
}: HighlightedTextProps) {
  // Create glossary lookup map
  const glossaryMap = useMemo(() => {
    const map = new Map<string, TermDefinition>()
    glossary.forEach(term => {
      map.set(term.term.toLowerCase(), term)
    })
    return map
  }, [glossary])
  
  // Parse text into segments
  const segments = useMemo(() => parseHighlightedText(text), [text])
  
  // Find definition for a term
  const findDefinition = useCallback((term: string): TermDefinition | undefined => {
    return glossaryMap.get(term.toLowerCase())
  }, [glossaryMap])
  
  return (
    <span>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <span key={index}>{segment.content}</span>
        }
        
        const definition = findDefinition(segment.content)
        
        return (
          <TermTooltip 
            key={index} 
            term={segment.content}
            definition={definition}
          >
            <mark 
              className={`
                bg-yellow-200 dark:bg-yellow-900/50 
                text-yellow-900 dark:text-yellow-100
                px-1 py-0.5 rounded
                ${highlightClassName}
              `}
            >
              {segment.content}
            </mark>
          </TermTooltip>
        )
      })}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🔧 MARKDOWN RENDERER WITH HIGHLIGHTS
// ═══════════════════════════════════════════════════════════════

interface HighlightedMarkdownProps {
  markdown: string
  glossary?: TermDefinition[]
}

/**
 * Process markdown line by line, applying highlights
 */
export function processMarkdownWithHighlights(
  markdown: string,
  glossary: TermDefinition[] = []
): string {
  // Replace ==term== with <mark> tags for HTML rendering
  return markdown.replace(
    /==([^=]+)==/g,
    '<mark class="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100 px-1 py-0.5 rounded" data-term="$1">$1</mark>'
  )
}

/**
 * Extract all highlighted terms from markdown
 */
export function extractHighlightedTerms(markdown: string): string[] {
  const terms: string[] = []
  const pattern = /==([^=]+)==/g
  let match
  
  while ((match = pattern.exec(markdown)) !== null) {
    const term = match[1].trim()
    if (!terms.includes(term)) {
      terms.push(term)
    }
  }
  
  return terms
}
