const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');
const { registerUploadRecord, savePipelineArtifactsToSupabase } = require('../src/services/persist.service');

const DATA_DIR = path.join(__dirname, '../src/data');

const SUBJECTS_PREREQS_ONLY = [
    { name: "DSA_Code_Reference_Annotated" },
    { name: "Economics_Chunking_Reference" },
    { name: "DBMS_Code_Reference_Annotated" }
];

const IES_SUBJECT = { name: "IES_Demo_Course_Structured", doc: "ies_demo.pdf" };

async function seedPrereqs() {
    console.log("=== STARTING PHASE 1 DEMO PREREQUISITE SEED ===");

    // 1. Get Admin / Teacher User ID
    const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('role', 'teacher').limit(1).single();
    if (!profile) throw new Error("No teacher profile found!");
    const userId = profile.id;

    // 2. Full ingestion for IES (Chunks, Concepts, Evidence, Prereqs)
    console.log(`\nImporting full dataset for ${IES_SUBJECT.name}...`);
    try {
        const { courseId, documentId } = await registerUploadRecord(IES_SUBJECT.name, IES_SUBJECT.doc, userId);
        // We do NOT skip prerequisites for IES, so we pass { skipPrerequisites: false }
        await savePipelineArtifactsToSupabase(IES_SUBJECT.name, courseId, documentId, { skipPrerequisites: false });
        console.log(`Successfully imported IES dataset including prerequisites.`);
    } catch (e) {
        console.error(`Failed to ingest IES:`, e);
    }

    // 3. Isolated Prerequisite Injection for DSA, DBMS, Econ (Leaves chunks/concepts/evidence untouched)
    for (const sub of SUBJECTS_PREREQS_ONLY) {
        console.log(`\nWiring curated prerequisites for ${sub.name}...`);
        try {
            const { data: course } = await supabaseAdmin.from('courses').select('id').eq('name', sub.name).single();
            if (!course) {
                console.log(`Course ${sub.name} not found. Skipping.`);
                continue;
            }

            // Fetch live concepts to map alias -> UUID strictly from DB truth
            const { data: concepts } = await supabaseAdmin.from('concepts').select('id, concept_alias').eq('course_id', course.id);
            const aliasMap = {};
            concepts.forEach(c => aliasMap[c.concept_alias] = c.id);

            const prereqsPath = path.join(DATA_DIR, `${sub.name}_prerequisites.json`);
            if (fs.existsSync(prereqsPath)) {
                const pData = JSON.parse(fs.readFileSync(prereqsPath, 'utf8'));
                let inserted = 0;
                let rejected = 0;

                for (const rel of pData) {
                    const sourceUuid = aliasMap[rel.target_concept];
                    const prereqUuid = aliasMap[rel.prerequisite_concept];

                    // Safely drop self-loops or ghosts natively.
                    if (sourceUuid && prereqUuid && sourceUuid !== prereqUuid) {
                        const { error } = await supabaseAdmin.from('prerequisite_relationships').upsert({
                            course_id: course.id,
                            target_concept_id: sourceUuid,
                            prerequisite_concept_id: prereqUuid,
                            relationship_type: rel.relationship_type,
                            confidence: rel.confidence_score,
                            reason: rel.reasoning,
                            status: 'candidate'
                        }, { onConflict: 'target_concept_id, prerequisite_concept_id' });

                        if (error) {
                            fs.writeFileSync('true_error.txt', JSON.stringify(error, null, 2));
                            console.error(`Error upserting edge: ${error.message}`);
                            rejected++;
                        } else {
                            inserted++;
                        }
                    } else {
                        console.log(`Rejected invalid edge (Missing UUID or Self-Loop): ${rel.prerequisite_concept} -> ${rel.target_concept}`);
                        rejected++;
                    }
                }
                console.log(`Successfully mapped ${inserted} prerequisites. Rejected ${rejected} due to native constraints.`);
            } else {
                console.log(`No _prerequisites.json found for ${sub.name}`);
            }

        } catch (e) {
            console.error(`Failed to wire ${sub.name}:`, e);
        }
    }

    console.log("\n=== PREREQUISITE SEEDING COMPLETE ===");
}

seedPrereqs();
