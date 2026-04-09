import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const CACHE_DIR = process.env.EMBEDDING_CACHE_DIR || path.resolve(process.cwd(), 'embeddings_cache');

async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
  } catch (err) {
    // ignore
  }
}

function keyForText(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

async function get(text) {
  await ensureCacheDir();
  const key = keyForText(text);
  const file = path.join(CACHE_DIR, key + '.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    const obj = JSON.parse(raw);
    return obj.embedding;
  } catch (err) {
    return null;
  }
}

async function set(text, embedding) {
  await ensureCacheDir();
  const key = keyForText(text);
  const file = path.join(CACHE_DIR, key + '.json');
  const payload = { created_at: new Date().toISOString(), embedding };
  try {
    await fs.writeFile(file, JSON.stringify(payload), 'utf8');
  } catch (err) {
    console.warn('Failed to write embedding cache:', err.message || err);
  }
}

async function getMany(texts) {
  await ensureCacheDir();
  const results = new Map();
  await Promise.all(texts.map(async (t) => {
    const e = await get(t);
    if (e) results.set(t, e);
  }));
  return results;
}

export { get, set, getMany };
