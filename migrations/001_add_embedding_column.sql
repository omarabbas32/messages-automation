-- Migration: create pages table (if needed) and add embedding column
-- Adjust VECTOR_DIM to the embedding dimension of your model (e.g., 1536)

BEGIN;

CREATE TABLE IF NOT EXISTS pages (
  id SERIAL PRIMARY KEY,
  page_id TEXT UNIQUE,
  page_name TEXT,
  page_token TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add embedding column if table already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='pages' AND column_name='embedding'
  ) THEN
    ALTER TABLE pages ADD COLUMN embedding VECTOR(1536);
  END IF;
END$$;

-- Create an index for approximate nearest neighbor search (IVFFLAT)
-- Tune lists parameter according to dataset size
CREATE INDEX IF NOT EXISTS pages_embedding_idx ON pages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMIT;
