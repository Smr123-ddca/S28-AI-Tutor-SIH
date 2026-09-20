const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

async function debugProfiles() {
    const { data: profiles } = await supabaseAdmin.from('profiles').select('id, role, display_name, name, full_name').limit(20);
    console.log("PROFILES SAMPLE:");
    console.log(profiles);

    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    console.log("\nAUTH USERS SAMPLE:");
    console.log(authData.users.slice(0, 10).map(u => ({ id: u.id, email: u.email })));

    process.exit(0);
}
debugProfiles();
