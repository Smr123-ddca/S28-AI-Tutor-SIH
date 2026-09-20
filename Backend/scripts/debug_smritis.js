const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

async function debugProfiles() {
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();

    // Find matching emails natively
    const smritis = authData.users.filter(u => u.email && u.email.toLowerCase().includes('smriti'));

    console.log("Found matches:");
    smritis.forEach(u => console.log(`Auth ID: ${u.id} | Email: ${u.email}`));

    // Find what profile maps to this
    for (const u of smritis) {
        const { data: p } = await supabaseAdmin.from('profiles').select('*').eq('id', u.id).single();
        if (p) {
            console.log(` -> Profile: Role=${p.role}, DisplayName=${p.display_name}, Name=${p.name}`);
        } else {
            console.log(` -> Profile: <NOT FOUND>`);
        }
    }
    process.exit(0);
}
debugProfiles();
