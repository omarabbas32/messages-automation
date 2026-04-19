-- Migration 005: Add OpenAI API key to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS openai_api_key TEXT;
