const { supabaseAdmin } = require('./src/lib/supabaseAdmin');
const fs = require('fs');

async function lookup() {
    try {
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('id, email, role')
            .eq('email', 'gsmrutishriya12@gmail.com');

        fs.writeFileSync('profiles_trace.json', JSON.stringify(profiles, null, 2));
    } catch (e) {
        // ... 
    }
    process.exit(0);
}
lookup();
