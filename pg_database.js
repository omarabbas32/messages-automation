import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'winkwebhook',
  max: 10,
});

async function initPgVector() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✅ pgvector extension is available');
  } catch (err) {
    console.error('❌ Error ensuring pgvector extension:', err.message || err);
  } finally {
    client.release();
  }
}

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // keep a small log for debugging during development
  console.log('pg query', { text: text.split('\n')[0], duration, rows: res.rowCount });
  return res;
}

async function close() {
  await pool.end();
}

export { pool, query, initPgVector, close };
