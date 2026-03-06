# Requirements Document: Database Schema Fix

## Introduction

Приложение AI Study Agent использует векторную базу данных для RAG (Retrieval-Augmented Generation), но таблицы для векторного поиска (`documents` и `rag_cache`) не описаны в Prisma схеме. Это приводит к конфликтам при выполнении `prisma db push` и ошибкам 500 в API эндпоинтах.

## Glossary

- **Prisma**: ORM для работы с базой данных PostgreSQL
- **RAG**: Retrieval-Augmented Generation - технология для улучшения ответов AI через поиск в базе знаний
- **Vector Database**: База данных с поддержкой векторного поиска через pgvector расширение
- **Documents Table**: Таблица для хранения документов с векторными эмбеддингами
- **RAG_Cache Table**: Таблица для кэширования результатов RAG запросов

## Requirements

### Requirement 1: Добавить модели RAG в Prisma схему

**User Story:** Как разработчик, я хочу чтобы все таблицы базы данных были описаны в Prisma схеме, чтобы избежать конфликтов при миграциях.

#### Acceptance Criteria

1. WHEN выполняется `prisma db push`, THEN система НЕ ДОЛЖНА предлагать удалить таблицы `documents` и `rag_cache`
2. THE Prisma_Schema SHALL содержать модель `Document` с полями: id, content, metadata, embedding, contentHash, fts, createdAt
3. THE Prisma_Schema SHALL содержать модель `RagCache` с полями: key, data, expiresAt, createdAt, updatedAt
4. THE Prisma_Schema SHALL использовать тип `Unsupported` для полей vector и tsvector (так как Prisma не поддерживает эти типы нативно)
5. WHEN схема применена, THEN существующие данные в таблицах НЕ ДОЛЖНЫ быть потеряны

### Requirement 2: Сохранить SQL функции для векторного поиска

**User Story:** Как разработчик, я хочу чтобы SQL функции для векторного поиска остались работоспособными после обновления схемы.

#### Acceptance Criteria

1. THE System SHALL сохранить функцию `match_documents` для векторного поиска
2. THE System SHALL сохранить функцию `search_documents_keyword` для полнотекстового поиска
3. THE System SHALL сохранить функцию `hybrid_search` для гибридного поиска
4. THE System SHALL сохранить функцию `cleanup_expired_cache` для очистки кэша
5. THE System SHALL сохранить триггер `documents_fts_trigger` для автоматического обновления fts поля

### Requirement 3: Исправить ошибки 500 в API

**User Story:** Как пользователь, я хочу чтобы API эндпоинты работали без ошибок 500.

#### Acceptance Criteria

1. WHEN пользователь делает запрос к `/api/chat`, THEN система ДОЛЖНА вернуть успешный ответ (200 или 201)
2. WHEN пользователь делает запрос к `/api/sessions`, THEN система ДОЛЖНА вернуть успешный ответ (200)
3. IF возникает ошибка базы данных, THEN система ДОЛЖНА логировать детальную информацию об ошибке
4. THE System SHALL корректно обрабатывать отсутствие пользователя в сессии (401 Unauthorized)
