# MCP Integration Guide

## Введение

Model Context Protocol (MCP) — это открытый стандарт для подключения языковых моделей к внешним инструментам и данным. В AI Study Agent MCP интеграция расширяет возможности AI-агента, позволяя ему выполнять реальные действия: сохранять файлы, искать информацию в интернете, и многое другое.

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Study Agent                          │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   AI Chat    │      │ Theory Gen   │                    │
│  │              │      │              │                    │
│  │  - Memory    │      │ - State      │                    │
│  │  - Context   │      │   Machine    │                    │
│  │  - MCP Tools │      │ - Retry      │                    │
│  └──────┬───────┘      └──────┬───────┘                    │
│         │                     │                             │
│         └──────────┬──────────┘                             │
│                    │                                        │
│         ┌──────────▼──────────┐                            │
│         │   MCP Client        │                            │
│         │                     │                            │
│         │  - Server Manager   │                            │
│         │  - Tool Router      │                            │
│         │  - Error Handler    │                            │
│         └──────────┬──────────┘                            │
│                    │                                        │
└────────────────────┼────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼─────┐          ┌─────▼────┐
    │Filesystem│          │  Brave   │
    │  Server  │          │  Search  │
    └──────────┘          └──────────┘
```

## Компоненты

### 1. MCP Client (`lib/mcp/mcp-client.ts`)

Центральный компонент для управления MCP-серверами.

**Основные методы:**
- `initialize()` — инициализация всех серверов
- `callTool()` — вызов инструмента
- `listTools()` — получение списка доступных инструментов
- `getServerStatus()` — проверка статуса сервера

### 2. Filesystem Tool (`lib/mcp/tools/filesystem.ts`)

Обёртка для работы с файловой системой.

**Методы:**
- `saveFile()` — сохранение файла
- `readFile()` — чтение файла
- `listFiles()` — список файлов пользователя
- `deleteFile()` — удаление файла

**Безопасность:**
- Валидация путей (предотвращение directory traversal)
- Изоляция файлов пользователей
- Санитизация имён файлов
- Валидация расширений файлов

### 3. Search Tool (`lib/mcp/tools/search.ts`)

Обёртка для веб-поиска через Brave Search API.

**Методы:**
- `search()` — поиск в интернете
- `needsSearch()` — определение необходимости поиска

**Оптимизация:**
- Кэширование результатов (1 час)
- Ограничение до 5 результатов
- Автоматическое определение необходимости поиска

### 4. Memory Manager (`lib/ai/memory-manager.ts`)

Управление контекстом чата.

**Возможности:**
- Хранение до 10 сообщений в памяти
- Автоматическая суммаризация старых сообщений
- Поиск в контексте
- Извлечение кода из истории

### 5. Retry Mechanism (`lib/utils/retry.ts`)

Универсальный механизм повторов с экспоненциальной задержкой.

**Параметры:**
- `maxRetries` — максимум попыток (по умолчанию 3)
- `initialDelay` — начальная задержка (мс)
- `maxDelay` — максимальная задержка (мс)
- `backoffMultiplier` — множитель для экспоненциального роста

### 6. Configuration Validator (`lib/config/validator.ts`)

Валидация конфигурации при старте приложения.

**Проверки:**
- Наличие обязательных переменных окружения
- Подключение к Groq API
- Конфигурация MCP серверов
- Права доступа к файловой системе

## Настройка

### 1. Переменные окружения

Добавьте в `.env`:

```env
# MCP Integration
MCP_ENABLED=true
BRAVE_API_KEY=BSA_xxx  # Опционально, для веб-поиска
MCP_FILESYSTEM_PATH=./user-files  # Путь для файлов
```

### 2. MCP Configuration

Файл `.kiro/settings/mcp.json` содержит конфигурацию серверов:

```json
{
  "mcpServers": {
    "filesystem": {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./user-files"],
      "disabled": false,
      "autoApprove": ["read_file", "write_file", "list_directory"]
    },
    "brave-search": {
      "name": "brave-search",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      },
      "disabled": false,
      "autoApprove": ["brave_web_search"]
    }
  },
  "globalSettings": {
    "enabled": true,
    "logLevel": "info",
    "timeout": 30000,
    "retryAttempts": 3
  }
}
```

### 3. Инициализация

MCP автоматически инициализируется при старте приложения через `instrumentation.ts`:

```typescript
import { ConfigValidator } from '@/lib/config/validator'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const validator = new ConfigValidator()
    const result = validator.validate()
    validator.displayStatus(result)
    
    if (!result.valid) {
      throw new Error('Configuration validation failed')
    }
  }
}
```

## Использование

### В AI Chat

MCP инструменты автоматически вызываются когда AI определяет необходимость:

**Пример 1: Сохранение файла**

```
Студент: "Сохрани этот код в файл example.js:
console.log('Hello World')"

AI: [Автоматически вызывает FilesystemTool.saveFile()]
    "Код сохранён! ✅ Файл сохранён: [example.js](/api/files/download?...)"
```

**Пример 2: Веб-поиск**

```
Студент: "Какие новые фичи в React 19?"

AI: [Автоматически вызывает SearchTool.search()]
    "Вот что я нашёл о React 19:
    
    🔍 Результаты поиска:
    1. **React 19 Release Notes**
       https://react.dev/blog/2024/12/05/react-19
       React 19 introduces Actions, use() hook, and more...
    
    2. **What's New in React 19**
       ..."
```

### Через API

#### POST /api/files

Сохранение файла:

```bash
curl -X POST http://localhost:3000/api/files \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "filename": "example.js",
    "content": "console.log(\"Hello World\")",
    "type": "code"
  }'
```

Ответ:

```json
{
  "id": "clx123...",
  "filename": "example.js",
  "path": "user-files/user123/example.js",
  "type": "code",
  "url": "/api/files/download?userId=user123&filename=example.js",
  "createdAt": "2025-01-30T12:00:00.000Z"
}
```

#### GET /api/files

Список файлов:

```bash
curl http://localhost:3000/api/files?type=code \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### GET /api/files/download

Скачивание файла:

```bash
curl http://localhost:3000/api/files/download?userId=user123&filename=example.js \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o example.js
```

### Программное использование

```typescript
import { FilesystemTool } from '@/lib/mcp/tools/filesystem'
import { SearchTool } from '@/lib/mcp/tools/search'
import { MCPClient } from '@/lib/mcp/mcp-client'

// Инициализация
const mcpClient = new MCPClient([])
const filesystemTool = new FilesystemTool(mcpClient)
const searchTool = new SearchTool(process.env.BRAVE_API_KEY!)

// Сохранение файла
const result = await filesystemTool.saveFile({
  userId: 'user123',
  filename: 'test.js',
  content: 'console.log("test")',
  type: 'code'
})

console.log('File saved:', result.path)
console.log('Download URL:', result.url)

// Поиск
const searchResults = await searchTool.search({
  query: 'React 19 features',
  count: 5
})

searchResults.forEach(result => {
  console.log(result.title, result.url)
})
```

## Безопасность

### Path Validation

Все пути файлов валидируются для предотвращения directory traversal:

```typescript
function validatePath(path: string): boolean {
  // Запрещены: .., /, абсолютные пути
  if (path.includes('..')) return false
  if (path.startsWith('/')) return false
  return true
}
```

### User Isolation

Файлы каждого пользователя изолированы:

```
user-files/
├── user123/
│   ├── example.js
│   └── notes.md
├── user456/
│   └── test.py
```

### Filename Sanitization

Имена файлов очищаются от опасных символов:

```typescript
function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_')
}
```

### API Key Protection

API ключи никогда не передаются на клиент:
- Хранятся только в `.env` на сервере
- Используются только в серверных компонентах
- Не включаются в ответы API

## Мониторинг и отладка

### Логирование

MCP операции логируются с префиксом `[MCP]`:

```
[MCP] Initialization complete
[MCP] Filesystem server: running
[MCP] Brave-search server: running
[Chat] Tool detection: { needsFileSave: true, fileInfo: {...} }
[Chat] Executing FilesystemTool...
[Chat] File saved: user-files/user123/example.js
```

### Проверка статуса

Проверьте статус серверов в настройках приложения или через API:

```typescript
const status = await mcpClient.getServerStatus('filesystem')
console.log(status)
// {
//   name: 'filesystem',
//   running: true,
//   lastPing: 1706616000000,
//   tools: [...]
// }
```

### Метрики

Отслеживайте использование MCP:

```typescript
// В production можно добавить метрики
metrics.increment('mcp.tool.calls', { server: 'filesystem', tool: 'save_file' })
metrics.timing('mcp.tool.duration', duration, { server: 'filesystem' })
```

## Расширение

### Добавление нового MCP сервера

1. Добавьте конфигурацию в `mcp.json`:

```json
{
  "my-server": {
    "name": "my-server",
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-my-server"],
    "disabled": false,
    "autoApprove": ["my_tool"]
  }
}
```

2. Создайте обёртку в `lib/mcp/tools/my-tool.ts`:

```typescript
export class MyTool {
  constructor(private mcpClient: MCPClient) {}
  
  async myMethod(params: any) {
    return await this.mcpClient.callTool({
      server: 'my-server',
      tool: 'my_tool',
      arguments: params
    })
  }
}
```

3. Интегрируйте в `tool-detector.ts`:

```typescript
export function detectToolNeeds(message: string) {
  // ... existing detection
  
  const needsMyTool = message.includes('my keyword')
  
  return {
    // ... existing tools
    needsMyTool,
    myToolParams: needsMyTool ? extractParams(message) : null
  }
}
```

4. Используйте в `app/api/chat/route.ts`:

```typescript
if (toolDetection.needsMyTool) {
  const myTool = new MyTool(mcpClient)
  const result = await myTool.myMethod(toolDetection.myToolParams)
  toolResults.push({ tool: 'my_tool', result })
}
```

## Тестирование

### Unit Tests

```typescript
import { FilesystemTool } from '@/lib/mcp/tools/filesystem'

describe('FilesystemTool', () => {
  it('should validate paths correctly', () => {
    expect(validatePath('file.txt')).toBe(true)
    expect(validatePath('../etc/passwd')).toBe(false)
  })
})
```

### Property-Based Tests

```typescript
import * as fc from 'fast-check'

it('Property: File operations safety', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 1 }),
      async (userId, filename) => {
        const result = await filesystemTool.saveFile({
          userId,
          filename,
          content: 'test',
          type: 'code'
        })
        
        expect(result.path).toContain(`user-files/${userId}`)
        expect(result.path).not.toContain('..')
      }
    ),
    { numRuns: 100 }
  )
})
```

### Integration Tests

```typescript
describe('MCP Chat Integration', () => {
  it('should save file when user requests', async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Сохрани код в файл test.js',
        threadId: 'test-thread'
      })
    })
    
    const data = await response.json()
    expect(data.toolCalls).toContainEqual({
      tool: 'save_file',
      result: expect.objectContaining({
        path: expect.stringContaining('test.js')
      })
    })
  })
})
```

## Производительность

### Кэширование

Результаты поиска кэшируются на 1 час:

```typescript
class SearchCache {
  private cache = new Map<string, CachedSearch>()
  private ttl = 3600000 // 1 час
  
  get(query: string): SearchResult[] | null {
    const cached = this.cache.get(query)
    if (!cached) return null
    
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(query)
      return null
    }
    
    return cached.results
  }
}
```

### Retry с Backoff

Автоматические повторы при сбоях:

```typescript
await withRetry(
  () => generateSection(section),
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  }
)
```

### Параллельная генерация

Секции генерируются параллельно:

```typescript
const sections = await Promise.all(
  structure.sections.map(section => 
    generateSection(section)
  )
)
```

## Лучшие практики

1. **Всегда валидируйте пути файлов** перед операциями
2. **Используйте retry механизм** для сетевых операций
3. **Кэшируйте результаты** где возможно
4. **Логируйте все MCP операции** для отладки
5. **Обрабатывайте ошибки gracefully** — не ломайте UX
6. **Изолируйте файлы пользователей** в отдельных директориях
7. **Не передавайте API ключи** на клиент
8. **Используйте property-based тесты** для проверки безопасности

## Дополнительные ресурсы

- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Brave Search API Docs](https://brave.com/search/api/)
- [AI Study Agent GitHub](https://github.com/x1syne/ai-study-agent)
