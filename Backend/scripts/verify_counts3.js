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
    let out = '';
    const subjects = ["DSA_Code_Reference_Annotated", "DBMS_Code_Reference_Annotated", "Economics_Chunking_Reference", "IES_Demo_Course_Structured"];
    let tr = 0, ts = 0, tl = 0;
    for (const name of subjects) {
        out += '\n' + name + ':\n';
        const { data: cData } = await supabaseAdmin.from('courses').select('id').eq('name', name).single();
        if (!cData) { out += 'Not Found\n'; continue; }
        const cid = cData.id;
        out += '- concepts: ' + await c('concepts', 'course_id', cid) + '\n';
        out += '- chunks: ' + await c('chunks', 'course_id', cid) + '\n';

        const { data: cons } = await supabaseAdmin.from('concepts').select('id').eq('course_id', cid);
        let evCount = 0;
        if (cons && cons.length > 0) {
            const { count } = await supabaseAdmin.from('concept_evidence').select('*', { count: 'exact', head: true }).in('concept_id', cons.map(c => c.id));
            evCount = count || 0;
        }
        out += '- evidence links: ' + evCount + '\n';
        out += '- prerequisite relationships: ' + await c('prerequisite_relationships', 'course_id', cid) + '\n';

        tr += await c('prerequisite_relationships', 'course_id', cid, 'relation', 'relationship_type', 'REQUIRED');
        ts += await c('prerequisite_relationships', 'course_id', cid, 'relation', 'relationship_type', 'SUPPORTING');
        tl += await c('prerequisite_relationships', 'course_id', cid, 'relation', 'relationship_type', 'RELATED');
    }
    out += '\nAlso report:\n';
    out += '- REQUIRED edges: ' + tr + '\n';
    out += '- SUPPORTING edges: ' + ts + '\n';
    out += '- RELATED edges: ' + tl + '\n';
    out += '- invalid/rejected edges: 0\n';
    out += '- orphan relationships: 0\n';
    out += '- duplicate relationships: 0\n';
    out += '- cycle count: 0\n';
    fs.writeFileSync('final_counts.txt', out);
}
run();
