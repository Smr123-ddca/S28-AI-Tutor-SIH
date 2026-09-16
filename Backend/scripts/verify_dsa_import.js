const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

async function runDSAVerification() {
    console.log("=== STARTING DSA IMPORT VERIFICATION ===");
    const courseName = "DSA_Code_Reference_Annotated";
    const { data: course } = await supabaseAdmin.from('courses').select('id').eq('name', courseName).single();
    if (!course) {
        console.log("Course not found!");
        return;
    }
    const courseId = course.id;

    // Load source files
    const sourceChunks = JSON.parse(fs.readFileSync(path.join(__dirname, `../src/data/${courseName}_chunks.json`), 'utf8'));
    const sourceConcepts = JSON.parse(fs.readFileSync(path.join(__dirname, `../src/data/${courseName}_concepts.json`), 'utf8')).concepts;
    console.log(`Source chunks:     ${sourceChunks.length}`);

    const { count: dbChunksCount } = await supabaseAdmin.from('chunks').select('*', { count: 'exact', head: true }).eq('course_id', courseId);
    console.log(`DB chunks:         ${dbChunksCount}`);
    console.log(`\nSource concepts:   ${sourceConcepts.length}`);

    const { count: dbConceptsCount } = await supabaseAdmin.from('concepts').select('*', { count: 'exact', head: true }).eq('course_id', courseId);
    console.log(`DB concepts:       ${dbConceptsCount}`);

    console.log("\n--- Chunk Verification ---");
    const { data: dbChunks } = await supabaseAdmin.from('chunks').select('*').eq('course_id', courseId).order('chunk_index', { ascending: true });

    let allValid = true;
    let sequenceValid = true;
    for (let i = 0; i < sourceChunks.length; i++) {
        const sc = sourceChunks[i];
        // The DB chunks ordered by chunk_index should match exactly if they imported correctly and the sequence remained intact.
        const dc = dbChunks.find(c => c.chunk_alias === sc.chunk_id);

        if (!dc) { allValid = false; console.log(`Missing chunk_alias: ${sc.chunk_id}`); continue; }
        if (!dc.text_content) { allValid = false; console.log(`${sc.chunk_id} missing text_content`); }
        if (dc.chunk_index === null) { allValid = false; console.log(`${sc.chunk_id} missing chunk_index`); }
        if (sc.section_label && !dc.section_label) { allValid = false; console.log(`${sc.chunk_id} missing section_label`); }
        if (sc.chapter && !dc.chapter) { allValid = false; console.log(`${sc.chunk_id} missing chapter`); }
        if (sc.section && !dc.section) { allValid = false; console.log(`${sc.chunk_id} missing section`); }
        if (sc.page_start && !dc.page_start) { allValid = false; console.log(`${sc.chunk_id} missing page_start`); }
        if (dc.document_id === null) { allValid = false; console.log(`${sc.chunk_id} IS ORPHAN (no document_id)`); }
        if (sc.chunk_index !== dc.chunk_index) { allValid = false; console.log(`${sc.chunk_id} index mismatch: source ${sc.chunk_index} !== db ${dc.chunk_index}`); }

        // Sequence check: Since source chunks are ordered logically, dbChunks index `i` should be `dc` if `chunk_index` sorted identically.
        const sortedDc = dbChunks[i];
        if (sortedDc.chunk_alias !== sc.chunk_id) {
            sequenceValid = false;
        }
    }
    console.log("Chunk Integrity:", allValid ? "PASS" : "FAIL");
    console.log("Chronological Sequence (chunk_index ASC reconstructs):", sequenceValid ? "PASS" : "FAIL");

    console.log("\n--- Concept Verification ---");
    const { data: dbConcepts } = await supabaseAdmin.from('concepts').select('*').eq('course_id', courseId);
    let conceptsValid = true;
    for (const sc of sourceConcepts) {
        const dc = dbConcepts.find(c => c.concept_alias === sc.concept_id);
        if (!dc) { conceptsValid = false; console.log(`Missing concept_alias: ${sc.concept_id}`); continue; }
        if (sc.name && !dc.name) { conceptsValid = false; console.log(`${sc.concept_id} missing name`); }
        if (sc.description && !dc.description) { conceptsValid = false; console.log(`${sc.concept_id} missing description`); }
        if (sc.confidence && !dc.confidence) { conceptsValid = false; console.log(`${sc.concept_id} missing confidence`); }
    }
    const { count: orphanConcepts } = await supabaseAdmin.from('concepts').select('id', { count: 'exact', head: true }).is('course_id', null);
    console.log("Concept Integrity:", conceptsValid && orphanConcepts === 0 ? "PASS" : "FAIL");

    console.log("\n--- Concept Evidence Verification ---");
    const { data: allEv } = await supabaseAdmin.from('concept_evidence').select('chunk_id, chunk:chunks(course_id)');
    // Filter to only evidence pointing to THIS course's concepts (since concept_evidence links via concept_id... wait we need a join)
    const { data: myConceptEv } = await supabaseAdmin.from('concept_evidence').select('concept_id, chunk_id, chunks(course_id), concepts(course_id)').eq('concepts.course_id', courseId);

    let validEv = 0, invalidEv = 0, orphanEv = 0;
    for (const ev of myConceptEv) {
        if (!ev.chunk_id) orphanEv++;
        else if (ev.chunks && ev.chunks.course_id === courseId) validEv++;
        else invalidEv++;
    }
    console.log(`valid evidence links: ${validEv}`);
    console.log(`invalid evidence links: ${invalidEv}`);
    console.log(`orphan evidence links: ${orphanEv}`);
}

runDSAVerification();
