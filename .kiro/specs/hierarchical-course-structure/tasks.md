# Implementation Plan: Hierarchical Course Structure

## Overview

Реализация иерархической структуры курсов Goal → Module → Topic. План разбит на этапы: схема БД, миграция, API, генерация курсов, UI.

## Tasks

- [x] 1. Обновление схемы базы данных
  - [x] 1.1 Добавить модель Module в schema.prisma
    - Создать таблицу Module с полями: id, goalId, name, description, icon, order
    - Добавить связь Goal → Module (one-to-many)
    - Добавить связь Module → Topic (one-to-many)
    - Настроить cascade delete
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x] 1.2 Обновить модель Topic
    - Заменить goalId на moduleId
    - Обновить связи и индексы
    - _Requirements: 1.2_
  - [x] 1.3 Создать и применить миграцию Prisma
    - Сгенерировать миграцию
    - Применить к базе данных
    - _Requirements: 1.1_

- [x] 2. Миграция существующих данных
  - [x] 2.1 Создать скрипт миграции данных
    - Для каждого Goal создать Module "Общий раздел"
    - Переместить все Topics в созданный Module
    - Сохранить TopicProgress записи
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 2.2 Написать property test для миграции
    - **Property 8: Migration Data Preservation**
    - **Validates: Requirements 5.2, 5.3**

- [x] 3. Checkpoint - Проверка схемы БД
  - Убедиться что миграция прошла успешно
  - Проверить что существующие данные сохранены
  - Спросить пользователя если есть вопросы

- [x] 4. Обновление промпта генерации курса
  - [x] 4.1 Обновить getGraphGenerationPrompt в prompts.ts
    - Изменить формат вывода: modules[] с topics[] внутри
    - Добавить правила: 3-6 модулей, 2-5 тем на модуль
    - Добавить генерацию описаний модулей
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.7_
  - [x] 4.2 Написать property tests для генерации
    - **Property 2: Module Count Bounds (3-6)**
    - **Property 3: Topic Count Per Module Bounds (2-5)**
    - **Property 4: Sequential Order Assignment**
    - **Property 5: Module Description Existence**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.7**

- [x] 5. Обновление API создания курса
  - [x] 5.1 Обновить POST /api/goals
    - Парсить новый формат с модулями
    - Создавать Goal → Modules → Topics
    - Добавить fallback структуру с модулями
    - _Requirements: 6.2_
  - [x] 5.2 Обновить GET /api/goals и GET /api/goals/:id
    - Включать modules в ответ
    - Сортировать по order
    - _Requirements: 6.1, 6.4_
  - [x] 5.3 Написать property test для API ordering
    - **Property 9: API Response Ordering**
    - **Validates: Requirements 6.4**

- [x] 6. Добавление расчёта прогресса по модулям
  - [x] 6.1 Создать утилиту calculateModuleProgress
    - Формула: (completed topics / total topics) * 100
    - _Requirements: 4.1, 4.2_
  - [x] 6.2 Создать утилиту calculateOverallProgress
    - Сумма по всем модулям
    - _Requirements: 4.4_
  - [x] 6.3 Написать property tests для прогресса
    - **Property 6: Progress Calculation Accuracy**
    - **Property 7: Overall Course Progress Calculation**
    - **Validates: Requirements 4.1, 4.2, 4.4**

- [x] 7. Checkpoint - Проверка backend
  - Убедиться что API работает корректно
  - Проверить генерацию курса с модулями
  - Спросить пользователя если есть вопросы

- [x] 8. Обновление UI компонентов
  - [x] 8.1 Создать компонент ModuleCard
    - Collapsible секция с заголовком и прогрессом
    - Иконка, название, описание модуля
    - Индикатор прогресса
    - _Requirements: 3.1, 3.3, 3.5_
  - [x] 8.2 Создать компонент TopicItem
    - Нумерация формата X.Y (1.1, 1.2, 2.1...)
    - Статус и прогресс темы
    - _Requirements: 3.4_
  - [x] 8.3 Создать компонент ModuleList
    - Список модулей с темами
    - Управление expand/collapse состоянием
    - _Requirements: 3.2, 3.6_

- [x] 9. Интеграция UI в страницы
  - [x] 9.1 Обновить страницу курса /goals/[id]
    - Заменить плоский список тем на ModuleList
    - Показать общий прогресс курса
    - _Requirements: 3.1, 3.2, 4.4_
  - [x] 9.2 Обновить dashboard
    - Адаптировать отображение курсов с модулями
    - _Requirements: 3.1_

- [x] 10. Финальный checkpoint
  - Убедиться что все тесты проходят
  - Проверить создание нового курса
  - Проверить отображение существующих курсов
  - Спросить пользователя если есть вопросы

## Notes

- Все задачи обязательны для полного покрытия
- Каждый checkpoint — точка для проверки и обратной связи
- Миграция данных критична — нужно сохранить прогресс пользователей
- UI изменения можно делать инкрементально
