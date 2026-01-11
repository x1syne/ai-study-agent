/**
 * Wikidata API Integration
 * 100% бесплатно, без лимитов, без ключа
 * Документация: https://www.wikidata.org/wiki/Wikidata:Data_access
 */

import { withCache, cacheKey, CACHE_TTL } from './rag/cache'

// ==================== ТИПЫ ====================

export interface WikidataEntity {
  id: string           // Q-идентификатор (Q42 = Douglas Adams)
  label: string        // Название
  description: string  // Краткое описание
  aliases: string[]    // Альтернативные названия
  properties: WikidataProperty[]
}

export interface WikidataProperty {
  property: string     // P-идентификатор
  label: string        // Название свойства
  value: string        // Значение
  valueType: 'string' | 'date' | 'quantity' | 'entity' | 'url'
}

export interface WikidataSearchResult {
  entities: WikidataEntity[]
  query: string
}

// ==================== ВАЖНЫЕ СВОЙСТВА ====================

const IMPORTANT_PROPERTIES: Record<string, string> = {
  // Люди
  'P569': 'Дата рождения',
  'P570': 'Дата смерти',
  'P27': 'Гражданство',
  'P106': 'Род деятельности',
  'P19': 'Место рождения',
  'P20': 'Место смерти',
  'P166': 'Награды',
  'P800': 'Известные работы',
  
  // События
  'P580': 'Дата начала',
  'P582': 'Дата окончания',
  'P276': 'Место',
  'P710': 'Участники',
  'P1542': 'Причина',
  'P1536': 'Результат',
  
  // Произведения искусства
  'P170': 'Автор',
  'P571': 'Дата создания',
  'P186': 'Материал',
  'P195': 'Коллекция/музей',
  'P180': 'Изображает',
  'P136': 'Жанр',
  
  // Общее
  'P31': 'Тип',
  'P279': 'Подкласс',
  'P361': 'Часть',
  'P527': 'Состоит из',
  'P17': 'Страна',
  'P131': 'Расположение',
  'P856': 'Официальный сайт',
  'P18': 'Изображение'
}

// ==================== API ФУНКЦИИ ====================

/**
 * Поиск сущностей в Wikidata
 */
export async function searchWikidata(
  query: string,
  options: { language?: string; limit?: number } = {}
): Promise<WikidataSearchResult> {
  const { language = 'ru', limit = 5 } = options
  
  const key = cacheKey('wikidata-search', query, language)
  
  return withCache(key, async () => {
    try {
      const params = new URLSearchParams({
        action: 'wbsearchentities',
        search: query,
        language,
        limit: String(limit),
        format: 'json',
        origin: '*'
      })
      
      const response = await fetch(
        `https://www.wikidata.org/w/api.php?${params}`
      )
      
      if (!response.ok) {
        console.error('[Wikidata] Search error:', response.status)
        return { entities: [], query }
      }
      
      const data = await response.json()
      
      const entities: WikidataEntity[] = (data.search || []).map((item: any) => ({
        id: item.id,
        label: item.label || '',
        description: item.description || '',
        aliases: item.aliases || [],
        properties: []
      }))
      
      return { entities, query }
    } catch (error) {
      console.error('[Wikidata] Search error:', error)
      return { entities: [], query }
    }
  }, { ttl: CACHE_TTL.WIKIPEDIA })
}

/**
 * Получение детальной информации о сущности
 */
export async function getEntityDetails(
  entityId: string,
  options: { language?: string } = {}
): Promise<WikidataEntity | null> {
  const { language = 'ru' } = options
  
  const key = cacheKey('wikidata-entity', entityId, language)
  
  return withCache(key, async () => {
    try {
      const params = new URLSearchParams({
        action: 'wbgetentities',
        ids: entityId,
        languages: `${language}|en`,
        props: 'labels|descriptions|aliases|claims',
        format: 'json',
        origin: '*'
      })
      
      const response = await fetch(
        `https://www.wikidata.org/w/api.php?${params}`
      )
      
      if (!response.ok) return null
      
      const data = await response.json()
      const entity = data.entities?.[entityId]
      
      if (!entity) return null
      
      // Извлекаем label и description
      const label = entity.labels?.[language]?.value || 
                    entity.labels?.en?.value || entityId
      const description = entity.descriptions?.[language]?.value || 
                          entity.descriptions?.en?.value || ''
      const aliases = (entity.aliases?.[language] || []).map((a: any) => a.value)
      
      // Извлекаем важные свойства
      const properties = extractProperties(entity.claims, language)
      
      return {
        id: entityId,
        label,
        description,
        aliases,
        properties
      }
    } catch (error) {
      console.error('[Wikidata] Get entity error:', error)
      return null
    }
  }, { ttl: CACHE_TTL.WIKIPEDIA })
}

/**
 * Извлечение свойств из claims
 */
function extractProperties(claims: any, language: string): WikidataProperty[] {
  if (!claims) return []
  
  const properties: WikidataProperty[] = []
  
  for (const [propId, propClaims] of Object.entries(claims)) {
    // Берём только важные свойства
    const propLabel = IMPORTANT_PROPERTIES[propId]
    if (!propLabel) continue
    
    const claim = (propClaims as any[])[0]
    if (!claim?.mainsnak?.datavalue) continue
    
    const datavalue = claim.mainsnak.datavalue
    let value = ''
    let valueType: WikidataProperty['valueType'] = 'string'
    
    switch (datavalue.type) {
      case 'string':
        value = datavalue.value
        valueType = 'string'
        break
        
      case 'time':
        value = formatWikidataDate(datavalue.value.time)
        valueType = 'date'
        break
        
      case 'quantity':
        value = datavalue.value.amount.replace('+', '')
        valueType = 'quantity'
        break
        
      case 'wikibase-entityid':
        value = datavalue.value.id // Q-id, нужно будет разрешить
        valueType = 'entity'
        break
        
      case 'monolingualtext':
        value = datavalue.value.text
        valueType = 'string'
        break
        
      default:
        continue
    }
    
    if (value) {
      properties.push({
        property: propId,
        label: propLabel,
        value,
        valueType
      })
    }
  }
  
  return properties
}

/**
 * Форматирование даты Wikidata
 */
function formatWikidataDate(timeStr: string): string {
  // Формат: +1879-03-14T00:00:00Z
  const match = timeStr.match(/([+-]?\d+)-(\d{2})-(\d{2})/)
  if (!match) return timeStr
  
  const [, year, month, day] = match
  const yearNum = parseInt(year)
  
  // Для дат до нашей эры
  if (yearNum < 0) {
    return `${Math.abs(yearNum)} г. до н.э.`
  }
  
  // Если только год известен
  if (month === '00' || day === '00') {
    return `${yearNum} г.`
  }
  
  const months = ['', 'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  
  return `${parseInt(day)} ${months[parseInt(month)]} ${yearNum} г.`
}

/**
 * Разрешение Q-id в читаемые названия
 */
async function resolveEntityIds(
  entityIds: string[],
  language: string = 'ru'
): Promise<Map<string, string>> {
  if (entityIds.length === 0) return new Map()
  
  const key = cacheKey('wikidata-resolve', entityIds.join(','), language)
  
  return withCache(key, async () => {
    try {
      const params = new URLSearchParams({
        action: 'wbgetentities',
        ids: entityIds.slice(0, 50).join('|'), // Максимум 50
        languages: `${language}|en`,
        props: 'labels',
        format: 'json',
        origin: '*'
      })
      
      const response = await fetch(
        `https://www.wikidata.org/w/api.php?${params}`
      )
      
      if (!response.ok) return new Map()
      
      const data = await response.json()
      const result = new Map<string, string>()
      
      for (const [id, entity] of Object.entries(data.entities || {})) {
        const e = entity as any
        const label = e.labels?.[language]?.value || e.labels?.en?.value || id
        result.set(id, label)
      }
      
      return result
    } catch {
      return new Map()
    }
  }, { ttl: CACHE_TTL.WIKIPEDIA })
}

// ==================== ФОРМАТИРОВАНИЕ ====================

/**
 * Форматирование для AI контекста
 */
export async function formatWikidataForContext(
  entity: WikidataEntity,
  language: string = 'ru'
): Promise<string> {
  let context = `\n📊 **${entity.label}** (Wikidata: ${entity.id})\n`
  
  if (entity.description) {
    context += `${entity.description}\n\n`
  }
  
  if (entity.aliases.length > 0) {
    context += `Также известен как: ${entity.aliases.join(', ')}\n\n`
  }
  
  if (entity.properties.length > 0) {
    // Разрешаем Q-id в названия
    const entityIds = entity.properties
      .filter(p => p.valueType === 'entity')
      .map(p => p.value)
    
    const resolvedNames = await resolveEntityIds(entityIds, language)
    
    context += `**Факты:**\n`
    for (const prop of entity.properties) {
      let value = prop.value
      if (prop.valueType === 'entity') {
        value = resolvedNames.get(prop.value) || prop.value
      }
      context += `• ${prop.label}: ${value}\n`
    }
  }
  
  return context
}

/**
 * Форматирование для промпта (компактная версия)
 */
export async function formatWikidataForPrompt(
  entities: WikidataEntity[],
  language: string = 'ru'
): Promise<string> {
  if (entities.length === 0) return ''
  
  let prompt = '\n[WIKIDATA - структурированные факты]\n'
  
  for (const entity of entities.slice(0, 3)) {
    prompt += `\n📊 ${entity.label}`
    if (entity.description) {
      prompt += ` — ${entity.description}`
    }
    prompt += '\n'
    
    // Разрешаем Q-id
    const entityIds = entity.properties
      .filter(p => p.valueType === 'entity')
      .map(p => p.value)
    const resolvedNames = await resolveEntityIds(entityIds, language)
    
    for (const prop of entity.properties.slice(0, 6)) {
      let value = prop.value
      if (prop.valueType === 'entity') {
        value = resolvedNames.get(prop.value) || prop.value
      }
      prompt += `• ${prop.label}: ${value}\n`
    }
  }
  
  prompt += '\nИспользуй эти точные факты и даты в контенте.\n'
  
  return prompt
}

// ==================== ГЛАВНАЯ ФУНКЦИЯ ====================

/**
 * Получение контекста из Wikidata для темы
 */
export async function getWikidataContext(
  topic: string,
  options: { language?: string; maxEntities?: number } = {}
): Promise<string> {
  const { language = 'ru', maxEntities = 2 } = options
  
  // Поиск сущностей
  const searchResult = await searchWikidata(topic, { language, limit: maxEntities })
  
  if (searchResult.entities.length === 0) return ''
  
  // Получаем детали для найденных сущностей
  const detailedEntities: WikidataEntity[] = []
  
  for (const entity of searchResult.entities) {
    const details = await getEntityDetails(entity.id, { language })
    if (details && details.properties.length > 0) {
      detailedEntities.push(details)
    }
  }
  
  if (detailedEntities.length === 0) return ''
  
  return formatWikidataForPrompt(detailedEntities, language)
}

/**
 * Проверка, нужен ли Wikidata для темы
 */
export function shouldUseWikidata(topic: string): boolean {
  const wikidataKeywords = [
    // История
    'истори', 'век', 'эпох', 'войн', 'революц', 'импер', 'царь', 'король',
    'президент', 'правител', 'династ', 'событи', 'дата',
    // Искусство
    'художник', 'картин', 'скульптур', 'архитектор', 'композитор', 'музык',
    'писател', 'поэт', 'режиссёр', 'актёр', 'произведен',
    // Персоналии
    'биограф', 'жизн', 'родил', 'умер', 'создател', 'основател',
    // Места
    'город', 'стран', 'столиц', 'памятник', 'музей'
  ]
  
  const topicLower = topic.toLowerCase()
  return wikidataKeywords.some(kw => topicLower.includes(kw))
}
