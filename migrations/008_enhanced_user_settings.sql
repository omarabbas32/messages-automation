-- Migration 008: Enhanced user settings for AI and Profile
BEGIN;

-- Profile settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Global AI Defaults
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_default_model TEXT DEFAULT 'gpt-4o-mini';
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_default_temperature FLOAT DEFAULT 0.7;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_default_max_tokens INT DEFAULT 250;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_global_instructions TEXT DEFAULT '';

COMMIT;
