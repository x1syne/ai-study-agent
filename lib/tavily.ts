/**
 * 🔍 TAVILY SEARCH - RAG Integration
 * 
 * Tavily API для поиска образовательного контента
 * Free tier: 1000 queries/month
 * 
 * Используется для:
 * - Поиск лучших course outlines (Harvard, MIT, Coursera)
 * - Актуальная информация по теме
 * - Валидация контента против hallucinations
 */

import type { CourseOutlineSource, ArticleSource, RAGContext } from './agents/types'

// ═══════════════════════════════════════════════════════════════
// 🔧 CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const TAVILY_API_URL = 'https://api.tavily.com/search'

interface TavilySearchParams {
  query: string
  search_depth?: 'basic' | 'advanced'
  include_domains?: string[]
  exclude_domains?: string[]
  max_results?: number
  include_answer?: boolean
  include_raw_content?: boolean
}

interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
  raw_content?: string
}

interface TavilyResponse {
  query: string
  answer?: string
  results: TavilyResult[]
  response_time: number
}

// Educational domains to prioritize with quality scores
const EDUCATIONAL_DOMAINS_WITH_SCORES: Record<string, number> = {
  // Tier 1: Top Universities (highest priority)
  'harvard.edu': 1.0,
  'mit.edu': 1.0,
  'stanford.edu': 1.0,
  'berkeley.edu': 0.95,
  'caltech.edu': 0.95,
  'princeton.edu': 0.95,
  'yale.edu': 0.95,
  'ox.ac.uk': 0.95,
  'cam.ac.uk': 0.95,
  
  // Tier 2: Major MOOC Platforms
  'coursera.org': 0.9,
  'edx.org': 0.9,
  'udacity.com': 0.85,
  'khanacademy.org': 0.85,
  'brilliant.org': 0.85,
  
  // Tier 3: Official Documentation
  'developer.mozilla.org': 0.85,
  'docs.python.org': 0.85,
  'docs.microsoft.com': 0.8,
  'developer.apple.com': 0.8,
  'cloud.google.com': 0.8,
  'aws.amazon.com': 0.8,
  
  // Tier 4: Quality Educational Sites
  'freecodecamp.org': 0.75,
  'realpython.com': 0.75,
  'geeksforgeeks.org': 0.7,
  'w3schools.com': 0.65,
  'tutorialspoint.com': 0.6
}

// Legacy array for backward compatibility
const EDUCATIONAL_DOMAINS = Object.keys(EDUCATIONAL_DOMAINS_WITH_SCORES)

// ═══════════════════════════════════════════════════════════════
// 📊 USAGE TRACKING
// ═══════════════════════════════════════════════════════════════

interface TavilyUsage {
  queriesThisMonth: number
  lastReset: string
}

const tavilyUsage: TavilyUsage = {
  queriesThisMonth: 0,
  lastReset: new Date().toISOString().slice(0, 7) // YYYY-MM
}

function checkTavilyQuota(): boolean {
  const currentMonth = new Date().toISOString().slice(0, 7)
  
  if (tavilyUsage.lastReset !== currentMonth) {
    tavilyUsage.queriesThisMonth = 0
    tavilyUsage.lastReset = currentMonth
  }
  
  // Free tier: 1000 queries/month
  if (tavilyUsage.queriesThisMonth >= 950) {
    console.warn('[Tavily] ⚠️ Approaching monthly limit')
  }
  
  return tavilyUsage.queriesThisMonth < 1000
}

// ═══════════════════════════════════════════════════════════════
// 🔍 SEARCH FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Raw Tavily search
 */
async function searchTavily(params: TavilySearchParams): Promise<TavilyResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY
  
  if (!apiKey) {
    console.log('[Tavily] API key not set, skipping search')
    return null
  }
  
  if (!checkTavilyQuota()) {
    console.warn('[Tavily] Monthly quota exceeded')
    return null
  }
  
  try {
    const response = await fetch(TAVILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey,
        ...params
      })
    })
    
    if (!response.ok) {
      console.error('[Tavily] Search failed:', response.status)
      return null
    }
    
    tavilyUsage.queriesThisMonth++
    
    return await response.json()
  } catch (error) {
    console.error('[Tavily] Search error:', error)
    return null
  }
}

/**
 * Search for course outlines from top universities
 * Results are sorted by educational domain quality score
 */
export async function searchCourseOutlines(
  topic: string,
  maxResults: number = 5
): Promise<CourseOutlineSource[]> {
  const query = `best ${topic} course outline syllabus Harvard MIT Stanford 2024 2025`
  
  const response = await searchTavily({
    query,
    search_depth: 'advanced',
    include_domains: EDUCATIONAL_DOMAINS,
    max_results: maxResults * 2, // Request more to filter and sort
    include_answer: true
  })
  
  if (!response) return []
  
  const outlines: Array<CourseOutlineSource & { score: number }> = []
  
  for (const result of response.results) {
    // Extract source name from URL
    const urlObj = new URL(result.url)
    const hostname = urlObj.hostname.replace('www.', '')
    
    // Calculate quality score based on domain
    let domainScore = 0.5 // Default score for unknown domains
    for (const [domain, score] of Object.entries(EDUCATIONAL_DOMAINS_WITH_SCORES)) {
      if (hostname.includes(domain.split('.')[0])) {
        domainScore = score
        break
      }
    }
    
    // Combined score: domain quality + Tavily relevance
    const combinedScore = (domainScore * 0.6) + (result.score * 0.4)
    
    // Map to friendly names
    const sourceMap: Record<string, string> = {
      'harvard.edu': 'Harvard University',
      'mit.edu': 'MIT OpenCourseWare',
      'stanford.edu': 'Stanford University',
      'berkeley.edu': 'UC Berkeley',
      'coursera.org': 'Coursera',
      'edx.org': 'edX',
      'khanacademy.org': 'Khan Academy',
      'brilliant.org': 'Brilliant',
      'freecodecamp.org': 'freeCodeCamp',
      'realpython.com': 'Real Python',
      'developer.mozilla.org': 'MDN Web Docs'
    }
    
    let source = hostname
    for (const [domain, name] of Object.entries(sourceMap)) {
      if (hostname.includes(domain.split('.')[0])) {
        source = name
        break
      }
    }
    
    // Extract modules from content (simple heuristic)
    const modules = extractModulesFromContent(result.content)
    
    outlines.push({
      source,
      title: result.title,
      modules,
      url: result.url,
      score: combinedScore
    })
  }
  
  // Sort by combined score (highest first) and take top results
  return outlines
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ score, ...outline }) => outline)
}

/**
 * Search for educational articles on topic
 * Results are sorted by educational domain quality score
 */
export async function searchEducationalArticles(
  topic: string,
  maxResults: number = 5
): Promise<ArticleSource[]> {
  const query = `${topic} tutorial guide explanation examples`
  
  const response = await searchTavily({
    query,
    search_depth: 'basic',
    max_results: maxResults * 2, // Request more to filter and sort
    include_answer: false
  })
  
  if (!response) return []
  
  // Score and sort results
  const scoredResults = response.results.map(r => {
    const hostname = new URL(r.url).hostname.replace('www.', '')
    
    // Calculate domain quality score
    let domainScore = 0.5
    for (const [domain, score] of Object.entries(EDUCATIONAL_DOMAINS_WITH_SCORES)) {
      if (hostname.includes(domain.split('.')[0])) {
        domainScore = score
        break
      }
    }
    
    // Combined score
    const combinedScore = (domainScore * 0.5) + (r.score * 0.5)
    
    return {
      title: r.title,
      snippet: r.content.slice(0, 500),
      url: r.url,
      relevance: combinedScore
    }
  })
  
  // Sort by combined relevance and take top results
  return scoredResults
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxResults)
}

/**
 * Search for practice problems and exercises
 */
export async function searchPracticeProblems(
  topic: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<ArticleSource[]> {
  const difficultyTerms = {
    easy: 'beginner basic simple',
    medium: 'intermediate practice exercises',
    hard: 'advanced challenging problems'
  }
  
  const query = `${topic} ${difficultyTerms[difficulty]} exercises problems Codewars LeetCode`
  
  const response = await searchTavily({
    query,
    search_depth: 'basic',
    include_domains: [
      'codewars.com',
      'leetcode.com',
      'hackerrank.com',
      'exercism.org',
      'geeksforgeeks.org',
      'realpython.com'
    ],
    max_results: 5
  })
  
  if (!response) return []
  
  return response.results.map(r => ({
    title: r.title,
    snippet: r.content.slice(0, 500),
    url: r.url,
    relevance: r.score
  }))
}

/**
 * Get comprehensive RAG context for a topic
 */
export async function getEnhancedRAGContext(
  topic: string,
  topicType: string
): Promise<RAGContext> {
  console.log(`[Tavily] Getting RAG context for "${topic}" (${topicType})`)
  
  // Parallel searches
  const [outlines, articles, practiceProblems] = await Promise.all([
    searchCourseOutlines(topic, 3),
    searchEducationalArticles(topic, 5),
    searchPracticeProblems(topic, 'medium')
  ])
  
  // Extract key facts from articles
  const keyFacts = extractKeyFacts(articles)
  
  // Suggest structure based on outlines
  const suggestedStructure = suggestStructureFromOutlines(outlines, topicType)
  
  const context: RAGContext = {
    courseOutlines: outlines,
    articles: [...articles, ...practiceProblems],
    keyFacts,
    suggestedStructure
  }
  
  console.log(`[Tavily] RAG context: ${outlines.length} outlines, ${articles.length} articles`)
  
  return context
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Extract module names from content using heuristics
 */
function extractModulesFromContent(content: string): string[] {
  const modules: string[] = []
  
  // Look for numbered lists
  const numberedPattern = /(?:^|\n)\s*(?:\d+[\.\)]\s*|[-•]\s*)([A-Z][^.\n]{5,50})/g
  let match
  
  while ((match = numberedPattern.exec(content)) !== null) {
    const module = match[1].trim()
    if (module && !modules.includes(module)) {
      modules.push(module)
    }
  }
  
  // Look for section headers
  const headerPattern = /(?:Module|Chapter|Unit|Lesson|Week)\s*\d*[:\s]+([^.\n]{5,50})/gi
  
  while ((match = headerPattern.exec(content)) !== null) {
    const module = match[1].trim()
    if (module && !modules.includes(module)) {
      modules.push(module)
    }
  }
  
  return modules.slice(0, 10)
}

/**
 * Extract key facts from articles
 */
function extractKeyFacts(articles: ArticleSource[]): string[] {
  const facts: string[] = []
  
  for (const article of articles) {
    // Extract sentences that look like facts
    const sentences = article.snippet.split(/[.!?]+/)
    
    for (const sentence of sentences) {
      const trimmed = sentence.trim()
      
      // Heuristics for fact-like sentences
      if (
        trimmed.length > 30 &&
        trimmed.length < 200 &&
        !trimmed.includes('click') &&
        !trimmed.includes('subscribe') &&
        !trimmed.includes('sign up') &&
        (
          trimmed.includes(' is ') ||
          trimmed.includes(' are ') ||
          trimmed.includes(' was ') ||
          trimmed.includes(' were ') ||
          /\d/.test(trimmed)
        )
      ) {
        facts.push(trimmed)
      }
    }
  }
  
  // Deduplicate and limit
  return Array.from(new Set(facts)).slice(0, 10)
}

/**
 * Suggest course structure based on found outlines
 */
function suggestStructureFromOutlines(
  outlines: CourseOutlineSource[],
  topicType: string
): string[] {
  // Collect all modules
  const allModules: string[] = []
  
  for (const outline of outlines) {
    allModules.push(...outline.modules)
  }
  
  if (allModules.length === 0) {
    // Default structure based on topic type
    return getDefaultStructure(topicType)
  }
  
  // Count frequency of similar modules
  const moduleFrequency: Record<string, number> = {}
  
  for (const module of allModules) {
    const normalized = module.toLowerCase()
    
    // Find similar existing module
    let found = false
    const keys = Object.keys(moduleFrequency)
    for (const key of keys) {
      if (
        key.includes(normalized.slice(0, 10)) ||
        normalized.includes(key.slice(0, 10))
      ) {
        moduleFrequency[key] = (moduleFrequency[key] || 0) + 1
        found = true
        break
      }
    }
    
    if (!found) {
      moduleFrequency[normalized] = 1
    }
  }
  
  // Sort by frequency and return top modules
  return Object.entries(moduleFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([module]) => module.charAt(0).toUpperCase() + module.slice(1))
}

/**
 * Default structure templates by topic type
 */
function getDefaultStructure(topicType: string): string[] {
  const structures: Record<string, string[]> = {
    programming: [
      'Introduction and Setup',
      'Basic Syntax and Concepts',
      'Data Structures',
      'Control Flow',
      'Functions and Modules',
      'Object-Oriented Programming',
      'Error Handling',
      'Best Practices and Projects'
    ],
    scientific: [
      'Introduction and History',
      'Fundamental Concepts',
      'Mathematical Framework',
      'Key Principles',
      'Applications',
      'Experiments and Demonstrations',
      'Advanced Topics',
      'Current Research'
    ],
    creative: [
      'Introduction and Inspiration',
      'Basic Techniques',
      'Tools and Materials',
      'Core Skills',
      'Style Development',
      'Projects and Practice',
      'Critique and Improvement',
      'Portfolio Building'
    ],
    practical: [
      'Getting Started',
      'Essential Equipment',
      'Basic Techniques',
      'Step-by-Step Guides',
      'Common Mistakes',
      'Advanced Techniques',
      'Tips and Tricks',
      'Practice Projects'
    ],
    business: [
      'Overview and Context',
      'Key Concepts',
      'Frameworks and Models',
      'Strategy',
      'Implementation',
      'Case Studies',
      'Metrics and Analysis',
      'Best Practices'
    ],
    humanities: [
      'Historical Context',
      'Key Figures and Ideas',
      'Major Themes',
      'Analysis Methods',
      'Primary Sources',
      'Debates and Perspectives',
      'Modern Relevance',
      'Further Study'
    ],
    technical: [
      'Fundamentals',
      'Components and Systems',
      'Design Principles',
      'Implementation',
      'Testing and Validation',
      'Troubleshooting',
      'Optimization',
      'Real-world Applications'
    ]
  }
  
  return structures[topicType] || structures.programming
}

// ═══════════════════════════════════════════════════════════════
// 📊 EXPORTS
// ═══════════════════════════════════════════════════════════════

export function getTavilyUsage(): TavilyUsage {
  return { ...tavilyUsage }
}

/**
 * Get quality score for a domain
 * Higher score = more authoritative educational source
 */
export function getDomainQualityScore(url: string): number {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    
    for (const [domain, score] of Object.entries(EDUCATIONAL_DOMAINS_WITH_SCORES)) {
      if (hostname.includes(domain.split('.')[0])) {
        return score
      }
    }
    
    return 0.5 // Default score for unknown domains
  } catch {
    return 0.5
  }
}

/**
 * Check if URL is from a prioritized educational domain
 */
export function isEducationalDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    
    return EDUCATIONAL_DOMAINS.some(domain => 
      hostname.includes(domain.split('.')[0])
    )
  } catch {
    return false
  }
}

/**
 * Get list of prioritized educational domains
 */
export function getEducationalDomains(): string[] {
  return [...EDUCATIONAL_DOMAINS]
}

/**
 * Get educational domains with their quality scores
 */
export function getEducationalDomainsWithScores(): Record<string, number> {
  return { ...EDUCATIONAL_DOMAINS_WITH_SCORES }
}
