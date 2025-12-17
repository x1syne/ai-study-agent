'use client'

import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, Lightbulb, AlertTriangle, CheckCircle, XCircle, Play } from 'lucide-react'
import { useState } from 'react'
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
          <p className="text-sm text-primary-300">💡 Задание: {data.task}</p>
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
              <p className="text-sm text-slate-300">💡 {data.why}</p>
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

// Парсинг интерактивных блоков из контента
function parseInteractiveBlocks(content: string): (string | { type: string; data: any })[] {
  const parts: (string | { type: string; data: any })[] = []
  const regex = /```interactive:(quiz|code|misconception)\n([\s\S]*?)```/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    // Добавляем текст до блока
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index))
    }
    
    // Парсим JSON блока
    try {
      const data = JSON.parse(match[2].trim())
      parts.push({ type: match[1], data })
    } catch {
      // Если JSON невалидный, добавляем как текст
      parts.push(match[0])
    }
    
    lastIndex = match.index + match[0].length
  }
  
  // Добавляем оставшийся текст
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex))
  }
  
  return parts
}

export function TheoryContent({ content, topicName }: TheoryContentProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  // Парсим интерактивные блоки
  const parts = parseInteractiveBlocks(content)

  return (
    <div className="markdown-content">
      {/* TTS Button */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
        <h2 className="text-lg font-medium text-slate-400">Теория: {topicName}</h2>
        <TextToSpeech text={content} variant="full" />
      </div>

      {parts.map((part, index) => {
        // Интерактивные блоки
        if (typeof part === 'object') {
          if (part.type === 'quiz') {
            return <InteractiveQuiz key={index} data={part.data} />
          }
          if (part.type === 'code') {
            return <InteractiveCode key={index} data={part.data} />
          }
          if (part.type === 'misconception') {
            return <MisconceptionBlock key={index} data={part.data} />
          }
        }
        
        // Обычный markdown
        return (
          <ReactMarkdown
            key={index}
            components={{
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-white mb-6 pb-4 border-b border-slate-700">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold text-white mt-8 mb-4 flex items-center gap-2">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-medium text-white mt-6 mb-3">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-slate-300 leading-relaxed mb-4">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside text-slate-300 mb-4 space-y-2 ml-2">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside text-slate-300 mb-4 space-y-2 ml-2">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-slate-300 leading-relaxed">{children}</li>
              ),
              strong: ({ children }) => (
                <strong className="text-white font-semibold">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="text-primary-300">{children}</em>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary-500 pl-6 pr-4 my-6 py-4 bg-gradient-to-r from-primary-500/10 to-transparent rounded-r-xl">
                  <div className="text-slate-200 font-mono text-base leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0 [&_strong]:text-primary-300 [&_strong]:font-bold">{children}</div>
                </blockquote>
              ),
              code: ({ className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '')
                const codeString = String(children).replace(/\n$/, '')
                
                if (match) {
                  return (
                    <div className="relative group my-4">
                      <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                        <span className="text-xs text-slate-500 uppercase bg-slate-800 px-2 py-1 rounded">{match[1]}</span>
                        <button
                          onClick={() => copyToClipboard(codeString)}
                          className="p-1.5 bg-slate-700 rounded hover:bg-slate-600 transition-colors"
                        >
                          {copiedCode === codeString ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-xl !bg-slate-900 !p-4 !pt-12 border border-slate-700"
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  )
                }
                
                return (
                  <code className="bg-slate-700/50 px-2 py-1 rounded text-primary-300 text-sm font-mono" {...props}>
                    {children}
                  </code>
                )
              },
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:text-primary-300 underline decoration-primary-500/50"
                >
                  {children}
                </a>
              ),
              hr: () => <hr className="border-slate-700 my-8" />,
              table: ({ children }) => (
                <div className="overflow-x-auto my-6 rounded-xl border border-slate-700">
                  <table className="w-full border-collapse">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border-b border-slate-700 bg-slate-800/50 px-4 py-3 text-left text-white font-medium">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border-b border-slate-700/50 px-4 py-3 text-slate-300">
                  {children}
                </td>
              ),
            }}
          >
            {part as string}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}

