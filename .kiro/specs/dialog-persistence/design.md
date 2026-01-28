# Design Document: Dialog Persistence (Checkpointers)

## Overview

Система персистентности диалогов реализует паттерн Checkpointer из LangGraph для сохранения состояния разговоров между сессиями. Использует PostgreSQL для хранения истории сообщений, сессий и предпочтений пользователей. Интегрируется с существующей системой чата через расширение модели ChatMessage и добавление новых сущностей.

## Architecture

```mermaid
graph TB
    subgraph "Frontend"
        Chat[Chat Component]
        SessionList[Session List]
    end
    
    subgraph "API Layer"
        ChatAPI[/api/chat]
        SessionAPI[/api/sessions]
        PrefsAPI[/api/preferences]
    end
    
    subgraph "Services"
        Checkpointer[Checkpointer Service]
        ContextBuilder[Context Builder]
        Summarizer[Summarizer Service]
    end
    
    subgraph "Data Layer"
        DB[(PostgreSQL)]
        Cache[(Redis/Memory Cache)]
    end
    
    Chat --> ChatAPI
    SessionList --> SessionAPI
    ChatAPI --> Checkpointer
    ChatAPI --> ContextBuilder
    Checkpointer --> DB
    Checkpointer --> Cache
    ContextBuilder --> Checkpointer
    ContextBuilder --> Summarizer
    Summarizer --> DB
```

## Components and Interfaces

### 1. Checkpointer Service

Основной сервис для сохранения и восстановления состояния диалогов.

```typescript
interface CheckpointerConfig {
  memoryWindowSize: number      // Размер окна памяти (default: 20)
  summaryThreshold: number      // Порог для создания summary (default: 50)
  maxSessionMessages: number    // Макс. сообщений в сессии (default: 1000)
  retentionDays: number         // Срок хранения (default: 90)
}

interface Checkpointer {
  // Сохранение сообщения
  saveMessage(params: SaveMessageParams): Promise<SavedMessage>
  
  // Загрузка истории сессии
  loadHistory(sessionId: string, limit?: number): Promise<Message[]>
  
  // Получение контекста для LLM
  getContext(sessionId: string): Promise<DialogContext>
  
  // Управление сессиями
  createSession(params: CreateSessionParams): Promise<Session>
  listSessions(userId: string, characterId: string): Promise<Session[]>
  deleteSession(sessionId: string): Promise<void>
  
  // Суммаризация
  createSummary(sessionId: string): Promise<Summary>
}

interface SaveMessageParams {
  sessionId: string
  userId: string
  characterId: string
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, unknown>
}

interface DialogContext {
  summary?: string              // Summary предыдущих сообщений
  messages: Message[]           // Последние N сообщений
  userPreferences: UserPreferences
  currentTopic?: string
}
```

### 2. Context Builder

Формирует контекст для промпта персонажа.

```typescript
interface ContextBuilder {
  // Построение полного контекста
  buildContext(params: BuildContextParams): Promise<PromptContext>
  
  // Поиск релевантных сообщений
  searchHistory(sessionId: string, query: string): Promise<Message[]>
}

interface BuildContextParams {
  sessionId: string
  userId: string
  characterId: string
  currentMessage: string
  topicSlug?: string
}

interface PromptContext {
  systemPrompt: string
  historyContext: string        // Summary + recent messages
  userContext: string           // Preferences + current topic
  tools: Tool[]
}
```

### 3. Summarizer Service

Асинхронно создаёт сжатые представления длинных диалогов.

```typescript
interface Summarizer {
  // Создание summary для сессии
  summarize(messages: Message[]): Promise<string>
  
  // Проверка необходимости суммаризации
  needsSummary(sessionId: string): Promise<boolean>
  
  // Фоновая суммаризация
  scheduleSummary(sessionId: string): void
}
```

## Data Models

### Prisma Schema Extensions

```prisma
// Сессия диалога
model ConversationSession {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  characterId     String
  
  title           String?
  summary         String?   @db.Text
  summaryUpdatedAt DateTime?
  
  messageCount    Int       @default(0)
  lastMessageAt   DateTime?
  
  isArchived      Boolean   @default(false)
  
  messages        ChatMessage[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([userId, characterId])
  @@index([userId, lastMessageAt])
}

// Расширение ChatMessage
model ChatMessage {
  id              String    @id @default(cuid())
  sessionId       String?
  session         ConversationSession? @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  role            MessageRole
  content         String    @db.Text
  characterId     String    @default("default")
  topicSlug       String?
  
  metadata        Json?     // Дополнительные данные (tool calls, etc.)
  
  createdAt       DateTime  @default(now())
  
  @@index([sessionId, createdAt])
  @@index([userId, characterId])
}

// Предпочтения пользователя
model UserPreferences {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Стиль обучения
  detailLevel     DetailLevel @default(BALANCED)
  explanationStyle ExplanationStyle @default(MIXED)
  
  // Интересы и темы
  favoriteTopics  String[]  @default([])
  avoidTopics     String[]  @default([])
  
  // Персонализация
  customInstructions String? @db.Text
  
  updatedAt       DateTime  @updatedAt
}

enum DetailLevel {
  BRIEF
  BALANCED
  DETAILED
}

enum ExplanationStyle {
  THEORETICAL
  PRACTICAL
  MIXED
  EXAMPLES_FIRST
}
```

### SQL Migration

```sql
-- Таблица сессий
CREATE TABLE conversation_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  character_id TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  summary_updated_at TIMESTAMPTZ,
  message_count INT DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_character ON conversation_sessions(user_id, character_id);
CREATE INDEX idx_sessions_user_last_message ON conversation_sessions(user_id, last_message_at DESC);

-- Добавление session_id к chat_messages
ALTER TABLE chat_messages ADD COLUMN session_id TEXT REFERENCES conversation_sessions(id) ON DELETE CASCADE;
CREATE INDEX idx_messages_session_created ON chat_messages(session_id, created_at);

-- Таблица предпочтений
CREATE TABLE user_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  detail_level TEXT DEFAULT 'BALANCED',
  explanation_style TEXT DEFAULT 'MIXED',
  favorite_topics TEXT[] DEFAULT '{}',
  avoid_topics TEXT[] DEFAULT '{}',
  custom_instructions TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Message Persistence Round-Trip

*For any* valid message saved to a session, loading the session history SHALL return that message with identical content, role, and metadata.

**Validates: Requirements 1.1, 2.3**

### Property 2: History Loading Respects Limit

*For any* session with M messages and requested limit N, loading history SHALL return exactly min(M, N) messages in chronological order.

**Validates: Requirements 1.2**

### Property 3: Session List Completeness

*For any* user with N non-archived sessions for a character, listing sessions SHALL return all N sessions.

**Validates: Requirements 2.1**

### Property 4: Session Creation Persistence

*For any* valid session creation request, the created session SHALL exist in the database and be retrievable by its ID.

**Validates: Requirements 2.2**

### Property 5: Context Includes Recent History

*For any* session with messages, building context SHALL include the last min(messageCount, memoryWindowSize) messages.

**Validates: Requirements 3.1**

### Property 6: Long History Includes Summary

*For any* session with messages exceeding summaryThreshold, the context SHALL include a non-empty summary.

**Validates: Requirements 1.3, 3.2**

### Property 7: Preferences Persistence Round-Trip

*For any* valid user preferences saved, retrieving preferences for that user SHALL return equivalent values.

**Validates: Requirements 4.1**

### Property 8: Context Includes Preferences

*For any* user with saved preferences, building context SHALL include those preferences in the prompt context.

**Validates: Requirements 4.3, 4.4**

### Property 9: Archive Threshold Enforcement

*For any* session exceeding maxSessionMessages, archiving SHALL result in active message count ≤ maxSessionMessages.

**Validates: Requirements 6.4**

## Error Handling

| Error Case | Handling Strategy |
|------------|-------------------|
| Database connection failure | Retry with exponential backoff, fallback to in-memory cache |
| Session not found | Return 404, create new session if requested |
| Message save failure | Queue for retry, return error to client |
| Summary generation failure | Log error, continue without summary |
| Invalid session ID | Return 400 with validation error |
| User not authorized for session | Return 403 Forbidden |

## Testing Strategy

### Unit Tests

- Checkpointer service methods (save, load, create session)
- Context builder logic (message selection, summary inclusion)
- Summarizer text processing
- Data model validation

### Property-Based Tests

Используем **fast-check** для TypeScript:

```typescript
import fc from 'fast-check'

// Property 1: Message round-trip
fc.assert(
  fc.asyncProperty(
    fc.record({
      content: fc.string({ minLength: 1 }),
      role: fc.constantFrom('user', 'assistant'),
      characterId: fc.string({ minLength: 1 })
    }),
    async (message) => {
      const saved = await checkpointer.saveMessage(message)
      const loaded = await checkpointer.loadHistory(saved.sessionId, 1)
      return loaded[0].content === message.content
    }
  )
)
```

Каждый property test должен выполнять минимум 100 итераций.

### Integration Tests

- API endpoint testing with real database
- Session lifecycle (create → add messages → load → archive)
- Multi-user isolation
- Character-specific session filtering
