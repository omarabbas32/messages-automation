-- Migration 004: Full PostgreSQL schema for multi-tenant SaaS
-- Replaces MongoDB for pages, rules, conversations, and users

BEGIN;

-- ===========================
-- 1. Extend existing pages table
-- ===========================
-- Note: id, page_id, page_name, page_token, embedding, created_at, owner_id already exist from previous migrations
-- We add missing AI and Knowledge fields
ALTER TABLE pages ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS ai_instructions TEXT DEFAULT 'أنت مساعد خدمة عملاء محترف. قم بالرد على الرسائل بشكل مهذب ومفيد.';
ALTER TABLE pages ADD COLUMN IF NOT EXISTS knowledge_base TEXT DEFAULT '';

-- owner_id check (in case 003 didn't run or we want to be sure)
ALTER TABLE pages ADD COLUMN IF NOT EXISTS owner_id TEXT;
CREATE INDEX IF NOT EXISTS idx_pages_owner_id ON pages(owner_id);

-- ===========================
-- 2. Users table
-- ===========================
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  clerk_id    TEXT UNIQUE NOT NULL,
  email       TEXT NOT NULL,
  plan        TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
  stripe_customer_id       TEXT,
  stripe_subscription_id   TEXT,
  ai_messages_used         INT DEFAULT 0,
  ai_messages_reset_at     TIMESTAMPTZ DEFAULT now(),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- ===========================
-- 3. Rules table
-- ===========================
CREATE TABLE IF NOT EXISTS rules (
  id         SERIAL PRIMARY KEY,
  owner_id   TEXT NOT NULL,
  page_id    TEXT NOT NULL REFERENCES pages(page_id) ON DELETE CASCADE,
  keyword    TEXT NOT NULL,
  reply      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rules_page_id  ON rules(page_id);
CREATE INDEX IF NOT EXISTS idx_rules_owner_id ON rules(owner_id);

-- ===========================
-- 4. Conversations table (one row per message)
-- ===========================
CREATE TABLE IF NOT EXISTS conversations (
  id         SERIAL PRIMARY KEY,
  page_id    TEXT NOT NULL,
  sender_id  TEXT NOT NULL,
  role       TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_lookup
  ON conversations(page_id, sender_id, created_at DESC);

COMMIT;
