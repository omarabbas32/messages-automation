import OpenAI from 'openai';
import dotenv from 'dotenv';
import { get as cacheGet, set as cacheSet, getMany as cacheGetMany } from './embedding_cache.js';
dotenv.config();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';

let client;
if (OPENAI_API_KEY && OPENAI_API_KEY !== 'هنا_تحط_API_بتاع_OpenAI') {
  client = new OpenAI({ apiKey: OPENAI_API_KEY });
} else {
  client = null;
}

async function ensureClient() {
  if (!client) throw new Error('OpenAI API key not configured');
}

export async function getEmbedding(text, apiKey = null) {
  // Use custom key if provided, otherwise fallback to global client
  let activeClient = client;
  if (apiKey) {
    activeClient = new OpenAI({ apiKey });
  }

  if (!activeClient) throw new Error('OpenAI API key not configured');

  // check cache first
  const cached = await cacheGet(text);
  if (cached) return cached;

  const resp = await activeClient.embeddings.create({ model: EMBEDDING_MODEL, input: text });
  const emb = resp.data[0].embedding;
  
  // store in cache
  try { await cacheSet(text, emb); } catch (err) { /* ignore cache errors */ }
  return emb;
}

export async function getEmbeddings(texts, apiKey = null) {
  let activeClient = client;
  if (apiKey) {
    activeClient = new OpenAI({ apiKey });
  }

  if (!activeClient) throw new Error('OpenAI API key not configured');

  // try to get cached embeddings
  const cachedMap = await cacheGetMany(texts);
  const results = [];
  const toFetch = [];
  const fetchIndexes = [];

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    if (cachedMap.has(t)) {
      results[i] = cachedMap.get(t);
    } else {
      results[i] = null;
      toFetch.push(t);
      fetchIndexes.push(i);
    }
  }

  if (toFetch.length > 0) {
    const resp = await activeClient.embeddings.create({ model: EMBEDDING_MODEL, input: toFetch });
    const fetched = resp.data.map(d => d.embedding);

    // write fetched embeddings into results and cache
    for (let k = 0; k < fetched.length; k++) {
      const idx = fetchIndexes[k];
      results[idx] = fetched[k];
      // cache without awaiting to speed up
      cacheSet(toFetch[k], fetched[k]).catch(() => {});
    }
  }

  return results;
}
