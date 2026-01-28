# Implementation Plan: Dialog Persistence (Checkpointers)

## Overview

Реализация системы персистентности диалогов для AI Study Agent. Используем TypeScript, Prisma ORM, PostgreSQL. Property-based тесты на fast-check.

## Tasks

- [x] 1. Расширение схемы базы данных
  - [x] 1.1 Добавить модели в Prisma schema
    - Добавить `ConversationSession`, `UserPreferences`
    - Расширить `ChatMessage` полем `sessionId`
    - Добавить enum `DetailLevel`, `ExplanationStyle`
    - _Requirements: 1.1, 2.2, 4.4_
  - [x] 1.2 Создать и применить миграцию
    - Выполнить `npx prisma migrate dev`
    - Проверить создание индексов
    - _Requirements: 6.3_

- [x] 2. Реализация Checkpointer Service
  - [x] 2.1 Создать базовый Checkpointer
    - Файл: `lib/ai/checkpointer.ts`
    - Реализовать `saveMessage`, `loadHistory`, `getContext`
    - Реализовать `createSession`, `listSessions`, `deleteSession`
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3_
  - [ ]* 2.2 Property test: Message round-trip
    - **Property 1: Message Persistence Round-Trip**
    - **Validates: Requirements 1.1, 2.3**
  - [ ]* 2.3 Property test: History loading
    - **Property 2: History Loading Respects Limit**
    - **Validates: Requirements 1.2**
  - [ ]* 2.4 Property test: Session list
    - **Property 3: Session List Completeness**
    - **Validates: Requirements 2.1**

- [x] 3. Реализация Context Builder
  - [x] 3.1 Создать Context Builder
    - Файл: `lib/ai/context-builder.ts`
    - Реализовать `buildContext` с Memory Window
    - Интегрировать с существующими промптами персонажей
    - _Requirements: 3.1, 3.4_
  - [ ]* 3.2 Property test: Context includes history
    - **Property 5: Context Includes Recent History**
    - **Validates: Requirements 3.1**

- [x] 4. Реализация Summarizer Service
  - [x] 4.1 Создать Summarizer
    - Файл: `lib/ai/summarizer.ts`
    - Реализовать `summarize`, `needsSummary`
    - Использовать LLM для генерации summary
    - _Requirements: 1.3, 3.2_
  - [x] 4.2 Интегрировать summary в Context Builder
    - Добавить проверку `needsSummary` в `buildContext`
    - Включать summary в промпт при наличии
    - _Requirements: 3.2_
  - [ ]* 4.3 Property test: Long history includes summary
    - **Property 6: Long History Includes Summary**
    - **Validates: Requirements 1.3, 3.2**

- [x] 5. Checkpoint - Проверка базовой функциональности
  - Убедиться что все тесты проходят
  - Проверить работу с БД
  - Спросить пользователя если есть вопросы

- [x] 6. Реализация User Preferences
  - [x] 6.1 Создать Preferences Service
    - Файл: `lib/ai/user-preferences.ts`
    - Реализовать `getPreferences`, `updatePreferences`
    - Интегрировать в Context Builder
    - _Requirements: 4.1, 4.3, 4.4_
  - [ ]* 6.2 Property test: Preferences round-trip
    - **Property 7: Preferences Persistence Round-Trip**
    - **Validates: Requirements 4.1**
  - [ ]* 6.3 Property test: Context includes preferences
    - **Property 8: Context Includes Preferences**
    - **Validates: Requirements 4.3, 4.4**

- [x] 7. API Endpoints
  - [x] 7.1 Создать API для сессий
    - `GET /api/sessions` — список сессий пользователя
    - `POST /api/sessions` — создание сессии
    - `DELETE /api/sessions/[id]` — удаление сессии
    - _Requirements: 5.1, 5.3, 5.4_
  - [x] 7.2 Обновить Chat API
    - Интегрировать Checkpointer в `/api/chat`
    - Добавить sessionId в запросы/ответы
    - _Requirements: 5.5_
  - [x] 7.3 Создать API для предпочтений
    - `GET /api/preferences` — получение предпочтений
    - `PUT /api/preferences` — обновление предпочтений
    - _Requirements: 4.1_

- [x] 8. Архивация и очистка
  - [x] 8.1 Реализовать архивацию сессий
    - Добавить `archiveOldMessages` в Checkpointer
    - Создать cron job или триггер для автоархивации
    - _Requirements: 6.4_
  - [ ]* 8.2 Property test: Archive threshold
    - **Property 9: Archive Threshold Enforcement**
    - **Validates: Requirements 6.4**

- [x] 9. Интеграция с UI
  - [x] 9.1 Обновить Chat компонент
    - Добавить выбор сессии
    - Показывать историю при загрузке
    - _Requirements: 2.1, 2.3_
  - [x] 9.2 Создать Session List компонент
    - Список сессий с персонажем
    - Кнопка "Новый диалог"
    - _Requirements: 2.1, 2.2_

- [x] 10. Final Checkpoint
  - Убедиться что все тесты проходят
  - Проверить интеграцию с существующим чатом
  - Спросить пользователя если есть вопросы

## Notes

- Задачи с `*` опциональны (тесты) — можно пропустить для быстрого MVP
- Property tests используют fast-check с минимум 100 итерациями
- Каждый property test ссылается на конкретное свойство из design.md
- Checkpoints позволяют проверить работоспособность на промежуточных этапах
