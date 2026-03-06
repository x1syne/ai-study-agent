import { NextRequest, NextResponse } from 'next/server'
import { monitoring } from '@/lib/madi/monitoring'

/**
 * API endpoint для мониторинга MADI парсера
 * 
 * GET /api/monitoring/madi - получить текущие метрики
 * POST /api/monitoring/madi/reset - сбросить метрики
 * 
 * Requirements: 8.1
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    
    if (format === 'health') {
      // Health check endpoint для внешних систем мониторинга
      const health = monitoring.getHealthStatus()
      
      return NextResponse.json(health, {
        status: health.status === 'healthy' ? 200 
          : health.status === 'degraded' ? 503 
          : 500
      })
    }
    
    if (format === 'export') {
      // Экспорт метрик в текстовом формате
      const exported = monitoring.exportMetrics()
      
      return new NextResponse(exported, {
        headers: {
          'Content-Type': 'text/plain',
          'Content-Disposition': `attachment; filename="madi-metrics-${Date.now()}.json"`
        }
      })
    }
    
    // Стандартный JSON ответ с метриками
    const metrics = monitoring.getMetrics()
    const recentErrors = monitoring.getRecentErrors(10)
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
      recentErrors,
      health: monitoring.getHealthStatus()
    })
    
  } catch (error) {
    console.error('[Monitoring API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    
    if (action === 'reset') {
      monitoring.reset()
      
      return NextResponse.json({
        success: true,
        message: 'Metrics reset successfully',
        timestamp: new Date().toISOString()
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
    
  } catch (error) {
    console.error('[Monitoring API] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
