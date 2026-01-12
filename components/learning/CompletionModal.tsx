'use client'

import { useCallback, useEffect, useRef } from 'react'
import { CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { TopicStatus } from '@/types'

// ==================== INTERFACES ====================

export interface CompletionModalProps {
  isOpen: boolean
  onConfirm: () => void  // Да, отметить как готовое
  onCancel: () => void   // Нет, просто продолжай
  topicName: string
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Determines if the completion modal should be shown based on topic status.
 * Modal should only appear for topics that are NOT completed or mastered.
 * 
 * Requirements: 2.1, 2.7
 * - Show modal only for incomplete topics
 * - Don't show for COMPLETED/MASTERED status
 */
export function shouldShowCompletionModal(status: TopicStatus): boolean {
  return status !== 'COMPLETED' && status !== 'MASTERED'
}

/**
 * Determines the new status after confirming completion in the modal.
 * For incomplete topics (LOCKED, AVAILABLE, IN_PROGRESS), status becomes COMPLETED.
 * For already completed topics (COMPLETED, MASTERED), status remains unchanged.
 * 
 * Requirements: 2.5
 * - Confirmation in modal updates status to COMPLETED
 */
export function getStatusAfterConfirmation(currentStatus: TopicStatus): TopicStatus {
  // If topic is already completed or mastered, keep the current status
  if (currentStatus === 'COMPLETED' || currentStatus === 'MASTERED') {
    return currentStatus
  }
  // For all other statuses (LOCKED, AVAILABLE, IN_PROGRESS), mark as COMPLETED
  return 'COMPLETED'
}

// ==================== MAIN COMPONENT ====================

/**
 * CompletionModal - Modal dialog for confirming lesson completion
 * 
 * Requirements: 2.2, 2.3, 2.4
 * - Display text "Отметить урок завершён" and confirmation question
 * - Button "Нет, просто продолжай" for navigation without saving
 * - Button "Да, отметьте как готовое" for saving progress and navigation
 */
export function CompletionModal({
  isOpen,
  onConfirm,
  onCancel,
  topicName,
}: CompletionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  // Handle escape key to close modal
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onCancel()
    }
  }, [onCancel])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
      // Focus the confirm button for accessibility
      setTimeout(() => confirmButtonRef.current?.focus(), 100)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop overlay with fade animation */}
      <div
        className={cn(
          'fixed inset-0 bg-black/70 backdrop-blur-sm z-50',
          'animate-fade-in'
        )}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal container */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="completion-modal-title"
      >
        {/* Modal content with scale animation */}
        <div
          ref={modalRef}
          className={cn(
            'relative w-full max-w-md',
            'bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-3xl',
            'shadow-2xl shadow-black/50',
            'animate-slide-up'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onCancel}
            className={cn(
              'absolute top-4 right-4 p-2 rounded-xl',
              'text-slate-400 hover:text-white',
              'hover:bg-white/10 transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50'
            )}
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal body */}
          <div className="p-8 text-center">
            {/* Success icon with glow effect */}
            <div className="flex justify-center mb-6">
              <div className={cn(
                'w-20 h-20 rounded-2xl',
                'bg-gradient-to-br from-green-500/20 to-emerald-500/10',
                'border border-green-500/30',
                'flex items-center justify-center',
                'shadow-lg shadow-green-500/10',
                'animate-pulse-primary'
              )}>
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </div>

            {/* Title */}
            <h2
              id="completion-modal-title"
              className="text-xl font-semibold text-white mb-3"
            >
              Отметить урок завершён
            </h2>

            {/* Description */}
            <p className="text-slate-400 mb-6 leading-relaxed">
              Хотели бы вы отметить текущий урок как завершённый, прежде чем двигаться дальше?
            </p>

            {/* Topic name badge */}
            {topicName && (
              <div className={cn(
                'inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-xl',
                'bg-[var(--color-bg-secondary)] border border-[var(--color-border)]',
                'text-sm text-slate-300'
              )}>
                <span className="text-lg">📚</span>
                <span className="truncate max-w-[250px]">{topicName}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Cancel button - "Нет, просто продолжай" */}
              <Button
                variant="secondary"
                onClick={onCancel}
                className={cn(
                  'flex-1 order-2 sm:order-1',
                  'py-3 rounded-xl',
                  'transition-all duration-200',
                  'hover:scale-[1.02]'
                )}
              >
                Нет, просто продолжай
              </Button>

              {/* Confirm button - "Да, отметьте как готовое" */}
              <Button
                ref={confirmButtonRef}
                variant="primary"
                onClick={onConfirm}
                className={cn(
                  'flex-1 order-1 sm:order-2',
                  'py-3 rounded-xl',
                  'transition-all duration-200',
                  'hover:scale-[1.02]',
                  'focus:ring-2 focus:ring-[var(--color-primary)]/50'
                )}
              >
                Да, отметьте как готовое
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default CompletionModal
