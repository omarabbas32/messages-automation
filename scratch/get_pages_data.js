import { query, close } from '../pg_database.js';

async function getPagesData() {
  console.log('Connecting to database...');
  try {
    const result = await query('SELECT * FROM pages');
    console.log(`Found ${result.rows.length} pages.`);
    if (result.rows.length > 0) {
      console.log('Pages Data:');
      console.log(JSON.stringify(result.rows, null, 2));
    } else {
      console.log('No pages found in the database.');
    }
  } catch (error) {
    console.error('Error fetching pages data:', error);
  } finally {
    await close();
  }
}

getPagesData();
