-- Migration 012: Per-page comment-to-DM support
-- Adds: per-page enable flag, rule scope + optional public reply, comment dedup table

BEGIN;

-- Per-page opt-in (OFF by default; user toggles each page from the dashboard)
ALTER TABLE pages
  ADD COLUMN IF NOT EXISTS comments_enabled BOOLEAN DEFAULT false;

-- Rule scope: which surface this rule applies to
ALTER TABLE rules
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT 'message'
    CHECK (scope IN ('message', 'comment', 'both'));

-- Optional short text to post publicly under the comment (NULL = DM only)
ALTER TABLE rules
  ADD COLUMN IF NOT EXISTS public_reply TEXT;

-- Dedup table: one row per comment we've already responded to
CREATE TABLE IF NOT EXISTS replied_comments (
  page_id    TEXT NOT NULL,
  comment_id TEXT NOT NULL,
  replied_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (page_id, comment_id)
);

COMMIT;
