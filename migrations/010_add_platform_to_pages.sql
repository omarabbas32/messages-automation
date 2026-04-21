-- Migration 010: Add platform support to pages
-- This allows us to handle Instagram Business accounts in the same table as Facebook Pages

BEGIN;

-- 1. Add platform column
-- Default to 'facebook' for all existing data
ALTER TABLE pages ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'facebook' CHECK (platform IN ('facebook', 'instagram'));

-- 2. Add instagram_user_id for reference (optional but helpful for mapping)
-- Note: we will typically store the active messaging ID in the existing 'page_id' column
ALTER TABLE pages ADD COLUMN IF NOT EXISTS ig_user_id TEXT;

-- 3. Update the conflict resolution or indexes if necessary
-- Currently page_id is unique, which is fine since FB Page IDs and IG User IDs are unique globally.

COMMIT;
