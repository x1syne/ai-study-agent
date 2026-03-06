'use client'

import { useState, useCallback } from 'react'
import type { TopicStatus } from '@/types'
import { shouldShowCompletionModal } from '@/components/learning/CompletionModal'

export interface UseCompletionModalOptions {
  currentTopicStatus: TopicStatus
  currentTopicName: string
  onNavigate: (topicId: string) => void
  onMarkComplete: () => Promise<void> | void
}

export interface UseCompletionModalReturn {
  isOpen: boolean
  pendingTopicId: string | null
  topicName: string
  handleTopicSelect: (topicId: string) => void
  handleConfirm: () => void
  handleCancel: () => void
}

/**
 * Hook for managing completion modal state and logic
 * 
 * Requirements: 2.1, 2.7
 * - Shows modal only for incomplete topics (not COMPLETED/MASTERED)
 * - Handles navigation with or without marking completion
 */
export function useCompletionModal({
  currentTopicStatus,
  currentTopicName,
  onNavigate,
  onMarkComplete,
}: UseCompletionModalOptions): UseCompletionModalReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [pendingTopicId, setPendingTopicId] = useState<string | null>(null)

  /**
   * Handle topic selection from sidebar
   * Shows modal if current topic is not completed, otherwise navigates directly
   */
  const handleTopicSelect = useCallback((topicId: string) => {
    // Check if we should show the completion modal
    if (shouldShowCompletionModal(currentTopicStatus)) {
      // Store the pending topic and show modal
      setPendingTopicId(topicId)
      setIsOpen(true)
    } else {
      // Topic is already completed, navigate directly
      onNavigate(topicId)
    }
  }, [currentTopicStatus, onNavigate])

  /**
   * Handle confirm action - mark as complete and navigate
   * Requirements: 2.5
   * Навигация происходит мгновенно, отметка "готово" — в фоне (fire-and-forget)
   */
  const handleConfirm = useCallback(() => {
    if (pendingTopicId) {
      // Fire-and-forget: отметка "готово" в фоне, не блокируем навигацию
      Promise.resolve(onMarkComplete()).catch(e =>
        console.error('[CompletionModal] Background mark-complete failed:', e)
      )
      // Навигация — мгновенно
      onNavigate(pendingTopicId)
    }
    // Close modal and reset state
    setIsOpen(false)
    setPendingTopicId(null)
  }, [pendingTopicId, onMarkComplete, onNavigate])

  /**
   * Handle cancel action - close modal WITHOUT navigating
   * Requirements: 2.6, Requirement 3 (Bug fix)
   * User clicked X, Escape, or "Нет, просто продолжай" - stay on current topic
   */
  const handleCancel = useCallback(() => {
    // Just close modal and reset state - DO NOT navigate
    setIsOpen(false)
    setPendingTopicId(null)
  }, [])

  return {
    isOpen,
    pendingTopicId,
    topicName: currentTopicName,
    handleTopicSelect,
    handleConfirm,
    handleCancel,
  }
}
