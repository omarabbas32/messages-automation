-- Migration 009: Add token usage tracking to users table
BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_tokens_used BIGINT DEFAULT 0;

-- Optional: add a comment to clarify usage
COMMENT ON COLUMN users.ai_tokens_used IS 'Total OpenAI tokens consumed by the user across all requests';

COMMIT;
