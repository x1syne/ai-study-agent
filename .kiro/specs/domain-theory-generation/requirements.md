# Requirements Document

## Introduction

Улучшение качества генерации теоретического контента в AI Study Agent путём интеграции доменно-специфичных промптов из `domain-prompts.ts` в основной генератор `agent.ts`. Текущая генерация создаёт "стену текста" без чёткой структуры, особенно для точных наук (физика, математика, химия).

## Glossary

- **Domain_Config**: Конфигурация домена из `domain-prompts.ts`, содержащая `systemPrompt`, `sectionTemplates`, `formatRules`
- **Section_Template**: Шаблон секции с полями `title`, `prompt`, `minWords`, `required`
- **Theory_Generator**: Функция `generateFullLessonContent` в `agent.ts`, генерирующая теоретический контент
- **Domain_Detector**: Функция `detectDomain` определяющая предметную область по теме
- **RAG_Context**: Контекст из внешних источников (Wikipedia, arXiv, StackOverflow и др.)

## Requirements

### Requirement 1: Интеграция Domain Config в генератор

**User Story:** Как студент, я хочу получать теорию, структурированную под конкретную предметную область, чтобы материал был понятным и соответствовал стандартам домена.

#### Acceptance Criteria

1. WHEN Theory_Generator получает тему THEN THE Domain_Detector SHALL определить домен темы
2. WHEN домен определён THEN THE Theory_Generator SHALL загрузить соответствующий Domain_Config
3. WHEN Domain_Config загружен THEN THE Theory_Generator SHALL использовать `systemPrompt` из конфига вместо generic промпта
4. WHEN Domain_Config загружен THEN THE Theory_Generator SHALL использовать `sectionTemplates` для генерации секций
5. WHEN Domain_Config загружен THEN THE Theory_Generator SHALL применять `formatRules` к генерируемому контенту

### Requirement 2: Улучшение форматирования для точных наук

**User Story:** Как студент физики/математики/химии, я хочу видеть формулы в чётких блоках с расшифровкой переменных, чтобы легко понимать и запоминать материал.

#### Acceptance Criteria

1. WHEN домен является physics, math или chemistry THEN THE Theory_Generator SHALL форматировать формулы в блоках цитат с расшифровкой
2. WHEN генерируется формула THEN THE Theory_Generator SHALL указывать единицы измерения для каждой переменной
3. WHEN генерируется задача THEN THE Theory_Generator SHALL использовать структуру "Дано → Найти → Решение → Ответ"
4. WHEN генерируется физическая формула THEN THE Theory_Generator SHALL использовать Unicode символы (₀₁₂₃₄₅₆₇₈₉, α β γ) вместо LaTeX

### Requirement 3: Улучшение форматирования для программирования

**User Story:** Как студент программирования, я хочу видеть код в правильно оформленных блоках с комментариями, чтобы легко копировать и понимать примеры.

#### Acceptance Criteria

1. WHEN домен является programming THEN THE Theory_Generator SHALL НЕ генерировать псевдо-формулы типа "Класс = (Атрибуты, Методы)"
2. WHEN генерируется код THEN THE Theory_Generator SHALL оформлять его в блоках ```language с комментариями на русском
3. WHEN генерируется пример кода THEN THE Theory_Generator SHALL показывать вывод программы после кода
4. WHEN объясняется концепция THEN THE Theory_Generator SHALL использовать код и примеры вместо абстрактных формул

### Requirement 4: Визуальная иерархия контента

**User Story:** Как студент, я хочу видеть чёткую визуальную структуру материала, чтобы легко ориентироваться и находить нужную информацию.

#### Acceptance Criteria

1. WHEN генерируется секция THEN THE Theory_Generator SHALL использовать ### подзаголовки для структуры
2. WHEN генерируется определение THEN THE Theory_Generator SHALL выделять его в блоке цитат (>)
3. WHEN генерируется список THEN THE Theory_Generator SHALL использовать маркированные или нумерованные списки
4. WHEN генерируются разные блоки THEN THE Theory_Generator SHALL разделять их горизонтальной линией (---)
5. WHEN генерируется ключевой термин THEN THE Theory_Generator SHALL выделять его жирным (**термин**)

### Requirement 5: Минимальный объём контента по секциям

**User Story:** Как студент, я хочу получать достаточно подробный материал по каждой теме, чтобы полностью понять концепцию.

#### Acceptance Criteria

1. WHEN генерируется секция THEN THE Theory_Generator SHALL генерировать минимум `minWords` слов согласно Section_Template
2. WHEN секция помечена как `required: true` THEN THE Theory_Generator SHALL обязательно включить её в контент
3. IF секция получилась короче minWords THEN THE Theory_Generator SHALL дополнить её примерами и пояснениями

### Requirement 6: Использование RAG контекста по домену

**User Story:** Как студент, я хочу получать актуальную информацию из релевантных источников для моей предметной области.

#### Acceptance Criteria

1. WHEN генерируется контент THEN THE Theory_Generator SHALL использовать `getDomainRAGContext` вместо generic `getRAGContext`
2. WHEN RAG_Context содержит релевантную информацию THEN THE Theory_Generator SHALL интегрировать её в контент
3. WHEN RAG_Context содержит ссылки на источники THEN THE Theory_Generator SHALL упоминать их в материале

### Requirement 7: Обратная совместимость

**User Story:** Как разработчик, я хочу сохранить работоспособность существующего API, чтобы не ломать текущий функционал.

#### Acceptance Criteria

1. WHEN вызывается `runLessonAgent` THEN THE Theory_Generator SHALL возвращать тот же формат ответа
2. WHEN домен не определён THEN THE Theory_Generator SHALL использовать `general` конфиг
3. WHEN Domain_Config не содержит нужной секции THEN THE Theory_Generator SHALL использовать fallback из текущей логики
