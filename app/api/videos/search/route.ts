import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { searchYouTubeVideos, type YouTubeSearchOptions } from '@/lib/youtube'

export const dynamic = 'force-dynamic'

/**
 * GET /api/videos/search?q=тема&max=3&duration=medium
 * Поиск образовательных YouTube-видео по теме.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 })
    }

    const options: YouTubeSearchOptions = {
      maxResults: Math.min(parseInt(searchParams.get('max') || '3', 10), 10),
      language: searchParams.get('lang') || 'ru',
      educationalOnly: searchParams.get('edu') !== 'false',
      videoDuration: (searchParams.get('duration') as YouTubeSearchOptions['videoDuration']) || 'medium',
    }

    const videos = await searchYouTubeVideos(query, options)

    return NextResponse.json({ videos, count: videos.length })
  } catch (error) {
    console.error('[API /videos/search] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
