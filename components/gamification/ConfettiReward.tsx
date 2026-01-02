'use client'

/**
 * 🎉 CONFETTI REWARD COMPONENT
 * 
 * Компонент для отображения конфетти при достижении:
 * - Интеграция react-confetti
 * - Trigger при завершении checkpoint
 * - Различные стили конфетти
 */

import React, { useState, useEffect, useCallback } from 'react'
import Confetti from 'react-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Star, PartyPopper } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface ConfettiRewardProps {
  show: boolean
  duration?: number
  message?: string
  emoji?: string
  onComplete?: () => void
  style?: 'default' | 'gold' | 'rainbow'
}

interface UseConfettiReturn {
  showConfetti: boolean
  triggerConfetti: (duration?: number) => void
  ConfettiComponent: React.FC
}

// ═══════════════════════════════════════════════════════════════
// 🎯 CONFETTI COLORS
// ═══════════════════════════════════════════════════════════════

const CONFETTI_COLORS = {
  default: ['#4F46E5', '#7C3AED', '#EC4899', '#F59E0B', '#10B981'],
  gold: ['#FFD700', '#FFA500', '#FF8C00', '#DAA520', '#B8860B'],
  rainbow: ['#FF0000', '#FF7F00', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#9400D3']
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export const ConfettiReward: React.FC<ConfettiRewardProps> = ({
  show,
  duration = 5000,
  message = 'Отлично!',
  emoji = '🎉',
  onComplete,
  style = 'default'
}) => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    if (show) {
      setIsActive(true)
      const timer = setTimeout(() => {
        setIsActive(false)
        onComplete?.()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [show, duration, onComplete])

  if (!show && !isActive) return null

  return (
    <>
      {/* Confetti */}
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={200}
        gravity={0.3}
        colors={CONFETTI_COLORS[style]}
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 100 }}
      />

      {/* Celebration message */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 text-center shadow-2xl"
              initial={{ scale: 0, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0, y: 50 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <motion.div
                className="text-6xl mb-4"
                animate={{ 
                  scale: [1, 1.3, 1],
                  rotate: [0, 15, -15, 0]
                }}
                transition={{ 
                  duration: 0.6,
                  repeat: Infinity,
                  repeatDelay: 1
                }}
              >
                {emoji}
              </motion.div>
              
              <motion.h2
                className="text-3xl font-bold text-gray-800"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {message}
              </motion.h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 CHECKPOINT CELEBRATION
// ═══════════════════════════════════════════════════════════════

interface CheckpointCelebrationProps {
  show: boolean
  checkpointTitle: string
  checkpointEmoji: string
  rewardText: string
  onComplete?: () => void
}

export const CheckpointCelebration: React.FC<CheckpointCelebrationProps> = ({
  show,
  checkpointTitle,
  checkpointEmoji,
  rewardText,
  onComplete
}) => {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onComplete?.()
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  if (!show) return null

  return (
    <>
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={300}
        gravity={0.2}
        colors={CONFETTI_COLORS.gold}
        style={{ position: 'fixed', top: 0, left: 0, zIndex: 100 }}
      />

      <motion.div
        className="fixed inset-0 flex items-center justify-center z-50 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onComplete}
      >
        <motion.div
          className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-md mx-4"
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        >
          <motion.div
            className="flex justify-center gap-2 mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Star className="text-yellow-400 fill-yellow-400" size={24} />
            <Trophy className="text-yellow-500" size={32} />
            <Star className="text-yellow-400 fill-yellow-400" size={24} />
          </motion.div>

          <motion.div
            className="text-7xl mb-4"
            animate={{ 
              scale: [1, 1.2, 1],
              y: [0, -10, 0]
            }}
            transition={{ 
              duration: 0.8,
              repeat: Infinity,
              repeatDelay: 0.5
            }}
          >
            {checkpointEmoji}
          </motion.div>

          <motion.h2
            className="text-2xl font-bold text-gray-800 mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Checkpoint пройден!
          </motion.h2>

          <motion.p
            className="text-lg text-gray-600 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {checkpointTitle}
          </motion.p>

          <motion.p
            className="text-md text-green-600 font-medium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            {rewardText}
          </motion.p>

          <motion.p
            className="text-sm text-gray-400 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Нажмите, чтобы продолжить
          </motion.p>
        </motion.div>
      </motion.div>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 HOOK
// ═══════════════════════════════════════════════════════════════

export const useConfetti = (): UseConfettiReturn => {
  const [showConfetti, setShowConfetti] = useState(false)

  const triggerConfetti = useCallback((duration = 5000) => {
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), duration)
  }, [])

  const ConfettiComponent: React.FC = () => (
    <ConfettiReward show={showConfetti} onComplete={() => setShowConfetti(false)} />
  )

  return { showConfetti, triggerConfetti, ConfettiComponent }
}

export default ConfettiReward
