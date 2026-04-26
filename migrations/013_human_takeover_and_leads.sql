-- Migration 013: Human takeover (conversation pauses) + leads capture
-- Auto-applied by database.js initDatabase(); kept here for fresh DBs and manual deploys.

BEGIN;

CREATE TABLE IF NOT EXISTS conversation_pauses (
  page_id      TEXT NOT NULL,
  sender_id    TEXT NOT NULL,
  paused_until TIMESTAMPTZ NOT NULL,
  reason       TEXT DEFAULT 'user_requested',
  created_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (page_id, sender_id)
);

CREATE TABLE IF NOT EXISTS leads (
  id          SERIAL PRIMARY KEY,
  owner_id    TEXT NOT NULL,
  page_id     TEXT NOT NULL,
  sender_id   TEXT NOT NULL,
  name        TEXT,
  phone       TEXT,
  email       TEXT,
  notes       TEXT,
  status      TEXT DEFAULT 'new'
                CHECK (status IN ('new', 'contacted', 'qualified', 'closed', 'archived')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (page_id, sender_id)
);

CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_page  ON leads(page_id);

COMMIT;
