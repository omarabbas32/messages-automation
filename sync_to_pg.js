// sync_to_pg.js — Syncs page data and knowledge chunks to pgvector
import { getEmbedding } from './embedding_service.js';
import { query as pgQuery } from './pg_database.js';

function toVecLiteral(arr) {
  return '[' + arr.join(',') + ']';
}

/**
 * Generate and upsert the top-level embedding for a page.
 * The embedding is based on page_name + ai_instructions text.
 * Called whenever a page is created, renamed, or its instructions change.
 */
export async function upsertPageEmbedding(pageId, pageName, aiInstructions) {
  try {
    const text = `${pageName || ''}\n${aiInstructions || ''}`.trim();
    if (!text) return;

    const emb = await getEmbedding(text);
    const vec = toVecLiteral(emb);

    await pgQuery(
      `UPDATE pages SET embedding = $1::vector WHERE page_id = $2`,
      [vec, pageId]
    );
    console.log(`✅ Page embedding updated: ${pageId}`);
  } catch (err) {
    console.error('❌ Failed to update page embedding:', err.message || err);
  }
}

/**
 * Split a knowledge base into chunks and store each chunk's embedding
 * in the page_documents table. Used for RAG (Retrieval-Augmented Generation).
 *
 * Chunking strategy: split by double newline (paragraphs), skip empty chunks.
 * Minimum chunk length: 20 characters.
 */
export async function syncKnowledgeChunksToPg(pageId, knowledgeBase) {
  try {
    if (!knowledgeBase || knowledgeBase.trim().length === 0) {
      // Knowledge base cleared — delete all old chunks
      await pgQuery('DELETE FROM page_documents WHERE page_id = $1 AND doc_type = $2', [pageId, 'knowledge_chunk']);
      console.log(`🗑️  Cleared knowledge chunks for page: ${pageId}`);
      return;
    }

    // Split into paragraphs
    const chunks = knowledgeBase
      .split(/\n\s*\n/)
      .map(c => c.trim())
      .filter(c => c.length >= 20);

    if (chunks.length === 0) return;

    console.log(`🔄 Syncing ${chunks.length} knowledge chunks for page: ${pageId}`);

    // Delete old chunks for this page before re-inserting
    await pgQuery('DELETE FROM page_documents WHERE page_id = $1 AND doc_type = $2', [pageId, 'knowledge_chunk']);

    // Insert new chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const docId = `${pageId}_chunk_${i}`;
      const emb = await getEmbedding(chunk);
      const vec = toVecLiteral(emb);

      await pgQuery(
        `INSERT INTO page_documents (page_id, doc_id, doc_type, content, embedding)
         VALUES ($1, $2, $3, $4, $5::vector)
         ON CONFLICT (doc_id) DO UPDATE
           SET content = EXCLUDED.content,
               embedding = EXCLUDED.embedding`,
        [pageId, docId, 'knowledge_chunk', chunk, vec]
      );
    }

    console.log(`✅ Synced ${chunks.length} knowledge chunks for page: ${pageId}`);
  } catch (err) {
    console.error('❌ Failed to sync knowledge chunks:', err.message || err);
  }
}
