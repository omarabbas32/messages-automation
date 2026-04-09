import fs from 'fs/promises';
import path from 'path';
import { query as pgQuery } from '../pg_database.js';

async function run() {
  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  let files = await fs.readdir(migrationsDir);
  files = files.filter(f => f.endsWith('.sql')).sort();

  if (!files.length) {
    console.log('No migration files found in migrations/');
    return;
  }

  for (const file of files) {
    const full = path.join(migrationsDir, file);
    console.log('Running migration:', file);
    const sql = await fs.readFile(full, 'utf8');
    try {
      await pgQuery(sql, []);
      console.log('✅ Applied', file);
    } catch (err) {
      console.error('❌ Migration failed:', file, err.message || err);
      process.exit(1);
    }
  }

  console.log('All migrations applied');
}

run().catch(err => {
  console.error('Migration runner failed:', err.message || err);
  process.exit(1);
});
