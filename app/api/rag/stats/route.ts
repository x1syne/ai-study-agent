/**
 * RAG Stats API
 * Эндпоинт для просмотра статистики RAG системы
 */

import { NextResponse } from 'next/server'
import { getRAGStats, getMetricsHistory, checkRAGHealth, formatRAGStats } from '@/lib/rag'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const lastN = parseInt(searchParams.get('lastN') || '100')
    
    const stats = getRAGStats(lastN)
    const health = checkRAGHealth()
    
    if (format === 'text') {
      return new NextResponse(formatRAGStats(stats), {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    }
    
    return NextResponse.json({
      stats,
      health,
      history: getMetricsHistory(10) // Последние 10 запросов
    })
  } catch (error) {
    console.error('RAG stats error:', error)
    return NextResponse.json(
      { error: 'Failed to get RAG stats' },
      { status: 500 }
    )
  }
}
