const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runSQL() {
    const url = process.env.SUPABASE_URL + '/pg-meta/default/query';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
        const query = 'ALTER TABLE public.concept_evidence ADD CONSTRAINT unique_concept_chunk UNIQUE(concept_id, chunk_id);';
        console.log("Hitting pg-meta with query:", query);
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': key,
                'Authorization': 'Bearer ' + key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        const txt = await res.text();
        console.log("Status:", res.status);
        console.log("Response:", txt);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}
runSQL();
