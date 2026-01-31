/**
 * Task Difficulty Override Component
 * Allows manual override of task difficulty classifications
 * Requirements: 6.4 - Allow manual override when task is misclassified
 */

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Settings, AlertCircle } from 'lucide-react'

interface TaskDifficultyOverrideProps {
  lessonId: string
  taskId: number
  currentDifficulty: 'easy' | 'medium' | 'hard'
  originalDifficulty?: 'easy' | 'medium' | 'hard'
  manualOverride?: boolean
  onOverrideSuccess?: (newDifficulty: 'easy' | 'medium' | 'hard') => void
}

const difficultyLabels = {
  easy: 'Легко',
  medium: 'Средне',
  hard: 'Сложно'
}

const difficultyColors = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30'
}

export function TaskDifficultyOverride({
  lessonId,
  taskId,
  currentDifficulty,
  originalDifficulty,
  manualOverride,
  onOverrideSuccess
}: TaskDifficultyOverrideProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>(currentDifficulty)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOverride = async () => {
    if (selectedDifficulty === currentDifficulty) {
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/tasks/${lessonId}/override`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          taskId,
          difficulty: selectedDifficulty
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to override difficulty')
      }

      const data = await response.json()
      console.log('[TaskDifficultyOverride] Override successful:', data)

      // Call success callback
      if (onOverrideSuccess) {
        onOverrideSuccess(selectedDifficulty)
      }

      setIsOpen(false)
    } catch (err) {
      console.error('[TaskDifficultyOverride] Override failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to override difficulty')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          title="Изменить сложность задания"
        >
          <Settings className="h-3 w-3 mr-1" />
          {manualOverride && (
            <AlertCircle className="h-3 w-3 mr-1 text-yellow-400" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">Изменить сложность задания</DialogTitle>
          <DialogDescription className="text-slate-400">
            Задание #{taskId}
            {manualOverride && originalDifficulty && (
              <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Сложность была изменена вручную
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Текущая сложность
            </label>
            <div>
              <Badge className={difficultyColors[currentDifficulty]}>
                {difficultyLabels[currentDifficulty]}
              </Badge>
              {manualOverride && originalDifficulty && (
                <span className="ml-2 text-xs text-slate-500">
                  (изначально: {difficultyLabels[originalDifficulty]})
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">
              Новая сложность
            </label>
            <Select
              value={selectedDifficulty}
              onValueChange={(value) => setSelectedDifficulty(value as 'easy' | 'medium' | 'hard')}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="easy" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    {difficultyLabels.easy}
                  </div>
                </SelectItem>
                <SelectItem value="medium" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-400" />
                    {difficultyLabels.medium}
                  </div>
                </SelectItem>
                <SelectItem value="hard" className="text-white hover:bg-slate-700">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    {difficultyLabels.hard}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
              {error}
            </div>
          )}

          <div className="text-xs text-slate-500">
            <p>
              Изменение сложности поможет системе лучше понимать ваш уровень и
              подбирать подходящие задания.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            Отмена
          </Button>
          <Button
            onClick={handleOverride}
            disabled={isLoading || selectedDifficulty === currentDifficulty}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
