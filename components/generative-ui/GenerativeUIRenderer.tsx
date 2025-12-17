'use client'

import { QuizCard } from './QuizCard'
import { ComparisonTable } from './ComparisonTable'
import { CodeExample } from './CodeExample'
import { ProgressCard } from './ProgressCard'
import { FlowChart } from './FlowChart'
import { InfoCard } from './InfoCard'
import { TheoryContent } from '@/components/learning/TheoryContent'
import type { GenerativeUIComponent, QuizData, ComparisonData, CodeData, ProgressData, FlowchartData, InfoData, StepsData, ListData, TextData } from './types'

interface GenerativeUIRendererProps {
  content: string
}

// Parse AI response to extract UI components
function parseGenerativeUI(content: string): { components: GenerativeUIComponent[], textParts: string[] } {
  const components: GenerativeUIComponent[] = []
  const textParts: string[] = []
  
  // Look for JSON blocks with UI components
  const jsonBlockRegex = /```json:ui\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = jsonBlockRegex.exec(content)) !== null) {
    // Add text before this block
    const textBefore = content.slice(lastIndex, match.index).trim()
    if (textBefore) {
      textParts.push(textBefore)
    }

    // Parse the JSON component
    try {
      const parsed = JSON.parse(match[1])
      if (parsed.type && parsed.data) {
        components.push(parsed as GenerativeUIComponent)
        textParts.push(`__COMPONENT_${components.length - 1}__`)
      }
    } catch (e) {
      // If JSON parsing fails, treat as text
      textParts.push(match[0])
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  const remainingText = content.slice(lastIndex).trim()
  if (remainingText) {
    textParts.push(remainingText)
  }

  // If no components found, return original content
  if (components.length === 0) {
    return { components: [], textParts: [content] }
  }

  return { components, textParts }
}

export function GenerativeUIRenderer({ content }: GenerativeUIRendererProps) {
  const { components, textParts } = parseGenerativeUI(content)

  return (
    <div className="space-y-4">
      {textParts.map((part, index) => {
        // Check if this is a component placeholder
        const componentMatch = part.match(/^__COMPONENT_(\d+)__$/)
        if (componentMatch) {
          const componentIndex = parseInt(componentMatch[1])
          const component = components[componentIndex]
          
          if (!component) return null

          switch (component.type) {
            case 'quiz':
              return <QuizCard key={index} data={component.data as QuizData} />
            case 'comparison':
              return <ComparisonTable key={index} data={component.data as ComparisonData} />
            case 'code':
              return <CodeExample key={index} data={component.data as CodeData} />
            case 'progress':
              return <ProgressCard key={index} data={component.data as ProgressData} />
            case 'flowchart':
              return <FlowChart key={index} data={component.data as FlowchartData} />
            case 'info':
              return <InfoCard key={index} data={component.data as InfoData} />
            case 'steps':
              return <StepsRenderer key={index} data={component.data as StepsData} />
            case 'list':
              return <ListRenderer key={index} data={component.data as ListData} />
            default:
              return null
          }
        }

        // Regular text - render with TheoryContent for markdown
        if (part.trim()) {
          return <TheoryContent key={index} content={part} topicName="" />
        }
        return null
      })}
    </div>
  )
}

// Steps component
function StepsRenderer({ data }: { data: StepsData }) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <h4 className="font-medium text-white mb-4">{data.title}</h4>
      <div className="space-y-3">
        {data.steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center text-sm font-medium flex-shrink-0">
              {i + 1}
            </div>
            <div>
              <p className="font-medium text-slate-200">{step.title}</p>
              <p className="text-sm text-slate-400">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// List component
function ListRenderer({ data }: { data: ListData }) {
  const ListTag = data.ordered ? 'ol' : 'ul'
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      {data.title && <h4 className="font-medium text-white mb-3">{data.title}</h4>}
      <ListTag className={`space-y-2 ${data.ordered ? 'list-decimal' : 'list-disc'} list-inside`}>
        {data.items.map((item, i) => (
          <li key={i} className="text-slate-300">{item}</li>
        ))}
      </ListTag>
    </div>
  )
}

