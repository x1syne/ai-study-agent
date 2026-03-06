# Requirements Document: MADI Schedule Parser

## Introduction

Комплексная система для парсинга всей информации о преподавателях и расписании с официального сайта МАДИ (madi.ru/tplan/). Система предоставляет доступ к расписанию занятий, экзаменов, информации о кафедрах, группах и преподавателях - всё, что может спросить студент о своём преподавателе.

## Glossary

- **Parser**: Модуль для извлечения данных с веб-страницы
- **MADI_Site**: Официальный сайт расписания МАДИ (madi.ru/tplan/)
- **Schedule_API**: API для получения расписания профессора
- **Professor_Schedule**: Расписание занятий конкретного преподавателя
- **Exam_Schedule**: Расписание экзаменов преподавателя
- **Department**: Кафедра университета
- **Group_Schedule**: Расписание учебной группы
- **Lesson**: Отдельное занятие (пара) в расписании
- **Exam**: Экзамен или зачёт
- **Cache**: Временное хранилище для уменьшения нагрузки на сайт МАДИ
- **Distance_Learning**: Заочная форма обучения

## Requirements

### Requirement 1: Парсинг расписания занятий преподавателя

**User Story:** As a student, I want to see my professor's class schedule, so that I know when and where they teach.

#### Acceptance Criteria

1. WHEN the system requests professor schedule THEN the Parser SHALL fetch data from madi.ru/tplan/r/?task=8
2. WHEN parsing professor page THEN the Parser SHALL extract professor name, lesson time, subject, room, building, group, and lesson type
3. WHEN the professor is not found THEN the Parser SHALL return an empty schedule with appropriate error message
4. WHEN the MADI site is unavailable THEN the Parser SHALL fallback to cached data or return error
5. WHEN parsing HTML THEN the Parser SHALL handle different table structures and missing fields gracefully

### Requirement 2: Парсинг расписания экзаменов преподавателя

**User Story:** As a student, I want to see my professor's exam schedule, so that I know when they conduct exams.

#### Acceptance Criteria

1. WHEN the system requests exam schedule THEN the Parser SHALL fetch data from madi.ru/tplan/r/?task=4
2. WHEN parsing exam page THEN the Parser SHALL extract exam date, time, subject, room, building, group, and exam type (экзамен/зачёт)
3. WHEN no exams are scheduled THEN the Parser SHALL return empty exam list
4. WHEN exam is for distance learning THEN the Parser SHALL mark it with distance_learning flag
5. WHEN parsing fails THEN the Parser SHALL return cached data or error message

### Requirement 3: Парсинг информации о кафедре

**User Story:** As a student, I want to see information about my professor's department, so that I know which department they belong to and what subjects they teach.

#### Acceptance Criteria

1. WHEN the system requests department info THEN the Parser SHALL fetch data from madi.ru/tplan/r/?task=11
2. WHEN parsing department page THEN the Parser SHALL extract department name, professors list, and subjects taught
3. WHEN professor belongs to multiple departments THEN the Parser SHALL return all departments
4. WHEN department has no schedule THEN the Parser SHALL return empty schedule with department name
5. WHEN parsing fails THEN the Parser SHALL return cached data or error message

### Requirement 4: Парсинг расписания группы

**User Story:** As a student, I want to see my group's schedule, so that I can find when my professor teaches my group.

#### Acceptance Criteria

1. WHEN the system requests group schedule THEN the Parser SHALL fetch data from madi.ru/tplan/r/?task=7
2. WHEN parsing group page THEN the Parser SHALL extract all lessons for the group including professor names
3. WHEN filtering by professor THEN the Parser SHALL return only lessons taught by that professor
4. WHEN group has distance learning THEN the Parser SHALL fetch from task=17 instead
5. WHEN parsing fails THEN the Parser SHALL return cached data or error message

### Requirement 5: Парсинг расписания заочной формы обучения

**User Story:** As a distance learning student, I want to see my professor's distance learning schedule, so that I know when they teach distance learning groups.

#### Acceptance Criteria

1. WHEN the system requests distance learning schedule THEN the Parser SHALL fetch data from madi.ru/tplan/r/?task=15
2. WHEN parsing distance learning page THEN the Parser SHALL extract session dates, subjects, groups, and rooms
3. WHEN professor teaches both regular and distance learning THEN the Parser SHALL merge both schedules
4. WHEN distance learning session is scheduled THEN the Parser SHALL include session start and end dates
5. WHEN parsing fails THEN the Parser SHALL return cached data or error message

### Requirement 2: Кэширование данных

**User Story:** As a system administrator, I want to cache parsed schedule data, so that I can reduce load on MADI website and improve response time.

#### Acceptance Criteria

1. WHEN schedule is successfully parsed THEN the Cache SHALL store the data with timestamp and data type (schedule/exam/department)
2. WHEN cached data is less than 1 hour old THEN the System SHALL return cached data without fetching
3. WHEN cached data is older than 1 hour THEN the System SHALL fetch fresh data from MADI site
4. WHEN fetching fails and cache exists THEN the System SHALL return stale cached data with warning
5. WHEN cache is empty and fetching fails THEN the System SHALL return error message

### Requirement 3: Поиск преподавателя

**User Story:** As a system, I want to search for professor by name, so that I can find their schedule page URL.

#### Acceptance Criteria

1. WHEN searching for "Остроух" THEN the System SHALL find professor "Остроух А.В." in the list
2. WHEN multiple professors match THEN the System SHALL return all matches with their departments
3. WHEN no professor matches THEN the System SHALL return null
4. WHEN search query is empty THEN the System SHALL return error
5. WHEN MADI site returns invalid HTML THEN the System SHALL handle parsing errors gracefully

### Requirement 4: Форматирование расписания

**User Story:** As a chat API, I want to receive formatted schedule data, so that I can display it to users in a readable format.

#### Acceptance Criteria

1. WHEN schedule is retrieved THEN the System SHALL format it with all available fields (time, subject, type, room, building, group)
2. WHEN formatting lessons THEN the System SHALL distinguish between regular and distance learning
3. WHEN lesson type is not specified THEN the System SHALL infer it from subject name or default to "lecture"
4. WHEN building is not specified THEN the System SHALL leave it as optional field
5. WHEN group is not specified THEN the System SHALL leave it as optional field

### Requirement 5: Обработка ошибок

**User Story:** As a developer, I want comprehensive error handling, so that the system remains stable when MADI site changes or is unavailable.

#### Acceptance Criteria

1. WHEN network request fails THEN the System SHALL log error and return cached data or error message
2. WHEN HTML structure changes THEN the System SHALL log parsing error and return cached data
3. WHEN timeout occurs THEN the System SHALL abort request after 10 seconds and return cached data
4. WHEN rate limit is hit THEN the System SHALL wait and retry with exponential backoff
5. WHEN critical error occurs THEN the System SHALL fallback to static schedule data

### Requirement 6: Интеграция с существующим API

**User Story:** As a schedule API consumer, I want the parser to integrate seamlessly with existing schedule-api.ts, so that no changes are needed in other parts of the system.

#### Acceptance Criteria

1. WHEN getOstroukhSchedule is called THEN the System SHALL use parser if available, fallback to static data otherwise
2. WHEN parser returns data THEN the System SHALL transform it to match existing DaySchedule interface
3. WHEN existing code calls formatScheduleForChat THEN the System SHALL work with both parsed and static data
4. WHEN existing code calls getCurrentOrNextLesson THEN the System SHALL work with both parsed and static data
5. WHEN parser is disabled via config THEN the System SHALL use static data only

### Requirement 7: Конфигурация парсера

**User Story:** As a system administrator, I want to configure parser behavior, so that I can control caching, timeouts, and fallback options.

#### Acceptance Criteria

1. WHEN USE_MADI_PARSER environment variable is set to "true" THEN the System SHALL enable parser
2. WHEN USE_MADI_PARSER is set to "false" THEN the System SHALL use static data only
3. WHEN MADI_CACHE_TTL is set THEN the System SHALL use that value for cache expiration (default: 3600 seconds)
4. WHEN MADI_REQUEST_TIMEOUT is set THEN the System SHALL use that value for request timeout (default: 10000 ms)
5. WHEN MADI_FALLBACK_TO_STATIC is set to "true" THEN the System SHALL use static data on parser failure

### Requirement 8: Логирование и мониторинг

**User Story:** As a system administrator, I want detailed logging of parser operations, so that I can monitor and debug issues.

#### Acceptance Criteria

1. WHEN parser starts fetching THEN the System SHALL log "Fetching [data_type] from MADI site"
2. WHEN parser succeeds THEN the System SHALL log "Successfully parsed [data_type] for [professor]"
3. WHEN parser fails THEN the System SHALL log error with details and stack trace
4. WHEN cache is used THEN the System SHALL log "Using cached [data_type] (age: X minutes)"
5. WHEN fallback occurs THEN the System SHALL log "Falling back to static schedule data"

### Requirement 9: Агрегация данных о преподавателе

**User Story:** As a student, I want to get all information about my professor in one request, so that I can see their complete schedule, exams, and department info.

#### Acceptance Criteria

1. WHEN requesting professor info THEN the System SHALL fetch schedule, exams, and department data in parallel
2. WHEN aggregating data THEN the System SHALL merge regular and distance learning schedules
3. WHEN some data sources fail THEN the System SHALL return partial data with warnings
4. WHEN all data sources fail THEN the System SHALL return cached aggregate or error
5. WHEN formatting aggregate THEN the System SHALL organize by date and type (lesson/exam)

### Requirement 10: Поддержка различных типов запросов

**User Story:** As a chat AI, I want to handle different types of student questions, so that I can provide relevant information based on the question.

#### Acceptance Criteria

1. WHEN student asks "когда у тебя пары" THEN the System SHALL return class schedule
2. WHEN student asks "когда экзамены" THEN the System SHALL return exam schedule
3. WHEN student asks "какая у тебя кафедра" THEN the System SHALL return department info
4. WHEN student asks "с какими группами работаешь" THEN the System SHALL return list of groups from schedule
5. WHEN student asks "есть ли заочка" THEN the System SHALL return distance learning schedule if available
