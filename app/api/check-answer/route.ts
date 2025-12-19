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
      // Проверка текстового ответа
      const trimmedAnswer = userAnswer.trim()
      
      if (trimmedAnswer.length === 0) {
        return NextResponse.json({ correct: false, feedback: 'Введите ответ', suggestion: 'Напишите хотя бы несколько слов' })
      }
      
      if (trimmedAnswer.length < 3) {
        return NextResponse.json({ correct: false, feedback: 'Ответ слишком короткий', suggestion: 'Напишите более развёрнутый ответ' })
      }

      const prompt = `Ты — терпеливый репетитор. Проверь ответ студента на вопрос.

ВОПРОС: ${question}

ЭТАЛОННЫЙ ОТВЕТ: ${correctAnswer || 'Нет эталона'}

ОТВЕТ СТУДЕНТА: ${trimmedAnswer}

ПРАВИЛА ПРОВЕРКИ:
1. Анализируй СМЫСЛ ответа, а не буквальное совпадение слов
2. Ответ ПРАВИЛЬНЫЙ, если содержит ключевые идеи эталона, даже если:
   - Сформулирован другими словами
   - Более краткий, но по сути верный
   - Есть незначительные стилистические отличия
3. Если ответ верный по смыслу, но неполный — это всё равно "correct": true, но укажи что можно добавить
4. Будь лоялен к студенту — если есть сомнения, засчитывай в пользу студента

Ответь СТРОГО в формате JSON:
{"correct": true/false, "feedback": "краткая оценка на русском", "suggestion": "что можно улучшить или добавить"}`

      try {
        const result = await generateWithRouter(
          'fast',
          'Ты добрый репетитор. Оценивай по смыслу, не по буквам. Отвечай ТОЛЬКО JSON без markdown.',
          prompt,
          { json: true, temperature: 0.3 }
        )

        const parsed = safeParseAIJson<TextCheckResult>(result.content, isTextCheckResult)
        if (parsed) {
          return NextResponse.json(parsed)
        }
      } catch (e) {
        console.error('Text check AI error:', e)
      }

      // Fallback: простая проверка
      if (correctAnswer) {
        const normalize = (s: string) => s.toLowerCase().replace(/[.,!?;:'"()\-–—]/g, '').replace(/\s+/g, ' ').trim()
        const userNorm = normalize(trimmedAnswer)
        const ansNorm = normalize(correctAnswer)
        
        if (userNorm === ansNorm || userNorm.includes(ansNorm) || ansNorm.includes(userNorm)) {
          return NextResponse.json({ correct: true, feedback: 'Правильно!', suggestion: '' })
        }
      }

      return NextResponse.json({ 
        correct: false, 
        feedback: 'Ответ не совсем точный', 
        suggestion: correctAnswer ? `Эталонный ответ: ${correctAnswer.slice(0, 150)}` : '' 
      })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })

  } catch (error) {
    console.error('Error checking answer:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
