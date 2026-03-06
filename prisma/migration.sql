-- ============================================
-- AI-Study-Agent: полная миграция (идемпотентная)
-- Безопасно вставить в Supabase SQL Editor
-- ============================================

-- ==================== РАСШИРЕНИЯ ====================
CREATE EXTENSION IF NOT EXISTS vector;

-- ==================== ENUM ТИПЫ ====================
-- PostgreSQL не поддерживает CREATE TYPE IF NOT EXISTS,
-- поэтому используем DO-блоки

DO $$ BEGIN CREATE TYPE "LearningStyle" AS ENUM ('THEORY_FIRST', 'PRACTICE_FIRST', 'BALANCED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Domain" AS ENUM ('PHYSICS', 'MATHEMATICS', 'PROGRAMMING', 'CHEMISTRY', 'BIOLOGY', 'HISTORY', 'LANGUAGES', 'ECONOMICS', 'ARTS', 'MEDICINE', 'LAW', 'ENGINEERING', 'GENERAL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD', 'EXPERT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TopicStatus" AS ENUM ('LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'MASTERED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LessonType" AS ENUM ('THEORY', 'PRACTICE', 'QUIZ', 'CODING', 'FILL_BLANK'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DetailLevel" AS ENUM ('BRIEF', 'BALANCED', 'DETAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExplanationStyle" AS ENUM ('THEORETICAL', 'PRACTICAL', 'MIXED', 'EXAMPLES_FIRST'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AchievementType" AS ENUM ('FIRST_LESSON', 'FIRST_TOPIC', 'FIRST_GOAL', 'STREAK_3', 'STREAK_7', 'STREAK_30', 'STREAK_100', 'TASKS_10', 'TASKS_50', 'TASKS_100', 'CARDS_10', 'CARDS_50', 'CARDS_100', 'PERFECT_QUIZ', 'SPEED_LEARNER', 'NIGHT_OWL', 'EARLY_BIRD', 'XP_100', 'XP_500', 'XP_1000', 'XP_5000', 'LEVEL_5', 'LEVEL_10', 'DAILY_CHALLENGE_7'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==================== ТАБЛИЦЫ ====================

CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "name" TEXT,
    "country" TEXT,
    "avatar" TEXT,
    "googleId" TEXT,
    "telegramId" TEXT,
    "preferredStyle" "LearningStyle" NOT NULL DEFAULT 'BALANCED',
    "dailyGoalMinutes" INTEGER NOT NULL DEFAULT 30,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Moscow',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalLessons" INTEGER NOT NULL DEFAULT 0,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "dailyChallengeCompleted" BOOLEAN NOT NULL DEFAULT false,
    "dailyChallengeDate" TIMESTAMP(3),
    "lastActiveDate" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserStats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "domain" "Domain" NOT NULL DEFAULT 'GENERAL',
    "roadmap" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Module" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '📚',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Topic" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "positionX" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "positionY" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 30,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "order" INTEGER NOT NULL DEFAULT 0,
    "prerequisiteIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TopicProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "status" "TopicStatus" NOT NULL DEFAULT 'LOCKED',
    "masteryLevel" INTEGER NOT NULL DEFAULT 0,
    "diagnosisScore" INTEGER,
    "diagnosisDate" TIMESTAMP(3),
    "theoryCompleted" BOOLEAN NOT NULL DEFAULT false,
    "practiceScore" INTEGER,
    "timeSpentMinutes" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopicProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Lesson" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "LessonType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "content" JSONB NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "solution" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TaskSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ReviewCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "front" TEXT NOT NULL,
    "back" TEXT NOT NULL,
    "topicSlug" TEXT NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReviewDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReviewCard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ConversationSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "summaryUpdatedAt" TIMESTAMP(3),
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ConversationSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "topicSlug" TEXT,
    "characterId" TEXT NOT NULL DEFAULT 'default',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "detailLevel" "DetailLevel" NOT NULL DEFAULT 'BALANCED',
    "explanationStyle" "ExplanationStyle" NOT NULL DEFAULT 'MIXED',
    "favoriteTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avoidTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customInstructions" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Achievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AchievementType" NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SkillTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "topicsTemplate" JSONB NOT NULL,
    "diagnosisQuestions" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SkillTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserFile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "embedding" vector(384),
    "content_hash" TEXT,
    "fts" tsvector,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "rag_cache" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rag_cache_pkey" PRIMARY KEY ("key")
);

CREATE TABLE IF NOT EXISTS "Professor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Professor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Schedule" (
    "id" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dayOfWeek" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ScheduleLesson" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "building" TEXT,
    "group" TEXT,
    "subgroup" TEXT,
    "periodicity" TEXT,
    "onlineLink" TEXT,
    "notes" TEXT,
    "isDistanceLearning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScheduleLesson_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Exam" (
    "id" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "building" TEXT,
    "group" TEXT,
    "isDistanceLearning" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- ==================== ДОБАВЛЕНИЕ КОЛОНОК (если не существуют) ====================

DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "username" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "firstName" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "lastName" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "User" ADD COLUMN "country" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ==================== UNIQUE ИНДЕКСЫ ====================

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX IF NOT EXISTS "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_telegramId_key" ON "User"("telegramId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserStats_userId_key" ON "UserStats"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Module_goalId_order_key" ON "Module"("goalId", "order");
CREATE UNIQUE INDEX IF NOT EXISTS "Topic_moduleId_slug_key" ON "Topic"("moduleId", "slug");
CREATE UNIQUE INDEX IF NOT EXISTS "TopicProgress_userId_topicId_key" ON "TopicProgress"("userId", "topicId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserPreferences_userId_key" ON "UserPreferences"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Achievement_userId_type_key" ON "Achievement"("userId", "type");
CREATE UNIQUE INDEX IF NOT EXISTS "SkillTemplate_slug_key" ON "SkillTemplate"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "UserFile_userId_filename_key" ON "UserFile"("userId", "filename");
CREATE UNIQUE INDEX IF NOT EXISTS "Professor_name_key" ON "Professor"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Schedule_professorId_date_key" ON "Schedule"("professorId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "documents_content_hash_idx" ON "documents"("content_hash") WHERE "content_hash" IS NOT NULL;

-- ==================== ОБЫЧНЫЕ ИНДЕКСЫ ====================

CREATE INDEX IF NOT EXISTS "ConversationSession_userId_characterId_idx" ON "ConversationSession"("userId", "characterId");
CREATE INDEX IF NOT EXISTS "ConversationSession_userId_lastMessageAt_idx" ON "ConversationSession"("userId", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_userId_characterId_idx" ON "ChatMessage"("userId", "characterId");
CREATE INDEX IF NOT EXISTS "UserFile_userId_idx" ON "UserFile"("userId");
CREATE INDEX IF NOT EXISTS "rag_cache_expires_at_idx" ON "rag_cache"("expires_at");
CREATE INDEX IF NOT EXISTS "Schedule_professorId_date_idx" ON "Schedule"("professorId", "date");
CREATE INDEX IF NOT EXISTS "ScheduleLesson_scheduleId_idx" ON "ScheduleLesson"("scheduleId");
CREATE INDEX IF NOT EXISTS "Exam_professorId_date_idx" ON "Exam"("professorId", "date");
CREATE INDEX IF NOT EXISTS "documents_fts_idx" ON "documents" USING gin("fts");

-- ivfflat индекс для vector search (требует минимум 100 строк для lists=100, ставим lists=1 для старта)
-- CREATE INDEX IF NOT EXISTS "documents_embedding_idx" ON "documents" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- ==================== FOREIGN KEYS (безопасно) ====================

DO $$ BEGIN ALTER TABLE "UserStats" ADD CONSTRAINT "UserStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Module" ADD CONSTRAINT "Module_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Topic" ADD CONSTRAINT "Topic_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TopicProgress" ADD CONSTRAINT "TopicProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TopicProgress" ADD CONSTRAINT "TopicProgress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ReviewCard" ADD CONSTRAINT "ReviewCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ConversationSession" ADD CONSTRAINT "ConversationSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ConversationSession"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "UserFile" ADD CONSTRAINT "UserFile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ScheduleLesson" ADD CONSTRAINT "ScheduleLesson_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Exam" ADD CONSTRAINT "Exam_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ==================== RAG ФУНКЦИИ ====================

-- Триггер для fts
CREATE OR REPLACE FUNCTION documents_fts_trigger() RETURNS trigger AS $$
BEGIN
  NEW.fts := setweight(to_tsvector('russian', coalesce(NEW.content, '')), 'A') ||
             setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_fts_update ON documents;
CREATE TRIGGER documents_fts_update BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION documents_fts_trigger();

-- Векторный поиск
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(384),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5,
  filter_topic text DEFAULT NULL
) RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity float)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT d.id, d.content, d.metadata, 1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE (filter_topic IS NULL OR d.metadata->>'topic' = filter_topic)
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Полнотекстовый поиск
CREATE OR REPLACE FUNCTION search_documents_keyword(
  search_query text,
  match_count int DEFAULT 10
) RETURNS TABLE (id UUID, content TEXT, metadata JSONB, rank float)
LANGUAGE plpgsql AS $$
DECLARE
  tsquery_ru tsquery;
  tsquery_en tsquery;
BEGIN
  tsquery_ru := plainto_tsquery('russian', search_query);
  tsquery_en := plainto_tsquery('english', search_query);
  RETURN QUERY
  SELECT d.id, d.content, d.metadata,
         ts_rank_cd(d.fts, tsquery_ru) + ts_rank_cd(d.fts, tsquery_en) AS rank
  FROM documents d
  WHERE d.fts @@ tsquery_ru OR d.fts @@ tsquery_en
  ORDER BY rank DESC
  LIMIT match_count;
END;
$$;

-- Гибридный поиск
CREATE OR REPLACE FUNCTION hybrid_search(
  query_text text,
  query_embedding vector(384),
  match_count int DEFAULT 10,
  vector_weight float DEFAULT 0.7,
  keyword_weight float DEFAULT 0.3,
  match_threshold float DEFAULT 0.3
) RETURNS TABLE (id UUID, content TEXT, metadata JSONB, score float, vector_score float, keyword_score float)
LANGUAGE plpgsql AS $$
DECLARE
  tsquery_ru tsquery;
  tsquery_en tsquery;
BEGIN
  tsquery_ru := plainto_tsquery('russian', query_text);
  tsquery_en := plainto_tsquery('english', query_text);
  RETURN QUERY
  WITH vector_results AS (
    SELECT d.id, d.content, d.metadata, 1 - (d.embedding <=> query_embedding) AS v_score
    FROM documents d
    WHERE d.embedding IS NOT NULL AND 1 - (d.embedding <=> query_embedding) > match_threshold
    ORDER BY d.embedding <=> query_embedding LIMIT match_count * 2
  ),
  keyword_results AS (
    SELECT d.id, d.content, d.metadata,
           GREATEST(ts_rank_cd(d.fts, tsquery_ru), ts_rank_cd(d.fts, tsquery_en)) AS k_score
    FROM documents d
    WHERE d.fts @@ tsquery_ru OR d.fts @@ tsquery_en
    ORDER BY k_score DESC LIMIT match_count * 2
  ),
  combined AS (
    SELECT COALESCE(v.id, k.id) AS id, COALESCE(v.content, k.content) AS content,
           COALESCE(v.metadata, k.metadata) AS metadata,
           COALESCE(v.v_score, 0) AS v_score, COALESCE(k.k_score, 0) AS k_score
    FROM vector_results v FULL OUTER JOIN keyword_results k ON v.id = k.id
  )
  SELECT c.id, c.content, c.metadata,
         (c.v_score * vector_weight + c.k_score * keyword_weight) AS score,
         c.v_score AS vector_score, c.k_score AS keyword_score
  FROM combined c WHERE c.v_score > 0 OR c.k_score > 0
  ORDER BY score DESC LIMIT match_count;
END;
$$;

-- Очистка кэша
CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS int
LANGUAGE plpgsql AS $$
DECLARE deleted_count int;
BEGIN
  DELETE FROM rag_cache WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Обновить fts для существующих документов
UPDATE documents SET fts = setweight(to_tsvector('russian', coalesce(content, '')), 'A') ||
                           setweight(to_tsvector('english', coalesce(content, '')), 'B')
WHERE fts IS NULL;
