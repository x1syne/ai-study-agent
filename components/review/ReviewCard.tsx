'use client'

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

interface ReviewCardProps {
  front: string
  back: string
  onRate: (quality: 'forgot' | 'hard' | 'good' | 'easy') => void
}

export function ReviewCard({ front, back, onRate }: ReviewCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  const handleRate = (quality: 'forgot' | 'hard' | 'good' | 'easy') => {
    onRate(quality)
    setIsFlipped(false)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card */}
      <div
        onClick={!isFlipped ? handleFlip : undefined}
        className={cn(
          'relative h-64 cursor-pointer perspective-1000',
          !isFlipped && 'hover:scale-[1.02] transition-transform'
        )}
      >
        <div
          className={cn(
            'absolute inset-0 transition-transform duration-500 transform-style-3d',
            isFlipped && 'rotate-y-180'
          )}
        >
          {/* Front */}
          <div
            className={cn(
              'absolute inset-0 backface-hidden',
              'bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700/50',
              'flex flex-col items-center justify-center p-8 text-center'
            )}
          >
            <div className="text-sm text-slate-400 mb-4">Вопрос</div>
            <div className="text-xl text-white font-medium">{front}</div>
            <div className="absolute bottom-4 text-sm text-slate-500">
              Нажмите, чтобы увидеть ответ
            </div>
          </div>

          {/* Back */}
          <div
            className={cn(
              'absolute inset-0 backface-hidden rotate-y-180',
              'bg-gradient-to-br from-primary-900/50 to-accent-900/50 rounded-2xl border border-primary-500/30',
              'flex flex-col items-center justify-center p-8 text-center'
            )}
          >
            <div className="text-sm text-primary-300 mb-4">Ответ</div>
            <div className="text-xl text-white font-medium">{back}</div>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      {isFlipped && (
        <div className="mt-6 space-y-4 animate-fade-in">
          <div className="text-center text-sm text-slate-400 mb-4">
            Насколько легко было вспомнить?
          </div>
          <div className="grid grid-cols-4 gap-3">
            <Button
              variant="danger"
              onClick={() => handleRate('forgot')}
              className="flex-col py-4"
            >
              <span className="text-lg mb-1">😓</span>
              <span className="text-xs">Забыл</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleRate('hard')}
              className="flex-col py-4"
            >
              <span className="text-lg mb-1">😕</span>
              <span className="text-xs">Сложно</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleRate('good')}
              className="flex-col py-4"
            >
              <span className="text-lg mb-1">🙂</span>
              <span className="text-xs">Нормально</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => handleRate('easy')}
              className="flex-col py-4"
            >
              <span className="text-lg mb-1">😎</span>
              <span className="text-xs">Легко</span>
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={() => setIsFlipped(false)}
            leftIcon={<RotateCcw className="w-4 h-4" />}
            className="w-full"
          >
            Перевернуть обратно
          </Button>
        </div>
      )}

      {/* CSS for 3D flip */}
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}</style>
    </div>
  )
}

