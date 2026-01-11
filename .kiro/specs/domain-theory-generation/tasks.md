# Implementation Plan: Domain-Specific Theory Generation

## Overview

Интеграция доменно-специфичных промптов в генератор теории. Реализация идёт от базовых функций к интеграции, с тестами на каждом этапе.

## Tasks

- [x] 1. Подготовка и экспорт функций из domain-prompts.ts
  - [x] 1.1 Добавить экспорт типа DomainConfig из domain-prompts.ts
    - Убедиться что DomainConfig и SectionTemplate экспортируются
    - _Requirements: 1.2_
  - [x] 1.2 Добавить экспорт DOMAIN_KEYWORDS для тестирования
    - Экспортировать константу для использования в тестах
    - _Requirements: 1.1_

- [x] 2. Создать функцию buildDomainSections в agent.ts
  - [x] 2.1 Импортировать зависимости из domain-prompts.ts
    - Импортировать detectDomain, getDomainConfig, DomainConfig, SectionTemplate
    - _Requirements: 1.1, 1.2_
  - [x] 2.2 Реализовать функцию buildDomainSections
    - Принимает TopicAnalysis, DomainConfig, ragContext
    - Возвращает массив секций с title, prompt, minWords
    - Использует sectionTemplates из конфига
    - Добавляет контекст темы в каждый промпт
    - _Requirements: 1.4, 5.1, 5.2_
  - [x] 2.3 Написать property test для buildDomainSections
    - **Property 2: Required Sections Presence**
    - **Validates: Requirements 1.4, 5.2**

- [x] 3. Создать функцию applyFormatRules
  - [x] 3.1 Реализовать applyFormatRules
    - Принимает basePrompt и formatRules[]
    - Добавляет правила форматирования к промпту
    - _Requirements: 1.5_
  - [x] 3.2 Написать unit test для applyFormatRules
    - Проверить что правила добавляются к промпту
    - _Requirements: 1.5_

- [x] 4. Модифицировать generateFullLessonContent
  - [x] 4.1 Добавить параметр domainConfig в generateFullLessonContent
    - Добавить опциональный параметр DomainConfig
    - Использовать systemPrompt из конфига вместо generic
    - _Requirements: 1.3_
  - [x] 4.2 Интегрировать buildDomainSections
    - Если domainConfig передан — использовать buildDomainSections
    - Иначе — fallback на buildDynamicSections
    - _Requirements: 1.4, 7.3_
  - [x] 4.3 Применить formatRules к системному промпту
    - Вызвать applyFormatRules для добавления правил
    - _Requirements: 1.5_
  - [x] 4.4 Написать property test для форматирования контента
    - **Property 4: Formatting Elements Presence**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.5**

- [x] 5. Модифицировать runLessonAgent
  - [x] 5.1 Добавить определение домена в runLessonAgent
    - Вызвать detectDomain после analyzeTopicDeep
    - Вызвать getDomainConfig для получения конфига
    - _Requirements: 1.1, 1.2_
  - [x] 5.2 Использовать getDomainRAGContext вместо getRAGContext
    - Передать домен в getDomainRAGContext
    - _Requirements: 6.1_
  - [x] 5.3 Передать domainConfig в generateFullLessonContent
    - Передать конфиг для использования доменных промптов
    - _Requirements: 1.3, 1.4_
  - [x] 5.4 Написать property test для API response
    - **Property 7: API Response Structure**
    - **Validates: Requirements 7.1**

- [x] 6. Checkpoint - Базовая интеграция
  - Убедиться что все тесты проходят
  - Проверить что генерация работает для разных доменов
  - Спросить пользователя если есть вопросы

- [x] 7. Улучшения для точных наук
  - [x] 7.1 Добавить проверку на LaTeX в контенте
    - Добавить валидацию что контент не содержит $...$ или \frac
    - Если найден LaTeX — заменить на Unicode
    - _Requirements: 2.4_
  - [x] 7.2 Написать property test для отсутствия LaTeX
    - **Property 5: No LaTeX in Output**
    - **Validates: Requirements 2.4**

- [x] 8. Улучшения для программирования
  - [x] 8.1 Добавить проверку на псевдо-формулы
    - Добавить валидацию что контент не содержит паттерны типа "= ("
    - _Requirements: 3.1_
  - [x] 8.2 Добавить проверку на code blocks
    - Убедиться что контент программирования содержит ```
    - _Requirements: 3.2_
  - [x] 8.3 Написать property test для программирования
    - **Property 6: Code Blocks for Programming**
    - **Validates: Requirements 3.1, 3.2**

- [x] 9. Тесты для detectDomain
  - [x] 9.1 Написать property test для domain detection
    - **Property 1: Domain Detection Consistency**
    - **Validates: Requirements 1.1, 1.2**
  - [x] 9.2 Написать property test для fallback
    - **Property 8: Fallback to General Domain**
    - **Validates: Requirements 7.2**

- [x] 10. Checkpoint - Финальная проверка
  - Убедиться что все property tests проходят
  - Проверить генерацию для физики, программирования, истории
  - Спросить пользователя если есть вопросы

## Notes

- All tasks are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
