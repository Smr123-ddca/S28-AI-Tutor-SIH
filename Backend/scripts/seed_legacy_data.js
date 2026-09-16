const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { registerUploadRecord, savePipelineArtifactsToSupabase } = require('../src/services/persist.service');
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

const SUBJECTS = [
    { name: "DSA_Code_Reference_Annotated", doc: "dsa_document.pdf" }
];

async function getAdminId() {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('role', 'teacher').limit(1).single();
    if (data) return data.id;
    throw new Error("No teacher profile found to own the document!");
}

async function verifySubject(courseName, courseId) {
    const report = { name: courseName, source_chunks: 0, db_chunks: 0, source_concepts: 0, db_concepts: 0, evidence_links: 0, chronology: "PASS", orphans: 0 };

    // Read source metrics
    try {
        const chData = JSON.parse(fs.readFileSync(path.join(__dirname, `../src/data/${courseName}_chunks.json`), 'utf8'));
        report.source_chunks = chData.length;
        const cData = JSON.parse(fs.readFileSync(path.join(__dirname, `../src/data/${courseName}_concepts.json`), 'utf8'));
        report.source_concepts = cData.concepts ? cData.concepts.length : cData.length;
    } catch (e) { }

    // Verify DB metrics
    const { count: cCount } = await supabaseAdmin.from('chunks').select('*', { count: 'exact', head: true }).eq('course_id', courseId);
    report.db_chunks = cCount;

    const { count: conCount } = await supabaseAdmin.from('concepts').select('*', { count: 'exact', head: true }).eq('course_id', courseId);
    report.db_concepts = conCount;

    // Verify evidence associations
    const { data: concepts } = await supabaseAdmin.from('concepts').select('id').eq('course_id', courseId);
    let evLinks = 0;
    for (const c of concepts) {
        const { count } = await supabaseAdmin.from('concept_evidence').select('*', { count: 'exact', head: true }).eq('concept_id', c.id);
        evLinks += count;
    }
    report.evidence_links = evLinks;

    // Verify orphans
    const { count: orphC } = await supabaseAdmin.from('chunks').select('*', { count: 'exact', head: true }).eq('course_id', courseId).is('document_id', null);
    const { count: orphCon } = await supabaseAdmin.from('concepts').select('*', { count: 'exact', head: true }).eq('course_id', courseId).is('name', null);
    report.orphans = orphC + orphCon;

    // Chronology check
    const { data: chunksOrdered, error: ordErr } = await supabaseAdmin.from('chunks').select('chunk_index').eq('course_id', courseId).order('chunk_index', { ascending: true });
    if (ordErr) console.log(`[Warn] DB error fetching chronology: ${ordErr.message}`);
    let isSorted = true;
    if (chunksOrdered) {
        for (let i = 1; i < chunksOrdered.length; i++) {
            if (chunksOrdered[i].chunk_index < chunksOrdered[i - 1].chunk_index) isSorted = false;
        }
    }
    report.chronology = isSorted && chunksOrdered && chunksOrdered.length > 0 && chunksOrdered[0].chunk_index !== null ? "PASS" : "FAIL";

    return report;
}

async function runImport() {
    console.log("=== STARTING P2C-5 LEGACY IMPORT ===");
    const userId = await getAdminId();

    const finalReport = [];

    for (const sub of SUBJECTS) {
        console.log(`\nImporting ${sub.name}...`);
        try {
            const { courseId, documentId } = await registerUploadRecord(sub.name, sub.doc, userId);

            // Skip Prerequisites explicitly
            await savePipelineArtifactsToSupabase(sub.name, courseId, documentId, { skipPrerequisites: true });

            const stats = await verifySubject(sub.name, courseId);
            finalReport.push(stats);
            console.log(`Success: ${sub.name}`);
        } catch (e) {
            console.error(`Failed on ${sub.name}:`, e);
            finalReport.push({ name: sub.name, error: e.message });
        }
    }

    console.log("\n=== FINAL REPORT ===");
    console.log(JSON.stringify(finalReport, null, 2));
}

runImport();
