'use client'

/**
 * 📊 PROGRESS BAR COMPONENT
 * 
 * Анимированный progress bar для отображения прогресса:
 * - Плавная анимация
 * - Отображение текущего/максимального значения
 * - Различные стили
 */

import React from 'react'
import { motion } from 'framer-motion'

// ═══════════════════════════════════════════════════════════════
// 🎯 TYPES
// ═══════════════════════════════════════════════════════════════

interface ProgressBarProps {
  current: number
  max: number
  label?: string
  showPercentage?: boolean
  showValues?: boolean
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'gradient'
  size?: 'sm' | 'md' | 'lg'
  animated?: boolean
  className?: string
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  max,
  label,
  showPercentage = true,
  showValues = false,
  color = 'blue',
  size = 'md',
  animated = true,
  className = ''
}) => {
  const percentage = Math.min(Math.round((current / max) * 100), 100)

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    gradient: 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
  }

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4'
  }

  return (
    <div className={`progress-bar-container ${className}`}>
      {/* Header */}
      {(label || showPercentage || showValues) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {showValues && (
              <span>{current} / {max}</span>
            )}
            {showPercentage && (
              <span className="font-medium">{percentage}%</span>
            )}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className={`
        w-full bg-gray-200 rounded-full overflow-hidden
        ${sizeClasses[size]}
      `}>
        <motion.div
          className={`h-full rounded-full ${colorClasses[color]}`}
          initial={animated ? { width: 0 } : { width: `${percentage}%` }}
          animate={{ width: `${percentage}%` }}
          transition={{ 
            duration: animated ? 1 : 0, 
            ease: 'easeOut',
            delay: animated ? 0.2 : 0
          }}
        />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 CIRCULAR PROGRESS
// ═══════════════════════════════════════════════════════════════

interface CircularProgressProps {
  current: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  showPercentage?: boolean
  label?: string
  className?: string
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  current,
  max,
  size = 120,
  strokeWidth = 8,
  color = '#4F46E5',
  showPercentage = true,
  label,
  className = ''
}) => {
  const percentage = Math.min(Math.round((current / max) * 100), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={`circular-progress flex flex-col items-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{
              strokeDasharray: circumference
            }}
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {showPercentage && (
            <motion.span
              className="text-2xl font-bold text-gray-800"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {percentage}%
            </motion.span>
          )}
        </div>
      </div>
      
      {label && (
        <span className="mt-2 text-sm text-gray-600">{label}</span>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎯 EXPERIENCE POINTS BAR
// ═══════════════════════════════════════════════════════════════

interface ExperienceBarProps {
  currentXP: number
  maxXP: number
  level: number
  className?: string
}

export const ExperienceBar: React.FC<ExperienceBarProps> = ({
  currentXP,
  maxXP,
  level,
  className = ''
}) => {
  const percentage = Math.min(Math.round((currentXP / maxXP) * 100), 100)

  return (
    <div className={`experience-bar ${className}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold">
          {level}
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-gray-700">Уровень {level}</span>
            <span className="text-gray-500">{currentXP} / {maxXP} XP</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProgressBar
