const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables for supabaseAdmin
dotenv.config({ path: path.join(__dirname, '../.env') });
const supabaseAdmin = require('../src/lib/supabaseAdmin');

const DATA_DIR = path.join(__dirname, '../src/data');

async function migrateCourses() {
    console.log('--- Starting Migration Backfill ---');

    // 1. Migrate courses.json
    const coursesPath = path.join(DATA_DIR, 'courses.json');
    if (!fs.existsSync(coursesPath)) {
        console.log('courses.json not found, skipping.');
        return;
    }

    const coursesData = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
    for (const [courseName, metadata] of Object.entries(coursesData)) {
        console.log(`Processing course: ${courseName}`);

        // Ensure course exists
        const { data: existingCourse, error: checkError } = await supabaseAdmin
            .from('courses')
            .select('*')
            .eq('name', courseName)
            .single();

        let courseId;

        if (checkError && checkError.code !== 'PGRST116') {
            console.error(`Error checking course ${courseName}:`, checkError);
            continue;
        }

        if (!existingCourse) {
            // Insert course
            const { data: newCourse, error: insertError } = await supabaseAdmin
                .from('courses')
                .insert({
                    name: courseName,
                    status: metadata.status || 'draft',
                    approved_by: metadata.audit?.approvedBy || null,
                    approved_at: metadata.audit?.approvedAt || null
                })
                .select('*')
                .single();

            if (insertError) {
                console.error(`Failed to insert course ${courseName}:`, insertError);
                continue;
            }
            courseId = newCourse.id;
            console.log(`Inserted course ${courseName} -> ${courseId}`);
        } else {
            courseId = existingCourse.id;
            console.log(`Course ${courseName} already exists -> ${courseId}`);
        }

        // 2. Migrate documents (assuming file is locally available or handled separately)
        // Here we just insert the DB record if the PDF was recorded
        let documentId = null;
        if (metadata.pdf) {
            // Only add document if it doesn't already exist for this course + filename combo
            const { data: existingDoc } = await supabaseAdmin
                .from('documents')
                .select('*')
                .eq('course_id', courseId)
                .eq('filename', metadata.pdf)
                .single();

            if (!existingDoc) {
                // Determine storage path
                const storageUrl = `courses/${courseId}/documents/${metadata.pdf}`;
                const { data: newDoc, error: docInsertError } = await supabaseAdmin
                    .from('documents')
                    .insert({
                        course_id: courseId,
                        filename: metadata.pdf,
                        storage_url: storageUrl
                    })
                    .select('*')
                    .single();

                if (docInsertError) {
                    console.error(`Failed to insert document ${metadata.pdf}:`, docInsertError);
                } else {
                    documentId = newDoc.id;
                    console.log(`Inserted document ${metadata.pdf} -> ${documentId}`);
                }
            } else {
                documentId = existingDoc.id;
                console.log(`Document ${metadata.pdf} already exists -> ${documentId}`);
            }
        }

        // 3. Migrate Chunks
        const chunksPath = path.join(DATA_DIR, `${courseName}_chunks.json`);
        let chunkAliasToId = {};
        if (fs.existsSync(chunksPath)) {
            const chunksData = JSON.parse(fs.readFileSync(chunksPath, 'utf8'));
            for (const chunk of chunksData) {
                // Upsert chunk mapped to course
                const chunkIdRaw = typeof chunk === 'object' && chunk.id ? chunk.id : chunk.chunk_id;
                if (!chunkIdRaw) continue;

                const { data: existingChunk } = await supabaseAdmin
                    .from('chunks')
                    .select('*')
                    .eq('course_id', courseId)
                    .eq('chunk_alias', chunkIdRaw)
                    .single();

                let dbChunkId;
                if (!existingChunk) {
                    const { data: newChunk, error: chunkErr } = await supabaseAdmin
                        .from('chunks')
                        .insert({
                            course_id: courseId,
                            document_id: documentId,
                            chunk_alias: chunkIdRaw,
                            topic: chunk.topic || null,
                            chapter: chunk.chapter || null,
                            section: chunk.section || null,
                            page_start: chunk.page_start || null,
                            page_end: chunk.page_end || null,
                            text_content: chunk.text || ''
                        })
                        .select('id')
                        .single();

                    if (chunkErr) {
                        console.error(`Error inserting chunk ${chunkIdRaw}:`, chunkErr);
                        continue;
                    }
                    dbChunkId = newChunk.id;
                } else {
                    dbChunkId = existingChunk.id;
                }
                chunkAliasToId[chunkIdRaw] = dbChunkId;
            }
            console.log(`Processed ${Object.keys(chunkAliasToId).length} chunks for ${courseName}`);
        } else {
            console.log(`No chunks file found for ${courseName}`);
        }

        // 4. Migrate Concepts & Evidence
        const conceptsPath = path.join(DATA_DIR, `${courseName}_concepts.json`);
        let conceptAliasToId = {};
        if (fs.existsSync(conceptsPath)) {
            const conceptsData = JSON.parse(fs.readFileSync(conceptsPath, 'utf8'));
            for (const concept of conceptsData.concepts || []) {
                const { data: existingConcept } = await supabaseAdmin
                    .from('concepts')
                    .select('*')
                    .eq('course_id', courseId)
                    .eq('concept_alias', concept.concept_id)
                    .single();

                let dbConceptId;
                if (!existingConcept) {
                    const { data: newConcept, error: conceptErr } = await supabaseAdmin
                        .from('concepts')
                        .insert({
                            course_id: courseId,
                            concept_alias: concept.concept_id,
                            name: concept.name || 'Unnamed',
                            description: concept.description || null,
                            confidence: concept.confidence || null
                        })
                        .select('id')
                        .single();

                    if (conceptErr) {
                        console.error(`Error inserting concept ${concept.concept_id}:`, conceptErr);
                        continue;
                    }
                    dbConceptId = newConcept.id;
                } else {
                    dbConceptId = existingConcept.id;
                }
                conceptAliasToId[concept.concept_id] = dbConceptId;

                // Process Evidence mapping
                if (concept.evidence && Array.isArray(concept.evidence)) {
                    for (const ev of concept.evidence) {
                        const chunkIdMapped = chunkAliasToId[ev.chunk_id];
                        if (chunkIdMapped) {
                            // Avoid duplicates safely
                            const { data: existEv } = await supabaseAdmin
                                .from('concept_evidence')
                                .select('id')
                                .eq('concept_id', dbConceptId)
                                .eq('chunk_id', chunkIdMapped)
                                .single();

                            if (!existEv) {
                                await supabaseAdmin.from('concept_evidence').insert({
                                    concept_id: dbConceptId,
                                    chunk_id: chunkIdMapped,
                                    classification: ev.classification || null
                                });
                            }
                        } else {
                            console.log(`Unresolved evidence chunk_id: ${ev.chunk_id} for concept ${concept.concept_id}`);
                        }
                    }
                }
            }
            console.log(`Processed ${Object.keys(conceptAliasToId).length} concepts for ${courseName}`);
        } else {
            console.log(`No concepts file found for ${courseName}`);
        }

        // 5. Migrate Prerequisites
        const prereqsPath = path.join(DATA_DIR, `${courseName}_prerequisites.json`);
        if (fs.existsSync(prereqsPath)) {
            const prereqsData = JSON.parse(fs.readFileSync(prereqsPath, 'utf8'));

            // Check if relationships are grouped or flat
            const relationshipsToProcess = Array.isArray(prereqsData) ? prereqsData : (prereqsData.relationships || prereqsData.prerequisites || []);
            let count = 0;

            for (const rel of relationshipsToProcess) {
                const sourceId = conceptAliasToId[rel.concept_id || rel.target_concept];
                const prereqId = conceptAliasToId[rel.prerequisite_id || rel.prerequisite_concept];

                if (sourceId && prereqId && sourceId !== prereqId) {
                    const statusVal = metadata.status === 'published' ? 'approved' : 'candidate';

                    const { data: existPrereq } = await supabaseAdmin
                        .from('prerequisite_relationships')
                        .select('id')
                        .eq('course_id', courseId)
                        .eq('target_concept_id', sourceId)
                        .eq('prerequisite_concept_id', prereqId)
                        .single();

                    if (!existPrereq) {
                        const { error: prepErr } = await supabaseAdmin
                            .from('prerequisite_relationships')
                            .insert({
                                course_id: courseId,
                                target_concept_id: sourceId,
                                prerequisite_concept_id: prereqId,
                                relationship_type: rel.relationship || rel.relationship_type || null,
                                confidence: rel.confidence || null,
                                reason: rel.reason || null,
                                status: statusVal
                            });
                        if (prepErr) {
                            console.error(`Error inserting prerequisite ${rel.concept_id}->${rel.prerequisite_id}:`, prepErr);
                        } else {
                            count++;
                        }
                    }
                } else if (rel.concept_id || rel.prerequisite_id) {
                    console.log(`Unresolved prerequisite mapping for ${courseName}: target=${rel.concept_id}, prereq=${rel.prerequisite_id}`);
                }
            }
            console.log(`Processed ${count} prerequisite relationships for ${courseName}`);
        } else {
            console.log(`No prerequisites file found for ${courseName}`);
        }
    }

    console.log('--- Migration Backfill Complete ---');
}

migrateCourses().catch(console.error);
