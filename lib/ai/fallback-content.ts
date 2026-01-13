/**
 * Fallback Content - Резервный контент при ошибках генерации
 * 
 * Используется когда:
 * - AI не смог сгенерировать контент
 * - Контент не прошёл валидацию (score < 40)
 * - Все провайдеры недоступны
 */

import type { Domain } from './domain-prompts'

// ==================== FALLBACK ТЕОРИЯ ====================

/**
 * Domain-specific подсказки и ресурсы
 */
const DOMAIN_RESOURCES: Record<Domain, string> = {
  PROGRAMMING: `### 💻 Рекомендуемые ресурсы для программирования:
- [MDN Web Docs](https://developer.mozilla.org/) — документация по веб-технологиям
- [Stack Overflow](https://stackoverflow.com/) — вопросы и ответы
- [GitHub](https://github.com/) — примеры кода и проекты
- YouTube: поиск "\${topic} tutorial"
- [freeCodeCamp](https://www.freecodecamp.org/) — бесплатные курсы`,

  MATHEMATICS: `### 📐 Рекомендуемые ресурсы по математике:
- [Khan Academy](https://www.khanacademy.org/) — видеоуроки с практикой
- [Wolfram Alpha](https://www.wolframalpha.com/) — вычисления и графики
- [3Blue1Brown](https://www.youtube.com/c/3blue1brown) — визуализации
- [Desmos](https://www.desmos.com/) — графический калькулятор
- [Mathway](https://www.mathway.com/) — решение задач`,

  PHYSICS: `### ⚛️ Рекомендуемые ресурсы по физике:
- [Physics Classroom](https://www.physicsclassroom.com/) — теория и симуляции
- [HyperPhysics](http://hyperphysics.phy-astr.gsu.edu/) — справочник
- [PhET Simulations](https://phet.colorado.edu/) — интерактивные симуляции
- [MinutePhysics](https://www.youtube.com/user/minutephysics) — короткие объяснения
- YouTube: "\${topic} physics explained"`,

  CHEMISTRY: `### 🧪 Рекомендуемые ресурсы по химии:
- [PubChem](https://pubchem.ncbi.nlm.nih.gov/) — база данных соединений
- [ChemLibreTexts](https://chem.libretexts.org/) — учебники
- [Periodic Table](https://ptable.com/) — интерактивная таблица
- [NileRed](https://www.youtube.com/c/NileRed) — эксперименты
- YouTube: "\${topic} chemistry"`,

  BIOLOGY: `### 🧬 Рекомендуемые ресурсы по биологии:
- [Khan Academy Biology](https://www.khanacademy.org/science/biology)
- [NCBI](https://www.ncbi.nlm.nih.gov/) — научные статьи
- [BioRender](https://biorender.com/) — научные иллюстрации
- [Amoeba Sisters](https://www.youtube.com/c/AmoebaSisters) — анимации
- YouTube: "\${topic} biology"`,

  HISTORY: `### 📜 Рекомендуемые ресурсы по истории:
- [Wikipedia](https://ru.wikipedia.org/) — энциклопедия
- [World History Encyclopedia](https://www.worldhistory.org/)
- [Crash Course History](https://www.youtube.com/playlist?list=PLBDA2E52FB1EF80C9)
- [История России](https://histrf.ru/) — российская история
- YouTube: документальные фильмы по теме`,

  LANGUAGES: `### 🌍 Рекомендуемые ресурсы для изучения языков:
- [Duolingo](https://www.duolingo.com/) — интерактивное обучение
- [Reverso Context](https://context.reverso.net/) — примеры в контексте
- [Forvo](https://forvo.com/) — произношение
- [Lang-8](https://lang-8.com/) — проверка текстов носителями
- YouTube: "\${topic} lesson"`,

  ECONOMICS: `### 📊 Рекомендуемые ресурсы по экономике:
- [Investopedia](https://www.investopedia.com/) — финансовая энциклопедия
- [Khan Academy Economics](https://www.khanacademy.org/economics-finance-domain)
- [Trading Economics](https://tradingeconomics.com/) — статистика
- [Экономика для чайников](https://www.youtube.com/results?search_query=экономика+для+начинающих)
- YouTube: "\${topic} explained"`,

  ARTS: `### 🎨 Рекомендуемые ресурсы по искусству:
- [Google Arts & Culture](https://artsandculture.google.com/) — виртуальные музеи
- [Smarthistory](https://smarthistory.org/) — история искусства
- [The Art Story](https://www.theartstory.org/) — художники и движения
- [Behance](https://www.behance.net/) — современное искусство
- YouTube: "\${topic} art history"`,

  MEDICINE: `### 🏥 Рекомендуемые ресурсы по медицине:
- [MedlinePlus](https://medlineplus.gov/) — медицинская энциклопедия
- [PubMed](https://pubmed.ncbi.nlm.nih.gov/) — научные статьи
- [Osmosis](https://www.osmosis.org/) — медицинское образование
- [Visible Body](https://www.visiblebody.com/) — 3D анатомия
- YouTube: "\${topic} medical"`,

  LAW: `### ⚖️ Рекомендуемые ресурсы по праву:
- [КонсультантПлюс](http://www.consultant.ru/) — законодательство РФ
- [Гарант](https://www.garant.ru/) — правовая информация
- [Закон.ру](https://zakon.ru/) — юридическое сообщество
- [Право.ru](https://pravo.ru/) — новости права
- YouTube: "\${topic} право"`,

  ENGINEERING: `### ⚙️ Рекомендуемые ресурсы по инженерии:
- [Engineering Toolbox](https://www.engineeringtoolbox.com/) — справочник
- [MIT OpenCourseWare](https://ocw.mit.edu/) — курсы MIT
- [Practical Engineering](https://www.youtube.com/c/PracticalEngineeringChannel)
- [GrabCAD](https://grabcad.com/) — 3D модели
- YouTube: "\${topic} engineering"`,

  GENERAL: `### 📚 Рекомендуемые ресурсы:
- [Wikipedia](https://ru.wikipedia.org/) — энциклопедия
- [Khan Academy](https://www.khanacademy.org/) — образовательная платформа
- [Coursera](https://www.coursera.org/) — онлайн-курсы
- [YouTube](https://www.youtube.com/) — видеоуроки
- Google Scholar — научные статьи`
}

/**
 * Генерирует fallback теорию для темы
 */
export function getFallbackTheory(
  topicName: string,
  courseName: string,
  domain: Domain = 'GENERAL'
): string {
  const resources = DOMAIN_RESOURCES[domain] || DOMAIN_RESOURCES.GENERAL
  const resourcesWithTopic = resources.replace(/\$\{topic\}/g, topicName)

  return `## ${topicName}

> ⚠️ **Автоматическая генерация временно недоступна**
> 
> Мы подготовили для вас краткий обзор темы и ресурсы для самостоятельного изучения.
> Полный материал будет доступен при следующем посещении.

---

## 🎯 О чём эта тема?

**${topicName}** — важная тема в рамках курса "${courseName}".

Изучение этой темы поможет вам:
- Понять ключевые концепции и определения
- Увидеть практическое применение в реальных задачах
- Установить связи с другими темами курса

---

## 📝 Ключевые вопросы для изучения

При изучении темы "${topicName}" обратите внимание на следующие аспекты:

1. **Что это такое?** — определение и основные характеристики
2. **Зачем это нужно?** — практическое применение и важность
3. **Как это работает?** — механизмы и принципы
4. **Где это используется?** — примеры из реальной жизни
5. **Какие есть связи?** — отношения с другими концепциями

---

${resourcesWithTopic}

---

## 💡 Советы по изучению

1. **Начните с основ** — убедитесь, что понимаете базовые понятия
2. **Делайте заметки** — записывайте ключевые идеи своими словами
3. **Практикуйтесь** — решайте задачи и выполняйте упражнения
4. **Задавайте вопросы** — не стесняйтесь искать ответы
5. **Повторяйте** — возвращайтесь к материалу через время

---

## ✅ Что делать дальше?

- 📖 Изучите рекомендованные ресурсы выше
- 🔄 Вернитесь позже — мы сгенерируем полный материал
- 📝 Попробуйте практические задания (если доступны)
- 💬 Используйте AI-помощника для вопросов

---

*Материал будет автоматически обновлён при следующем посещении.*
`
}

// ==================== FALLBACK ЗАДАНИЯ ====================

/**
 * Генерирует базовые fallback задания для темы
 */
export function getFallbackTasks(topicName: string, domain: Domain = 'GENERAL'): any[] {
  return [
    {
      id: 1,
      type: 'single',
      difficulty: 'easy',
      question: `Что из перечисленного лучше всего описывает понятие "${topicName}"?`,
      options: [
        'Ключевая концепция, важная для понимания темы',
        'Второстепенный аспект, не влияющий на понимание',
        'Устаревшее понятие, не используемое сейчас',
        'Термин из другой области знаний'
      ],
      correctAnswer: 0,
      explanation: `"${topicName}" — это ключевая концепция в рамках изучаемого курса. Понимание этой темы важно для дальнейшего обучения.`,
      hint: 'Подумайте о том, почему эта тема включена в курс'
    },
    {
      id: 2,
      type: 'single',
      difficulty: 'easy',
      question: `В каком контексте чаще всего применяется "${topicName}"?`,
      options: [
        'В практических задачах и реальных проектах',
        'Только в теоретических исследованиях',
        'Исключительно в учебных целях',
        'Нигде не применяется на практике'
      ],
      correctAnswer: 0,
      explanation: 'Большинство концепций, изучаемых в курсах, имеют практическое применение в реальных задачах и проектах.',
      hint: 'Подумайте о реальных примерах использования'
    },
    {
      id: 3,
      type: 'single',
      difficulty: 'medium',
      question: `Какой подход лучше всего подходит для изучения темы "${topicName}"?`,
      options: [
        'Сочетание теории, практики и примеров',
        'Только чтение учебника без практики',
        'Только просмотр видео без заметок',
        'Заучивание определений наизусть'
      ],
      correctAnswer: 0,
      explanation: 'Эффективное обучение требует комбинации теоретического понимания, практических упражнений и анализа примеров.',
      hint: 'Вспомните, как вы лучше всего усваиваете новый материал'
    },
    {
      id: 4,
      type: 'single',
      difficulty: 'medium',
      question: `Какая связь между "${topicName}" и другими темами курса?`,
      options: [
        'Является основой или связана с другими темами',
        'Полностью изолированная тема без связей',
        'Противоречит другим темам курса',
        'Заменяет все предыдущие темы'
      ],
      correctAnswer: 0,
      explanation: 'Темы в образовательных курсах обычно связаны между собой и выстроены в логическую последовательность.',
      hint: 'Подумайте о структуре курса и порядке тем'
    },
    {
      id: 5,
      type: 'text',
      difficulty: 'medium',
      question: `Опишите своими словами, что такое "${topicName}" и почему это важно изучать (2-3 предложения).`,
      correctAnswer: topicName.toLowerCase(),
      explanation: 'Умение объяснить концепцию своими словами — признак глубокого понимания материала.',
      hint: 'Используйте простые слова, как будто объясняете другу'
    },
    {
      id: 6,
      type: 'single',
      difficulty: 'hard',
      question: `Какие навыки развивает изучение темы "${topicName}"?`,
      options: [
        'Аналитическое мышление и решение задач',
        'Только механическое запоминание фактов',
        'Исключительно творческие способности',
        'Никакие навыки не развиваются'
      ],
      correctAnswer: 0,
      explanation: 'Изучение любой темы развивает аналитическое мышление, способность решать задачи и применять знания на практике.',
      hint: 'Подумайте о том, что вы делаете, когда изучаете новый материал'
    }
  ]
}

/**
 * Проверяет, является ли контент fallback-ом
 */
export function isFallbackContent(content: string): boolean {
  return content.includes('Автоматическая генерация временно недоступна') ||
         content.includes('будет автоматически обновлён при следующем посещении')
}
