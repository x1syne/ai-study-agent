/**
 * 📈 DIAGRAM GENERATOR
 * 
 * Генерирует диаграммы и графики для визуализации контента:
 * - Mermaid диаграммы (flowchart, sequence, class, etc.)
 * - Chart.js графики (bar, pie, line, etc.)
 */

import type {
  MermaidDiagram,
  ChartConfig,
  ChartType,
  DiagramConfig
} from './types'

// ═══════════════════════════════════════════════════════════════
// 🎯 CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Валидные префиксы Mermaid диаграмм
 */
export const VALID_MERMAID_PREFIXES = [
  'graph',
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'stateDiagram',
  'erDiagram',
  'journey',
  'gantt',
  'pie',
  'gitGraph',
  'mindmap',
  'timeline'
]

/**
 * Типы Mermaid диаграмм
 */
export type MermaidDiagramType = 
  | 'flowchart'
  | 'sequence'
  | 'class'
  | 'state'
  | 'er'
  | 'journey'
  | 'gantt'
  | 'pie'
  | 'git'
  | 'mindmap'
  | 'timeline'

/**
 * Шаблоны Mermaid диаграмм
 */
const MERMAID_TEMPLATES: Record<MermaidDiagramType, (title: string, items: string[]) => string> = {
  flowchart: (title, items) => {
    const nodes = items.map((item, i) => `    ${String.fromCharCode(65 + i)}[${item}]`).join('\n')
    const connections = items.slice(0, -1).map((_, i) => 
      `    ${String.fromCharCode(65 + i)} --> ${String.fromCharCode(66 + i)}`
    ).join('\n')
    return `graph TD\n    title[${title}]\n${nodes}\n${connections}`
  },
  
  sequence: (title, items) => {
    const participants = items.slice(0, 3)
    const messages = participants.slice(0, -1).map((p, i) => 
      `    ${p}->>+${participants[i + 1]}: Сообщение ${i + 1}`
    ).join('\n')
    return `sequenceDiagram\n    title ${title}\n${messages}`
  },
  
  class: (title, items) => {
    const classes = items.map(item => 
      `    class ${item.replace(/\s+/g, '')} {\n        +attribute\n        +method()\n    }`
    ).join('\n')
    return `classDiagram\n    title ${title}\n${classes}`
  },
  
  state: (title, items) => {
    const states = items.map((item, i) => {
      if (i === 0) return `    [*] --> ${item.replace(/\s+/g, '')}`
      if (i === items.length - 1) return `    ${items[i-1].replace(/\s+/g, '')} --> [*]`
      return `    ${items[i-1].replace(/\s+/g, '')} --> ${item.replace(/\s+/g, '')}`
    }).join('\n')
    return `stateDiagram-v2\n    title ${title}\n${states}`
  },
  
  er: (title, items) => {
    const entities = items.slice(0, 3).map(item => 
      `    ${item.replace(/\s+/g, '_').toUpperCase()} {\n        int id PK\n        string name\n    }`
    ).join('\n')
    return `erDiagram\n    title ${title}\n${entities}`
  },
  
  journey: (title, items) => {
    const steps = items.map((item, i) => 
      `    ${item}: ${5 - Math.min(i, 4)}: Пользователь`
    ).join('\n')
    return `journey\n    title ${title}\n    section Процесс\n${steps}`
  },
  
  gantt: (title, items) => {
    const tasks = items.map((item, i) => 
      `    ${item} :a${i}, 2024-01-0${i + 1}, ${i + 1}d`
    ).join('\n')
    return `gantt\n    title ${title}\n    dateFormat YYYY-MM-DD\n    section Задачи\n${tasks}`
  },
  
  pie: (title, items) => {
    const slices = items.map((item, i) => 
      `    "${item}" : ${Math.round(100 / items.length)}`
    ).join('\n')
    return `pie title ${title}\n${slices}`
  },
  
  git: (title, _items) => {
    return `gitGraph\n    commit id: "Начало"\n    branch develop\n    commit id: "Разработка"\n    checkout main\n    merge develop id: "Релиз"`
  },
  
  mindmap: (title, items) => {
    const branches = items.map(item => `        ${item}`).join('\n')
    return `mindmap\n    root((${title}))\n${branches}`
  },
  
  timeline: (title, items) => {
    const events = items.map((item, i) => 
      `    ${2020 + i} : ${item}`
    ).join('\n')
    return `timeline\n    title ${title}\n${events}`
  }
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Проверяет валидность Mermaid синтаксиса
 */
export function isValidMermaidSyntax(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false
  }
  
  const trimmedCode = code.trim()
  if (trimmedCode.length === 0) {
    return false
  }
  
  // Проверяем, начинается ли код с валидного префикса
  const firstLine = trimmedCode.split('\n')[0].trim().toLowerCase()
  
  return VALID_MERMAID_PREFIXES.some(prefix => 
    firstLine.startsWith(prefix.toLowerCase())
  )
}

/**
 * Проверяет валидность Chart.js конфигурации
 */
export function isValidChartConfig(config: ChartConfig): boolean {
  const validTypes: ChartType[] = ['bar_chart', 'pie_chart', 'line_graph', 'mind_map']
  
  if (!validTypes.includes(config.type)) {
    return false
  }
  
  if (!config.data || typeof config.data !== 'object') {
    return false
  }
  
  if (!Array.isArray(config.data.labels) || config.data.labels.length === 0) {
    return false
  }
  
  if (!Array.isArray(config.data.datasets) || config.data.datasets.length === 0) {
    return false
  }
  
  // Проверяем каждый dataset
  for (const dataset of config.data.datasets) {
    if (typeof dataset.label !== 'string') {
      return false
    }
    if (!Array.isArray(dataset.data)) {
      return false
    }
  }
  
  if (typeof config.interactive !== 'boolean') {
    return false
  }
  
  return true
}

/**
 * Генерирует цвета для графика
 */
function generateChartColors(count: number): string[] {
  const baseColors = [
    'rgba(79, 70, 229, 0.8)',   // Indigo
    'rgba(16, 185, 129, 0.8)',  // Emerald
    'rgba(139, 92, 246, 0.8)',  // Violet
    'rgba(245, 158, 11, 0.8)',  // Amber
    'rgba(239, 68, 68, 0.8)',   // Red
    'rgba(59, 130, 246, 0.8)',  // Blue
    'rgba(236, 72, 153, 0.8)',  // Pink
    'rgba(34, 197, 94, 0.8)'    // Green
  ]
  
  const colors: string[] = []
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length])
  }
  return colors
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Генерирует Mermaid диаграмму
 */
export function generateMermaidDiagram(
  title: string,
  items: string[],
  diagramType: MermaidDiagramType = 'flowchart',
  interactive: boolean = true
): MermaidDiagram {
  const template = MERMAID_TEMPLATES[diagramType]
  const safeItems = items.length > 0 ? items : ['Элемент 1', 'Элемент 2', 'Элемент 3']
  const code = template(title, safeItems)
  
  return {
    type: 'mermaid',
    code,
    interactive
  }
}

/**
 * Генерирует Chart.js конфигурацию
 */
export function generateChartConfig(
  title: string,
  labels: string[],
  data: number[],
  chartType: ChartType = 'bar_chart',
  interactive: boolean = true
): ChartConfig {
  const safeLabels = labels.length > 0 ? labels : ['Категория 1', 'Категория 2', 'Категория 3']
  const safeData = data.length > 0 ? data : [30, 50, 20]
  
  return {
    type: chartType,
    data: {
      labels: safeLabels,
      datasets: [{
        label: title,
        data: safeData,
        backgroundColor: generateChartColors(safeLabels.length)
      }]
    },
    interactive
  }
}

/**
 * Генерирует диаграмму на основе контента
 */
export function generateDiagramFromContent(
  content: string,
  preferredType: 'mermaid' | 'chartjs' = 'mermaid'
): DiagramConfig {
  // Извлекаем ключевые слова из контента
  const words = content.split(/\s+/).filter(w => w.length > 3).slice(0, 5)
  const title = words.slice(0, 3).join(' ') || 'Диаграмма'
  
  if (preferredType === 'chartjs') {
    // Генерируем случайные данные для графика
    const data = words.map(() => Math.floor(Math.random() * 100) + 10)
    return generateChartConfig(title, words, data)
  }
  
  return generateMermaidDiagram(title, words)
}

/**
 * Валидирует DiagramConfig
 */
export function validateDiagramConfig(config: DiagramConfig): boolean {
  if ('code' in config) {
    // Это MermaidDiagram
    return isValidMermaidSyntax(config.code) && typeof config.interactive === 'boolean'
  } else {
    // Это ChartConfig
    return isValidChartConfig(config)
  }
}

/**
 * Определяет тип диаграммы
 */
export function getDiagramType(config: DiagramConfig): 'mermaid' | 'chartjs' {
  return 'code' in config ? 'mermaid' : 'chartjs'
}
