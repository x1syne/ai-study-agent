/**
 * Groq Client для генерации текста
 * 
 * Обёртка над существующим AI роутером для использования в сервисах.
 */

import { generateCompletion } from '@/lib/groq'

export interface GenerateTextOptions {
  maxTokens?: number
  temperature?: number
  json?: boolean
}

/**
 * Генерация текста через LLM
 */
export async function generateText(
  prompt: string,
  options: GenerateTextOptions = {}
): Promise<string> {
  const { maxTokens = 1000, temperature = 0.7, json = false } = options

  try {
    const result = await generateCompletion(
      'Ты — полезный ассистент. Отвечай на русском языке.',
      prompt,
      {
        maxTokens,
        temperature,
        json
      }
    )

    return result.trim()
  } catch (error) {
    console.error('Error generating text:', error)
    throw error
  }
}

/**
 * Генерация структурированного JSON ответа
 */
export async function generateJSON<T>(
  prompt: string,
  options: Omit<GenerateTextOptions, 'json'> = {}
): Promise<T> {
  const result = await generateText(prompt, { ...options, json: true })
  
  try {
    return JSON.parse(result) as T
  } catch (error) {
    console.error('Error parsing JSON response:', error)
    throw new Error('Failed to parse AI response as JSON')
  }
}

export default { generateText, generateJSON }
