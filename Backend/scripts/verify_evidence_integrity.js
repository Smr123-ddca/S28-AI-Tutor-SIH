const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

async function runVerification() {
    console.log("=== STARTING EVIDENCE INTEGRITY VERIFICATION ===");

    // 1. Global count
    const { count: globalCount } = await supabaseAdmin.from('concept_evidence').select('*', { count: 'exact', head: true });
    console.log(`Global Count: ${globalCount}`);

    // 2. Per-course count
    const { data: courses } = await supabaseAdmin.from('courses').select('id, name').in('name', ['DBMS_Code_Reference_Annotated', 'Economics_Chunking_Reference', 'DSA_Code_Reference_Annotated']);
    let courseParams = { DBMS: 0, Economics: 0, DSA: 0 };
    for (const c of courses) {
        if (c.name.includes('DBMS')) courseParams.DBMS = (await supabaseAdmin.from('concept_evidence').select('concept_id, concepts!inner(course_id)').eq('concepts.course_id', c.id)).data.length;
        if (c.name.includes('Economics')) courseParams.Economics = (await supabaseAdmin.from('concept_evidence').select('concept_id, concepts!inner(course_id)').eq('concepts.course_id', c.id)).data.length;
        if (c.name.includes('DSA')) courseParams.DSA = (await supabaseAdmin.from('concept_evidence').select('concept_id, concepts!inner(course_id)').eq('concepts.course_id', c.id)).data.length;
    }
    console.log("Per Course Counts:", courseParams);

    // 4. Find concepts with zero evidence via bulk Fetch
    const { data: allConcepts } = await supabaseAdmin.from('concepts').select('id, name, course_id');
    const { data: allEvidence } = await supabaseAdmin.from('concept_evidence').select('concept_id, chunk_id, concepts(course_id), chunks(course_id)');

    let zeroEvidence = 0;
    const evidenceConceptIds = new Set(allEvidence.map(e => e.concept_id));
    for (const c of allConcepts) {
        if (!evidenceConceptIds.has(c.id)) {
            zeroEvidence++;
        }
    }
    console.log(`Concepts with ZERO evidence across target courses: ${zeroEvidence}`);

    // 5. Find evidence pointing across courses (Foreign Key cross-course mapping limits)
    let crossCourse = 0;
    if (allEvidence) {
        for (let ev of allEvidence) {
            if (ev.concepts.course_id !== ev.chunks.course_id) {
                crossCourse++;
            }
        }
    }
    console.log(`Cross-Course violations: ${crossCourse}`);

    console.log("=== COMPLETED ===");
}
runVerification();
