import { initPgVector } from '../pg_database.js';

(async () => {
  try {
    await initPgVector();
    console.log('pgvector extension ensured');
  } catch (err) {
    console.error('Failed to ensure pgvector extension:', err.message || err);
    process.exit(1);
  }
})();
