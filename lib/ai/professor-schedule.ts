/**
 * Модуль для работы с расписанием профессора Остроуха
 */

import { getOstroukhSchedule, getWeekSchedule, getCurrentOrNextLesson, ScheduleLesson, DaySchedule } from '../madi/schedule-api'

/**
 * Получить расписание профессора Остроуха в виде естественного контекста для AI
 */
export async function getOstroukhScheduleContext(query: string): Promise<string> {
  const today = new Date()
  const lowerQuery = query.toLowerCase()
  
  // Если спрашивают про всю неделю
  if (lowerQuery.includes('неделя') || lowerQuery.includes('недел')) {
    const weekSchedule = await getWeekSchedule()
    return buildWeekContext(weekSchedule.days)
  }
  
  let targetDate = today
  let dayMention = 'сегодня'
  
  // Определяем день недели из запроса
  if (lowerQuery.includes('завтра')) {
    targetDate = new Date(today)
    targetDate.setDate(today.getDate() + 1)
    dayMention = 'завтра'
  } else if (lowerQuery.includes('понедельник')) {
    targetDate = getNextDayOfWeek(today, 1)
    dayMention = 'в понедельник'
  } else if (lowerQuery.includes('вторник')) {
    targetDate = getNextDayOfWeek(today, 2)
    dayMention = 'во вторник'
  } else if (lowerQuery.includes('среда') || lowerQuery.includes('среду')) {
    targetDate = getNextDayOfWeek(today, 3)
    dayMention = 'в среду'
  } else if (lowerQuery.includes('четверг')) {
    targetDate = getNextDayOfWeek(today, 4)
    dayMention = 'в четверг'
  } else if (lowerQuery.includes('пятниц')) {
    targetDate = getNextDayOfWeek(today, 5)
    dayMention = 'в пятницу'
  } else if (lowerQuery.includes('суббот')) {
    targetDate = getNextDayOfWeek(today, 6)
    dayMention = 'в субботу'
  } else if (lowerQuery.includes('воскресень')) {
    targetDate = getNextDayOfWeek(today, 0)
    dayMention = 'в воскресенье'
  }
  
  const schedule = await getOstroukhSchedule(targetDate)
  
  if (!schedule) {
    return 'КОНТЕКСТ РАСПИСАНИЯ: Расписание временно недоступно. Скажи студенту проверить расписание на сайте МАДИ.'
  }
  
  let context = buildDayContext(schedule, dayMention)
  
  // Если спрашивают про текущую пару — добавить инфо
  if (lowerQuery.includes('сейчас') || lowerQuery.includes('текущ') || lowerQuery.includes('идет') || lowerQuery.includes('идёт')) {
    const currentLesson = getCurrentOrNextLesson(schedule)
    if (currentLesson) {
      const typeLabel = lessonTypeLabel(currentLesson.type)
      context += `\n\nСЕЙЧАС/БЛИЖАЙШАЯ ПАРА: ${currentLesson.subject} (${typeLabel}), в ${currentLesson.time}, ауд. ${currentLesson.room}${currentLesson.building ? ', ' + currentLesson.building : ''}.`
    }
  }
  
  return context
}

/**
 * Формирует естественный текстовый контекст для одного дня
 * Профессор должен использовать этот контекст для естественного ответа
 */
function buildDayContext(schedule: DaySchedule, dayMention: string): string {
  const prefix = `КОНТЕКСТ РАСПИСАНИЯ (используй эти данные, отвечай как живой человек — "У меня ${dayMention}..."): `
  
  if (schedule.lessons.length === 0) {
    return `${prefix}${dayMention} (${schedule.dayOfWeek}, ${schedule.date}) занятий нет — выходной или свободный день.`
  }
  
  const dayInfo = `${schedule.dayOfWeek}, ${schedule.date}`
  const lessonLines = schedule.lessons.map(lesson => {
    const type = lessonTypeLabel(lesson.type)
    const room = `ауд. ${lesson.room}${lesson.building ? ', ' + lesson.building : ''}`
    const group = lesson.group ? `, группа ${lesson.group}` : ''
    return `• ${lesson.time}: ${lesson.subject} (${type}), ${room}${group}`
  })
  
  return `${prefix}${dayMention} (${dayInfo}) у меня ${schedule.lessons.length} ${pluralPairs(schedule.lessons.length)}:\n${lessonLines.join('\n')}`
}

/**
 * Формирует контекст на всю неделю
 */
function buildWeekContext(days: DaySchedule[]): string {
  const busyDays = days.filter(d => d.lessons.length > 0)
  const freeDays = days.filter(d => d.lessons.length === 0)
  
  const prefix = `КОНТЕКСТ РАСПИСАНИЯ НА НЕДЕЛЮ (отвечай как живой человек, перечисляй дни от себя):\n`
  
  if (busyDays.length === 0) {
    return `${prefix}На этой неделе занятий нет.`
  }
  
  const lines: string[] = []
  for (const day of days) {
    if (day.lessons.length === 0) {
      lines.push(`${day.dayOfWeek} (${day.date}): выходной, занятий нет`)
    } else {
      const lessonSummary = day.lessons.map(l => {
        const type = lessonTypeLabel(l.type)
        return `${l.time} — ${l.subject} (${type}, ауд. ${l.room}${l.building ? ', ' + l.building : ''})`
      }).join('; ')
      lines.push(`${day.dayOfWeek} (${day.date}): ${day.lessons.length} ${pluralPairs(day.lessons.length)} — ${lessonSummary}`)
    }
  }
  
  const summary = `Итого: загруженных дней ${busyDays.length}, выходных ${freeDays.length}.`
  
  return `${prefix}${lines.join('\n')}\n\n${summary}`
}

function lessonTypeLabel(type: string): string {
  switch (type) {
    case 'lecture': return 'лекция'
    case 'practice': return 'практика'
    case 'lab': return 'лаб. работа'
    default: return type
  }
}

function pluralPairs(n: number): string {
  if (n === 1) return 'пара'
  if (n >= 2 && n <= 4) return 'пары'
  return 'пар'
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
