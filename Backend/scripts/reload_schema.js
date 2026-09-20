const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function reload() {
    try {
        console.log("Reloading PostgREST schema cache...");
        await pool.query('NOTIFY pgrst, reload_schema;');
        console.log("Reload triggered successfully!");

        let res = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('classes', 'class_members')`);
        console.log("Tables found:", res.rows);

        setTimeout(() => process.exit(0), 100);
    } catch (e) {
        console.error(e);
        setTimeout(() => process.exit(1), 100);
    }
}
reload();
