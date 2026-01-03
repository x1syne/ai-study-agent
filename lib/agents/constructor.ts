/**
 * 🏗️ CONSTRUCTOR AGENT - Course Structure Builder
 * 
 * Второй агент в цепочке: Analyst → Constructor → Generator
 * 
 * Задачи:
 * 1. Построение JSON структуры курса на основе анализа
 * 2. Адаптация под тип темы (programming/scientific/creative/etc.)
 * 3. Генерация промптов для теории и практики каждого модуля
 * 4. Использование RAG данных для структуры
 * 5. Генерация визуальной идентичности и спецификаций модулей
 * 
 * Выход: CourseStructure или VisualCourseStructure с 5-10 модулями
 */

import { callLLMJson } from '../llm'
import { formatRAGContextForPrompt, getTopicTypeDescription } from './analyst'
import { generateVisualIdentity } from './visual-identity'
import { generateModuleVisualSpec } from './visual-spec'
import { splitModuleIntoLessons } from './lesson-generator'
import type {
  TopicAnalysisResult,
  CourseStructure,
  CourseModule,
  TopicType,
  DifficultyLevel,
  ModuleContentType,
  VisualCourseStructure,
  VisualModule,
  InteractivityLevel,
  CourseStructureWithLessons,
  ModuleWithLessons,
  Lesson
} from './types'

// ═══════════════════════════════════════════════════════════════
// 🎯 MODULE TEMPLATES BY TOPIC TYPE
// ═══════════════════════════════════════════════════════════════

interface ModuleTemplate {
  name: string
  description: string
  contentType: ModuleContentType
  durationMultiplier: number
}

const MODULE_TEMPLATES: Record<TopicType, ModuleTemplate[]> = {
  programming: [
    { name: 'Введение и настройка среды', description: 'Зачем это нужно, установка инструментов', contentType: 'theory', durationMultiplier: 0.8 },
    { name: 'Базовый синтаксис', description: 'Основные конструкции языка/фреймворка', contentType: 'hands_on', durationMultiplier: 1.2 },
    { name: 'Ключевые концепции', description: 'Главные идеи и паттерны', contentType: 'theory', durationMultiplier: 1.0 },
    { name: 'Практика: простые задачи', description: 'Закрепление на easy задачах', contentType: 'problem_solving', durationMultiplier: 1.5 },
    { name: 'Продвинутые техники', description: 'Углублённое изучение', contentType: 'theory', durationMultiplier: 1.0 },
    { name: 'Практика: средние задачи', description: 'Medium уровень сложности', contentType: 'problem_solving', durationMultiplier: 1.5 },
    { name: 'Best practices', description: 'Лучшие практики и паттерны', contentType: 'theory', durationMultiplier: 0.8 },
    { name: 'Мини-проект', description: 'Применение всех знаний', contentType: 'project', durationMultiplier: 2.0 }
  ],
  
  scientific: [
    { name: 'Введение и история', description: 'Контекст и значение темы', contentType: 'theory', durationMultiplier: 0.8 },
    { name: 'Базовые понятия', description: 'Определения и терминология', contentType: 'theory', durationMultiplier: 1.0 },
    { name: 'Математический аппарат', description: 'Формулы и уравнения', contentType: 'theory', durationMultiplier: 1.2 },
    { name: 'Решение задач: базовый уровень', description: 'Простые расчёты', contentType: 'problem_solving', durationMultiplier: 1.5 },
    { name: 'Углублённая теория', description: 'Сложные концепции', contentType: 'theory', durationMultiplier: 1.0 },
    { name: 'Решение задач: продвинутый уровень', description: 'Комплексные задачи', contentType: 'problem_solving', durationMultiplier: 1.5 },
    { name: 'Применение в реальном мире', description: 'Практические примеры', contentType: 'theory', durationMultiplier: 0.8 },
    { name: 'Итоговый тест', description: 'Проверка знаний', contentType: 'review', durationMultiplier: 1.0 }
  ],
  
  creative: [
    { name: 'Вдохновение и примеры', description: 'Галерея лучших работ', contentType: 'theory', durationMultiplier: 0.8 },
    { name: 'Базовые инструменты', description: 'Знакомство с инструментами', contentType: 'hands_on', durationMultiplier: 1.0 },
    { name: 'Основные техники', description: 'Фундаментальные приёмы', contentType: 'hands_on', durationMultiplier: 1.2 },
    { name: 'Практика: копирование мастеров', description: 'Учимся через имитацию', contentType: 'project', durationMultiplier: 1.5 },
    { name: 'Развитие стиля', description: 'Поиск своего голоса', contentType: 'theory', durationMultiplier: 1.0 },
    { name: 'Продвинутые техники', description: 'Сложные приёмы', contentType: 'hands_on', durationMultiplier: 1.2 },
    { name: 'Творческий проект', description: 'Создание своей работы', contentType: 'project', durationMultiplier: 2.0 },
    { name: 'Критика и улучшение', description: 'Анализ и доработка', contentType: 'review', durationMultiplier: 0.8 }
  ],
  
  practical: [
    { name: 'Обзор и подготовка', description: 'Что понадобится', contentType: 'theory', durationMultiplier: 0.6 },
    { name: 'Базовые навыки', description: 'Первые шаги', contentType: 'hands_on', durationMultiplier: 1.0 },
    { name: 'Пошаговая инструкция: простое', description: 'Лёгкий уровень', contentType: 'hands_on', durationMultiplier: 1.2 },
    { name: 'Типичные ошибки', description: 'Чего избегать', contentType: 'theory', durationMultiplier: 0.8 },
    { name: 'Пошаговая инструкция: среднее', description: 'Средний уровень', contentType: 'hands_on', durationMultiplier: 1.5 },
    { name: 'Советы профессионалов', description: 'Лайфхаки и трюки', contentType: 'theory', durationMultiplier: 0.8 },
    { name: 'Сложный проект', description: 'Комплексная задача', contentType: 'project', durationMultiplier: 2.0 },
    { name: 'Чек-лист мастерства', description: 'Проверка навыков', contentType: 'review', durationMultiplier: 0.6 }
  ],
  
  business: [
    { name: 'Введение и контекст', description: 'Зачем это бизнесу', contentType: 'theory', durationMultiplier: 0.8 },
    { name: 'Ключевые концепции', description: 'Основные понятия', contentType: 'theory', durationMultiplier: 1.0 },
    { name: 'Фреймворки и модели', description: 'Инструменты анализа', contentType: 'theory', durationMultiplier: 1.2 },
    { name: 'Кейс-стади: успешные примеры', description: 'Разбор реальных кейсов', contentType: 'problem_solving', durationMultiplier: 1.5 },
    { name: 'Практические инструменты', description: 'Шаблоны и чек-листы', contentType: 'hands_on', durationMultiplier: 1.0 },
    { name: 'Кейс-стади: ошибки', description: 'Учимся на чужих ошибках', contentType: 'problem_solving', durationMultiplier: 1.2 },
    { name: 'Применение к своему проекту', description: 'Практика на своём примере', contentType: 'project', durationMultiplier: 1.5 },
    { name: 'Итоги и план действий', description: 'Что делать дальше', contentType: 'review', durationMultiplier: 0.6 }
  ],
  
  humanities: [
    { name: 'Исторический контекст', description: 'Как мы пришли к этому', contentType: 'theory', durationMultiplier: 1.0 },
    { name: 'Ключевые фигуры и идеи', description: 'Главные мыслители', contentType: 'theory', durationMultiplier: 1.2 },
    { name: 'Основные концепции', description: 'Центральные понятия', contentType: 'theory', durationMultiplier: 1.0 },
    { name: 'Анализ первоисточников', description: 'Работа с текстами', contentType: 'problem_solving', durationMultiplier: 1.5 },
    { name: 'Разные точки зрения', description: 'Дебаты и дискуссии', contentType: 'theory', durationMultiplier: 1.0 },
    { name: 'Современное значение', description: 'Актуальность сегодня', contentType: 'theory', durationMultiplier: 0.8 },
    { name: 'Эссе/исследование', description: 'Письменная работа', contentType: 'project', durationMultiplier: 1.5 },
    { name: 'Итоговая дискуссия', description: 'Обсуждение и выводы', contentType: 'review', durationMultiplier: 0.8 }
  ],
  
  technical: [
    { name: 'Основы и принципы', description: 'Фундаментальные понятия', contentType: 'theory', durationMultiplier: 1.0 },
    { name: 'Компоненты и системы', description: 'Из чего состоит', contentType: 'theory', durationMultiplier: 1.2 },
    { name: 'Расчёты и проектирование', description: 'Инженерные расчёты', contentType: 'problem_solving', durationMultiplier: 1.5 },
    { name: 'Практика: сборка/настройка', description: 'Hands-on работа', contentType: 'hands_on', durationMultiplier: 1.5 },
    { name: 'Диагностика и отладка', description: 'Поиск проблем', contentType: 'problem_solving', durationMultiplier: 1.2 },
    { name: 'Оптимизация', description: 'Улучшение характеристик', contentType: 'theory', durationMultiplier: 1.0 },
    { name: 'Проект', description: 'Комплексная задача', contentType: 'project', durationMultiplier: 2.0 },
    { name: 'Документация и стандарты', description: 'Оформление работы', contentType: 'review', durationMultiplier: 0.6 }
  ]
}

// ═══════════════════════════════════════════════════════════════
// 🧠 LLM STRUCTURE GENERATION
// ═══════════════════════════════════════════════════════════════

interface LLMCourseStructure {
  title: string
  subtitle: string
  description: string
  objectives: string[]
  modules: Array<{
    name: string
    description: string
    keyTerms: string[]
    difficulty: DifficultyLevel
  }>
}

/**
 * Generate course structure using LLM with RAG context
 */
async function generateStructureWithLLM(
  analysis: TopicAnalysisResult
): Promise<LLMCourseStructure> {
  const ragContext = formatRAGContextForPrompt(analysis.ragContext)
  const typeDescription = getTopicTypeDescription(analysis.type)
  
  const systemPrompt = `Ты — архитектор образовательных курсов уровня Harvard/MIT.
Создаёшь структуры курсов, которые:
- Логично выстроены от простого к сложному
- Адаптированы под тип темы
- Включают практику на каждом этапе
- Используют лучшие практики из топовых университетов

ТИП ТЕМЫ: ${analysis.type}
${typeDescription}

${ragContext}

Отвечай ТОЛЬКО валидным JSON.`

  const userPrompt = `Создай структуру курса по теме: "${analysis.normalizedTopic}"

ВХОДНЫЕ ДАННЫЕ:
- Ключевые концепции: ${analysis.keyConcepts.join(', ')}
- Сложность: ${analysis.difficulty}
- Prerequisites: ${analysis.prerequisites.join(', ') || 'нет'}
- Рекомендуемые источники: ${analysis.recommendedSources.join(', ') || 'общие'}

ТРЕБОВАНИЯ:
1. 5-10 модулей
2. Каждый модуль логически связан с предыдущим
3. Прогрессия сложности: easy → medium → hard
4. Баланс теории и практики
5. Адаптация под тип "${analysis.type}"

Верни JSON:
{
  "title": "Название курса",
  "subtitle": "Подзаголовок",
  "description": "Описание курса (2-3 предложения)",
  "objectives": ["Цель 1", "Цель 2", "Цель 3", "Цель 4"],
  "modules": [
    {
      "name": "Название модуля",
      "description": "Описание (1-2 предложения)",
      "keyTerms": ["термин1", "термин2"],
      "difficulty": "beginner|intermediate|advanced"
    }
  ]
}`

  try {
    const { data } = await callLLMJson<LLMCourseStructure>(
      systemPrompt,
      userPrompt,
      { temperature: 0.5, maxTokens: 2000 }
    )
    
    return data
  } catch (error) {
    console.error('[Constructor] LLM structure generation failed:', error)
    
    // Fallback to template-based structure
    return generateFallbackStructure(analysis)
  }
}

/**
 * Generate fallback structure from templates
 */
function generateFallbackStructure(analysis: TopicAnalysisResult): LLMCourseStructure {
  const templates = MODULE_TEMPLATES[analysis.type]
  
  return {
    title: `Курс: ${analysis.normalizedTopic}`,
    subtitle: `Полное руководство по ${analysis.normalizedTopic}`,
    description: `Изучите ${analysis.normalizedTopic} от основ до продвинутого уровня. Курс включает теорию, практику и проекты.`,
    objectives: [
      `Понять основы ${analysis.normalizedTopic}`,
      'Освоить ключевые концепции и техники',
      'Применить знания на практике',
      'Создать собственный проект'
    ],
    modules: templates.slice(0, 8).map((t, i) => ({
      name: t.name,
      description: t.description,
      keyTerms: analysis.keyConcepts.slice(i, i + 2),
      difficulty: i < 3 ? 'beginner' : i < 6 ? 'intermediate' : 'advanced' as DifficultyLevel
    }))
  }
}

// ═══════════════════════════════════════════════════════════════
// 📝 PROMPT GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate theory prompt for a module
 */
function generateTheoryPrompt(
  module: { name: string; description: string; keyTerms: string[] },
  analysis: TopicAnalysisResult,
  moduleIndex: number,
  totalModules: number
): string {
  const typeDescription = getTopicTypeDescription(analysis.type)
  const position = moduleIndex === 0 ? 'первый' : 
                   moduleIndex === totalModules - 1 ? 'последний' : 
                   `${moduleIndex + 1}-й из ${totalModules}`
  
  let prompt = `Напиши теоретический материал для модуля "${module.name}".

КОНТЕКСТ:
- Курс: ${analysis.normalizedTopic}
- Это ${position} модуль курса
- Описание модуля: ${module.description}
- Ключевые термины: ${module.keyTerms.join(', ')}
- Тип контента: ${typeDescription}

ТРЕБОВАНИЯ К КОНТЕНТУ:
1. Стиль Harvard/MIT — профессионально, но доступно
2. Storytelling с аналогиями из реальной жизни
3. Длина: 800-1500 слов
4. Структура с подзаголовками (##, ###)
5. Выделение ключевых терминов **жирным**
6. Примеры из индустрии`

  // Type-specific additions
  if (analysis.type === 'programming') {
    prompt += `

СПЕЦИФИКА ПРОГРАММИРОВАНИЯ:
- Включи примеры кода в \`\`\`python блоках
- Объясни каждую строку кода
- Покажи вывод программы
- Добавь комментарии в коде`
  } else if (analysis.type === 'scientific') {
    prompt += `

СПЕЦИФИКА ТОЧНЫХ НАУК:
- Формулы в блоках цитат (> формула)
- Используй символы: ₀₁₂₃₄₅₆₇₈₉ ⁰¹²³⁴⁵⁶⁷⁸⁹ α β γ δ θ λ π × ÷ ± ≈ ≠ ≤ ≥ √
- Пошаговые выводы формул
- Примеры с числами`
  } else if (analysis.type === 'practical') {
    prompt += `

СПЕЦИФИКА ПРАКТИЧЕСКИХ НАВЫКОВ:
- Пошаговые инструкции (1. 2. 3.)
- Чек-листы с [ ]
- Таймеры и временные рамки
- Советы "На что обратить внимание"`
  } else if (analysis.type === 'creative') {
    prompt += `

СПЕЦИФИКА ТВОРЧЕСТВА:
- Вдохновляющие примеры
- Описание техник через ощущения
- Пошаговые инструкции с визуализацией
- Поощрение экспериментов`
  }

  prompt += `

ФОРМАТ ВЫВОДА:
Markdown с:
- ## Заголовками секций
- ### Подзаголовками
- **Выделением** важного
- > Блоками цитат для определений
- Списками где уместно
- Таблицами для сравнений

НЕ ИСПОЛЬЗУЙ:
- LaTeX формулы ($...$)
- Эмодзи в заголовках
- Сплошной текст без структуры`

  return prompt
}

/**
 * Generate practice prompt for a module
 */
function generatePracticePrompt(
  module: { name: string; description: string; keyTerms: string[]; difficulty: DifficultyLevel },
  analysis: TopicAnalysisResult
): string {
  const practiceFormats = analysis.practiceFormats
  
  let prompt = `Создай практические задания для модуля "${module.name}".

КОНТЕКСТ:
- Курс: ${analysis.normalizedTopic}
- Сложность модуля: ${module.difficulty}
- Ключевые термины: ${module.keyTerms.join(', ')}

ТРЕБОВАНИЯ:
1. 5-10 заданий в стиле Codewars/LeetCode
2. Прогрессия: 2-3 easy, 3-4 medium, 1-2 hard
3. Каждое задание с:
   - Чётким условием
   - Примером входа/выхода
   - Подсказками
   - Критериями оценки

ФОРМАТЫ ЗАДАНИЙ: ${practiceFormats.join(', ')}`

  // Type-specific practice
  if (analysis.type === 'programming') {
    prompt += `

СПЕЦИФИКА ПРОГРАММИРОВАНИЯ:
- Задачи на код с тестами
- Формат: условие → starter code → test cases
- Пример:
{
  "type": "code",
  "difficulty": "easy",
  "title": "Название",
  "description": "Условие задачи",
  "starterCode": "def solution():\\n    pass",
  "testCases": [
    {"input": "...", "expected": "..."}
  ],
  "hints": ["Подсказка 1"]
}`
  } else if (analysis.type === 'scientific') {
    prompt += `

СПЕЦИФИКА ТОЧНЫХ НАУК:
- Расчётные задачи с формулами
- Формат: условие → дано → найти → ответ
- Пример:
{
  "type": "calculation",
  "difficulty": "medium",
  "title": "Название",
  "description": "Условие с данными",
  "formula": "формула",
  "correctAnswer": число,
  "unit": "единица измерения",
  "hints": ["Подсказка"]
}`
  } else if (analysis.type === 'practical') {
    prompt += `

СПЕЦИФИКА ПРАКТИЧЕСКИХ НАВЫКОВ:
- Пошаговые задания
- Чек-листы выполнения
- Вариации и эксперименты
- Формат:
{
  "type": "step_by_step",
  "difficulty": "easy",
  "title": "Название",
  "description": "Что нужно сделать",
  "steps": ["Шаг 1", "Шаг 2"],
  "checkpoints": ["Проверка 1", "Проверка 2"]
}`
  } else {
    prompt += `

УНИВЕРСАЛЬНЫЙ ФОРМАТ:
{
  "type": "multiple_choice",
  "difficulty": "easy|medium|hard",
  "title": "Название",
  "description": "Вопрос",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "explanation": "Объяснение"
}`
  }

  prompt += `

ВЕРНИ JSON массив заданий:
{
  "tasks": [...]
}`

  return prompt
}

// ═══════════════════════════════════════════════════════════════
// 🎯 MAIN CONSTRUCTOR FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Build course structure from topic analysis
 * 
 * @param analysis - Result from Analyst agent
 * @returns Complete course structure with prompts
 * 
 * @example
 * const structure = await buildCourseStructure(analysis)
 * // Returns: { title, modules: [{ name, theoryPrompt, practicePrompt, ... }], ... }
 */
export async function buildCourseStructure(
  analysis: TopicAnalysisResult
): Promise<CourseStructure> {
  console.log(`[Constructor] Building structure for "${analysis.normalizedTopic}"`)
  const startTime = Date.now()
  
  // Step 1: Generate base structure with LLM
  const llmStructure = await generateStructureWithLLM(analysis)
  
  // Step 2: Get templates for this topic type
  const templates = MODULE_TEMPLATES[analysis.type]
  
  // Step 3: Build modules with prompts
  const modules: CourseModule[] = llmStructure.modules.map((m, index) => {
    const template = templates[index % templates.length]
    const baseDuration = analysis.estimatedDuration / llmStructure.modules.length
    
    return {
      id: `module-${index + 1}`,
      order: index + 1,
      name: m.name,
      description: m.description,
      theoryPrompt: generateTheoryPrompt(m, analysis, index, llmStructure.modules.length),
      practicePrompt: generatePracticePrompt(m, analysis),
      keyTerms: m.keyTerms,
      duration: Math.round(baseDuration * template.durationMultiplier),
      difficulty: m.difficulty,
      contentType: template.contentType
    }
  })
  
  // Step 4: Calculate total duration
  const totalDuration = modules.reduce((sum, m) => sum + m.duration, 0)
  
  // Step 5: Build final structure
  const structure: CourseStructure = {
    title: llmStructure.title,
    subtitle: llmStructure.subtitle,
    description: llmStructure.description,
    objectives: llmStructure.objectives,
    modules,
    totalDuration,
    topicType: analysis.type,
    metadata: {
      createdAt: new Date().toISOString(),
      version: '2.0',
      basedOnSources: analysis.recommendedSources
    }
  }
  
  console.log(`[Constructor] Structure built in ${Date.now() - startTime}ms`)
  console.log(`[Constructor] ${modules.length} modules, ${totalDuration} min total`)
  
  return structure
}

/**
 * Validate course structure
 */
export function validateStructure(structure: CourseStructure): boolean {
  return (
    structure.title.length > 0 &&
    structure.modules.length >= 3 &&
    structure.modules.length <= 15 &&
    structure.modules.every(m => 
      m.name.length > 0 &&
      m.theoryPrompt.length > 100 &&
      m.practicePrompt.length > 100
    )
  )
}

// ═══════════════════════════════════════════════════════════════
// 🎨 VISUAL COURSE STRUCTURE BUILDER
// ═══════════════════════════════════════════════════════════════

/**
 * Определяет уровень интерактивности на основе типа темы и сложности
 */
export function determineInteractivityLevel(
  topicType: TopicType,
  difficulty: DifficultyLevel
): InteractivityLevel {
  // Высокая интерактивность для programming и practical
  if (topicType === 'programming' || topicType === 'practical') {
    return 'high'
  }
  
  // Средняя интерактивность для scientific и technical
  if (topicType === 'scientific' || topicType === 'technical') {
    return difficulty === 'beginner' ? 'medium' : 'high'
  }
  
  // Для остальных типов зависит от сложности
  if (difficulty === 'advanced' || difficulty === 'expert') {
    return 'medium'
  }
  
  return 'low'
}

/**
 * Build visual course structure from topic analysis
 * 
 * Расширенная версия buildCourseStructure с визуальной идентичностью
 * и спецификациями для каждого модуля.
 * 
 * @param analysis - Result from Analyst agent
 * @returns Complete visual course structure with visual identity and module specs
 * 
 * @example
 * const structure = await buildVisualCourseStructure(analysis)
 * // Returns: { title, modules: [{ visualSpec, ... }], metadata: { visualIdentity, ... } }
 */
export async function buildVisualCourseStructure(
  analysis: TopicAnalysisResult
): Promise<VisualCourseStructure> {
  console.log(`[Constructor] Building VISUAL structure for "${analysis.normalizedTopic}"`)
  const startTime = Date.now()
  
  // Step 1: Generate base structure with LLM
  const llmStructure = await generateStructureWithLLM(analysis)
  
  // Step 2: Generate visual identity
  const visualIdentity = generateVisualIdentity(analysis.type, analysis.difficulty)
  console.log(`[Constructor] Visual identity: ${visualIdentity.colorScheme}, ${visualIdentity.visualTheme}`)
  
  // Step 3: Determine interactivity level
  const interactivityLevel = determineInteractivityLevel(analysis.type, analysis.difficulty)
  
  // Step 4: Get templates for this topic type
  const templates = MODULE_TEMPLATES[analysis.type]
  
  // Step 5: Build visual modules with prompts and visual specs
  const modules: VisualModule[] = llmStructure.modules.map((m, index) => {
    const template = templates[index % templates.length]
    const baseDuration = analysis.estimatedDuration / llmStructure.modules.length
    
    // Base module properties
    const baseModule: CourseModule = {
      id: `module-${index + 1}`,
      order: index + 1,
      name: m.name,
      description: m.description,
      theoryPrompt: generateTheoryPrompt(m, analysis, index, llmStructure.modules.length),
      practicePrompt: generatePracticePrompt(m, analysis),
      keyTerms: m.keyTerms,
      duration: Math.round(baseDuration * template.durationMultiplier),
      difficulty: m.difficulty,
      contentType: template.contentType
    }
    
    // Generate visual spec for this module
    const visualSpec = generateModuleVisualSpec(
      baseModule,
      visualIdentity,
      analysis.type,
      index
    )
    
    // Return visual module (sections will be populated by Generator agent)
    return {
      ...baseModule,
      visualSpec,
      sections: [] // Will be populated by Generator agent
    }
  })
  
  // Step 6: Calculate total duration
  const totalDuration = modules.reduce((sum, m) => sum + m.duration, 0)
  
  // Step 7: Build final visual structure
  const structure: VisualCourseStructure = {
    title: llmStructure.title,
    subtitle: llmStructure.subtitle,
    description: llmStructure.description,
    objectives: llmStructure.objectives,
    modules,
    totalDuration,
    topicType: analysis.type,
    metadata: {
      createdAt: new Date().toISOString(),
      version: '2.0',
      basedOnSources: analysis.recommendedSources,
      visualIdentity,
      interactivityLevel
    }
  }
  
  console.log(`[Constructor] Visual structure built in ${Date.now() - startTime}ms`)
  console.log(`[Constructor] ${modules.length} visual modules, ${totalDuration} min total`)
  
  return structure
}

/**
 * Validate visual course structure
 */
export function validateVisualStructure(structure: VisualCourseStructure): boolean {
  // Base validation
  if (!validateStructure(structure as unknown as CourseStructure)) {
    return false
  }
  
  // Visual identity validation
  const vi = structure.metadata.visualIdentity
  if (!vi || !vi.primaryColor || !vi.gradient || !vi.colorScheme || !vi.visualTheme) {
    return false
  }
  
  // Interactivity level validation
  if (!structure.metadata.interactivityLevel) {
    return false
  }
  
  // Module visual specs validation
  return structure.modules.every(m => {
    const vs = m.visualSpec
    return (
      vs &&
      vs.heroImagePrompt.length > 0 &&
      vs.colorScheme &&
      vs.colorScheme.primary &&
      vs.primaryVisual &&
      vs.primaryVisual.type &&
      Array.isArray(vs.secondaryVisuals)
    )
  })
}


// ═══════════════════════════════════════════════════════════════
// 📚 COURSE STRUCTURE WITH LESSONS
// ═══════════════════════════════════════════════════════════════

/**
 * Build course structure with lessons from generated theory content
 * 
 * This function takes a base course structure and generated theory content,
 * then splits each module into 3-7 lessons.
 * 
 * @param structure - Base course structure
 * @param generatedTheory - Map of moduleId to theory markdown
 * @returns Course structure with lessons for each module
 */
export function buildCourseStructureWithLessons(
  structure: CourseStructure,
  generatedTheory: Map<string, string>
): CourseStructureWithLessons {
  console.log(`[Constructor] Building structure with lessons for "${structure.title}"`)
  
  const modulesWithLessons: ModuleWithLessons[] = structure.modules.map(module => {
    const theoryMarkdown = generatedTheory.get(module.id) || ''
    
    // Split module into lessons
    const lessons = splitModuleIntoLessons(
      module,
      theoryMarkdown,
      structure.topicType
    )
    
    console.log(`[Constructor] Module "${module.name}": ${lessons.length} lessons`)
    
    return {
      ...module,
      lessons
    }
  })
  
  return {
    ...structure,
    modules: modulesWithLessons
  }
}

/**
 * Get all lessons from a course structure with lessons
 */
export function getAllLessons(structure: CourseStructureWithLessons): Lesson[] {
  return structure.modules.flatMap(m => m.lessons)
}

/**
 * Get lesson by ID from course structure
 */
export function getLessonById(
  structure: CourseStructureWithLessons,
  lessonId: string
): Lesson | undefined {
  for (const module of structure.modules) {
    const lesson = module.lessons.find(l => l.id === lessonId)
    if (lesson) return lesson
  }
  return undefined
}

/**
 * Get next lesson after the given lesson ID
 */
export function getNextLesson(
  structure: CourseStructureWithLessons,
  currentLessonId: string
): Lesson | undefined {
  const allLessons = getAllLessons(structure)
  const currentIndex = allLessons.findIndex(l => l.id === currentLessonId)
  
  if (currentIndex === -1 || currentIndex === allLessons.length - 1) {
    return undefined
  }
  
  return allLessons[currentIndex + 1]
}

/**
 * Get previous lesson before the given lesson ID
 */
export function getPreviousLesson(
  structure: CourseStructureWithLessons,
  currentLessonId: string
): Lesson | undefined {
  const allLessons = getAllLessons(structure)
  const currentIndex = allLessons.findIndex(l => l.id === currentLessonId)
  
  if (currentIndex <= 0) {
    return undefined
  }
  
  return allLessons[currentIndex - 1]
}
