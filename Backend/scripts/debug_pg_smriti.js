const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
});

async function findSmriti() {
    try {
        const res = await pool.query(`
      SELECT 
         au.id as auth_id, 
         au.email, 
         p.role, 
         p.display_name 
      FROM auth.users au
      JOIN public.profiles p ON au.id = p.id
      WHERE au.email ILIKE '%smriti%'
    `);
        console.log("Found matches:");
        console.log(res.rows);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
findSmriti();
