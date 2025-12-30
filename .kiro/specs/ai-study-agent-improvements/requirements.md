# Requirements Document

## Introduction

Улучшение платформы AI Study Agent для генерации топ-качественных адаптивных курсов уровня Harvard/MIT для ЛЮБОЙ темы (от OOP Python до кулинарии и ядерной физики). Система использует цепочку агентов (Analyst → Constructor → Generator), RAG для валидации контента, и адаптивную практику в стиле Codewars с авто-проверкой.

## Glossary

- **AI_Study_Agent**: Платформа для генерации адаптивных образовательных курсов
- **Analyst_Agent**: Первый агент в цепочке, классифицирует тему и собирает RAG контекст
- **Constructor_Agent**: Второй агент, строит JSON структуру курса с модулями
- **Generator_Agent**: Третий агент, генерирует теорию и практику для каждого модуля
- **LLM_Adapter**: Обёртка для работы с LLM провайдерами (Groq primary, HuggingFace fallback)
- **RAG_Context**: Контекст из внешних источников (Tavily, Wikipedia) для валидации контента
- **Pyodide**: WebAssembly версия Python для выполнения кода в браузере
- **Topic_Type**: Тип темы (programming, scientific, creative, practical, business, humanities, technical)
- **Practice_Task**: Практическое задание в стиле Codewars с уровнями easy/medium/hard
- **Course_Cache**: Кэш курсов в Supabase с TTL 1 неделя

## Requirements

### Requirement 1: Улучшенный LLM Adapter с Fallback

**User Story:** As a пользователь, I want система использовала бесплатные LLM провайдеры с автоматическим fallback, so that курсы генерировались надёжно без платных сервисов.

#### Acceptance Criteria

1. THE LLM_Adapter SHALL использовать Groq как primary провайдер с моделями llama-3.3-70b-versatile, llama-3.1-8b-instant
2. WHEN Groq возвращает ошибку rate limit или timeout, THEN THE LLM_Adapter SHALL автоматически переключиться на HuggingFace Inference
3. THE LLM_Adapter SHALL применять throttle 1 запрос/секунду для предотвращения rate limiting
4. THE LLM_Adapter SHALL выполнять retry до 3 раз с exponential backoff при ошибках
5. THE LLM_Adapter SHALL отслеживать usage статистику (requests/day, tokens/day) и предупреждать при приближении к лимитам
6. WHEN все провайдеры недоступны, THEN THE LLM_Adapter SHALL возвращать понятную ошибку пользователю

### Requirement 2: Улучшенная классификация тем в Analyst Agent

**User Story:** As a пользователь, I want система точно классифицировала любую тему, so that контент был адаптирован под специфику темы.

#### Acceptance Criteria

1. THE Analyst_Agent SHALL классифицировать темы по 7 типам: programming, scientific, creative, practical, business, humanities, technical
2. THE Analyst_Agent SHALL определять уровень сложности: beginner, intermediate, advanced, expert
3. THE Analyst_Agent SHALL извлекать ключевые концепции (5-10) для каждой темы
4. THE Analyst_Agent SHALL определять prerequisites для темы
5. WHEN тема относится к programming, THEN THE Analyst_Agent SHALL определять язык программирования и фреймворки
6. WHEN тема относится к scientific, THEN THE Analyst_Agent SHALL определять формулы и расчёты
7. THE Analyst_Agent SHALL использовать RAG для поиска лучших course outlines из Harvard, MIT, Coursera

### Requirement 3: RAG интеграция с Tavily

**User Story:** As a система, I want использовать Tavily Search для получения актуальных образовательных материалов, so that контент был валидирован против hallucinations.

#### Acceptance Criteria

1. THE RAG_System SHALL использовать Tavily API для поиска course outlines (max 5 результатов)
2. THE RAG_System SHALL приоритизировать образовательные домены: harvard.edu, mit.edu, stanford.edu, coursera.org, edx.org
3. THE RAG_System SHALL извлекать структуру модулей из найденных outlines
4. THE RAG_System SHALL отслеживать usage (1000 queries/month free tier)
5. WHEN Tavily недоступен, THEN THE RAG_System SHALL использовать fallback на Wikipedia + Serper
6. THE RAG_System SHALL кэшировать результаты поиска для экономии квоты

### Requirement 4: Генерация теории уровня Harvard/MIT

**User Story:** As a пользователь, I want получать теоретический материал уровня топовых университетов, so that обучение было эффективным и увлекательным.

#### Acceptance Criteria

1. THE Generator_Agent SHALL генерировать теорию 800-1500 слов на модуль
2. THE Generator_Agent SHALL использовать storytelling с аналогиями из реальной жизни
3. WHEN тип темы programming, THEN THE Generator_Agent SHALL включать примеры кода с комментариями
4. WHEN тип темы scientific, THEN THE Generator_Agent SHALL включать формулы в блоках цитат с объяснением символов
5. WHEN тип темы practical, THEN THE Generator_Agent SHALL включать пошаговые инструкции с таймерами
6. THE Generator_Agent SHALL структурировать контент с заголовками ##, ###, выделением **ключевых терминов**
7. THE Generator_Agent SHALL использовать RAG контекст для валидации и обогащения контента

### Requirement 5: Практика в стиле Codewars

**User Story:** As a пользователь, I want выполнять практические задания как на Codewars/LeetCode, so that я мог закрепить знания через практику.

#### Acceptance Criteria

1. THE Generator_Agent SHALL генерировать 5-10 заданий на модуль
2. THE Generator_Agent SHALL распределять задания по сложности: 2-3 easy, 3-4 medium, 1-2 hard
3. WHEN тип темы programming, THEN THE Practice_Task SHALL включать starter code и test cases
4. WHEN тип темы scientific, THEN THE Practice_Task SHALL включать расчётные задачи с формулами
5. WHEN тип темы practical, THEN THE Practice_Task SHALL включать пошаговые задания с чек-листами
6. THE Practice_Task SHALL включать hints (подсказки) с penalty за использование
7. THE Practice_Task SHALL начислять points за выполнение (easy: 5, medium: 10, hard: 15)

### Requirement 6: Авто-проверка кода через Pyodide

**User Story:** As a пользователь, I want мой код проверялся автоматически в браузере, so that я получал мгновенную обратную связь.

#### Acceptance Criteria

1. THE Code_Verifier SHALL использовать Pyodide для выполнения Python кода в браузере
2. THE Code_Verifier SHALL запускать test cases и показывать результаты (passed/failed)
3. THE Code_Verifier SHALL показывать вывод программы и ошибки
4. WHEN код содержит бесконечный цикл, THEN THE Code_Verifier SHALL прерывать выполнение через timeout (5 секунд)
5. THE Code_Verifier SHALL поддерживать базовые Python библиотеки (math, collections, itertools)
6. WHEN тип задания не code, THEN THE System SHALL использовать LLM для оценки ответа

### Requirement 7: Кэширование курсов в Supabase

**User Story:** As a система, I want кэшировать сгенерированные курсы, so that экономить LLM токены и ускорять повторные запросы.

#### Acceptance Criteria

1. THE Cache_System SHALL сохранять курсы в Supabase таблицу "course_cache"
2. THE Cache_System SHALL использовать hash от query как ключ кэша
3. THE Cache_System SHALL устанавливать TTL 1 неделя для кэшированных курсов
4. WHEN курс найден в кэше и не истёк, THEN THE System SHALL возвращать кэшированную версию
5. THE Cache_System SHALL отслеживать access_count и last_accessed_at для аналитики
6. THE Cache_System SHALL экономить 50-70% LLM запросов через кэширование

### Requirement 8: UI компоненты для курса

**User Story:** As a пользователь, I want видеть курс в удобном интерфейсе с теорией и практикой, so that обучение было комфортным.

#### Acceptance Criteria

1. THE CourseModule_Component SHALL отображать теорию с Markdown рендерингом и подсветкой синтаксиса
2. THE CourseModule_Component SHALL отображать формулы через блоки цитат с Unicode символами
3. THE CourseModule_Component SHALL показывать прогресс по модулю (выполненные задания)
4. THE PracticeTask_Component SHALL отображать Monaco Editor для code заданий
5. THE PracticeTask_Component SHALL показывать difficulty badge (easy/medium/hard) с цветовой индикацией
6. THE PracticeTask_Component SHALL показывать hints с возможностью раскрытия
7. THE UI SHALL быть responsive и работать на мобильных устройствах

### Requirement 9: API для создания курса

**User Story:** As a разработчик, I want иметь REST API для генерации курсов, so that можно интегрировать с другими системами.

#### Acceptance Criteria

1. THE API SHALL принимать POST /api/create-course с query в body
2. THE API SHALL валидировать query (длина 3-500 символов, без вредоносного контента)
3. THE API SHALL применять rate limiting (10 запросов/час на IP)
4. THE API SHALL возвращать полную структуру курса с модулями, теорией и практикой
5. THE API SHALL возвращать usage статистику (requests_today, tokens_today)
6. WHEN генерация не удалась, THEN THE API SHALL возвращать понятное сообщение об ошибке

### Requirement 10: Безопасность и валидация

**User Story:** As a система, I want защищать от вредоносного контента и инъекций, so that платформа была безопасной.

#### Acceptance Criteria

1. THE System SHALL санитизировать user input через DOMPurify
2. THE System SHALL фильтровать запросы с вредоносными паттернами (hack, exploit, malware)
3. THE System SHALL ограничивать длину запроса до 500 символов
4. THE System SHALL использовать HTTPS для всех API вызовов
5. THE System SHALL не хранить персональные данные пользователей
6. THE System SHALL логировать ошибки без sensitive информации
