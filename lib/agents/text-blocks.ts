/**
 * 📝 TEXT BLOCK GENERATOR
 * 
 * Разбивает теоретический контент на текстовые блоки (max 150 слов)
 * и назначает каждому блоку визуальный элемент.
 */

import type {
  TopicType,
  VisualTheme,
  TextBlock,
  AccompanyingVisual,
  AccompanyingVisualType,
  TextBlockInteractive,
  TextBlockInteractiveType
} from './types'

// ═══════════════════════════════════════════════════════════════
// 🎯 CONSTANTS
// ═══════════════════════════════════════════════════════════════

/**
 * Максимальное количество слов в блоке
 */
export const MAX_WORDS_PER_BLOCK = 150

/**
 * Ключевые слова для определения типа визуала
 * Порядок важен - более специфичные проверяются первыми
 */
const VISUAL_TYPE_KEYWORDS: Record<AccompanyingVisualType, string[]> = {
  diagram: ['процесс', 'алгоритм', 'шаги', 'этапы', 'последовательность', 'схема', 'структура'],
  photo: ['реальн', 'практик', 'применени', 'использовани', 'в жизни'],
  illustration: ['пример', 'например', 'рассмотрим', 'представьте', 'допустим'],
  icon: ['определение', 'термин', 'понятие', 'означает', 'называется']
}

/**
 * Иконки по типу темы
 */
const TOPIC_ICONS: Record<TopicType, string[]> = {
  programming: ['Code', 'Terminal', 'Braces', 'FileCode', 'GitBranch'],
  scientific: ['Atom', 'Flask', 'Microscope', 'Calculator', 'Brain'],
  creative: ['Palette', 'Brush', 'Sparkles', 'Lightbulb', 'Wand'],
  practical: ['Wrench', 'Hammer', 'CheckSquare', 'Target', 'Clock'],
  business: ['TrendingUp', 'PieChart', 'Briefcase', 'DollarSign', 'Users'],
  humanities: ['BookOpen', 'Globe', 'MessageCircle', 'Feather', 'History'],
  technical: ['Cpu', 'Settings', 'Zap', 'Shield', 'Server']
}

/**
 * Стили описания по визуальной теме
 */
const THEME_STYLES: Record<VisualTheme, string> = {
  'minimalist-illustrations': 'простая минималистичная иллюстрация, flat design',
  'data-driven-infographics': 'информативная инфографика с данными',
  'animated-diagrams': 'детальная анимированная диаграмма'
}

// ═══════════════════════════════════════════════════════════════
// 🔧 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Подсчитывает количество слов в тексте
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Разбивает текст на предложения
 */
function splitIntoSentences(text: string): string[] {
  // Разбиваем по точкам, восклицательным и вопросительным знакам
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Определяет тип визуала по содержимому текста
 * Проверяет в порядке: diagram → photo → illustration → icon (default)
 */
export function determineVisualType(text: string): AccompanyingVisualType {
  const lowerText = text.toLowerCase()
  
  // Проверяем в определённом порядке (более специфичные первыми)
  const checkOrder: AccompanyingVisualType[] = ['diagram', 'photo', 'illustration', 'icon']
  
  for (const type of checkOrder) {
    const keywords = VISUAL_TYPE_KEYWORDS[type]
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return type
    }
  }
  
  // По умолчанию - иконка
  return 'icon'
}

/**
 * Генерирует описание для визуала
 */
function generateVisualDescription(
  text: string,
  visualType: AccompanyingVisualType,
  topicType: TopicType,
  visualTheme: VisualTheme
): string {
  const style = THEME_STYLES[visualTheme]
  
  // Извлекаем ключевые слова из текста (первые 5 существительных/глаголов)
  const words = text.split(/\s+/).slice(0, 20).join(' ')
  
  switch (visualType) {
    case 'icon':
      return `Иконка для концепции: ${words.substring(0, 50)}...`
    case 'illustration':
      return `${style}, иллюстрирующая: ${words.substring(0, 100)}...`
    case 'photo':
      return `Реалистичное фото, демонстрирующее: ${words.substring(0, 100)}...`
    case 'diagram':
      return `${style}, показывающая структуру/процесс: ${words.substring(0, 100)}...`
    default:
      return `Визуальный элемент для: ${words.substring(0, 100)}...`
  }
}

/**
 * Выбирает иконку для блока
 */
function selectIcon(topicType: TopicType, blockIndex: number): string {
  const icons = TOPIC_ICONS[topicType]
  return icons[blockIndex % icons.length]
}

/**
 * Определяет, нужен ли интерактивный элемент
 */
function shouldHaveInteractive(text: string, blockIndex: number): boolean {
  // Каждый 3-й блок получает интерактивный элемент
  // Или если текст содержит ключевые слова
  const hasKeywords = /важно|запомните|обратите внимание|ключевой|главное/i.test(text)
  return hasKeywords || blockIndex % 3 === 2
}

/**
 * Генерирует интерактивный элемент
 */
function generateInteractiveElement(
  text: string,
  blockIndex: number
): TextBlockInteractive | undefined {
  if (!shouldHaveInteractive(text, blockIndex)) {
    return undefined
  }
  
  // Выбираем тип интерактива
  const types: TextBlockInteractiveType[] = ['toggle_detail', 'flip_card', 'scratch_to_reveal']
  const type = types[blockIndex % types.length]
  
  // Генерируем скрытый контент
  const hiddenContent = generateHiddenContent(text, type)
  
  return {
    type,
    content: hiddenContent
  }
}

/**
 * Генерирует скрытый контент для интерактивного элемента
 */
function generateHiddenContent(text: string, type: TextBlockInteractiveType): string {
  switch (type) {
    case 'toggle_detail':
      return `📚 Дополнительная информация: Этот раздел расширяет понимание основной концепции.`
    case 'flip_card':
      return `💡 Ключевой вывод: ${text.split('.')[0]}.`
    case 'scratch_to_reveal':
      return `🎯 Проверьте себя: Можете ли вы объяснить эту концепцию своими словами?`
    default:
      return `Дополнительная информация`
  }
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Разбивает markdown на текстовые блоки (max 150 слов)
 */
export function splitIntoTextBlocks(
  markdown: string,
  maxWords: number = MAX_WORDS_PER_BLOCK
): string[] {
  const sentences = splitIntoSentences(markdown)
  const blocks: string[] = []
  let currentBlock: string[] = []
  let currentWordCount = 0
  
  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence)
    
    // Если предложение само по себе больше лимита, разбиваем его
    if (sentenceWords > maxWords) {
      // Сначала сохраняем текущий блок
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join(' '))
        currentBlock = []
        currentWordCount = 0
      }
      
      // Разбиваем длинное предложение по словам
      const words = sentence.split(/\s+/)
      let tempBlock: string[] = []
      let tempCount = 0
      
      for (const word of words) {
        if (tempCount + 1 > maxWords) {
          blocks.push(tempBlock.join(' '))
          tempBlock = [word]
          tempCount = 1
        } else {
          tempBlock.push(word)
          tempCount++
        }
      }
      
      if (tempBlock.length > 0) {
        currentBlock = tempBlock
        currentWordCount = tempCount
      }
      continue
    }
    
    // Если добавление предложения превысит лимит, начинаем новый блок
    if (currentWordCount + sentenceWords > maxWords && currentBlock.length > 0) {
      blocks.push(currentBlock.join(' '))
      currentBlock = [sentence]
      currentWordCount = sentenceWords
    } else {
      currentBlock.push(sentence)
      currentWordCount += sentenceWords
    }
  }
  
  // Добавляем последний блок
  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join(' '))
  }
  
  return blocks
}

/**
 * Назначает визуальный элемент текстовому блоку
 */
export function assignVisualToBlock(
  text: string,
  topicType: TopicType,
  visualTheme: VisualTheme,
  blockIndex: number
): AccompanyingVisual {
  const visualType = determineVisualType(text)
  
  const visual: AccompanyingVisual = {
    type: visualType,
    description: generateVisualDescription(text, visualType, topicType, visualTheme)
  }
  
  // Добавляем имя иконки для типа icon
  if (visualType === 'icon') {
    visual.iconName = selectIcon(topicType, blockIndex)
  }
  
  return visual
}

/**
 * Генерирует текстовые блоки с визуальными элементами
 */
export function generateTextBlocks(
  markdown: string,
  topicType: TopicType,
  visualTheme: VisualTheme,
  maxWords: number = MAX_WORDS_PER_BLOCK
): TextBlock[] {
  const textChunks = splitIntoTextBlocks(markdown, maxWords)
  
  return textChunks.map((text, index) => ({
    text,
    accompanyingVisual: assignVisualToBlock(text, topicType, visualTheme, index),
    interactiveElement: generateInteractiveElement(text, index)
  }))
}

/**
 * Валидирует текстовый блок
 */
export function validateTextBlock(block: TextBlock): boolean {
  const validVisualTypes: AccompanyingVisualType[] = ['icon', 'illustration', 'photo', 'diagram']
  
  return (
    countWords(block.text) <= MAX_WORDS_PER_BLOCK &&
    validVisualTypes.includes(block.accompanyingVisual.type) &&
    block.accompanyingVisual.description.length > 0
  )
}

/**
 * Валидирует массив текстовых блоков
 */
export function validateTextBlocks(blocks: TextBlock[]): boolean {
  return blocks.every(validateTextBlock)
}
