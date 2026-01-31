# Design Document: MCP Integration для AI Study Agent

## Overview

Интеграция Model Context Protocol (MCP) расширит возможности AI Study Agent, превратив его из простого генератора контента в полноценного AI-агента, способного выполнять реальные действия. Дизайн основан на архитектуре из статей про LangGraph и MCP, адаптированной под существующую кодовую базу проекта.

### Goals

1. Добавить MCP-серверы для работы с файлами и веб-поиском
2. Улучшить надёжность генерации контента через retry механизм
3. Добавить контекстную память в AI-чат
4. Реализовать валидацию конфигурации
5. Улучшить классификацию сложности заданий
6. Внедрить state graph архитектуру для генерации теории

### Non-Goals

- Полная переработка существующей системы генерации
- Интеграция с другими MCP-серверами (git, docker) в первой версии
- Миграция на LangGraph (используем упрощённую версию state machine)

## Architecture

### High-Level Architecture

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

### Component Interaction Flow

```
User Request
     │
     ▼
┌─────────────┐
│  AI Chat    │
│  Handler    │
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌──────────────┐
│   Memory    │◄─────┤  Context     │
│   Manager   │      │  Retrieval   │
└──────┬──────┘      └──────────────┘
       │
       ▼
┌─────────────┐
│  MCP Tool   │
│  Detection  │
└──────┬──────┘
       │
       ├─────► Filesystem Tool
       │
       └─────► Search Tool
```

## Components and Interfaces

### 1. MCP Client (`lib/mcp/mcp-client.ts`)

Центральный компонент для управления MCP-серверами.

```typescript
interface MCPServerConfig {
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  disabled?: boolean
  autoApprove?: string[]
}

interface MCPToolCall {
  server: string
  tool: string
  arguments: Record<string, any>
}

interface MCPToolResult {
  success: boolean
  content: any
  error?: string
}

class MCPClient {
  private servers: Map<string, MCPServer>
  private config: MCPServerConfig[]
  
  constructor(config: MCPServerConfig[])
  
  // Инициализация всех серверов
  async initialize(): Promise<void>
  
  // Вызов инструмента
  async callTool(call: MCPToolCall): Promise<MCPToolResult>
  
  // Получение списка доступных инструментов
  async listTools(serverName?: string): Promise<MCPTool[]>
  
  // Проверка статуса сервера
  async getServerStatus(serverName: string): Promise<ServerStatus>
  
  // Переподключение сервера
  async reconnectServer(serverName: string): Promise<void>
}
```

### 2. Filesystem Tool (`lib/mcp/tools/filesystem.ts`)

Обёртка для работы с файловой системой через MCP.

```typescript
interface FilesystemTool {
  // Сохранение файла
  saveFile(params: {
    userId: string
    filename: string
    content: string
    type: 'code' | 'note' | 'example'
  }): Promise<{ path: string; url: string }>
  
  // Чтение файла
  readFile(params: {
    userId: string
    filename: string
  }): Promise<{ content: string }>
  
  // Список файлов пользователя
  listFiles(params: {
    userId: string
    type?: string
  }): Promise<FileInfo[]>
  
  // Удаление файла
  deleteFile(params: {
    userId: string
    filename: string
  }): Promise<{ success: boolean }>
}

// Валидация путей
function validatePath(path: string): boolean {
  // Проверка на directory traversal
  if (path.includes('..')) return false
  if (path.startsWith('/')) return false
  return true
}

// Генерация безопасного пути
function getUserFilePath(userId: string, filename: string): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `user-files/${userId}/${sanitized}`
}
```

### 3. Search Tool (`lib/mcp/tools/search.ts`)

Обёртка для веб-поиска через Brave Search API.

```typescript
interface SearchTool {
  // Поиск в интернете
  search(params: {
    query: string
    count?: number
  }): Promise<SearchResult[]>
  
  // Проверка нужен ли поиск
  needsSearch(query: string): boolean
}

interface SearchResult {
  title: string
  url: string
  snippet: string
  publishedDate?: string
}

// Кэш для поиска
class SearchCache {
  private cache: Map<string, CachedSearch>
  private ttl: number = 3600000 // 1 час
  
  get(query: string): SearchResult[] | null
  set(query: string, results: SearchResult[]): void
  clear(): void
}
```

### 4. Memory Manager (`lib/ai/memory-manager.ts`)

Управление контекстом чата.

```typescript
interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  metadata?: {
    codeBlocks?: string[]
    topics?: string[]
  }
}

interface ChatMemory {
  threadId: string
  messages: ChatMessage[]
  summary?: string
  context: {
    currentTopic?: string
    userLevel?: 'beginner' | 'intermediate' | 'advanced'
    lastCodeExample?: string
  }
}

class MemoryManager {
  private storage: Map<string, ChatMemory>
  private maxMessages: number = 10
  
  // Создание новой сессии
  createSession(userId: string): string
  
  // Добавление сообщения
  addMessage(threadId: string, message: ChatMessage): void
  
  // Получение контекста
  getContext(threadId: string): ChatMemory
  
  // Суммаризация старых сообщений
  async summarizeOldMessages(threadId: string): Promise<void>
  
  // Поиск в контексте
  findInContext(threadId: string, query: string): ChatMessage[]
}
```

### 5. Retry Mechanism (`lib/utils/retry.ts`)

Универсальный механизм повторов с экспоненциальной задержкой.

```typescript
interface RetryOptions {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  shouldRetry?: (error: any) => boolean
  onRetry?: (attempt: number, error: any) => void
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Не повторяем для rate limit
      if (error.status === 429) {
        throw error
      }
      
      // Проверяем нужно ли повторять
      if (options.shouldRetry && !options.shouldRetry(error)) {
        throw error
      }
      
      // Последняя попытка
      if (attempt === options.maxRetries) {
        throw error
      }
      
      // Вызываем callback
      if (options.onRetry) {
        options.onRetry(attempt + 1, error)
      }
      
      // Экспоненциальная задержка
      const delay = Math.min(
        options.initialDelay * Math.pow(options.backoffMultiplier, attempt),
        options.maxDelay
      )
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError
}
```

### 6. State Machine for Theory Generation (`lib/ai/theory-state-machine.ts`)

Упрощённая версия state graph для генерации теории.

```typescript
type StateNode = 'analyze' | 'generate' | 'validate' | 'retry' | 'complete' | 'failed'

interface TheoryState {
  topic: string
  courseName: string
  currentNode: StateNode
  analysis: TopicAnalysis | null
  sections: SectionResult[]
  errors: string[]
  retryCount: number
}

interface StateTransition {
  from: StateNode
  to: StateNode
  condition?: (state: TheoryState) => boolean
}

class TheoryStateMachine {
  private state: TheoryState
  private transitions: StateTransition[]
  private listeners: Map<StateNode, Function[]>
  
  constructor(topic: string, courseName: string)
  
  // Переход к следующему состоянию
  async transition(to: StateNode): Promise<void>
  
  // Выполнение узла
  async executeNode(node: StateNode): Promise<void>
  
  // Подписка на события
  on(node: StateNode, callback: Function): void
  
  // Получение текущего состояния
  getState(): TheoryState
  
  // Запуск генерации
  async run(): Promise<string>
}
```

### 7. Configuration Validator (`lib/config/validator.ts`)

Валидация конфигурации при старте.

```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

class ConfigValidator {
  // Валидация всей конфигурации
  validate(): ValidationResult
  
  // Проверка переменных окружения
  validateEnvVars(): string[]
  
  // Проверка MCP конфигурации
  validateMCPConfig(): string[]
  
  // Тест подключения к Groq
  async testGroqConnection(): Promise<boolean>
  
  // Вывод статуса в консоль
  displayStatus(result: ValidationResult): void
}
```

### 8. Task Classifier (`lib/ai/task-classifier.ts`)

AI-классификатор сложности заданий.

```typescript
interface TaskClassification {
  difficulty: 'easy' | 'medium' | 'hard'
  confidence: number
  factors: {
    complexity: number
    knowledgeRequired: number
    timeEstimate: number
  }
}

class TaskClassifier {
  // Классификация одного задания
  async classify(task: any): Promise<TaskClassification>
  
  // Классификация всех заданий
  async classifyBatch(tasks: any[]): Promise<TaskClassification[]>
  
  // Проверка распределения
  validateDistribution(classifications: TaskClassification[]): boolean
  
  // Ручная корректировка
  override(taskId: number, difficulty: string): void
}
```

## Data Models

### MCP Server Status

```typescript
interface ServerStatus {
  name: string
  running: boolean
  lastError?: string
  lastPing?: number
  tools: MCPTool[]
}

interface MCPTool {
  name: string
  description: string
  inputSchema: any
}
```

### Chat Memory Schema

```typescript
// Хранится в памяти (Map), не в БД
interface ChatMemory {
  threadId: string
  userId: string
  messages: ChatMessage[]
  summary?: string
  context: {
    currentTopic?: string
    userLevel?: 'beginner' | 'intermediate' | 'advanced'
    lastCodeExample?: string
  }
  createdAt: number
  lastActivity: number
}
```

### User Files Schema

```prisma
// Добавить в schema.prisma
model UserFile {
  id        String   @id @default(cuid())
  userId    String
  filename  String
  path      String
  type      String   // 'code', 'note', 'example'
  content   String   @db.Text
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, filename])
  @@index([userId])
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: File Operations Safety

*For any* user and any filename, when saving a file, the system should:
1. Validate the path to prevent directory traversal
2. Store the file in the user-specific directory
3. Return a valid download URL

**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Search Result Formatting

*For any* search query, all returned results should:
1. Contain valid URLs
2. Be limited to 5 or fewer items
3. Include source attribution

**Validates: Requirements 2.2, 2.4**

### Property 3: Search Caching

*For any* search query, when performed twice within 1 hour, the second call should use cached results without making a new API request.

**Validates: Requirements 2.5**

### Property 4: Retry Behavior with Tracking

*For any* section generation that fails, the system should:
1. Retry up to 3 times with exponential backoff
2. Log each retry attempt with error details
3. Track which sections failed and succeeded
4. Use fallback content after exhausting retries

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 5: Context Management

*For any* chat session, the system should:
1. Create a unique thread ID on session start
2. Include previous messages in context for each new message
3. Store context in memory (not database)

**Validates: Requirements 4.1, 4.2, 4.4**

### Property 6: Startup Validation

*For any* application startup, the system should:
1. Validate all required environment variables
2. Test API connectivity to Groq
3. Display configuration status in console

**Validates: Requirements 5.1, 5.4, 5.5**

### Property 7: Task Classification

*For any* generated task, the system should:
1. Analyze and assign a difficulty level using AI
2. Consider complexity, required knowledge, and time estimate
3. Ensure overall distribution matches 40% easy, 40% medium, 20% hard

**Validates: Requirements 6.1, 6.2, 6.3, 6.5**

### Property 8: State Machine Structure

*For any* theory generation, the state machine should:
1. Follow the sequence: analyze → generate → validate → complete
2. Track current state and allow inspection
3. Emit events for each state transition

**Validates: Requirements 7.1, 7.4, 7.5**

### Property 9: State Machine Error Handling

*For any* node failure in the state machine, the system should:
1. Transition to retry node
2. On validation failure, transition back to generate with feedback

**Validates: Requirements 7.2, 7.3**

### Property 10: MCP Server Status Display

*For any* MCP server, the UI should:
1. Show green indicator when running
2. Allow enabling/disabling without restart

**Validates: Requirements 8.2, 8.4**

## Error Handling

### MCP Server Errors

```typescript
class MCPError extends Error {
  constructor(
    public server: string,
    public tool: string,
    public originalError: any
  ) {
    super(`MCP Error [${server}/${tool}]: ${originalError.message}`)
  }
}

// Обработка ошибок
try {
  await mcpClient.callTool({ server: 'filesystem', tool: 'save', arguments: {...} })
} catch (error) {
  if (error instanceof MCPError) {
    // Логируем и показываем пользователю
    console.error(`MCP tool failed: ${error.server}/${error.tool}`)
    return { success: false, error: 'Failed to save file' }
  }
  throw error
}
```

### Retry Errors

```typescript
// Не повторяем для rate limit
if (error.status === 429) {
  console.warn('Rate limit hit, waiting...')
  await new Promise(resolve => setTimeout(resolve, 60000))
  return // Продолжаем без retry
}

// Не повторяем для валидационных ошибок
if (error.code === 'VALIDATION_ERROR') {
  throw error // Сразу выбрасываем
}
```

### Fallback Content

```typescript
// Если все попытки генерации провалились
if (allSectionsFailed) {
  console.error('All sections failed, using fallback')
  return getFallbackTheory(topic, courseName, domain)
}

// Если отдельная секция провалилась
if (sectionFailed && section.required) {
  sections.push({
    title: section.title,
    content: `*Раздел временно недоступен. Попробуйте обновить страницу.*`
  })
}
```

## Testing Strategy

### Unit Tests

Используем Vitest для unit-тестов:

```typescript
// tests/mcp/filesystem.test.ts
describe('Filesystem Tool', () => {
  it('should validate paths correctly', () => {
    expect(validatePath('file.txt')).toBe(true)
    expect(validatePath('../etc/passwd')).toBe(false)
    expect(validatePath('/etc/passwd')).toBe(false)
  })
  
  it('should generate safe user paths', () => {
    const path = getUserFilePath('user123', 'my file.js')
    expect(path).toBe('user-files/user123/my_file.js')
  })
})

// tests/utils/retry.test.ts
describe('Retry Mechanism', () => {
  it('should retry on failure', async () => {
    let attempts = 0
    const fn = async () => {
      attempts++
      if (attempts < 3) throw new Error('fail')
      return 'success'
    }
    
    const result = await withRetry(fn, {
      maxRetries: 3,
      initialDelay: 10,
      maxDelay: 100,
      backoffMultiplier: 2
    })
    
    expect(result).toBe('success')
    expect(attempts).toBe(3)
  })
  
  it('should not retry on 429', async () => {
    const fn = async () => {
      const error: any = new Error('Rate limit')
      error.status = 429
      throw error
    }
    
    await expect(withRetry(fn, { maxRetries: 3, initialDelay: 10, maxDelay: 100, backoffMultiplier: 2 }))
      .rejects.toThrow('Rate limit')
  })
})
```

### Property-Based Tests

Используем fast-check для property-based тестов (минимум 100 итераций):

```typescript
import * as fc from 'fast-check'

// tests/mcp/filesystem.property.test.ts
describe('Filesystem Properties', () => {
  it('Property 1: File operations safety', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }), // userId
        fc.string({ minLength: 1, maxLength: 50 }), // filename
        fc.string({ minLength: 1, maxLength: 1000 }), // content
        async (userId, filename, content) => {
          const result = await filesystemTool.saveFile({
            userId,
            filename,
            content,
            type: 'code'
          })
          
          // Проверяем безопасность пути
          expect(result.path).toContain(`user-files/${userId}`)
          expect(result.path).not.toContain('..')
          
          // Проверяем URL
          expect(result.url).toMatch(/^https?:\/\//)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// tests/ai/retry.property.test.ts
describe('Retry Properties', () => {
  it('Property 4: Retry behavior with tracking', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }), // failCount
        async (failCount) => {
          let attempts = 0
          const errors: string[] = []
          
          const fn = async () => {
            attempts++
            if (attempts <= failCount) {
              throw new Error(`Attempt ${attempts} failed`)
            }
            return 'success'
          }
          
          const result = await withRetry(fn, {
            maxRetries: 5,
            initialDelay: 10,
            maxDelay: 100,
            backoffMultiplier: 2,
            onRetry: (attempt, error) => {
              errors.push(error.message)
            }
          })
          
          // Проверяем количество попыток
          expect(attempts).toBe(failCount + 1)
          
          // Проверяем логирование
          expect(errors).toHaveLength(failCount)
          
          // Проверяем результат
          expect(result).toBe('success')
        }
      ),
      { numRuns: 100 }
    )
  })
})

// tests/ai/memory.property.test.ts
describe('Memory Properties', () => {
  it('Property 5: Context management', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }), // userId
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), { minLength: 1, maxLength: 20 }), // messages
        async (userId, messages) => {
          const memoryManager = new MemoryManager()
          const threadId = memoryManager.createSession(userId)
          
          // Проверяем уникальность thread ID
          expect(threadId).toBeTruthy()
          
          // Добавляем сообщения
          for (const content of messages) {
            memoryManager.addMessage(threadId, {
              role: 'user',
              content,
              timestamp: Date.now()
            })
          }
          
          // Получаем контекст
          const context = memoryManager.getContext(threadId)
          
          // Проверяем что контекст содержит сообщения
          expect(context.messages.length).toBeGreaterThan(0)
          expect(context.messages.length).toBeLessThanOrEqual(messages.length)
          
          // Проверяем что контекст не в БД (это in-memory)
          // (проверяем что нет вызовов к Prisma)
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Integration Tests

```typescript
// tests/integration/mcp-chat.test.ts
describe('MCP Chat Integration', () => {
  it('should save file when user requests', async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Сохрани этот код в файл example.js: console.log("Hello")',
        threadId: 'test-thread'
      })
    })
    
    const data = await response.json()
    
    // Проверяем что файл создан
    expect(data.toolCalls).toContainEqual({
      tool: 'save_file',
      result: expect.objectContaining({
        path: expect.stringContaining('example.js')
      })
    })
  })
  
  it('should search web when needed', async () => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Какие новые фичи в React 19?',
        threadId: 'test-thread'
      })
    })
    
    const data = await response.json()
    
    // Проверяем что был вызван поиск
    expect(data.toolCalls).toContainEqual({
      tool: 'search',
      query: expect.stringContaining('React 19')
    })
  })
})
```

### Test Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.ts'
      ]
    }
  }
})
```

## Implementation Notes

### Phase 1: Core Infrastructure (Week 1)

1. MCP Client базовая реализация
2. Filesystem Tool
3. Retry механизм
4. Configuration Validator

### Phase 2: AI Enhancements (Week 2)

1. Memory Manager
2. Search Tool
3. Task Classifier
4. State Machine

### Phase 3: UI and Polish (Week 3)

1. MCP Server Management UI
2. Интеграция в AI Chat
3. Интеграция в Theory Generation
4. Тестирование и багфиксы

### Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "fast-check": "^4.5.3"
  }
}
```

### Environment Variables

```env
# Существующие
GROQ_API_KEY=...
DATABASE_URL=...

# Новые
BRAVE_API_KEY=...           # Для веб-поиска
MCP_ENABLED=true            # Включить MCP
MCP_FILESYSTEM_PATH=./user-files  # Путь для файлов
```

## Security Considerations

1. **Path Validation**: Все пути файлов валидируются на directory traversal
2. **User Isolation**: Файлы каждого пользователя в отдельной директории
3. **API Keys**: Не передаются на клиент, только на сервере
4. **Rate Limiting**: Кэширование поиска, retry с backoff
5. **Input Sanitization**: Имена файлов очищаются от опасных символов

## Performance Considerations

1. **Memory Management**: Chat context ограничен 10 сообщениями
2. **Caching**: Поиск кэшируется на 1 час
3. **Parallel Generation**: Секции генерируются параллельно
4. **Lazy Loading**: MCP серверы запускаются по требованию

## Monitoring and Logging

```typescript
// Логирование MCP вызовов
console.log(`[MCP] Calling ${server}/${tool}`, arguments)

// Логирование retry
console.warn(`[Retry] Attempt ${attempt}/${maxRetries}`, error)

// Логирование state machine
console.log(`[StateMachine] ${from} → ${to}`)

// Метрики
metrics.increment('mcp.tool.calls', { server, tool })
metrics.timing('mcp.tool.duration', duration, { server, tool })
```
