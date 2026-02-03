/**
 * MADI Schedule API Integration
 * Модуль для получения расписания занятий МАДИ
 */

import { MADIParser, ParsedSchedule, type MADIParserConfig } from './madi-parser'

export interface ScheduleLesson {
  time: string;           // Время пары (например, "9:00-10:30")
  subject: string;        // Название предмета
  type: 'lecture' | 'practice' | 'lab'; // Тип занятия
  room: string;           // Аудитория
  building?: string;      // Корпус
  professor: string;      // Преподаватель
  group?: string;         // Группа
}

export interface DaySchedule {
  date: string;           // Дата в формате YYYY-MM-DD
  dayOfWeek: string;      // День недели
  lessons: ScheduleLesson[];
}

export interface WeekSchedule {
  weekNumber: number;
  days: DaySchedule[];
}

/**
 * Получить расписание профессора Остроуха
 */
export async function getOstroukhSchedule(date?: Date): Promise<DaySchedule | null> {
  const targetDate = date || new Date();
  
  // Инициализация MADIParser если enabled
  const parserEnabled = process.env.USE_MADI_PARSER === 'true'
  
  if (parserEnabled) {
    try {
      // Создаем конфигурацию парсера из environment variables
      const config: MADIParserConfig = {
        enabled: true,
        cacheTTL: parseInt(process.env.MADI_CACHE_TTL || '3600', 10),
        requestTimeout: parseInt(process.env.MADI_REQUEST_TIMEOUT || '10000', 10),
        fallbackToStatic: process.env.MADI_FALLBACK_TO_STATIC !== 'false',
        baseUrl: process.env.MADI_BASE_URL || 'https://raspisanie.madi.ru/tplan'
      }
      
      // Инициализируем парсер
      const parser = new MADIParser(config)
      
      console.log('[Schedule API] Attempting to fetch schedule from MADI parser')
      
      // Попытка парсинга с сайта MADI
      const parsedSchedule = await parser.getProfessorSchedule('Остроух А.В.', targetDate)
      
      if (parsedSchedule) {
        console.log(`[Schedule API] Successfully fetched schedule from MADI parser (source: ${parsedSchedule.source})`)
        
        // Трансформация ParsedSchedule в DaySchedule
        const daySchedule = transformParsedScheduleToDaySchedule(parsedSchedule)
        
        return daySchedule
      }
      
      console.log('[Schedule API] MADI parser returned null, falling back to static data')
    } catch (error) {
      console.error('[Schedule API] Error fetching schedule from MADI parser:', error)
      console.log('[Schedule API] Falling back to static data')
    }
  }
  
  // Fallback на статические данные
  return getStaticOstroukhSchedule(targetDate);
}

/**
 * Трансформация ParsedSchedule в DaySchedule
 * 
 * @param parsedSchedule - Расписание из парсера MADI
 * @returns Расписание в формате DaySchedule для совместимости с существующим API
 */
export function transformParsedScheduleToDaySchedule(parsedSchedule: ParsedSchedule): DaySchedule {
  // Преобразуем ParsedLesson[] в ScheduleLesson[]
  const lessons: ScheduleLesson[] = parsedSchedule.lessons.map(lesson => ({
    time: lesson.time,
    subject: lesson.subject,
    type: lesson.type,
    room: lesson.room,
    building: lesson.building,
    professor: parsedSchedule.professorName,
    group: lesson.group
  }))
  
  return {
    date: parsedSchedule.date,
    dayOfWeek: parsedSchedule.dayOfWeek,
    lessons
  }
}

/**
 * Статическое расписание профессора Остроуха
 * ВНИМАНИЕ: Это ТЕСТОВЫЕ данные для разработки!
 * Для получения реального расписания включите USE_MADI_PARSER=true в .env
 * 
 * Группы и аудитории ниже — примерные, для демонстрации структуры.
 */
function getStaticOstroukhSchedule(date: Date): DaySchedule {
  const dayOfWeek = date.getDay(); // 0 = воскресенье, 1 = понедельник, ...
  const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  
  // ВАЖНО: Это статические тестовые данные
  // Реальное расписание может отличаться
  const schedule: Record<number, ScheduleLesson[]> = {
    1: [ // Понедельник
      {
        time: '9:00-10:30',
        subject: 'Автоматизированные системы управления',
        type: 'lecture',
        room: '301',
        building: 'Главный корпус',
        professor: 'Остроух А.В.',
        group: 'Группа 1' // Примерное название
      },
      {
        time: '10:45-12:15',
        subject: 'Системы искусственного интеллекта',
        type: 'lecture',
        room: '301',
        building: 'Главный корпус',
        professor: 'Остроух А.В.',
        group: 'Группа 2' // Примерное название
      }
    ],
    2: [ // Вторник
      {
        time: '12:30-14:00',
        subject: 'Робототехника и мехатроника',
        type: 'practice',
        room: '215',
        building: 'Лабораторный корпус',
        professor: 'Остроух А.В.',
        group: 'Группа 1' // Примерное название
      }
    ],
    3: [ // Среда
      {
        time: '9:00-10:30',
        subject: 'Математический анализ',
        type: 'lecture',
        room: '405',
        building: 'Главный корпус',
        professor: 'Остроух А.В.',
        group: 'Группа 3' // Примерное название
      },
      {
        time: '14:15-15:45',
        subject: 'Консультации по научной работе',
        type: 'practice',
        room: '312',
        building: 'Кафедра АСУ',
        professor: 'Остроух А.В.'
      }
    ],
    4: [ // Четверг
      {
        time: '10:45-12:15',
        subject: 'Автоматизированные системы управления',
        type: 'practice',
        room: '215',
        building: 'Лабораторный корпус',
        professor: 'Остроух А.В.',
        group: 'Группа 1' // Примерное название
      },
      {
        time: '12:30-14:00',
        subject: 'Системы искусственного интеллекта',
        type: 'lab',
        room: '215',
        building: 'Лабораторный корпус',
        professor: 'Остроух А.В.',
        group: 'Группа 2' // Примерное название
      }
    ],
    5: [ // Пятница
      {
        time: '9:00-10:30',
        subject: 'Научный семинар кафедры',
        type: 'lecture',
        room: '312',
        building: 'Кафедра АСУ',
        professor: 'Остроух А.В.'
      }
    ]
  };

  const dateStr = date.toISOString().split('T')[0];
  
  return {
    date: dateStr,
    dayOfWeek: dayNames[dayOfWeek],
    lessons: schedule[dayOfWeek] || []
  };
}

/**
 * Получить расписание на неделю
 */
export async function getWeekSchedule(startDate?: Date): Promise<WeekSchedule> {
  const start = startDate || getMonday(new Date());
  const days: DaySchedule[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const daySchedule = await getOstroukhSchedule(date);
    if (daySchedule) {
      days.push(daySchedule);
    }
  }
  
  return {
    weekNumber: getWeekNumber(start),
    days
  };
}

/**
 * Получить понедельник текущей недели
 */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Получить номер недели в году
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Форматировать расписание для отображения в чате
 */
export function formatScheduleForChat(schedule: DaySchedule): string {
  if (schedule.lessons.length === 0) {
    return `📅 ${schedule.dayOfWeek}, ${schedule.date}\n\n🏖️ Выходной день, занятий нет.`;
  }

  const lessonTypeEmoji = {
    lecture: '📚',
    practice: '💻',
    lab: '🔬'
  };

  let text = `📅 ${schedule.dayOfWeek}, ${schedule.date}\n\n`;
  
  schedule.lessons.forEach((lesson, index) => {
    const emoji = lessonTypeEmoji[lesson.type];
    text += `${emoji} **${lesson.time}** - ${lesson.subject}\n`;
    text += `   📍 ${lesson.room}${lesson.building ? `, ${lesson.building}` : ''}\n`;
    if (lesson.group) {
      text += `   👥 Группа: ${lesson.group}\n`;
    }
    if (index < schedule.lessons.length - 1) {
      text += '\n';
    }
  });
  
  // Добавляем предупреждение о статических данных
  text += `\n\n⚠️ _Примечание: Это тестовые данные. Для актуального расписания включите парсер MADI (USE_MADI_PARSER=true)_`;

  return text;
}

/**
 * Найти текущую или следующую пару
 */
export function getCurrentOrNextLesson(schedule: DaySchedule): ScheduleLesson | null {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const lesson of schedule.lessons) {
    const [startTime] = lesson.time.split('-');
    const [hours, minutes] = startTime.split(':').map(Number);
    const lessonTime = hours * 60 + minutes;

    // Если пара еще не началась или идет сейчас (в пределах 90 минут)
    if (lessonTime >= currentTime - 90 && lessonTime <= currentTime + 30) {
      return lesson;
    }
  }

  return schedule.lessons[0] || null;
}
