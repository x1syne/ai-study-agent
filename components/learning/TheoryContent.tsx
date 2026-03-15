'use client'

import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, Lightbulb, AlertTriangle, CheckCircle, XCircle, Play, Youtube, ExternalLink, Info, Bookmark, ChevronDown, ChevronRight, Clock, BookOpen } from 'lucide-react'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { TextToSpeech } from '@/components/speech/TextToSpeech'

interface TheoryContentProps {
  content: string
  topicName: string
}

// Интерактивный квиз внутри теории
function InteractiveQuiz({ data }: { data: { question: string; options: string[]; correct: number; explanation: string } }) {
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  const handleSelect = (idx: number) => {
    if (revealed) return
    setSelected(idx)
    setRevealed(true)
  }

  return (
    <div className="my-6 p-4 bg-gradient-to-r from-primary-500/10 to-accent-500/10 border border-primary-500/30 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-5 h-5 text-primary-400" />
        <span className="font-medium text-primary-400">Проверь себя</span>
      </div>
      <p className="text-white mb-4">{data.question}</p>
      <div className="space-y-2">
        {data.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            disabled={revealed}
            className={`w-full p-3 rounded-lg text-left transition-all flex items-center gap-3 ${
              revealed
                ? idx === data.correct
                  ? 'bg-green-500/20 border-2 border-green-500'
                  : idx === selected
                  ? 'bg-red-500/20 border-2 border-red-500'
                  : 'bg-slate-800/50 border border-slate-700'
                : 'bg-slate-800/50 border border-slate-700 hover:border-primary-500 cursor-pointer'
            }`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
              revealed && idx === data.correct ? 'bg-green-500 text-white' :
              revealed && idx === selected ? 'bg-red-500 text-white' :
              'bg-slate-700 text-slate-300'
            }`}>
              {revealed && idx === data.correct ? <CheckCircle className="w-4 h-4" /> :
               revealed && idx === selected ? <XCircle className="w-4 h-4" /> :
               String.fromCharCode(65 + idx)}
            </span>
            <span className="text-slate-200">{opt}</span>
          </button>
        ))}
      </div>
      {revealed && (
        <div className={`mt-4 p-3 rounded-lg ${selected === data.correct ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
          <p className={`text-sm ${selected === data.correct ? 'text-green-400' : 'text-amber-400'}`}>
            {selected === data.correct ? '✓ Правильно! ' : '✗ Неверно. '}
            {data.explanation}
          </p>
        </div>
      )}
    </div>
  )
}

// Интерактивный код с заданием
function InteractiveCode({ data }: { data: { language: string; title: string; code: string; task: string } }) {
  const [code, setCode] = useState(data.code)
  const [output, setOutput] = useState('')

  const runCode = () => {
    // Простая симуляция выполнения для демонстрации
    try {
      // Для Python-подобного кода показываем что он "выполнен"
      setOutput('✓ Код выполнен! Попробуй изменить значения и запустить снова.')
    } catch {
      setOutput('Ошибка выполнения')
    }
  }

  return (
    <div className="my-6 bg-slate-900 rounded-xl overflow-hidden border border-slate-700">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-white">{data.title}</span>
          <span className="text-xs text-slate-500 uppercase">{data.language}</span>
        </div>
        <button onClick={runCode} className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-sm hover:bg-green-500/30 transition-colors">
          Запустить
        </button>
      </div>
      <div className="p-4">
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full bg-transparent text-slate-200 font-mono text-sm resize-none focus:outline-none min-h-[100px]"
          spellCheck={false}
        />
      </div>
      {data.task && (
        <div className="px-4 py-2 bg-primary-500/10 border-t border-slate-700">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary-300" />
            <p className="text-sm text-primary-300">Задание: {data.task}</p>
          </div>
        </div>
      )}
      {output && (
        <div className="px-4 py-2 bg-slate-800 border-t border-slate-700">
          <p className="text-sm text-green-400 font-mono">{output}</p>
        </div>
      )}
    </div>
  )
}

// Блок с типичной ошибкой (misconception)
function MisconceptionBlock({ data }: { data: { wrong: string; right: string; why: string } }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="my-6 p-4 bg-gradient-to-r from-red-500/10 to-amber-500/10 border border-red-500/30 rounded-xl">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-amber-400" />
        <span className="font-medium text-amber-400">Типичная ошибка</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <XCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300">Многие думают: "{data.wrong}"</p>
        </div>
        {revealed ? (
          <>
            <div className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-green-300">На самом деле: "{data.right}"</p>
            </div>
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-slate-300 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-300">{data.why}</p>
              </div>
            </div>
          </>
        ) : (
          <button
            onClick={() => setRevealed(true)}
            className="px-4 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30 transition-colors"
          >
            Показать правильный ответ
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Custom URL transform that allows data: URIs for inline base64 images
 * (NVIDIA FLUX.1 generates base64 JPEG illustrations embedded in markdown)
 */
function allowDataUrlTransform(url: string, key: string, node: any): string {
  if (url.startsWith('data:')) return url
  return defaultUrlTransform(url)
}

/**
 * Замена одиночных кириллических букв на латиницу в LaTeX-формулах.
 * Заменяем ТОЛЬКО одиночные символы (переменные), не слова.
 * Пример: "С" в середине формулы → "C", но "скорость" → \text{скорость}
 */
const CYRILLIC_SINGLE_CHAR_MAP: Record<string, string> = {
  // Только заглавные — они часто используются как переменные в формулах
  'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H', 'К': 'K', 'М': 'M',
  'О': 'O', 'Р': 'P', 'Т': 'T', 'Х': 'X',
}

function sanitizeLatexContent(content: string): string {
  return content.replace(/\$\$([^$]+)\$\$|\$([^$]+)\$/g, (match, block, inline) => {
    const formula = block || inline
    const isBlock = !!block

    let sanitized = formula

    // 1. Заменяем ТОЛЬКО одиночные кириллические буквы, окружённые не-кириллическими символами
    // (переменные в формулах: F = mС → F = mC)
    for (const [cyr, lat] of Object.entries(CYRILLIC_SINGLE_CHAR_MAP)) {
      // Заменяем только одиночные: не предшествует/не следует другая кириллица
      sanitized = sanitized.replace(
        new RegExp(`(?<![\u0430-\u044f\u0451\u0410-\u042f\u0401])${cyr}(?![\u0430-\u044f\u0451\u0410-\u042f\u0401])`, 'g'),
        lat
      )
    }

    // 2. Оборачиваем оставшийся кириллический текст (слова) в \text{}
    sanitized = sanitized.replace(/([\u0430-\u044f\u0451\u0410-\u042f\u0401]{2,}[\u0430-\u044f\u0451\u0410-\u042f\u0401\s]*)/g, '\\text{$1}')
    
    return isBlock ? `$$${sanitized}$$` : `$${sanitized}$`
  })
}

// ============================================================
// Callout блоки (tip / warning / important / remember)
// ============================================================

const CALLOUT_STYLES: Record<string, { icon: any; border: string; bg: string; title: string; titleColor: string }> = {
  tip: { icon: Lightbulb, border: 'border-green-500/40', bg: 'from-green-500/10 to-emerald-500/5', title: '💡 Совет', titleColor: 'text-green-400' },
  warning: { icon: AlertTriangle, border: 'border-amber-500/40', bg: 'from-amber-500/10 to-orange-500/5', title: '⚠️ Внимание', titleColor: 'text-amber-400' },
  important: { icon: Info, border: 'border-blue-500/40', bg: 'from-blue-500/10 to-indigo-500/5', title: '❗ Важно', titleColor: 'text-blue-400' },
  remember: { icon: Bookmark, border: 'border-purple-500/40', bg: 'from-purple-500/10 to-fuchsia-500/5', title: '📌 Запомни', titleColor: 'text-purple-400' },
}

function CalloutBlock({ type, content }: { type: string; content: string }) {
  const style = CALLOUT_STYLES[type] || CALLOUT_STYLES.tip
  const Icon = style.icon
  return (
    <div className={`my-6 p-4 bg-gradient-to-r ${style.bg} border ${style.border} rounded-xl`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-5 h-5 ${style.titleColor}`} />
        <span className={`font-medium ${style.titleColor}`}>{style.title}</span>
      </div>
      <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{content}</div>
    </div>
  )
}

// ============================================================
// Аккордеон / Спойлер (details)
// ============================================================

function AccordionBlock({ title, content }: { title: string; content: string }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="my-4 border border-slate-700/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-slate-800/60 hover:bg-slate-800 transition-colors text-left"
      >
        {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        <span className="text-sm font-medium text-slate-200">{title}</span>
      </button>
      {isOpen && (
        <div className="px-4 py-3 text-sm text-slate-300 leading-relaxed bg-slate-900/30 whitespace-pre-line border-t border-slate-700/40">
          {content}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Glossary тултип (термин с всплывающим определением)
// ============================================================

function GlossaryTerm({ term, definition }: { term: string; definition: string }) {
  const [show, setShow] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  return (
    <span className="relative inline-block" ref={ref}>
      <span
        className="border-b border-dashed border-primary-400/60 text-primary-300 cursor-help"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(s => !s)}
      >
        {term}
      </span>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl text-xs text-slate-200 whitespace-normal max-w-[260px] min-w-[160px]">
          <span className="font-semibold text-primary-300">{term}</span>
          <span className="block mt-1 text-slate-400 leading-relaxed">{definition}</span>
          {/* Arrow */}
          <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-[1px] w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-600" />
        </span>
      )}
    </span>
  )
}

// ============================================================
// Таймлайн (хронология)
// ============================================================

interface TimelineEvent {
  date: string
  title: string
  description?: string
}

function TimelineBlock({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="my-6 relative pl-6 border-l-2 border-primary-500/40">
      {events.map((event, i) => (
        <div key={i} className="mb-6 last:mb-0 relative">
          {/* Dot */}
          <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-primary-500 border-2 border-slate-900" />
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-xs font-mono text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">{event.date}</span>
            <span className="text-sm font-medium text-white">{event.title}</span>
          </div>
          {event.description && (
            <p className="text-xs text-slate-400 leading-relaxed ml-[72px]">{event.description}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================================
// Mermaid диаграммы (клиентский рендер)
// ============================================================

function MermaidDiagram({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Dynamic import — mermaid грузится только когда нужен
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme: 'dark', themeVariables: { primaryColor: '#6366f1', primaryTextColor: '#e2e8f0', lineColor: '#94a3b8' } })
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`
        const { svg: rendered } = await mermaid.render(id, chart.trim())
        if (!cancelled) setSvg(rendered)
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Mermaid render error')
      }
    })()
    return () => { cancelled = true }
  }, [chart])

  if (error) {
    return (
      <div className="my-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
        Ошибка диаграммы: {error}
      </div>
    )
  }

  if (!svg) {
    return <div className="my-4 h-32 bg-slate-800/50 rounded-xl animate-pulse" />
  }

  return (
    <div className="my-6 p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-x-auto">
      <div ref={containerRef} className="flex justify-center [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
    </div>
  )
}

// ============================================================
// Интерактивные графики (Recharts, dynamic import)
// ============================================================

interface ChartDataPoint {
  name: string
  [key: string]: string | number
}

function InteractiveChart({ data }: { data: { title?: string; type?: string; xKey?: string; lines: { key: string; color?: string; name?: string }[]; data: ChartDataPoint[] } }) {
  const [ChartComponents, setChartComponents] = useState<any>(null)

  useEffect(() => {
    import('recharts').then(mod => setChartComponents(mod))
  }, [])

  if (!ChartComponents) return <div className="my-4 h-48 bg-slate-800/50 rounded-xl animate-pulse" />

  const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, AreaChart, Area } = ChartComponents
  const COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#ef4444', '#10b981', '#a855f7']
  const chartType = data.type || 'line'

  const ChartWrapper = chartType === 'bar' ? BarChart : chartType === 'area' ? AreaChart : LineChart
  const DataElement = chartType === 'bar' ? Bar : chartType === 'area' ? Area : Line

  return (
    <div className="my-6 p-4 bg-slate-900/50 border border-slate-700/50 rounded-xl">
      {data.title && <p className="text-sm font-medium text-slate-300 mb-3 text-center">{data.title}</p>}
      <ResponsiveContainer width="100%" height={280}>
        <ChartWrapper data={data.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey={data.xKey || 'name'} tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
          <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
          <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
          {data.lines.map((line, i) => (
            <DataElement
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name || line.key}
              stroke={line.color || COLORS[i % COLORS.length]}
              fill={chartType !== 'line' ? (line.color || COLORS[i % COLORS.length]) : undefined}
              fillOpacity={chartType === 'area' ? 0.15 : undefined}
              strokeWidth={2}
              dot={chartType === 'line' ? { r: 3 } : undefined}
            />
          ))}
        </ChartWrapper>
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// YouTube Embed — встроенный видеоплеер
// ============================================================

interface YouTubeEmbedData {
  id: string
  title?: string
  channel?: string
}

function YouTubeEmbed({ data }: { data: YouTubeEmbedData }) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [showPlayer, setShowPlayer] = useState(false)

  const thumbnailUrl = `https://img.youtube.com/vi/${data.id}/hqdefault.jpg`
  const embedUrl = `https://www.youtube.com/embed/${data.id}?autoplay=1&rel=0&modestbranding=1`

  return (
    <div className="my-6 rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/50">
        <Youtube className="w-5 h-5 text-red-500" />
        <span className="text-sm font-medium text-slate-200 flex-1 truncate">
          {data.title || 'Видеоматериал'}
        </span>
        {data.channel && (
          <span className="text-xs text-slate-500 truncate max-w-[200px]">{data.channel}</span>
        )}
        <a
          href={`https://www.youtube.com/watch?v=${data.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:bg-slate-700 rounded transition-colors"
          title="Открыть на YouTube"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>

      {/* Player area */}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        {showPlayer ? (
          <iframe
            className="absolute inset-0 w-full h-full"
            src={embedUrl}
            title={data.title || 'YouTube video'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onLoad={() => setIsLoaded(true)}
          />
        ) : (
          /* Thumbnail + Play button (lazy load — не грузим iframe до клика) */
          <button
            onClick={() => setShowPlayer(true)}
            className="absolute inset-0 w-full h-full group cursor-pointer bg-black"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbnailUrl}
              alt={data.title || 'Video thumbnail'}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              loading="lazy"
            />
            {/* Play button overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-xl group-hover:bg-red-500 group-hover:scale-110 transition-all">
                <Play className="w-7 h-7 text-white ml-1" fill="white" />
              </div>
            </div>
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Парсинг интерактивных и видео-блоков из контента
// ============================================================

/**
 * Поддерживаемые спец-блоки:
 *
 * ```interactive:quiz|code|misconception
 * { ...json... }
 * ```
 *
 * ```callout
 * { "type": "tip" | "warning" | "important" | "remember", "content": "..." }
 * ```
 *
 * ```accordion
 * { "title": "...", "content": "..." }
 * ```
 *
 * ```timeline
 * { "events": [{ "date": "...", "title": "...", "description": "..." }, ...] }
 * ```
 *
 * ```chart
 * { "title"?: "...", "type"?: "line" | "bar" | "area", "xKey"?: "name", "lines": [{ "key": "y1", "name"?: "...", "color"?: "#..." }], "data": [{ "name": "...", "y1": 10 }, ...] }
 * ```
 *
 * ```mermaid
 * graph TD;
 *   A-->B;
 * ```
 *
 * :::youtube{id="xxx" title="..." channel="..."}
 */
const SPECIAL_BLOCKS_REGEX =
  /```interactive:(quiz|code|misconception)\n([\s\S]*?)```|```callout\n([\s\S]*?)```|```accordion\n([\s\S]*?)```|```timeline\n([\s\S]*?)```|```chart\n([\s\S]*?)```|```mermaid\n([\s\S]*?)```|:::youtube\{id="([^"]+)"(?:\s+title="([^"]*?)")?(?:\s+channel="([^"]*?)")?\}/g

type InteractivePart =
  | string
  | { type: 'quiz' | 'code' | 'misconception' | 'youtube' | 'callout' | 'accordion' | 'timeline' | 'chart' | 'mermaid'; data: any }

function safeJsonParse<T = any>(raw: string): T | null {
  try {
    return JSON.parse(raw.trim()) as T
  } catch {
    return null
  }
}

// Удаляем "висящий" обрезанный JSON-блок в конце текста,
// например: {"type": "important", "content": "Пространство $\mathbb{R"
// чтобы он не отображался сырым текстом.
function stripDanglingJson(content: string): string {
  const danglingMatch = /\n(\{[^\}]*"(type|question)"[^\}]*)$/.exec(content)
  if (!danglingMatch) return content
  return content.slice(0, danglingMatch.index)
}

// Разбор "простого" формата:
// callout\n{...json...}\n\n
// interactive\n{...json...}\n\n
function splitSimpleBlocks(segment: string): InteractivePart[] {
  const result: InteractivePart[] = []
  const SIMPLE_REGEX = /(callout|interactive)\n+(\{[\s\S]*?\})(?=\n{2,}|\n*$)/g

  let lastIndex = 0
  let m: RegExpExecArray | null

  while ((m = SIMPLE_REGEX.exec(segment)) !== null) {
    if (m.index > lastIndex) {
      result.push(segment.slice(lastIndex, m.index))
    }

    const kind = m[1]
    const json = m[2]
    const data = safeJsonParse(json)

    if (data) {
      if (kind === 'callout') {
        result.push({ type: 'callout', data })
      } else if (kind === 'interactive') {
        // По умолчанию считаем, что это quiz-блок
        result.push({ type: 'quiz', data })
      }
    } else {
      result.push(segment.slice(m.index, SIMPLE_REGEX.lastIndex))
    }

    lastIndex = SIMPLE_REGEX.lastIndex
  }

  if (lastIndex < segment.length) {
    result.push(segment.slice(lastIndex))
  }

  return result
}

function parseInteractiveBlocks(content: string): InteractivePart[] {
  // Сначала убираем обрезанный JSON-хвост, если он есть
  content = stripDanglingJson(content)

  const parts: InteractivePart[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = SPECIAL_BLOCKS_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }

    const [
      full,
      interactiveType,
      interactiveData,
      calloutData,
      accordionData,
      timelineData,
      chartData,
      mermaidChart,
      ytId,
      ytTitle,
      ytChannel,
    ] = match

    if (interactiveType && interactiveData) {
      const data = safeJsonParse(interactiveData)
      if (data) {
        parts.push({ type: interactiveType as 'quiz' | 'code' | 'misconception', data })
      } else {
        parts.push(match[0])
      }
    } else if (calloutData) {
      const data = safeJsonParse(calloutData)
      if (data) {
        parts.push({ type: 'callout', data })
      } else {
        parts.push(match[0])
      }
    } else if (accordionData) {
      const data = safeJsonParse(accordionData)
      if (data) {
        parts.push({ type: 'accordion', data })
      } else {
        parts.push(match[0])
      }
    } else if (timelineData) {
      const data = safeJsonParse(timelineData)
      if (data) {
        parts.push({ type: 'timeline', data })
      } else {
        parts.push(match[0])
      }
    } else if (chartData) {
      const data = safeJsonParse(chartData)
      if (data) {
        parts.push({ type: 'chart', data })
      } else {
        parts.push(match[0])
      }
    } else if (mermaidChart) {
      parts.push({ type: 'mermaid', data: { chart: mermaidChart } })
    } else if (ytId) {
      parts.push({
        type: 'youtube',
        data: {
          id: ytId,
          title: ytTitle ? ytTitle.replace(/\\"/g, '"') : undefined,
          channel: ytChannel ? ytChannel.replace(/\\"/g, '"') : undefined,
        },
      })
    }

    lastIndex = match.index + match[0].length
  }

  // Оставшийся текст
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }

  // Дополнительно разбираем "простые" блоки вида:
  // callout\n{...json...}\n\n
  // interactive\n{...json...}\n\n
  const normalized: InteractivePart[] = []

  for (const part of parts) {
    if (typeof part === 'string') {
      normalized.push(...splitSimpleBlocks(part))
    } else {
      normalized.push(part)
    }
  }

  return normalized
}

// ============================================================
// Общие плагины и конфиг для ReactMarkdown
// ============================================================

const REMARK_PLUGINS = [remarkGfm, remarkMath]
const REHYPE_PLUGINS: any[] = [
  [rehypeKatex, { throwOnError: false, errorColor: '#cc0000', output: 'htmlAndMathml', strict: false }]
]

/** Компоненты markdown без интерактивности (для copy-to-clipboard нужен useState hook в родителе) */
function useMarkdownComponents(copyToClipboard?: (code: string) => void, copiedCode?: string | null) {
  return useMemo(() => ({
    h1: ({ children }: any) => (
      <h1 className="text-3xl font-bold text-white mb-6 pb-4 border-b border-slate-700">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-2xl font-semibold text-white mt-8 mb-4 flex items-center gap-2">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xl font-medium text-white mt-6 mb-3">{children}</h3>
    ),
    p: ({ children, node }: any) => {
      const hasImage = node?.children?.some((child: any) => child.tagName === 'img')
      if (hasImage) return <div className="text-slate-300 leading-relaxed mb-4">{children}</div>
      return <p className="text-slate-300 leading-relaxed mb-4">{children}</p>
    },
    ul: ({ children }: any) => (
      <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2 ml-2">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-2 ml-2">{children}</ol>
    ),
    li: ({ children }: any) => <li className="text-slate-300 leading-relaxed">{children}</li>,
    strong: ({ children }: any) => <strong className="text-white font-semibold">{children}</strong>,
    em: ({ children }: any) => <em className="text-primary-300">{children}</em>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-primary-500 pl-6 pr-4 my-6 py-4 bg-gradient-to-r from-primary-500/10 to-transparent rounded-r-xl">
        <div className="text-slate-200 font-mono text-base leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&_strong]:text-primary-300 [&_strong]:font-bold">{children}</div>
      </blockquote>
    ),
    code: ({ className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      const codeString = String(children).replace(/\n$/, '')
      if (match) {
        return (
          <div className="relative group my-4">
            {copyToClipboard && (
              <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                <span className="text-xs text-slate-500 uppercase bg-slate-800 px-2 py-1 rounded">{match[1]}</span>
                <button onClick={() => copyToClipboard(codeString)} className="p-1.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors">
                  {copiedCode === codeString ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            )}
            <SyntaxHighlighter style={oneDark} language={match[1]} PreTag="div" className="rounded-xl !bg-slate-900 !p-4 !pt-12 border border-slate-700">
              {codeString}
            </SyntaxHighlighter>
          </div>
        )
      }
      return <code className="bg-slate-700/50 px-2 py-1 rounded text-primary-300 text-sm font-mono" {...props}>{children}</code>
    },
    a: ({ href, children }: any) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 underline decoration-primary-500/50">{children}</a>
    ),
    hr: () => <hr className="border-slate-700 my-8" />,
    img: ({ src, alt }: any) => (
      <figure className="my-6 rounded-xl overflow-hidden border border-slate-700/50 bg-slate-900/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt || 'Иллюстрация'} className="w-full h-auto max-h-[400px] object-contain" loading="lazy" />
        {alt && <figcaption className="px-4 py-2 text-sm text-slate-400 text-center border-t border-slate-700/50">{alt}</figcaption>}
      </figure>
    ),
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-6 rounded-2xl border border-slate-600/60 shadow-lg">
        <table className="w-full border-collapse min-w-[400px]">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead className="bg-slate-800">{children}</thead>,
    th: ({ children }: any) => <th className="border border-slate-600/60 px-4 py-3 text-left text-white font-semibold text-sm">{children}</th>,
    td: ({ children }: any) => <td className="border border-slate-700/50 px-4 py-3 text-slate-200">{children}</td>,
    tbody: ({ children }: any) => <tbody className="[&>tr:nth-child(even)]:bg-slate-800/40 [&>tr:nth-child(odd)]:bg-slate-900/20">{children}</tbody>,
    tr: ({ children }: any) => <tr className="hover:bg-slate-700/40 transition-colors">{children}</tr>,
  }), [copyToClipboard, copiedCode])
}

// ============================================================
// TheoryContent — полный рендер (после завершения стрима / кэш)
// ============================================================

export function TheoryContent({ content, topicName }: TheoryContentProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const copyToClipboard = (code: string) => { navigator.clipboard.writeText(code); setCopiedCode(code); setTimeout(() => setCopiedCode(null), 2000) }
  const components = useMarkdownComponents(copyToClipboard, copiedCode)

  const sanitizedContent = sanitizeLatexContent(content)
  const parts = parseInteractiveBlocks(sanitizedContent)

  return (
    <div className="markdown-content">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
        <h2 className="text-lg font-medium text-slate-400">Теория: {topicName}</h2>
        <TextToSpeech text={content} variant="full" />
      </div>

      {parts.map((part, index) => {
        if (typeof part === 'object' && part !== null) {
          const anyPart: any = part
          const data = anyPart.data

          if (anyPart.type === 'quiz') return <InteractiveQuiz key={index} data={data} />
          if (anyPart.type === 'code') return <InteractiveCode key={index} data={data} />
          if (anyPart.type === 'misconception') return <MisconceptionBlock key={index} data={data} />
          if (anyPart.type === 'youtube') return <YouTubeEmbed key={index} data={data} />

          if (anyPart.type === 'callout' && data && typeof data.content === 'string') {
            return <CalloutBlock key={index} type={data.type || 'tip'} content={data.content} />
          }

          if (anyPart.type === 'accordion' && data && typeof data.title === 'string' && typeof data.content === 'string') {
            return <AccordionBlock key={index} title={data.title} content={data.content} />
          }

          if (anyPart.type === 'timeline' && data && Array.isArray(data.events)) {
            return <TimelineBlock key={index} events={data.events} />
          }

          if (anyPart.type === 'chart' && data) {
            return <InteractiveChart key={index} data={data} />
          }

          if (anyPart.type === 'mermaid' && data && typeof data.chart === 'string') {
            return <MermaidDiagram key={index} chart={data.chart} />
          }
        }

        return (
          <ReactMarkdown
            key={index}
            urlTransform={allowDataUrlTransform}
            remarkPlugins={REMARK_PLUGINS}
            rehypePlugins={REHYPE_PLUGINS}
            components={components}
          >
            {typeof part === 'string' ? part : JSON.stringify(part)}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}

// ============================================================
// StreamingTheoryContent — полный рендер во время стриминга
// (таблицы, LaTeX, код, картинки — всё сразу, без TTS/интерактивных блоков)
// ============================================================

export function StreamingTheoryContent({ content }: { content: string }) {
  const components = useMarkdownComponents()
  const sanitized = useMemo(() => sanitizeLatexContent(content), [content])

  return (
    <div className="markdown-content">
      <ReactMarkdown
        urlTransform={allowDataUrlTransform}
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={components}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  )
}

