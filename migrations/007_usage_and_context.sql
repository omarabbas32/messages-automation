-- Migration 007: Add AI context limit and usage tracking fields
BEGIN;

-- Add ai_context_limit to pages table
ALTER TABLE pages ADD COLUMN IF NOT EXISTS ai_context_limit INT DEFAULT 5;

-- Ensure users table has usage tracking (should be there from 004, but just in case)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_messages_used INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_messages_reset_at TIMESTAMPTZ DEFAULT now();

COMMIT;
