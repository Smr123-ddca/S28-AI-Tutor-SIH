const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { registerUploadRecord, savePipelineArtifactsToSupabase } = require('../src/services/persist.service');
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

async function getAdminId() {
    const { data } = await supabaseAdmin.from('profiles').select('id').eq('role', 'teacher').limit(1).single();
    if (data) return data.id;
    throw new Error("No teacher profile found to own the document!");
}

async function verifySubject(courseName, courseId) {
    const report = { name: courseName, source_chunks: 0, db_chunks: 0, source_concepts: 0, db_concepts: 0, skipped: 0 };
    try {
        const chData = JSON.parse(fs.readFileSync(path.join(__dirname, `../src/data/${courseName}_chunks.json`), 'utf8'));
        report.source_chunks = chData.length;
        const cData = JSON.parse(fs.readFileSync(path.join(__dirname, `../src/data/${courseName}_concepts.json`), 'utf8'));
        report.source_concepts = cData.concepts ? cData.concepts.length : cData.length;

        // Count prerequisites to signify skipped records
        const pData = JSON.parse(fs.readFileSync(path.join(__dirname, `../src/data/${courseName}_prerequisites.json`), 'utf8'));
        report.skipped = pData.relationships ? pData.relationships.length : pData.length;
    } catch (e) { }

    const { count: cCount } = await supabaseAdmin.from('chunks').select('*', { count: 'exact', head: true }).eq('course_id', courseId);
    report.db_chunks = cCount;

    const { count: conCount } = await supabaseAdmin.from('concepts').select('*', { count: 'exact', head: true }).eq('course_id', courseId);
    report.db_concepts = conCount;

    return report;
}

async function runImport() {
    console.log("=== STARTING P2C-5 LEGACY IMPORT (ECONOMICS ONLY) ===");
    const userId = await getAdminId();
    const finalReport = [];
    const sub = { name: "Economics_Chunking_Reference", doc: "econ_document.pdf" };

    try {
        const { courseId, documentId } = await registerUploadRecord(sub.name, sub.doc, userId);
        await savePipelineArtifactsToSupabase(sub.name, courseId, documentId, { skipPrerequisites: true });
        const stats = await verifySubject(sub.name, courseId);
        finalReport.push(stats);
    } catch (e) {
        console.error(`Failed on ${sub.name}:`, e.message);
        finalReport.push({ name: sub.name, error: e.message });
    }

    console.log("\n=== FINAL REPORT ===");
    console.log(JSON.stringify(finalReport, null, 2));
}

runImport();
