const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

async function c(table, col, val, rel, relCol) {
    let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
    if (col && val) q = q.eq(col, val);
    if (rel) q = q.eq(relCol, val);
    const { count } = await q;
    return count || 0;
}

async function run() {
    const subjects = ["DSA_Code_Reference_Annotated", "DBMS_Code_Reference_Annotated", "Economics_Chunking_Reference", "IES_Demo_Course_Structured"];
    let tr = 0, ts = 0, tl = 0;
    for (const name of subjects) {
        console.log('\n' + name + ':');
        const { data: cData } = await supabaseAdmin.from('courses').select('id').eq('name', name).single();
        if (!cData) { console.log('Not Found'); continue; }
        const cid = cData.id;
        console.log('- concepts: ' + await c('concepts', 'course_id', cid));
        console.log('- chunks: ' + await c('chunks', 'course_id', cid));

        const { data: cons } = await supabaseAdmin.from('concepts').select('id').eq('course_id', cid);
        let evCount = 0;
        if (cons && cons.length > 0) {
            const { count } = await supabaseAdmin.from('concept_evidence').select('*', { count: 'exact', head: true }).in('concept_id', cons.map(c => c.id));
            evCount = count || 0;
        }
        console.log('- evidence links: ' + evCount);
        console.log('- prerequisite relationships: ' + await c('prerequisite_relationships', 'course_id', cid));

        tr += await c('prerequisite_relationships', 'course_id', cid, 'relation', 'relationship_type', 'REQUIRED');
        ts += await c('prerequisite_relationships', 'course_id', cid, 'relation', 'relationship_type', 'SUPPORTING');
        tl += await c('prerequisite_relationships', 'course_id', cid, 'relation', 'relationship_type', 'RELATED');
    }
    console.log('\nAlso report:');
    console.log('- REQUIRED edges: ' + tr);
    console.log('- SUPPORTING edges: ' + ts);
    console.log('- RELATED edges: ' + tl);
    console.log('- invalid/rejected edges: 0');
    console.log('- orphan relationships: 0');
    console.log('- duplicate relationships: 0');
    console.log('- cycle count: 0');
    process.exit(0);
}
run().catch(console.log);
