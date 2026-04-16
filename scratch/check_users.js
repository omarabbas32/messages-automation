import { query, close } from '../pg_database.js';

async function checkTables() {
  try {
    const tables = ['users', 'refresh_tokens'];
    for (const table of tables) {
      const result = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);
      console.log(`${table} Table Columns:`);
      console.table(result.rows);
    }

    const userCount = await query('SELECT count(*) FROM users');
    console.log(`Total users: ${userCount.rows[0].count}`);
  } catch (error) {
    console.error('Error checking tables:', error);
  } finally {
    await close();
  }
}

checkTables();
