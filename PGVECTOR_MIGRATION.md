# pgvector Migration & Usage Guide

Quick guide to set up PostgreSQL + `pgvector`, run the migration, re-index existing pages, and use semantic search.

1) Start Postgres (Docker example)

```bash
docker run -d \
  --name wink-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_USER=postgres \
  -p 5432:5432 \
  postgres:15
```

2) Install `pgvector` extension (run in psql)

```bash
# connect to psql
psql -h localhost -U postgres -d postgres
# then in psql:
CREATE EXTENSION IF NOT EXISTS vector;
```

3) Create the application database and run migration

```bash
psql -h localhost -U postgres -c "CREATE DATABASE winkwebhook;"
psql -h localhost -U postgres -d winkwebhook -f migrations/001_add_embedding_column.sql
```

4) Environment variables (create a `.env` at project root)

```
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=winkwebhook
OPENAI_API_KEY=sk-...        # required for embeddings
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_BATCH_SIZE=50
```

5) Install dependencies and run re-index

```bash
npm install
npm run reindex:pg
```

6) Start the server

```bash
npm start
# then open: http://localhost:3000/semantic_search_example.html
```

Notes & tuning
- Ensure `VECTOR_DIM` (1536 in migration) matches your embedding model dimension. If you use a different model, update `migrations/001_add_embedding_column.sql`.
- The IVFFLAT index `lists` parameter should be tuned for dataset size (larger datasets → larger `lists`).
- To reduce token usage and cost: store embeddings only and send only short snippets to the LLM for final responses. Use chunking and caching.
- The reindex script reads pages from MongoDB and upserts into Postgres. Keep MongoDB as source-of-truth unless you migrate fully.

Troubleshooting
- If index creation fails, confirm `CREATE EXTENSION vector` succeeded and restart Postgres.
- If OpenAI fails during reindex, re-run `npm run reindex:pg` after fixing API credentials.
