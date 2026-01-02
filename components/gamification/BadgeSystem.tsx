'use client'

/**
 * 🏆 BADGE SYSTEM COMPONENT
 * 
 * Система badges с анимацией unlock:
 * - Отображение badges с emoji
 * - Анимация разблокировки
 * - Locked/unlocked состояния
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock } from 'lucide-react'
import type { LevelBadge } from '@/lib/agents/types'

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface BadgeProps {
  badge: LevelBadge
  unlocked: boolean
  size?: 'sm' | 'md' | 'lg'
  showTitle?: boolean
  onClick?: () => void
}

interface BadgeSystemProps {
  badges: LevelBadge[]
  currentLevel: number
  className?: string
}

interface BadgeUnlockAnimationProps {
  badge: LevelBadge
  onComplete?: () => void
}

// ═══════════════════════════════════════════════════════════════
// 🎯 SINGLE BADGE
// ═══════════════════════════════════════════════════════════════

export const Badge: React.FC<BadgeProps> = ({
  badge,
  unlocked,
  size = 'md',
  showTitle = true,
  onClick
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12 text-xl',
    md: 'w-16 h-16 text-2xl',
    lg: 'w-20 h-20 text-3xl'
  }

  return (
    <motion.div
      className="badge-container flex flex-col items-center cursor-pointer"
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <div
        className={`
          badge rounded-full flex items-center justify-center
          ${sizeClasses[size]}
          ${unlocked
            ? 'bg-gradient-to-br from-yellow-300 to-orange-400 shadow-lg'
            : 'bg-gray-200'
          }
        `}
      >
        {unlocked ? (
          <span>{badge.emoji}</span>
        ) : (
          <Lock className="text-gray-400" size={size === 'sm' ? 16 : size === 'md' ? 20 : 24} />
        )}
      </div>
      
      {showTitle && (
        <span className={`
          mt-2 text-sm font-medium
          ${unlocked ? 'text-gray-800' : 'text-gray-400'}
        `}>
          {badge.title}
        </span>
      )}
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 BADGE UNLOCK ANIMATION
// ═══════════════════════════════════════════════════════════════

export const BadgeUnlockAnimation: React.FC<BadgeUnlockAnimationProps> = ({
  badge,
  onComplete
}) => {
  return (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onComplete}
    >
      <motion.div
        className="bg-white rounded-2xl p-8 text-center shadow-2xl"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      >
        <motion.div
          className="text-6xl mb-4"
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 10, -10, 0]
          }}
          transition={{ 
            duration: 0.5,
            repeat: 2,
            repeatType: 'reverse'
          }}
        >
          {badge.emoji}
        </motion.div>
        
        <motion.h2
          className="text-2xl font-bold text-gray-800 mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Новый badge!
        </motion.h2>
        
        <motion.p
          className="text-lg text-gray-600"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {badge.title}
        </motion.p>
        
        <motion.p
          className="text-sm text-gray-400 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Нажмите, чтобы продолжить
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 BADGE SYSTEM
// ═══════════════════════════════════════════════════════════════

export const BadgeSystem: React.FC<BadgeSystemProps> = ({
  badges,
  currentLevel,
  className = ''
}) => {
  const [selectedBadge, setSelectedBadge] = useState<LevelBadge | null>(null)
  const [showUnlock, setShowUnlock] = useState(false)
  const [newlyUnlocked, setNewlyUnlocked] = useState<LevelBadge | null>(null)

  const handleBadgeClick = (badge: LevelBadge, unlocked: boolean) => {
    if (unlocked) {
      setSelectedBadge(badge)
    }
  }

  // Simulate unlock animation (would be triggered by actual level up)
  const triggerUnlock = (badge: LevelBadge) => {
    setNewlyUnlocked(badge)
    setShowUnlock(true)
  }

  return (
    <div className={`badge-system ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Достижения</h3>
        <span className="text-sm text-gray-500">
          {badges.filter(b => b.level <= currentLevel).length} / {badges.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        {badges.map((badge) => (
          <Badge
            key={badge.level}
            badge={badge}
            unlocked={badge.level <= currentLevel}
            onClick={() => handleBadgeClick(badge, badge.level <= currentLevel)}
          />
        ))}
      </div>

      {/* Badge detail modal */}
      <AnimatePresence>
        {selectedBadge && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedBadge(null)}
          >
            <motion.div
              className="bg-white rounded-xl p-6 text-center shadow-xl max-w-xs"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-5xl mb-3">{selectedBadge.emoji}</div>
              <h3 className="text-xl font-bold text-gray-800 mb-1">
                {selectedBadge.title}
              </h3>
              <p className="text-sm text-gray-500">
                Уровень {selectedBadge.level}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unlock animation */}
      <AnimatePresence>
        {showUnlock && newlyUnlocked && (
          <BadgeUnlockAnimation
            badge={newlyUnlocked}
            onComplete={() => {
              setShowUnlock(false)
              setNewlyUnlocked(null)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default BadgeSystem
