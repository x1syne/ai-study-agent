/**
 * Domain-Specific RAG Sources
 * Специализированные источники данных для разных предметных областей
 */

import { DomainType } from '@/lib/ai/domain-prompts'

// ==================== ТИПЫ ====================

export interface DomainSourceConfig {
  domain: DomainType
  
  // Приоритеты источников (1.0 = нормальный, >1 = буст, <1 = понижение)
  sourceBoosts: {
    vector: number
    wikipedia: number
    arxiv: number
    book: number
    web: number
    stackoverflow?: number  // Для программирования
    github?: number         // Для программирования
  }
  
  // Дополнительные ключевые слова для поиска
  searchKeywords: string[]
  
  // Языки поиска (для Wikipedia)
  searchLanguages: string[]
  
  // Нужен ли arXiv для этого домена
  useArxiv: boolean
  
  // Нужны ли книги для этого домена
  useBooks: boolean
  
  // Нужен ли StackOverflow
  useStackOverflow: boolean
  
  // Нужен ли GitHub
  useGitHub: boolean
  
  // Минимальный порог релевантности
  minRelevanceThreshold: number
  
  // Максимальное количество результатов
  maxResults: number
  
  // Специфичные сайты для веб-поиска
  preferredSites: string[]
}

// ==================== КОНФИГУРАЦИИ ДОМЕНОВ ====================

const DOMAIN_SOURCE_CONFIGS: Record<DomainType, DomainSourceConfig> = {
  physics: {
    domain: 'physics',
    sourceBoosts: {
      vector: 1.3,
      wikipedia: 1.2,
      arxiv: 1.5,  // Научные статьи очень важны
      book: 1.0,
      web: 0.8
    },
    searchKeywords: ['physics', 'физика', 'формула', 'закон', 'теория'],
    searchLanguages: ['ru', 'en'],
    useArxiv: true,
    useBooks: true,
    useStackOverflow: false,
    useGitHub: false,
    minRelevanceThreshold: 0.25,
    maxResults: 10,
    preferredSites: ['physics.stackexchange.com', 'hyperphysics.phy-astr.gsu.edu']
  },
  
  math: {
    domain: 'math',
    sourceBoosts: {
      vector: 1.3,
      wikipedia: 1.3,
      arxiv: 1.4,
      book: 1.1,
      web: 0.7
    },
    searchKeywords: ['mathematics', 'математика', 'теорема', 'доказательство'],
    searchLanguages: ['ru', 'en'],
    useArxiv: true,
    useBooks: true,
    useStackOverflow: false,
    useGitHub: false,
    minRelevanceThreshold: 0.25,
    maxResults: 10,
    preferredSites: ['math.stackexchange.com', 'mathworld.wolfram.com']
  },
  
  chemistry: {
    domain: 'chemistry',
    sourceBoosts: {
      vector: 1.3,
      wikipedia: 1.3,
      arxiv: 1.3,
      book: 1.0,
      web: 0.8
    },
    searchKeywords: ['chemistry', 'химия', 'реакция', 'молекула', 'элемент'],
    searchLanguages: ['ru', 'en'],
    useArxiv: true,
    useBooks: true,
    useStackOverflow: false,
    useGitHub: false,
    minRelevanceThreshold: 0.25,
    maxResults: 10,
    preferredSites: ['chemistry.stackexchange.com', 'chemguide.co.uk']
  },
  
  programming: {
    domain: 'programming',
    sourceBoosts: {
      vector: 1.4,       // Код из базы очень ценен
      wikipedia: 0.8,
      arxiv: 0.9,
      book: 0.9,
      web: 1.2,
      stackoverflow: 1.5,  // StackOverflow — главный источник!
      github: 1.4          // GitHub — примеры кода
    },
    searchKeywords: ['programming', 'tutorial', 'documentation', 'example', 'code'],
    searchLanguages: ['en', 'ru'],
    useArxiv: false,      // Для программирования arXiv менее полезен
    useBooks: false,
    useStackOverflow: true,  // ✅ Включён!
    useGitHub: true,         // ✅ Включён!
    minRelevanceThreshold: 0.2,
    maxResults: 12,
    preferredSites: ['stackoverflow.com', 'developer.mozilla.org', 'docs.python.org', 'reactjs.org']
  },
  
  biology: {
    domain: 'biology',
    sourceBoosts: {
      vector: 1.2,
      wikipedia: 1.4,  // Wikipedia отлично для биологии
      arxiv: 1.2,
      book: 1.1,
      web: 0.8
    },
    searchKeywords: ['biology', 'биология', 'клетка', 'организм', 'эволюция'],
    searchLanguages: ['ru', 'en'],
    useArxiv: true,
    useBooks: true,
    useStackOverflow: false,
    useGitHub: false,
    minRelevanceThreshold: 0.25,
    maxResults: 10,
    preferredSites: ['biology.stackexchange.com', 'nature.com']
  },
  
  history: {
    domain: 'history',
    sourceBoosts: {
      vector: 1.2,
      wikipedia: 1.5,  // Wikipedia — основной источник для истории
      arxiv: 0.5,      // arXiv не для истории
      book: 1.4,       // Книги важны
      web: 0.9
    },
    searchKeywords: ['history', 'история', 'век', 'эпоха', 'событие'],
    searchLanguages: ['ru', 'en'],
    useArxiv: false,
    useBooks: true,
    useStackOverflow: false,
    useGitHub: false,
    minRelevanceThreshold: 0.2,
    maxResults: 10,
    preferredSites: ['history.com', 'britannica.com']
  },
  
  economics: {
    domain: 'economics',
    sourceBoosts: {
      vector: 1.2,
      wikipedia: 1.2,
      arxiv: 1.1,
      book: 1.3,
      web: 1.0
    },
    searchKeywords: ['economics', 'экономика', 'рынок', 'финансы', 'ВВП'],
    searchLanguages: ['ru', 'en'],
    useArxiv: true,
    useBooks: true,
    useStackOverflow: false,
    useGitHub: false,
    minRelevanceThreshold: 0.2,
    maxResults: 10,
    preferredSites: ['investopedia.com', 'economist.com']
  },
  
  languages: {
    domain: 'languages',
    sourceBoosts: {
      vector: 1.3,
      wikipedia: 1.1,
      arxiv: 0.5,
      book: 1.4,  // Учебники важны
      web: 1.2
    },
    searchKeywords: ['grammar', 'грамматика', 'vocabulary', 'лексика'],
    searchLanguages: ['ru', 'en'],
    useArxiv: false,
    useBooks: true,
    useStackOverflow: false,
    useGitHub: false,
    minRelevanceThreshold: 0.2,
    maxResults: 10,
    preferredSites: ['grammarly.com', 'cambridge.org']
  },
  
  psychology: {
    domain: 'psychology',
    sourceBoosts: {
      vector: 1.2,
      wikipedia: 1.3,
      arxiv: 1.2,
      book: 1.4,
      web: 0.9
    },
    searchKeywords: ['psychology', 'психология', 'поведение', 'сознание'],
    searchLanguages: ['ru', 'en'],
    useArxiv: true,
    useBooks: true,
    useStackOverflow: false,
    useGitHub: false,
    minRelevanceThreshold: 0.2,
    maxResults: 10,
    preferredSites: ['psychologytoday.com', 'apa.org']
  },
  
  law: {
    domain: 'law',
    sourceBoosts: {
      vector: 1.4,  // Правовая база важна
      wikipedia: 1.1,
      arxiv: 0.4,
      book: 1.3,
      web: 1.2
    },
    searchKeywords: ['закон', 'право', 'кодекс', 'статья', 'law'],
    searchLanguages: ['ru'],  // Право обычно национальное
    useArxiv: false,
    useBooks: true,
    useStackOverflow: false,
    useGitHub: false,
    minRelevanceThreshold: 0.25,
    maxResults: 10,
    preferredSites: ['consultant.ru', 'garant.ru']
  },
  
  medicine: {
    domain: 'medicine',
    sourceBoosts: {
      vector: 1.3,
      wikipedia: 1.2,
      arxiv: 1.4,  // Научные статьи важны
      book: 1.2,
      web: 0.8    // Осторожно с веб-источниками
    },
    searchKeywords: ['medicine', 'медицина', 'диагноз', 'лечение', 'симптом'],
    searchLanguages: ['ru', 'en'],
    useArxiv: true,
    useBooks: true,
    useStackOverflow: false,
    useGitHub: false,
    minRelevanceThreshold: 0.3,  // Выше порог для медицины
    maxResults: 8,
    preferredSites: ['pubmed.ncbi.nlm.nih.gov', 'medscape.com']
  },
  
  art: {
    domain: 'art',
    sourceBoosts: {
      vector: 1.2,
      wikipedia: 1.5,  // Wikipedia отлично для искусства
      arxiv: 0.3,
      book: 1.4,
      web: 1.0
    },
    searchKeywords: ['art', 'искусство', 'художник', 'стиль', 'эпоха'],
    searchLanguages: ['ru', 'en'],
    useArxiv: false,
    useBooks: true,
    useStackOverflow: false,
    useGitHub: false,
    minRelevanceThreshold: 0.2,
    maxResults: 10,
    preferredSites: ['metmuseum.org', 'artsy.net']
  },
  
  general: {
    domain: 'general',
    sourceBoosts: {
      vector: 1.2,
      wikipedia: 1.2,
      arxiv: 1.0,
      book: 1.0,
      web: 1.0
    },
    searchKeywords: [],
    searchLanguages: ['ru', 'en'],
    useArxiv: true,
    useBooks: true,
    useStackOverflow: false,
    useGitHub: false,
    minRelevanceThreshold: 0.2,
    maxResults: 10,
    preferredSites: []
  }
}

// ==================== ФУНКЦИИ ====================

/**
 * Получение конфигурации источников для домена
 */
export function getDomainSourceConfig(domain: DomainType): DomainSourceConfig {
  return DOMAIN_SOURCE_CONFIGS[domain] || DOMAIN_SOURCE_CONFIGS.general
}

/**
 * Оптимизация поискового запроса для домена
 */
export function optimizeSearchQuery(
  query: string,
  domain: DomainType
): string {
  const config = getDomainSourceConfig(domain)
  
  // Добавляем ключевые слова домена если их нет в запросе
  const queryLower = query.toLowerCase()
  const additionalKeywords: string[] = []
  
  for (const keyword of config.searchKeywords.slice(0, 2)) {
    if (!queryLower.includes(keyword.toLowerCase())) {
      additionalKeywords.push(keyword)
    }
  }
  
  if (additionalKeywords.length > 0) {
    return `${query} ${additionalKeywords.join(' ')}`
  }
  
  return query
}

/**
 * Получение boost factors для reranking
 */
export function getDomainBoostFactors(domain: DomainType): Record<string, number> {
  const config = getDomainSourceConfig(domain)
  return config.sourceBoosts
}

/**
 * Проверка, нужен ли arXiv для домена
 */
export function shouldUseArxiv(domain: DomainType): boolean {
  return getDomainSourceConfig(domain).useArxiv
}

/**
 * Проверка, нужны ли книги для домена
 */
export function shouldUseBooks(domain: DomainType): boolean {
  return getDomainSourceConfig(domain).useBooks
}

/**
 * Проверка, нужен ли StackOverflow для домена
 */
export function shouldUseStackOverflow(domain: DomainType): boolean {
  return getDomainSourceConfig(domain).useStackOverflow
}

/**
 * Проверка, нужен ли GitHub для домена
 */
export function shouldUseGitHub(domain: DomainType): boolean {
  return getDomainSourceConfig(domain).useGitHub
}

/**
 * Получение предпочтительных сайтов для веб-поиска
 */
export function getPreferredSites(domain: DomainType): string[] {
  return getDomainSourceConfig(domain).preferredSites
}

/**
 * Форматирование site: запроса для Google/Serper
 */
export function formatSiteQuery(query: string, domain: DomainType): string {
  const sites = getPreferredSites(domain)
  
  if (sites.length === 0) return query
  
  // Добавляем site: для первых 2 сайтов
  const siteQuery = sites.slice(0, 2).map(s => `site:${s}`).join(' OR ')
  return `${query} (${siteQuery})`
}

/**
 * Получение языков поиска для домена
 */
export function getSearchLanguages(domain: DomainType): string[] {
  return getDomainSourceConfig(domain).searchLanguages
}

/**
 * Получение минимального порога релевантности
 */
export function getMinRelevanceThreshold(domain: DomainType): number {
  return getDomainSourceConfig(domain).minRelevanceThreshold
}

/**
 * Получение максимального количества результатов
 */
export function getMaxResults(domain: DomainType): number {
  return getDomainSourceConfig(domain).maxResults
}
