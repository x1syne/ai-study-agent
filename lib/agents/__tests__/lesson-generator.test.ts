/**
 * 📚 LESSON GENERATOR TESTS
 * 
 * Тесты для генератора уроков
 */

import { describe, it, expect } from 'vitest'
import { 
  splitModuleIntoLessons, 
  extractKeyTerms, 
  calculateReadingTime 
} from '../lesson-generator'
import type { CourseModule } from '../types'

// ═══════════════════════════════════════════════════════════════
// 🔧 TEST DATA
// ═══════════════════════════════════════════════════════════════

const mockModule: CourseModule = {
  id: 'module-1',
  order: 1,
  name: 'Введение в Python',
  description: 'Основы языка Python',
  theoryPrompt: '',
  practicePrompt: '',
  keyTerms: ['переменная', 'функция', 'класс'],
  duration: 30,
  difficulty: 'beginner',
  contentType: 'theory'
}

const sampleMarkdown = `## Введение

Python — это высокоуровневый язык программирования. Он был создан Гвидо ван Россумом в 1991 году.

Python отличается простым и понятным синтаксисом. Это делает его идеальным для начинающих.

## Основные понятия

==Переменная== — это именованная область памяти для хранения данных. Переменные позволяют сохранять значения для последующего использования.

==Функция== — это блок кода, который выполняет определённую задачу. Функции помогают организовать код и избежать повторений.

\`\`\`python
# Пример переменной
name = "Python"
age = 30

# Пример функции
def greet(name):
    return f"Привет, {name}!"
\`\`\`

## Как это работает

Интерпретатор Python читает код построчно. Каждая строка выполняется последовательно.

При объявлении переменной Python автоматически определяет её тип. Это называется динамической типизацией.

## Примеры

**Пример 1: Простая программа**
\`\`\`python
print("Hello, World!")
\`\`\`

**Пример 2: Работа с переменными**
\`\`\`python
x = 10
y = 20
result = x + y  # 30
\`\`\`

## Частые ошибки

- ❌ Неправильно: забыть двоеточие после if
- ✅ Правильно: if condition:

## Итоги

- Python — простой и мощный язык
- Переменные хранят данные
- Функции организуют код
`

const shortMarkdown = `## Введение

Краткое введение в тему.

## Основные понятия

==Термин== — определение термина.
`

// ═══════════════════════════════════════════════════════════════
// 📝 SPLIT MODULE INTO LESSONS TESTS
// ═══════════════════════════════════════════════════════════════

describe('splitModuleIntoLessons', () => {
  it('should split module into lessons', () => {
    const lessons = splitModuleIntoLessons(mockModule, sampleMarkdown, 'programming')
    
    expect(lessons.length).toBeGreaterThanOrEqual(1)
    expect(lessons.length).toBeLessThanOrEqual(7)
  })
  
  it('should create lessons with correct structure', () => {
    const lessons = splitModuleIntoLessons(mockModule, sampleMarkdown, 'programming')
    
    lessons.forEach((lesson, index) => {
      expect(lesson.id).toContain(mockModule.id)
      expect(lesson.moduleId).toBe(mockModule.id)
      expect(lesson.order).toBe(index + 1)
      expect(lesson.title).toBeTruthy()
      expect(lesson.theoryMarkdown).toBeTruthy()
      expect(lesson.estimatedReadTime).toBeGreaterThanOrEqual(5)
      expect(lesson.estimatedReadTime).toBeLessThanOrEqual(15)
    })
  })
  
  it('should handle empty markdown', () => {
    const lessons = splitModuleIntoLessons(mockModule, '', 'programming')
    
    expect(lessons.length).toBe(1)
    expect(lessons[0].theoryMarkdown).toBe('')
  })
  
  it('should handle short markdown', () => {
    const lessons = splitModuleIntoLessons(mockModule, shortMarkdown, 'programming')
    
    expect(lessons.length).toBeGreaterThanOrEqual(1)
  })
  
  it('should extract key terms from lessons', () => {
    const lessons = splitModuleIntoLessons(mockModule, sampleMarkdown, 'programming')
    
    // At least one lesson should have key terms
    const hasKeyTerms = lessons.some(l => l.keyTerms.length > 0)
    expect(hasKeyTerms).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════
// 🔍 EXTRACT KEY TERMS TESTS
// ═══════════════════════════════════════════════════════════════

describe('extractKeyTerms', () => {
  it('should extract terms with ==term== markup', () => {
    const markdown = 'Это ==переменная== и ==функция== в Python.'
    const terms = extractKeyTerms(markdown)
    
    expect(terms.length).toBe(2)
    expect(terms.map(t => t.term)).toContain('переменная')
    expect(terms.map(t => t.term)).toContain('функция')
  })
  
  it('should not duplicate terms', () => {
    const markdown = '==термин== используется здесь и ==термин== используется там.'
    const terms = extractKeyTerms(markdown)
    
    expect(terms.length).toBe(1)
    expect(terms[0].term).toBe('термин')
  })
  
  it('should extract definition if available', () => {
    const markdown = '==Переменная== — это именованная область памяти.'
    const terms = extractKeyTerms(markdown)
    
    expect(terms.length).toBe(1)
    expect(terms[0].definition).toContain('именованная область памяти')
  })
  
  it('should handle markdown without terms', () => {
    const markdown = 'Обычный текст без выделенных терминов.'
    const terms = extractKeyTerms(markdown)
    
    expect(terms.length).toBe(0)
  })
  
  it('should extract terms from sample markdown', () => {
    const terms = extractKeyTerms(sampleMarkdown)
    
    expect(terms.length).toBeGreaterThanOrEqual(2)
    expect(terms.map(t => t.term.toLowerCase())).toContain('переменная')
    expect(terms.map(t => t.term.toLowerCase())).toContain('функция')
  })
})

// ═══════════════════════════════════════════════════════════════
// ⏱️ CALCULATE READING TIME TESTS
// ═══════════════════════════════════════════════════════════════

describe('calculateReadingTime', () => {
  it('should calculate reading time based on word count', () => {
    // 200 words per minute
    expect(calculateReadingTime(200)).toBe(1)
    expect(calculateReadingTime(400)).toBe(2)
    expect(calculateReadingTime(1000)).toBe(5)
  })
  
  it('should round up reading time', () => {
    expect(calculateReadingTime(250)).toBe(2) // 1.25 -> 2
    expect(calculateReadingTime(450)).toBe(3) // 2.25 -> 3
  })
  
  it('should handle zero words', () => {
    expect(calculateReadingTime(0)).toBe(0)
  })
})
