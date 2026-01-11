/**
 * GitHub API Integration
 * Бесплатно: 60 req/hr без токена, 5000/hr с токеном
 * Документация: https://docs.github.com/en/rest
 */

import { withCache, cacheKey, CACHE_TTL } from './rag/cache'

// ==================== ТИПЫ ====================

export interface GitHubRepository {
  id: number
  name: string
  fullName: string
  description: string
  url: string
  stars: number
  language: string
  topics: string[]
  readme?: string
}

export interface GitHubCodeResult {
  name: string
  path: string
  repository: string
  url: string
  content?: string  // Base64 decoded
}

export interface GitHubSearchResult {
  repositories: GitHubRepository[]
  codeResults: GitHubCodeResult[]
  totalCount: number
  query: string
}

// ==================== УТИЛИТЫ ====================

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'AI-Study-Agent/1.0'
  }
  
  const token = process.env.GITHUB_TOKEN
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

/**
 * Декодирование Base64 контента
 */
function decodeBase64(content: string): string {
  try {
    return Buffer.from(content, 'base64').toString('utf-8')
  } catch {
    return content
  }
}

/**
 * Извлечение ключевой части README
 */
function extractReadmeHighlights(readme: string, maxLength: number = 1000): string {
  // Убираем badges и изображения
  let cleaned = readme
    .replace(/!\[.*?\]\(.*?\)/g, '')  // Изображения
    .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, '')  // Badge links
    .replace(/<!--[\s\S]*?-->/g, '')  // HTML комментарии
  
  // Ищем секции с примерами кода
  const codeBlocks = cleaned.match(/```[\s\S]*?```/g) || []
  const usefulCode = codeBlocks.slice(0, 2).join('\n\n')
  
  // Ищем секцию Usage/Example/Quick Start
  const usageMatch = cleaned.match(/#{1,3}\s*(Usage|Example|Quick Start|Getting Started|Installation)[\s\S]*?(?=#{1,3}\s|$)/i)
  const usageSection = usageMatch ? usageMatch[0].slice(0, 500) : ''
  
  // Берём первые параграфы (описание)
  const firstParagraphs = cleaned
    .split('\n\n')
    .filter(p => p.trim() && !p.startsWith('#') && p.length > 50)
    .slice(0, 2)
    .join('\n\n')
  
  const result = [firstParagraphs, usageSection, usefulCode]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, maxLength)
  
  return result
}

// ==================== API ФУНКЦИИ ====================

/**
 * Поиск репозиториев
 */
export async function searchRepositories(
  query: string,
  options: { language?: string; maxResults?: number; sort?: 'stars' | 'updated' } = {}
): Promise<GitHubRepository[]> {
  const { language, maxResults = 5, sort = 'stars' } = options
  
  const key = cacheKey('github-repos', query, language || '', String(maxResults))
  
  return withCache(key, async () => {
    try {
      let searchQuery = query
      if (language) {
        searchQuery += ` language:${language}`
      }
      
      const params = new URLSearchParams({
        q: searchQuery,
        sort,
        order: 'desc',
        per_page: String(maxResults)
      })
      
      const response = await fetch(
        `https://api.github.com/search/repositories?${params}`,
        { headers: getHeaders() }
      )
      
      if (!response.ok) {
        console.error('[GitHub] Search repos error:', response.status)
        return []
      }
      
      const data = await response.json()
      
      return (data.items || []).map((repo: any) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description || '',
        url: repo.html_url,
        stars: repo.stargazers_count,
        language: repo.language || '',
        topics: repo.topics || []
      }))
    } catch (error) {
      console.error('[GitHub] Search repos error:', error)
      return []
    }
  }, { ttl: CACHE_TTL.WEB_SEARCH })
}

/**
 * Получение README репозитория
 */
export async function getRepositoryReadme(
  owner: string,
  repo: string
): Promise<string | null> {
  const key = cacheKey('github-readme', owner, repo)
  
  return withCache(key, async () => {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/readme`,
        { headers: getHeaders() }
      )
      
      if (!response.ok) return null
      
      const data = await response.json()
      
      if (data.content) {
        const decoded = decodeBase64(data.content)
        return extractReadmeHighlights(decoded)
      }
      
      return null
    } catch (error) {
      console.error('[GitHub] Get README error:', error)
      return null
    }
  }, { ttl: CACHE_TTL.WEB_SEARCH })
}

/**
 * Поиск кода (требует токен для лучших результатов)
 */
export async function searchCode(
  query: string,
  options: { language?: string; maxResults?: number } = {}
): Promise<GitHubCodeResult[]> {
  const { language, maxResults = 5 } = options
  
  // Поиск кода требует аутентификацию для хороших результатов
  if (!process.env.GITHUB_TOKEN) {
    console.log('[GitHub] Code search requires GITHUB_TOKEN')
    return []
  }
  
  const key = cacheKey('github-code', query, language || '', String(maxResults))
  
  return withCache(key, async () => {
    try {
      let searchQuery = query
      if (language) {
        searchQuery += ` language:${language}`
      }
      
      const params = new URLSearchParams({
        q: searchQuery,
        per_page: String(maxResults)
      })
      
      const response = await fetch(
        `https://api.github.com/search/code?${params}`,
        { headers: getHeaders() }
      )
      
      if (!response.ok) {
        console.error('[GitHub] Search code error:', response.status)
        return []
      }
      
      const data = await response.json()
      
      return (data.items || []).map((item: any) => ({
        name: item.name,
        path: item.path,
        repository: item.repository?.full_name || '',
        url: item.html_url
      }))
    } catch (error) {
      console.error('[GitHub] Search code error:', error)
      return []
    }
  }, { ttl: CACHE_TTL.WEB_SEARCH })
}

// ==================== ФОРМАТИРОВАНИЕ ====================

/**
 * Форматирование для AI контекста
 */
export function formatGitHubForContext(result: GitHubSearchResult): string {
  if (result.repositories.length === 0) return ''
  
  let context = `\n🐙 GitHub репозитории по "${result.query}":\n\n`
  
  for (const repo of result.repositories) {
    context += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
    context += `📦 **${repo.fullName}** ⭐ ${repo.stars}\n`
    if (repo.description) {
      context += `   ${repo.description.slice(0, 150)}\n`
    }
    context += `   Язык: ${repo.language || 'N/A'} | ${repo.url}\n`
    if (repo.readme) {
      context += `\n   README:\n   ${repo.readme.slice(0, 300)}...\n`
    }
    context += '\n'
  }
  
  return context
}

/**
 * Форматирование для промпта (компактная версия)
 */
export function formatGitHubForPrompt(repos: GitHubRepository[]): string {
  if (repos.length === 0) return ''
  
  let prompt = '\n[GITHUB - примеры кода и проекты]\n'
  
  for (const repo of repos.slice(0, 3)) {
    prompt += `\n📦 ${repo.fullName} (⭐${repo.stars})\n`
    if (repo.description) {
      prompt += `${repo.description.slice(0, 100)}\n`
    }
    if (repo.readme) {
      prompt += `\nПример из README:\n${repo.readme.slice(0, 400)}\n`
    }
  }
  
  prompt += '\nИспользуй эти примеры для демонстрации реального кода.\n'
  
  return prompt
}

// ==================== ГЛАВНАЯ ФУНКЦИЯ ====================

/**
 * Получение контекста из GitHub для темы программирования
 */
export async function getGitHubContext(
  topic: string,
  options: { language?: string; includeReadme?: boolean; maxRepos?: number } = {}
): Promise<string> {
  const { language, includeReadme = true, maxRepos = 3 } = options
  
  // Определяем язык программирования из темы
  const detectedLanguage = language || detectLanguageFromTopic(topic)
  
  const repos = await searchRepositories(topic, {
    language: detectedLanguage,
    maxResults: maxRepos,
    sort: 'stars'
  })
  
  if (repos.length === 0) return ''
  
  // Получаем README для топовых репозиториев
  if (includeReadme) {
    const readmePromises = repos.slice(0, 2).map(async (repo) => {
      const [owner, name] = repo.fullName.split('/')
      const readme = await getRepositoryReadme(owner, name)
      if (readme) {
        repo.readme = readme
      }
    })
    
    await Promise.all(readmePromises)
  }
  
  return formatGitHubForPrompt(repos)
}

/**
 * Определение языка программирования из темы
 */
function detectLanguageFromTopic(topic: string): string | undefined {
  const topicLower = topic.toLowerCase()
  
  const languageMap: Record<string, string> = {
    'python': 'python',
    'django': 'python',
    'flask': 'python',
    'pandas': 'python',
    'numpy': 'python',
    'javascript': 'javascript',
    'react': 'javascript',
    'vue': 'javascript',
    'angular': 'typescript',
    'node': 'javascript',
    'typescript': 'typescript',
    'java': 'java',
    'spring': 'java',
    'kotlin': 'kotlin',
    'swift': 'swift',
    'go': 'go',
    'golang': 'go',
    'rust': 'rust',
    'c++': 'cpp',
    'cpp': 'cpp',
    'c#': 'csharp',
    'csharp': 'csharp',
    '.net': 'csharp',
    'php': 'php',
    'laravel': 'php',
    'ruby': 'ruby',
    'rails': 'ruby'
  }
  
  for (const [keyword, lang] of Object.entries(languageMap)) {
    if (topicLower.includes(keyword)) {
      return lang
    }
  }
  
  return undefined
}

/**
 * Проверка, нужен ли GitHub для темы
 */
export function shouldUseGitHub(topic: string): boolean {
  const programmingKeywords = [
    'программ', 'код', 'библиотек', 'фреймворк', 'api',
    'python', 'javascript', 'react', 'node', 'django',
    'spring', 'docker', 'kubernetes', 'git',
    'tutorial', 'example', 'implementation'
  ]
  
  const topicLower = topic.toLowerCase()
  return programmingKeywords.some(kw => topicLower.includes(kw))
}
