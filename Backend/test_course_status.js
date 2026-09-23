const { supabaseAdmin } = require('./src/lib/supabaseAdmin');
const fs = require('fs');
async function test() {
    try {
        const { data: courses } = await supabaseAdmin
            .from('courses')
            .select('name, status')
            .eq('name', 'Economics_Chunking_Reference');
        fs.writeFileSync('debug_course.json', JSON.stringify(courses, null, 2));
    } catch (e) {
        fs.writeFileSync('debug_course.json', JSON.stringify({ error: e.message }));
    }
    process.exit(0);
}
test();
