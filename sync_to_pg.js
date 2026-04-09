import { getEmbedding } from './embedding_service.js';
import { query as pgQuery } from './pg_database.js';

function toVecLiteral(arr) {
  return '[' + arr.join(',') + ']';
}

export async function upsertPageToPg(page) {
  try {
    const text = `${page.page_name || ''}\n${page.ai_instructions || ''}`;
    const emb = await getEmbedding(text);
    const vec = toVecLiteral(emb);

    const sql = `
      INSERT INTO pages (page_id, page_name, page_token, embedding, created_at)
      VALUES ($1, $2, $3, $4::vector, $5)
      ON CONFLICT (page_id) DO UPDATE
        SET page_name = EXCLUDED.page_name,
            page_token = EXCLUDED.page_token,
            embedding = EXCLUDED.embedding;
    `;

    await pgQuery(sql, [page.page_id, page.page_name, page.page_token || null, vec, page.created_at || new Date().toISOString()]);
    console.log('✅ Synced page to Postgres:', page.page_id);
  } catch (err) {
    console.error('❌ Failed to sync page to Postgres:', err.message || err);
  }
}
