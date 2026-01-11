/**
 * Metropolitan Museum of Art API Integration
 * 100% бесплатно, без ключа, без лимитов
 * Документация: https://metmuseum.github.io/
 * 
 * 500,000+ произведений искусства с изображениями
 */

import { withCache, cacheKey, CACHE_TTL } from './rag/cache'

// ==================== ТИПЫ ====================

export interface MetArtwork {
  objectID: number
  title: string
  artistDisplayName: string
  artistNationality: string
  artistBeginDate: string
  artistEndDate: string
  objectDate: string           // "1889" или "ca. 1500"
  medium: string               // "Oil on canvas"
  dimensions: string
  department: string           // "European Paintings"
  culture: string
  period: string
  dynasty: string
  classification: string
  primaryImage: string         // URL изображения
  primaryImageSmall: string
  objectURL: string            // Ссылка на страницу музея
  isPublicDomain: boolean
  tags: string[]
}

export interface MetSearchResult {
  artworks: MetArtwork[]
  totalResults: number
  query: string
}

// ==================== API ФУНКЦИИ ====================

/**
 * Поиск произведений искусства
 */
export async function searchMetMuseum(
  query: string,
  options: { 
    maxResults?: number
    hasImages?: boolean
    isPublicDomain?: boolean
    departmentId?: number
  } = {}
): Promise<MetSearchResult> {
  const { maxResults = 5, hasImages = true, isPublicDomain = true } = options
  
  const key = cacheKey('met-search', query, String(maxResults))
  
  return withCache(key, async () => {
    try {
      // Шаг 1: Поиск ID объектов
      const params = new URLSearchParams({
        q: query,
        hasImages: String(hasImages),
        isPublicDomain: String(isPublicDomain)
      })
      
      const searchResponse = await fetch(
        `https://collectionapi.metmuseum.org/public/collection/v1/search?${params}`
      )
      
      if (!searchResponse.ok) {
        console.error('[MetMuseum] Search error:', searchResponse.status)
        return { artworks: [], totalResults: 0, query }
      }
      
      const searchData = await searchResponse.json()
      
      if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
        return { artworks: [], totalResults: 0, query }
      }
      
      // Шаг 2: Получаем детали для первых N объектов
      const objectIDs = searchData.objectIDs.slice(0, maxResults)
      
      const artworkPromises = objectIDs.map((id: number) => 
        getArtworkDetails(id).catch(() => null)
      )
      
      const artworks = (await Promise.all(artworkPromises))
        .filter((a): a is MetArtwork => a !== null)
      
      return {
        artworks,
        totalResults: searchData.total || 0,
        query
      }
    } catch (error) {
      console.error('[MetMuseum] Search error:', error)
      return { artworks: [], totalResults: 0, query }
    }
  }, { ttl: CACHE_TTL.WIKIPEDIA })
}

/**
 * Получение деталей произведения
 */
export async function getArtworkDetails(objectID: number): Promise<MetArtwork | null> {
  const key = cacheKey('met-object', String(objectID))
  
  return withCache(key, async () => {
    try {
      const response = await fetch(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${objectID}`
      )
      
      if (!response.ok) return null
      
      const data = await response.json()
      
      return {
        objectID: data.objectID,
        title: data.title || 'Без названия',
        artistDisplayName: data.artistDisplayName || 'Неизвестный художник',
        artistNationality: data.artistNationality || '',
        artistBeginDate: data.artistBeginDate || '',
        artistEndDate: data.artistEndDate || '',
        objectDate: data.objectDate || '',
        medium: data.medium || '',
        dimensions: data.dimensions || '',
        department: data.department || '',
        culture: data.culture || '',
        period: data.period || '',
        dynasty: data.dynasty || '',
        classification: data.classification || '',
        primaryImage: data.primaryImage || '',
        primaryImageSmall: data.primaryImageSmall || '',
        objectURL: data.objectURL || '',
        isPublicDomain: data.isPublicDomain || false,
        tags: (data.tags || []).map((t: any) => t.term)
      }
    } catch (error) {
      console.error('[MetMuseum] Get object error:', error)
      return null
    }
  }, { ttl: CACHE_TTL.WIKIPEDIA })
}

/**
 * Получение произведений по отделу музея
 */
export async function getArtworksByDepartment(
  departmentId: number,
  maxResults: number = 5
): Promise<MetArtwork[]> {
  const key = cacheKey('met-dept', String(departmentId), String(maxResults))
  
  return withCache(key, async () => {
    try {
      const response = await fetch(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects?departmentIds=${departmentId}`
      )
      
      if (!response.ok) return []
      
      const data = await response.json()
      
      if (!data.objectIDs) return []
      
      // Берём случайные объекты для разнообразия
      const shuffled = data.objectIDs.sort(() => Math.random() - 0.5)
      const objectIDs = shuffled.slice(0, maxResults)
      
      const artworks = await Promise.all(
        objectIDs.map((id: number) => getArtworkDetails(id).catch(() => null))
      )
      
      return artworks.filter((a): a is MetArtwork => a !== null)
    } catch (error) {
      console.error('[MetMuseum] Get by department error:', error)
      return []
    }
  }, { ttl: CACHE_TTL.WIKIPEDIA })
}

// ==================== ФОРМАТИРОВАНИЕ ====================

/**
 * Форматирование для AI контекста
 */
export function formatMetMuseumForContext(result: MetSearchResult): string {
  if (result.artworks.length === 0) return ''
  
  let context = `\n🎨 Произведения искусства из Metropolitan Museum по "${result.query}":\n`
  context += `(Найдено ${result.totalResults} работ)\n\n`
  
  for (const artwork of result.artworks) {
    context += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    context += `🖼️ **"${artwork.title}"**\n`
    
    if (artwork.artistDisplayName) {
      let artistInfo = artwork.artistDisplayName
      if (artwork.artistNationality) {
        artistInfo += ` (${artwork.artistNationality}`
        if (artwork.artistBeginDate && artwork.artistEndDate) {
          artistInfo += `, ${artwork.artistBeginDate}–${artwork.artistEndDate}`
        }
        artistInfo += ')'
      }
      context += `   Художник: ${artistInfo}\n`
    }
    
    if (artwork.objectDate) {
      context += `   Дата: ${artwork.objectDate}\n`
    }
    
    if (artwork.medium) {
      context += `   Техника: ${artwork.medium}\n`
    }
    
    if (artwork.dimensions) {
      context += `   Размеры: ${artwork.dimensions}\n`
    }
    
    if (artwork.department) {
      context += `   Отдел: ${artwork.department}\n`
    }
    
    if (artwork.culture || artwork.period) {
      context += `   Культура/Период: ${[artwork.culture, artwork.period].filter(Boolean).join(', ')}\n`
    }
    
    if (artwork.tags.length > 0) {
      context += `   Теги: ${artwork.tags.slice(0, 5).join(', ')}\n`
    }
    
    context += `   ${artwork.objectURL}\n\n`
  }
  
  return context
}

/**
 * Форматирование для промпта (компактная версия)
 */
export function formatMetMuseumForPrompt(artworks: MetArtwork[]): string {
  if (artworks.length === 0) return ''
  
  let prompt = '\n[METROPOLITAN MUSEUM - произведения искусства]\n'
  
  for (const artwork of artworks.slice(0, 3)) {
    prompt += `\n🖼️ "${artwork.title}"`
    if (artwork.artistDisplayName && artwork.artistDisplayName !== 'Неизвестный художник') {
      prompt += ` — ${artwork.artistDisplayName}`
    }
    if (artwork.objectDate) {
      prompt += ` (${artwork.objectDate})`
    }
    prompt += '\n'
    
    const details: string[] = []
    if (artwork.medium) details.push(`Техника: ${artwork.medium}`)
    if (artwork.culture) details.push(`Культура: ${artwork.culture}`)
    if (artwork.period) details.push(`Период: ${artwork.period}`)
    
    if (details.length > 0) {
      prompt += `${details.join(' | ')}\n`
    }
  }
  
  prompt += '\nИспользуй эти примеры произведений для иллюстрации концепций.\n'
  
  return prompt
}

// ==================== ГЛАВНАЯ ФУНКЦИЯ ====================

/**
 * Базовый перевод для поиска в Met Museum
 */
function translateForMetMuseum(query: string): string {
  const terms: Record<string, string> = {
    'импрессионизм': 'impressionism',
    'ренессанс': 'renaissance',
    'барокко': 'baroque',
    'модернизм': 'modernism',
    'живопись': 'painting',
    'скульптура': 'sculpture',
    'портрет': 'portrait',
    'пейзаж': 'landscape',
    'натюрморт': 'still life',
    'художник': 'artist'
  }
  
  let result = query.toLowerCase()
  for (const [ru, en] of Object.entries(terms)) {
    result = result.replace(new RegExp(ru, 'gi'), en)
  }
  
  // Транслитерация имён
  const translit: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
  }
  
  if (/[а-яА-ЯёЁ]/.test(result)) {
    result = result.split('').map(c => translit[c] || translit[c.toLowerCase()]?.toUpperCase() || c).join('')
  }
  
  return result
}

/**
 * Получение контекста из Met Museum для темы искусства
 */
export async function getMetMuseumContext(
  topic: string,
  options: { maxArtworks?: number } = {}
): Promise<string> {
  const { maxArtworks = 3 } = options
  
  // Переводим русский запрос на английский
  const searchQuery = /[а-яА-ЯёЁ]/.test(topic) ? translateForMetMuseum(topic) : topic
  
  const result = await searchMetMuseum(searchQuery, { maxResults: maxArtworks })
  
  if (result.artworks.length === 0) return ''
  
  return formatMetMuseumForPrompt(result.artworks)
}

/**
 * Проверка, нужен ли Met Museum для темы
 */
export function shouldUseMetMuseum(topic: string): boolean {
  const artKeywords = [
    'искусств', 'живопис', 'картин', 'художник', 'скульптур',
    'портрет', 'пейзаж', 'натюрморт', 'импрессион', 'ренессанс',
    'барокко', 'модерн', 'авангард', 'музей', 'коллекц',
    'painting', 'sculpture', 'artist', 'art', 'museum',
    'renaissance', 'baroque', 'impressionism', 'portrait'
  ]
  
  const topicLower = topic.toLowerCase()
  return artKeywords.some(kw => topicLower.includes(kw))
}

// ==================== ОТДЕЛЫ МУЗЕЯ ====================

export const MET_DEPARTMENTS = {
  AMERICAN_DECORATIVE_ARTS: 1,
  ANCIENT_NEAR_EASTERN_ART: 3,
  ARMS_AND_ARMOR: 4,
  ASIAN_ART: 6,
  COSTUME_INSTITUTE: 8,
  DRAWINGS_AND_PRINTS: 9,
  EGYPTIAN_ART: 10,
  EUROPEAN_PAINTINGS: 11,
  EUROPEAN_SCULPTURE: 12,
  GREEK_AND_ROMAN_ART: 13,
  ISLAMIC_ART: 14,
  MEDIEVAL_ART: 17,
  MODERN_ART: 21,
  PHOTOGRAPHS: 19,
  MUSICAL_INSTRUMENTS: 18
}
