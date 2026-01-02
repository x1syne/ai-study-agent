# Requirements Document

## Introduction

Расширение AI Study Agent для генерации визуально богатых, интерактивных образовательных курсов с мультимедиа-контентом, геймификацией и адаптивным дизайном. Система превращает учебные темы в увлекательный мультимедийный опыт уровня топовых EdTech платформ (Coursera, Brilliant, Duolingo).

## Glossary

- **Visual_Course_Renderer**: Компонент для рендеринга курсов с визуальными элементами и интерактивностью
- **Media_Orchestrator**: Сервис для умного выбора и генерации медиа-контента (изображения, диаграммы, видео)
- **Visual_Identity**: Визуальная идентичность курса (цветовая схема, шрифты, иконки)
- **Interactive_Component**: Интерактивный элемент курса (drag-and-drop, quiz, code sandbox, simulation)
- **Gamification_System**: Система геймификации с прогрессом, наградами и достижениями
- **Mermaid_Diagram**: Диаграмма в формате Mermaid.js для визуализации концепций
- **Chart_Visualization**: Визуализация данных через Chart.js (bar, pie, line charts)
- **Color_Scheme**: Цветовая схема курса (blue-gradient, green-gradient, purple-gradient, orange-gradient)
- **Visual_Theme**: Визуальная тема (minimalist-illustrations, data-driven-infographics, animated-diagrams)
- **Text_Block**: Блок текста с сопровождающим визуальным элементом (max 150 слов)
- **Hero_Image**: Главное изображение модуля, генерируемое по промпту
- **Progress_Visualization**: Визуализация прогресса пользователя (progress bar, XP points, badges)

## Requirements

### Requirement 1: Визуальная идентичность курса

**User Story:** As a пользователь, I want каждый курс имел уникальную визуальную идентичность, so that обучение было эстетически приятным и запоминающимся.

#### Acceptance Criteria

1. THE Visual_Course_Renderer SHALL автоматически выбирать Color_Scheme на основе Topic_Type:
   - blue-gradient для programming и technical
   - green-gradient для scientific
   - purple-gradient для creative и humanities
   - orange-gradient для business и practical
2. THE Visual_Course_Renderer SHALL применять Visual_Theme на основе Difficulty_Level:
   - minimalist-illustrations для beginner
   - data-driven-infographics для intermediate
   - animated-diagrams для advanced и expert
3. THE Visual_Identity SHALL включать primary_color, gradient, font_pairing и icon_family
4. WHEN курс генерируется, THEN THE System SHALL создавать metadata.visual_identity с полной цветовой палитрой
5. THE Visual_Course_Renderer SHALL использовать Lucide React для иконок и Inter/JetBrains Mono для шрифтов

### Requirement 2: Визуальные элементы модулей

**User Story:** As a пользователь, I want каждый модуль содержал визуальные элементы, so that сложные концепции были понятнее через визуализацию.

#### Acceptance Criteria

1. THE Generator_Agent SHALL создавать primary_visual для каждого модуля с типом: diagram, infographic, timeline, comparison_table или flowchart
2. THE Generator_Agent SHALL генерировать hero_image_prompt для каждого модуля в формате "educational illustration flat design"
3. THE Generator_Agent SHALL добавлять secondary_visuals с icon_set для визуальных якорей ключевых концепций
4. WHEN модуль содержит сравнение, THEN THE Generator_Agent SHALL создавать comparison_table с цветовой индикацией
5. WHEN модуль содержит процесс, THEN THE Generator_Agent SHALL создавать flowchart в формате Mermaid
6. THE Visual_Course_Renderer SHALL рендерить decoration_elements (geometric_shape, gradient_orb, floating_icon) для эстетики

### Requirement 3: Интерактивные компоненты

**User Story:** As a пользователь, I want взаимодействовать с контентом через интерактивные элементы, so that обучение было активным и вовлекающим.

#### Acceptance Criteria

1. THE Generator_Agent SHALL создавать минимум 1 Interactive_Component на модуль
2. THE Interactive_Component SHALL поддерживать типы: drag_and_drop, code_sandbox, quiz_with_feedback, simulation, progress_checklist
3. WHEN тип interactive drag_and_drop, THEN THE System SHALL поддерживать difficulty: matching, ordering, fill_blank
4. THE Interactive_Component SHALL включать reward_visual: confetti, badge или progress_bar при успешном выполнении
5. THE Interactive_Component SHALL предоставлять hints_available (до 3 подсказок) с penalty за использование
6. WHEN пользователь завершает Interactive_Component, THEN THE System SHALL показывать анимацию успеха через framer-motion

### Requirement 4: Текстовые блоки с визуализацией

**User Story:** As a пользователь, I want текст был разбит на небольшие блоки с визуальной поддержкой, so that информация легче воспринималась и запоминалась.

#### Acceptance Criteria

1. THE Generator_Agent SHALL разбивать теорию на Text_Block не более 150 слов каждый
2. THE Generator_Agent SHALL сопоставлять каждому Text_Block визуальный элемент:
   - Для определений: icon + цветная плашка
   - Для примеров: illustration или photo с подписью
   - Для данных: Chart_Visualization или Mermaid_Diagram
   - Для алгоритмов: последовательная анимация шагов
3. THE Text_Block SHALL включать interactive_element типа toggle_detail, flip_card или scratch_to_reveal для дополнительной информации
4. THE Visual_Course_Renderer SHALL применять ленивую загрузку для медиа-элементов
5. WHEN Text_Block содержит код, THEN THE System SHALL использовать Monaco Editor с подсветкой синтаксиса

### Requirement 5: Диаграммы и визуализация данных

**User Story:** As a пользователь, I want видеть концепции в виде диаграмм и графиков, so that связи между понятиями были наглядными.

#### Acceptance Criteria

1. THE Generator_Agent SHALL генерировать Mermaid_Diagram для процессов, архитектур и связей
2. THE Generator_Agent SHALL генерировать Chart_Visualization (bar_chart, pie_chart, line_graph, mind_map) для данных
3. THE Mermaid_Diagram SHALL быть интерактивной с hover-эффектами и кликабельными узлами
4. THE Chart_Visualization SHALL быть интерактивной с tooltips и анимацией при загрузке
5. WHEN диаграмма сложная, THEN THE System SHALL поддерживать zoom и pan
6. THE Visual_Course_Renderer SHALL рендерить диаграммы через mermaid.js и chart.js библиотеки

### Requirement 6: Мультимедиа интеграция

**User Story:** As a пользователь, I want курс включал видео и внешние ресурсы, so that обучение было разнообразным и глубоким.

#### Acceptance Criteria

1. THE Generator_Agent SHALL генерировать video_sources с youtube_query для каждого модуля
2. THE video_sources SHALL включать duration_preference (2-5 minutes) и has_captions: true
3. THE Media_Orchestrator SHALL встраивать YouTube видео через react-youtube с aspect_ratio 16:9
4. THE Generator_Agent SHALL генерировать image_generation_prompts для создания иллюстраций
5. THE Media_Orchestrator SHALL искать изображения в Unsplash по keywords если генерация недоступна
6. THE Visual_Course_Renderer SHALL поддерживать embeds с platform: youtube, codepen, observable

### Requirement 7: Геймификация и прогресс

**User Story:** As a пользователь, I want видеть свой прогресс и получать награды, so that обучение было мотивирующим и увлекательным.

#### Acceptance Criteria

1. THE Gamification_System SHALL разбивать модули на уровни (levels) как в играх
2. THE Gamification_System SHALL присваивать визуальную награду (badge с emoji) за каждый уровень
3. THE Gamification_System SHALL показывать Progress_Visualization типа progress_bar, pie_chart или experience_points
4. THE Gamification_System SHALL добавлять checkpoints с title, emoji и reward_text
5. WHEN пользователь завершает checkpoint, THEN THE System SHALL показывать confetti анимацию через react-confetti
6. THE Gamification_System SHALL отслеживать max_value и current_value для каждого Progress_Visualization
7. THE Visual_Course_Renderer SHALL добавлять микро-интеракции: hover-эффекты, кликабельные элементы, анимации завершения

### Requirement 8: Адаптивный JSON формат курса

**User Story:** As a разработчик, I want API возвращал расширенный JSON с визуальными спецификациями, so that фронтенд мог рендерить богатый контент.

#### Acceptance Criteria

1. THE API SHALL возвращать course.metadata.visual_identity с primary_color, gradient, font_pairing, icon_family
2. THE API SHALL возвращать course.metadata.interactivity_level: high, medium или low
3. THE API SHALL возвращать для каждого модуля visual_spec с hero_image_prompt, color_scheme, decoration_elements
4. THE API SHALL возвращать для каждой секции content_type: theory, example, practice или review
5. THE API SHALL возвращать text_blocks с accompanying_visual и interactive_element
6. THE API SHALL возвращать multimedia с diagrams (mermaid/chartjs code) и embeds (platform, search_query)
7. THE API SHALL возвращать gamification с checkpoints и progress_visualization

### Requirement 9: Компоненты фронтенда

**User Story:** As a разработчик, I want иметь готовые React компоненты для рендеринга визуального курса, so that интеграция была простой.

#### Acceptance Criteria

1. THE VisualCourseRenderer_Component SHALL принимать props: courseData и userProgress
2. THE VisualCourseRenderer_Component SHALL автоматически подставлять изображения по промптам
3. THE VisualCourseRenderer_Component SHALL рендерить интерактивные диаграммы на лету
4. THE VisualCourseRenderer_Component SHALL адаптировать цветовую схему под visual_identity
5. THE MediaOrchestrator_Component SHALL выбирать источник медиа: DALL-E/Stability для генерации, Unsplash для поиска, mermaid для диаграмм
6. THE System SHALL использовать tech stack: mermaid.js, react-youtube, framer-motion, react-confetti, lucide-react

### Requirement 10: Кэширование медиа-элементов

**User Story:** As a система, I want кэшировать сгенерированные медиа-элементы, so that повторные запросы были быстрыми и экономили ресурсы.

#### Acceptance Criteria

1. THE Cache_System SHALL кэшировать сгенерированные изображения по hash от промпта
2. THE Cache_System SHALL кэшировать результаты поиска Unsplash по keywords
3. THE Cache_System SHALL кэшировать скомпилированные Mermaid диаграммы
4. WHEN медиа-элемент найден в кэше, THEN THE System SHALL возвращать кэшированную версию
5. THE Cache_System SHALL устанавливать TTL 1 месяц для медиа-элементов
6. THE Cache_System SHALL отслеживать hit_rate для оптимизации

