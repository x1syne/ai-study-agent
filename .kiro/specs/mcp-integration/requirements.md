# Requirements Document: MCP Integration для AI Study Agent

## Introduction

Интеграция Model Context Protocol (MCP) в AI Study Agent для расширения возможностей AI-репетитора. На основе анализа двух статей (Habr и ServerFlow) и текущей архитектуры проекта, определены требования для добавления MCP-серверов, которые позволят AI-агенту выполнять реальные действия: поиск в интернете, работу с файлами, анализ кода.

## Glossary

- **MCP (Model Context Protocol)**: Открытый стандарт для подключения языковых моделей к внешним инструментам и данным
- **MCP_Server**: Коннектор к конкретному инструменту (filesystem, brave-search, git)
- **AI_Agent**: Система генерации контента в проекте (agent-fast.ts)
- **AI_Chat**: Интерактивный чат-репетитор для ответов на вопросы
- **RAG (Retrieval-Augmented Generation)**: Технология обогащения контекста из внешних источников
- **LangGraph**: Фреймворк для построения графов состояний агентов
- **Groq_API**: API для доступа к LLM моделям (LLaMA 3.3-70B)
- **Theory_Generation**: Процесс создания теоретического материала урока
- **Task_Generation**: Процесс создания практических заданий

## Requirements

### Requirement 1: MCP Filesystem Server

**User Story:** As a student, I want the AI tutor to save code examples and notes to files, so that I can download and use them later.

#### Acceptance Criteria

1. WHEN the AI chat receives a request to save content, THE System SHALL use MCP filesystem server to create a file
2. WHEN a file is created, THE System SHALL store it in a user-specific directory
3. WHEN a user requests to download a file, THE System SHALL provide a download link
4. THE System SHALL support text files (.txt, .md, .js, .py, .json)
5. THE System SHALL prevent directory traversal attacks and validate file paths

### Requirement 2: MCP Brave Search Server

**User Story:** As a student, I want the AI tutor to search for current information on the internet, so that I get up-to-date examples and explanations.

#### Acceptance Criteria

1. WHEN the AI chat detects a query requiring current information, THE System SHALL use MCP brave-search to find relevant results
2. WHEN search results are returned, THE System SHALL format them with source links
3. WHEN generating theory, THE System SHALL optionally use web search to enrich content
4. THE System SHALL limit search results to top 5 most relevant items
5. THE System SHALL cache search results for 1 hour to avoid duplicate queries

### Requirement 3: Retry Mechanism for Theory Generation

**User Story:** As a developer, I want the theory generation to automatically retry failed sections, so that the system is more reliable.

#### Acceptance Criteria

1. WHEN a section generation fails, THE System SHALL retry up to 3 times with exponential backoff
2. WHEN all retries fail, THE System SHALL use fallback content for that section
3. WHEN retrying, THE System SHALL log the error and retry attempt number
4. THE System SHALL track which sections failed and succeeded
5. THE System SHALL not retry if the error is a rate limit (429) - instead wait and continue

### Requirement 4: Contextual Memory for AI Chat

**User Story:** As a student, I want the AI chat to remember our conversation context, so that I don't have to repeat information.

#### Acceptance Criteria

1. WHEN a user starts a chat session, THE System SHALL create a memory context with a unique thread ID
2. WHEN a user sends a message, THE System SHALL include previous messages in the context
3. WHEN the context exceeds 10 messages, THE System SHALL summarize older messages
4. THE System SHALL store context in memory (not database) for the session duration
5. WHEN a user mentions "the code I showed earlier", THE System SHALL retrieve it from context

### Requirement 5: Configuration Validator

**User Story:** As a developer, I want the system to validate configuration on startup, so that I catch missing API keys early.

#### Acceptance Criteria

1. WHEN the application starts, THE System SHALL validate all required environment variables
2. WHEN GROQ_API_KEY is missing, THE System SHALL throw a clear error message
3. WHEN MCP is enabled but no servers are configured, THE System SHALL log a warning
4. THE System SHALL test API connectivity to Groq on startup
5. THE System SHALL display configuration status in the console

### Requirement 6: Task Difficulty Classifier

**User Story:** As a student, I want tasks to be accurately classified by difficulty, so that I can progress gradually.

#### Acceptance Criteria

1. WHEN generating tasks, THE System SHALL analyze each task and assign a difficulty level
2. WHEN classifying, THE System SHALL consider: question complexity, required knowledge, and time estimate
3. THE System SHALL ensure distribution: 40% easy, 40% medium, 20% hard
4. WHEN a task is misclassified, THE System SHALL allow manual override
5. THE System SHALL use AI to classify tasks based on content analysis

### Requirement 7: State Graph for Theory Generation

**User Story:** As a developer, I want theory generation to use a state graph architecture, so that I can track progress and handle errors better.

#### Acceptance Criteria

1. WHEN generating theory, THE System SHALL use a state machine with nodes: analyze → generate → validate → complete
2. WHEN a node fails, THE System SHALL transition to a retry node
3. WHEN validation fails, THE System SHALL transition back to generate with feedback
4. THE System SHALL track the current state and allow inspection
5. THE System SHALL emit events for each state transition

### Requirement 8: MCP Server Management UI

**User Story:** As a developer, I want to see which MCP servers are running, so that I can debug connection issues.

#### Acceptance Criteria

1. WHEN viewing the settings page, THE System SHALL display a list of configured MCP servers
2. WHEN a server is running, THE System SHALL show a green status indicator
3. WHEN a server fails, THE System SHALL show an error message and retry button
4. THE System SHALL allow enabling/disabling servers without restarting the app
5. THE System SHALL display server logs for debugging

## Non-Functional Requirements

### Performance

- MCP tool calls should complete within 5 seconds
- File operations should not block the main thread
- Search results should be cached to reduce API calls

### Security

- File paths must be validated to prevent directory traversal
- User files must be isolated in separate directories
- API keys must not be exposed in client-side code

### Reliability

- Retry mechanism should handle transient failures
- Fallback content should be available for all sections
- System should gracefully degrade if MCP servers are unavailable

### Maintainability

- MCP client code should be modular and testable
- Configuration should be centralized
- Logging should be comprehensive for debugging
