-- Migration: Add owner_id to pages table for multi-tenancy
ALTER TABLE pages ADD COLUMN IF NOT EXISTS owner_id TEXT;
CREATE INDEX IF NOT EXISTS idx_pages_owner_id ON pages(owner_id);

-- Optional: If you already have data, you might want to set a default owner_id
-- UPDATE pages SET owner_id = 'your_initial_clerk_id' WHERE owner_id IS NULL;
