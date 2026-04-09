-- Migration: page_documents table for chunked/document-level embeddings
BEGIN;

CREATE TABLE IF NOT EXISTS page_documents (
  id SERIAL PRIMARY KEY,
  page_id TEXT,
  doc_id TEXT UNIQUE,
  doc_type TEXT,
  content TEXT,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_documents_embedding_idx ON page_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

COMMIT;
