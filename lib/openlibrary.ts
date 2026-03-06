// Open Library API Integration - 100% бесплатно
// Документация: https://openlibrary.org/developers/api
// Используется как вспомогательный источник для книг и учебных материалов

export interface OpenLibraryBook {
  key: string
  title: string
  authors: string[]
  firstPublishYear?: number
  subjects?: string[]
  description?: string
  coverUrl?: string
}

export interface OpenLibrarySearchResult {
  books: OpenLibraryBook[]
  totalResults: number
  query: string
}

// Поиск книг на Open Library
export async function searchOpenLibrary(query: string, maxResults: number = 3): Promise<OpenLibrarySearchResult> {
  try {
    const encodedQuery = encodeURIComponent(query)
    const url = `https://openlibrary.org/search.json?q=${encodedQuery}&limit=${maxResults}&fields=key,title,author_name,first_publish_year,subject,cover_i`
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'AI-Study-Agent/1.0 (Educational Purpose)' }
    })
    
    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    const books: OpenLibraryBook[] = (data.docs || []).map((doc: any) => ({
      key: doc.key || '',
      title: doc.title || '',
      authors: doc.author_name || [],
      firstPublishYear: doc.first_publish_year,
      subjects: (doc.subject || []).slice(0, 5),
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : undefined
    }))
    
    return { books, totalResults: data.numFound || 0, query }
  } catch (error) {
    console.error('Open Library search error:', error)
    return { books: [], totalResults: 0, query }
  }
}

// Форматирование для AI контекста
export function formatBooksForContext(result: OpenLibrarySearchResult): string {
  if (result.books.length === 0) return ''
  
  let context = `\n📖 Рекомендуемые книги по теме "${result.query}":\n\n`
  
  for (const book of result.books) {
    context += `📚 "${book.title}"\n`
    if (book.authors.length > 0) {
      context += `   Авторы: ${book.authors.slice(0, 2).join(', ')}\n`
    }
    if (book.firstPublishYear) {
      context += `   Год: ${book.firstPublishYear}\n`
    }
    if (book.subjects && book.subjects.length > 0) {
      context += `   Темы: ${book.subjects.slice(0, 3).join(', ')}\n`
    }
    context += '\n'
  }
  
  return context
}

// Определяем, нужен ли поиск книг (для гуманитарных тем)
export function shouldSearchBooks(topic: string): boolean {
  const bookKeywords = [
    // Гуманитарные
    'история', 'литература', 'философия', 'психология', 'социология',
    'экономика', 'политика', 'культура', 'искусство', 'музыка',
    'религия', 'этика', 'право', 'педагогика', 'лингвистика',
    // Английские
    'history', 'literature', 'philosophy', 'psychology', 'sociology',
    'economics', 'politics', 'culture', 'art', 'music',
    // Учебные
    'учебник', 'книга', 'пособие', 'руководство', 'справочник',
    'теория', 'основы', 'введение', 'курс'
  ]
  
  const lowerTopic = topic.toLowerCase()
  return bookKeywords.some(keyword => lowerTopic.includes(keyword))
}

// Извлекаем ключевые слова для поиска книг
export function extractBookQuery(topic: string): string {
  const stopWords = ['что', 'как', 'где', 'это', 'такое', 'изучение', 'основы']
  
  const words = topic.toLowerCase()
    .replace(/[^\w\sа-яё]/gi, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word))
  
  return words.slice(0, 3).join(' ')
}

// Универсальная функция для получения книжного контекста
export async function getBookContext(topicName: string): Promise<string> {
  if (!shouldSearchBooks(topicName)) return ''
  
  const query = extractBookQuery(topicName)
  if (!query) return ''
  
  const result = await searchOpenLibrary(query, 2)
  return formatBooksForContext(result)
}
