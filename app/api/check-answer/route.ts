import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { generateWithRouter, safeParseAIJson } from '@/lib/ai-router'

export const dynamic = 'force-dynamic'

interface CodeCheckResult {
  correct: boolean
  feedback: string
}

interface TextCheckResult {
  correct: boolean
  feedback: string
  suggestion?: string
}

// Валидаторы
function isCodeCheckResult(obj: unknown): obj is CodeCheckResult {
  return typeof obj === 'object' && obj !== null && 
    typeof (obj as CodeCheckResult).correct === 'boolean' && 
    typeof (obj as CodeCheckResult).feedback === 'string'
}

function isTextCheckResult(obj: unknown): obj is TextCheckResult {
  return typeof obj === 'object' && obj !== null && 
    typeof (obj as TextCheckResult).correct === 'boolean' && 
    typeof (obj as TextCheckResult).feedback === 'string'
}

// Список бессмысленных ответов которые ВСЕГДА неправильные
const INVALID_ANSWERS = [
  'не знаю', 'незнаю', 'нз', 'хз', 'не помню', 'непомню', 'не понимаю',
  'не могу', 'затрудняюсь', 'пропустить', 'skip', 'pass', 'idk', 
  "don't know", 'dont know', 'no idea', 'не в курсе', '?', '???',
  'ааа', 'эээ', 'ммм', 'ну', 'да', 'нет', 'может', 'наверное',
  'фиг знает', 'без понятия', 'понятия не имею', 'не уверен'
]

// Расчёт схожести текстов (коэффициент Жаккара по словам)
function calculateSimilarity(text1: string, text2: string): number {
  const normalize = (s: string) => s.toLowerCase()
    .replace(/[.,!?;:'"()\-–—\[\]{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  
  const words1 = normalize(text1).split(' ').filter(w => w.length > 2)
  const words2 = normalize(text2).split(' ').filter(w => w.length > 2)
  
  if (words1.length === 0 || words2.length === 0) return 0
  
  // Считаем пересечение (с учётом частичного совпадения слов)
  let matchCount = 0
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matchCount++
        break
      }
    }
  }
  
  // Коэффициент = пересечение / объединение
  const union = words1.length + words2.length - matchCount
  return union > 0 ? matchCount / union : 0
}

// Проверка на бессмысленный ответ
function isInvalidAnswer(answer: string): boolean {
  const normalized = answer.toLowerCase().trim()
  
  // Проверяем точное совпадение с бессмысленными ответами
  if (INVALID_ANSWERS.some(inv => normalized === inv || normalized.includes(inv))) {
    return true
  }
  
  // Слишком короткий ответ (меньше 5 символов) для развёрнутых вопросов
  if (normalized.length < 5) {
    return true
  }
  
  // Только цифры или спецсимволы
  if (/^[\d\s\W]+$/.test(normalized)) {
    return true
  }
  
  return false
}

// POST /api/check-answer - Проверка ответа через AI (без сохранения в БД)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, question, userAnswer, correctAnswer, testCases, solution, language } = body

    if (!type || !question || !userAnswer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (type === 'code') {
      // Проверка кода
      const trimmedCode = userAnswer.trim()
      
      if (!trimmedCode || trimmedCode.length < 10) {
        return NextResponse.json({ correct: false, feedback: 'Напишите код для решения задачи' })
      }

      const prompt = `Проверь код студента на задание.
ЗАДАНИЕ: ${question}
${testCases ? `ТЕСТ-КЕЙСЫ:\n${testCases.map((tc: { input: string; expected: string }) => `Вход: ${tc.input} → Ожидается: ${tc.expected}`).join('\n')}` : ''}
КОД СТУДЕНТА:
\`\`\`${language || 'code'}
${userAnswer}
\`\`\`
${solution ? `ЭТАЛОННОЕ РЕШЕНИЕ:\n\`\`\`\n${solution}\n\`\`\`` : ''}

ВАЖНО: Если код пустой, содержит только комментарии, или не решает задачу - ответь correct: false.
Оцени код: правильно ли он решает задачу? Ответь в формате JSON:
{"correct": true/false, "feedback": "краткий отзыв на русском"}`

      try {
        const result = await generateWithRouter(
          'fast',
          'Ты строгий эксперт по программированию. Код должен РЕАЛЬНО решать задачу. Пустой код или комментарии = неправильно. Отвечай ТОЛЬКО JSON.',
          prompt,
          { json: true, temperature: 0.3 }
        )

        const parsed = safeParseAIJson<CodeCheckResult>(result.content, isCodeCheckResult)
        if (parsed) {
          return NextResponse.json(parsed)
        }
      } catch (e) {
        console.error('Code check AI error:', e)
      }

      return NextResponse.json({ correct: false, feedback: 'Не удалось проверить код. Попробуйте ещё раз.' })

    } else if (type === 'text') {
      // Проверка текстового ответа - СТРОГАЯ ВЕРСИЯ
      const trimmedAnswer = userAnswer.trim()
      
      // 1. Проверка на пустой ответ
      if (trimmedAnswer.length === 0) {
        return NextResponse.json({ correct: false, feedback: 'Введите ответ', suggestion: 'Напишите развёрнутый ответ на вопрос' })
      }
      
      // 2. Проверка на бессмысленный ответ ("не знаю", "хз" и т.д.)
      if (isInvalidAnswer(trimmedAnswer)) {
        return NextResponse.json({ 
          correct: false, 
          feedback: 'Это не ответ на вопрос', 
          suggestion: 'Попробуйте ответить своими словами, используя знания из теории' 
        })
      }
      
      // 3. Проверка минимальной длины (минимум 10 символов для развёрнутых ответов)
      if (trimmedAnswer.length < 10) {
        return NextResponse.json({ 
          correct: false, 
          feedback: 'Ответ слишком короткий', 
          suggestion: 'Напишите более развёрнутый ответ (минимум 2-3 слова)' 
        })
      }
      
      // 4. Расчёт схожести с эталоном (минимум 40%)
      const similarity = correctAnswer ? calculateSimilarity(trimmedAnswer, correctAnswer) : 0
      console.log(`[TextCheck] Similarity: ${(similarity * 100).toFixed(1)}% | User: "${trimmedAnswer.slice(0, 50)}..." | Correct: "${(correctAnswer || '').slice(0, 50)}..."`)
      
      // 5. Если схожесть меньше 20% - сразу отклоняем без AI
      if (correctAnswer && similarity < 0.2) {
        return NextResponse.json({ 
          correct: false, 
          feedback: 'Ответ не соответствует теме вопроса', 
          suggestion: `Эталонный ответ: ${correctAnswer.slice(0, 200)}${correctAnswer.length > 200 ? '...' : ''}` 
        })
      }

      // 6. AI проверка с СТРОГИМИ правилами
      const prompt = `Ты СТРОГИЙ преподаватель. Проверь ответ студента.

ВОПРОС: ${question}

ЭТАЛОННЫЙ ОТВЕТ: ${correctAnswer || 'Нет эталона'}

ОТВЕТ СТУДЕНТА: ${trimmedAnswer}

СХОЖЕСТЬ ТЕКСТОВ: ${(similarity * 100).toFixed(0)}%

════════════════════════════════════════
СТРОГИЕ ПРАВИЛА ПРОВЕРКИ:
════════════════════════════════════════

ОТВЕТ НЕПРАВИЛЬНЫЙ (correct: false), если:
- Студент написал "не знаю", "не помню", "затрудняюсь" и подобное
- Ответ не по теме вопроса
- Ответ слишком общий и не содержит конкретики
- Схожесть с эталоном меньше 40%
- Ответ содержит грубые фактические ошибки

ОТВЕТ ПРАВИЛЬНЫЙ (correct: true), ТОЛЬКО если:
- Содержит минимум 40% ключевых идей из эталона
- По смыслу отвечает на поставленный вопрос
- Нет грубых фактических ошибок

НЕ ЗАСЧИТЫВАЙ ответы типа:
- "это важно для понимания" (слишком общо)
- "помогает в работе" (не конкретно)
- Любые отговорки и уклонения от ответа

Ответь СТРОГО в формате JSON:
{"correct": true/false, "feedback": "краткая оценка", "suggestion": "что нужно исправить или добавить"}`

      try {
        const result = await generateWithRouter(
          'fast',
          'Ты СТРОГИЙ преподаватель. НЕ засчитывай бессмысленные ответы. Требуй конкретики. Отвечай ТОЛЬКО JSON.',
          prompt,
          { json: true, temperature: 0.1 } // Низкая температура для строгости
        )

        const parsed = safeParseAIJson<TextCheckResult>(result.content, isTextCheckResult)
        if (parsed) {
          // Дополнительная проверка: если AI засчитал, но схожесть < 40% - не засчитываем
          if (parsed.correct && correctAnswer && similarity < 0.4) {
            console.log(`[TextCheck] AI approved but similarity too low (${(similarity * 100).toFixed(0)}%), rejecting`)
            return NextResponse.json({ 
              correct: false, 
              feedback: 'Ответ недостаточно полный', 
              suggestion: `Добавьте больше деталей. Эталон: ${correctAnswer.slice(0, 150)}...` 
            })
          }
          return NextResponse.json(parsed)
        }
      } catch (e) {
        console.error('Text check AI error:', e)
      }

      // Fallback: проверка по схожести (минимум 40%)
      if (correctAnswer && similarity >= 0.4) {
        return NextResponse.json({ correct: true, feedback: 'Правильно!', suggestion: '' })
      }

      return NextResponse.json({ 
        correct: false, 
        feedback: 'Ответ не соответствует эталону', 
        suggestion: correctAnswer ? `Эталонный ответ: ${correctAnswer.slice(0, 200)}` : 'Изучите теорию и попробуйте снова' 
      })

    } else if (type === 'multiple') {
      // Проверка множественного выбора через AI
      const { userAnswer, correctAnswer, allOptions } = body
      
      if (!Array.isArray(userAnswer) || userAnswer.length === 0) {
        return NextResponse.json({ correct: false, feedback: 'Выберите хотя бы один вариант' })
      }

      const prompt = `Проверь ответ студента на вопрос с множественным выбором.

ВОПРОС: ${question}

ВСЕ ВАРИАНТЫ: ${allOptions?.join(', ') || 'не указаны'}

ВЫБРАНО СТУДЕНТОМ: ${userAnswer.join(', ')}

ПРАВИЛЬНЫЕ ОТВЕТЫ (по ключу): ${Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}

ПРАВИЛА:
1. Если студент выбрал ВСЕ правильные варианты и НЕ выбрал неправильные - это correct: true
2. Если студент выбрал правильные варианты, но также выбрал лишние неправильные - это correct: false
3. Если студент выбрал не все правильные варианты - это correct: false
4. Анализируй по СМЫСЛУ - если ключ ответа неверный, но студент выбрал реально правильные варианты - засчитай!

Ответь СТРОГО в формате JSON:
{"correct": true/false, "feedback": "краткое объяснение на русском", "suggestion": "какие варианты были правильными"}`

      try {
        const result = await generateWithRouter(
          'fast',
          'Ты эксперт по проверке тестов. Анализируй по смыслу, а не только по ключу. Отвечай ТОЛЬКО JSON.',
          prompt,
          { json: true, temperature: 0.2 }
        )

        const parsed = safeParseAIJson<TextCheckResult>(result.content, isTextCheckResult)
        if (parsed) {
          return NextResponse.json(parsed)
        }
      } catch (e) {
        console.error('Multiple check AI error:', e)
      }

      // Fallback: простая проверка по массивам
      const userArr = userAnswer.map((s: string) => s.toLowerCase().trim())
      const correctArr = (Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer]).map((s: string) => s.toLowerCase().trim())
      
      const allCorrectSelected = correctArr.every((c: string) => userArr.includes(c))
      const noExtraSelected = userArr.every((u: string) => correctArr.includes(u))
      
      if (allCorrectSelected && noExtraSelected) {
        return NextResponse.json({ correct: true, feedback: 'Правильно!', suggestion: '' })
      }
      
      return NextResponse.json({ 
        correct: false, 
        feedback: 'Не все правильные варианты выбраны или выбраны лишние',
        suggestion: `Правильные ответы: ${Array.isArray(correctAnswer) ? correctAnswer.join(', ') : correctAnswer}`
      })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  } catch (error) {
    console.error('Error checking answer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
