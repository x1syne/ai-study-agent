// Calendar utilities - генерация .ics файлов для экспорта

export interface StudyEvent {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  topicId?: string
}

// Генерация .ics файла для экспорта в календарь
export function generateICS(events: StudyEvent[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//AI Study Agent//Study Schedule//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const event of events) {
    const uid = `${event.id}@ai-study-agent`
    const dtstamp = formatICSDate(new Date())
    const dtstart = formatICSDate(event.startTime)
    const dtend = formatICSDate(event.endTime)

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:📚 ${event.title}`,
      `DESCRIPTION:${event.description || 'Время для учёбы!'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    )
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

// Форматирование даты для ICS
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

// Генерация Google Calendar URL
export function generateGoogleCalendarUrl(event: StudyEvent): string {
  const start = formatGoogleDate(event.startTime)
  const end = formatGoogleDate(event.endTime)
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `📚 ${event.title}`,
    dates: `${start}/${end}`,
    details: event.description || 'Время для учёбы в AI Study Agent!',
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

// AI генерирует оптимальное расписание
export function generateStudySchedule(
  topics: { id: string; name: string; estimatedMinutes: number }[],
  preferences: {
    startDate: Date
    daysPerWeek: number
    minutesPerDay: number
    preferredTime: 'morning' | 'afternoon' | 'evening'
  }
): StudyEvent[] {
  const events: StudyEvent[] = []
  const { startDate, daysPerWeek, minutesPerDay, preferredTime } = preferences

  // Определяем время начала занятий
  const startHour = preferredTime === 'morning' ? 9 : preferredTime === 'afternoon' ? 14 : 19

  let currentDate = new Date(startDate)
  let dayCount = 0
  let topicIndex = 0
  let remainingMinutes = topics[0]?.estimatedMinutes || 30

  while (topicIndex < topics.length) {
    // Пропускаем дни если нужно (например, только будни)
    if (dayCount >= daysPerWeek) {
      // Переходим к следующей неделе
      currentDate.setDate(currentDate.getDate() + (7 - daysPerWeek))
      dayCount = 0
    }

    const topic = topics[topicIndex]
    const sessionMinutes = Math.min(remainingMinutes, minutesPerDay)

    const eventStart = new Date(currentDate)
    eventStart.setHours(startHour, 0, 0, 0)

    const eventEnd = new Date(eventStart)
    eventEnd.setMinutes(eventEnd.getMinutes() + sessionMinutes)

    events.push({
      id: `study-${topic.id}-${events.length}`,
      title: topic.name,
      description: `Изучение темы: ${topic.name}`,
      startTime: eventStart,
      endTime: eventEnd,
      topicId: topic.id,
    })

    remainingMinutes -= sessionMinutes

    if (remainingMinutes <= 0) {
      topicIndex++
      remainingMinutes = topics[topicIndex]?.estimatedMinutes || 0
    }

    currentDate.setDate(currentDate.getDate() + 1)
    dayCount++
  }

  return events
}

// Скачивание .ics файла
export function downloadICS(events: StudyEvent[], filename: string = 'study-schedule.ics') {
  const icsContent = generateICS(events)
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
