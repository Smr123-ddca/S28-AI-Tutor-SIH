require('dotenv').config();
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

async function diagnose() {
    console.log("--- PHASE 1: DIAGNOSE PROFILES ---");
    const { data: profiles, error } = await supabaseAdmin.from('profiles').select('*');
    if (error) {
        console.error("Error fetching profiles:", error.message);
    } else {
        const total = profiles.length;
        const nonNull = profiles.filter(p => p.full_name !== null && p.full_name !== undefined && p.full_name !== '').length;
        const isNull = total - nonNull;

        console.log(`Total profile rows: ${total}`);
        console.log(`Non-NULL full_name: ${nonNull}`);
        console.log(`NULL full_name: ${isNull}`);

        if (isNull > 0) {
            console.log("Sample NULL profile:", profiles.filter(p => !p.full_name)[0]);
        }
    }
}

diagnose().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
