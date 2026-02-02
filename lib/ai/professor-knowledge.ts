/**
 * База знаний профессора Остроуха А.В.
 * 
 * Система для хранения и поиска по публикациям профессора
 * Интегрируется с pgvector для семантического поиска
 */

import { storeDocuments, searchSimilar, chunkText, DocumentChunk } from '../embeddings'
import { SCIENTIFIC_ARTICLES } from './scientific-articles-rag'
import { PDF_ARTICLES } from './pdf-articles-rag'

export interface Publication {
  id: string
  title: string
  authors: string[]
  year: number
  type: 'monograph' | 'textbook' | 'article' | 'patent' | 'conference'
  language: 'ru' | 'en'
  isbn?: string
  doi?: string
  journal?: string
  publisher?: string
  abstract?: string
  content?: string // Полный текст
  keywords: string[]
  topics: string[] // Темы: АСУ, ИИ, транспорт и т.д.
}

// Метаданные публикаций профессора Остроуха
export const OSTROUKH_PUBLICATIONS: Publication[] = [
  // Новые публикации 2015-2018
  {
    id: 'ostroukh-2018-ml-agriculture',
    title: 'Методы машинного обучения в цифровом сельском хозяйстве: алгоритмы и кейсы',
    authors: ['Остроух А.В.'],
    year: 2018,
    type: 'article',
    language: 'ru',
    journal: 'International Journal of Advanced Studies',
    keywords: ['машинное обучение', 'сельское хозяйство', 'цифровизация', 'алгоритмы', 'нейронные сети'],
    topics: ['машинное обучение', 'сельское хозяйство', 'ИИ'],
    abstract: `Статья посвящена применению методов машинного обучения в цифровом сельском хозяйстве. 
Рассматриваются алгоритмы классификации почв, прогнозирования урожайности, детекции болезней растений. 
Приводятся практические кейсы использования нейронных сетей, метода k-ближайших соседей, 
деревьев решений и ансамблевых методов для решения задач точного земледелия.`,
    content: `
# Методы машинного обучения в цифровом сельском хозяйстве

## Введение
Цифровая трансформация сельского хозяйства требует применения современных методов анализа данных. 
Машинное обучение позволяет автоматизировать процессы принятия решений на основе больших объемов данных.

## Основные методы

### 1. Классификация почв
Для классификации типов почв используются:
- Метод k-ближайших соседей (k-NN)
- Наивный байесовский классификатор
- Деревья решений (J48)
- Метод опорных векторов (SVM)

### 2. Прогнозирование урожайности
Прогнозирование урожая основано на:
- Анализе временных рядов NDVI (Normalized Difference Vegetation Index)
- Регрессионных моделях
- Нейронных сетях
- Ансамблевых методах

### 3. Детекция болезней растений
Обработка изображений для выявления болезней:
- Сверточные нейронные сети (CNN)
- Алгоритмы сегментации изображений
- Классификация по признакам цвета и текстуры

## Практические кейсы

### Кейс 1: Прогноз урожайности пшеницы
Использование данных спутниковых снимков MODIS и алгоритмов машинного обучения 
позволило повысить точность прогноза урожайности на 15-20%.

### Кейс 2: Определение засоленности почв
Применение электромагнитной проводимости и методов классификации 
для картирования типов почв с точностью 85%.

## Заключение
Методы машинного обучения показывают высокую эффективность в задачах цифрового сельского хозяйства.
Дальнейшее развитие связано с интеграцией IoT-датчиков, дронов и систем точного земледелия.
`
  },
  {
    id: 'ostroukh-2015-passenger-flow',
    title: 'Разработка автоматизированной системы обследования пассажиропотоков',
    authors: ['Куфтинова Н.Г.', 'Остроух А.В.', 'Воробьева А.В.'],
    year: 2015,
    type: 'article',
    language: 'ru',
    journal: 'International Journal of Advanced Studies',
    keywords: ['пассажиропотоки', 'автоматизация', 'транспорт', 'АСУ', 'мониторинг'],
    topics: ['транспорт', 'автоматизация', 'АСУ'],
    abstract: `Статья посвящена разработке автоматизированной системы обследования пассажиропотоков 
в городском общественном транспорте. Система заменяет традиционные методы ручного подсчета пассажиров 
и позволяет в реальном времени отслеживать загрузку транспортных средств.`,
    content: `
# Автоматизированная система обследования пассажиропотоков

## Проблематика
Традиционные методы обследования пассажиропотоков:
- Требуют значительных трудозатрат
- Имеют низкую точность
- Не позволяют получать данные в реальном времени
- Сложны в масштабировании

## Архитектура системы

### Компоненты системы:
1. **Датчики подсчета пассажиров**
   - Инфракрасные датчики
   - Видеокамеры с алгоритмами компьютерного зрения
   - Весовые датчики

2. **Модуль сбора данных**
   - Бортовые контроллеры
   - Беспроводная передача данных (GSM/GPRS)
   - Буферизация данных

3. **Центральная система обработки**
   - База данных пассажиропотоков
   - Модуль аналитики
   - Веб-интерфейс для диспетчеров

## Алгоритмы обработки

### Подсчет пассажиров
- Детекция входа/выхода пассажиров
- Фильтрация ложных срабатываний
- Коррекция по данным продажи билетов

### Прогнозирование
- Анализ исторических данных
- Выявление паттернов загрузки
- Адаптивное планирование маршрутов

## Результаты внедрения
- Точность подсчета: 95-98%
- Снижение затрат на обследование: 70%
- Оптимизация расписания движения
- Повышение качества обслуживания пассажиров
`
  },
  {
    id: 'ostroukh-2015-3d-modeling',
    title: '3D-моделирование и технология анализа 3D объектов для различных интеллектуальных систем',
    authors: ['Остроух А.В.'],
    year: 2015,
    type: 'article',
    language: 'ru',
    journal: 'International Journal of Advanced Studies',
    keywords: ['3D моделирование', 'компьютерное зрение', 'интеллектуальные системы', 'CAD'],
    topics: ['3D моделирование', 'компьютерное зрение', 'ИИ'],
    abstract: `Анализ различных технологий трехмерного моделирования (3D) и их применение 
в интеллектуальных системах. Рассматриваются методы создания, обработки и анализа 3D объектов 
для систем компьютерного зрения, робототехники и автоматизированного проектирования.`,
    content: `
# 3D-моделирование для интеллектуальных систем

## Технологии 3D моделирования

### 1. Полигональное моделирование
- Представление объектов набором полигонов
- Используется в играх и визуализации
- Инструменты: Blender, 3ds Max, Maya

### 2. NURBS моделирование
- Математическое представление кривых и поверхностей
- Высокая точность для CAD систем
- Применение в промышленном дизайне

### 3. Воксельное моделирование
- Представление объема дискретными элементами
- Используется в медицинской визуализации
- Подходит для 3D печати

## Применение в интеллектуальных системах

### Компьютерное зрение
- Распознавание 3D объектов
- Оценка позы и ориентации
- Реконструкция сцены

### Робототехника
- Планирование траекторий
- Обход препятствий
- Манипуляция объектами

### Автоматизированное проектирование
- Параметрическое моделирование
- Генеративный дизайн
- Оптимизация конструкций

## Алгоритмы анализа 3D объектов

### Сегментация
- Выделение отдельных объектов
- Классификация частей
- Семантическая сегментация

### Распознавание
- Сопоставление с базой моделей
- Инвариантность к трансформациям
- Глубокое обучение для 3D данных

## Заключение
3D моделирование становится ключевой технологией для интеллектуальных систем,
обеспечивая понимание пространственной структуры окружающего мира.
`
  },
  {
    id: 'ostroukh-2015-business-process',
    title: 'Анализ программного обеспечения для моделирования бизнес-процессов',
    authors: ['Остроух А.В.'],
    year: 2015,
    type: 'article',
    language: 'ru',
    journal: 'International Journal of Advanced Studies',
    keywords: ['бизнес-процессы', 'моделирование', 'BPMN', 'автоматизация', 'AnyLogic'],
    topics: ['бизнес-процессы', 'моделирование', 'автоматизация'],
    abstract: `Анализ различных программных средств для моделирования бизнес-процессов. 
Рассматриваются AnyLogic, Business Studio, BizAgi Process Modeler и другие инструменты 
для проектирования и оптимизации бизнес-процессов предприятий.`,
    content: `
# Программное обеспечение для моделирования бизнес-процессов

## Обзор инструментов

### 1. AnyLogic
**Особенности:**
- Мультиметодное моделирование
- Агентное, дискретно-событийное, системная динамика
- Визуальная среда разработки
- Интеграция с базами данных

**Применение:**
- Моделирование производственных процессов
- Логистика и цепи поставок
- Социальные системы

### 2. Business Studio
**Особенности:**
- Нотация BPMN 2.0
- Управление процессами
- Организационное моделирование
- Интеграция с 1С

**Применение:**
- Описание бизнес-процессов
- Регламентация деятельности
- Оптимизация процессов

### 3. BizAgi Process Modeler
**Особенности:**
- Бесплатная версия
- Стандарт BPMN
- Простой интерфейс
- Экспорт в различные форматы

**Применение:**
- Быстрое прототипирование
- Документирование процессов
- Обучение BPMN

### 4. Система DEQSS (МАДИ)
**Особенности:**
- Разработка кафедры АСУ МАДИ
- Специализация на транспортных процессах
- Интеграция с АСУ предприятий
- Российская разработка

**Применение:**
- Моделирование транспортных систем
- Оптимизация логистики
- Диспетчеризация

## Сравнительный анализ

### Критерии выбора:
1. **Функциональность**
   - Поддержка стандартов (BPMN, UML)
   - Типы моделирования
   - Возможности симуляции

2. **Удобство использования**
   - Интерфейс
   - Кривая обучения
   - Документация

3. **Интеграция**
   - Базы данных
   - ERP системы
   - Экспорт/импорт

4. **Стоимость**
   - Лицензирование
   - Поддержка
   - Обновления

## Рекомендации по выбору

### Для малого бизнеса:
- BizAgi Process Modeler (бесплатно)
- Простота освоения
- Базовая функциональность

### Для среднего бизнеса:
- Business Studio
- Российская локализация
- Интеграция с 1С

### Для крупных предприятий:
- AnyLogic
- Комплексное моделирование
- Высокая точность симуляции

### Для транспортных компаний:
- DEQSS
- Специализированные модели
- Опыт внедрения в отрасли

## Заключение
Выбор инструмента моделирования зависит от специфики предприятия, 
масштаба задач и доступного бюджета. Важно учитывать не только 
функциональность, но и возможности интеграции с существующими системами.
`
  },
  // Существующие публикации
  {
    id: 'ostroukh-2013-ai-systems',
    title: 'Системы искусственного интеллекта в промышленности, робототехнике и транспортном комплексе',
    authors: ['Остроух А.В.'],
    year: 2013,
    type: 'monograph',
    language: 'ru',
    isbn: '978-5-906314-10-9',
    publisher: 'Научно-инновационный центр, Красноярск',
    keywords: ['искусственный интеллект', 'робототехника', 'транспорт', 'промышленность', 'автоматизация'],
    topics: ['ИИ', 'робототехника', 'транспорт', 'автоматизация'],
    abstract: `Монография посвящена системам искусственного интеллекта и их применению 
в промышленности, робототехнике и транспортном комплексе. Рассматриваются методы 
машинного обучения, экспертные системы, нейронные сети и их практическое применение 
для автоматизации производственных процессов.`
  },
  {
    id: 'ostroukh-2013-it-management',
    title: 'Информационные технологии в менеджменте и транспортной логистике',
    authors: ['Николаев А.Б.', 'Остроух А.В.'],
    year: 2013,
    type: 'textbook',
    language: 'ru',
    isbn: '978-0-615-67110-9',
    publisher: 'Publishing House Science and Innovation Center, Saint-Louis, MO, USA',
    keywords: ['информационные технологии', 'менеджмент', 'логистика', 'транспорт', 'ERP', 'SCM'],
    topics: ['ИТ', 'логистика', 'менеджмент', 'транспорт'],
    abstract: `Учебное пособие охватывает применение информационных технологий в управлении 
и транспортной логистике. Рассматриваются ERP-системы, системы управления цепями поставок (SCM), 
автоматизация логистических процессов и оптимизация транспортных потоков.`
  },
  {
    id: 'ostroukh-2013-mobile',
    title: 'Подготовка и переподготовка персонала предприятий промышленного и транспортного комплексов с применением мобильных технологий',
    authors: ['Исмоилов М.И.', 'Николаев А.Б.', 'Остроух А.В.'],
    year: 2013,
    type: 'monograph',
    language: 'ru',
    isbn: '978-0-615-67111-6',
    publisher: 'Publishing House Science and Innovation Center, Saint-Louis, MO, USA',
    keywords: ['мобильные технологии', 'обучение', 'персонал', 'промышленность', 'транспорт'],
    topics: ['обучение', 'мобильные технологии', 'промышленность'],
    abstract: `Монография посвящена применению мобильных технологий для обучения и 
переподготовки персонала на предприятиях промышленного и транспортного комплексов.`
  },
  {
    id: 'ostroukh-2014-it-basics',
    title: 'Основы информационных технологий',
    authors: ['Остроух А.В.'],
    year: 2014,
    type: 'textbook',
    language: 'ru',
    isbn: '978-5-4468-0588-4',
    publisher: 'Издательский центр «Академия», Москва',
    keywords: ['информационные технологии', 'основы', 'учебник', 'СПО'],
    topics: ['ИТ', 'основы', 'образование'],
    abstract: `Учебник для среднего профессионального образования. Охватывает базовые 
концепции информационных технологий, аппаратное и программное обеспечение, 
сети и базы данных.`
  },
  {
    id: 'ostroukh-2014-is-design',
    title: 'Методология структурного проектирования информационных систем',
    authors: ['Суркова Н.Е.', 'Остроух А.В.'],
    year: 2014,
    type: 'monograph',
    language: 'ru',
    isbn: '978-5-906314-16-1',
    publisher: 'Научно-инновационный центр, Красноярск',
    keywords: ['проектирование', 'информационные системы', 'IDEF', 'DFD', 'методология'],
    topics: ['проектирование ИС', 'методология', 'IDEF'],
    abstract: `Монография посвящена методологии структурного проектирования информационных систем. 
Рассматриваются методы IDEF0, IDEF1X, DFD, ERD и их применение при разработке АСУ.`
  },
  {
    id: 'ostroukh-2015-passenger',
    title: 'Automated Control System For Survey Passenger Traffics',
    authors: ['Kuftinova N.G.', 'Ostroukh A.V.', 'Vorobieva A.V.'],
    year: 2015,
    type: 'article',
    language: 'en',
    journal: 'International Journal of Applied Engineering Research',
    keywords: ['passenger traffic', 'automated control', 'survey', 'transport'],
    topics: ['транспорт', 'автоматизация', 'пассажиропоток'],
    abstract: `The article presents an automated control system for surveying passenger traffic flows.`
  },
  {
    id: 'ostroukh-2015-urban',
    title: 'Automated Supervisory Control System of Urban Passenger Transport',
    authors: ['Ostroukh A.V.', 'Surkova N.E.', 'Polgun M.B.', 'Vorobieva A.V.'],
    year: 2015,
    type: 'article',
    language: 'en',
    journal: 'ARPN Journal of Engineering and Applied Sciences',
    keywords: ['urban transport', 'SCADA', 'supervisory control', 'passenger transport'],
    topics: ['транспорт', 'SCADA', 'городской транспорт'],
    abstract: `Development of automated supervisory control system for urban passenger transport management.`
  },
  {
    id: 'ostroukh-2014-contactless',
    title: 'Development of Contactless Integrated Interface of Complex Production Lines',
    authors: ['Ostroukh A.', 'Nikonov V.', 'Ivanova I.', 'Morozova T.', 'Sumkin K.', 'Akimov D.'],
    year: 2014,
    type: 'article',
    language: 'en',
    journal: 'Journal of Artificial Intelligence (JAI)',
    doi: '10.3923/jai.2014.1.12',
    keywords: ['contactless interface', 'production lines', 'automation', 'HMI'],
    topics: ['автоматизация', 'производство', 'интерфейсы'],
    abstract: `Development of contactless integrated interface for complex production lines automation.`
  },
  {
    id: 'ostroukh-2012-food',
    title: 'Automation of Planning and Management of the Transportation of Production for Food Processing Industry Enterprises',
    authors: ['Ostroukh A.V.', 'Kuftinova N.G.'],
    year: 2012,
    type: 'article',
    language: 'en',
    journal: 'Automatic Control and Computer Sciences',
    doi: '10.3103/S0146411612010063',
    keywords: ['food industry', 'transportation', 'planning', 'automation'],
    topics: ['логистика', 'пищевая промышленность', 'автоматизация'],
    abstract: `Automation of planning and management systems for transportation in food processing industry.`
  },
  {
    id: 'ostroukh-2013-patent',
    title: 'Программное обеспечение для определения основных параметров передвижной поверочной установки нефтегазоводяных смесей',
    authors: ['Остроух А.В.'],
    year: 2013,
    type: 'patent',
    language: 'ru',
    keywords: ['патент', 'нефтегаз', 'поверка', 'программное обеспечение'],
    topics: ['нефтегаз', 'метрология', 'ПО'],
    abstract: `Свидетельство об официальной регистрации программы для ЭВМ №2013611210. 
Программное обеспечение для определения параметров поверочной установки.`
  }
]

/**
 * Поиск публикаций по теме
 */
export function findPublicationsByTopic(topic: string): Publication[] {
  const lowerTopic = topic.toLowerCase()
  return OSTROUKH_PUBLICATIONS.filter(pub => 
    pub.topics.some(t => t.toLowerCase().includes(lowerTopic)) ||
    pub.keywords.some(k => k.toLowerCase().includes(lowerTopic)) ||
    pub.title.toLowerCase().includes(lowerTopic)
  )
}

/**
 * Форматирование ссылки на публикацию
 */
export function formatCitation(pub: Publication): string {
  const authors = pub.authors.join(', ')
  const title = pub.title
  const year = pub.year
  
  if (pub.type === 'article' && pub.journal) {
    return `${authors}. ${title} // ${pub.journal}. ${year}.${pub.doi ? ` DOI: ${pub.doi}` : ''}`
  }
  
  if (pub.isbn) {
    return `${authors}. ${title}. – ${pub.publisher}, ${year}. – ISBN ${pub.isbn}.`
  }
  
  return `${authors}. ${title}. ${year}.`
}

/**
 * Индексация публикации в векторную базу
 */
export async function indexPublication(pub: Publication, fullText?: string): Promise<number> {
  const textToIndex = fullText || pub.abstract || ''
  
  if (!textToIndex || textToIndex.length < 50) {
    console.log(`[ProfessorKnowledge] Skipping ${pub.id} - no content`)
    return 0
  }
  
  const chunks = chunkText(textToIndex, { chunkSize: 500, overlapSentences: 2 })
  
  const documents: DocumentChunk[] = chunks.map((chunk, i) => ({
    content: chunk,
    metadata: {
      source: 'ostroukh',
      type: 'book' as const,
      topic: pub.topics[0],
      publicationId: pub.id,
      title: pub.title,
      authors: pub.authors.join(', '),
      year: pub.year,
      chunkIndex: i,
      citation: formatCitation(pub)
    }
  }))
  
  return storeDocuments(documents)
}

/**
 * Индексация всех публикаций (метаданные + абстракты)
 */
export async function indexAllPublications(): Promise<number> {
  let total = 0
  
  for (const pub of OSTROUKH_PUBLICATIONS) {
    const indexed = await indexPublication(pub)
    total += indexed
    console.log(`[ProfessorKnowledge] Indexed ${pub.id}: ${indexed} chunks`)
  }
  
  return total
}

/**
 * Индексация научных статей из открытого доступа + PDF статьи
 */
export async function indexScientificArticles(): Promise<number> {
  let total = 0
  
  // 1. Индексируем статьи из CyberLeninka
  for (const article of SCIENTIFIC_ARTICLES) {
    const textToIndex = article.fullText || article.abstract
    
    if (!textToIndex || textToIndex.length < 50) {
      console.log(`[ScientificArticles] Skipping ${article.id} - no content`)
      continue
    }
    
    const chunks = chunkText(textToIndex, { chunkSize: 500, overlapSentences: 2 })
    
    const documents: DocumentChunk[] = chunks.map((chunk, i) => ({
      content: chunk,
      metadata: {
        source: 'scientific_article',
        type: 'web' as const,
        topic: article.topics[0],
        articleId: article.id,
        title: article.title,
        authors: article.authors.join(', '),
        year: article.year,
        journal: article.journal,
        chunkIndex: i,
        url: article.url
      }
    }))
    
    const indexed = await storeDocuments(documents)
    total += indexed
    console.log(`[ScientificArticles] Indexed ${article.id}: ${indexed} chunks`)
  }
  
  // 2. Индексируем PDF статьи
  for (const article of PDF_ARTICLES) {
    const textToIndex = article.fullText || article.abstract
    
    if (!textToIndex || textToIndex.length < 50) {
      console.log(`[PDFArticles] Skipping ${article.id} - no content`)
      continue
    }
    
    const chunks = chunkText(textToIndex, { chunkSize: 500, overlapSentences: 2 })
    
    const documents: DocumentChunk[] = chunks.map((chunk, i) => ({
      content: chunk,
      metadata: {
        source: 'ostroukh',
        type: 'book' as const,
        topic: article.topics[0],
        articleId: article.id,
        title: article.title,
        authors: article.authors.join(', '),
        year: article.year,
        journal: article.journal,
        chunkIndex: i
      }
    }))
    
    const indexed = await storeDocuments(documents)
    total += indexed
    console.log(`[PDFArticles] Indexed ${article.id}: ${indexed} chunks`)
  }
  
  return total
}

/**
 * Поиск в базе знаний профессора с расширенным контекстом
 */
export async function searchProfessorKnowledge(
  query: string,
  options: { limit?: number; threshold?: number } = {}
): Promise<{
  results: DocumentChunk[]
  citations: string[]
  relatedTopics: string[]
}> {
  const { limit = 8, threshold = 0.25 } = options
  
  // Расширяем запрос ключевыми терминами профессора
  const expandedQuery = expandQueryWithProfessorTerms(query)
  
  // Ищем в векторной базе
  const results = await searchSimilar(expandedQuery, {
    limit: limit * 2, // Берём больше, потом фильтруем
    threshold
  })
  
  // Фильтруем только публикации Остроуха
  const professorResults = results.filter(r => 
    r.metadata?.source === 'ostroukh'
  ).slice(0, limit)
  
  // Собираем уникальные цитаты и темы
  const citationSet = new Set<string>()
  const topicSet = new Set<string>()
  
  professorResults.forEach(r => {
    const meta = r.metadata as Record<string, unknown>
    if (meta?.citation && typeof meta.citation === 'string') {
      citationSet.add(meta.citation)
    }
    if (meta?.topic && typeof meta.topic === 'string') {
      topicSet.add(meta.topic)
    }
  })
  
  return {
    results: professorResults,
    citations: Array.from(citationSet),
    relatedTopics: Array.from(topicSet)
  }
}

/**
 * Расширение запроса терминами из области экспертизы профессора
 */
function expandQueryWithProfessorTerms(query: string): string {
  const lowerQuery = query.toLowerCase()
  
  // Маппинг синонимов и связанных терминов
  const termExpansions: Record<string, string[]> = {
    'автоматизация': ['АСУ', 'SCADA', 'автоматизированные системы'],
    'ии': ['искусственный интеллект', 'машинное обучение', 'нейронные сети'],
    'ai': ['искусственный интеллект', 'машинное обучение'],
    'транспорт': ['логистика', 'пассажиропоток', 'городской транспорт'],
    'проектирование': ['IDEF', 'DFD', 'методология', 'информационные системы'],
    'erp': ['ERP-системы', 'управление предприятием', 'SCM'],
    'робот': ['робототехника', 'автоматизация производства'],
  }
  
  let expanded = query
  for (const [term, expansions] of Object.entries(termExpansions)) {
    if (lowerQuery.includes(term)) {
      expanded += ' ' + expansions.join(' ')
      break // Добавляем только одно расширение
    }
  }
  
  return expanded
}

/**
 * Получение контекста из базы знаний профессора для промпта
 * Возвращает структурированный контекст с цитатами и рекомендациями
 */
export async function getProfessorContext(topic: string): Promise<string> {
  const { results, citations, relatedTopics } = await searchProfessorKnowledge(topic, {
    limit: 6,
    threshold: 0.2
  })
  
  if (results.length === 0) {
    // Fallback: ищем по метаданным публикаций
    const relevantPubs = findPublicationsByTopic(topic)
    if (relevantPubs.length > 0) {
      const pubInfo = relevantPubs.slice(0, 3).map(p => 
        `- "${p.title}" (${p.year}): ${p.abstract || 'Нет описания'}`
      ).join('\n')
      
      return `[РЕЛЕВАНТНЫЕ ПУБЛИКАЦИИ ПРОФЕССОРА ОСТРОУХА]:
${pubInfo}

Используй эту информацию для формирования ответа в стиле профессора.`
    }
    return ''
  }
  
  // Группируем контент по публикациям
  const contentByPublication: Record<string, string[]> = {}
  results.forEach(doc => {
    const meta = doc.metadata as Record<string, unknown>
    const title = (meta?.title as string) || 'Неизвестная публикация'
    if (!contentByPublication[title]) {
      contentByPublication[title] = []
    }
    contentByPublication[title].push(doc.content)
  })
  
  // Формируем структурированный контекст
  let context = '[ИЗ ПУБЛИКАЦИЙ ПРОФЕССОРА ОСТРОУХА А.В.]:\n\n'
  
  for (const [title, contents] of Object.entries(contentByPublication)) {
    context += `📚 "${title}":\n`
    contents.forEach((content, i) => {
      context += `  ${i + 1}. ${content.slice(0, 300)}${content.length > 300 ? '...' : ''}\n`
    })
    context += '\n'
  }
  
  // Добавляем цитаты для ссылок
  if (citations.length > 0) {
    context += '\n[ИСТОЧНИКИ ДЛЯ ЦИТИРОВАНИЯ]:\n'
    citations.forEach((c, i) => {
      context += `${i + 1}. ${c}\n`
    })
  }
  
  // Добавляем связанные темы
  if (relatedTopics.length > 0) {
    context += `\n[СВЯЗАННЫЕ ТЕМЫ]: ${relatedTopics.join(', ')}`
  }
  
  context += '\n\nИспользуй эту информацию для ответа. При возможности ссылайся на конкретные публикации.'
  
  return context
}
