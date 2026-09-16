const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

const DATA_DIR = path.join(__dirname, '../src/data');
const COURSES = [
    'DBMS_Code_Reference_Annotated',
    'Economics_Chunking_Reference',
    'DSA_Code_Reference_Annotated'
];

async function runRepair() {
    const isDryRun = process.argv.includes('--dry-run');
    console.log(`=== STARTING CONCEPT EVIDENCE REPAIR ${isDryRun ? '(DRY RUN)' : ''} ===`);

    let finalReport = {
        filesChanged: ['c:\\Users\\HP\\OneDrive\\Documents\\GitHub\\S28-AI-Tutor-SIH\\Backend\\src\\services\\persist.service.js', 'c:\\Users\\HP\\OneDrive\\Documents\\GitHub\\S28-AI-Tutor-SIH\\Backend\\scripts\\repair_concept_evidence.js'],
        sqlConstraint: 'Added UNIQUE(concept_id, chunk_id)',
        scriptLocation: 'Backend/scripts/repair_concept_evidence.js',
        globalTotalEvidenceInserted: 0,
        unresolvedMappings: 0,
        crossCourseMappings: 0,
        conceptsZeroEvidence: 0,
        courseCounts: { DBMS: 0, Economics: 0, DSA: 0 },
        isIdempotent: true
    };

    let hasFatalError = false;

    for (const courseName of COURSES) {
        console.log(`\n\n--- Processing Course: ${courseName} ---`);

        // 1. Resolve DB Course
        const { data: dbCourse, error: cErr } = await supabaseAdmin.from('courses').select('id, name').eq('name', courseName).single();
        if (cErr || !dbCourse) {
            console.error(`[UNRESOLVED] Course DB resolution failed for ${courseName}`);
            hasFatalError = true;
            continue;
        }

        // 2. Resolve DB Concepts
        const { data: dbConcepts } = await supabaseAdmin.from('concepts').select('id, concept_alias, course_id').eq('course_id', dbCourse.id);
        const conceptMap = {}; // alias -> id
        const conceptIdToCourse = {};
        for (let c of dbConcepts) {
            conceptMap[c.concept_alias] = c.id;
            conceptIdToCourse[c.id] = c.course_id;
        }

        // 3. Resolve DB Chunks
        const { data: dbChunks } = await supabaseAdmin.from('chunks').select('id, chunk_alias, course_id').eq('course_id', dbCourse.id);
        const chunkMap = {}; // alias -> id
        const chunkIdToCourse = {};
        for (let ch of dbChunks) {
            chunkMap[ch.chunk_alias] = ch.id;
            chunkIdToCourse[ch.id] = ch.course_id;
        }

        console.log(`DB Context: ${dbConcepts.length} concepts, ${dbChunks.length} chunks mapped.`);

        // 4. Load Legacy JSON
        const conceptsPath = path.join(DATA_DIR, `${courseName}_concepts.json`);
        if (!fs.existsSync(conceptsPath)) {
            console.error(`No legacy concepts file found for ${courseName}`);
            continue;
        }

        const conceptsData = JSON.parse(fs.readFileSync(conceptsPath, 'utf8'));
        const legacyConcepts = conceptsData.concepts || conceptsData;
        console.log(`JSON Context: ${legacyConcepts.length} legacy concepts found.`);

        let insertedForCourse = 0;

        for (const concept of legacyConcepts) {
            const dbConceptId = conceptMap[concept.concept_id];

            if (!dbConceptId) {
                console.error(`[UNRESOLVED] course=${courseName} | concept=${concept.concept_id} | reason=db concept not found`);
                finalReport.unresolvedMappings++;
                hasFatalError = true;
                continue;
            }

            if (!concept.evidence || concept.evidence.length === 0) {
                finalReport.conceptsZeroEvidence++;
                continue;
            }

            for (const ev of concept.evidence) {
                const dbChunkId = chunkMap[ev.chunk_id];
                if (!dbChunkId) {
                    console.error(`[UNRESOLVED] course=${courseName} | concept=${concept.concept_id} | chunk=${ev.chunk_id} | reason=chunk alias not found`);
                    finalReport.unresolvedMappings++;
                    hasFatalError = true;
                    continue;
                }

                if (conceptIdToCourse[dbConceptId] !== chunkIdToCourse[dbChunkId]) {
                    console.error(`[CRITICAL] Cross-course mapping detected! Concept ${dbConceptId} vs Chunk ${dbChunkId}`);
                    finalReport.crossCourseMappings++;
                    hasFatalError = true;
                    continue;
                }

                // Ready for upsert
                if (!isDryRun) {
                    const { error: evErr } = await supabaseAdmin.from('concept_evidence').upsert({
                        concept_id: dbConceptId,
                        chunk_id: dbChunkId,
                        classification: ev.classification || 'EXPLANATION'
                    }, { onConflict: 'concept_id, chunk_id' });

                    if (evErr) {
                        console.error(`[UNRESOLVED] course=${courseName} | concept=${concept.concept_id} | chunk=${ev.chunk_id} | reason=upsert failed: ${evErr.message}`);
                        finalReport.unresolvedMappings++;
                        hasFatalError = true;
                    } else {
                        insertedForCourse++;
                        finalReport.globalTotalEvidenceInserted++;
                    }
                } else {
                    insertedForCourse++;
                    finalReport.globalTotalEvidenceInserted++;
                }
            }
        }

        let reportName = courseName;
        if (courseName.includes('DBMS')) finalReport.courseCounts.DBMS = insertedForCourse;
        if (courseName.includes('Economics')) finalReport.courseCounts.Economics = insertedForCourse;
        if (courseName.includes('DSA')) finalReport.courseCounts.DSA = insertedForCourse;
        console.log(`Action: ${isDryRun ? 'Would insert' : 'Inserted'} ${insertedForCourse} evidence rows for ${courseName}.`);
    }

    console.log(`\n=== FINAL REPAIR REPORT ===`);
    console.log(JSON.stringify(finalReport, null, 2));

    if (hasFatalError) {
        console.log("Exiting with status 1 due to unresolved mappings or fatal errors.");
        process.exit(1);
    }
}

runRepair();
