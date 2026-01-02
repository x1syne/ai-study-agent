'use client'

/**
 * 🃏 FLIP CARD COMPONENT
 * 
 * Интерактивная карточка с эффектом переворота:
 * - Анимация через framer-motion
 * - Передняя и задняя стороны
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCw } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface FlipCardProps {
  front: React.ReactNode
  back: React.ReactNode
  frontClassName?: string
  backClassName?: string
  className?: string
  flipOnHover?: boolean
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export const FlipCard: React.FC<FlipCardProps> = ({
  front,
  back,
  frontClassName = '',
  backClassName = '',
  className = '',
  flipOnHover = false
}) => {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleFlip = () => {
    if (!flipOnHover) {
      setIsFlipped(!isFlipped)
    }
  }

  return (
    <div 
      className={`flip-card-container perspective-1000 ${className}`}
      style={{ perspective: '1000px' }}
      onMouseEnter={() => flipOnHover && setIsFlipped(true)}
      onMouseLeave={() => flipOnHover && setIsFlipped(false)}
    >
      <motion.div
        className="flip-card-inner relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
      >
        {/* Front */}
        <div
          className={`
            flip-card-front absolute w-full h-full rounded-xl shadow-lg
            flex flex-col items-center justify-center p-6
            bg-white border-2 border-gray-100
            ${frontClassName}
          `}
          style={{ backfaceVisibility: 'hidden' }}
          onClick={handleFlip}
        >
          {front}
          {!flipOnHover && (
            <button 
              className="absolute bottom-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={handleFlip}
            >
              <RotateCw size={20} />
            </button>
          )}
        </div>

        {/* Back */}
        <div
          className={`
            flip-card-back absolute w-full h-full rounded-xl shadow-lg
            flex flex-col items-center justify-center p-6
            bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-100
            ${backClassName}
          `}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
          onClick={handleFlip}
        >
          {back}
          {!flipOnHover && (
            <button 
              className="absolute bottom-4 right-4 text-gray-400 hover:text-gray-600"
              onClick={handleFlip}
            >
              <RotateCw size={20} />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 TERM FLIP CARD
// ═══════════════════════════════════════════════════════════════

interface TermFlipCardProps {
  term: string
  definition: string
  emoji?: string
  className?: string
}

export const TermFlipCard: React.FC<TermFlipCardProps> = ({
  term,
  definition,
  emoji = '📚',
  className = ''
}) => {
  return (
    <FlipCard
      className={`min-h-[200px] ${className}`}
      front={
        <div className="text-center">
          <span className="text-4xl mb-4 block">{emoji}</span>
          <h3 className="text-xl font-bold text-gray-800">{term}</h3>
          <p className="text-sm text-gray-400 mt-2">Нажмите, чтобы увидеть определение</p>
        </div>
      }
      back={
        <div className="text-center">
          <h4 className="text-lg font-semibold text-blue-600 mb-3">{term}</h4>
          <p className="text-gray-700">{definition}</p>
        </div>
      }
    />
  )
}

export default FlipCard
