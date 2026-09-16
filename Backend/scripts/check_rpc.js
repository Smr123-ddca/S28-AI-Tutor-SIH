const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function getRPC() {
    const url = process.env.SUPABASE_URL + '/rest/v1/';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
        const res = await fetch(url, {
            headers: {
                'apikey': key,
                'Authorization': 'Bearer ' + key
            }
        });
        const j = await res.json();
        console.log(Object.keys(j.paths).filter(p => p.startsWith('/rpc/')));
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}
getRPC();
