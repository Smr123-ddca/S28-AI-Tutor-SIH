const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Client } = require('pg');

async function testConnection() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const projectRef = 'ybhtpbsxhxftygbqyxsv'; // parsed from URL

    // Try connecting using the service role key as the password
    const conString = `postgresql://postgres:${key}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`;
    // OR just try the domain db.ybhtpbsxhxftygbqyxsv.supabase.co
    const conString2 = `postgresql://postgres:${key}@db.${projectRef}.supabase.co:5432/postgres`;

    console.log("Trying connection 2...");
    const c2 = new Client({ connectionString: conString2, connectionTimeoutMillis: 5000 });
    try {
        await c2.connect();
        console.log("SUCCESS! Service Role Key is the DB password!");
        const res = await c2.query('SELECT 1');
        console.log(res.rows);
        process.exit(0);
    } catch (e) {
        console.error("Failed connection 2:", e.message);
    }
}
testConnection();
