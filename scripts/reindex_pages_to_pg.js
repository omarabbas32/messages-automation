import dotenv from 'dotenv';
import * as mongoDb from '../database.js';
import { getEmbeddings } from '../embedding_service.js';
import { query as pgQuery } from '../pg_database.js';
import { getAllRules } from '../database.js';

dotenv.config();

const BATCH_SIZE = Number(process.env.EMBEDDING_BATCH_SIZE || 50);

async function ensureTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS pages (
      id SERIAL PRIMARY KEY,
      page_id TEXT UNIQUE,
      page_name TEXT,
      page_token TEXT,
      embedding VECTOR(1536),
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  await pgQuery(sql, []);
  // create ivfflat index if not exists
  const idxSql = `CREATE INDEX IF NOT EXISTS pages_embedding_idx ON pages USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);`;
  try {
    await pgQuery(idxSql, []);
  } catch (err) {
    // index creation may fail if pgvector not loaded; warn and continue
    console.warn('Index creation warning:', err.message || err);
  }
}

function toVecLiteral(arr) {
  return '[' + arr.join(',') + ']';
}

async function reindex() {
  console.log('🔎 Starting re-index: reading pages from MongoDB...');

  const pages = await mongoDb.getAllPages();
  console.log(`📦 Found ${pages.length} pages to index`);

  await ensureTable();

  for (let i = 0; i < pages.length; i += BATCH_SIZE) {
    const batch = pages.slice(i, i + BATCH_SIZE);
    // prepare texts to embed (page_name + ai_instructions)
    const texts = batch.map(p => `${p.page_name || ''}\n${p.ai_instructions || ''}`);

    console.log(`⏳ Embedding batch ${i}..${i + batch.length - 1} (${texts.length} items)`);
    let embeddings;
    try {
      embeddings = await getEmbeddings(texts);
    } catch (err) {
      console.error('❌ Embedding API error:', err.message || err);
      // abort to avoid partial inconsistent state
      throw err;
    }

    // Upsert each row into Postgres
    for (let j = 0; j < batch.length; j++) {
      const p = batch[j];
      const emb = embeddings[j];
      const vec = toVecLiteral(emb);

      const sql = `
        INSERT INTO pages (page_id, page_name, page_token, embedding, created_at)
        VALUES ($1, $2, $3, $4::vector, $5)
        ON CONFLICT (page_id) DO UPDATE
          SET page_name = EXCLUDED.page_name,
              page_token = EXCLUDED.page_token,
              embedding = EXCLUDED.embedding;
      `;

      try {
        await pgQuery(sql, [p.page_id, p.page_name, p.page_token || null, vec, new Date().toISOString()]);
      } catch (err) {
        console.error('❌ Failed to upsert page', p.page_id, err.message || err);
      }
    }

    console.log(`✅ Batch ${i}..${i + batch.length - 1} indexed`);
  }

  console.log('🎯 Pages re-index complete');

  // Now index rules/documents as page_documents
  console.log('🔎 Indexing rules/documents from MongoDB...');
  const rules = await getAllRules();
  console.log(`📦 Found ${rules.length} rules to index`);

  for (let i = 0; i < rules.length; i += BATCH_SIZE) {
    const batch = rules.slice(i, i + BATCH_SIZE);
    const texts = batch.map(r => `${r.keyword || ''}\n${r.reply || ''}`);

    console.log(`⏳ Embedding rules batch ${i}..${i + batch.length - 1}`);
    let embeddings;
    try {
      embeddings = await getEmbeddings(texts);
    } catch (err) {
      console.error('❌ Embedding API error (rules):', err.message || err);
      throw err;
    }

    for (let j = 0; j < batch.length; j++) {
      const r = batch[j];
      const emb = embeddings[j];
      const vec = toVecLiteral(emb);

      const sql = `
        INSERT INTO page_documents (page_id, doc_id, doc_type, content, embedding, created_at)
        VALUES ($1, $2, $3, $4, $5::vector, $6)
        ON CONFLICT (doc_id) DO UPDATE
          SET content = EXCLUDED.content,
              embedding = EXCLUDED.embedding;
      `;

      try {
        await pgQuery(sql, [r.page_id, r._id.toString(), 'rule', (r.keyword || '') + '\n' + (r.reply || ''), vec, new Date().toISOString()]);
      } catch (err) {
        console.error('❌ Failed to upsert rule', r._id, err.message || err);
      }
    }

    console.log(`✅ Rules batch ${i}..${i + batch.length - 1} indexed`);
  }

  console.log('🎯 Rules re-index complete');
}

reindex().catch(err => {
  console.error('Reindex failed:', err);
  process.exit(1);
});
