require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');

async function verify() {
    const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Explicitly using HTTP/REST natively via fetch to avoid Windows async handle crashes in node SDK
    const headers = {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    };

    const fetchCount = async (table) => {
        const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}?select=id`, { headers });
        const data = await res.json();
        return Array.isArray(data) ? data.length : JSON.stringify(data);
    };

    const fetchAll = async (table) => {
        const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}?select=*`, { headers });
        return await res.json();
    };

    console.log("=== SUPABASE ROW COUNTS ===");
    console.log("Courses:", await fetchCount("courses"));
    console.log("Documents:", await fetchCount("documents"));
    console.log("Chunks:", await fetchCount("chunks"));
    console.log("Concepts:", await fetchCount("concepts"));
    console.log("Prerequisites:", await fetchCount("prerequisite_relationships"));

    console.log("\n=== INGESTION JOBS ===");
    console.log(await fetchAll("ingestion_jobs"));
}

verify().catch(console.error);
