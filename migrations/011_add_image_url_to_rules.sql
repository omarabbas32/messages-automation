-- Migration 011: Add image_url to rules
-- To support image replies for keywords

BEGIN;

ALTER TABLE rules ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMIT;
