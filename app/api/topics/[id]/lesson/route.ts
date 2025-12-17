import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { generateCompletion } from '@/lib/groq'
import { SYSTEM_PROMPTS } from '@/lib/ai/prompts'
import { getScientificContext } from '@/lib/arxiv'
import { getBookContext } from '@/lib/openlibrary'
import { getRAGContext } from '@/lib/search'
import { runLessonAgent } from '@/lib/ai/agent'

const USE_AGENT = process.env.USE_AI_AGENT === 'true'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[API] Fetching lesson for topic:', params.id)
    
    const user = await getCurrentUser()
    if (!user) {
      console.log('[API] User not authenticated')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[API] User authenticated:', user.id)

    const { searchParams } = new URL(_request.url)
    const lessonType = searchParams.get('type') || 'theory'
    console.log('[API] Lesson type:', lessonType)

    const topic = await prisma.topic.findUnique({
      where: { id: params.id },
      include: {
        goal: true,
        lessons: { where: { type: lessonType.toUpperCase() as any }, orderBy: { order: 'asc' } },
        progress: { where: { userId: user.id } },
      },
    })

    console.log('[API] Topic found:', !!topic)
    if (topic) {
      console.log('[API] Topic belongs to goal:', topic.goal.id, 'owned by:', topic.goal.userId)
      console.log('[API] Current user:', user.id)
      console.log('[API] Progress records:', topic.progress.length)
    }

    if (!topic) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    // Проверяем доступ к цели
    if (topic.goal.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let progress = topic.progress[0]
    if (!progress) {
      progress = await prisma.topicProgress.create({
        data: { userId: user.id, topicId: topic.id, status: 'AVAILABLE' },
      })
    }

    // Если тема заблокирована, проверяем пререквизиты
    if (progress.status === 'LOCKED') {
      // Получаем все темы цели с прогрессом
      const allTopics = await prisma.topic.findMany({
        where: { goalId: topic.goalId },
        include: { progress: { where: { userId: user.id } } }
      })

      // Проверяем, выполнены ли все пререквизиты
      const prerequisitesMet = topic.prerequisiteIds.every(prereqId => {
        const prereqTopic = allTopics.find(t => t.id === prereqId)
        if (!prereqTopic) return true // Если пререквизит не найден, считаем выполненным
        const prereqProgress = prereqTopic.progress[0]
        return prereqProgress && (prereqProgress.status === 'COMPLETED' || prereqProgress.status === 'MASTERED')
      })

      // Если пререквизиты выполнены, разблокируем тему
      if (prerequisitesMet) {
        progress = await prisma.topicProgress.update({
          where: { id: progress.id },
          data: { status: 'AVAILABLE' }
        })
      }
    }

    if (topic.lessons.length > 0) {
      const existingLesson = topic.lessons[0]
      if (lessonType === 'practice') {
        const content = existingLesson.content as any
        if (!content?.tasks || !Array.isArray(content.tasks) || content.tasks.length === 0) {
          await prisma.lesson.delete({ where: { id: existingLesson.id } })
        } else {
          return NextResponse.json({
            topic: { id: topic.id, name: topic.name, description: topic.description, icon: topic.icon },
            lesson: existingLesson,
            progress,
          })
        }
      } else {
        return NextResponse.json({
          topic: { id: topic.id, name: topic.name, description: topic.description, icon: topic.icon },
          lesson: existingLesson,
          progress,
        })
      }
    }

    let content: any

    if (lessonType === 'theory') {
      try {
        if (USE_AGENT) {
          const userTone = searchParams.get('tone') as 'academic' | 'conversational' | 'motivational' | null
          const agentResult = await runLessonAgent(topic.name, topic.goal.title, userTone || undefined)
          content = { 
            markdown: agentResult.content,
            analysis: agentResult.analysis,
            plan: agentResult.plan,
            metadata: agentResult.metadata
          }
        } else {
          const [scientificContext, bookContext, ragContext] = await Promise.all([
            getScientificContext(topic.name, topic.goal.title),
            getBookContext(topic.name),
            getRAGContext(topic.name, topic.goal.title)
          ])
          const allContext = [scientificContext, bookContext, ragContext].filter(Boolean).join('\n\n')
          const prompt = getTheoryPrompt(topic.name, topic.goal.title, allContext)
          const response = await generateCompletion(SYSTEM_PROMPTS.theory, prompt, { temperature: 0.7, maxTokens: 16000 })
          content = { markdown: response }
        }
      } catch (e) {
        console.error('AI generation failed:', e)
        content = { markdown: getFallbackTheory(topic.name, topic.description, topic.goal.title) }
      }
    } else if (lessonType === 'practice') {
      const theoryLesson = await prisma.lesson.findFirst({ where: { topicId: topic.id, type: 'THEORY' } })
      if (theoryLesson?.content) {
        const theoryContent = (theoryLesson.content as any).markdown || ''
        content = await generatePracticeFromTheory(topic.name, topic.goal.title, theoryContent)
      } else {
        content = await generatePracticeTasks(topic.name, topic.goal.title)
      }
    } else {
      content = await generateOtherTask(topic.name, topic.goal.title)
    }

    const lesson = await prisma.lesson.create({
      data: {
        topicId: topic.id,
        userId: user.id,
        type: lessonType.toUpperCase() as any,
        title: lessonType === 'theory' ? 'Теория: ' + topic.name : 'Практика: ' + topic.name,
        content,
        difficulty: topic.difficulty,
        hints: content?.hints || [],
        solution: content?.solution,
      },
    })

    if (progress.status === 'AVAILABLE') {
      await prisma.topicProgress.update({ where: { id: progress.id }, data: { status: 'IN_PROGRESS' } })
    }

    return NextResponse.json({
      topic: { id: topic.id, name: topic.name, description: topic.description, icon: topic.icon },
      lesson,
      progress: { ...progress, status: 'IN_PROGRESS' },
    })
  } catch (error) {
    console.error('Error fetching lesson:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const progress = await prisma.topicProgress.findFirst({ where: { topicId: params.id, userId: user.id } })
    if (!progress) return NextResponse.json({ error: 'Progress not found' }, { status: 404 })

    await prisma.topicProgress.update({
      where: { id: progress.id },
      data: { theoryCompleted: true, masteryLevel: Math.min(progress.masteryLevel + 30, 100) },
    })

    const existingStats = await prisma.userStats.findUnique({ where: { userId: user.id } })
    if (existingStats) {
      await prisma.userStats.update({ where: { userId: user.id }, data: { totalLessons: { increment: 1 }, lastActiveDate: new Date() } })
    } else {
      await prisma.userStats.create({ data: { userId: user.id, totalLessons: 1, lastActiveDate: new Date() } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error completing lesson:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getTheoryPrompt(topicName: string, courseTitle: string, context: string): string {
  const base = 'Ты профессор ведущего университета. Напиши ПОЛНОЦЕННУЮ ЛЕКЦИЮ по теме: "' + topicName + '"\n\nКонтекст курса: ' + courseTitle
  const contextPart = context ? '\n\n[ИСТОЧНИКИ]:\n' + context : ''
  const structure = '\n\n## ВВЕДЕНИЕ\n## ТЕОРЕТИЧЕСКИЕ ОСНОВЫ\n## ГЛУБОКИЙ АНАЛИЗ\n## ПРАКТИЧЕСКИЕ ПРИМЕРЫ\n## ПРОДВИНУТЫЙ УРОВЕНЬ\n## ТИПИЧНЫЕ ОШИБКИ\n## ИТОГИ\n\nТРЕБОВАНИЯ: МИНИМУМ 6000 слов, Markdown'
  return base + contextPart + structure
}

function getFallbackTheory(name: string, description: string | null, courseTitle: string): string {
  return '# ' + name + '\n\n## Введение\n' + (description || 'Добро пожаловать в изучение темы!') + '\n\nЭта тема является частью курса "' + courseTitle + '".\n\n## Основные понятия\nВ рамках данной темы вы изучите ключевые концепции.\n\n---\n*Полная версия генерируется AI.*'
}

async function generatePracticeFromTheory(topicName: string, courseTitle: string, theoryContent: string) {
  try {
    const theoryExcerpt = theoryContent.slice(0, 8000)
    
    // Определяем тип темы для правильной практики
    const topicLower = (topicName + courseTitle).toLowerCase()
    const isProgramming = /программирование|python|javascript|c\+\+|java|react|sql|код|функци|алгоритм|массив|указател|переменн|struct|class|oop|ооп/i.test(topicLower)
    const isPhysics = /физик|механик|термодинамик|электричеств|магнит|оптик|квант|кинематик|динамик|энерги|импульс|волн|колебан|сила|скорость|ускорен|давлен|мощност/i.test(topicLower)
    const isChemistry = /хими|реакци|молекул|атом|элемент|вещество|раствор|кислот|основан|соль|окислен|восстановлен|моль|концентрац/i.test(topicLower)
    const isMath = /математик|алгебр|геометр|уравнен|формул|вычисл|интеграл|производн|предел|вероятност|статистик|егэ|огэ|тригонометр|логарифм|функци|матриц|вектор|комплексн/i.test(topicLower)
    const isEconomics = /экономик|финанс|бухгалтер|процент|кредит|инвестиц|прибыл|убыт|баланс|актив|пассив|налог/i.test(topicLower)
    const isEngineering = /инженер|электроник|схем|сопромат|строител|архитектур|черчен|autocad|solidworks/i.test(topicLower)
    const isDataScience = /data science|машинн|обучен|нейрон|статистик|анализ данн|big data|ml|ai|искусствен|интеллект/i.test(topicLower)
    const isLanguage = /английск|немецк|французск|испанск|язык|грамматик|слов|перевод|english|german|литератур|сочинен/i.test(topicLower)
    
    let practiceInstructions = ''
    
    if (isProgramming) {
      // Определяем язык программирования
      const langMatch = (topicName + courseTitle).toLowerCase()
      let progLang = 'cpp'
      if (/python/i.test(langMatch)) progLang = 'python'
      else if (/javascript|js|react|node/i.test(langMatch)) progLang = 'javascript'
      else if (/java(?!script)/i.test(langMatch)) progLang = 'java'
      else if (/c\+\+|cpp|указател|массив/i.test(langMatch)) progLang = 'cpp'
      
      practiceInstructions = `
ЭТО ТЕМА ПО ПРОГРАММИРОВАНИЮ! Создай МИНИМУМ 18 заданий:

БЛОК 1 - ТЕОРИЯ (3 задания, type: "single"):
- Вопросы "что делает этот код", "какой результат выведет"
- Проверка понимания синтаксиса

БЛОК 2 - ПРАКТИКА КОДА (15 заданий, type: "code"):
Задания где пользователь САМ ПИШЕТ КОД!

Язык программирования: ${progLang}

Формат КАЖДОГО code задания:
{
  "type": "code",
  "difficulty": "easy" | "medium" | "hard",
  "question": "Напишите функцию/программу которая...",
  "language": "${progLang}",
  "starterCode": "// Начните писать код здесь\\n",
  "testCases": [
    {"input": "5", "expected": "25"},
    {"input": "3", "expected": "9"}
  ],
  "hint": "Подсказка по алгоритму",
  "explanation": "Объяснение решения",
  "solution": "полный код решения"
}

РАСПРЕДЕЛЕНИЕ ПО СЛОЖНОСТИ:
- 5 заданий easy: простые функции, базовые операции
- 6 заданий medium: циклы, условия, работа с данными
- 4 задания hard: сложные алгоритмы, оптимизация

ПРИМЕРЫ ЗАДАНИЙ (адаптируй под тему "${topicName}"):

Easy:
- "Напишите функцию, которая возвращает квадрат числа"
- "Напишите функцию, которая проверяет чётность числа"
- "Напишите функцию, которая находит максимум из двух чисел"

Medium:
- "Напишите функцию, которая находит сумму элементов массива"
- "Напишите функцию, которая переворачивает строку"
- "Напишите функцию сортировки пузырьком"

Hard:
- "Напишите функцию бинарного поиска"
- "Реализуйте связный список с методами add/remove"
- "Напишите функцию для решения задачи рекурсивно"

ВАЖНО: Каждое задание должно иметь solution с ПОЛНЫМ рабочим кодом!`
    } else if (isPhysics) {
      practiceInstructions = `
ЭТО ТЕМА ПО ФИЗИКЕ! Создай МИНИМУМ 18 РАЗНООБРАЗНЫХ заданий:

БЛОК 1 - ТЕОРИЯ (3 задания, type: "single"):
- Проверка понимания законов и формул

БЛОК 2 - РАСЧЁТНЫЕ ЗАДАЧИ (15 заданий, type: "number"):

КРИТИЧЕСКИ ВАЖНО - РАЗНООБРАЗИЕ ЗАДАЧ:
НЕ ДЕЛАЙ одинаковые задачи с разными числами!
Каждая задача должна быть УНИКАЛЬНОЙ по:
- Типу физического явления
- Применяемым формулам
- Контексту (разные ситуации из жизни)
- Способу решения

ПРИМЕРЫ РАЗНООБРАЗНЫХ ЗАДАЧ по кинематике:
1. Найти скорость по пути и времени
2. Найти время падения с высоты
3. Задача на встречное движение двух тел
4. Найти ускорение по графику v(t)
5. Задача на движение под углом к горизонту
6. Найти тормозной путь автомобиля
7. Задача на относительную скорость
8. Найти максимальную высоту подъёма
9. Задача на обгон (когда догонит)
10. Найти среднюю скорость при неравномерном движении
11. Задача на свободное падение с начальной скоростью
12. Найти перемещение по уравнению движения
13. Задача на движение по окружности
14. Найти время до остановки при торможении
15. Комбинированная задача (несколько этапов движения)

Формат:
{
  "type": "number",
  "difficulty": "easy" | "medium" | "hard",
  "question": "УНИКАЛЬНОЕ условие задачи...",
  "correctAnswer": число,
  "tolerance": 0.1,
  "hint": "Подсказка",
  "explanation": "Пошаговое решение"
}

РАСПРЕДЕЛЕНИЕ: 5 easy, 6 medium, 4 hard`
    } else if (isChemistry) {
      practiceInstructions = `
ЭТО ТЕМА ПО ХИМИИ! Создай МИНИМУМ 18 РАЗНООБРАЗНЫХ заданий:

БЛОК 1 - ТЕОРИЯ (3 задания, type: "single")

БЛОК 2 - РАСЧЁТНЫЕ ЗАДАЧИ (15 заданий, type: "number"):

КРИТИЧЕСКИ ВАЖНО - РАЗНООБРАЗИЕ:
НЕ ДЕЛАЙ одинаковые задачи с разными числами!
Каждая задача должна быть УНИКАЛЬНОЙ!

ПРИМЕРЫ РАЗНООБРАЗНЫХ ЗАДАЧ:
1. Найти массу вещества по количеству моль
2. Найти объём газа при н.у.
3. Рассчитать массовую долю элемента
4. Найти количество вещества по массе
5. Задача на растворы (концентрация)
6. Расчёт по уравнению реакции
7. Найти массу осадка
8. Задача на избыток-недостаток
9. Найти объём газа по реакции
10. Задача на смеси веществ
11. Расчёт теплового эффекта
12. Найти выход продукта реакции
13. Задача на электролиз
14. Расчёт pH раствора
15. Комбинированная задача

Формат:
{
  "type": "number",
  "difficulty": "easy" | "medium" | "hard",
  "question": "УНИКАЛЬНОЕ условие...",
  "correctAnswer": число,
  "tolerance": 0.01,
  "hint": "Подсказка",
  "explanation": "Пошаговое решение"
}

РАСПРЕДЕЛЕНИЕ: 5 easy, 6 medium, 4 hard`
    } else if (isEconomics || isEngineering || isDataScience) {
      practiceInstructions = `
ЭТО ТЕМА С ВЫЧИСЛЕНИЯМИ! Создай МИНИМУМ 18 РАЗНООБРАЗНЫХ заданий:

БЛОК 1 - ТЕОРИЯ (3 задания, type: "single")

БЛОК 2 - РАСЧЁТНЫЕ ЗАДАЧИ (15 заданий, type: "number"):

КРИТИЧЕСКИ ВАЖНО - РАЗНООБРАЗИЕ:
НЕ ДЕЛАЙ одинаковые задачи с разными числами!
Каждая задача должна проверять РАЗНЫЙ навык или применять РАЗНУЮ формулу!

Формат:
{
  "type": "number",
  "difficulty": "easy" | "medium" | "hard",
  "question": "УНИКАЛЬНОЕ условие задачи...",
  "correctAnswer": число,
  "tolerance": 0.01,
  "hint": "Подсказка",
  "explanation": "Пошаговое решение"
}

РАСПРЕДЕЛЕНИЕ: 5 easy, 6 medium, 4 hard`
    } else if (isMath) {
      practiceInstructions = `
ЭТО МАТЕМАТИЧЕСКАЯ ТЕМА! Создай МИНИМУМ 18 заданий:

БЛОК 1 - ТЕОРИЯ (3 задания, type: "single"):
- Проверка понимания определений и теорем

БЛОК 2 - ЗАДАЧИ (15 заданий, type: "number"):
Задачи где пользователь РЕШАЕТ и ВЫЧИСЛЯЕТ!

Формат:
{
  "type": "number",
  "difficulty": "easy" | "medium" | "hard",
  "question": "Решите уравнение: 2x + 5 = 15",
  "correctAnswer": 5,
  "tolerance": 0.01,
  "hint": "Перенесите 5 в правую часть",
  "explanation": "2x + 5 = 15\\n2x = 15 - 5\\n2x = 10\\nx = 5"
}

РАСПРЕДЕЛЕНИЕ ПО СЛОЖНОСТИ:
- 5 easy: простые вычисления, подстановка в формулу
- 6 medium: задачи в 2-3 шага, преобразования
- 4 hard: сложные задачи, нестандартные методы

ВАЖНО: Каждая задача должна иметь ЧИСЛОВОЙ ответ!`
    } else if (isLanguage) {
      practiceInstructions = `
ЭТО ЯЗЫКОВАЯ ТЕМА! Создай 20 заданий:

БЛОК 1 - ТЕОРИЯ (5 заданий, type: "single"):
- Правила грамматики, выбор правильной формы

БЛОК 2 - ПРАКТИКА (15 заданий):
- type: "text" - перевод фраз, вставить слово
- type: "single" - выбрать правильный перевод
- type: "multiple" - выбрать все правильные варианты

Формат:
{
  "type": "text",
  "question": "Переведите: 'Я изучаю программирование'",
  "correctAnswer": "I am studying programming",
  "hint": "Present Continuous",
  "explanation": "Используем Present Continuous для действия в процессе"
}`
    } else {
      practiceInstructions = `
Создай 15 заданий разных типов:

БЛОК 1 - ТЕОРИЯ (5 заданий, type: "single"):
- Проверка понимания ключевых концепций

БЛОК 2 - ПРИМЕНЕНИЕ (10 заданий):
- type: "single" - анализ ситуаций
- type: "text" - развёрнутые ответы
- type: "multiple" - выбор нескольких правильных`
    }

    const prompt = `СТРОГО по материалу теории создай практические задания!

ТЕМА: "${topicName}"
КУРС: "${courseTitle}"

ТЕОРИЯ (используй ТОЛЬКО этот материал):
${theoryExcerpt}

ИНСТРУКЦИИ:
${practiceInstructions}

════════════════════════════════════════════════════════════
КРИТИЧЕСКИ ВАЖНО - РАЗНООБРАЗИЕ ЗАДАЧ:
════════════════════════════════════════════════════════════
ЗАПРЕЩЕНО делать однотипные задачи где меняются только числа!

Каждая задача должна быть УНИКАЛЬНОЙ:
- Разные формулировки вопросов
- Разные типы задач (найти X, доказать Y, объяснить Z)
- Разные контексты и ситуации
- Разные применяемые концепции из теории
- Разные способы решения

ПЛОХО (шаблонно):
1. "Найдите скорость если путь 10 м, время 2 с"
2. "Найдите скорость если путь 20 м, время 4 с"
3. "Найдите скорость если путь 30 м, время 6 с"

ХОРОШО (разнообразно):
1. "Найдите скорость если путь 10 м, время 2 с"
2. "За какое время пешеход пройдёт 3 км со скоростью 5 км/ч?"
3. "Два поезда выехали навстречу. Через сколько встретятся?"
4. "Найдите среднюю скорость если первую половину пути ехали 60 км/ч, вторую 40 км/ч"
5. "Велосипедист обогнал пешехода. На сколько раньше он прибудет?"

Прогрессия от easy к hard.
Верни JSON: { "tasks": [...] }`
    
    console.log('[Practice] Generating tasks for topic type:', isProgramming ? 'PROGRAMMING' : isMath ? 'MATH' : isLanguage ? 'LANGUAGE' : 'GENERAL')
    const response = await generateCompletion(SYSTEM_PROMPTS.taskGeneration, prompt, { json: true, temperature: 0.6, maxTokens: 12000 })
    const content = JSON.parse(response)
    
    if (!content.tasks || content.tasks.length < 3) throw new Error('Invalid tasks')
    console.log('[Practice] Generated ' + content.tasks.length + ' tasks')
    return content
  } catch (e) {
    console.error('Practice from theory failed:', e)
    return generatePracticeTasks(topicName, courseTitle)
  }
}

async function generatePracticeTasks(topicName: string, courseTitle: string) {
  try {
    const prompt = `Создай 10 практических заданий СТРОГО по теме: "${topicName}"
Курс: "${courseTitle}"

КРИТИЧЕСКИ ВАЖНО:
- Задания должны быть ТОЛЬКО по теме "${topicName}"
- НЕ добавляй другие темы (если тема "Задание 12 ЕГЭ" - только про это задание)
- Изучи что входит в эту тему и создай задания по этому материалу

СТРУКТУРА:
- 3 задания easy (базовое понимание)
- 4 задания medium (применение)
- 3 задания hard (сложные случаи)

ТИПЫ:
- 5 типа "single" (один правильный)
- 2 типа "multiple" (несколько правильных)
- 2 типа "number" (числовой ответ, tolerance: 0.01)
- 1 типа "text" (короткий ответ)

ФОРМАТ:
{
  "type": "single",
  "difficulty": "easy",
  "question": "Вопрос по теме ${topicName}",
  "options": ["A", "B", "C", "D"],
  "correctAnswer": 0,
  "hint": "Подсказка",
  "explanation": "Объяснение"
}

Верни JSON: { "tasks": [...] }`

    const response = await generateCompletion(SYSTEM_PROMPTS.taskGeneration, prompt, { json: true, temperature: 0.6, maxTokens: 8000 })
    const content = JSON.parse(response)
    if (!content.tasks || content.tasks.length < 3) throw new Error('Invalid tasks')
    return content
  } catch (e) {
    console.error('Practice generation failed:', e)
    return {
      tasks: [{
        id: 1, type: 'single', difficulty: 'easy',
        question: `Какой ключевой навык проверяется в теме "${topicName}"?`,
        options: ['Понимание базовых концепций', 'Применение формул', 'Анализ данных', 'Все перечисленное'],
        correctAnswer: 3, hint: 'Подумай о комплексном подходе', explanation: `Тема "${topicName}" требует комплексного понимания материала.`
      }]
    }
  }
}

async function generateOtherTask(topicName: string, courseTitle: string) {
  try {
    const prompt = 'Создай задание по теме "' + topicName + '" для курса "' + courseTitle + '"'
    const response = await generateCompletion(SYSTEM_PROMPTS.taskGeneration, prompt, { json: true, temperature: 0.8 })
    return JSON.parse(response)
  } catch {
    return { taskType: 'quiz', title: 'Практика: ' + topicName, description: 'Ответьте на вопрос' }
  }
}
