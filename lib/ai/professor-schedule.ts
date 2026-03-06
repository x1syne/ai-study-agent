/**
 * Модуль для работы с расписанием профессора Остроуха
 */

import { getOstroukhSchedule, formatScheduleForChat, getCurrentOrNextLesson } from '../madi/schedule-api'

/**
 * Получить расписание профессора Остроуха на основе запроса
 */
export async function getOstroukhScheduleContext(query: string): Promise<string> {
  const today = new Date()
  const lowerQuery = query.toLowerCase()
  
  // Если спрашивают про всю неделю
  if (lowerQuery.includes('неделя') || lowerQuery.includes('недел')) {
    const { getWeekSchedule } = await import('../madi/schedule-api')
    const weekSchedule = await getWeekSchedule()
    
    let response = '📅 **Расписание на неделю:**\n\n'
    weekSchedule.days.forEach(day => {
      if (day.lessons.length > 0) {
        response += `**${day.dayOfWeek}** (${day.date}):\n`
        day.lessons.forEach(lesson => {
          const emoji = lesson.type === 'lecture' ? '📚' : lesson.type === 'practice' ? '💻' : '🔬'
          response += `  ${emoji} ${lesson.time} - ${lesson.subject}\n`
          response += `     📍 ${lesson.room}${lesson.building ? `, ${lesson.building}` : ''}\n`
          if (lesson.group) {
            response += `     👥 ${lesson.group}\n`
          }
        })
        response += '\n'
      }
    })
    
    return response
  }
  
  let targetDate = today
  
  // Определяем день недели из запроса
  if (lowerQuery.includes('завтра')) {
    targetDate = new Date(today)
    targetDate.setDate(today.getDate() + 1)
  } else if (lowerQuery.includes('понедельник')) {
    targetDate = getNextDayOfWeek(today, 1)
  } else if (lowerQuery.includes('вторник')) {
    targetDate = getNextDayOfWeek(today, 2)
  } else if (lowerQuery.includes('среда') || lowerQuery.includes('среду')) {
    targetDate = getNextDayOfWeek(today, 3)
  } else if (lowerQuery.includes('четверг')) {
    targetDate = getNextDayOfWeek(today, 4)
  } else if (lowerQuery.includes('пятниц')) {
    targetDate = getNextDayOfWeek(today, 5)
  } else if (lowerQuery.includes('суббот')) {
    targetDate = getNextDayOfWeek(today, 6)
  } else if (lowerQuery.includes('воскресень')) {
    targetDate = getNextDayOfWeek(today, 0)
  }
  
  const schedule = await getOstroukhSchedule(targetDate)
  
  if (!schedule) {
    return 'Расписание временно недоступно.'
  }
  
  let response = formatScheduleForChat(schedule)
  
  // Если спрашивают про текущую пару
  if (lowerQuery.includes('сейчас') || lowerQuery.includes('текущ') || lowerQuery.includes('идет')) {
    const currentLesson = getCurrentOrNextLesson(schedule)
    if (currentLesson) {
      response += `\n\n🔔 **Текущая/ближайшая пара:**\n`
      response += `${currentLesson.subject} (${currentLesson.type === 'lecture' ? 'лекция' : currentLesson.type === 'practice' ? 'практика' : 'лаб. работа'})\n`
      response += `⏰ ${currentLesson.time}\n`
      response += `📍 ${currentLesson.room}${currentLesson.building ? `, ${currentLesson.building}` : ''}`
    }
  }
  
  return response
}

/**
 * Получить следующий день недели
 */
function getNextDayOfWeek(date: Date, targetDay: number): Date {
  const result = new Date(date)
  const currentDay = date.getDay()
  let daysToAdd = targetDay - currentDay
  
  if (daysToAdd <= 0) {
    daysToAdd += 7
  }
  
  result.setDate(date.getDate() + daysToAdd)
  return result
}
