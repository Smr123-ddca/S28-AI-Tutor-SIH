const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
async function check() {
    const url = process.env.SUPABASE_URL + '/rest/v1/';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await fetch(url, { headers: { apikey: key, Authorization: 'Bearer ' + key } });
    const j = await res.json();
    if (j && j.definitions && j.definitions.chunks) {
        console.log("Columns:", Object.keys(j.definitions.chunks.properties));
    }
}
check();
