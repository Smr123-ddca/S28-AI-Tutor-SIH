const { supabaseAdmin } = require('./src/lib/supabaseAdmin');
const fs = require('fs');

async function advanced() {
    try {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('role', 'student');

        fs.writeFileSync('diag_all.json', JSON.stringify({ data, error }, null, 2));

        const class_id = "dcb2c4de-ea57-434a-82d2-f5342ba5a08d";
        const { data: mems, error: memErr } = await supabaseAdmin
            .from('class_members')
            .select('*')
            .eq('class_id', class_id);

        fs.writeFileSync('diag_mems.json', JSON.stringify({ mems, memErr }, null, 2));
    } catch (e) {
        fs.writeFileSync('diag_error.json', JSON.stringify({ e: e.message }));
    }
    process.exit(0);
}
advanced();
