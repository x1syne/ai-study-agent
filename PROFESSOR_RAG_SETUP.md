# База знаний профессора Остроуха - Инструкция по индексации

## Что добавлено в систему

### 1. Метаданные публикаций (14 шт.)
- 10 базовых публикаций (монографии, учебники, статьи)
- 4 новые публикации 2015-2018 гг. с полным контентом

### 2. Научные статьи из CyberLeninka (3 шт.)
Полные тексты статей из открытого доступа:
- "Основы обеспечения эффективного функционирования информационных подсистем АСУ" (2017)
- "Развитие технологий искусственного интеллекта в онкологии и лучевой диагностике" (2018)
- "Системный подход к организации управления информационными подсистемами АСУ" (2017)

### 3. PDF статьи профессора (9 шт.)
Извлечённый текст из PDF файлов:
1. Анализ возможностей миварного подхода для систем ИИ и робототехники
2. Information and Educational System (химические предприятия)
3. Исследование комплексных подходов к цифровизации транспортных систем
4. Кремниевые фотоэлектронные умножители
5. Навигационная система диспетчерского контроля транспорта
6. Принципы организации динамических интерфейсов доступа к данным
7. Проблемы и перспективы внедрения CALS-технологий
8. Разработка электронных образовательных ресурсов (материаловедение)
9. Виртуальные тренажерные комплексы

**Общая статистика PDF:**
- Символов: ~251,472
- Страниц: 85
- Средний размер: ~27,941 символов на статью

## Файлы системы

```
lib/ai/
├── professor-knowledge.ts          # Основная логика RAG
├── professor-content-extended.ts   # Расширенный контент (главы книг)
├── scientific-articles-rag.ts      # 3 статьи из CyberLeninka
└── pdf-articles-rag.ts            # 9 PDF статей (автогенерация)

app/api/professor/knowledge/
└── route.ts                        # API для индексации и поиска

scripts/
├── process-pdf-articles.js         # Скрипт обработки PDF
└── process-remaining-pdfs.js       # Скрипт для проблемных PDF
```

## Как запустить индексацию

### Вариант 1: Через API (рекомендуется)

```bash
# Запустите dev сервер
npm run dev

# В другом терминале выполните индексацию
curl -X PUT http://localhost:3000/api/professor/knowledge
```

Ответ будет содержать:
```json
{
  "success": true,
  "message": "Проиндексировано: X базовых + Y научных статей + Z расширенных чанков",
  "basicIndexed": 14,
  "articlesIndexed": 12,
  "extendedIndexed": N,
  "totalPublications": 14,
  "totalChapters": M
}
```

### Вариант 2: Через TypeScript скрипт

Создайте файл `scripts/index-professor-knowledge.ts`:

```typescript
import { indexAllPublications, indexScientificArticles } from '../lib/ai/professor-knowledge'
import { getAllContentForIndexing } from '../lib/ai/professor-content'
import { storeDocuments, chunkText } from '../lib/embeddings'

async function main() {
  console.log('🔍 Начинаю индексацию базы знаний профессора Остроуха...\n')
  
  // 1. Базовые публикации
  const basic = await indexAllPublications()
  console.log(`✅ Базовые публикации: ${basic} чанков`)
  
  // 2. Научные статьи + PDF
  const articles = await indexScientificArticles()
  console.log(`✅ Научные статьи: ${articles} чанков`)
  
  // 3. Расширенный контент
  const extended = getAllContentForIndexing()
  let extTotal = 0
  for (const item of extended) {
    const chunks = chunkText(item.content, { chunkSize: 400 })
    const docs = chunks.map((chunk, i) => ({
      content: chunk,
      metadata: {
        source: 'ostroukh',
        type: 'book' as const,
        topic: item.keywords[0],
        title: item.title,
        chunkIndex: i
      }
    }))
    extTotal += await storeDocuments(docs)
  }
  console.log(`✅ Расширенный контент: ${extTotal} чанков`)
  
  console.log(`\n🎉 Всего проиндексировано: ${basic + articles + extTotal} чанков`)
}

main().catch(console.error)
```

Запустите:
```bash
npx tsx scripts/index-professor-knowledge.ts
```

## Проверка работы

### 1. Поиск через API

```bash
# Поиск по теме
curl "http://localhost:3000/api/professor/knowledge?q=автоматизация&limit=5"

# Получение контекста для промпта
curl "http://localhost:3000/api/professor/knowledge?q=искусственный+интеллект&format=context"
```

### 2. Использование в чате

Выберите персонажа "Профессор Остроух" в чате. Система автоматически:
1. Получит запрос пользователя
2. Найдёт релевантные фрагменты из базы знаний
3. Добавит их в контекст промпта
4. Сгенерирует ответ с цитированием источников

### 3. Проверка в коде

```typescript
import { searchProfessorKnowledge, getProfessorContext } from '@/lib/ai/professor-knowledge'

// Поиск
const { results, citations, relatedTopics } = await searchProfessorKnowledge('транспорт', { limit: 5 })

// Контекст для промпта
const context = await getProfessorContext('автоматизация АСУ')
```

## Требования к системе

### База данных
- PostgreSQL с расширением `pgvector`
- Таблица `documents` с колонкой `embedding vector(1536)`

### Переменные окружения (.env)
```env
# OpenAI для генерации embeddings
OPENAI_API_KEY=your_key_here

# PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

### Зависимости
```json
{
  "pdf2json": "^3.1.3",
  "@supabase/supabase-js": "^2.x",
  "openai": "^4.x"
}
```

## Обработка новых PDF

Если нужно добавить новые PDF статьи:

1. Поместите PDF в папку `остроух/`
2. Добавьте метаданные в `scripts/process-pdf-articles.js`
3. Запустите обработку:
```bash
node scripts/process-pdf-articles.js
```
4. Файл `lib/ai/pdf-articles-rag.ts` будет обновлён автоматически
5. Запустите индексацию через API

## Структура данных в векторной БД

Каждый чанк хранится с метаданными:

```typescript
{
  content: string,              // Текст фрагмента
  embedding: number[],          // Вектор 1536 размерности
  metadata: {
    source: 'ostroukh' | 'scientific_article',
    type: 'book' | 'web',
    topic: string,              // Основная тема
    title: string,              // Название публикации
    authors: string,            // Авторы
    year: number,               // Год публикации
    chunkIndex: number,         // Номер чанка
    citation?: string,          // Форматированная цитата
    url?: string                // URL источника
  }
}
```

## Troubleshooting

### Ошибка: "URI malformed" при обработке PDF
Используйте `scripts/process-remaining-pdfs.js` с безопасным декодированием

### Ошибка: "Type error" при сборке
Проверьте, что файл `pdf-articles-rag.ts` заканчивается на `]`

### Низкое качество поиска
- Увеличьте `limit` в запросе
- Уменьшите `threshold` (по умолчанию 0.25)
- Проверьте, что embeddings сгенерированы корректно

### Медленный поиск
- Добавьте индекс на колонку `embedding` в PostgreSQL:
```sql
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops);
```

## Дальнейшее развитие

- [ ] Добавить больше публикаций профессора
- [ ] Интегрировать с Google Scholar для автоматического поиска новых статей
- [ ] Добавить фильтрацию по годам и темам
- [ ] Реализовать гибридный поиск (векторный + полнотекстовый)
- [ ] Добавить кэширование частых запросов
