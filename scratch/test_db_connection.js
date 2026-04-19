import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const testConnection = async (port) => {
    console.log(`\n🐘 Testing connection on port ${port}...`);
    const client = new Client({
        host: process.env.PGHOST || 'localhost',
        port: port,
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'postgres',
        database: process.env.PGDATABASE || 'winkwebhook',
        connectionTimeoutMillis: 2000,
    });

    try {
        await client.connect();
        console.log(`✅ SUCCESS: Connected to port ${port}`);
        const res = await client.query('SELECT version()');
        console.log(`📊 DB Version: ${res.rows[0].version}`);
        
        const hasVector = await client.query("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
        console.log(`🧬 pgvector installed: ${hasVector.rowCount > 0 ? 'YES' : 'NO'}`);
        
        await client.end();
        return true;
    } catch (err) {
        console.error(`❌ FAILED on port ${port}: ${err.message}`);
        return false;
    }
};

const main = async () => {
    await testConnection(5432);
    await testConnection(5433);
};

main();
