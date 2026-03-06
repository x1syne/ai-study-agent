# Быстрый экспорт расписания МАДИ

Два простых скрипта для экспорта расписания с сайта МАДИ через Playwright.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
cd ai-study-agent-main
npm install playwright
npx playwright install chromium
```

### 2. Экспорт расписания одного преподавателя

```bash
npx tsx scripts/export-madi-schedule.ts
```

**Что делает:**
- Открывает браузер Chrome
- Заходит на raspisanie.madi.ru
- Загружает расписание для "Остроух А.В."
- Сохраняет в `user-files/madi-export/Остроух-А.В..json`
- Делает скриншот страницы

**Изменить преподавателя:**
Откройте `scripts/export-madi-schedule.ts` и измените строку:
```typescript
professorName: 'Остроух А.В.' // Замените на нужное имя
```

### 3. Экспорт расписания ВСЕХ преподавателей

```bash
npx tsx scripts/export-all-professors.ts
```

**Что делает:**
- Получает список всех преподавателей с сайта
- Загружает расписание для каждого
- Сохраняет индивидуальные файлы для каждого преподавателя
- Создает общий файл `all-schedules.json` со всеми расписаниями
- Показывает прогресс и статистику

**⚠️ Внимание:** Это может занять 10-30 минут в зависимости от количества преподавателей!

## 📁 Структура выходных файлов

```
ai-study-agent-main/user-files/madi-export/
├── Остроух-А.В..json              # Расписание одного преподавателя
├── Иванов-И.И..json               # Расписание другого преподавателя
├── ...                            # Файлы для всех преподавателей
├── all-schedules.json             # Все расписания в одном файле
└── Остроух-А.В.-screenshot.png    # Скриншот страницы
```

## 📋 Формат данных

Каждый JSON файл содержит:

```json
{
  "professor": "Остроух А.В.",
  "semester": "2025-2026 Весенний",
  "exportDate": "2026-02-14T12:00:00.000Z",
  "lessons": [
    {
      "day": "Вторник",
      "time": "08:50 - 10:20",
      "group": "2ИС/ТСТ",
      "subject": "Методы искусственного интеллекта",
      "type": "Лекция",
      "periodicity": "Еженедельно",
      "room": "115"
    }
  ]
}
```

## ⚙️ Настройки

Оба скрипта имеют секцию `CONFIG` в начале файла:

```typescript
const CONFIG = {
  url: 'https://raspisanie.madi.ru/tplan/',
  outputDir: 'ai-study-agent-main/user-files/madi-export',
  headless: false,  // true = без показа браузера
  timeout: 30000,   // таймаут в миллисекундах
  delayBetweenRequests: 2000  // задержка между запросами (только для export-all)
}
```

**Рекомендации:**
- `headless: false` - оставьте для первого запуска, чтобы видеть что происходит
- `headless: true` - используйте для массового экспорта (быстрее)
- `delayBetweenRequests: 2000` - не уменьшайте, чтобы не перегружать сервер

## 🔧 Устранение проблем

### Ошибка: "Playwright not found"
```bash
npm install playwright
npx playwright install chromium
```

### Ошибка: "Cannot find module 'tsx'"
```bash
npm install -g tsx
# или используйте
npx tsx scripts/export-madi-schedule.ts
```

### Браузер не открывается
Проверьте что Chromium установлен:
```bash
npx playwright install chromium
```

### Таблица не найдена
Возможно, структура сайта изменилась. Откройте браузер вручную и проверьте:
1. Есть ли таблица на странице?
2. Правильно ли выбран преподаватель?
3. Загрузилось ли расписание?

### Пустые данные
Проверьте:
1. Правильно ли указано имя преподавателя
2. Есть ли расписание для выбранного семестра
3. Посмотрите скриншот в `user-files/madi-export/`

## 📊 Что дальше?

После экспорта данных вы можете:

1. **Импортировать в базу данных:**
   ```typescript
   import schedule from './user-files/madi-export/all-schedules.json'
   // Загрузить в PostgreSQL через Prisma
   ```

2. **Использовать в API:**
   ```typescript
   // app/api/schedule/route.ts
   import schedules from '@/user-files/madi-export/all-schedules.json'
   export async function GET() {
     return Response.json(schedules)
   }
   ```

3. **Показать в UI:**
   ```typescript
   // components/schedule.tsx
   import schedule from '@/user-files/madi-export/Остроух-А.В..json'
   ```

4. **Перейти к Варианту 2:**
   Если нужна автоматизация, используйте полный план реализации из:
   `docs/plans/2026-02-12-madi-schedule-parser-implementation.md`

## 🎯 Примеры использования

### Найти все занятия в определенный день
```typescript
import schedule from './user-files/madi-export/Остроух-А.В..json'

const tuesday = schedule.lessons.filter(l => l.day === 'Вторник')
console.log(tuesday)
```

### Найти все группы преподавателя
```typescript
const groups = [...new Set(schedule.lessons.map(l => l.group))]
console.log(groups) // ['2ИС/ТСТ', '3ИВТ/ПО', ...]
```

### Статистика по типам занятий
```typescript
const stats = schedule.lessons.reduce((acc, l) => {
  acc[l.type] = (acc[l.type] || 0) + 1
  return acc
}, {})
console.log(stats) // { 'Лекция': 10, 'Практика': 15, ... }
```

## 📝 Лицензия

Используйте ответственно. Соблюдайте robots.txt и не перегружайте сервер МАДИ.
