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
});

async function test() {
  console.log('Testing Postgres connection...');
  try {
    const client = await pool.connect();
    console.log('✅ Connected to Postgres successfully!');
    const res = await client.query('SELECT version()');
    console.log('Postgres version:', res.rows[0].version);
    client.release();
  } catch (err) {
    console.error('❌ Failed to connect to Postgres:', err.message);
  } finally {
    await pool.end();
  }
}

test();
