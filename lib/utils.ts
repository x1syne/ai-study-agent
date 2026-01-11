import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`
}

export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

/**
 * Calculates progress percentage for a single module.
 * Formula: (completed topics / total topics) * 100
 * 
 * @param topics - Array of topics with optional progress status
 * @returns Progress percentage (0-100)
 * 
 * Requirements: 4.1, 4.2
 */
export function calculateModuleProgress(topics: { progress?: { status: string } | null }[]): number {
  if (topics.length === 0) return 0
  
  const completedTopics = topics.filter(
    topic => topic.progress?.status === 'COMPLETED' || topic.progress?.status === 'MASTERED'
  ).length
  
  return Math.round((completedTopics / topics.length) * 100)
}

/**
 * Calculates overall course progress across all modules.
 * Formula: (total completed topics across all modules / total topics across all modules) * 100
 * 
 * @param modules - Array of modules, each containing topics with optional progress status
 * @returns Overall progress percentage (0-100)
 * 
 * Requirements: 4.4
 */
export function calculateOverallProgress(
  modules: { topics: { progress?: { status: string } | null }[] }[]
): number {
  const allTopics = modules.flatMap(module => module.topics)
  
  if (allTopics.length === 0) return 0
  
  const completedTopics = allTopics.filter(
    topic => topic.progress?.status === 'COMPLETED' || topic.progress?.status === 'MASTERED'
  ).length
  
  return Math.round((completedTopics / allTopics.length) * 100)
}
