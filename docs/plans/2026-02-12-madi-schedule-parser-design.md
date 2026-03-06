# MADI Schedule Parser - Design Document

**Дата:** 2026-02-12  
**Автор:** AI Study Agent Team  
**Статус:** Approved

## Цель

Улучшить парсер расписания МАДИ для автоматического обновления данных с персистентностью в PostgreSQL и надёжной интеграцией в проект.

## Проблемы текущей реализации

### Критические
1. Парсер отключен по умолчанию (`USE_MADI_PARSER=false`)
2. Нет персистентности - данные в памяти, теряются при рестарте
3. Неполная реализация - `parseSchedulePage()`, `parseExamPage()` не завершены
4. Хрупкий HTML парсинг - зависит от структуры сайта МАДИ
5. Статические данные устарели

### Проблемы интеграции
- Используется только через MCP tool
- Нет REST API endpoints
- UI не использует парсер
- Хардкод только для "Остроух А.В."

### Проблемы данных
- Пропускает поля: подгруппы, онлайн-ссылки, заметки, периодичность
- Неправильная структура для некоторых типов пар
- Ломается на нестандартных форматах

## Требования

### Функциональные
- Автоматическое обновление расписания каждый час + при старте дня
- Персистентность в PostgreSQL через Prisma
- Парсинг всех полей: время, предмет, тип, аудитория, корпус, преподаватель, группа, подгруппа, периодичность, онлайн-ссылки, заметки
- Change detection - детекция изменений расписания
- REST API для доступа к расписанию
- Интеграция в UI

### Нефункциональные
- Надёжность: retry механизм, fallback на БД при недоступности MADI
- Производительность: in-memory кэш для быстрого доступа
- Тестируемость: unit и integration тесты
- Мониторинг: логирование синхронизаций и ошибок

## Архитектура решения

### Компоненты

```
┌─────────────┐
│  MADI сайт  │
└──────┬──────┘
       │ HTTP
       ↓
┌──────────────────┐
│  HTML Parser     │ ← улучшенный парсинг
│  (madi-parser)   │
└────────┬─────────┘
         │
         ↓ валидация
┌──────────────────┐
│  PostgreSQL      │ ← source of truth
│  (Prisma)        │
└────────┬─────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌─────────┐ ┌──────────┐
│  Sync   │ │ REST API │
│ Service │ │endpoints │
└─────────┘ └────┬─────┘
    ↓            ↓
┌─────────────────────┐
│  UI / MCP tools     │
└─────────────────────┘
```

### Поток данных

1. **Sync Service** (cron: hourly) → fetch HTML from MADI
2. **Parser** → parse HTML → validate data
3. **Change Detection** → compare with DB
4. **Database Update** → save to PostgreSQL
5. **Cache Invalidation** → clear in-memory cache
6. **API Layer** → serve data to clients

## Структура данных

### Prisma Schema

```prisma
model Professor {
  id          String    @id @default(cuid())
  name        String    @unique
  departments String[]
  schedules   Schedule[]
  exams       Exam[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Schedule {
  id           String    @id @default(cuid())
  professorId  String
  professor    Professor @relation(fields: [professorId], references: [id])
  date         DateTime
  dayOfWeek    String
  lessons      Lesson[]
  source       String    // 'madi-parser' | 'manual'
  lastSyncAt   DateTime
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  
  @@unique([professorId, date])
  @@index([professorId, date])
}

model Lesson {
  id                 String    @id @default(cuid())
  scheduleId         String
  schedule           Schedule  @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  time               String
  subject            String
  type               String    // 'lecture' | 'practice' | 'lab'
  room               String
  building           String?
  group              String?
  subgroup           String?   // NEW: подгруппа
  periodicity        String?   // NEW: 'weekly' | 'numerator' | 'denominator' | 'once_a_month'
  onlineLink         String?   // NEW: ссылка на онлайн-пару
  notes              String?   // NEW: дополнительные заметки
  isDistanceLearning Boolean   @default(false)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  
  @@index([scheduleId])
}

model Exam {
  id                 String    @id @default(cuid())
  professorId        String
  professor          Professor @relation(fields: [professorId], references: [id])
  date               DateTime
  time               String
  subject            String
  type               String    // 'exam' | 'test'
  room               String
  building           String?
  group              String?
  isDistanceLearning Boolean   @default(false)
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
  
  @@index([professorId, date])
}
```

## Sync Service

### Триггеры обновления
- Каждый час: `0 * * * *` (cron)
- При старте дня: `1 0 * * *` (00:01)
- Ручной запрос: `POST /api/schedule/sync`

### Процесс синхронизации

```typescript
async function syncSchedule(professorName: string, date: Date) {
  // 1. Fetch HTML from MADI
  const html = await fetchMADIPage(url, timeout)
  
  // 2. Parse HTML
  const parsedData = await parseSchedulePage(html, professorName, date)
  
  // 3. Validate data
  const validated = validateScheduleData(parsedData)
  
  // 4. Compare with DB (change detection)
  const existing = await db.schedule.findUnique({
    where: { professorId_date: { professorId, date } },
    include: { lessons: true }
  })
  
  const changes = detectChanges(existing, validated)
  
  // 5. Update DB if changes detected
  if (changes.hasChanges) {
    await db.schedule.upsert({
      where: { professorId_date: { professorId, date } },
      update: { lessons: validated.lessons, lastSyncAt: new Date() },
      create: { ...validated, lastSyncAt: new Date() }
    })
    
    // 6. Invalidate cache
    cache.delete(`schedule:${professorId}:${dateStr}`)
    
    // 7. Trigger notifications (optional)
    await notifyScheduleChange(professorId, changes)
  }
  
  // 8. Log result
  logger.info('Sync completed', { professorId, date, changes })
}
```

### Error Handling
- Retry 3 раза с exponential backoff (1s, 2s, 4s)
- Если MADI недоступен → используем данные из БД
- Alert в логи при постоянных ошибках
- Graceful degradation

## HTML Парсинг

### Улучшения

1. **Завершить функции:**
   - `parseSchedulePage()` - task=8 (расписание занятий)
   - `parseExamPage()` - task=15 (экзамены)
   - Извлечение всех полей

2. **Robust парсинг:**
   - Fallback селекторы
   - Валидация данных
   - Обработка edge cases

3. **Новые поля:**
   - Подгруппа (из текста пары)
   - Периодичность (еженедельно/числитель/знаменатель)
   - Онлайн-ссылки (из href)
   - Заметки (дополнительный текст)

### Пример парсинга

```typescript
function parseSchedulePage(html: string, professorName: string, date: Date): ParsedSchedule {
  const $ = cheerio.load(html)
  const lessons: ParsedLesson[] = []
  
  // Парсинг таблицы расписания
  $('table.schedule tr').each((i, row) => {
    const cells = $(row).find('td')
    
    const lesson: ParsedLesson = {
      time: $(cells[0]).text().trim(),
      subject: $(cells[1]).text().trim(),
      type: detectLessonType($(cells[1]).text()),
      room: $(cells[2]).text().trim(),
      building: extractBuilding($(cells[2]).text()),
      group: $(cells[3]).text().trim(),
      subgroup: extractSubgroup($(cells[3]).text()), // NEW
      periodicity: extractPeriodicity($(cells[4]).text()), // NEW
      onlineLink: $(cells[1]).find('a').attr('href'), // NEW
      notes: $(cells[5]).text().trim(), // NEW
      isDistanceLearning: $(cells[1]).text().includes('онлайн')
    }
    
    lessons.push(lesson)
  })
  
  return {
    professorName,
    date: date.toISOString().split('T')[0],
    dayOfWeek: getDayOfWeek(date),
    lessons,
    source: 'madi-parser'
  }
}
```

## REST API

### Endpoints

```typescript
// Получить расписание на день
GET /api/schedule/professor/:name?date=YYYY-MM-DD
Response: { schedule: Schedule, lastSync: DateTime }

// Получить расписание на неделю
GET /api/schedule/professor/:name/week?startDate=YYYY-MM-DD
Response: { schedules: Schedule[], lastSync: DateTime }

// Получить экзамены
GET /api/schedule/professor/:name/exams
Response: { exams: Exam[] }

// Ручная синхронизация
POST /api/schedule/sync
Body: { professorName: string, date?: string }
Response: { success: boolean, changes: ChangesSummary }

// Список преподавателей
GET /api/schedule/professors
Response: { professors: Professor[] }
```

## UI Интеграция

### Обновления страницы `/schedule`

1. Показывать расписание профессора из БД
2. Индикатор последнего обновления
3. Кнопка "Обновить сейчас" → `POST /api/schedule/sync`
4. Автообновление каждые 5 минут (polling или websocket)

### MCP Tool обновление

- Использовать БД вместо прямого парсинга
- Показывать `lastSyncAt` в ответе
- Добавить команду для ручной синхронизации

## Тестирование

### Unit тесты
- Парсинг HTML (на реальных примерах из `madi-task-8.html`, `madi-task-15.html`)
- Валидация данных
- Change detection
- Error handling

### Integration тесты
- Полный цикл синхронизации
- API endpoints
- Database operations

### E2E тесты
- Реальный запрос к MADI сайту (опционально, в CI)

## Мониторинг и логирование

### Метрики
- Количество успешных/неудачных синхронизаций
- Время парсинга
- Количество изменений
- Размер кэша

### Логи
- Каждая синхронизация (timestamp, professor, result)
- Ошибки парсинга
- Change detection результаты

## Миграция

### Шаги
1. Создать Prisma миграцию для новых моделей
2. Запустить первую синхронизацию для заполнения БД
3. Обновить существующий код для использования БД
4. Включить `USE_MADI_PARSER=true`
5. Настроить cron для автоматической синхронизации

## Критерии успеха

- ✅ Расписание автоматически обновляется каждый час
- ✅ Все поля корректно парсятся (включая новые)
- ✅ Данные сохраняются в PostgreSQL
- ✅ REST API работает
- ✅ UI показывает актуальное расписание
- ✅ Тесты покрывают основные сценарии
- ✅ Система работает при недоступности MADI сайта

## Следующие шаги

1. Создать детальный план реализации (writing-plans)
2. Реализовать по задачам с TDD подходом
3. Тестирование и отладка
4. Деплой и мониторинг
