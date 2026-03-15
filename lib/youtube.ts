/**
 * YouTube Data API v3 — поиск релевантных видео для учебных тем.
 *
 * Используется для обогащения теории встроенными видеоплеерами.
 * Лимит бесплатно: 10 000 units/день (1 search = 100 units → ~100 поисков).
 */

// ==================== ТИПЫ ====================

export interface YouTubeVideo {
  id: string
  title: string
  channelTitle: string
  description: string
  thumbnail: string
  /** ISO 8601 duration, e.g. "PT12M34S" */
  duration?: string
  /** Человекочитаемая длительность, e.g. "12:34" */
  durationFormatted?: string
  viewCount?: number
  publishedAt: string
}

export interface YouTubeSearchOptions {
  /** Максимум результатов (1-10, каждый = 100 units) */
  maxResults?: number
  /** Язык контента */
  language?: string
  /** Только образовательные видео */
  educationalOnly?: boolean
  /** Максимальная длительность: short (<4min), medium (4-20min), long (>20min) */
  videoDuration?: 'short' | 'medium' | 'long' | 'any'
}

interface YouTubeSearchItem {
  id: { videoId: string }
  snippet: {
    title: string
    channelTitle: string
    description: string
    publishedAt: string
    thumbnails: {
      medium?: { url: string }
      high?: { url: string }
      default?: { url: string }
    }
  }
}

interface YouTubeVideoDetails {
  id: string
  contentDetails: { duration: string }
  statistics: { viewCount: string }
}

// ==================== КОНСТАНТЫ ====================

const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search'
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos'

/** Каналы с качественным образовательным контентом (буст в поиске) */
const TRUSTED_CHANNELS = [
  // Русскоязычные
  'Лекториум', 'Stepik', 'Computer Science Center', 'Тинькофф Образование',
  'Яндекс', 'Академия Яндекса', 'МГУ', 'МФТИ',
  // Англоязычные
  '3Blue1Brown', 'Khan Academy', 'Fireship', 'freeCodeCamp',
  'MIT OpenCourseWare', 'Computerphile', 'Numberphile',
]

const DEFAULT_MAX_RESULTS = 3
const REQUEST_TIMEOUT_MS = 8000

// ==================== ОСНОВНАЯ ФУНКЦИЯ ====================

/**
 * Поиск образовательных YouTube-видео по теме.
 * Возвращает пустой массив если API ключ не задан или произошла ошибка.
 */
export async function searchYouTubeVideos(
  query: string,
  options: YouTubeSearchOptions = {},
): Promise<YouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    console.warn('[YouTube] YOUTUBE_API_KEY not set, skipping video search')
    return []
  }

  const {
    maxResults = DEFAULT_MAX_RESULTS,
    language = 'ru',
    educationalOnly = true,
    videoDuration = 'medium',
  } = options

  // Формируем поисковый запрос с образовательным уклоном
  const searchQuery = educationalOnly
    ? `${query} урок объяснение лекция`
    : query

  try {
    // 1. Поиск видео
    const searchParams = new URLSearchParams({
      part: 'snippet',
      q: searchQuery,
      type: 'video',
      maxResults: String(Math.min(maxResults, 10)),
      relevanceLanguage: language,
      safeSearch: 'strict',
      videoEmbeddable: 'true',
      videoDuration,
      order: 'relevance',
      key: apiKey,
    })

    if (educationalOnly) {
      searchParams.set('videoCategoryId', '27') // Education category
    }

    const searchResponse = await fetchWithTimeout(
      `${YOUTUBE_SEARCH_URL}?${searchParams}`,
      REQUEST_TIMEOUT_MS,
    )

    if (!searchResponse.ok) {
      const errorBody = await searchResponse.text()
      console.error(`[YouTube] Search API error ${searchResponse.status}:`, errorBody)
      return []
    }

    const searchData = await searchResponse.json()
    const items: YouTubeSearchItem[] = searchData.items || []

    if (items.length === 0) return []

    // 2. Получаем детали видео (длительность, просмотры)
    const videoIds = items.map(item => item.id.videoId).join(',')
    const detailsParams = new URLSearchParams({
      part: 'contentDetails,statistics',
      id: videoIds,
      key: apiKey,
    })

    const detailsResponse = await fetchWithTimeout(
      `${YOUTUBE_VIDEOS_URL}?${detailsParams}`,
      REQUEST_TIMEOUT_MS,
    )

    const detailsMap = new Map<string, YouTubeVideoDetails>()
    if (detailsResponse.ok) {
      const detailsData = await detailsResponse.json()
      for (const item of (detailsData.items || []) as YouTubeVideoDetails[]) {
        detailsMap.set(item.id, item)
      }
    }

    // 3. Собираем результат
    return items.map(item => {
      const details = detailsMap.get(item.id.videoId)
      const duration = details?.contentDetails?.duration
      return {
        id: item.id.videoId,
        title: decodeHtmlEntities(item.snippet.title),
        channelTitle: item.snippet.channelTitle,
        description: item.snippet.description,
        thumbnail:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default?.url || '',
        publishedAt: item.snippet.publishedAt,
        duration,
        durationFormatted: duration ? formatDuration(duration) : undefined,
        viewCount: details?.statistics?.viewCount
          ? parseInt(details.statistics.viewCount, 10)
          : undefined,
      }
    })
  } catch (error) {
    console.error('[YouTube] Search failed:', error)
    return []
  }
}

// ==================== MARKDOWN ENRICHMENT ====================

/**
 * Маркер видео-блока в markdown.
 * AI генерирует: `:::video{query="тема поиска"}`
 * Post-processing заменяет на: `:::youtube{id="xxxxx" title="..." channel="..."}`
 */
const VIDEO_QUERY_REGEX = /:::video\{query="([^"]+)"\}/g
const YOUTUBE_EMBED_REGEX = /:::youtube\{id="([^"]+)"(?:\s+title="([^"]*)")?(?:\s+channel="([^"]*)")?\}/g

/**
 * Обогащает markdown-контент реальными YouTube-видео.
 * Заменяет `:::video{query="..."}` на `:::youtube{id="..." title="..." channel="..."}`.
 */
export async function enrichContentWithVideos(content: string): Promise<string> {
  const matches = Array.from(content.matchAll(VIDEO_QUERY_REGEX))
  console.log(`[YouTube] Found ${matches.length} video queries in content`)
  if (matches.length === 0) return content

  let result = content

  // Обрабатываем параллельно, но не более 3 запросов
  const MAX_PARALLEL = 3
  const toProcess = matches.slice(0, MAX_PARALLEL)

  const searchResults = await Promise.all(
    toProcess.map(async (match) => {
      const query = match[1]
      const videos = await searchYouTubeVideos(query, { maxResults: 1 })
      return { fullMatch: match[0], query, video: videos[0] ?? null }
    })
  )

  for (const { fullMatch, query, video } of searchResults) {
    if (video) {
      const replacement = `:::youtube{id="${video.id}" title="${escapeQuotes(video.title)}" channel="${escapeQuotes(video.channelTitle)}"}`
      result = result.replace(fullMatch, replacement)
    } else {
      // Не нашли видео — убираем маркер, чтобы не мусорить
      result = result.replace(fullMatch, '')
    }
  }

  return result
}

/**
 * Инжектирует видео-блоки в контент, где их нет.
 * Ищет видео по названию темы и добавляет в конец секции "Дополнительные материалы".
 */
export async function injectVideosIntoContent(
  content: string,
  topicName: string,
  courseName: string,
): Promise<string> {
  // Если уже есть видео-блоки — не добавляем
  if (YOUTUBE_EMBED_REGEX.test(content) || VIDEO_QUERY_REGEX.test(content)) {
    return content
  }

  const videos = await searchYouTubeVideos(`${topicName} ${courseName}`, {
    maxResults: 2,
    educationalOnly: true,
    videoDuration: 'medium',
  })

  if (videos.length === 0) return content

  const videoSection = [
    '\n\n## 🎬 Видеоматериалы\n',
    ...videos.map(v =>
      `:::youtube{id="${v.id}" title="${escapeQuotes(v.title)}" channel="${escapeQuotes(v.channelTitle)}"}`
    ),
    '',
  ].join('\n')

  return content + videoSection
}

// ==================== УТИЛИТЫ ====================

/** ISO 8601 duration → "12:34" или "1:02:34" */
function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return ''

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  const pad = (n: number) => String(n).padStart(2, '0')

  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`
}

/** Decode HTML entities (&amp; → &, &#39; → ' etc.) */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
}

function escapeQuotes(text: string): string {
  return text.replace(/"/g, '\\"')
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
