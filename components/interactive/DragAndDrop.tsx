'use client'

/**
 * 🎮 DRAG AND DROP COMPONENT
 * 
 * Интерактивный компонент для:
 * - Matching (сопоставление)
 * - Ordering (упорядочивание)
 * - Fill blank (заполнение пропусков)
 */

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { Check, X, HelpCircle, RotateCcw } from 'lucide-react'
import type { DragDropDifficulty, RewardVisual } from '@/lib/agents/types'

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface MatchingPair {
  id: string
  left: string
  right: string
}

interface OrderingItem {
  id: string
  content: string
  correctPosition: number
}

interface FillBlankData {
  sentence: string
  blanks: Array<{ id: string; answer: string; position: number }>
  options: string[]
}

interface DragAndDropProps {
  type: DragDropDifficulty
  data: {
    pairs?: MatchingPair[]
    items?: OrderingItem[]
    sentence?: string
    blanks?: FillBlankData['blanks']
    options?: string[]
    instruction?: string
  }
  onComplete?: (correct: boolean, score: number) => void
  rewardVisual?: RewardVisual
  hintsAvailable?: number
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MATCHING COMPONENT
// ═══════════════════════════════════════════════════════════════

const MatchingGame: React.FC<{
  pairs: MatchingPair[]
  onComplete: (correct: boolean, score: number) => void
}> = ({ pairs, onComplete }) => {
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [matches, setMatches] = useState<Map<string, string>>(new Map())
  const [results, setResults] = useState<Map<string, boolean>>(new Map())

  const handleLeftClick = (id: string) => {
    if (results.has(id)) return
    setSelectedLeft(id)
  }

  const handleRightClick = (rightText: string) => {
    if (!selectedLeft) return
    
    const pair = pairs.find(p => p.id === selectedLeft)
    if (!pair) return

    const isCorrect = pair.right === rightText
    
    setMatches(prev => new Map(prev).set(selectedLeft, rightText))
    setResults(prev => new Map(prev).set(selectedLeft, isCorrect))
    setSelectedLeft(null)

    // Check if all matched
    if (results.size + 1 === pairs.length) {
      const correctCount = Array.from(results.values()).filter(Boolean).length + (isCorrect ? 1 : 0)
      onComplete(correctCount === pairs.length, (correctCount / pairs.length) * 100)
    }
  }

  const reset = () => {
    setSelectedLeft(null)
    setMatches(new Map())
    setResults(new Map())
  }

  return (
    <div className="matching-game">
      <div className="grid grid-cols-2 gap-8">
        {/* Left column */}
        <div className="space-y-3">
          {pairs.map(pair => (
            <motion.button
              key={pair.id}
              onClick={() => handleLeftClick(pair.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${selectedLeft === pair.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : results.has(pair.id)
                    ? results.get(pair.id) 
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {pair.left}
              {results.has(pair.id) && (
                <span className="float-right">
                  {results.get(pair.id) ? <Check className="text-green-500" /> : <X className="text-red-500" />}
                </span>
              )}
            </motion.button>
          ))}
        </div>

        {/* Right column */}
        <div className="space-y-3">
          {pairs.map(pair => (
            <motion.button
              key={`right-${pair.id}`}
              onClick={() => handleRightClick(pair.right)}
              disabled={!selectedLeft || Array.from(matches.values()).includes(pair.right)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${Array.from(matches.values()).includes(pair.right)
                  ? 'border-gray-300 bg-gray-100 opacity-50'
                  : 'border-gray-200 hover:border-blue-300'
                }
              `}
              whileHover={{ scale: selectedLeft ? 1.02 : 1 }}
              whileTap={{ scale: 0.98 }}
            >
              {pair.right}
            </motion.button>
          ))}
        </div>
      </div>

      <button
        onClick={reset}
        className="mt-4 flex items-center gap-2 text-gray-500 hover:text-gray-700"
      >
        <RotateCcw size={16} /> Начать заново
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 ORDERING COMPONENT
// ═══════════════════════════════════════════════════════════════

const OrderingGame: React.FC<{
  items: OrderingItem[]
  onComplete: (correct: boolean, score: number) => void
}> = ({ items, onComplete }) => {
  const [orderedItems, setOrderedItems] = useState(
    [...items].sort(() => Math.random() - 0.5)
  )
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState<boolean[]>([])

  const checkOrder = () => {
    const newResults = orderedItems.map((item, index) => 
      item.correctPosition === index
    )
    setResults(newResults)
    setChecked(true)
    
    const correctCount = newResults.filter(Boolean).length
    onComplete(correctCount === items.length, (correctCount / items.length) * 100)
  }

  const reset = () => {
    setOrderedItems([...items].sort(() => Math.random() - 0.5))
    setChecked(false)
    setResults([])
  }

  return (
    <div className="ordering-game">
      <Reorder.Group 
        axis="y" 
        values={orderedItems} 
        onReorder={setOrderedItems}
        className="space-y-2"
      >
        {orderedItems.map((item, index) => (
          <Reorder.Item
            key={item.id}
            value={item}
            className={`
              p-4 rounded-lg border-2 cursor-grab active:cursor-grabbing
              ${checked
                ? results[index]
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400 font-mono">{index + 1}.</span>
              <span>{item.content}</span>
              {checked && (
                <span className="ml-auto">
                  {results[index] ? <Check className="text-green-500" /> : <X className="text-red-500" />}
                </span>
              )}
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <div className="mt-4 flex gap-3">
        <button
          onClick={checkOrder}
          disabled={checked}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Проверить
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RotateCcw size={16} className="inline mr-2" /> Заново
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 FILL BLANK COMPONENT
// ═══════════════════════════════════════════════════════════════

const FillBlankGame: React.FC<{
  data: FillBlankData
  onComplete: (correct: boolean, score: number) => void
}> = ({ data, onComplete }) => {
  const [filledBlanks, setFilledBlanks] = useState<Map<string, string>>(new Map())
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState<Map<string, boolean>>(new Map())
  const [draggedOption, setDraggedOption] = useState<string | null>(null)

  const handleDrop = (blankId: string) => {
    if (!draggedOption) return
    setFilledBlanks(prev => new Map(prev).set(blankId, draggedOption))
    setDraggedOption(null)
  }

  const checkAnswers = () => {
    const newResults = new Map<string, boolean>()
    data.blanks.forEach(blank => {
      const filled = filledBlanks.get(blank.id)
      newResults.set(blank.id, filled === blank.answer)
    })
    setResults(newResults)
    setChecked(true)

    const correctCount = Array.from(newResults.values()).filter(Boolean).length
    onComplete(correctCount === data.blanks.length, (correctCount / data.blanks.length) * 100)
  }

  const reset = () => {
    setFilledBlanks(new Map())
    setChecked(false)
    setResults(new Map())
  }

  // Render sentence with blanks
  const renderSentence = () => {
    let parts = data.sentence.split('___')
    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {part}
        {index < data.blanks.length && (
          <span
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(data.blanks[index].id)}
            className={`
              inline-block min-w-[100px] mx-1 px-3 py-1 rounded border-2 border-dashed
              ${checked
                ? results.get(data.blanks[index].id)
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
                : 'border-gray-300 bg-gray-50'
              }
            `}
          >
            {filledBlanks.get(data.blanks[index].id) || '___'}
          </span>
        )}
      </React.Fragment>
    ))
  }

  return (
    <div className="fill-blank-game">
      <p className="text-lg mb-6">{renderSentence()}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {data.options.map((option, index) => (
          <motion.div
            key={index}
            draggable={!Array.from(filledBlanks.values()).includes(option)}
            onDragStart={() => setDraggedOption(option)}
            className={`
              px-4 py-2 rounded-lg border cursor-grab
              ${Array.from(filledBlanks.values()).includes(option)
                ? 'opacity-50 cursor-not-allowed'
                : 'bg-white hover:bg-gray-50'
              }
            `}
            whileHover={{ scale: 1.05 }}
          >
            {option}
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={checkAnswers}
          disabled={checked || filledBlanks.size < data.blanks.length}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Проверить
        </button>
        <button
          onClick={reset}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <RotateCcw size={16} className="inline mr-2" /> Заново
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export const DragAndDrop: React.FC<DragAndDropProps> = ({
  type,
  data,
  onComplete = () => {},
  hintsAvailable = 0
}) => {
  const [hintsUsed, setHintsUsed] = useState(0)
  const [showHint, setShowHint] = useState(false)

  const useHint = () => {
    if (hintsUsed < hintsAvailable) {
      setHintsUsed(prev => prev + 1)
      setShowHint(true)
      setTimeout(() => setShowHint(false), 3000)
    }
  }

  return (
    <div className="drag-and-drop-container p-6 bg-white rounded-xl shadow-sm border">
      {data.instruction && (
        <p className="text-gray-600 mb-4">{data.instruction}</p>
      )}

      {hintsAvailable > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={useHint}
            disabled={hintsUsed >= hintsAvailable}
            className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 disabled:opacity-50"
          >
            <HelpCircle size={16} />
            Подсказка ({hintsAvailable - hintsUsed} осталось)
          </button>
        </div>
      )}

      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm"
          >
            💡 Подсказка: Внимательно прочитайте каждый элемент
          </motion.div>
        )}
      </AnimatePresence>

      {type === 'matching' && data.pairs && (
        <MatchingGame pairs={data.pairs} onComplete={onComplete} />
      )}

      {type === 'ordering' && data.items && (
        <OrderingGame items={data.items} onComplete={onComplete} />
      )}

      {type === 'fill_blank' && data.sentence && data.blanks && data.options && (
        <FillBlankGame 
          data={{ sentence: data.sentence, blanks: data.blanks, options: data.options }} 
          onComplete={onComplete} 
        />
      )}
    </div>
  )
}

export default DragAndDrop
