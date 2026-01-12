-- ==================== ПОЛНАЯ НАСТРОЙКА БД ДЛЯ AI-STUDY-AGENT ====================
-- 
-- ПОРЯДОК ВЫПОЛНЕНИЯ:
-- 1. Сначала: npx prisma db push (создаст основные таблицы приложения)
-- 2. Потом: этот SQL файл (добавит RAG таблицы и функции)
--
-- ИСПОЛЬЗУЕМЫЕ ТАБЛИЦЫ:
-- - documents (RAG векторный поиск)
-- - rag_cache (кэширование RAG запросов)
--
-- ИСПОЛЬЗУЕМЫЕ ФУНКЦИИ:
-- - match_documents (векторный поиск)
-- - search_documents_keyword (полнотекстовый поиск)
-- - hybrid_search (гибридный поиск)
-- - cleanup_expired_cache (очистка кэша)
--
-- ==================== РАСШИРЕНИЯ ====================

-- pgvector для векторного поиска (ОБЯЗАТЕЛЬНО)
CREATE EXTENSION IF NOT EXISTS vector;

-- UUID генерация
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== RAG: ТАБЛИЦА ДОКУМЕНТОВ ====================

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(384),
  content_hash TEXT,
  fts tsvector,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для векторного поиска
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON documents USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Уникальный индекс для дедупликации
CREATE UNIQUE INDEX IF NOT EXISTS documents_content_hash_idx 
ON documents (content_hash) 
WHERE content_hash IS NOT NULL;

-- GIN индекс для полнотекстового поиска
CREATE INDEX IF NOT EXISTS documents_fts_idx 
ON documents USING gin(fts);

-- ==================== RAG: КЭШИРОВАНИЕ ====================

CREATE TABLE IF NOT EXISTS rag_cache (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rag_cache_expires_idx 
ON rag_cache (expires_at);

-- ==================== ТРИГГЕРЫ ====================

-- Триггер для автоматического обновления fts
CREATE OR REPLACE FUNCTION documents_fts_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.fts := 
    setweight(to_tsvector('russian', coalesce(NEW.content, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_fts_update ON documents;
CREATE TRIGGER documents_fts_update
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION documents_fts_trigger();

-- ==================== ФУНКЦИИ ПОИСКА ====================

-- Базовый векторный поиск (используется в lib/embeddings.ts)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.3,
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
  WHERE (filter_topic IS NULL OR d.metadata->>'topic' = filter_topic)
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Полнотекстовый поиск (используется в lib/rag/hybrid-search.ts)
CREATE OR REPLACE FUNCTION search_documents_keyword(
  search_query text,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  rank float
)
LANGUAGE plpgsql
AS $$
DECLARE
  tsquery_ru tsquery;
  tsquery_en tsquery;
BEGIN
  tsquery_ru := plainto_tsquery('russian', search_query);
  tsquery_en := plainto_tsquery('english', search_query);
  
  RETURN QUERY
  SELECT
    d.id,
    d.content,
    d.metadata,
    ts_rank_cd(d.fts, tsquery_ru) + ts_rank_cd(d.fts, tsquery_en) AS rank
  FROM documents d
  WHERE d.fts @@ tsquery_ru OR d.fts @@ tsquery_en
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- Гибридный поиск (используется в lib/rag/hybrid-search.ts)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text text,
  query_embedding vector(384),
  match_count int DEFAULT 10,
  vector_weight float DEFAULT 0.7,
  keyword_weight float DEFAULT 0.3,
  match_threshold float DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  score float,
  vector_score float,
  keyword_score float
)
LANGUAGE plpgsql
AS $$
DECLARE
  tsquery_ru tsquery;
  tsquery_en tsquery;
BEGIN
  tsquery_ru := plainto_tsquery('russian', query_text);
  tsquery_en := plainto_tsquery('english', query_text);
  
  RETURN QUERY
  WITH vector_results AS (
    SELECT 
      d.id,
      d.content,
      d.metadata,
      1 - (d.embedding <=> query_embedding) AS v_score
    FROM documents d
    WHERE d.embedding IS NOT NULL
      AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_results AS (
    SELECT 
      d.id,
      d.content,
      d.metadata,
      GREATEST(
        ts_rank_cd(d.fts, tsquery_ru),
        ts_rank_cd(d.fts, tsquery_en)
      ) AS k_score
    FROM documents d
    WHERE d.fts @@ tsquery_ru OR d.fts @@ tsquery_en
    ORDER BY k_score DESC
    LIMIT match_count * 2
  ),
  combined AS (
    SELECT 
      COALESCE(v.id, k.id) AS id,
      COALESCE(v.content, k.content) AS content,
      COALESCE(v.metadata, k.metadata) AS metadata,
      COALESCE(v.v_score, 0) AS v_score,
      COALESCE(k.k_score, 0) AS k_score
    FROM vector_results v
    FULL OUTER JOIN keyword_results k ON v.id = k.id
  )
  SELECT 
    c.id,
    c.content,
    c.metadata,
    (c.v_score * vector_weight + c.k_score * keyword_weight) AS score,
    c.v_score AS vector_score,
    c.k_score AS keyword_score
  FROM combined c
  WHERE c.v_score > 0 OR c.k_score > 0
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;

-- Очистка устаревшего кэша
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count int;
BEGIN
  DELETE FROM rag_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ==================== ОБНОВЛЕНИЕ СУЩЕСТВУЮЩИХ ДАННЫХ ====================

-- Обновляем fts для существующих документов (если есть)
UPDATE documents 
SET fts = 
  setweight(to_tsvector('russian', coalesce(content, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(content, '')), 'B')
WHERE fts IS NULL;

-- ==================== ГОТОВО ====================
-- 
-- ПРОВЕРКА УСТАНОВКИ:
-- 
-- 1. Проверить расширение vector:
--    SELECT * FROM pg_extension WHERE extname = 'vector';
--
-- 2. Проверить таблицу documents:
--    SELECT COUNT(*) FROM documents;
--
-- 3. Проверить таблицу rag_cache:
--    SELECT COUNT(*) FROM rag_cache;
--
-- 4. Проверить функции:
--    SELECT proname FROM pg_proc WHERE proname IN ('match_documents', 'search_documents_keyword', 'hybrid_search');
--
-- Теперь БД полностью настроена для работы приложения!
