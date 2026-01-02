# Implementation Plan: Visual Interactive Courses

## Overview

Реализация визуально богатых, интерактивных курсов для AI Study Agent. План разбит на инкрементальные задачи, каждая из которых строится на предыдущей. Используется TypeScript для всего кода.

## Tasks

- [x] 1. Расширение типов и интерфейсов
  - [x] 1.1 Добавить визуальные типы в lib/agents/types.ts
    - Добавить ColorScheme, VisualTheme, InteractivityLevel типы
    - Добавить VisualIdentity, ModuleVisualSpec интерфейсы
    - Добавить TextBlock, AccompanyingVisual интерфейсы
    - Добавить InteractiveComponentConfig, GamificationSpec интерфейсы
    - Добавить DiagramConfig (MermaidDiagram, ChartConfig) типы
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 3.2, 4.2, 5.1, 5.2, 7.3_

  - [x] 1.2 Написать property test для Visual Identity типов
    - **Property 1: Visual Identity Generation Correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 2. Реализация Visual Identity Generator
  - [x] 2.1 Создать lib/agents/visual-identity.ts
    - Реализовать generateVisualIdentity(topicType, difficulty)
    - Реализовать маппинг TopicType → ColorScheme
    - Реализовать маппинг DifficultyLevel → VisualTheme
    - Реализовать цветовые палитры для каждой схемы
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Написать property test для generateVisualIdentity
    - **Property 1: Visual Identity Generation Correctness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 3. Реализация Module Visual Spec Generator
  - [x] 3.1 Создать lib/agents/visual-spec.ts
    - Реализовать generateModuleVisualSpec(module, visualIdentity, topicType)
    - Добавить LLM промпт для генерации heroImagePrompt
    - Добавить логику выбора primaryVisual типа
    - Добавить генерацию secondaryVisuals с иконками
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 3.2 Написать property test для Module Visual Spec
    - **Property 2: Module Visual Spec Completeness**
    - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 4. Checkpoint - Проверка базовых генераторов
  - Убедиться, что все тесты проходят ✅ (43 теста)
  - Проверить интеграцию с существующими агентами ✅
  - Спросить пользователя при возникновении вопросов

- [x] 5. Реализация Text Block Generator
  - [x] 5.1 Создать lib/agents/text-blocks.ts
    - Реализовать splitIntoTextBlocks(markdown, maxWords=150)
    - Реализовать assignVisualToBlock(block, topicType)
    - Добавить LLM промпт для генерации accompanying visuals
    - Добавить логику определения типа визуала по контенту
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.2 Написать property test для Text Blocks
    - **Property 4: Text Block Structure Correctness**
    - **Validates: Requirements 4.1, 4.2**

- [x] 6. Реализация Interactive Component Generator
  - [x] 6.1 Создать lib/agents/interactive-generator.ts
    - Реализовать generateInteractiveComponent(module, topicType)
    - Добавить логику выбора типа компонента по контенту
    - Реализовать генерацию drag_and_drop конфигурации
    - Реализовать генерацию quiz_with_feedback конфигурации
    - Добавить hints и reward_visual
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 6.2 Написать property test для Interactive Components
    - **Property 3: Interactive Component Validity**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

- [x] 7. Реализация Diagram Generator
  - [x] 7.1 Создать lib/agents/diagram-generator.ts
    - Реализовать generateMermaidDiagram(content, diagramType)
    - Реализовать generateChartConfig(data, chartType)
    - Добавить валидацию mermaid синтаксиса
    - Добавить валидацию chart.js конфигурации
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 7.2 Написать property test для Diagrams
    - **Property 5: Diagram Configuration Validity**
    - **Validates: Requirements 5.1, 5.2**

- [x] 8. Checkpoint - Проверка генераторов контента
  - Убедиться, что все тесты проходят ✅ (145 тестов)
  - Проверить качество генерируемых диаграмм ✅
  - Спросить пользователя при возникновении вопросов

- [x] 9. Реализация Multimedia Spec Generator
  - [x] 9.1 Создать lib/agents/multimedia-generator.ts
    - Реализовать generateVideoSources(module, topicType)
    - Реализовать generateImagePrompts(module, visualTheme)
    - Добавить логику формирования YouTube search queries
    - Добавить генерацию embeds конфигурации
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 9.2 Написать property test для Multimedia Spec
    - **Property 6: Multimedia Spec Completeness**
    - **Validates: Requirements 6.1, 6.2, 6.4, 6.6**

- [x] 10. Реализация Gamification Generator
  - [x] 10.1 Создать lib/agents/gamification-generator.ts
    - Реализовать generateGamificationSpec(modules)
    - Реализовать assignLevelsToModules(modules)
    - Реализовать generateCheckpoints(module)
    - Реализовать generateProgressVisualization(totalModules)
    - Добавить генерацию levelBadges с emoji
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 10.2 Написать property test для Gamification
    - **Property 7: Gamification Spec Validity**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6**

- [x] 11. Интеграция в Constructor Agent
  - [x] 11.1 Модифицировать lib/agents/constructor.ts
    - Добавить вызов generateVisualIdentity в buildCourseStructure
    - Добавить вызов generateModuleVisualSpec для каждого модуля
    - Расширить CourseStructure визуальными метаданными
    - _Requirements: 1.4, 2.1, 8.1, 8.2, 8.3_

- [x] 12. Интеграция в Generator Agent
  - [x] 12.1 Модифицировать lib/agents/generator.ts
    - Добавить вызов splitIntoTextBlocks в generateTheory
    - Добавить вызов generateInteractiveComponent
    - Добавить вызов generateMermaidDiagram/generateChartConfig
    - Добавить вызов generateMultimediaSpec
    - Добавить вызов generateGamificationSpec
    - _Requirements: 4.1, 4.2, 5.1, 5.2, 6.1, 7.1_

- [x] 13. Checkpoint - Проверка интеграции агентов
  - Убедиться, что все тесты проходят ✅ (223 теста)
  - Проверить полный pipeline генерации курса ✅
  - Спросить пользователя при возникновении вопросов

- [x] 14. Модификация API
  - [x] 14.1 Обновить app/api/create-course/route.ts
    - Расширить CreateCourseResponse визуальными полями
    - Добавить visual_identity в metadata
    - Добавить visual_spec в каждый модуль
    - Добавить sections с text_blocks, multimedia, gamification
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 14.2 Написать property test для API Response
    - **Property 8: API Response Structure Correctness**
    - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7**

- [x] 15. Установка новых зависимостей
  - [x] 15.1 Добавить npm пакеты
    - Установить mermaid для диаграмм ✅
    - Установить chart.js и react-chartjs-2 для графиков ✅
    - Установить framer-motion для анимаций ✅
    - Установить react-confetti для наград ✅
    - Установить react-youtube для видео ✅
    - _Requirements: 5.6, 6.3, 7.5, 9.6_

- [x] 16. Реализация MediaOrchestrator компонента
  - [x] 16.1 Создать components/media/MediaOrchestrator.tsx
    - Реализовать логику выбора источника медиа ✅
    - Добавить рендеринг Mermaid диаграмм ✅
    - Добавить рендеринг Chart.js графиков ✅
    - Добавить поиск изображений в Unsplash (placeholder) ✅
    - Добавить рендеринг Lucide иконок ✅
    - _Requirements: 5.6, 9.2, 9.3, 9.4, 9.5_

  - [x] 16.2 Написать property test для Media Source Selection
    - **Property 9: Media Source Selection Logic**
    - **Validates: Requirements 9.5**

- [x] 17. Реализация интерактивных компонентов
  - [x] 17.1 Создать components/interactive/DragAndDrop.tsx
    - Реализовать drag-and-drop для matching ✅
    - Реализовать drag-and-drop для ordering ✅
    - Добавить визуальную обратную связь ✅
    - _Requirements: 3.2, 3.3_

  - [x] 17.2 Создать components/interactive/QuizWithFeedback.tsx
    - Реализовать quiz с мгновенным feedback ✅
    - Добавить hints с penalty ✅
    - Добавить reward animation ✅
    - _Requirements: 3.2, 3.4, 3.5, 3.6_

  - [x] 17.3 Создать components/interactive/FlipCard.tsx
    - Реализовать flip card эффект ✅
    - Добавить анимацию через framer-motion ✅
    - _Requirements: 4.3_

- [x] 18. Реализация Gamification компонентов
  - [x] 18.1 Создать components/gamification/ProgressBar.tsx
    - Реализовать анимированный progress bar ✅
    - Добавить отображение текущего/максимального значения ✅
    - _Requirements: 7.3, 7.6_

  - [x] 18.2 Создать components/gamification/BadgeSystem.tsx
    - Реализовать отображение badges с emoji ✅
    - Добавить анимацию unlock ✅
    - _Requirements: 7.2_

  - [x] 18.3 Создать components/gamification/ConfettiReward.tsx
    - Интегрировать react-confetti ✅
    - Добавить trigger при завершении checkpoint ✅
    - _Requirements: 7.5_

- [x] 19. Checkpoint - Проверка UI компонентов
  - Убедиться, что все компоненты рендерятся корректно ✅
  - Проверить анимации и интерактивность ✅
  - Спросить пользователя при возникновении вопросов

- [x] 20. Реализация VisualCourseRenderer
  - [x] 20.1 Создать components/course/VisualCourseRenderer.tsx
    - Реализовать применение visual_identity CSS переменных ✅
    - Интегрировать MediaOrchestrator для визуалов ✅
    - Интегрировать интерактивные компоненты ✅
    - Интегрировать gamification компоненты ✅
    - Добавить ленивую загрузку медиа ✅
    - _Requirements: 1.5, 2.6, 4.4, 9.1, 9.2, 9.3, 9.4_

  - [x] 20.2 Обновить components/course/CourseModule.tsx
    - Добавить поддержку visual_spec
    - Добавить рендеринг text_blocks вместо сплошного markdown
    - Интегрировать VisualCourseRenderer
    - _Requirements: 8.4, 8.5_

- [x] 21. Реализация Media Cache
  - [x] 21.1 Создать lib/media-cache.ts
    - Реализовать generateMediaHash(prompt) ✅
    - Реализовать cacheMedia(hash, type, content) ✅
    - Реализовать getCachedMedia(hash) ✅
    - Добавить TTL 30 дней ✅
    - Добавить hit_count tracking ✅
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 21.2 Написать property test для Media Cache
    - **Property 10: Media Cache Round-Trip Correctness** ✅
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6**

- [x] 22. Создание Supabase миграции для media_cache
  - [x] 22.1 Создать prisma/migrations для media_cache таблицы
    - Добавить таблицу media_cache с полями: id, prompt_hash, media_type, content_url, content_data, created_at, expires_at, hit_count ✅
    - Добавить индексы на prompt_hash и expires_at ✅
    - _Requirements: 10.1, 10.5_

- [x] 23. Финальный checkpoint
  - Убедиться, что все тесты проходят ✅ (251 тест)
  - Проверить полный flow создания визуального курса ✅
  - Проверить производительность генерации ✅
  - Спросить пользователя при возникновении вопросов

## Notes

- Все задачи обязательны, включая property-based тесты
- Каждая задача ссылается на конкретные требования для traceability
- Checkpoints позволяют валидировать прогресс инкрементально
- Property tests используют fast-check с минимум 100 итерациями
- Все компоненты должны быть responsive и работать на мобильных устройствах

