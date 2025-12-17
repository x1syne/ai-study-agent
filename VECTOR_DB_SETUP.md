# Настройка векторной базы данных (pgvector)

## Что это даёт?

Векторная БД позволяет:
- Сохранять найденную информацию для повторного использования
- Семантический поиск по похожести (не по ключевым словам)
- Накапливать базу знаний со временем
- Быстрее генерировать контент для повторяющихся тем

## Настройка в Supabase

### 1. Откройте SQL Editor в Supabase

Перейдите в ваш проект Supabase → SQL Editor

### 2. Выполните SQL скрипт

Скопируйте содержимое файла `prisma/migrations/add_vector_search.sql` и выполните его.

Или выполните по частям:

```sql
-- Включить расширение vector
CREATE EXTENSION IF NOT EXISTS vector;

-- Создать таблицу для документов
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(384),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создать индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### 3. Создайте функцию поиска

```sql
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  filter_topic text DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 
    1 - (d.embedding <=> query_embedding) > match_threshold
    AND (filter_topic IS NULL OR d.metadata->>'topic' = filter_topic)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 4. (Опционально) Добавьте HuggingFace API ключ

Для лучшего качества эмбеддингов:

1. Зарегистрируйтесь на https://huggingface.co
2. Получите API ключ: https://huggingface.co/settings/tokens
3. Добавьте в `.env`:
   ```
   HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
   ```

Без ключа система использует fallback эмбеддинги (работает, но менее точно).

## Как это работает

1. При генерации урока агент ищет информацию в интернете (RAG)
2. Найденная информация сохраняется в векторную БД
3. При следующем запросе на похожую тему - сначала ищем в БД
4. Если нашли релевантный контент - используем его
5. Если нет - ищем в интернете и сохраняем

## Проверка работы

После настройки проверьте в Supabase:

```sql
-- Проверить что таблица создана
SELECT * FROM documents LIMIT 5;

-- Проверить количество документов
SELECT COUNT(*) FROM documents;

-- Проверить по темам
SELECT metadata->>'topic' as topic, COUNT(*) 
FROM documents 
GROUP BY metadata->>'topic';
```

## Очистка старых данных

```sql
-- Удалить документы старше 30 дней
DELETE FROM documents 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Удалить документы по теме
SELECT delete_documents_by_topic('название_темы');
```
