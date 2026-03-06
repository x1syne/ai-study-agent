# Улучшения AI Study Agent на основе статьи про LangGraph и MCP

## 1. Агентная архитектура для генерации теории

### Текущая проблема:
- Линейная генерация секций
- Нет retry при ошибках отдельных секций
- Сложно отследить где упало

### Решение из статьи:
Использовать граф состояний LangGraph (адаптация для TypeScript):

```typescript
// lib/ai/theory-agent.ts
interface TheoryState {
  topic: string
  analysis: TopicAnalysis | null
  sections: Section[]
  currentSection: number
  errors: string[]
}

class TheoryGenerationAgent {
  private workflow: StateGraph<TheoryState>
  
  constructor() {
    this.workflow = new StateGraph()
    
    // Узлы графа
    this.workflow.addNode('analyze', this.analyzeTopic)
    this.workflow.addNode('generateSection', this.generateSection)
    this.workflow.addNode('validateQuality', this.validateQuality)
    this.workflow.addNode('retry', this.retryFailed)
    
    // Рёбра (переходы)
    this.workflow.addEdge('analyze', 'generateSection')
    this.workflow.addConditionalEdge('generateSection', this.shouldRetry, {
      retry: 'retry',
      next: 'validateQuality'
    })
  }
  
  async generateTheory(topic: string): Promise<string> {
    const result = await this.workflow.invoke({ topic })
    return result.sections.join('\n\n')
  }
}
```

## 2. MCP интеграция для AI-чата

### Новые возможности:

#### 2.1 Поиск актуальной информации
```typescript
// Пользователь: "Какие новые фичи в React 19?"
→ MCP brave-search ищет в интернете
→ Возвращает актуальную информацию
→ AI формирует ответ на основе найденного
```

#### 2.2 Работа с файлами
```typescript
// Пользователь: "Сохрани этот код в файл example.js"
→ MCP filesystem создаёт файл
→ Пользователь может скачать
```

#### 2.3 Анализ кода из репозитория
```typescript
// Пользователь: "Проанализируй мой проект на GitHub"
→ MCP git клонирует репо
→ MCP filesystem читает файлы
→ AI анализирует и даёт рекомендации
```

### Реализация:

```typescript
// lib/mcp/mcp-client.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

export class MCPClient {
  private clients: Map<string, Client> = new Map()
  
  async initializeServers() {
    // Файловая система
    const fsTransport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', './user-files']
    })
    const fsClient = new Client({ name: 'filesystem' }, { capabilities: {} })
    await fsClient.connect(fsTransport)
    this.clients.set('filesystem', fsClient)
    
    // Веб-поиск
    const searchTransport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: { BRAVE_API_KEY: process.env.BRAVE_API_KEY }
    })
    const searchClient = new Client({ name: 'search' }, { capabilities: {} })
    await searchClient.connect(searchTransport)
    this.clients.set('search', searchClient)
  }
  
  async callTool(server: string, tool: string, args: any) {
    const client = this.clients.get(server)
    if (!client) throw new Error(`Server ${server} not found`)
    
    return await client.callTool({ name: tool, arguments: args })
  }
}
```

## 3. Классификация сложности заданий

### Агент для автоматической оценки:

```typescript
// lib/ai/task-classifier.ts
interface TaskClassification {
  difficulty: 'easy' | 'medium' | 'hard'
  topics: string[]
  estimatedTime: number
  confidence: number
}

class TaskClassifierAgent {
  async classify(taskDescription: string): Promise<TaskClassification> {
    // Граф состояний:
    // 1. Анализ текста задания
    // 2. Определение сложности
    // 3. Извлечение тем
    // 4. Оценка времени
    // 5. Расчёт уверенности
  }
}
```

## 4. Контекстная память в чате

### Текущая проблема:
Чат не помнит контекст между сообщениями в рамках одной сессии.

### Решение:

```typescript
// lib/ai/chat-memory.ts
interface ChatMemory {
  threadId: string
  messages: Message[]
  context: {
    currentTopic?: string
    lastCodeExample?: string
    userLevel?: 'beginner' | 'intermediate' | 'advanced'
  }
}

class MemoryManager {
  private storage = new Map<string, ChatMemory>()
  
  getContext(threadId: string): ChatMemory {
    return this.storage.get(threadId) || this.createNew(threadId)
  }
  
  updateContext(threadId: string, update: Partial<ChatMemory>) {
    const current = this.getContext(threadId)
    this.storage.set(threadId, { ...current, ...update })
  }
}
```

## 5. Retry механизм для генерации

### Декоратор для автоматических повторов:

```typescript
// lib/utils/retry.ts
export function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await fn()
        resolve(result)
        return
      } catch (error) {
        if (i === maxRetries - 1) {
          reject(error)
          return
        }
        await new Promise(r => setTimeout(r, delay * (i + 1)))
      }
    }
  })
}

// Использование:
const theory = await withRetry(
  () => generateTheory(topic),
  3,
  2000
)
```

## 6. Валидация конфигурации

### Проверка настроек при старте:

```typescript
// lib/config/validator.ts
interface AppConfig {
  groqApiKey: string
  supabaseUrl: string
  enableMCP: boolean
  mcpServers: string[]
}

class ConfigValidator {
  validate(config: AppConfig): void {
    if (!config.groqApiKey) {
      throw new Error('GROQ_API_KEY not configured')
    }
    
    if (config.enableMCP && config.mcpServers.length === 0) {
      console.warn('MCP enabled but no servers configured')
    }
    
    // Проверка доступности API
    this.checkAPIAccess(config.groqApiKey)
  }
}
```

## Приоритеты внедрения:

### Высокий приоритет (быстрый эффект):
1. ✅ Retry механизм для генерации теории
2. ✅ Контекстная память в чате
3. ✅ Валидация конфигурации

### Средний приоритет (улучшение UX):
4. 🔄 Классификация сложности заданий
5. 🔄 Агентная архитектура для генерации

### Низкий приоритет (расширенные фичи):
6. 🔮 MCP интеграция для веб-поиска
7. 🔮 MCP интеграция для файловой системы

## Следующие шаги:

1. Добавить retry в `agent-fast.ts`
2. Реализовать память в чате
3. Создать валидатор конфигурации
4. Протестировать улучшения
5. Постепенно внедрять MCP

## Полезные ссылки:

- [LangGraph документация](https://langchain-ai.github.io/langgraph/)
- [MCP Protocol](https://modelcontextprotocol.io/)
- [Статья на Хабре](https://habr.com/ru/companies/amvera/articles/929568/)
