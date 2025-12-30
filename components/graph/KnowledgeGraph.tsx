'use client'

import { useCallback, useMemo, useEffect, useState } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  ConnectionLineType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Brain, Sparkle, Lightning } from '@phosphor-icons/react'
import type { Topic, TopicStatus } from '@/types'
import { getTopicIcon } from '@/lib/topic-icons'

interface KnowledgeGraphProps {
  topics: Topic[]
  onTopicClick?: (topicId: string) => void
  selectedTopicId?: string | null
}

// Neural network inspired color scheme
const STATUS_STYLES: Record<TopicStatus, { 
  bg: string
  border: string
  glow: string
  pulse: string
  gradient: string
}> = {
  LOCKED: { 
    bg: 'rgba(30, 41, 59, 0.8)', 
    border: '#475569', 
    glow: 'rgba(71, 85, 105, 0.3)',
    pulse: 'rgba(71, 85, 105, 0.1)',
    gradient: 'from-slate-700 to-slate-800'
  },
  AVAILABLE: { 
    bg: 'rgba(14, 165, 233, 0.15)', 
    border: '#0ea5e9', 
    glow: 'rgba(14, 165, 233, 0.5)',
    pulse: 'rgba(14, 165, 233, 0.2)',
    gradient: 'from-cyan-500 to-blue-600'
  },
  IN_PROGRESS: { 
    bg: 'rgba(249, 115, 22, 0.15)', 
    border: '#f97316', 
    glow: 'rgba(249, 115, 22, 0.5)',
    pulse: 'rgba(249, 115, 22, 0.2)',
    gradient: 'from-orange-500 to-amber-500'
  },
  COMPLETED: { 
    bg: 'rgba(34, 197, 94, 0.15)', 
    border: '#22c55e', 
    glow: 'rgba(34, 197, 94, 0.5)',
    pulse: 'rgba(34, 197, 94, 0.2)',
    gradient: 'from-green-500 to-emerald-500'
  },
  MASTERED: { 
    bg: 'rgba(168, 85, 247, 0.15)', 
    border: '#a855f7', 
    glow: 'rgba(168, 85, 247, 0.6)',
    pulse: 'rgba(168, 85, 247, 0.3)',
    gradient: 'from-purple-500 to-violet-600'
  },
}

const STATUS_LABELS: Record<TopicStatus, string> = {
  LOCKED: '🔒 Заблокировано',
  AVAILABLE: '✨ Доступно',
  IN_PROGRESS: '⚡ В процессе',
  COMPLETED: '✅ Завершено',
  MASTERED: '🏆 Освоено',
}

// Neural Node Component
function NeuralNode({ data }: { 
  data: { 
    label: string
    IconComponent: React.ComponentType<{ size?: number; weight?: string; className?: string }>
    mastery: number
    status: TopicStatus
    isSelected: boolean
    connections: number
  } 
}) {
  const styles = STATUS_STYLES[data.status]
  const isActive = data.status !== 'LOCKED'
  const IconComponent = data.IconComponent
  
  return (
    <div className="relative group">
      {/* Outer glow ring */}
      <div 
        className={`absolute -inset-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
          isActive ? 'animate-pulse' : ''
        }`}
        style={{ 
          background: `radial-gradient(circle, ${styles.glow} 0%, transparent 70%)`,
        }}
      />
      
      {/* Connection indicator dots */}
      {data.connections > 0 && (
        <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600 z-10">
          <span className="text-[10px] text-slate-300">{data.connections}</span>
        </div>
      )}

      {/* Main node */}
      <div
        className={`
          relative w-32 h-32 rounded-full flex flex-col items-center justify-center
          border-2 backdrop-blur-xl cursor-pointer
          transition-all duration-300 ease-out
          ${data.isSelected ? 'scale-125 z-20' : 'hover:scale-110'}
          ${isActive ? 'shadow-2xl' : ''}
        `}
        style={{
          background: styles.bg,
          borderColor: styles.border,
          boxShadow: data.isSelected 
            ? `0 0 40px ${styles.glow}, 0 0 80px ${styles.pulse}, inset 0 0 30px ${styles.pulse}`
            : `0 0 20px ${styles.glow}`,
        }}
      >
        {/* Inner glow */}
        <div 
          className="absolute inset-2 rounded-full opacity-30"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${styles.border}40 0%, transparent 60%)`
          }}
        />
        
        {/* Icon - Phosphor */}
        <div className="mb-1 relative z-10 drop-shadow-lg" style={{ color: styles.border }}>
          <IconComponent size={32} weight="duotone" />
        </div>
        
        {/* Label */}
        <div className="text-white font-semibold text-xs text-center px-2 leading-tight relative z-10 max-w-[100px]">
          {data.label}
        </div>
        
        {/* Mastery ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="60"
            fill="none"
            stroke={styles.border}
            strokeWidth="3"
            strokeDasharray={`${(data.mastery / 100) * 377} 377`}
            strokeLinecap="round"
            className="opacity-60"
          />
        </svg>
        
        {/* Mastery percentage */}
        <div 
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ 
            background: styles.bg,
            borderColor: styles.border,
            color: styles.border,
            border: '1px solid'
          }}
        >
          {data.mastery}%
        </div>
      </div>
    </div>
  )
}

const nodeTypes = { neural: NeuralNode }

export function KnowledgeGraph({ topics, onTopicClick, selectedTopicId }: KnowledgeGraphProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getTopicStatus = useCallback((topic: Topic): TopicStatus => {
    const progress = Array.isArray(topic.progress) ? topic.progress[0] : topic.progress
    return progress?.status || 'AVAILABLE'
  }, [])

  const getMasteryLevel = useCallback((topic: Topic): number => {
    const progress = Array.isArray(topic.progress) ? topic.progress[0] : topic.progress
    return progress?.masteryLevel || 0
  }, [])

  // Create nodes in circular/radial layout like a neural network
  const initialNodes: Node[] = useMemo(() => {
    if (topics.length === 0) return []

    const nodes: Node[] = []
    const centerX = 400
    const centerY = 300
    
    // Calculate layers based on prerequisites
    const layers: Map<number, Topic[]> = new Map()
    const topicLayers: Map<string, number> = new Map()
    
    const getLayer = (topic: Topic, visited: Set<string> = new Set()): number => {
      if (visited.has(topic.id)) return 0
      visited.add(topic.id)
      
      if (!topic.prerequisiteIds?.length) return 0
      
      const prereqLayers = topic.prerequisiteIds
        .map(prereqId => {
          const prereq = topics.find(t => t.id === prereqId)
          return prereq ? getLayer(prereq, visited) : -1
        })
        .filter(l => l >= 0)
      
      return prereqLayers.length > 0 ? Math.max(...prereqLayers) + 1 : 0
    }
    
    topics.forEach(topic => {
      const layer = getLayer(topic)
      topicLayers.set(topic.id, layer)
      if (!layers.has(layer)) layers.set(layer, [])
      layers.get(layer)!.push(topic)
    })

    const baseRadius = 150
    
    layers.forEach((layerTopics, layer) => {
      const radius = baseRadius + layer * 180
      const angleStep = (2 * Math.PI) / Math.max(layerTopics.length, 1)
      const startAngle = -Math.PI / 2 // Start from top
      
      layerTopics.forEach((topic, index) => {
        const angle = startAngle + index * angleStep
        const x = centerX + radius * Math.cos(angle)
        const y = centerY + radius * Math.sin(angle)
        
        // Count connections
        const connections = (topic.prerequisiteIds?.length || 0) + 
          topics.filter(t => t.prerequisiteIds?.includes(topic.id)).length

        nodes.push({
          id: topic.id,
          type: 'neural',
          position: { x: x - 64, y: y - 64 },
          data: {
            label: topic.name,
            IconComponent: getTopicIcon(topic.name),
            mastery: getMasteryLevel(topic),
            status: getTopicStatus(topic),
            isSelected: topic.id === selectedTopicId,
            connections,
          },
        })
      })
    })

    return nodes
  }, [topics, selectedTopicId, getTopicStatus, getMasteryLevel])

  // Create neural connection edges
  const initialEdges: Edge[] = useMemo(() => {
    return topics.flatMap(topic =>
      (topic.prerequisiteIds || [])
        .filter(prereqId => topics.some(t => t.id === prereqId))
        .map(prereqId => {
          const status = getTopicStatus(topic)
          const styles = STATUS_STYLES[status]
          const isActive = status === 'IN_PROGRESS' || status === 'AVAILABLE'
          
          return {
            id: `${prereqId}-${topic.id}`,
            source: prereqId,
            target: topic.id,
            type: 'default',
            animated: isActive,
            style: { 
              stroke: styles.border,
              strokeWidth: isActive ? 3 : 2,
              opacity: status === 'LOCKED' ? 0.3 : 0.7,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: styles.border,
              width: 20,
              height: 20,
            },
          }
        })
    )
  }, [topics, getTopicStatus])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update nodes when topics or selection changes
  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  // Update edges when topics change
  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (onTopicClick) {
      onTopicClick(node.id)
    }
  }, [onTopicClick])

  if (!mounted) return null

  return (
    <div className="relative h-[700px] rounded-2xl overflow-hidden border border-slate-700/50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(14, 165, 233, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%)
          `
        }} />
      </div>

      {/* Header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl rounded-full px-6 py-3 border border-slate-700/50">
        <Brain size={20} weight="duotone" className="text-purple-400" />
        <span className="text-white font-semibold">Нейронная сеть знаний</span>
        <Sparkle size={16} weight="fill" className="text-cyan-400 animate-pulse" />
      </div>

      {/* Legend */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Lightning size={16} weight="fill" className="text-amber-400" />
          <span className="text-sm font-semibold text-white">Статусы</span>
        </div>
        <div className="space-y-2">
          {Object.entries(STATUS_STYLES).map(([status, styles]) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{ 
                  backgroundColor: styles.bg, 
                  borderColor: styles.border,
                  boxShadow: `0 0 8px ${styles.glow}`
                }}
              />
              <span className="text-xs text-slate-300">
                {STATUS_LABELS[status as TopicStatus]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="absolute top-4 right-4 z-10 bg-slate-900/80 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-cyan-400">{topics.length}</div>
            <div className="text-xs text-slate-400">Нейронов</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-400">
              {topics.reduce((acc, t) => acc + (t.prerequisiteIds?.length || 0), 0)}
            </div>
            <div className="text-xs text-slate-400">Связей</div>
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={30} 
          size={1.5} 
          color="rgba(148, 163, 184, 0.15)" 
        />
        <Controls 
          className="!bg-slate-800/80 !backdrop-blur-xl !border-slate-700 !rounded-xl [&>button]:!bg-slate-700/80 [&>button]:!border-slate-600 [&>button:hover]:!bg-slate-600" 
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  )
}

