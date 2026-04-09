import dotenv from 'dotenv';
import pkg from 'pg';
dotenv.config();

const { Client } = pkg;

async function createDb() {
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
    database: 'postgres'
  });

  try {
    await client.connect();
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", ['winkwebhook']);
    if (res.rowCount === 0) {
      console.log('Creating database winkwebhook...');
      await client.query('CREATE DATABASE winkwebhook');
      console.log('Database created');
    } else {
      console.log('Database winkwebhook already exists');
    }
  } catch (err) {
    console.error('Failed to create database:', err.message || err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDb();
