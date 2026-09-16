const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');
const fs = require('fs');

async function verify() {
    const courseName = "DSA_Code_Reference_Annotated";
    const { data: course } = await supabaseAdmin.from('courses').select('id').eq('name', courseName).single();
    if (!course) return console.log("NO COURSE FOUND.");

    const { count: cCount } = await supabaseAdmin.from('chunks').select('*', { count: 'exact', head: true }).eq('course_id', course.id);
    const { count: conCount } = await supabaseAdmin.from('concepts').select('*', { count: 'exact', head: true }).eq('course_id', course.id);

    console.log(`Source Chunks: 97, Inserted Chunks: ${cCount}`);
    console.log(`Source Concepts: 6, Inserted Concepts: ${conCount}`);
}
verify();
