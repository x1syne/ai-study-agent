# Requirements Document

## Introduction

Унификация генерации практических заданий для всех доменов. Система должна создавать 10-20 заданий по пройденному материалу теории с прогрессией сложности от лёгких к сложным, с акцентом на средние и сложные задания.

## Glossary

- **Practice_Generator**: Система генерации практических заданий на основе теории
- **Task**: Отдельное практическое задание с вопросом, ответом и объяснением
- **Difficulty_Level**: Уровень сложности задания (easy, medium, hard)
- **Domain**: Предметная область (MATHEMATICS, PHYSICS, PROGRAMMING и др.)
- **Theory_Content**: Содержимое теоретического урока, на основе которого генерируются задания

## Requirements

### Requirement 1: Количество заданий

**User Story:** Как студент, я хочу получать достаточное количество практических заданий (10-20), чтобы закрепить пройденный материал.

#### Acceptance Criteria

1. WHEN практика генерируется для подтемы, THE Practice_Generator SHALL создать от 10 до 20 заданий
2. WHEN заданий сгенерировано менее 10, THE Practice_Generator SHALL повторить генерацию или дополнить задания
3. THE Practice_Generator SHALL НЕ создавать более 20 заданий для одной подтемы

### Requirement 2: Прогрессия сложности

**User Story:** Как студент, я хочу начинать с лёгких заданий и постепенно переходить к сложным, чтобы плавно осваивать материал.

#### Acceptance Criteria

1. THE Practice_Generator SHALL распределять задания по сложности: 20% easy, 40% medium, 40% hard
2. WHEN задания отображаются студенту, THE System SHALL сортировать их от easy к hard
3. THE Practice_Generator SHALL создавать минимум 2 задания каждого уровня сложности

### Requirement 3: Привязка к теории

**User Story:** Как студент, я хочу чтобы задания были строго по пройденной теории, чтобы закреплять именно изученный материал.

#### Acceptance Criteria

1. WHEN теория доступна, THE Practice_Generator SHALL использовать ТОЛЬКО материал из теории для создания заданий
2. THE Practice_Generator SHALL НЕ добавлять темы или концепции, которых нет в теории
3. WHEN задание создаётся, THE Practice_Generator SHALL ссылаться на конкретные концепции из теории в explanation

### Requirement 4: Разнообразие заданий

**User Story:** Как студент, я хочу разнообразные задания, чтобы проверить понимание с разных сторон.

#### Acceptance Criteria

1. THE Practice_Generator SHALL создавать задания разных типов в зависимости от домена
2. THE Practice_Generator SHALL НЕ создавать однотипные задания с разными числами
3. WHEN задания генерируются, THE Practice_Generator SHALL проверять уникальность формулировок

### Requirement 5: Универсальный формат для всех доменов

**User Story:** Как разработчик, я хочу единый промпт для генерации практики, чтобы упростить поддержку системы.

#### Acceptance Criteria

1. THE Practice_Generator SHALL использовать единый базовый промпт для всех доменов
2. THE Practice_Generator SHALL адаптировать типы заданий под специфику домена
3. WHEN домен не определён, THE Practice_Generator SHALL использовать универсальный набор типов заданий

### Requirement 6: Качество заданий

**User Story:** Как студент, я хочу получать качественные задания с понятными формулировками и полными объяснениями.

#### Acceptance Criteria

1. WHEN задание создаётся, THE Practice_Generator SHALL включать hint (подсказку) для каждого задания
2. WHEN задание создаётся, THE Practice_Generator SHALL включать explanation с пошаговым решением
3. THE Practice_Generator SHALL валидировать каждое задание перед добавлением в список
4. IF задание не проходит валидацию, THEN THE Practice_Generator SHALL пропустить его

### Requirement 7: Типы заданий по доменам

**User Story:** Как студент, я хочу получать задания подходящего типа для моей предметной области.

#### Acceptance Criteria

1. WHEN домен = MATHEMATICS или PHYSICS или CHEMISTRY, THE Practice_Generator SHALL создавать преимущественно type: "number" (расчётные задачи)
2. WHEN домен = PROGRAMMING, THE Practice_Generator SHALL создавать преимущественно type: "code" (задачи с кодом)
3. WHEN домен = LANGUAGES, THE Practice_Generator SHALL создавать type: "text" и "single" (перевод, грамматика)
4. WHEN домен = HISTORY или BIOLOGY или другие, THE Practice_Generator SHALL создавать type: "single" и "multiple" (тесты)
