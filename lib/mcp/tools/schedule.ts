/**
 * Schedule Tool - Function calling для расписания профессора Остроуха
 */

import { getOstroukhSchedule, getWeekSchedule, formatScheduleForChat, getCurrentOrNextLesson } from '@/lib/madi/schedule-api'
import { MADIParser, type ParsedSchedule, type ParsedExamSchedule, type ParsedDepartment, type ProfessorInfo } from '@/lib/madi/madi-parser'

export interface ScheduleToolParams {
  query_type: 'day' | 'week' | 'current'
  date?: string // YYYY-MM-DD format
  day_of_week?: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  info_type?: 'schedule' | 'exams' | 'department' | 'groups' | 'all'
}

export class ScheduleTool {
  name = 'get_schedule'
  description = 'Получить информацию о профессоре Остроухе А.В.: расписание занятий, экзамены, кафедру, группы или всю информацию сразу'
  private parser: MADIParser | null

  constructor() {
    // Initialize parser if enabled
    this.parser = process.env.USE_MADI_PARSER === 'true'
      ? new MADIParser({
          enabled: true,
          cacheTTL: parseInt(process.env.MADI_CACHE_TTL || '3600', 10),
          requestTimeout: parseInt(process.env.MADI_REQUEST_TIMEOUT || '10000', 10),
          fallbackToStatic: process.env.MADI_FALLBACK_TO_STATIC !== 'false',
          baseUrl: process.env.MADI_BASE_URL || 'https://raspisanie.madi.ru/tplan'
        })
      : null
  }

  /**
   * JSON Schema для параметров инструмента
   */
  get parameters() {
    return {
      type: 'object',
      properties: {
        query_type: {
          type: 'string',
          enum: ['day', 'week', 'current'],
          description: 'Тип запроса: day - расписание на конкретный день, week - расписание на неделю, current - текущая/ближайшая пара'
        },
        date: {
          type: 'string',
          description: 'Дата в формате YYYY-MM-DD (опционально, по умолчанию - сегодня)'
        },
        day_of_week: {
          type: 'string',
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
          description: 'День недели (опционально, используется если не указана конкретная дата)'
        },
        info_type: {
          type: 'string',
          enum: ['schedule', 'exams', 'department', 'groups', 'all'],
          description: 'Тип информации: schedule - расписание занятий (по умолчанию), exams - расписание экзаменов, department - информация о кафедре, groups - список групп, all - вся информация о преподавателе'
        }
      },
      required: ['query_type']
    }
  }

  /**
   * Выполнить запрос расписания
   */
  async execute(params: ScheduleToolParams): Promise<string> {
    try {
      const { query_type, date, day_of_week, info_type = 'schedule' } = params

      // Определяем целевую дату
      let targetDate = new Date()

      if (date) {
        targetDate = new Date(date)
      } else if (day_of_week) {
        targetDate = this.getNextDayOfWeek(targetDate, day_of_week)
      }

      // Handle different info types
      switch (info_type) {
        case 'exams':
          return await this.getExams()
        
        case 'department':
          return await this.getDepartment()
        
        case 'groups':
          return await this.getGroups()
        
        case 'all':
          return await this.getAllInfo(targetDate)
        
        case 'schedule':
        default:
          return await this.getSchedule(query_type, targetDate)
      }
    } catch (error) {
      console.error('[ScheduleTool] Error:', error)
      return 'Произошла ошибка при получении информации.'
    }
  }

  /**
   * Получить расписание занятий
   */
  private async getSchedule(queryType: string, date: Date): Promise<string> {
    // Try parser first if enabled
    if (this.parser) {
      try {
        const schedule = await this.parser.getProfessorSchedule('Остроух А.В.', date)
        if (schedule) {
          return this.formatSchedule(schedule, queryType)
        }
      } catch (error) {
        console.error('[ScheduleTool] Parser failed:', error)
      }
    }

    // Fallback to static data
    switch (queryType) {
      case 'week': {
        const weekSchedule = await getWeekSchedule(date)
        return this.formatWeekSchedule(weekSchedule)
      }

      case 'current': {
        const schedule = await getOstroukhSchedule(date)
        if (!schedule) {
          return 'Расписание на сегодня недоступно.'
        }
        const currentLesson = getCurrentOrNextLesson(schedule)
        if (!currentLesson) {
          return 'Сейчас нет занятий. Следующая пара будет позже.'
        }
        return this.formatCurrentLesson(currentLesson)
      }

      case 'day':
      default: {
        const schedule = await getOstroukhSchedule(date)
        if (!schedule) {
          return 'Расписание недоступно.'
        }
        return formatScheduleForChat(schedule)
      }
    }
  }

  /**
   * Получить расписание экзаменов
   */
  private async getExams(): Promise<string> {
    if (this.parser) {
      try {
        const exams = await this.parser.getProfessorExams('Остроух А.В.')
        if (exams && exams.exams.length > 0) {
          return this.formatExams(exams)
        }
      } catch (error) {
        console.error('[ScheduleTool] Exam parser failed:', error)
      }
    }
    
    return 'Расписание экзаменов пока не опубликовано. Обычно экзамены проходят в конце семестра.'
  }

  /**
   * Получить информацию о кафедре
   */
  private async getDepartment(): Promise<string> {
    if (this.parser) {
      try {
        const departments = await this.parser.getProfessorDepartments('Остроух А.В.')
        if (departments.length > 0) {
          return this.formatDepartments(departments)
        }
      } catch (error) {
        console.error('[ScheduleTool] Department parser failed:', error)
      }
    }
    
    return 'Я работаю на кафедре Автоматизированных систем управления (АСУ) МАДИ.'
  }

  /**
   * Получить список групп
   */
  private async getGroups(): Promise<string> {
    if (this.parser) {
      try {
        const info = await this.parser.getProfessorInfo('Остроух А.В.', new Date())
        if (info && info.groups.length > 0) {
          return `Я работаю со следующими группами: ${info.groups.join(', ')}`
        }
      } catch (error) {
        console.error('[ScheduleTool] Groups extraction failed:', error)
      }
    }
    
    return 'Для получения актуального списка групп нужно проверить расписание на сайте МАДИ. Статические данные могут быть неточными.'
  }

  /**
   * Получить всю информацию о преподавателе
   */
  private async getAllInfo(date: Date): Promise<string> {
    if (this.parser) {
      try {
        const info = await this.parser.getProfessorInfo('Остроух А.В.', date)
        if (info) {
          return this.formatProfessorInfo(info)
        }
      } catch (error) {
        console.error('[ScheduleTool] Full info aggregation failed:', error)
      }
    }
    
    // Fallback to basic schedule
    return await this.getSchedule('day', date)
  }

  /**
   * Форматировать расписание (с поддержкой distance learning)
   */
  private formatSchedule(schedule: ParsedSchedule, queryType: string): string {
    if (queryType === 'week') {
      // For week view, we'd need to fetch multiple days
      // For now, fall back to static implementation
      return 'Недельное расписание доступно только через статические данные.'
    }

    if (queryType === 'current') {
      // Find current or next lesson
      const now = new Date()
      const currentTime = now.getHours() * 60 + now.getMinutes()
      
      for (const lesson of schedule.lessons) {
        const [startTime] = lesson.time.split('-')
        const [hours, minutes] = startTime.split(':').map(Number)
        const lessonTime = hours * 60 + minutes
        
        if (lessonTime >= currentTime - 90) { // Within 90 minutes
          const typeRu = lesson.type === 'lecture' ? 'лекция' : lesson.type === 'practice' ? 'практика' : 'лабораторная работа'
          
          let response = `🔔 **Текущая/ближайшая пара:**\n\n`
          response += `📚 ${lesson.subject} (${typeRu})\n`
          response += `⏰ ${lesson.time}\n`
          response += `📍 ${lesson.room}${lesson.building ? `, ${lesson.building}` : ''}\n`
          if (lesson.group) {
            response += `👥 Группа: ${lesson.group}\n`
          }
          if (lesson.isDistanceLearning) {
            response += `🏠 Заочная форма обучения\n`
          }
          
          return response
        }
      }
      
      return 'Сейчас нет занятий. Следующая пара будет позже.'
    }

    // Day view
    let response = `📅 **Расписание на ${schedule.dayOfWeek}** (${schedule.date}):\n\n`
    
    if (schedule.lessons.length === 0) {
      response += 'Занятий нет.\n'
    } else {
      schedule.lessons.forEach(lesson => {
        const emoji = lesson.type === 'lecture' ? '📚' : lesson.type === 'practice' ? '💻' : '🔬'
        const typeRu = lesson.type === 'lecture' ? 'лекция' : lesson.type === 'practice' ? 'практика' : 'лаб. работа'
        
        response += `${emoji} **${lesson.time}** - ${lesson.subject} (${typeRu})\n`
        response += `   📍 ${lesson.room}${lesson.building ? `, ${lesson.building}` : ''}\n`
        if (lesson.group) {
          response += `   👥 ${lesson.group}\n`
        }
        if (lesson.isDistanceLearning) {
          response += `   🏠 Заочная форма\n`
        }
        response += '\n'
      })
    }
    
    response += `\n_Источник: ${schedule.source === 'madi-parser' ? 'MADI сайт' : schedule.source === 'cache' ? 'кэш' : 'статические данные'}_`
    
    return response
  }

  /**
   * Форматировать расписание экзаменов
   */
  private formatExams(exams: ParsedExamSchedule): string {
    let result = '📝 **Расписание экзаменов:**\n\n'
    
    exams.exams.forEach(exam => {
      const typeEmoji = exam.type === 'exam' ? '📚' : '✅'
      const typeRu = exam.type === 'exam' ? 'Экзамен' : 'Зачёт'
      
      result += `${typeEmoji} **${exam.date}** в ${exam.time}\n`
      result += `   ${exam.subject} (${typeRu})\n`
      result += `   📍 ${exam.room}${exam.building ? `, ${exam.building}` : ''}\n`
      if (exam.group) {
        result += `   👥 Группа: ${exam.group}\n`
      }
      if (exam.isDistanceLearning) {
        result += `   🏠 Заочная форма\n`
      }
      result += '\n'
    })
    
    result += `\n_Источник: ${exams.source === 'madi-parser' ? 'MADI сайт' : exams.source === 'cache' ? 'кэш' : 'статические данные'}_`
    
    return result
  }

  /**
   * Форматировать информацию о кафедрах
   */
  private formatDepartments(departments: ParsedDepartment[]): string {
    let result = '🏛️ **Кафедры:**\n\n'
    
    departments.forEach(dept => {
      result += `**${dept.name}**\n`
      
      if (dept.subjects.length > 0) {
        result += `📚 Дисциплины: ${dept.subjects.join(', ')}\n`
      }
      
      if (dept.professors.length > 0) {
        result += `👥 Преподаватели: ${dept.professors.slice(0, 5).join(', ')}`
        if (dept.professors.length > 5) {
          result += ` и ещё ${dept.professors.length - 5}`
        }
        result += '\n'
      }
      
      result += '\n'
    })
    
    return result
  }

  /**
   * Форматировать полную информацию о преподавателе
   */
  private formatProfessorInfo(info: ProfessorInfo): string {
    let result = `📋 **Полная информация о ${info.name}**\n\n`
    
    // Departments
    if (info.departments.length > 0) {
      result += this.formatDepartments(info.departments)
    }
    
    // Groups
    if (info.groups.length > 0) {
      result += `👥 **Группы:** ${info.groups.join(', ')}\n\n`
    }
    
    // Distance learning
    if (info.hasDistanceLearning) {
      result += `🏠 **Заочная форма обучения:** Да\n\n`
    }
    
    // Schedule
    result += '---\n\n'
    result += this.formatSchedule(info.schedule, 'day')
    
    // Exams
    if (info.examSchedule.exams.length > 0) {
      result += '\n---\n\n'
      result += this.formatExams(info.examSchedule)
    }
    
    return result
  }

  /**
   * Форматировать расписание на неделю
   */
  private formatWeekSchedule(weekSchedule: any): string {
    let response = '📅 **Расписание на неделю:**\n\n'
    
    weekSchedule.days.forEach((day: any) => {
      if (day.lessons.length > 0) {
        response += `**${day.dayOfWeek}** (${day.date}):\n`
        day.lessons.forEach((lesson: any) => {
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

  /**
   * Форматировать текущую пару
   */
  private formatCurrentLesson(lesson: any): string {
    const typeRu = lesson.type === 'lecture' ? 'лекция' : lesson.type === 'practice' ? 'практика' : 'лабораторная работа'
    
    let response = `🔔 **Текущая/ближайшая пара:**\n\n`
    response += `📚 ${lesson.subject} (${typeRu})\n`
    response += `⏰ ${lesson.time}\n`
    response += `📍 ${lesson.room}${lesson.building ? `, ${lesson.building}` : ''}\n`
    if (lesson.group) {
      response += `👥 Группа: ${lesson.group}`
    }

    return response
  }

  /**
   * Получить следующий день недели
   */
  private getNextDayOfWeek(date: Date, dayOfWeek: string): Date {
    const dayMap: Record<string, number> = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    }

    const targetDay = dayMap[dayOfWeek]
    const result = new Date(date)
    const currentDay = date.getDay()
    let daysToAdd = targetDay - currentDay

    if (daysToAdd <= 0) {
      daysToAdd += 7
    }

    result.setDate(date.getDate() + daysToAdd)
    return result
  }
}
