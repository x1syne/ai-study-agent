# Requirements Document

## Introduction

Реструктуризация системы курсов для поддержки иерархической структуры: Goal → Module → Topic. Это позволит создавать курсы с логической группировкой тем по модулям, как на ведущих образовательных платформах (Codecademy, Udemy, Khan Academy).

## Glossary

- **Goal**: Учебная цель/курс пользователя (например, "Термодинамика", "Python ООП")
- **Module**: Логический раздел курса, группирующий связанные темы (например, "Первый закон термодинамики")
- **Topic**: Конкретная тема для изучения внутри модуля (например, "Работа и теплота")
- **Course_Generator**: Компонент AI, генерирующий структуру курса
- **Progress_Tracker**: Система отслеживания прогресса пользователя

## Requirements

### Requirement 1: Модель данных Module

**User Story:** As a developer, I want to have a Module entity in the database, so that topics can be logically grouped within a course.

#### Acceptance Criteria

1. THE Database SHALL contain a Module table with fields: id, goalId, name, description, icon, order
2. THE Module SHALL have a one-to-many relationship with Topic (one module contains many topics)
3. THE Goal SHALL have a one-to-many relationship with Module (one goal contains many modules)
4. WHEN a Goal is deleted, THE Database SHALL cascade delete all associated Modules
5. WHEN a Module is deleted, THE Database SHALL cascade delete all associated Topics

### Requirement 2: Генерация иерархической структуры курса

**User Story:** As a user, I want the AI to generate courses with modules and topics, so that I can learn in a structured, logical progression.

#### Acceptance Criteria

1. WHEN a user creates a new goal, THE Course_Generator SHALL generate 3-6 modules for the course
2. WHEN generating modules, THE Course_Generator SHALL create 2-5 topics per module
3. THE Course_Generator SHALL assign sequential order numbers to modules (1, 2, 3...)
4. THE Course_Generator SHALL assign sequential order numbers to topics within each module (1, 2, 3...)
5. WHEN generating a course, THE Course_Generator SHALL ensure topics within a module are thematically related
6. THE Course_Generator SHALL generate module names that clearly describe the section content
7. THE Course_Generator SHALL generate module descriptions explaining what will be learned

### Requirement 3: Отображение иерархической структуры в UI

**User Story:** As a user, I want to see my course organized by modules, so that I can understand the learning path and track progress by section.

#### Acceptance Criteria

1. WHEN viewing a course, THE UI SHALL display modules as collapsible sections
2. WHEN viewing a course, THE UI SHALL display topics grouped under their respective modules
3. THE UI SHALL show module order numbers (Module 1, Module 2, etc.)
4. THE UI SHALL show topic order numbers within modules (1.1, 1.2, 2.1, 2.2, etc.)
5. WHEN a module is collapsed, THE UI SHALL show module name and progress summary
6. WHEN a module is expanded, THE UI SHALL show all topics within that module

### Requirement 4: Прогресс по модулям

**User Story:** As a user, I want to see my progress for each module, so that I can understand how much of each section I have completed.

#### Acceptance Criteria

1. WHEN viewing a course, THE Progress_Tracker SHALL calculate and display progress percentage for each module
2. THE Progress_Tracker SHALL calculate module progress as: (completed topics / total topics) * 100
3. WHEN all topics in a module are completed, THE UI SHALL visually indicate the module as completed
4. THE UI SHALL display overall course progress based on all modules

### Requirement 5: Миграция существующих данных

**User Story:** As a developer, I want existing courses to be migrated to the new structure, so that users don't lose their progress.

#### Acceptance Criteria

1. WHEN migration runs, THE System SHALL create a default "General" module for each existing Goal
2. WHEN migration runs, THE System SHALL move all existing Topics to the default module
3. WHEN migration runs, THE System SHALL preserve all existing TopicProgress records
4. THE Migration SHALL be reversible in case of issues

### Requirement 6: API обновления

**User Story:** As a developer, I want updated API endpoints, so that the frontend can work with the new hierarchical structure.

#### Acceptance Criteria

1. THE API SHALL return modules with their topics when fetching a Goal
2. THE API SHALL support creating a Goal with modules and topics in a single request
3. THE API SHALL support fetching module progress for a user
4. WHEN fetching course structure, THE API SHALL return data sorted by module order, then topic order
