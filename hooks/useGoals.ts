'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Goal } from '@/types'

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoals = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/goals')
      if (!res.ok) throw new Error('Failed to fetch goals')
      const data = await res.json()
      setGoals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const createGoal = async (data: { title: string; skill: string; targetDate?: string; level?: string }) => {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) throw new Error('Failed to create goal')
    const goal = await res.json()
    setGoals([goal, ...goals])
    return goal
  }

  const deleteGoal = async (id: string) => {
    const res = await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete goal')
    setGoals(goals.filter(g => g.id !== id))
  }

  return {
    goals,
    isLoading,
    error,
    refetch: fetchGoals,
    createGoal,
    deleteGoal,
  }
}

export function useGoal(id: string) {
  const [goal, setGoal] = useState<Goal | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGoal = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/goals/${id}`)
      if (!res.ok) throw new Error('Failed to fetch goal')
      const data = await res.json()
      setGoal(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchGoal()
  }, [fetchGoal])

  return {
    goal,
    isLoading,
    error,
    refetch: fetchGoal,
  }
}
