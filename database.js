import { pool, query } from './pg_database.js';
import bcrypt from 'bcrypt';

// ==================== PAGES ====================

/**
 * Add a new Facebook Page
 * @returns {{ success: boolean, id?: number, error?: string }}
 */
export async function addPage(ownerId, pageId, pageToken, pageName, aiContextLimit = 5, platform = 'facebook', igUserId = null) {
  try {
    const result = await query(
      `INSERT INTO pages (owner_id, page_id, page_token, page_name, ai_enabled, ai_instructions, knowledge_base, ai_context_limit, platform, ig_user_id, created_at)
       VALUES ($1, $2, $3, $4, true, 'أنت مساعد خدمة عملاء محترف. قم بالرد على الرسائل بشكل مهذب ومفيد.', '', $5, $6, $7, now())
       ON CONFLICT (page_id) DO UPDATE SET 
         page_token = EXCLUDED.page_token,
         page_name = EXCLUDED.page_name,
         owner_id = EXCLUDED.owner_id,
         platform = EXCLUDED.platform,
         ig_user_id = EXCLUDED.ig_user_id,
         created_at = now()
       RETURNING id`,
      [ownerId, pageId, pageToken, pageName, aiContextLimit, platform, igUserId]
    );
    const newPage = result.rows[0];

    // Fire-and-forget: generate and store embedding for this page
    import('./sync_to_pg.js').then(mod => mod.upsertPageEmbedding(pageId, pageName, '')).catch(err => {
      console.warn('Background embedding sync failed:', err?.message || err);
    });

    return { success: true, id: newPage.id };
  } catch (error) {
    if (error.code === '23505') { // unique_violation
      return { success: false, error: 'Page ID already exists' };
    }
    throw error;
  }
}

/**
 * Get a specific page by page_id (used by webhook handler — no owner filter)
 */
export async function getPage(pageId) {
  const result = await query(
    'SELECT * FROM pages WHERE page_id = $1',
    [pageId]
  );
  return result.rows[0] || null;
}

/**
 * Get a specific page by internal serial id
 */
export async function getPageById(id) {
  const result = await query(
    'SELECT * FROM pages WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get all pages for a specific owner, excluding the token
 */
export async function getAllPages(ownerId) {
  const result = await query(
    `SELECT id, owner_id, page_id, page_name, ai_enabled, ai_instructions, knowledge_base, ai_context_limit, platform, ig_user_id, created_at
     FROM pages
     WHERE owner_id = $1
     ORDER BY created_at DESC`,
    [ownerId]
  );
  return result.rows;
}

/**
 * Delete a page by its integer id, enforcing owner
 * Also deletes: rules (via FK cascade), pg embedding, page_documents
 */
export async function deletePage(id, ownerId) {
  // First, get the page_id so we can clean up page_documents
  const pageRes = await query(
    'SELECT page_id FROM pages WHERE id = $1 AND owner_id = $2',
    [id, ownerId]
  );
  if (pageRes.rows.length === 0) return false;

  const { page_id } = pageRes.rows[0];

  // Delete the page (rules cascade automatically via FK)
  await query('DELETE FROM pages WHERE id = $1 AND owner_id = $2', [id, ownerId]);

  // Clean up page_documents (no FK, delete manually)
  await query('DELETE FROM page_documents WHERE page_id = $1', [page_id]);

  // Clean up conversations
  await query('DELETE FROM conversations WHERE page_id = $1', [page_id]);

  console.log(`✅ Deleted page ${page_id} and all related data`);
  return true;
}

/**
 * Update page AI settings, enforcing owner
 */
export async function updatePageAI(id, ownerId, aiEnabled, aiInstructions, aiContextLimit) {
  const setClauses = [];
  const values = [];
  let idx = 1;
 
  if (aiEnabled !== undefined) { setClauses.push(`ai_enabled = $${idx++}`); values.push(aiEnabled); }
  if (aiInstructions !== undefined) { setClauses.push(`ai_instructions = $${idx++}`); values.push(aiInstructions); }
  if (aiContextLimit !== undefined) { setClauses.push(`ai_context_limit = $${idx++}`); values.push(parseInt(aiContextLimit)); }

  if (setClauses.length === 0) return false;

  values.push(id, ownerId);
  const result = await query(
    `UPDATE pages SET ${setClauses.join(', ')} WHERE id = $${idx++} AND owner_id = $${idx++} RETURNING page_id, page_name, ai_instructions`,
    values
  );

  if (result.rows.length === 0) return false;

  // Re-sync embedding in background (ai_instructions affects the embedding text)
  const { page_id, page_name, ai_instructions } = result.rows[0];
  import('./sync_to_pg.js').then(mod => mod.upsertPageEmbedding(page_id, page_name, ai_instructions)).catch(() => {});

  return true;
}

/**
 * Update knowledge base, enforcing owner.
 * Also re-chunks and re-embeds the knowledge base for RAG.
 */
export async function updatePageKnowledge(id, ownerId, knowledgeBase) {
  const result = await query(
    `UPDATE pages SET knowledge_base = $1 WHERE id = $2 AND owner_id = $3 RETURNING page_id`,
    [knowledgeBase, id, ownerId]
  );

  if (result.rows.length === 0) return false;

  // Re-sync knowledge chunks for RAG (fire-and-forget)
  const { page_id } = result.rows[0];
  import('./sync_to_pg.js').then(mod => mod.syncKnowledgeChunksToPg(page_id, knowledgeBase)).catch(err => {
    console.warn('Background knowledge chunk sync failed:', err?.message || err);
  });

  return true;
}

/**
 * Update page metadata (name, token), enforcing owner
 */
export async function updatePage(id, ownerId, pageName, pageToken) {
  const setClauses = [];
  const values = [];
  let idx = 1;

  if (pageName !== undefined)  { setClauses.push(`page_name = $${idx++}`);  values.push(pageName); }
  if (pageToken !== undefined) { setClauses.push(`page_token = $${idx++}`); values.push(pageToken); }

  if (setClauses.length === 0) return false;

  values.push(id, ownerId);
  const result = await query(
    `UPDATE pages SET ${setClauses.join(', ')} WHERE id = $${idx++} AND owner_id = $${idx++} RETURNING page_id, page_name, ai_instructions`,
    values
  );

  if (result.rows.length === 0) return false;

  // Re-sync embedding in background
  const { page_id, page_name, ai_instructions } = result.rows[0];
  import('./sync_to_pg.js').then(mod => mod.upsertPageEmbedding(page_id, page_name, ai_instructions)).catch(() => {});

  return true;
}

// ==================== RULES ====================

/**
 * Add a new keyword rule for a page, verifying ownership via pages table
 */
export async function addRule(ownerId, pageId, keyword, reply) {
  try {
    // Verify the page exists and belongs to this owner
    const pageCheck = await query(
      'SELECT page_id FROM pages WHERE page_id = $1 AND owner_id = $2',
      [pageId, ownerId]
    );
    if (pageCheck.rows.length === 0) {
      return { success: false, error: 'Page not found or unauthorized' };
    }

    const result = await query(
      `INSERT INTO rules (owner_id, page_id, keyword, reply) VALUES ($1, $2, $3, $4) RETURNING id`,
      [ownerId, pageId, keyword, reply]
    );
    return { success: true, id: result.rows[0].id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get rules for a specific page_id
 */
export async function getRules(pageId) {
  const result = await query(
    'SELECT * FROM rules WHERE page_id = $1 ORDER BY created_at DESC',
    [pageId]
  );
  return result.rows;
}

/**
 * Get rules for a page, verifying the requesting user owns that page
 */
export async function getRulesByPageAndOwner(pageId, ownerId) {
  // First verify ownership
  const pageCheck = await query(
    'SELECT page_id FROM pages WHERE page_id = $1 AND owner_id = $2',
    [pageId, ownerId]
  );
  if (pageCheck.rows.length === 0) return null; // null = unauthorized or not found

  const result = await query(
    'SELECT * FROM rules WHERE page_id = $1 ORDER BY created_at DESC',
    [pageId]
  );
  return result.rows;
}

/**
 * Get all rules for a specific owner
 */
export async function getAllRules(ownerId) {
  const result = await query(
    'SELECT * FROM rules WHERE owner_id = $1 ORDER BY page_id, created_at DESC',
    [ownerId]
  );
  return result.rows;
}

/**
 * Delete a rule, enforcing owner
 */
export async function deleteRule(id, ownerId) {
  const result = await query(
    'DELETE FROM rules WHERE id = $1 AND owner_id = $2 RETURNING id',
    [id, ownerId]
  );
  return result.rowCount > 0;
}

/**
 * Update a rule, enforcing owner
 */
export async function updateRule(id, ownerId, keyword, reply) {
  const result = await query(
    'UPDATE rules SET keyword = $1, reply = $2 WHERE id = $3 AND owner_id = $4 RETURNING id',
    [keyword, reply, id, ownerId]
  );
  return result.rowCount > 0;
}

// ==================== CONVERSATIONS ====================

/**
 * Save a single message to the conversations table.
 * Automatically trims to keep only the last 10 messages per (page_id, sender_id).
 */
export async function saveConversation(pageId, senderId, role, content) {
  try {
    await query(
      `INSERT INTO conversations (page_id, sender_id, role, content) VALUES ($1, $2, $3, $4)`,
      [pageId, senderId, role, content]
    );

    // Keep only the most recent 10 messages for this conversation
    await query(
      `DELETE FROM conversations
       WHERE page_id = $1 AND sender_id = $2
         AND id NOT IN (
           SELECT id FROM conversations
           WHERE page_id = $1 AND sender_id = $2
           ORDER BY created_at DESC
           LIMIT 10
         )`,
      [pageId, senderId]
    );
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
}

/**
 * Get the last 5 messages for a conversation (for AI context).
 * Returns array of { role, content } objects.
 */
export async function getConversation(pageId, senderId) {
  try {
    const result = await query(
      `SELECT role, content FROM conversations
       WHERE page_id = $1 AND sender_id = $2
       ORDER BY created_at ASC`,
      [pageId, senderId]
    );
    return result.rows; // [{ role: 'user', content: '...' }, ...]
  } catch (error) {
    console.error('Error getting conversation:', error);
    return [];
  }
}

/**
 * Clean conversations older than 24 hours (called by scheduled interval)
 */
export async function cleanupConversations() {
  try {
    const result = await query(
      `DELETE FROM conversations WHERE created_at < now() - INTERVAL '24 hours'`
    );
    console.log(`🧹 Cleaned up ${result.rowCount} old conversation messages`);
  } catch (error) {
    console.error('Error cleaning conversations:', error);
  }
}


// ==================== USERS & AUTH ====================

/**
 * Create a new user with a hashed password
 */
export async function createUser(email, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  // Generate a unique owner_id for multi-tenancy (standardizing on 'user_' prefix)
  const clerkId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('  -> DB: Inserting user...', { email, clerkId });
  const result = await query(
    `INSERT INTO users (clerk_id, email, password_hash) VALUES ($1, $2, $3) RETURNING id, clerk_id, email, plan`,
    [clerkId, email, passwordHash]
  );
  return result.rows[0];
}

/**
 * Find user by email (for login)
 */
export async function getUserByEmail(email) {
  const result = await query(
    'SELECT id, clerk_id, email, password_hash, plan FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

/**
 * Fetch a user's settings and metadata
 */
export async function getUserSettings(ownerId) {
  const result = await query(
    `SELECT id, clerk_id, email, plan, openai_api_key, 
            display_name, ai_default_model, ai_default_temperature, 
            ai_default_max_tokens, ai_global_instructions,
            ai_messages_used, ai_tokens_used, ai_messages_reset_at, created_at 
     FROM users WHERE clerk_id = $1`,
    [ownerId]
  );
  return result.rows[0] || null;
}

/**
 * Update a user's settings
 */
export async function updateUserSettings(ownerId, settings) {
  const { 
    openai_api_key, display_name, ai_default_model, 
    ai_default_temperature, ai_default_max_tokens, ai_global_instructions 
  } = settings;

  const setClauses = [];
  const values = [];
  let idx = 1;

  if (openai_api_key !== undefined) { setClauses.push(`openai_api_key = $${idx++}`); values.push(openai_api_key); }
  if (display_name !== undefined) { setClauses.push(`display_name = $${idx++}`); values.push(display_name); }
  if (ai_default_model !== undefined) { setClauses.push(`ai_default_model = $${idx++}`); values.push(ai_default_model); }
  if (ai_default_temperature !== undefined) { setClauses.push(`ai_default_temperature = $${idx++}`); values.push(parseFloat(ai_default_temperature)); }
  if (ai_default_max_tokens !== undefined) { setClauses.push(`ai_default_max_tokens = $${idx++}`); values.push(parseInt(ai_default_max_tokens)); }
  if (ai_global_instructions !== undefined) { setClauses.push(`ai_global_instructions = $${idx++}`); values.push(ai_global_instructions); }

  if (setClauses.length === 0) return false;

  values.push(ownerId);
  const result = await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE clerk_id = $${idx} RETURNING clerk_id`,
    values
  );
  return result.rowCount > 0;
}

/**
 * Update user password
 */
export async function updateUserPassword(ownerId, newPassword) {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const result = await query(
    'UPDATE users SET password_hash = $1 WHERE clerk_id = $2',
    [passwordHash, ownerId]
  );
  return result.rowCount > 0;
}

/**
 * Increment the user's AI message and token usage count
 */
export async function incrementUserUsage(ownerId, tokensUsed = 0) {
  try {
    await query(
      'UPDATE users SET ai_messages_used = ai_messages_used + 1, ai_tokens_used = ai_tokens_used + $1 WHERE clerk_id = $2',
      [tokensUsed, ownerId]
    );
    return true;
  } catch (error) {
    console.error('Error incrementing usage:', error);
    return false;
  }
}

// ==================== REFRESH TOKENS ====================

/**
 * Save a new refresh token for a user
 */
export async function saveRefreshToken(userId, token, expiresAt) {
  await query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );
}

/**
 * Verify if a refresh token is valid and unexpired
 */
export async function verifyRefreshToken(userId, token) {
  const result = await query(
    'SELECT id FROM refresh_tokens WHERE user_id = $1 AND token = $2 AND expires_at > now()',
    [userId, token]
  );
  return result.rowCount > 0;
}

/**
 * Delete a refresh token (logout)
 */
export async function revokeRefreshToken(token) {
  await query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
}

/**
 * Delete all refresh tokens for a user (security reset)
 */
export async function revokeAllRefreshTokens(userId) {
  await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
}

// ==================== INITIALIZATION ====================

export async function initDatabase() {
  try {
    console.log('✅ PostgreSQL database ready (no index creation needed — handled by migrations)');
    // Clean up old conversations daily
    setInterval(cleanupConversations, 24 * 60 * 60 * 1000);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
  }
}

// Auto-initialize on module import
initDatabase();
