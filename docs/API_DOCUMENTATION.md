# API Documentation

## Обзор

AI Study Agent предоставляет REST API для взаимодействия с системой обучения. Все эндпоинты требуют аутентификации через JWT токены (кроме `/api/login`).

## Аутентификация

### Получение токена

```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Ответ:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Использование токена

Добавьте токен в заголовок `Authorization`:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Курсы (Goals)

### GET /api/goals

Получить список курсов пользователя.

**Параметры запроса:**
- Нет

**Ответ:**

```json
[
  {
    "id": "goal123",
    "title": "Python для начинающих",
    "skill": "Python",
    "status": "IN_PROGRESS",
    "createdAt": "2025-01-30T12:00:00.000Z",
    "modules": [
      {
        "id": "module1",
        "name": "Основы Python",
        "order": 0,
        "topics": [
          {
            "id": "topic1",
            "name": "Переменные и типы данных",
            "slug": "variables-and-types",
            "difficulty": "EASY"
          }
        ]
      }
    ]
  }
]
```

### POST /api/goals

Создать новый курс (AI генерация).

**Тело запроса:**

```json
{
  "title": "Python для начинающих",
  "skill": "Python",
  "description": "Изучение основ программирования на Python"
}
```

**Ответ:**

```json
{
  "id": "goal123",
  "title": "Python для начинающих",
  "skill": "Python",
  "status": "IN_PROGRESS",
  "modules": [...],
  "createdAt": "2025-01-30T12:00:00.000Z"
}
```

### GET /api/goals/[id]

Получить детали курса.

**Параметры:**
- `id` — ID курса

**Ответ:**

```json
{
  "id": "goal123",
  "title": "Python для начинающих",
  "skill": "Python",
  "status": "IN_PROGRESS",
  "modules": [
    {
      "id": "module1",
      "name": "Основы Python",
      "topics": [...]
    }
  ],
  "progress": {
    "completed": 5,
    "total": 15,
    "percentage": 33
  }
}
```

### DELETE /api/goals/[id]

Удалить курс.

**Параметры:**
- `id` — ID курса

**Ответ:**

```json
{
  "success": true,
  "message": "Goal deleted successfully"
}
```

---

## Уроки (Topics)

### GET /api/topics/[id]/lesson

Получить урок (теория или практика).

**Параметры:**
- `id` — ID темы
- `type` — тип урока (`theory` или `practice`)

**Пример: GET /api/topics/topic123/lesson?type=theory**

**Ответ (теория):**

```json
{
  "type": "theory",
  "content": "# Переменные в Python\n\nПеременная — это...",
  "metadata": {
    "wordCount": 3500,
    "readingTime": 15,
    "sections": [
      "Введение",
      "Типы данных",
      "Примеры"
    ]
  }
}
```

**Пример: GET /api/topics/topic123/lesson?type=practice**

**Ответ (практика):**

```json
{
  "type": "practice",
  "tasks": [
    {
      "id": "task1",
      "type": "single",
      "difficulty": "EASY",
      "question": "Какой тип данных у переменной x = 5?",
      "options": ["int", "str", "float", "bool"],
      "correctAnswer": 0,
      "explanation": "5 — это целое число, тип int"
    },
    {
      "id": "task2",
      "type": "code",
      "difficulty": "MEDIUM",
      "question": "Напишите функцию для сложения двух чисел",
      "starterCode": "def add(a, b):\n    # Ваш код здесь\n    pass",
      "testCases": [
        { "input": [2, 3], "output": 5 },
        { "input": [10, 20], "output": 30 }
      ]
    }
  ]
}
```

### POST /api/topics/[id]/lesson

Отметить урок как пройденный.

**Параметры:**
- `id` — ID темы

**Тело запроса:**

```json
{
  "type": "theory",
  "timeSpent": 900
}
```

**Ответ:**

```json
{
  "success": true,
  "xpEarned": 100,
  "newLevel": 5,
  "achievements": ["first_lesson"]
}
```

### POST /api/topics/[id]/submit

Отправить ответ на задание.

**Параметры:**
- `id` — ID темы

**Тело запроса:**

```json
{
  "taskId": "task1",
  "answer": 0,
  "timeSpent": 30
}
```

**Ответ:**

```json
{
  "correct": true,
  "xpEarned": 10,
  "explanation": "Правильно! 5 — это целое число типа int",
  "nextTask": "task2"
}
```

---

## MCP File Operations

### POST /api/files

Сохранить файл.

**Тело запроса:**

```json
{
  "filename": "example.js",
  "content": "console.log('Hello World')",
  "type": "code"
}
```

**Параметры:**
- `filename` — имя файла (обязательно)
- `content` — содержимое файла (обязательно)
- `type` — тип файла: `code`, `note`, или `example` (обязательно)

**Ответ:**

```json
{
  "id": "file123",
  "filename": "example.js",
  "path": "user-files/user123/example.js",
  "type": "code",
  "url": "/api/files/download?userId=user123&filename=example.js",
  "createdAt": "2025-01-30T12:00:00.000Z"
}
```

**Коды ошибок:**
- `400` — Отсутствуют обязательные поля или неверный тип
- `401` — Не авторизован
- `409` — Файл с таким именем уже существует
- `500` — Внутренняя ошибка сервера

### GET /api/files

Получить список файлов пользователя.

**Параметры запроса:**
- `type` (опционально) — фильтр по типу (`code`, `note`, `example`)

**Пример: GET /api/files?type=code**

**Ответ:**

```json
[
  {
    "id": "file123",
    "filename": "example.js",
    "path": "user-files/user123/example.js",
    "type": "code",
    "url": "/api/files/download?userId=user123&filename=example.js",
    "createdAt": "2025-01-30T12:00:00.000Z"
  },
  {
    "id": "file124",
    "filename": "test.py",
    "path": "user-files/user123/test.py",
    "type": "code",
    "url": "/api/files/download?userId=user123&filename=test.py",
    "createdAt": "2025-01-30T13:00:00.000Z"
  }
]
```

### GET /api/files/download

Скачать файл.

**Параметры запроса:**
- `userId` — ID пользователя (обязательно)
- `filename` — имя файла (обязательно)

**Пример: GET /api/files/download?userId=user123&filename=example.js**

**Ответ:**
- Содержимое файла с соответствующим `Content-Type`
- Заголовок `Content-Disposition: attachment; filename="example.js"`

**Коды ошибок:**
- `400` — Отсутствуют обязательные параметры
- `401` — Не авторизован
- `403` — Попытка скачать чужой файл
- `404` — Файл не найден
- `500` — Внутренняя ошибка сервера

---

## AI Chat

### POST /api/chat

Отправить сообщение AI-репетитору.

**Тело запроса:**

```json
{
  "message": "Объясни что такое замыкания в JavaScript",
  "characterId": "default",
  "threadId": "thread_abc123",
  "topicSlug": "javascript-closures",
  "files": []
}
```

**Параметры:**
- `message` — текст сообщения (обязательно если нет files)
- `characterId` — ID персонажа AI (по умолчанию `default`)
- `threadId` — ID потока для сохранения контекста (опционально)
- `topicSlug` — slug текущей темы для контекста (опционально)
- `files` — массив прикреплённых файлов (опционально)

**Ответ:**

```json
{
  "userMessage": {
    "id": "msg123",
    "role": "USER",
    "content": "Объясни что такое замыкания в JavaScript",
    "createdAt": "2025-01-30T12:00:00.000Z"
  },
  "aiMessage": {
    "id": "msg124",
    "role": "ASSISTANT",
    "content": "Замыкание (closure) — это функция, которая имеет доступ к переменным из внешней области видимости...",
    "createdAt": "2025-01-30T12:00:01.000Z"
  },
  "sessionId": "session_xyz",
  "threadId": "thread_abc123"
}
```

**С MCP tool calls:**

```json
{
  "userMessage": {...},
  "aiMessage": {
    "id": "msg124",
    "role": "ASSISTANT",
    "content": "Вот пример кода:\n\n```javascript\nfunction outer() {\n  let count = 0;\n  return function inner() {\n    count++;\n    return count;\n  }\n}\n```\n\n✅ Файл сохранён: [closure-example.js](/api/files/download?...)",
    "createdAt": "2025-01-30T12:00:01.000Z"
  },
  "sessionId": "session_xyz",
  "threadId": "thread_abc123",
  "toolCalls": [
    {
      "tool": "save_file",
      "result": {
        "path": "user-files/user123/closure-example.js",
        "url": "/api/files/download?userId=user123&filename=closure-example.js"
      }
    }
  ]
}
```

**С веб-поиском:**

```json
{
  "userMessage": {...},
  "aiMessage": {
    "id": "msg124",
    "role": "ASSISTANT",
    "content": "Вот что я нашёл о React 19:\n\n🔍 Результаты поиска:\n\n1. **[React 19 Release Notes](https://react.dev/blog/...)**\n   React 19 introduces Actions, use() hook...\n\n2. **[What's New in React 19](https://example.com)**\n   ...",
    "createdAt": "2025-01-30T12:00:01.000Z"
  },
  "sessionId": "session_xyz",
  "threadId": "thread_abc123",
  "toolCalls": [
    {
      "tool": "search",
      "result": [
        {
          "title": "React 19 Release Notes",
          "url": "https://react.dev/blog/...",
          "snippet": "React 19 introduces Actions, use() hook...",
          "publishedDate": "2024-12-05"
        }
      ]
    }
  ]
}
```

### GET /api/chat

Получить историю чата.

**Параметры запроса:**
- `characterId` — ID персонажа (по умолчанию `default`)
- `limit` — количество сообщений (по умолчанию 50)

**Пример: GET /api/chat?characterId=default&limit=20**

**Ответ:**

```json
[
  {
    "id": "msg123",
    "role": "USER",
    "content": "Привет!",
    "createdAt": "2025-01-30T12:00:00.000Z"
  },
  {
    "id": "msg124",
    "role": "ASSISTANT",
    "content": "Привет! Чем могу помочь?",
    "createdAt": "2025-01-30T12:00:01.000Z"
  }
]
```

---

## Повторение (Review)

### GET /api/review

Получить карточки для повторения.

**Параметры запроса:**
- `limit` — количество карточек (по умолчанию 20)

**Ответ:**

```json
[
  {
    "id": "card123",
    "front": "Что такое замыкание?",
    "back": "Функция с доступом к внешней области видимости",
    "easeFactor": 2.5,
    "interval": 1,
    "repetitions": 0,
    "nextReview": "2025-01-31T12:00:00.000Z"
  }
]
```

### POST /api/review/[id]

Обновить карточку после повторения.

**Параметры:**
- `id` — ID карточки

**Тело запроса:**

```json
{
  "quality": 4
}
```

**Параметры:**
- `quality` — качество ответа (0-5):
  - 0 — полный провал
  - 1 — неправильно, но вспомнил
  - 2 — правильно с трудом
  - 3 — правильно с усилием
  - 4 — правильно легко
  - 5 — идеально

**Ответ:**

```json
{
  "id": "card123",
  "easeFactor": 2.6,
  "interval": 6,
  "repetitions": 1,
  "nextReview": "2025-02-05T12:00:00.000Z"
}
```

---

## Статистика

### GET /api/stats

Получить статистику пользователя.

**Ответ:**

```json
{
  "totalXP": 2500,
  "level": 5,
  "rank": "Ученик",
  "streak": 7,
  "totalMinutes": 1200,
  "tasksCompleted": 45,
  "cardsReviewed": 120,
  "achievements": [
    {
      "type": "FIRST_LESSON",
      "unlockedAt": "2025-01-25T12:00:00.000Z"
    },
    {
      "type": "STREAK_7",
      "unlockedAt": "2025-01-30T12:00:00.000Z"
    }
  ],
  "activityCalendar": {
    "2025-01-30": 45,
    "2025-01-29": 30,
    "2025-01-28": 60
  }
}
```

---

## Коды ошибок

| Код | Описание |
|-----|----------|
| 200 | Успешный запрос |
| 201 | Ресурс создан |
| 400 | Неверные параметры запроса |
| 401 | Не авторизован |
| 403 | Доступ запрещён |
| 404 | Ресурс не найден |
| 409 | Конфликт (например, файл уже существует) |
| 429 | Превышен лимит запросов |
| 500 | Внутренняя ошибка сервера |

## Формат ошибок

Все ошибки возвращаются в формате:

```json
{
  "error": "Описание ошибки",
  "code": "ERROR_CODE",
  "details": {
    "field": "Дополнительная информация"
  }
}
```

**Пример:**

```json
{
  "error": "Filename and content are required",
  "code": "MISSING_FIELDS",
  "details": {
    "missing": ["filename", "content"]
  }
}
```

---

## Rate Limiting

API имеет следующие лимиты:

| Эндпоинт | Лимит |
|----------|-------|
| `/api/chat` | 30 запросов/мин |
| `/api/goals` (POST) | 10 запросов/час |
| `/api/files` (POST) | 100 запросов/час |
| Остальные | 100 запросов/мин |

При превышении лимита возвращается код `429` с заголовком `Retry-After`.

---

## Примеры использования

### JavaScript (fetch)

```javascript
// Создание курса
const response = await fetch('/api/goals', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Python для начинающих',
    skill: 'Python'
  })
})

const goal = await response.json()
console.log('Курс создан:', goal.id)
```

### Python (requests)

```python
import requests

# Сохранение файла
response = requests.post(
    'http://localhost:3000/api/files',
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    },
    json={
        'filename': 'example.py',
        'content': 'print("Hello World")',
        'type': 'code'
    }
)

file_data = response.json()
print(f'Файл сохранён: {file_data["url"]}')
```

### cURL

```bash
# Отправка сообщения в чат
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "message": "Объясни что такое рекурсия",
    "characterId": "default"
  }'
```

---

## Webhooks (в разработке)

В будущих версиях планируется поддержка webhooks для уведомлений о событиях:

- Завершение генерации курса
- Получение достижения
- Напоминание о повторении
- Окончание streak

---

## Changelog

### v1.1.0 (2025-01-30)
- Добавлена MCP интеграция
- Новые эндпоинты для файловых операций
- Веб-поиск в AI-чате
- Contextual memory в чате

### v1.0.0 (2025-01-15)
- Первый релиз
- Базовые эндпоинты для курсов и уроков
- AI-чат
- Система повторения
