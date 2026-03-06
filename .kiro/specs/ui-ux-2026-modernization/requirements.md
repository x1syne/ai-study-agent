# Requirements Document: UI/UX 2026 Modernization

## Introduction

Трансформация AI Study Agent из функциональной образовательной платформы в премиальный продукт уровня 2026 года с эстетикой "Apple meets Cyberpunk". Фокус на визуальной глубине, генеративном интерфейсе и микровзаимодействиях без изменения основной бизнес-логики (SM-2, AI-агент, схема БД).

## Glossary

- **System**: AI Study Agent веб-приложение
- **Glassmorphism_2.0**: Современный эффект стекла с backdrop-filter: blur(16px) и насыщенностью 180%
- **View_Transition**: Нативный API браузера для плавных переходов между страницами
- **Container_Queries**: CSS @container для адаптивных компонентов
- **Generative_UI**: Динамическая генерация UI-компонентов AI в реальном времени
- **Neural_Glow**: SVG-фильтры для эффекта свечения активных узлов графа
- **Focus_Mode**: Режим с использованием :has() для затемнения неактивных элементов
- **Scroll_Animation**: Анимации, привязанные к прокрутке страницы
- **Stagger_Animation**: Последовательная анимация дочерних элементов с задержкой

## Requirements

### Requirement 1: Glassmorphism 2.0 Card System

**User Story:** Как пользователь, я хочу видеть карточки с эффектом стекла и глубиной, чтобы интерфейс выглядел премиально и современно.

#### Acceptance Criteria

1. WHEN карточка отображается, THE System SHALL применить backdrop-filter: blur(16px) saturate(180%)
2. WHEN карточка отображается, THE System SHALL использовать тонкие границы с color-mix на основе primary цветов
3. WHEN пользователь наводит курсор на карточку, THE System SHALL применить эффект поднятия с box-shadow
4. WHEN карточка находится в фокусе, THE System SHALL применить glow эффект вокруг границ
5. THE System SHALL поддерживать три варианта glassmorphism: subtle, medium, intense

### Requirement 2: View Transitions для навигации

**User Story:** Как пользователь, я хочу плавные переходы между страницами, чтобы навигация была естественной и приятной.

#### Acceptance Criteria

1. WHEN пользователь кликает на карточку курса в /dashboard, THE System SHALL использовать view-transition-name для плавного разворачивания в /goals/[id]
2. WHEN пользователь переходит между страницами, THE System SHALL применить fade и scale анимации
3. WHEN view transitions не поддерживаются браузером, THE System SHALL использовать fallback анимации
4. THE System SHALL применять уникальные view-transition-name для каждого элемента
5. WHEN переход завершается, THE System SHALL сохранять scroll position

### Requirement 3: Container Queries для адаптивности

**User Story:** Как пользователь, я хочу чтобы компоненты адаптировались к размеру контейнера, чтобы интерфейс выглядел идеально при любом размере боковой панели.

#### Acceptance Criteria

1. WHEN боковая панель открыта/закрыта, THE System SHALL адаптировать размер карточек через @container
2. WHEN размер контейнера меняется, THE System SHALL изменять типографику через container query units (cqw, cqh)
3. THE System SHALL применять container-type: inline-size ко всем card контейнерам
4. WHEN контейнер узкий (<400px), THE System SHALL переключаться на вертикальный layout
5. WHEN контейнер широкий (>800px), THE System SHALL показывать дополнительные детали

### Requirement 4: Генеративный UI в чате

**User Story:** Как пользователь, я хочу видеть интерактивные компоненты в ответах AI, чтобы взаимодействие было более богатым и полезным.

#### Acceptance Criteria

1. WHEN AI возвращает тест, THE System SHALL отрендерить <QuizComponent /> с внутренним состоянием
2. WHEN AI возвращает код, THE System SHALL отрендерить <CodeBlock /> с подсветкой синтаксиса и кнопкой копирования
3. WHEN AI возвращает сравнение, THE System SHALL отрендерить <ComparisonTable /> с анимированными строками
4. WHEN компонент появляется, THE System SHALL применить stagger анимацию для дочерних элементов
5. THE System SHALL поддерживать минимум 6 типов генеративных компонентов: quiz, code, comparison, flowchart, steps, info

### Requirement 5: Neural Glow для графа знаний

**User Story:** Как пользователь, я хочу видеть эффект "нейронного свечения" на активных узлах графа, чтобы визуализация была более живой и футуристичной.

#### Acceptance Criteria

1. WHEN узел графа активен (IN_PROGRESS или AVAILABLE), THE System SHALL применить SVG filter с feGaussianBlur
2. WHEN узел графа активен, THE System SHALL применить feColorMatrix для цветового свечения
3. WHEN пользователь наводит курсор на узел, THE System SHALL усилить glow эффект
4. WHEN связь между узлами активна, THE System SHALL применить animated stroke с пульсацией
5. THE System SHALL использовать разные цвета свечения для разных статусов (cyan для AVAILABLE, orange для IN_PROGRESS, green для COMPLETED)

### Requirement 6: Focus Mode с :has()

**User Story:** Как пользователь, я хочу чтобы при наведении на карточку остальные элементы слегка тускнели, чтобы фокус был на выбранном элементе.

#### Acceptance Criteria

1. WHEN пользователь наводит курсор на карточку, THE System SHALL применить opacity: 0.4 к соседним карточкам через :has()
2. WHEN пользователь наводит курсор на карточку, THE System SHALL применить blur(2px) к соседним карточкам
3. WHEN курсор покидает область, THE System SHALL плавно вернуть исходное состояние
4. THE System SHALL применять focus mode только на desktop (min-width: 1024px)
5. WHEN focus mode активен, THE System SHALL сохранять интерактивность всех элементов

### Requirement 7: Scroll Animations для длинных страниц

**User Story:** Как пользователь, я хочу видеть анимации при прокрутке страницы с теорией, чтобы чтение было более динамичным.

#### Acceptance Criteria

1. WHEN пользователь прокручивает страницу теории, THE System SHALL применять fade-in анимацию к секциям при появлении в viewport
2. WHEN секция появляется в viewport, THE System SHALL применить slide-up анимацию с задержкой
3. THE System SHALL использовать Intersection Observer API для отслеживания видимости
4. WHEN элемент уже был анимирован, THE System SHALL не повторять анимацию при повторном появлении
5. THE System SHALL применять scroll animations только если prefers-reduced-motion: no-preference

### Requirement 8: Многоуровневая тёмная тема

**User Story:** Как пользователь, я хочу видеть многоуровневую тёмную тему вместо плоского чёрного фона, чтобы интерфейс имел глубину.

#### Acceptance Criteria

1. THE System SHALL использовать три уровня фона: bg-background (глубокие чернила #0a0a12), bg-surface (#151520), bg-overlay (стекло)
2. WHEN элемент находится на переднем плане, THE System SHALL использовать более светлый оттенок
3. THE System SHALL применять subtle градиенты для создания глубины
4. WHEN светлая тема активна, THE System SHALL использовать многоуровневую светлую систему
5. THE System SHALL обеспечить контрастность минимум 4.5:1 для текста на всех уровнях

### Requirement 9: Fluid Typography с clamp()

**User Story:** Как пользователь, я хочу чтобы размер текста плавно масштабировался между breakpoints, чтобы типографика была идеальной на всех экранах.

#### Acceptance Criteria

1. THE System SHALL использовать clamp() для всех заголовков (h1-h6)
2. WHEN viewport меняется, THE System SHALL плавно масштабировать размер шрифта без скачков
3. THE System SHALL использовать формулу: clamp(min, preferred, max) где preferred использует vw единицы
4. THE System SHALL применять fluid typography к hero секциям на главной странице
5. THE System SHALL обеспечить минимальный размер шрифта 14px для body текста

### Requirement 10: Animated Gradient Borders

**User Story:** Как пользователь, я хочу видеть анимированные градиентные границы на важных карточках, чтобы они привлекали внимание.

#### Acceptance Criteria

1. WHEN карточка "Следующее задание" отображается, THE System SHALL применить linear-gradient анимацию на границе
2. THE System SHALL использовать CSS @property для плавной анимации градиента
3. WHEN анимация запущена, THE System SHALL использовать animation-duration: 3s и infinite
4. THE System SHALL применять animated borders только к primary action карточкам
5. WHEN пользователь взаимодействует с карточкой, THE System SHALL ускорить анимацию

### Requirement 11: 3D Flip для Flashcards

**User Story:** Как пользователь, я хочу видеть 3D эффект переворота карточек в режиме повторения, чтобы взаимодействие было тактильным.

#### Acceptance Criteria

1. WHEN пользователь кликает на flashcard, THE System SHALL применить rotateY(180deg) с preserve-3d
2. THE System SHALL использовать backface-visibility: hidden для передней и задней стороны
3. WHEN карточка переворачивается, THE System SHALL применить transition-duration: 0.6s с ease-out
4. WHEN ответ неправильный, THE System SHALL применить shake анимацию
5. THE System SHALL поддерживать touch gestures для переворота на мобильных устройствах

### Requirement 12: Streaming UI для чата

**User Story:** Как пользователь, я хочу видеть как компоненты появляются с анимацией во время ответа AI, чтобы интерфейс был живым.

#### Acceptance Criteria

1. WHEN AI начинает отвечать, THE System SHALL отображать компоненты с stagger анимацией
2. WHEN текст стримится, THE System SHALL применять typewriter эффект для заголовков
3. WHEN компонент полностью загружен, THE System SHALL применить scale-in анимацию
4. THE System SHALL использовать задержку 50-100ms между появлением элементов
5. WHEN стриминг завершён, THE System SHALL показать индикатор завершения

### Requirement 13: Micro-interactions для кнопок

**User Story:** Как пользователь, я хочу видеть тактильную обратную связь при нажатии на кнопки, чтобы взаимодействие было приятным.

#### Acceptance Criteria

1. WHEN пользователь нажимает кнопку, THE System SHALL применить scale(0.95) transform
2. WHEN кнопка в состоянии hover, THE System SHALL показать ripple эффект от точки клика
3. WHEN кнопка loading, THE System SHALL показать spinner с плавной анимацией
4. THE System SHALL использовать cubic-bezier(0.4, 0, 0.2, 1) для всех transitions
5. WHEN кнопка disabled, THE System SHALL применить opacity: 0.5 и cursor: not-allowed

### Requirement 14: Progress Indicators с анимацией

**User Story:** Как пользователь, я хочу видеть анимированные индикаторы прогресса, чтобы визуально отслеживать свой прогресс.

#### Acceptance Criteria

1. WHEN прогресс обновляется, THE System SHALL анимировать изменение ширины с transition-duration: 1s
2. WHEN прогресс достигает 100%, THE System SHALL применить success анимацию (pulse + color change)
3. THE System SHALL использовать gradient fill для progress bar
4. WHEN прогресс меняется, THE System SHALL показать числовое значение с count-up анимацией
5. THE System SHALL применять glow эффект к заполненной части progress bar

### Requirement 15: Responsive Navigation с анимацией

**User Story:** Как пользователь, я хочу видеть плавную анимацию открытия/закрытия боковой панели, чтобы навигация была естественной.

#### Acceptance Criteria

1. WHEN пользователь открывает sidebar, THE System SHALL применить slide-in анимацию с backdrop fade
2. WHEN sidebar открыт, THE System SHALL применить stagger анимацию к navigation items
3. WHEN пользователь закрывает sidebar, THE System SHALL применить slide-out с задержкой для backdrop
4. THE System SHALL использовать transform: translateX() вместо left/right для производительности
5. WHEN sidebar анимируется, THE System SHALL блокировать body scroll на мобильных

### Requirement 16: Loading States с Skeleton Screens

**User Story:** Как пользователь, я хочу видеть skeleton screens вместо пустых экранов при загрузке, чтобы понимать что контент загружается.

#### Acceptance Criteria

1. WHEN данные загружаются, THE System SHALL показать skeleton версию компонента
2. THE System SHALL применять shimmer анимацию к skeleton элементам
3. WHEN данные загружены, THE System SHALL плавно заменить skeleton на реальный контент
4. THE System SHALL использовать правильные размеры skeleton элементов (соответствующие реальному контенту)
5. THE System SHALL применять skeleton screens для всех async операций длительностью >300ms

### Requirement 17: Accessibility для анимаций

**User Story:** Как пользователь с чувствительностью к движению, я хочу чтобы анимации отключались, чтобы интерфейс был комфортным.

#### Acceptance Criteria

1. WHEN prefers-reduced-motion: reduce установлен, THE System SHALL отключить все декоративные анимации
2. WHEN prefers-reduced-motion: reduce установлен, THE System SHALL сохранить функциональные transitions (например, для focus states)
3. THE System SHALL использовать @media (prefers-reduced-motion: reduce) для всех анимаций
4. WHEN анимации отключены, THE System SHALL использовать instant transitions (duration: 0.01s)
5. THE System SHALL сохранять все функциональные возможности при отключенных анимациях

### Requirement 18: Performance оптимизация

**User Story:** Как пользователь, я хочу чтобы все анимации работали плавно при 60fps, чтобы интерфейс был отзывчивым.

#### Acceptance Criteria

1. THE System SHALL использовать transform и opacity для анимаций (GPU-accelerated свойства)
2. THE System SHALL избегать анимации layout-triggering свойств (width, height, top, left)
3. WHEN анимация запускается, THE System SHALL использовать will-change для оптимизации
4. THE System SHALL удалять will-change после завершения анимации
5. THE System SHALL использовать requestAnimationFrame для JavaScript анимаций

### Requirement 19: Dark/Light Theme Toggle с анимацией

**User Story:** Как пользователь, я хочу видеть плавный переход между тёмной и светлой темой, чтобы смена темы не была резкой.

#### Acceptance Criteria

1. WHEN пользователь переключает тему, THE System SHALL применить view transition для плавной смены цветов
2. THE System SHALL использовать transition-duration: 0.3s для всех цветовых изменений
3. WHEN тема меняется, THE System SHALL сохранить выбор в localStorage
4. THE System SHALL применять тему на основе prefers-color-scheme при первом посещении
5. WHEN тема меняется, THE System SHALL обновить meta theme-color для mobile browsers

### Requirement 20: Hover States с предсказанием

**User Story:** Как пользователь, я хочу чтобы hover states появлялись мгновенно, чтобы интерфейс был отзывчивым.

#### Acceptance Criteria

1. THE System SHALL использовать @media (hover: hover) для применения hover эффектов только на устройствах с курсором
2. WHEN курсор приближается к интерактивному элементу, THE System SHALL предзагружать hover состояние
3. THE System SHALL использовать transition-delay: 0s для hover in и 0.1s для hover out
4. WHEN элемент в hover состоянии, THE System SHALL показать дополнительную информацию с fade-in
5. THE System SHALL применять pointer-events: none к декоративным элементам для предотвращения случайных hover

## Notes

- Все изменения должны быть совместимы с существующей архитектурой Next.js 14 + TypeScript
- Не изменять бизнес-логику (SM-2, AI-агент, Prisma схему)
- Использовать CSS-first подход где возможно для производительности
- Fallback для браузеров без поддержки современных CSS features
- Тестировать на Chrome, Firefox, Safari (desktop и mobile)
