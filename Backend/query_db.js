const { supabaseAdmin } = require('./src/lib/supabaseAdmin');
const fs = require('fs');

async function dump() {
    const { data: c } = await supabaseAdmin.from('courses').select('id, name');
    const { data: cpt } = await supabaseAdmin.from('concepts').select('id, title, course_id, subject');
    fs.writeFileSync('db_dump.json', JSON.stringify({ courses: c, concepts: cpt }, null, 2));
    process.exit(0);
}
dump();
