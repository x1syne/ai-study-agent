# Implementation Plan: MADI Schedule Parser

## Overview

Реализация комплексного парсера для получения всей информации о преподавателях с сайта MADI (расписание занятий, экзамены, кафедры, группы).

## Tasks

- [x] 1. Установка зависимостей и базовая структура
  - Установить cheerio для парсинга HTML
  - Создать базовую структуру файлов (madi-parser.ts)
  - Настроить TypeScript интерфейсы
  - _Requirements: 7.1_

- [x] 2. Реализация HTTP Fetcher
  - [x] 2.1 Создать функцию fetchMADIPage с поддержкой timeout
    - Реализовать AbortController для таймаутов
    - Добавить User-Agent заголовок
    - Обработать HTTP ошибки (4xx, 5xx)
    - _Requirements: 5.3, 8.1_
  
  - [x] 2.2 Написать unit тесты для HTTP Fetcher

    - Тест успешного запроса
    - Тест таймаута
    - Тест HTTP ошибок
    - _Requirements: 5.3_

- [x] 3. Реализация Cache Manager
  - [x] 3.1 Создать класс ScheduleCache
    - Реализовать set/get методы
    - Добавить TTL проверку
    - Реализовать LRU eviction (max 100 entries)
    - Поддержка разных типов данных (schedule/exams/department)
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ]* 3.2 Написать property тест для Cache TTL
    - **Property 2: Cache respects TTL**
    - **Validates: Requirements 2.2, 2.3**
  
  - [ ]* 3.3 Написать property тест для Cache key uniqueness
    - **Property 6: Cache key uniqueness**
    - **Validates: Requirements 2.1**

- [x] 4. Реализация Schedule Parser (task=8)
  - [x] 4.1 Создать функцию parseSchedulePage
    - Парсинг HTML таблицы расписания
    - Извлечение: день недели, время, предмет, аудитория, группа
    - Определение типа занятия (лекция/практика/лаб)
    - Обработка отсутствующих полей
    - _Requirements: 1.1, 1.2, 1.5_
  
  - [ ]* 4.2 Написать property тест для lesson type inference
    - **Property 5: Lesson type inference is consistent**
    - **Validates: Requirements 4.3**
  
  - [ ]* 4.3 Написать unit тесты для Schedule Parser
    - Тест парсинга корректной таблицы
    - Тест обработки пустого расписания
    - Тест обработки некорректного HTML
    - _Requirements: 1.3, 1.5_

- [x] 5. Реализация Exam Parser (task=4)
  - [x] 5.1 Создать функцию parseExamPage
    - Парсинг HTML таблицы экзаменов
    - Извлечение: дата, время, предмет, аудитория, группа
    - Определение типа (экзамен/зачёт)
    - Обработка заочной формы
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [ ]* 5.2 Написать property тест для exam type inference
    - **Property 12: Exam type inference**
    - **Validates: Requirements 2.2**
  
  - [ ]* 5.3 Написать unit тесты для Exam Parser
    - Тест парсинга экзаменов
    - Тест парсинга зачётов
    - Тест пустого расписания экзаменов
    - _Requirements: 2.3_

- [x] 6. Реализация Department Parser (task=11)
  - [x] 6.1 Создать функцию parseDepartmentPage
    - Парсинг информации о кафедре
    - Извлечение названия кафедры
    - Извлечение списка преподавателей
    - Извлечение списка дисциплин
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 6.2 Написать unit тесты для Department Parser
    - Тест парсинга кафедры
    - Тест обработки нескольких кафедр
    - Тест пустой кафедры
    - _Requirements: 3.3, 3.4_

- [x] 7. Реализация Group Parser (task=7)
  - [x] 7.1 Создать функцию parseGroupPage
    - Парсинг расписания группы
    - Фильтрация по преподавателю
    - Извлечение всех занятий группы
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 7.2 Написать unit тесты для Group Parser
    - Тест парсинга расписания группы
    - Тест фильтрации по преподавателю
    - _Requirements: 4.3_

- [-] 8. Реализация Distance Learning Parser (task=15, task=17)
  - [x] 8.1 Создать функцию parseDistanceLearningPage
    - Парсинг расписания заочной формы
    - Извлечение дат сессий
    - Установка флага isDistanceLearning
    - _Requirements: 5.1, 5.2, 5.4_
  
  - [ ]* 8.2 Написать property тест для distance learning flag
    - **Property 10: Distance learning flag consistency**
    - **Validates: Requirements 5.2, 5.4**

- [x] 9. Реализация Professor Search
  - [x] 9.1 Создать функцию searchProfessor
    - Поиск преподавателя по имени
    - Возврат списка совпадений
    - Обработка пустого результата
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [ ]* 9.2 Написать unit тесты для Professor Search
    - Тест поиска "Остроух"
    - Тест множественных совпадений
    - Тест отсутствия совпадений
    - _Requirements: 3.3_

- [x] 10. Реализация Data Aggregator
  - [x] 10.1 Создать функцию aggregateProfessorInfo
    - Параллельная загрузка всех источников данных
    - Объединение расписаний (очное + заочное)
    - Извлечение списка групп
    - Обработка частичных ошибок
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [ ]* 10.2 Написать property тест для parallel aggregation
    - **Property 9: Parallel aggregation consistency**
    - **Validates: Requirements 9.3**
  
  - [ ]* 10.3 Написать property тест для group extraction
    - **Property 11: Group extraction completeness**
    - **Validates: Requirements 9.2**

- [x] 11. Реализация MADIParser класса
  - [x] 11.1 Создать класс MADIParser
    - Инициализация с конфигурацией
    - Реализация getProfessorSchedule
    - Реализация getProfessorExams
    - Реализация getProfessorDepartments
    - Реализация getGroupSchedule
    - Реализация getDistanceLearningSchedule
    - Реализация getProfessorInfo (агрегация)
    - Реализация searchProfessor
    - Реализация clearCache
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 9.1_
  
  - [ ]* 11.2 Написать property тест для parser output structure
    - **Property 1: Parser returns valid schedule structure**
    - **Validates: Requirements 1.2, 4.1**
  
  - [ ]* 11.3 Написать property тест для configuration validation
    - **Property 8: Configuration validation**
    - **Validates: Requirements 7.2**
  
  - [ ]* 11.4 Написать property тест для error handling
    - **Property 4: Error handling never crashes**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.5**

- [x] 12. Checkpoint - Тестирование базового парсера
  - Запустить все unit тесты
  - Запустить все property тесты
  - Проверить работу с реальным сайтом MADI (опционально)
  - Убедиться, что все тесты проходят

- [x] 13. Интеграция с schedule-api.ts
  - [x] 13.1 Модифицировать getOstroukhSchedule
    - Инициализация MADIParser если enabled
    - Попытка парсинга с fallback на статические данные
    - Трансформация ParsedSchedule в DaySchedule
    - _Requirements: 6.1, 6.2_
  
  - [ ]* 13.2 Написать property тест для fallback
    - **Property 3: Fallback preserves interface**
    - **Validates: Requirements 6.2, 6.3**
  
  - [ ]* 13.3 Написать integration тесты
    - Тест полного flow: fetch → parse → cache → return
    - Тест fallback chain: parser fails → cache → static
    - Тест concurrent requests
    - _Requirements: 6.3, 6.4_

- [x] 14. Интеграция с ScheduleTool
  - [x] 14.1 Обновить ScheduleTool класс
    - Добавить инициализацию MADIParser
    - Добавить параметр info_type
    - Реализовать getSchedule с парсером
    - Реализовать getExams
    - Реализовать getDepartment
    - Реализовать getGroups
    - Реализовать getAllInfo
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 14.2 Обновить tool parameters schema
    - Добавить info_type в параметры
    - Обновить description
    - _Requirements: 10.1_
  
  - [x] 14.3 Реализовать formatting методы
    - formatSchedule (с поддержкой distance learning)
    - formatExams
    - formatDepartments
    - formatProfessorInfo
    - _Requirements: 4.1, 4.2_
  
  - [ ]* 14.4 Написать integration тесты для ScheduleTool
    - Тест каждого info_type
    - Тест с реальным AI function calling
    - _Requirements: 10.1_

- [x] 15. Добавление environment variables
  - [x] 15.1 Обновить .env.example
    - Добавить USE_MADI_PARSER
    - Добавить MADI_CACHE_TTL
    - Добавить MADI_REQUEST_TIMEOUT
    - Добавить MADI_FALLBACK_TO_STATIC
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 15.2 Обновить README.md
    - Документировать новые переменные окружения
    - Добавить примеры использования
    - _Requirements: 7.1_

- [x] 16. Логирование и мониторинг
  - [x] 16.1 Добавить логирование во все методы
    - Логировать начало fetching
    - Логировать успешный парсинг
    - Логировать ошибки с деталями
    - Логировать использование кэша
    - Логировать fallback
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 16.2 Добавить метрики
    - Cache hit/miss ratio
    - Parser success rate
    - Average response time
    - _Requirements: 8.1_

- [x] 17. Финальное тестирование
  - [x] 17.1 Тестирование с реальным сайтом MADI
    - Проверить парсинг расписания Остроуха
    - Проверить парсинг экзаменов
    - Проверить парсинг кафедры
    - Проверить агрегацию всех данных
    - _Requirements: 1.1, 2.1, 3.1, 9.1_
  
  - [x] 17.2 Тестирование через чат
    - Спросить "когда у тебя пары?"
    - Спросить "когда экзамены?"
    - Спросить "какая у тебя кафедра?"
    - Спросить "с какими группами работаешь?"
    - Спросить "есть ли заочка?"
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_
  
  - [x] 17.3 Проверить fallback механизм
    - Отключить интернет и проверить кэш
    - Проверить fallback на статические данные
    - _Requirements: 5.5, 6.5_

- [ ] 18. Checkpoint - Финальная проверка
  - Все тесты проходят (unit + property + integration)
  - Парсер работает с реальным сайтом MADI
  - AI корректно использует function calling
  - Кэширование работает
  - Fallback работает
  - Логирование работает

- [-] 19. Документация
  - [ ] 19.1 Создать MADI_PARSER_GUIDE.md
    - Описание архитектуры
    - Примеры использования
    - Troubleshooting
    - _Requirements: 7.1_
  
  - [ ] 19.2 Обновить API_DOCUMENTATION.md
    - Документировать новые методы
    - Добавить примеры запросов
    - _Requirements: 6.1_

- [-] 20. Деплой и мониторинг
  - [x] 20.1 Задеплоить на Vercel
    - Установить environment variables
    - Проверить работу в production
    - _Requirements: 7.1_
  
  - [-] 20.2 Настроить мониторинг
    - Отслеживать ошибки парсинга
    - Отслеживать доступность MADI сайта
    - Настроить алерты
    - _Requirements: 8.1_

## Notes

- Задачи с `*` являются опциональными (тесты) и могут быть пропущены для быстрого MVP
- Каждая задача ссылается на конкретные requirements для трассируемости
- Checkpoints обеспечивают инкрементальную валидацию
- Property тесты валидируют универсальные свойства корректности
- Unit тесты валидируют конкретные примеры и edge cases
- Integration тесты проверяют работу всей системы end-to-end
