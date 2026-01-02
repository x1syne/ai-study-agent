'use client'

/**
 * 🎬 MEDIA ORCHESTRATOR
 * 
 * Компонент для оркестрации медиа-контента:
 * - Mermaid диаграммы
 * - Chart.js графики
 * - Lucide иконки
 * - Изображения (placeholder)
 */

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import * as LucideIcons from 'lucide-react'
import type { 
  AccompanyingVisual, 
  DiagramConfig, 
  ChartConfig,
  MermaidDiagram 
} from '@/lib/agents/types'

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface MediaOrchestratorProps {
  visual: AccompanyingVisual
  className?: string
  animate?: boolean
}

interface MermaidRendererProps {
  code: string
  className?: string
}

interface ChartRendererProps {
  config: ChartConfig
  className?: string
}

interface IconRendererProps {
  iconName: string
  className?: string
  size?: number
}

// ═══════════════════════════════════════════════════════════════
// 🎨 MERMAID RENDERER
// ═══════════════════════════════════════════════════════════════

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ code, className }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const renderMermaid = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'Inter, sans-serif'
        })
        
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`
        const { svg } = await mermaid.render(id, code)
        setSvg(svg)
        setError(null)
      } catch (err: any) {
        console.error('Mermaid render error:', err)
        setError(err.message || 'Failed to render diagram')
      }
    }

    if (code) {
      renderMermaid()
    }
  }, [code])

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-600 text-sm">Ошибка рендеринга диаграммы: {error}</p>
        <pre className="mt-2 text-xs text-gray-600 overflow-auto">{code}</pre>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`mermaid-container ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// ═══════════════════════════════════════════════════════════════
// 📊 CHART RENDERER
// ═══════════════════════════════════════════════════════════════

const ChartRenderer: React.FC<ChartRendererProps> = ({ config, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<any>(null)

  useEffect(() => {
    const renderChart = async () => {
      if (!canvasRef.current) return

      const { Chart, registerables } = await import('chart.js')
      Chart.register(...registerables)

      // Destroy existing chart
      if (chartRef.current) {
        chartRef.current.destroy()
      }

      // Map our chart types to Chart.js types
      const chartTypeMap: Record<string, string> = {
        'bar_chart': 'bar',
        'pie_chart': 'pie',
        'line_graph': 'line',
        'mind_map': 'doughnut' // Fallback for mind_map
      }

      const chartType = chartTypeMap[config.type] || 'bar'

      chartRef.current = new Chart(canvasRef.current, {
        type: chartType as any,
        data: config.data,
        options: {
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      })
    }

    renderChart()

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy()
      }
    }
  }, [config])

  return (
    <div className={`chart-container ${className}`}>
      <canvas ref={canvasRef} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 ICON RENDERER
// ═══════════════════════════════════════════════════════════════

const IconRenderer: React.FC<IconRendererProps> = ({ iconName, className, size = 24 }) => {
  // Get icon from Lucide
  const Icon = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle
  
  return (
    <div className={`icon-container flex items-center justify-center ${className}`}>
      <Icon size={size} className="text-primary" />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🖼️ IMAGE PLACEHOLDER
// ═══════════════════════════════════════════════════════════════

const ImagePlaceholder: React.FC<{ description: string; className?: string }> = ({ 
  description, 
  className 
}) => {
  return (
    <div className={`
      bg-gradient-to-br from-gray-100 to-gray-200 
      rounded-lg p-6 flex flex-col items-center justify-center
      min-h-[200px] ${className}
    `}>
      <LucideIcons.Image className="w-12 h-12 text-gray-400 mb-3" />
      <p className="text-sm text-gray-500 text-center max-w-xs">
        {description}
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎬 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export const MediaOrchestrator: React.FC<MediaOrchestratorProps> = ({
  visual,
  className = '',
  animate = true
}) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  }

  const renderContent = () => {
    switch (visual.type) {
      case 'icon':
        return (
          <IconRenderer 
            iconName={visual.iconName || 'HelpCircle'} 
            className={className}
            size={48}
          />
        )
      
      case 'diagram':
        if (visual.mermaidCode) {
          return (
            <MermaidRenderer 
              code={visual.mermaidCode} 
              className={className}
            />
          )
        }
        if (visual.chartConfig) {
          return (
            <ChartRenderer 
              config={visual.chartConfig} 
              className={className}
            />
          )
        }
        return (
          <ImagePlaceholder 
            description={visual.description} 
            className={className}
          />
        )
      
      case 'illustration':
      case 'photo':
        return (
          <ImagePlaceholder 
            description={visual.description} 
            className={className}
          />
        )
      
      default:
        return (
          <ImagePlaceholder 
            description={visual.description || 'Визуальный элемент'} 
            className={className}
          />
        )
    }
  }

  if (animate) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="media-orchestrator"
      >
        {renderContent()}
      </motion.div>
    )
  }

  return <div className="media-orchestrator">{renderContent()}</div>
}

// ═══════════════════════════════════════════════════════════════
// 📊 DIAGRAM ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════

interface DiagramOrchestratorProps {
  diagram: DiagramConfig
  className?: string
}

export const DiagramOrchestrator: React.FC<DiagramOrchestratorProps> = ({
  diagram,
  className = ''
}) => {
  if ('code' in diagram) {
    // MermaidDiagram
    return <MermaidRenderer code={diagram.code} className={className} />
  } else {
    // ChartConfig
    return <ChartRenderer config={diagram} className={className} />
  }
}

export default MediaOrchestrator
