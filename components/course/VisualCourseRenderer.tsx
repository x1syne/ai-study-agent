'use client'

/**
 * 🎨 VISUAL COURSE RENDERER
 * 
 * Главный компонент для рендеринга визуальных курсов:
 * - Применение visual_identity CSS переменных
 * - Интеграция MediaOrchestrator для визуалов
 * - Интеграция интерактивных компонентов
 * - Интеграция gamification компонентов
 * - Ленивая загрузка медиа
 */

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { ChevronLeft, ChevronRight, BookOpen, Target, Trophy } from 'lucide-react'
import type {
  VisualIdentity,
  VisualModule,
  VisualSection,
  TextBlock,
  ModuleVisualSpec,
  GamificationSpec,
  InteractiveComponentConfig
} from '@/lib/agents/types'

// Lazy load heavy components
const MediaOrchestrator = dynamic(
  () => import('@/components/media/MediaOrchestrator').then(mod => mod.MediaOrchestrator),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-lg" /> }
)

const DiagramOrchestrator = dynamic(
  () => import('@/components/media/MediaOrchestrator').then(mod => mod.DiagramOrchestrator),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-200 h-48 rounded-lg" /> }
)

const DragAndDrop = dynamic(
  () => import('@/components/interactive/DragAndDrop'),
  { ssr: false }
)

const QuizWithFeedback = dynamic(
  () => import('@/components/interactive/QuizWithFeedback'),
  { ssr: false }
)

const FlipCard = dynamic(
  () => import('@/components/interactive/FlipCard').then(mod => mod.TermFlipCard),
  { ssr: false }
)

const ProgressBar = dynamic(
  () => import('@/components/gamification/ProgressBar'),
  { ssr: false }
)

const BadgeSystem = dynamic(
  () => import('@/components/gamification/BadgeSystem').then(mod => mod.BadgeSystem),
  { ssr: false }
)

const ConfettiReward = dynamic(
  () => import('@/components/gamification/ConfettiReward'),
  { ssr: false }
)

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface VisualCourseRendererProps {
  modules: VisualModule[]
  visualIdentity: VisualIdentity
  currentModuleIndex?: number
  onModuleChange?: (index: number) => void
  onModuleComplete?: (moduleId: string) => void
}

interface TextBlockRendererProps {
  block: TextBlock
  index: number
}

interface SectionRendererProps {
  section: VisualSection
  visualIdentity: VisualIdentity
}

// ═══════════════════════════════════════════════════════════════
// 🎨 CSS VARIABLES GENERATOR
// ═══════════════════════════════════════════════════════════════

const generateCSSVariables = (identity: VisualIdentity): React.CSSProperties => ({
  '--primary-color': identity.primaryColor,
  '--gradient': identity.gradient,
  '--font-primary': identity.fontPairing[0],
  '--font-mono': identity.fontPairing[1],
} as React.CSSProperties)

// ═══════════════════════════════════════════════════════════════
// 📝 MARKDOWN PARSER
// ═══════════════════════════════════════════════════════════════

const parseMarkdown = (text: string): string => {
  if (!text) return ''
  
  return text
    // Headers
    .replace(/^### (.*$)/gim, '<h4 class="text-lg font-semibold text-gray-800 mt-4 mb-2">$1</h4>')
    .replace(/^## (.*$)/gim, '<h3 class="text-xl font-bold text-gray-800 mt-6 mb-3">$1</h3>')
    .replace(/^# (.*$)/gim, '<h2 class="text-2xl font-bold text-gray-800 mt-6 mb-4">$1</h2>')
    // Bold and italic
    .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong class="font-bold"><em>$1</em></strong>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
    // Code
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-gray-100 rounded text-purple-600 text-sm font-mono">$1</code>')
    // Lists
    .replace(/^- (.*$)/gim, '<li class="ml-4 mb-1">• $1</li>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="mb-3">')
    .replace(/\n/g, '<br/>')
}

// ═══════════════════════════════════════════════════════════════
// 📝 TEXT BLOCK RENDERER
// ═══════════════════════════════════════════════════════════════

const TextBlockRenderer: React.FC<TextBlockRendererProps> = ({ block, index }) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.div
      className="text-block flex gap-6 mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      {/* Visual */}
      <div className="flex-shrink-0 w-24">
        <MediaOrchestrator visual={block.accompanyingVisual} />
      </div>

      {/* Text content */}
      <div className="flex-1">
        <div 
          className="text-gray-700 leading-relaxed prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: parseMarkdown(block.text) }}
        />

        {/* Interactive element */}
        {block.interactiveElement && (
          <div className="mt-4">
            {block.interactiveElement.type === 'toggle_detail' && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-blue-500 hover:text-blue-600 flex items-center gap-1"
              >
                {expanded ? 'Скрыть детали' : 'Показать детали'}
              </button>
            )}
            
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-2 p-4 bg-blue-50 rounded-lg text-sm text-gray-600"
                >
                  {block.interactiveElement.content}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 📊 SECTION RENDERER
// ═══════════════════════════════════════════════════════════════

const SectionRenderer: React.FC<SectionRendererProps> = ({ section, visualIdentity }) => {
  const sectionIcons = {
    theory: BookOpen,
    example: Target,
    practice: Trophy,
    review: BookOpen
  }
  
  const SectionIcon = sectionIcons[section.contentType]

  return (
    <div className="section mb-12">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-6">
        <div 
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${visualIdentity.primaryColor}20` }}
        >
          <SectionIcon 
            size={24} 
            style={{ color: visualIdentity.primaryColor }}
          />
        </div>
        <h3 className="text-xl font-semibold text-gray-800 capitalize">
          {section.contentType === 'theory' ? 'Теория' :
           section.contentType === 'example' ? 'Примеры' :
           section.contentType === 'practice' ? 'Практика' : 'Повторение'}
        </h3>
      </div>

      {/* Text blocks */}
      <div className="text-blocks mb-8">
        {section.textBlocks.map((block, index) => (
          <TextBlockRenderer key={index} block={block} index={index} />
        ))}
      </div>

      {/* Diagrams */}
      {section.multimedia.diagrams.length > 0 && (
        <div className="diagrams grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {section.multimedia.diagrams.map((diagram, index) => (
            <div key={index} className="bg-white rounded-xl p-4 shadow-sm border">
              <DiagramOrchestrator diagram={diagram} />
            </div>
          ))}
        </div>
      )}

      {/* Interactive component */}
      {section.interactiveComponent && (
        <div className="interactive-component mb-8">
          <InteractiveRenderer config={section.interactiveComponent} />
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎮 INTERACTIVE RENDERER
// ═══════════════════════════════════════════════════════════════

const InteractiveRenderer: React.FC<{ config: InteractiveComponentConfig }> = ({ config }) => {
  const handleComplete = (correct: boolean, score: number) => {
    console.log(`Interactive completed: correct=${correct}, score=${score}`)
  }

  switch (config.type) {
    case 'drag_and_drop':
      return (
        <DragAndDrop
          type={config.difficulty || 'matching'}
          data={config.data as any}
          onComplete={handleComplete}
          hintsAvailable={config.hintsAvailable}
        />
      )
    
    case 'quiz_with_feedback':
      return (
        <QuizWithFeedback
          questions={(config.data as any).questions || []}
          onComplete={(score, passed) => handleComplete(passed, score)}
          hintsAvailable={config.hintsAvailable}
        />
      )
    
    default:
      return null
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export const VisualCourseRenderer: React.FC<VisualCourseRendererProps> = ({
  modules,
  visualIdentity,
  currentModuleIndex = 0,
  onModuleChange,
  onModuleComplete
}) => {
  const [activeModule, setActiveModule] = useState(currentModuleIndex)
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set())
  const [showConfetti, setShowConfetti] = useState(false)

  const currentModule = modules[activeModule]
  const cssVariables = useMemo(() => generateCSSVariables(visualIdentity), [visualIdentity])

  const handleModuleComplete = () => {
    if (currentModule) {
      setCompletedModules(prev => new Set(prev).add(currentModule.id))
      setShowConfetti(true)
      onModuleComplete?.(currentModule.id)
    }
  }

  const goToModule = (index: number) => {
    if (index >= 0 && index < modules.length) {
      setActiveModule(index)
      onModuleChange?.(index)
    }
  }

  if (!currentModule) {
    return <div>Модуль не найден</div>
  }

  return (
    <div 
      className="visual-course-renderer min-h-screen"
      style={cssVariables}
    >
      {/* Confetti reward */}
      <ConfettiReward
        show={showConfetti}
        message="Модуль завершён!"
        emoji="🎉"
        onComplete={() => setShowConfetti(false)}
      />

      {/* Header with progress */}
      <header 
        className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b"
        style={{ borderColor: `${visualIdentity.primaryColor}30` }}
      >
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-800">
              {currentModule.name}
            </h1>
            <span className="text-sm text-gray-500">
              Модуль {activeModule + 1} из {modules.length}
            </span>
          </div>
          
          <ProgressBar
            current={completedModules.size}
            max={modules.length}
            color="gradient"
            size="sm"
            showPercentage={false}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero section */}
        {currentModule.visualSpec && (
          <motion.div
            className="hero-section mb-12 rounded-2xl overflow-hidden"
            style={{ 
              background: visualIdentity.gradient,
              padding: '2rem'
            }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-4 text-white">
              <div className="text-4xl">
                {currentModule.visualSpec.secondaryVisuals[0]?.icons?.[0] || '📚'}
              </div>
              <div>
                <h2 className="text-2xl font-bold">{currentModule.name}</h2>
                <p className="opacity-80">{currentModule.description}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Sections */}
        {currentModule.sections?.map((section, index) => (
          <SectionRenderer
            key={index}
            section={section}
            visualIdentity={visualIdentity}
          />
        ))}

        {/* Key terms as flip cards */}
        {currentModule.keyTerms.length > 0 && (
          <div className="key-terms mb-12">
            <h3 className="text-xl font-semibold text-gray-800 mb-6">
              Ключевые термины
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentModule.keyTerms.slice(0, 6).map((term, index) => (
                <FlipCard
                  key={index}
                  term={term}
                  definition={`Определение термина "${term}" из модуля "${currentModule.name}"`}
                  emoji={currentModule.visualSpec?.secondaryVisuals[0]?.icons?.[index % 5] || '📖'}
                />
              ))}
            </div>
          </div>
        )}

        {/* Complete module button */}
        {!completedModules.has(currentModule.id) && (
          <div className="text-center mb-12">
            <button
              onClick={handleModuleComplete}
              className="px-8 py-3 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transition-all"
              style={{ background: visualIdentity.gradient }}
            >
              Завершить модуль
            </button>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => goToModule(activeModule - 1)}
            disabled={activeModule === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
            <span className="hidden sm:inline">Предыдущий</span>
          </button>

          {/* Module dots */}
          <div className="flex gap-2">
            {modules.map((module, index) => (
              <button
                key={module.id}
                onClick={() => goToModule(index)}
                className={`
                  w-3 h-3 rounded-full transition-all
                  ${index === activeModule 
                    ? 'scale-125' 
                    : completedModules.has(module.id)
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }
                `}
                style={index === activeModule ? { backgroundColor: visualIdentity.primaryColor } : {}}
              />
            ))}
          </div>

          <button
            onClick={() => goToModule(activeModule + 1)}
            disabled={activeModule === modules.length - 1}
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Следующий</span>
            <ChevronRight size={20} />
          </button>
        </div>
      </nav>
    </div>
  )
}

export default VisualCourseRenderer
