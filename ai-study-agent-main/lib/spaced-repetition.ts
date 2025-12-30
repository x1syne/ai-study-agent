// SM-2 Algorithm for Spaced Repetition

export interface CardState {
  easeFactor: number
  interval: number
  repetitions: number
}

export interface ReviewResult {
  quality: number // 0-5 (0 = полный провал, 5 = идеально)
}

export function calculateNextReview(
  card: CardState,
  result: ReviewResult
): CardState {
  const { quality } = result
  let { easeFactor, interval, repetitions } = card

  if (quality < 3) {
    // Неправильный ответ — сбрасываем
    repetitions = 0
    interval = 1
  } else {
    // Правильный ответ
    if (repetitions === 0) {
      interval = 1
    } else if (repetitions === 1) {
      interval = 6
    } else {
      interval = Math.round(interval * easeFactor)
    }
    repetitions += 1
  }

  // Обновляем ease factor
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  )

  return { easeFactor, interval, repetitions }
}

export function qualityFromResponse(response: 'forgot' | 'hard' | 'good' | 'easy'): number {
  switch (response) {
    case 'forgot': return 0
    case 'hard': return 3
    case 'good': return 4
    case 'easy': return 5
  }
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}
