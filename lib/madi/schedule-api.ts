/**
 * MADI Schedule API Integration
 * Модуль для получения расписания занятий МАДИ
 */

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
  
  // Пока используем статическое расписание
  // TODO: Интегрировать с реальным API МАДИ когда будет доступен
  return getStaticOstroukhSchedule(targetDate);
}

/**
 * Статическое расписание профессора Остроуха
 * (на основе типичного расписания кафедры АСУ МАДИ)
 */
function getStaticOstroukhSchedule(date: Date): DaySchedule {
  const dayOfWeek = date.getDay(); // 0 = воскресенье, 1 = понедельник, ...
  const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  
  const schedule: Record<number, ScheduleLesson[]> = {
    1: [ // Понедельник
      {
        time: '9:00-10:30',
        subject: 'Автоматизированные системы управления',
        type: 'lecture',
        room: '301',
        building: 'Главный корпус',
        professor: 'Остроух А.В.',
        group: 'АСУ-41'
      },
      {
        time: '10:45-12:15',
        subject: 'Системы искусственного интеллекта',
        type: 'lecture',
        room: '301',
        building: 'Главный корпус',
        professor: 'Остроух А.В.',
        group: 'АСУ-31'
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
        group: 'АСУ-41'
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
        group: 'АСУ-21'
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
        group: 'АСУ-41'
      },
      {
        time: '12:30-14:00',
        subject: 'Системы искусственного интеллекта',
        type: 'lab',
        room: '215',
        building: 'Лабораторный корпус',
        professor: 'Остроух А.В.',
        group: 'АСУ-31'
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
