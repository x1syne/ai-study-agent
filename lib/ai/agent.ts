/**
 * 🧠 AI COURSE ARCHITECT (LEGACY)
 * 
 * ⚠️ DEPRECATED: Используйте agent-fast.ts для новых функций
 * 
 * Интеллектуальная система генерации курсов:
 * 1. ИИ-Аналитик — определяет природу темы, сложность, методы обучения
 * 2. Динамический конструктор — собирает уникальную структуру
 * 3. Умный генератор — создаёт контент под конкретный тип темы
 */

import { generateWithRouter } from '@/lib/ai-router'
import { getRAGContext } from '@/lib/search'

// Обёртка для совместимости со старым кодом
async function generateCompletion(system: string, user: string, opts?: { json?: boolean; temperature?: number; maxTokens?: number }) {
  const result = await generateWithRouter('heavy', system, user, opts)
  return result.content
}

// ═══════════════════════════════════════════════════════════════
// 📊 ТИПЫ И ИНТЕРФЕЙСЫ
// ═══════════════════════════════════════════════════════════════

export type TopicNature = 
  | 'conceptual'   // Абстрактные идеи, теории (квантовая физика, философия)
  | 'procedural'   // Шаги, инструкции, алгоритмы (программирование, рецепты)
  | 'factual'      // Даты, события, данные (история, география)
  | 'skill'        // Практические умения (музыка, спорт, дизайн)
  | 'creative'     // Искусство, творчество (рисование, писательство)

export type LearningMethod = 
  | 'theory-practice-project'    // Теория → Практика → Проект
  | 'examples-generalize-apply'  // Примеры → Обобщение → Применение
  | 'problem-solution-analysis'  // Проблема → Решение → Анализ
  | 'observe-imitate-create'     // Наблюдение → Имитация → Создание

export type ContentFormat = 
  | 'text_formulas'      // Текст с формулами и доказательствами
  | 'step_by_step'       // Пошаговые инструкции с чек-листами
  | 'timeline'           // Хронология с картами и таймлайнами
  | 'video_demo'         // Видео-демонстрации техник
  | 'interactive_sim'    // Интерактивные симуляторы
  | 'practice_tasks'     // Практические задания с проверкой
  | 'visual_diagrams'    // Визуальные схемы и диаграммы
  | 'code_examples'      // Примеры кода с объяснениями
  | 'case_studies'       // Разбор реальных кейсов
  | 'quizzes'            // Тесты и квизы

export interface TopicAnalysis {
  topic: string
  courseName: string
  nature: TopicNature[]
  complexity: {
    base: number
    depth: number
    prerequisites: string[]
  }
  learningMethods: LearningMethod[]
  contentFormats: ContentFormat[]
  connections: {
    relatedTopics: string[]
    realApplications: string[]
    industries: string[]
  }
  keyTerms: string[]
  tone: 'academic' | 'conversational' | 'motivational' | 'practical'
  audience: string
  estimatedTime: number
}

export interface CourseSection {
  id: string
  type: string
  title: string
  description: string
  contentTypes: string[]
  estimatedMinutes: number
  interactiveElements?: string[]
}

export interface CourseStructure {
  title: string
  subtitle: string
  objectives: string[]
  sections: CourseSection[]
  practiceType: 'project' | 'simulation' | 'exercises' | 'creative'
  totalTime: number
}

// Для обратной совместимости
export interface LessonPlan {
  title: string
  objectives: string[]
  sections: {
    title: string
    type: 'intro' | 'theory' | 'example' | 'practice' | 'summary'
    keyPoints: string[]
    estimatedMinutes: number
  }[]
  practiceIdeas: string[]
}

// ═══════════════════════════════════════════════════════════════
// 🔍 ЭТАП 1: ИИ-АНАЛИТИК
// ═══════════════════════════════════════════════════════════════

export async function analyzeTopicDeep(
  topic: string,
  courseName: string
): Promise<TopicAnalysis> {
  console.log('[AI Architect] Step 1: Deep topic analysis...')
  
  const prompt = `Ты — эксперт по образовательным технологиям. Проанализируй тему для создания ИДЕАЛЬНОГО курса.

ТЕМА: "${topic}"
КОНТЕКСТ КУРСА: "${courseName}"

Проведи глубокий анализ и верни JSON:

{
  "nature": ["conceptual" | "procedural" | "factual" | "skill" | "creative"],
  "complexity": {
    "base": 1-10,
    "depth": 1-10,
    "prerequisites": ["Что нужно знать заранее"]
  },
  "learningMethods": ["theory-practice-project" | "examples-generalize-apply" | "problem-solution-analysis" | "observe-imitate-create"],
  "contentFormats": ["text_formulas" | "step_by_step" | "timeline" | "interactive_sim" | "practice_tasks" | "visual_diagrams" | "code_examples" | "case_studies" | "quizzes"],
  "connections": {
    "relatedTopics": ["Смежные темы"],
    "realApplications": ["Где применяется в жизни"],
    "industries": ["AI/ML", "Геймдев", "Финтех", "Медицина", etc.]
  },
  "keyTerms": ["5-10 ключевых терминов"],
  "tone": "academic" | "conversational" | "motivational" | "practical",
  "audience": "Описание аудитории",
  "estimatedTime": минуты
}

ПРИМЕРЫ:
- "Квантовая запутанность": nature=["conceptual"], complexity={base:9,depth:10}, tone="conversational"
- "Приготовление суши": nature=["procedural","skill","creative"], complexity={base:5,depth:7}, tone="practical"
- "Вторая мировая война": nature=["factual","conceptual"], complexity={base:4,depth:9}, tone="academic"

Верни ТОЛЬКО валидный JSON.`

  try {
    const response = await generateCompletion(
      'Ты аналитик образовательного контента. Отвечай ТОЛЬКО валидным JSON.',
      prompt,
      { json: true, temperature: 0.4, maxTokens: 2000 }
    )
    
    const analysis = JSON.parse(response)
    
    return {
      topic,
      courseName,
      nature: analysis.nature || ['conceptual'],
      complexity: analysis.complexity || { base: 5, depth: 7, prerequisites: [] },
      learningMethods: analysis.learningMethods || ['theory-practice-project'],
      contentFormats: analysis.contentFormats || ['text_formulas', 'practice_tasks'],
      connections: analysis.connections || { relatedTopics: [], realApplications: [], industries: [] },
      keyTerms: analysis.keyTerms || [topic],
      tone: analysis.tone || 'conversational',
      audience: analysis.audience || 'Студенты и начинающие специалисты',
      estimatedTime: analysis.estimatedTime || 20
    }
  } catch (e) {
    console.error('[AI Architect] Analysis failed:', e)
    return getDefaultAnalysis(topic, courseName)
  }
}

function getDefaultAnalysis(topic: string, courseName: string): TopicAnalysis {
  return {
    topic,
    courseName,
    nature: ['conceptual'],
    complexity: { base: 5, depth: 7, prerequisites: [] },
    learningMethods: ['theory-practice-project'],
    contentFormats: ['text_formulas', 'practice_tasks', 'quizzes'],
    connections: { relatedTopics: [], realApplications: [], industries: [] },
    keyTerms: [topic],
    tone: 'conversational',
    audience: 'Студенты и начинающие специалисты',
    estimatedTime: 20
  }
}

// ═══════════════════════════════════════════════════════════════
// 🏗️ ЭТАП 2: ДИНАМИЧЕСКИЙ КОНСТРУКТОР КУРСА
// ═══════════════════════════════════════════════════════════════

export function buildCourseStructure(analysis: TopicAnalysis): CourseStructure {
  console.log('[AI Architect] Step 2: Building dynamic course structure...')
  
  const sections: CourseSection[] = []
  let sectionId = 1
  
  // ═══════════════════════════════════════════════════════════════
  // 1. ВВЕДЕНИЕ — зависит от природы темы
  // ═══════════════════════════════════════════════════════════════
  
  if (analysis.nature.includes('conceptual')) {
    sections.push({
      id: `section-${sectionId++}`,
      type: 'conceptual_intro',
      title: '🎯 Фундаментальная идея',
      description: 'Понимание сути концепции через аналогии',
      contentTypes: ['analogy', 'historical_context', 'core_definition', 'why_matters'],
      estimatedMinutes: 5,
      interactiveElements: ['thought_experiment', 'quiz']
    })
  } else if (analysis.nature.includes('procedural')) {
    sections.push({
      id: `section-${sectionId++}`,
      type: 'practical_intro',
      title: '🎯 Что мы будем делать',
      description: 'Обзор процесса и конечного результата',
      contentTypes: ['end_result_preview', 'required_resources', 'process_overview'],
      estimatedMinutes: 3,
      interactiveElements: ['checklist']
    })
  } else if (analysis.nature.includes('factual')) {
    sections.push({
      id: `section-${sectionId++}`,
      type: 'context_intro',
      title: '🎯 Контекст и значение',
      description: 'Почему это важно знать',
      contentTypes: ['historical_significance', 'modern_relevance', 'key_figures'],
      estimatedMinutes: 4,
      interactiveElements: ['timeline_preview']
    })
  } else if (analysis.nature.includes('skill')) {
    sections.push({
      id: `section-${sectionId++}`,
      type: 'skill_intro',
      title: '🎯 Мастерство начинается здесь',
      description: 'Демонстрация навыка и путь к освоению',
      contentTypes: ['expert_demo', 'skill_breakdown', 'learning_path'],
      estimatedMinutes: 4,
      interactiveElements: ['self_assessment']
    })
  } else {
    sections.push({
      id: `section-${sectionId++}`,
      type: 'creative_intro',
      title: '🎯 Творческое путешествие',
      description: 'Вдохновение и первые шаги',
      contentTypes: ['inspiration_gallery', 'creative_principles', 'your_first_creation'],
      estimatedMinutes: 5,
      interactiveElements: ['mood_board']
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. ОСНОВНОЙ КОНТЕНТ — зависит от сложности
  // ═══════════════════════════════════════════════════════════════
  
  const complexity = analysis.complexity.base
  
  if (complexity <= 3) {
    // Простая тема: компактная структура
    sections.push({
      id: `section-${sectionId++}`,
      type: 'core_concepts',
      title: '📚 Ключевые понятия',
      description: 'Всё что нужно знать',
      contentTypes: ['definitions', 'examples', 'visual_summary'],
      estimatedMinutes: 8,
      interactiveElements: ['flashcards', 'quick_quiz']
    })
  } else if (complexity <= 6) {
    // Средняя сложность: модульная структура
    sections.push({
      id: `section-${sectionId++}`,
      type: 'fundamentals',
      title: '📚 Базовые понятия',
      description: 'Фундамент для понимания',
      contentTypes: ['core_terms', 'basic_principles', 'simple_examples'],
      estimatedMinutes: 10,
      interactiveElements: ['term_matcher', 'concept_quiz']
    })
    
    sections.push({
      id: `section-${sectionId++}`,
      type: 'deep_dive',
      title: '🔬 Как это работает',
      description: 'Механизм и детали',
      contentTypes: ['mechanism', 'detailed_explanation', 'edge_cases'],
      estimatedMinutes: 12,
      interactiveElements: ['interactive_diagram', 'what_if_scenarios']
    })
  } else {
    // Сложная тема: постепенное погружение
    sections.push({
      id: `section-${sectionId++}`,
      type: 'intuition',
      title: '💡 Интуитивное понимание',
      description: 'Простые аналогии для сложных идей',
      contentTypes: ['everyday_analogies', 'visual_metaphors', 'simplified_model'],
      estimatedMinutes: 8,
      interactiveElements: ['analogy_builder']
    })
    
    sections.push({
      id: `section-${sectionId++}`,
      type: 'formal_theory',
      title: '📐 Формальная теория',
      description: 'Точные определения и формулы',
      contentTypes: ['formal_definitions', 'mathematical_framework', 'proofs'],
      estimatedMinutes: 15,
      interactiveElements: ['formula_calculator', 'step_by_step_derivation']
    })
    
    sections.push({
      id: `section-${sectionId++}`,
      type: 'advanced_topics',
      title: '🚀 Продвинутый уровень',
      description: 'Глубокое погружение для любознательных',
      contentTypes: ['advanced_concepts', 'research_frontiers', 'open_problems'],
      estimatedMinutes: 10,
      interactiveElements: ['deep_dive_quiz']
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 3. ПРИМЕРЫ И ПРИМЕНЕНИЯ — зависит от связей
  // ═══════════════════════════════════════════════════════════════
  
  if (analysis.connections.realApplications.length > 0 || analysis.connections.industries.length > 0) {
    sections.push({
      id: `section-${sectionId++}`,
      type: 'real_world',
      title: '🌍 Где это работает',
      description: 'Реальные применения в индустрии',
      contentTypes: ['industry_cases', 'success_stories', 'career_paths'],
      estimatedMinutes: 7,
      interactiveElements: ['case_explorer', 'industry_quiz']
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 4. ПРАКТИКА — зависит от метода обучения
  // ═══════════════════════════════════════════════════════════════
  
  if (analysis.learningMethods.includes('theory-practice-project')) {
    sections.push({
      id: `section-${sectionId++}`,
      type: 'hands_on_practice',
      title: '🛠️ Практика',
      description: 'Применяем знания на практике',
      contentTypes: ['guided_exercises', 'mini_project', 'code_challenges'],
      estimatedMinutes: 15,
      interactiveElements: ['code_editor', 'step_checker']
    })
  } else if (analysis.learningMethods.includes('observe-imitate-create')) {
    sections.push({
      id: `section-${sectionId++}`,
      type: 'imitation_practice',
      title: '👁️ Наблюдай и повторяй',
      description: 'Учимся через имитацию мастеров',
      contentTypes: ['expert_walkthrough', 'guided_imitation', 'variation_exercises'],
      estimatedMinutes: 12,
      interactiveElements: ['video_player', 'progress_tracker']
    })
  } else if (analysis.learningMethods.includes('problem-solution-analysis')) {
    sections.push({
      id: `section-${sectionId++}`,
      type: 'problem_solving',
      title: '🧩 Решаем проблемы',
      description: 'Анализ и решение реальных задач',
      contentTypes: ['problem_statement', 'solution_strategies', 'analysis_framework'],
      estimatedMinutes: 15,
      interactiveElements: ['problem_simulator', 'solution_checker']
    })
  } else {
    sections.push({
      id: `section-${sectionId++}`,
      type: 'application_practice',
      title: '🎯 Применение',
      description: 'От примеров к обобщению',
      contentTypes: ['worked_examples', 'pattern_recognition', 'generalization'],
      estimatedMinutes: 12,
      interactiveElements: ['pattern_matcher', 'application_quiz']
    })
  }
  
  // ═══════════════════════════════════════════════════════════════
  // 5. ПРОВЕРКА ПОНИМАНИЯ
  // ═══════════════════════════════════════════════════════════════
  
  sections.push({
    id: `section-${sectionId++}`,
    type: 'misconceptions',
    title: '⚠️ Частые ошибки',
    description: 'Разбираем типичные заблуждения',
    contentTypes: ['common_mistakes', 'myth_busters', 'correct_understanding'],
    estimatedMinutes: 5,
    interactiveElements: ['misconception_quiz', 'true_false_game']
  })
  
  // ═══════════════════════════════════════════════════════════════
  // 6. ИТОГИ И СЛЕДУЮЩИЕ ШАГИ
  // ═══════════════════════════════════════════════════════════════
  
  sections.push({
    id: `section-${sectionId++}`,
    type: 'summary',
    title: '📋 Итоги',
    description: 'Закрепление и план развития',
    contentTypes: ['key_takeaways', 'cheat_sheet', 'next_steps', 'resources'],
    estimatedMinutes: 4,
    interactiveElements: ['final_quiz', 'progress_certificate']
  })
  
  // Определяем тип практики
  let practiceType: 'project' | 'simulation' | 'exercises' | 'creative' = 'exercises'
  if (analysis.nature.includes('procedural') || analysis.nature.includes('skill')) {
    practiceType = 'project'
  } else if (analysis.nature.includes('creative')) {
    practiceType = 'creative'
  } else if (analysis.contentFormats.includes('interactive_sim')) {
    practiceType = 'simulation'
  }
  
  const totalTime = sections.reduce((sum, s) => sum + s.estimatedMinutes, 0)
  
  return {
    title: analysis.topic,
    subtitle: `Курс: ${analysis.courseName}`,
    objectives: generateObjectives(analysis),
    sections,
    practiceType,
    totalTime
  }
}

function generateObjectives(analysis: TopicAnalysis): string[] {
  const objectives: string[] = []
  
  if (analysis.nature.includes('conceptual')) {
    objectives.push(`Понять фундаментальную идею "${analysis.topic}"`)
    objectives.push('Уметь объяснить концепцию простыми словами')
  }
  if (analysis.nature.includes('procedural')) {
    objectives.push(`Освоить пошаговый процесс`)
    objectives.push('Уметь выполнить задачу самостоятельно')
  }
  if (analysis.nature.includes('factual')) {
    objectives.push('Знать ключевые факты и даты')
    objectives.push('Понимать причинно-следственные связи')
  }
  if (analysis.nature.includes('skill')) {
    objectives.push('Развить практический навык')
    objectives.push('Достичь базового уровня мастерства')
  }
  if (analysis.nature.includes('creative')) {
    objectives.push('Освоить творческие техники')
    objectives.push('Создать собственную работу')
  }
  
  objectives.push('Применить знания в реальных ситуациях')
  
  return objectives.slice(0, 4)
}


// ═══════════════════════════════════════════════════════════════
// 🎨 ЭТАП 3: УМНЫЙ ГЕНЕРАТОР КОНТЕНТА (СЕКЦИИ С ЗАДЕРЖКАМИ)
// ═══════════════════════════════════════════════════════════════

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Строит динамические секции на основе анализа темы
 * AI сам определяет контент исходя из природы темы
 */
function buildDynamicSections(analysis: TopicAnalysis, baseContext: string): { title: string; prompt: string }[] {
  const sections: { title: string; prompt: string }[] = []
  
  // Определяем тип контента на основе анализа
  const hasCode = analysis.contentFormats.includes('code_examples')
  const hasFormulas = analysis.contentFormats.includes('text_formulas')
  
  // ПРИОРИТЕТ: Программирование определяется ПЕРВЫМ
  const topicLower = (analysis.topic + ' ' + analysis.courseName).toLowerCase()
  const isProgramming = hasCode || 
    /программ|python|javascript|java|c\+\+|react|vue|angular|sql|код|функци|алгоритм|ооп|oop|class|объект|наследован|полиморф|инкапсуляц|api|backend|frontend|web|разработ/i.test(topicLower)
  
  // Точные науки — ТОЛЬКО если НЕ программирование и есть формулы
  const isExactScience = !isProgramming && hasFormulas && 
    /физик|химик|математ|механик|термодинам|оптик|электр|магнит|кинематик|динамик|геометр|алгебр|тригонометр/i.test(topicLower)
  
  const isCreative = analysis.nature.includes('creative')
  const isFactual = analysis.nature.includes('factual')
  const isSkill = analysis.nature.includes('skill')
  
  console.log(`[buildDynamicSections] Topic: "${analysis.topic}", isProgramming: ${isProgramming}, isExactScience: ${isExactScience}`)
  
  // Общие правила форматирования для всех секций
  const formattingRules = `
ПРАВИЛА КРАСИВОГО ОФОРМЛЕНИЯ:
1. Используй подзаголовки ### для структуры
2. Выделяй **ключевые термины** жирным
3. Используй списки для перечислений
4. Разделяй абзацы пустой строкой
5. Добавляй > блоки цитат для важных определений или формул
6. НЕ пиши сплошным текстом — структурируй!`
  
  // 1. ВВЕДЕНИЕ — адаптивное
  sections.push({
    title: 'Введение',
    prompt: `Напиши введение для урока.

${baseContext}

${formattingRules}

СТРУКТУРА ВВЕДЕНИЯ:
### Зачем это нужно?
- Интригующий факт или вопрос по теме
- Почему это важно изучить

### Где применяется
- 3-4 конкретных примера применения
- Реальные компании/проекты (если применимо)

### Что вы узнаете
- Краткий список того, что будет в уроке

Пиши как эксперт. Минимум 400 слов. Без эмодзи в заголовках.`
  })
  
  // 2. ОСНОВНЫЕ ПОНЯТИЯ — зависит от типа темы
  if (isExactScience) {
    sections.push({
      title: 'Основные понятия и формулы',
      prompt: `Напиши раздел с основными понятиями и формулами.

${baseContext}

${formattingRules}

СТРУКТУРА ДЛЯ КАЖДОГО ПОНЯТИЯ:

### Название понятия

> **Определение**
> Чёткое определение понятия

**Формула:**
> формула = выражение
> 
> где:
> - переменная₁ — описание
> - переменная₂ — описание

**Пример с числами:**
Подставляем значения и получаем результат.

---

Используй символы: ₀₁₂₃₄₅₆₇₈₉ ⁰¹²³⁴⁵⁶⁷⁸⁹ α β γ δ θ λ π × ÷ ± ≈ ≠ ≤ ≥ √

Минимум 600 слов.`
    })
  } else if (isProgramming) {
    sections.push({
      title: 'Основные концепции',
      prompt: `Напиши раздел с основными концепциями.

${baseContext}

${formattingRules}

СТРУКТУРА ДЛЯ КАЖДОЙ КОНЦЕПЦИИ:

### Название концепции

**Что это:** краткое объяснение

**Зачем нужно:** практическая польза

**Синтаксис:**
\`\`\`python
# пример кода с комментариями
\`\`\`

**Как работает:** пошаговое объяснение

**Практический пример:**
\`\`\`python
# реальный пример использования
\`\`\`

---

Минимум 600 слов.`
    })
  } else if (isFactual) {
    sections.push({
      title: 'Ключевые факты и события',
      prompt: `Напиши раздел с ключевыми фактами.

${baseContext}

${formattingRules}

СТРУКТУРА:

### Хронология
| Дата | Событие | Значение |
|------|---------|----------|
| ... | ... | ... |

### Ключевые персоны
Для каждой персоны:
- **Имя** — роль и вклад

### Причинно-следственные связи
- Причина → Следствие

Минимум 600 слов.`
    })
  } else if (isCreative || isSkill) {
    sections.push({
      title: 'Основные техники и приёмы',
      prompt: `Напиши раздел с основными техниками.

${baseContext}

${formattingRules}

СТРУКТУРА ДЛЯ КАЖДОЙ ТЕХНИКИ:

### Название техники

**Описание:** что это за техника

**Пошаговая инструкция:**
1. Первый шаг
2. Второй шаг
3. ...

**На что обратить внимание:**
- Важный момент 1
- Важный момент 2

**Типичные ошибки:**
- Ошибка → Как исправить

---

Минимум 600 слов.`
    })
  } else {
    sections.push({
      title: 'Основные понятия',
      prompt: `Напиши раздел с основными понятиями.

${baseContext}

${formattingRules}

СТРУКТУРА ДЛЯ КАЖДОГО ПОНЯТИЯ:

### Название понятия

> **Определение:** простое объяснение

**Примеры из жизни:**
- Пример 1
- Пример 2

**Связь с другими понятиями:**
Как это связано с предыдущим материалом.

---

Минимум 600 слов.`
    })
  }
  
  // 3. КАК ЭТО РАБОТАЕТ
  sections.push({
    title: 'Как это работает',
    prompt: `Напиши раздел "Как это работает".

${baseContext}

${formattingRules}

СТРУКТУРА:

### Принцип работы
Объясни основной механизм.

### Пошаговый разбор
1. **Шаг 1:** описание
2. **Шаг 2:** описание
3. ...

### Аналогия для понимания
> Представьте, что... (простая аналогия)

### Особые случаи
- Случай 1: что происходит
- Случай 2: что происходит

Минимум 500 слов.`
  })
  
  // 4. ПРИМЕНЕНИЕ
  sections.push({
    title: 'Применение',
    prompt: `Напиши раздел о применении в реальном мире.

${baseContext}

${formattingRules}

СТРУКТУРА:

### В индустрии
| Область | Как используется | Пример |
|---------|------------------|--------|
| ... | ... | ... |

### Реальные кейсы
Для каждого кейса:
- **Компания/Проект:** название
- **Задача:** что решали
- **Решение:** как применили тему

### Карьерные возможности
- Профессия 1: как пригодится
- Профессия 2: как пригодится

Минимум 400 слов.`
  })
  
  // 5. ПРАКТИЧЕСКИЕ ПРИМЕРЫ — зависит от типа
  if (isExactScience) {
    sections.push({
      title: 'Решение задач',
      prompt: `Напиши раздел с решением задач.

${baseContext}

${formattingRules}

СТРУКТУРА ДЛЯ КАЖДОЙ ЗАДАЧИ:

### Задача N (сложность)

**Условие:**
Текст условия с конкретными данными.

**Дано:**
- величина₁ = значение
- величина₂ = значение

**Решение:**
> Шаг 1: формула
> Шаг 2: подстановка
> Шаг 3: результат

**Ответ:** число с единицами измерения

---

Разбери 3-5 задач от простых к сложным. Минимум 600 слов.`
    })
  } else if (isProgramming) {
    sections.push({
      title: 'Практические примеры кода',
      prompt: `Напиши раздел с примерами кода.

${baseContext}

${formattingRules}

СТРУКТУРА ДЛЯ КАЖДОГО ПРИМЕРА:

### Пример N: Название (сложность)

**Задача:** что нужно сделать

**Решение:**
\`\`\`python
# Подробно прокомментированный код
\`\`\`

**Разбор:**
- Строка N: что делает
- Строка M: зачем нужно

**Результат:**
\`\`\`
вывод программы
\`\`\`

---

Покажи 3-5 примеров от простых к сложным. Минимум 600 слов.`
    })
  } else {
    sections.push({
      title: 'Практические примеры',
      prompt: `Напиши раздел с практическими примерами.

${baseContext}

${formattingRules}

СТРУКТУРА ДЛЯ КАЖДОГО ПРИМЕРА:

### Пример N: Название

**Ситуация:**
Описание контекста.

**Анализ:**
- Фактор 1
- Фактор 2

**Выводы:**
> Ключевой вывод из примера

---

Разбери 3-5 примеров. Минимум 600 слов.`
    })
  }
  
  // 6. ЧАСТЫЕ ОШИБКИ
  sections.push({
    title: 'Частые ошибки',
    prompt: `Напиши раздел о частых ошибках.

${baseContext}

${formattingRules}

СТРУКТУРА:

### Ошибка 1: Название

**Неправильно:**
> Что люди думают/делают неправильно

**Правильно:**
> Как на самом деле

**Как избежать:**
- Совет 1
- Совет 2

---

Разбери 5 типичных ошибок. Минимум 400 слов.`
  })
  
  // 7. ИТОГИ — адаптивные
  if (isExactScience) {
    sections.push({
      title: 'Итоги',
      prompt: `Напиши итоговый раздел.

${baseContext}

${formattingRules}

СТРУКТУРА:

### Сводка формул
| Формула | Описание | Когда применять |
|---------|----------|-----------------|
| ... | ... | ... |

### Ключевые выводы
1. Вывод 1
2. Вывод 2
...

### Чек-лист: что вы должны уметь
- [ ] Навык 1
- [ ] Навык 2
...

### Что изучать дальше
- Тема 1: почему важна
- Тема 2: почему важна

Минимум 300 слов.`
    })
  } else if (isProgramming) {
    sections.push({
      title: 'Итоги',
      prompt: `Напиши итоговый раздел.

${baseContext}

${formattingRules}

СТРУКТУРА:

### Сводка концепций
| Концепция | Для чего | Синтаксис |
|-----------|----------|-----------|
| ... | ... | \`...\` |

### Чек-лист навыков
- [ ] Умею делать X
- [ ] Понимаю Y
...

### Полезные ресурсы
- [Документация](ссылка)
- [Туториал](ссылка)

### Что изучать дальше
- Тема 1: почему важна
- Тема 2: почему важна

Минимум 300 слов.`
    })
  } else {
    sections.push({
      title: 'Итоги',
      prompt: `Напиши итоговый раздел.

${baseContext}

${formattingRules}

СТРУКТУРА:

### Ключевые выводы
1. **Вывод 1:** пояснение
2. **Вывод 2:** пояснение
...

### Чек-лист знаний
- [ ] Понимаю X
- [ ] Знаю Y
...

### Что изучать дальше
- Тема 1: почему важна
- Тема 2: почему важна

Минимум 300 слов.`
    })
  }
  
  return sections
}

/**
 * Генерирует контент урока СЕКЦИЯ ЗА СЕКЦИЕЙ с задержками
 * Это обходит rate limiting Groq API
 */
async function generateFullLessonContent(
  analysis: TopicAnalysis,
  structure: CourseStructure,
  ragContext: string
): Promise<string> {
  console.log('[AI Architect] Generating lesson content SECTION BY SECTION...')
  
  const industries = analysis.connections.industries.length > 0 
    ? analysis.connections.industries.slice(0, 3).join(', ')
    : 'IT, бизнес, наука'
  
  const applications = analysis.connections.realApplications.length > 0
    ? analysis.connections.realApplications.slice(0, 3).join(', ')
    : 'современные технологии'

  const baseContext = `Тема: "${analysis.topic}"
Курс: "${analysis.courseName}"
Природа темы: ${analysis.nature.join(', ')}
Форматы: ${analysis.contentFormats.join(', ')}
Сложность: ${analysis.complexity.base}/10
Применения: ${applications}
Ключевые термины: ${analysis.keyTerms.join(', ')}
${ragContext ? `\nДоп. контекст: ${ragContext.slice(0, 800)}` : ''}`

  // Динамические секции — AI сам определяет контент на основе анализа
  const sections = buildDynamicSections(analysis, baseContext)

  const contentParts: string[] = []
  
  // Определяем тип контента по ключевым словам (как в buildDynamicSections)
  const topicLower = (analysis.topic + ' ' + analysis.courseName).toLowerCase()
  const isProgrammingTopic = analysis.contentFormats.includes('code_examples') || 
    /программ|python|javascript|java|c\+\+|react|vue|angular|sql|код|функци|алгоритм|ооп|oop|class|объект|наследован|полиморф|инкапсуляц|api|backend|frontend|web|разработ/i.test(topicLower)
  
  const isExactScienceTopic = !isProgrammingTopic && analysis.contentFormats.includes('text_formulas') &&
    /физик|химик|математ|механик|термодинам|оптик|электр|магнит|кинематик|динамик|геометр|алгебр|тригонометр/i.test(topicLower)
  
  console.log(`[generateFullLessonContent] isProgramming: ${isProgrammingTopic}, isExactScience: ${isExactScienceTopic}`)
  
  // Адаптивный системный промпт
  let systemPrompt = `Ты профессор ведущего университета. Пишешь увлекательные лекции на русском языке.
Используй живые примеры, аналогии. Тон: дружелюбный но экспертный.

СТРОГИЕ ПРАВИЛА:
1. НЕ используй эмодзи в заголовках
2. НЕ используй LaTeX формулы (никаких $...$ или \\lim)
3. НЕ ПОВТОРЯЙ заголовок секции — он уже есть
4. Сразу начинай с контента
5. Пиши ТОЛЬКО о теме "${analysis.topic}"

КРАСИВОЕ ОФОРМЛЕНИЕ (ОБЯЗАТЕЛЬНО!):
- Используй ### подзаголовки для структуры
- Выделяй **ключевые термины** жирным
- Используй списки (- или 1.) для перечислений
- Разделяй абзацы пустой строкой
- Используй > блоки цитат для определений и формул
- Используй таблицы | где уместно
- Используй --- для разделения блоков
- НЕ ПИШИ СПЛОШНЫМ ТЕКСТОМ!

КРИТИЧЕСКИ ВАЖНО — НЕ ПРИДУМЫВАЙ ФОРМУЛЫ:
- НЕ пиши псевдо-формулы типа "Класс = (Атрибуты, Методы)" — это бессмыслица
- НЕ используй греческие буквы (α, β) для обозначения понятий, если это не математика/физика
- Формулы уместны ТОЛЬКО в точных науках (физика, химия, математика)
- Для остальных тем объясняй словами, примерами, аналогиями — БЕЗ формул`

  // Добавляем инструкции по формулам ТОЛЬКО для точных наук (НЕ для программирования!)
  if (isExactScienceTopic) {
    systemPrompt += `

ФОРМАТИРОВАНИЕ ФОРМУЛ:
Оформляй формулы в блоках цитат:

> **Название формулы**
> 
> формула
> 
> где:
> - переменная — описание

Используй символы: ₀₁₂₃₄₅₆₇₈₉ ⁰¹²³⁴⁵⁶⁷⁸⁹ α β γ δ θ λ π × ÷ ± ≈ ≠ ≤ ≥ √`
  }
  
  // Добавляем инструкции по коду для программирования
  if (isProgrammingTopic) {
    systemPrompt += `

ЭТО ТЕМА ПО ПРОГРАММИРОВАНИЮ!
- НЕ придумывай математические формулы для программирования
- НЕ пиши "Формула класса = ..." — это бессмысленно
- Объясняй концепции через КОД и примеры
- Код оформляй в блоках:
\`\`\`python
код с комментариями
\`\`\`
- Показывай реальные примеры использования`
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i]
    console.log(`[AI Architect] Generating section ${i + 1}/${sections.length}: ${section.title}`)
    
    try {
      // Задержка между запросами (кроме первого)
      if (i > 0) {
        console.log('[AI Architect] Waiting 1.5s to avoid rate limit...')
        await delay(1500)
      }
      
      const content = await generateCompletion(systemPrompt, section.prompt, {
        temperature: 0.75,
        maxTokens: 2500
      })
      
      if (content && content.length > 100) {
        contentParts.push(`## ${section.title}\n\n${content}`)
        console.log(`[AI Architect] Section ${i + 1} done: ${content.length} chars`)
      } else {
        throw new Error('Content too short')
      }
    } catch (e: any) {
      console.error(`[AI Architect] Section ${i + 1} failed:`, e?.message)
      // Добавляем placeholder для упавшей секции
      contentParts.push(`## ${section.title}\n\n*Этот раздел временно недоступен. Обновите страницу.*`)
      
      // Увеличиваем задержку после ошибки
      await delay(3000)
    }
  }

  const fullContent = contentParts.join('\n\n---\n\n')
  console.log(`[AI Architect] Full lesson generated: ${fullContent.length} chars`)
  
  // Если слишком мало контента — возвращаем fallback
  if (fullContent.length < 1000) {
    return generateFallbackContent(analysis, structure)
  }
  
  return fullContent
}

function generateFallbackContent(analysis: TopicAnalysis, structure: CourseStructure): string {
  return `# ${analysis.topic}

## 🎯 Введение

Добро пожаловать в изучение темы "${analysis.topic}"! 

Эта тема относится к категории: ${analysis.nature.join(', ')}.
Сложность: ${analysis.complexity.base}/10.

### Почему это важно?

${analysis.connections.realApplications.length > 0 
  ? `Эта тема применяется в: ${analysis.connections.realApplications.join(', ')}.`
  : 'Эта тема является фундаментальной для понимания многих современных технологий.'}

---

## 📚 Основные понятия

Ключевые термины, которые вы изучите:
${analysis.keyTerms.map(t => `- **${t}**`).join('\n')}

---

## 🔬 Как это работает

Детальное объяснение механизмов и принципов будет доступно после обновления.

---

## 🛠️ Практика

Практические задания помогут закрепить материал.

---

## ⚠️ Частые ошибки

Разбор типичных заблуждений поможет избежать ошибок.

---

## 📋 Итоги

После изучения этой темы вы сможете:
${structure.objectives.map(o => `- ${o}`).join('\n')}

*Полная версия урока генерируется. Попробуйте обновить страницу через минуту.*`
}

function getToneDescription(tone: string): string {
  const tones: Record<string, string> = {
    'academic': 'научный, точный, с терминологией',
    'conversational': 'дружелюбный, как разговор с умным другом',
    'motivational': 'вдохновляющий, энергичный, с историями успеха',
    'practical': 'по делу, без воды, с конкретными примерами'
  }
  return tones[tone] || tones['conversational']
}

// Оставляем для обратной совместимости, но не используем в основном flow
export async function generateSectionContent(
  analysis: TopicAnalysis,
  section: CourseSection,
  context?: string
): Promise<string> {
  console.log(`[AI Architect] Step 3: Generating content for "${section.title}"...`)
  
  // Выбираем промпт в зависимости от типа секции
  const promptGenerators: Record<string, () => string> = {
    'conceptual_intro': () => generateConceptualIntroPrompt(analysis, section),
    'practical_intro': () => generatePracticalIntroPrompt(analysis, section),
    'context_intro': () => generateContextIntroPrompt(analysis, section),
    'skill_intro': () => generateSkillIntroPrompt(analysis, section),
    'creative_intro': () => generateCreativeIntroPrompt(analysis, section),
    'core_concepts': () => generateCoreConceptsPrompt(analysis, section),
    'fundamentals': () => generateFundamentalsPrompt(analysis, section),
    'deep_dive': () => generateDeepDivePrompt(analysis, section),
    'intuition': () => generateIntuitionPrompt(analysis, section),
    'formal_theory': () => generateFormalTheoryPrompt(analysis, section),
    'advanced_topics': () => generateAdvancedPrompt(analysis, section),
    'real_world': () => generateRealWorldPrompt(analysis, section),
    'hands_on_practice': () => generatePracticePrompt(analysis, section),
    'imitation_practice': () => generateImitationPrompt(analysis, section),
    'problem_solving': () => generateProblemSolvingPrompt(analysis, section),
    'application_practice': () => generateApplicationPrompt(analysis, section),
    'misconceptions': () => generateMisconceptionsPrompt(analysis, section),
    'summary': () => generateSummaryPrompt(analysis, section)
  }
  
  const promptGenerator = promptGenerators[section.type] || (() => generateDefaultPrompt(analysis, section))
  const prompt = promptGenerator()
  
  const systemPrompt = `Ты — мастер образовательного контента. Создаёшь УВЛЕКАТЕЛЬНЫЕ уроки.

ПРАВИЛА:
1. Пиши на русском языке
2. Используй живые примеры из ${analysis.connections.industries.join(', ') || 'реальной жизни'}
3. Тон: ${getToneDescription(analysis.tone)}
4. Целевая аудитория: ${analysis.audience}
5. Добавляй интерактивные блоки: interactive:quiz, interactive:code, interactive:misconception
6. Используй эмодзи для визуального разделения
7. Формулы в LaTeX: $формула$ или $$формула$$

${context ? `ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ:\n${context}` : ''}`

  try {
    const content = await generateCompletion(systemPrompt, prompt, {
      temperature: 0.7,
      maxTokens: 4000
    })
    return content
  } catch (e) {
    console.error(`[AI Architect] Content generation failed for ${section.type}:`, e)
    return `## ${section.title}\n\nКонтент временно недоступен. Попробуйте обновить страницу.`
  }
}

// ═══════════════════════════════════════════════════════════════
// 📝 ГЕНЕРАТОРЫ ПРОМПТОВ ДЛЯ РАЗНЫХ ТИПОВ СЕКЦИЙ (legacy)
// ═══════════════════════════════════════════════════════════════

function generateConceptualIntroPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай ЗАХВАТЫВАЮЩЕЕ введение в тему "${analysis.topic}".

СТРУКТУРА:
1. 🎯 КРЮЧОК (2-3 предложения)
   - Начни с интригующего вопроса или факта
   - Покажи, почему это важно ЛИЧНО для читателя
   - Пример: "Представьте, что вы можете предсказать будущее с точностью 85%..."

2. 🌍 КОНТЕКСТ (где это используется)
   - 3-4 реальных применения из: ${analysis.connections.industries.join(', ')}
   - Конкретные примеры компаний/продуктов

3. 💡 АНАЛОГИЯ (объясни сложное просто)
   - Найди бытовую аналогию для "${analysis.topic}"
   - Пример для вероятности: "Это как прогноз погоды — не гарантия, а оценка шансов"

4. 📚 БАЗОВОЕ ОПРЕДЕЛЕНИЕ
   - Простое определение без жаргона
   - Затем формальное определение с терминами

5. interactive:quiz
   question: Проверочный вопрос на понимание аналогии
   options: 4 варианта
   correct: индекс правильного (0-3)
   explanation: почему это правильно

Ключевые термины для использования: ${analysis.keyTerms.join(', ')}`
}

function generatePracticalIntroPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай ПРАКТИЧЕСКОЕ введение в "${analysis.topic}".

СТРУКТУРА:
1. 🎯 КОНЕЧНЫЙ РЕЗУЛЬТАТ
   - Покажи, что студент сможет ДЕЛАТЬ после урока
   - Конкретный пример готового результата

2. 📋 ЧТО ПОНАДОБИТСЯ
   - Список инструментов/ресурсов
   - Предварительные знания: ${analysis.complexity.prerequisites.join(', ') || 'базовые'}

3. 🗺️ КАРТА ПРОЦЕССА
   - Обзор всех шагов (5-7 пунктов)
   - Примерное время на каждый

4. ⚡ БЫСТРЫЙ СТАРТ
   - Первое простое действие, которое можно сделать прямо сейчас

5. interactive:code (если применимо)
   language: подходящий язык
   code: стартовый код
   task: что нужно изменить`
}

function generateContextIntroPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай КОНТЕКСТНОЕ введение в "${analysis.topic}".

СТРУКТУРА:
1. 🎯 ПОЧЕМУ ЭТО ВАЖНО СЕГОДНЯ
   - Связь с современностью
   - Актуальные события/тренды

2. 📜 ИСТОРИЧЕСКИЙ КОНТЕКСТ
   - Ключевые даты и события
   - Главные фигуры и их вклад

3. 🔗 СВЯЗИ С ДРУГИМИ ТЕМАМИ
   - Как это связано с: ${analysis.connections.relatedTopics.join(', ')}

4. 🎭 РАЗНЫЕ ТОЧКИ ЗРЕНИЯ
   - 2-3 перспективы на тему

5. interactive:quiz
   question: Вопрос на понимание контекста
   options: 4 варианта
   correct: индекс
   explanation: объяснение`
}

function generateSkillIntroPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай МОТИВИРУЮЩЕЕ введение в навык "${analysis.topic}".

СТРУКТУРА:
1. 🎯 ДЕМОНСТРАЦИЯ МАСТЕРСТВА
   - Опиши, как выглядит эксперт в действии
   - Вдохновляющий пример

2. 🛤️ ПУТЬ РАЗВИТИЯ
   - Уровни мастерства (новичок → эксперт)
   - Что отличает каждый уровень

3. ⏱️ РЕАЛИСТИЧНЫЕ ОЖИДАНИЯ
   - Сколько времени нужно на каждый уровень
   - Типичные трудности и как их преодолеть

4. 🎯 ПЕРВЫЙ ШАГ
   - Самое простое упражнение для начала

5. interactive:quiz
   question: Самооценка текущего уровня
   options: описания уровней
   correct: -1 (нет правильного)
   explanation: рекомендации для каждого уровня`
}

function generateCreativeIntroPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай ВДОХНОВЛЯЮЩЕЕ введение в "${analysis.topic}".

СТРУКТУРА:
1. 🎨 ГАЛЕРЕЯ ВДОХНОВЕНИЯ
   - 3-4 примера выдающихся работ
   - Что делает их особенными

2. 💡 ТВОРЧЕСКИЕ ПРИНЦИПЫ
   - 3-5 базовых принципов
   - Как они проявляются в примерах

3. 🚀 ТВОЯ ПЕРВАЯ РАБОТА
   - Простое творческое задание
   - Пошаговое руководство

4. 🎯 КРИТЕРИИ КАЧЕСТВА
   - Как оценить свою работу
   - На что обращать внимание`
}

function generateCoreConceptsPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Объясни КЛЮЧЕВЫЕ ПОНЯТИЯ темы "${analysis.topic}".

СТРУКТУРА для КАЖДОГО понятия (${analysis.keyTerms.slice(0, 5).join(', ')}):

1. 📖 ОПРЕДЕЛЕНИЕ
   - Простыми словами
   - Формальное определение

2. 🎯 ПРИМЕР
   - Конкретный пример из жизни
   - Пример из ${analysis.connections.industries[0] || 'IT'}

3. 🔗 СВЯЗЬ С ДРУГИМИ ПОНЯТИЯМИ
   - Как связано с предыдущим
   - Как используется дальше

После каждого понятия:
interactive:quiz
question: Проверка понимания
options: 4 варианта
correct: индекс
explanation: разбор

В конце:
interactive:misconception
myth: Распространённое заблуждение
reality: Как на самом деле
why: Почему люди так думают`
}

function generateFundamentalsPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Объясни БАЗОВЫЕ ПОНЯТИЯ темы "${analysis.topic}".

СТРУКТУРА:
1. 📚 ТЕРМИНОЛОГИЯ
   - Определения ключевых терминов: ${analysis.keyTerms.join(', ')}
   - Этимология (откуда слово)

2. 🧱 БАЗОВЫЕ ПРИНЦИПЫ
   - 3-5 фундаментальных правил/законов
   - Почему они работают

3. 🎯 ПРОСТЫЕ ПРИМЕРЫ
   - По 2 примера на каждый принцип
   - От простого к сложному

4. 🔗 КАК ВСЁ СВЯЗАНО
   - Схема связей между понятиями
   - Иерархия концепций

interactive:quiz после каждого принципа
interactive:code если тема техническая`
}

function generateDeepDivePrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай ГЛУБОКОЕ ПОГРУЖЕНИЕ в "${analysis.topic}".

СТРУКТУРА:
1. ⚙️ МЕХАНИЗМ РАБОТЫ
   - Как это работает "под капотом"
   - Пошаговое объяснение процесса

2. 🔬 ДЕТАЛИ И НЮАНСЫ
   - Важные детали, которые часто упускают
   - Edge cases и исключения

3. 📊 ВИЗУАЛИЗАЦИЯ
   - Опиши диаграмму/схему процесса
   - Используй ASCII-арт если нужно

4. 🎯 ПРОДВИНУТЫЕ ПРИМЕРЫ
   - Сложные примеры из ${analysis.connections.industries.join(', ')}
   - Разбор шаг за шагом

5. interactive:code
   language: подходящий
   code: пример реализации
   task: модифицировать код`
}

function generateIntuitionPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай ИНТУИТИВНОЕ ПОНИМАНИЕ сложной темы "${analysis.topic}".

ЦЕЛЬ: Объяснить сложное ПРОСТО, без потери сути.

СТРУКТУРА:
1. 🏠 БЫТОВАЯ АНАЛОГИЯ
   - Найди аналогию из повседневной жизни
   - Объясни, где аналогия работает и где ломается

2. 🎨 ВИЗУАЛЬНАЯ МЕТАФОРА
   - Опиши образ, который поможет запомнить
   - "Представьте, что..."

3. 🧩 УПРОЩЁННАЯ МОДЕЛЬ
   - Модель без математики
   - Ключевые идеи в 3-5 пунктах

4. 🎯 ПРОВЕРКА ИНТУИЦИИ
   - Вопросы "что будет, если..."
   - Парадоксы и их разрешение

interactive:quiz
question: Интуитивный вопрос
options: варианты, проверяющие понимание
correct: индекс
explanation: почему интуиция работает/не работает`
}

function generateFormalTheoryPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай ФОРМАЛЬНУЮ ТЕОРИЮ для "${analysis.topic}".

СТРУКТУРА:
1. 📐 ФОРМАЛЬНЫЕ ОПРЕДЕЛЕНИЯ
   - Строгие математические определения
   - Обозначения и нотация

2. 📝 ТЕОРЕМЫ И ФОРМУЛЫ
   - Ключевые формулы с объяснением каждого символа
   - Используй LaTeX: $формула$ или $$формула$$

3. 🔍 ДОКАЗАТЕЛЬСТВА (упрощённые)
   - Идея доказательства
   - Ключевые шаги

4. 🧮 ВЫЧИСЛЕНИЯ
   - Пошаговые примеры расчётов
   - Типичные значения

5. interactive:code
   language: python
   code: реализация формулы
   task: вычислить для своих данных

interactive:quiz
question: Задача на применение формулы
options: числовые ответы
correct: индекс правильного
explanation: пошаговое решение`
}

function generateAdvancedPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай ПРОДВИНУТЫЙ МАТЕРИАЛ по "${analysis.topic}".

СТРУКТУРА:
1. 🚀 ПРОДВИНУТЫЕ КОНЦЕПЦИИ
   - Темы для углублённого изучения
   - Связь с передовыми исследованиями

2. 🔬 СОВРЕМЕННЫЕ ИССЛЕДОВАНИЯ
   - Актуальные направления в науке
   - Открытые проблемы

3. 🎯 ЭКСПЕРТНЫЕ ТЕХНИКИ
   - Приёмы, которые используют профессионалы
   - Оптимизации и best practices

4. 📚 РЕСУРСЫ ДЛЯ ИЗУЧЕНИЯ
   - Книги, курсы, статьи
   - Сообщества и конференции

interactive:quiz
question: Сложный вопрос для продвинутых
options: варианты требующие глубокого понимания
correct: индекс
explanation: детальный разбор`
}


function generateRealWorldPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Покажи РЕАЛЬНЫЕ ПРИМЕНЕНИЯ "${analysis.topic}".

ИНДУСТРИИ: ${analysis.connections.industries.join(', ')}
ПРИМЕНЕНИЯ: ${analysis.connections.realApplications.join(', ')}

СТРУКТУРА:
1. 🏢 КЕЙСЫ ИЗ ИНДУСТРИИ
   - 3-4 реальных примера использования
   - Конкретные компании и продукты
   - Какую проблему решают

2. 💼 КАРЬЕРНЫЕ ПУТИ
   - Профессии, где это нужно
   - Уровни зарплат (примерные)
   - Что нужно для входа

3. 🔮 ТРЕНДЫ И БУДУЩЕЕ
   - Как развивается область
   - Новые применения

4. 🎯 ПРАКТИЧЕСКИЙ ПРОЕКТ
   - Идея проекта для портфолио
   - Пошаговый план реализации

interactive:quiz
question: Какая компания использует это для...
options: названия компаний
correct: индекс
explanation: детали кейса`
}

function generatePracticePrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай ПРАКТИЧЕСКИЕ ЗАДАНИЯ по "${analysis.topic}".

СТРУКТУРА:
1. 🎯 УРОВЕНЬ 1: НОВИЧОК
   - Простое задание на понимание
   - Пошаговые подсказки
   - Ожидаемый результат

2. 🎯 УРОВЕНЬ 2: ПРАКТИК
   - Задание средней сложности
   - Меньше подсказок
   - Несколько способов решения

3. 🎯 УРОВЕНЬ 3: ЭКСПЕРТ
   - Сложное задание
   - Требует творческого подхода
   - Связь с реальными задачами из ${analysis.connections.industries[0] || 'индустрии'}

4. 🏆 МИНИ-ПРОЕКТ
   - Объединяет все навыки урока
   - Можно добавить в портфолио

interactive:code
language: ${analysis.contentFormats.includes('code_examples') ? 'python' : 'text'}
code: стартовый код/шаблон
task: что нужно реализовать

После каждого уровня:
interactive:quiz для самопроверки`
}

function generateImitationPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай ОБУЧЕНИЕ ЧЕРЕЗ ИМИТАЦИЮ для "${analysis.topic}".

СТРУКТУРА:
1. 👁️ НАБЛЮДЕНИЕ
   - Детальное описание техники эксперта
   - На что обращать внимание
   - Типичные ошибки новичков

2. 🎯 ИМИТАЦИЯ
   - Пошаговое повторение
   - Чек-лист для самопроверки
   - Критерии качества

3. 🔄 ВАРИАЦИИ
   - Как модифицировать технику
   - Эксперименты для понимания

4. 🎨 СОЗДАНИЕ
   - Своя версия на основе изученного
   - Критерии оценки

interactive:quiz
question: Что делает эксперт в момент X?
options: варианты действий
correct: индекс
explanation: почему именно так`
}

function generateProblemSolvingPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай ПРОБЛЕМНО-ОРИЕНТИРОВАННОЕ обучение для "${analysis.topic}".

СТРУКТУРА:
1. 🎯 ПОСТАНОВКА ПРОБЛЕМЫ
   - Реальная проблема из ${analysis.connections.industries[0] || 'практики'}
   - Почему стандартные подходы не работают
   - Что нужно найти/решить

2. 🔍 АНАЛИЗ
   - Разбор проблемы на части
   - Выявление ключевых факторов
   - Формулировка гипотез

3. 💡 СТРАТЕГИИ РЕШЕНИЯ
   - 2-3 подхода к решению
   - Плюсы и минусы каждого
   - Когда какой использовать

4. ✅ РЕШЕНИЕ И АНАЛИЗ
   - Пошаговое решение
   - Проверка результата
   - Что можно улучшить

interactive:code
language: python
code: частичное решение
task: дополнить решение

interactive:quiz
question: Какой подход лучше для ситуации X?
options: стратегии
correct: индекс
explanation: анализ выбора`
}

function generateApplicationPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай ПРИМЕНЕНИЕ ЗНАНИЙ для "${analysis.topic}".

СТРУКТУРА:
1. 📚 РАЗБОР ПРИМЕРОВ
   - 3 детальных примера
   - От простого к сложному
   - Пошаговый разбор каждого

2. 🔍 ПОИСК ПАТТЕРНОВ
   - Что общего в примерах
   - Как распознать ситуацию
   - Алгоритм действий

3. 🎯 ОБОБЩЕНИЕ
   - Универсальные правила
   - Когда применять
   - Ограничения метода

4. 🚀 САМОСТОЯТЕЛЬНОЕ ПРИМЕНЕНИЕ
   - Новая ситуация для анализа
   - Подсказки при необходимости

interactive:quiz
question: К какому типу относится ситуация X?
options: типы/паттерны
correct: индекс
explanation: признаки паттерна`
}

function generateMisconceptionsPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Разбери ЧАСТЫЕ ОШИБКИ И ЗАБЛУЖДЕНИЯ в "${analysis.topic}".

СТРУКТУРА:
1. ⚠️ ТОП-5 ЗАБЛУЖДЕНИЙ
   Для каждого:
   - МИФ: что люди думают неправильно
   - РЕАЛЬНОСТЬ: как на самом деле
   - ПОЧЕМУ: откуда берётся заблуждение
   - КАК ЗАПОМНИТЬ: мнемоника или аналогия

2. 🎯 ТИПИЧНЫЕ ОШИБКИ
   - Ошибки в рассуждениях
   - Ошибки в вычислениях
   - Ошибки в применении

3. ✅ ПРАВИЛЬНОЕ ПОНИМАНИЕ
   - Чек-лист для самопроверки
   - Красные флаги (признаки ошибки)

interactive:misconception (для каждого заблуждения)
myth: формулировка мифа
reality: правильное понимание
why: объяснение

interactive:quiz
question: Выберите НЕВЕРНОЕ утверждение
options: 3 верных + 1 неверное
correct: индекс неверного
explanation: почему это заблуждение`
}

function generateSummaryPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай ИТОГИ И ЗАКРЕПЛЕНИЕ для "${analysis.topic}".

СТРУКТУРА:
1. 📋 КЛЮЧЕВЫЕ ВЫВОДЫ
   - 5-7 главных идей урока
   - Одно предложение на каждую

2. 🗺️ ШПАРГАЛКА
   - Все формулы/правила в одном месте
   - Быстрый справочник

3. 🎯 ЧЕКЛИСТ ПОНИМАНИЯ
   - "Я могу объяснить..."
   - "Я умею..."
   - "Я знаю, когда применять..."

4. 🚀 СЛЕДУЮЩИЕ ШАГИ
   - Что изучить дальше: ${analysis.connections.relatedTopics.join(', ')}
   - Практические проекты
   - Ресурсы для углубления

5. 📚 РЕКОМЕНДУЕМЫЕ РЕСУРСЫ
   - Книги
   - Онлайн-курсы
   - Сообщества

interactive:quiz
question: Финальный тест на понимание
options: варианты
correct: индекс
explanation: связь с материалом урока`
}

function generateDefaultPrompt(analysis: TopicAnalysis, section: CourseSection): string {
  return `Создай контент для секции "${section.title}" по теме "${analysis.topic}".

Описание секции: ${section.description}
Типы контента: ${section.contentTypes.join(', ')}
Интерактивные элементы: ${section.interactiveElements?.join(', ') || 'quiz'}

Используй:
- Живые примеры из ${analysis.connections.industries.join(', ') || 'реальной жизни'}
- Тон: ${analysis.tone}
- Ключевые термины: ${analysis.keyTerms.join(', ')}

Добавь interactive:quiz в конце.`
}

// ═══════════════════════════════════════════════════════════════
// 🚀 ГЛАВНАЯ ФУНКЦИЯ: ЗАПУСК АГЕНТА
// ═══════════════════════════════════════════════════════════════

export async function runLessonAgent(
  topic: string,
  courseName: string,
  userTone?: 'academic' | 'conversational' | 'motivational'
): Promise<{ content: string; analysis: TopicAnalysis; plan: LessonPlan; metadata: any; tasks?: any[] }> {
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`🧠 AI COURSE ARCHITECT: "${topic}"`)
  console.log(`${'═'.repeat(60)}\n`)
  
  // ═══════════════════════════════════════════════════════════════
  // ЭТАП 1: Глубокий анализ темы
  // ═══════════════════════════════════════════════════════════════
  let analysis = await analyzeTopicDeep(topic, courseName)
  
  // Применяем пользовательский тон если указан
  if (userTone) {
    analysis = { ...analysis, tone: userTone }
  }
  
  console.log('[AI Architect] Analysis complete:', {
    nature: analysis.nature,
    complexity: analysis.complexity.base,
    methods: analysis.learningMethods,
    tone: analysis.tone
  })
  
  // ═══════════════════════════════════════════════════════════════
  // ЭТАП 2: Построение структуры курса
  // ═══════════════════════════════════════════════════════════════
  const structure = buildCourseStructure(analysis)
  console.log('[AI Architect] Structure built:', {
    sections: structure.sections.length,
    totalTime: structure.totalTime,
    practiceType: structure.practiceType
  })
  
  // ═══════════════════════════════════════════════════════════════
  // ЭТАП 3: Сбор контекста (RAG)
  // ═══════════════════════════════════════════════════════════════
  let ragContext = ''
  try {
    ragContext = await getRAGContext(topic, courseName)
    if (ragContext) {
      console.log('[AI Architect] RAG context gathered:', ragContext.length, 'chars')
    }
  } catch (e) {
    console.log('[AI Architect] RAG unavailable, continuing without external context')
  }
  
  // ═══════════════════════════════════════════════════════════════
  // ЭТАП 4: Генерация ВСЕГО контента ОДНИМ запросом
  // ═══════════════════════════════════════════════════════════════
  const fullTheory = await generateFullLessonContent(analysis, structure, ragContext)
  
  // ═══════════════════════════════════════════════════════════════
  // ЭТАП 5: Генерация практических заданий
  // ═══════════════════════════════════════════════════════════════
  const tasks = await generatePracticeTasks(analysis, structure)
  
  // ═══════════════════════════════════════════════════════════════
  // ЭТАП 6: Формирование плана урока (для совместимости)
  // ═══════════════════════════════════════════════════════════════
  const plan: LessonPlan = {
    title: structure.title,
    objectives: structure.objectives,
    sections: structure.sections.map(s => ({
      title: s.title,
      type: mapSectionType(s.type),
      keyPoints: s.contentTypes,
      estimatedMinutes: s.estimatedMinutes
    })),
    practiceIdeas: tasks.map(t => t.question || t.title || 'Практическое задание')
  }
  
  console.log(`\n${'═'.repeat(60)}`)
  console.log(`✅ LESSON GENERATED: ${structure.totalTime} min, ${tasks.length} tasks`)
  console.log(`${'═'.repeat(60)}\n`)
  
  const metadata = {
    generatedAt: new Date().toISOString(),
    totalTime: structure.totalTime,
    sectionsCount: structure.sections.length,
    tasksCount: tasks.length,
    complexity: analysis.complexity.base,
    nature: analysis.nature,
    tone: analysis.tone
  }
  
  return { content: fullTheory, analysis, plan, metadata, tasks }
}

function mapSectionType(type: string): 'intro' | 'theory' | 'example' | 'practice' | 'summary' {
  const mapping: Record<string, 'intro' | 'theory' | 'example' | 'practice' | 'summary'> = {
    'conceptual_intro': 'intro',
    'practical_intro': 'intro',
    'context_intro': 'intro',
    'skill_intro': 'intro',
    'creative_intro': 'intro',
    'core_concepts': 'theory',
    'fundamentals': 'theory',
    'deep_dive': 'theory',
    'intuition': 'theory',
    'formal_theory': 'theory',
    'advanced_topics': 'theory',
    'real_world': 'example',
    'hands_on_practice': 'practice',
    'imitation_practice': 'practice',
    'problem_solving': 'practice',
    'application_practice': 'practice',
    'misconceptions': 'example',
    'summary': 'summary'
  }
  return mapping[type] || 'theory'
}


// ═══════════════════════════════════════════════════════════════
// 📝 ГЕНЕРАЦИЯ ПРАКТИЧЕСКИХ ЗАДАНИЙ
// ═══════════════════════════════════════════════════════════════

async function generatePracticeTasks(
  analysis: TopicAnalysis,
  structure: CourseStructure
): Promise<any[]> {
  console.log('[AI Architect] Generating practice tasks...')
  
  const taskPrompt = `Создай 5 ПРАКТИЧЕСКИХ ЗАДАНИЙ по теме "${analysis.topic}".

АНАЛИЗ ТЕМЫ:
- Природа: ${analysis.nature.join(', ')}
- Сложность: ${analysis.complexity.base}/10
- Методы обучения: ${analysis.learningMethods.join(', ')}
- Применения: ${analysis.connections.realApplications.join(', ')}
- Индустрии: ${analysis.connections.industries.join(', ')}

ТРЕБОВАНИЯ К ЗАДАНИЯМ:
1. Градация сложности: 2 лёгких, 2 средних, 1 сложное
2. Разнообразие типов: quiz, calculation, code, analysis, creative
3. Связь с реальностью: примеры из ${analysis.connections.industries[0] || 'IT'}
4. Интерактивность: возможность проверки ответа

ФОРМАТ JSON (массив):
[
  {
    "type": "quiz" | "number" | "code" | "text",
    "difficulty": "easy" | "medium" | "hard",
    "question": "Текст вопроса",
    "context": "Контекст/условие задачи (опционально)",
    "options": ["вариант1", "вариант2", "вариант3", "вариант4"], // для quiz
    "correctAnswer": 0, // индекс для quiz, число для number, строка для text
    "tolerance": 0.01, // для number - допустимая погрешность
    "hint": "Подсказка",
    "explanation": "Подробное объяснение решения",
    "points": 10 | 20 | 30, // очки за задание
    "tags": ["тег1", "тег2"]
  }
]

ПРИМЕРЫ ХОРОШИХ ЗАДАНИЙ:

Для "Теория вероятностей":
- Quiz: "В игре 5% шанс дропа. Какова вероятность НЕ получить предмет за 20 попыток?"
- Number: "Рассчитайте вероятность совпадения дней рождения в группе из 23 человек"
- Code: "Напишите симуляцию Монте-Карло для оценки π"

Для "Приготовление суши":
- Quiz: "Какой рис лучше подходит для суши?"
- Text: "Опишите 3 ключевых этапа приготовления риса для суши"

Верни ТОЛЬКО валидный JSON массив.`

  try {
    const response = await generateCompletion(
      'Ты создатель образовательных заданий. Отвечай ТОЛЬКО валидным JSON массивом.',
      taskPrompt,
      { json: true, temperature: 0.6, maxTokens: 3000 }
    )
    
    const tasks = JSON.parse(response)
    
    // Валидация и нормализация
    return tasks.map((task: any, index: number) => ({
      id: `task-${index + 1}`,
      type: task.type || 'quiz',
      difficulty: task.difficulty || 'medium',
      question: task.question || 'Вопрос',
      context: task.context || '',
      options: task.options || [],
      correctAnswer: task.correctAnswer ?? 0,
      tolerance: task.tolerance || 0.01,
      hint: task.hint || '',
      explanation: task.explanation || '',
      points: task.points || (task.difficulty === 'easy' ? 10 : task.difficulty === 'hard' ? 30 : 20),
      tags: task.tags || [analysis.topic]
    }))
  } catch (e) {
    console.error('[AI Architect] Task generation failed:', e)
    return getDefaultTasks(analysis)
  }
}

function getDefaultTasks(analysis: TopicAnalysis): any[] {
  return [
    {
      id: 'task-1',
      type: 'quiz',
      difficulty: 'easy',
      question: `Что является основной идеей "${analysis.topic}"?`,
      options: [
        'Вариант A',
        'Вариант B', 
        'Вариант C',
        'Вариант D'
      ],
      correctAnswer: 0,
      hint: 'Вспомните определение из теории',
      explanation: 'Это базовое понятие темы',
      points: 10,
      tags: [analysis.topic]
    },
    {
      id: 'task-2',
      type: 'quiz',
      difficulty: 'medium',
      question: `Где применяется "${analysis.topic}" в реальной жизни?`,
      options: analysis.connections.realApplications.length >= 4 
        ? analysis.connections.realApplications.slice(0, 4)
        : ['AI/ML', 'Финтех', 'Геймдев', 'Медицина'],
      correctAnswer: 0,
      hint: 'Подумайте о современных технологиях',
      explanation: 'Это одно из ключевых применений',
      points: 20,
      tags: [analysis.topic, 'применение']
    }
  ]
}

// ═══════════════════════════════════════════════════════════════
// 🔧 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
// ═══════════════════════════════════════════════════════════════

// Старый API для совместимости
export async function createPlanStep(topic: string, courseName: string): Promise<LessonPlan> {
  const analysis = await analyzeTopicDeep(topic, courseName)
  const structure = buildCourseStructure(analysis)
  
  return {
    title: structure.title,
    objectives: structure.objectives,
    sections: structure.sections.map(s => ({
      title: s.title,
      type: mapSectionType(s.type),
      keyPoints: s.contentTypes,
      estimatedMinutes: s.estimatedMinutes
    })),
    practiceIdeas: analysis.connections.realApplications.slice(0, 3)
  }
}

export async function generateContentStep(
  topic: string,
  plan: LessonPlan,
  courseName: string
): Promise<string> {
  const analysis = await analyzeTopicDeep(topic, courseName)
  const structure = buildCourseStructure(analysis)
  
  const contentParts: string[] = []
  for (const section of structure.sections) {
    const content = await generateSectionContent(analysis, section)
    contentParts.push(content)
  }
  
  return contentParts.join('\n\n---\n\n')
}

export async function generateTasksStep(
  topic: string,
  theory: string,
  courseName: string
): Promise<any[]> {
  const analysis = await analyzeTopicDeep(topic, courseName)
  const structure = buildCourseStructure(analysis)
  return generatePracticeTasks(analysis, structure)
}

// ═══════════════════════════════════════════════════════════════
// 📊 ЭКСПОРТ ДОПОЛНИТЕЛЬНЫХ УТИЛИТ
// ═══════════════════════════════════════════════════════════════

export { getDefaultAnalysis, buildCourseStructure as buildStructure }
