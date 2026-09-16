const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

async function run() {
    // Extract postgres connection string from Supabase URL & Key if direct connection string is not available
    let connString = process.env.DATABASE_URL;
    if (!connString && process.env.SUPABASE_URL) {
        // Try parsing connection string (assumes direct db connection string might be in .env)
        console.error("No DATABASE_URL found. We need a direct Postgres connection string to use pg.");
        // Fallback for checking if direct DB url was set under another name
    }

    if (!connString) {
        console.log("No valid DATABASE_URL provided. Exiting.");
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: connString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log("Checking for duplicates...");
        const dupRes = await pool.query(`
            SELECT concept_id, chunk_id, COUNT(*)
            FROM public.concept_evidence
            GROUP BY concept_id, chunk_id
            HAVING COUNT(*) > 1;
        `);

        if (dupRes.rows.length > 0) {
            console.error("Duplicates exist! Cannot add constraint.", dupRes.rows);
            process.exit(1);
        }

        console.log("No duplicates found. Adding constraint...");
        await pool.query(`
            ALTER TABLE public.concept_evidence
            ADD CONSTRAINT unique_concept_chunk
            UNIQUE (concept_id, chunk_id);
        `);
        console.log("Constraint uniquely established successfully!");
    } catch (e) {
        console.error("Error executing query:", e);
    } finally {
        pool.end();
    }
}
run();
