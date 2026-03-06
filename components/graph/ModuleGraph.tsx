'use client'

import { useCallback, useMemo, useEffect, useState } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Handle,
  Position,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  ConnectionLineType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Brain, Sparkle, Lightning, BookOpen } from '@phosphor-icons/react'
import type { Module } from '@/types'

interface ModuleGraphProps {
  modules: Module[]
  onModuleClick?: (moduleId: string) => void
  selectedModuleId?: string | null
  isLoadingTopics?: boolean
}

// Статусы модулей на основе прогресса
type ModuleStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED'

const STATUS_STYLES: Record<ModuleStatus, { 
  bg: string
  border: string
  glow: string
  pulse: string
}> = {
  LOCKED: { 
    bg: 'rgba(30, 41, 59, 0.8)', 
    border: '#475569', 
    glow: 'rgba(71, 85, 105, 0.3)',
    pulse: 'rgba(71, 85, 105, 0.1)',
  },
  AVAILABLE: { 
    bg: 'rgba(14, 165, 233, 0.15)', 
    border: '#0ea5e9', 
    glow: 'rgba(14, 165, 233, 0.5)',
    pulse: 'rgba(14, 165, 233, 0.2)',
  },
  IN_PROGRESS: { 
    bg: 'rgba(249, 115, 22, 0.15)', 
    border: '#f97316', 
    glow: 'rgba(249, 115, 22, 0.5)',
    pulse: 'rgba(249, 115, 22, 0.2)',
  },
  COMPLETED: { 
    bg: 'rgba(34, 197, 94, 0.15)', 
    border: '#22c55e', 
    glow: 'rgba(34, 197, 94, 0.5)',
    pulse: 'rgba(34, 197, 94, 0.2)',
  },
}

const STATUS_LABELS: Record<ModuleStatus, string> = {
  LOCKED: '🔒 Заблокирован',
  AVAILABLE: '✨ Доступен',
  IN_PROGRESS: '⚡ В процессе',
  COMPLETED: '✅ Завершён',
}

// Компонент узла модуля
function ModuleNode({ data }: { 
  data: { 
    label: string
    icon: string
    progress: number
    status: ModuleStatus
    isSelected: boolean
    topicsCount: number
    order: number
    isLoading?: boolean
  } 
}) {
  const styles = STATUS_STYLES[data.status]
  const isActive = data.status !== 'LOCKED'
  
  return (
    <div className="relative group">
      {/* React Flow handles for edge connections */}
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />

      {/* Внешнее свечение */}
      <div 
        className={`absolute -inset-4 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
          isActive ? 'animate-pulse' : ''
        }`}
        style={{ 
          background: `radial-gradient(circle, ${styles.glow} 0%, transparent 70%)`,
        }}
      />

      {/* Основной узел */}
      <div
        className={`
          relative w-40 h-40 rounded-3xl flex flex-col items-center justify-center
          border-2 backdrop-blur-xl cursor-pointer
          transition-all duration-300 ease-out
          ${data.isSelected ? 'scale-110 z-20' : 'hover:scale-105'}
          ${isActive ? 'shadow-2xl' : 'opacity-60'}
        `}
        style={{
          background: styles.bg,
          borderColor: styles.border,
          boxShadow: data.isSelected 
            ? `0 0 40px ${styles.glow}, 0 0 80px ${styles.pulse}`
            : `0 0 20px ${styles.glow}`,
        }}
      >
        {/* Номер модуля */}
        <div 
          className="absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ 
            background: styles.bg,
            borderColor: styles.border,
            border: '2px solid',
            color: styles.border,
          }}
        >
          {data.order}
        </div>

        {/* Индикатор загрузки */}
        {data.isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-3xl z-10">
            <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Иконка */}
        <div className="text-4xl mb-2">{data.icon}</div>
        
        {/* Название */}
        <div className="text-white font-semibold text-sm text-center px-3 leading-tight max-w-[130px]">
          {data.label}
        </div>
        
        {/* Количество тем */}
        <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
          <BookOpen size={12} />
          <span>{data.topicsCount} тем</span>
        </div>

        {/* Прогресс-бар */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-500"
              style={{ 
                width: `${data.progress}%`,
                background: styles.border,
              }}
            />
          </div>
          <div className="text-center mt-1 text-xs font-medium" style={{ color: styles.border }}>
            {data.progress}%
          </div>
        </div>
      </div>
    </div>
  )
}

const nodeTypes = { module: ModuleNode }

export function ModuleGraph({ 
  modules, 
  onModuleClick, 
  selectedModuleId,
  isLoadingTopics,
}: ModuleGraphProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Определяем статус модуля на основе прогресса
  const getModuleStatus = useCallback((module: Module): ModuleStatus => {
    const progress = module.progress || 0
    const topicsCount = module.topics?.length || 0
    
    // Если нет тем — доступен для генерации
    if (topicsCount === 0) return 'AVAILABLE'
    
    // Проверяем статусы тем
    const completedTopics = module.topics?.filter(t => {
      const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
      return p?.status === 'COMPLETED' || p?.status === 'MASTERED'
    }).length || 0
    
    const inProgressTopics = module.topics?.filter(t => {
      const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
      return p?.status === 'IN_PROGRESS'
    }).length || 0

    if (completedTopics === topicsCount && topicsCount > 0) return 'COMPLETED'
    if (inProgressTopics > 0 || completedTopics > 0) return 'IN_PROGRESS'
    
    // Проверяем, заблокирован ли модуль (первый модуль всегда доступен)
    if (module.order === 1) return 'AVAILABLE'
    
    // Проверяем, завершён ли предыдущий модуль
    const prevModule = modules.find(m => m.order === module.order - 1)
    if (prevModule) {
      const prevProgress = prevModule.progress || 0
      if (prevProgress < 100) return 'LOCKED'
    }
    
    return 'AVAILABLE'
  }, [modules])

  // Создаём узлы в круговой раскладке (как в KnowledgeGraph)
  // Requirement 6: Circular layout for modules
  const initialNodes: Node[] = useMemo(() => {
    if (modules.length === 0) return []

    const sortedModules = [...modules].sort((a, b) => a.order - b.order)
    const nodes: Node[] = []
    
    const centerX = 400
    const centerY = 250
    const radius = 200 // Радиус круга
    const angleStep = (2 * Math.PI) / Math.max(sortedModules.length, 1)
    const startAngle = -Math.PI / 2 // Начинаем сверху

    sortedModules.forEach((module, index) => {
      const status = getModuleStatus(module)
      const topicsCount = module.topics?.length || 0
      
      // Вычисляем прогресс
      let moduleProgress = 0
      if (topicsCount > 0) {
        const completedTopics = module.topics?.filter(t => {
          const p = Array.isArray(t.progress) ? t.progress[0] : t.progress
          return p?.status === 'COMPLETED' || p?.status === 'MASTERED'
        }).length || 0
        moduleProgress = Math.round((completedTopics / topicsCount) * 100)
      }

      // Круговое расположение
      const angle = startAngle + index * angleStep
      const x = centerX + radius * Math.cos(angle) - 80 // -80 для центрирования узла
      const y = centerY + radius * Math.sin(angle) - 80

      nodes.push({
        id: module.id,
        type: 'module',
        position: { x, y },
        data: {
          label: module.name,
          icon: module.icon || '📚',
          progress: moduleProgress,
          status,
          isSelected: module.id === selectedModuleId,
          topicsCount,
          order: module.order,
          isLoading: isLoadingTopics && module.id === selectedModuleId,
        },
      })
    })

    return nodes
  }, [modules, selectedModuleId, getModuleStatus, isLoadingTopics])

  // Создаём связи между модулями (для круговой раскладки)
  const initialEdges: Edge[] = useMemo(() => {
    const sortedModules = [...modules].sort((a, b) => a.order - b.order)
    const edges: Edge[] = []

    for (let i = 0; i < sortedModules.length - 1; i++) {
      const current = sortedModules[i]
      const next = sortedModules[i + 1]
      const currentStatus = getModuleStatus(current)
      const nextStatus = getModuleStatus(next)
      
      const isActive = currentStatus === 'COMPLETED' || nextStatus !== 'LOCKED'
      const styles = STATUS_STYLES[isActive ? 'AVAILABLE' : 'LOCKED']

      edges.push({
        id: `${current.id}-${next.id}`,
        source: current.id,
        target: next.id,
        type: 'default', // Используем default для круговой раскладки
        animated: isActive,
        style: { 
          stroke: styles.border,
          strokeWidth: isActive ? 3 : 2,
          opacity: isActive ? 0.8 : 0.3,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: styles.border,
          width: 20,
          height: 20,
        },
      })
    }

    return edges
  }, [modules, getModuleStatus])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  useEffect(() => {
    setNodes(initialNodes)
  }, [initialNodes, setNodes])

  useEffect(() => {
    setEdges(initialEdges)
  }, [initialEdges, setEdges])

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const module = modules.find(m => m.id === node.id)
    if (!module) return
    
    const status = getModuleStatus(module)
    if (status === 'LOCKED') return
    
    onModuleClick?.(node.id)
  }, [onModuleClick, modules, getModuleStatus])

  if (!mounted) return null

  // Статистика
  const completedModules = modules.filter(m => getModuleStatus(m) === 'COMPLETED').length
  const totalTopics = modules.reduce((sum, m) => sum + (m.topics?.length || 0), 0)

  return (
    <div className="relative h-[500px] rounded-2xl overflow-hidden border border-slate-700/50 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Фоновые эффекты */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(14, 165, 233, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(168, 85, 247, 0.15) 0%, transparent 40%)
          `
        }} />
      </div>

      {/* Заголовок */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3 bg-slate-900/80 backdrop-blur-xl rounded-full px-6 py-3 border border-slate-700/50">
        <Brain size={20} weight="duotone" className="text-purple-400" />
        <span className="text-white font-semibold">Модули курса</span>
        <Sparkle size={16} weight="fill" className="text-cyan-400 animate-pulse" />
      </div>

      {/* Легенда */}
      <div className="absolute top-4 left-4 z-10 bg-slate-900/80 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Lightning size={16} weight="fill" className="text-amber-400" />
          <span className="text-sm font-semibold text-white">Статусы</span>
        </div>
        <div className="space-y-2">
          {Object.entries(STATUS_STYLES).map(([status, styles]) => (
            <div key={status} className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-lg border-2"
                style={{ 
                  backgroundColor: styles.bg, 
                  borderColor: styles.border,
                  boxShadow: `0 0 8px ${styles.glow}`
                }}
              />
              <span className="text-xs text-slate-300">
                {STATUS_LABELS[status as ModuleStatus]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Статистика */}
      <div className="absolute top-4 right-4 z-10 bg-slate-900/80 backdrop-blur-xl rounded-xl p-4 border border-slate-700/50">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-cyan-400">{modules.length}</div>
            <div className="text-xs text-slate-400">Модулей</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{completedModules}</div>
            <div className="text-xs text-slate-400">Завершено</div>
          </div>
          <div className="col-span-2">
            <div className="text-lg font-bold text-purple-400">{totalTopics}</div>
            <div className="text-xs text-slate-400">Всего тем</div>
          </div>
        </div>
      </div>

      {/* Подсказка */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-slate-900/80 backdrop-blur-xl rounded-full px-4 py-2 border border-slate-700/50">
        <span className="text-xs text-slate-400">
          Кликни на модуль для просмотра тем
        </span>
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
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
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
