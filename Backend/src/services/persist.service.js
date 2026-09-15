const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

const DATA_DIR = path.join(__dirname, '../data');

/**
 * Ensures course and document exist in DB, returns { courseId, documentId }
 */
async function registerUploadRecord(courseName, filename, userId) {
    let courseId;
    let documentId;

    // 1. Get or Create Course
    const { data: existingCourse } = await supabaseAdmin.from('courses').select('id').eq('name', courseName).single();
    if (existingCourse) {
        courseId = existingCourse.id;
    } else {
        const { data: newCourse, error } = await supabaseAdmin.from('courses')
            .insert({ name: courseName, status: 'draft', created_by: userId })
            .select('id').single();
        if (error) throw error;
        courseId = newCourse.id;
    }

    // 2. Register Document
    const storageUrl = `courses/${courseId}/documents/${filename}`;
    const { data: existingDoc } = await supabaseAdmin.from('documents').select('id').eq('course_id', courseId).eq('filename', filename).single();

    if (existingDoc) {
        documentId = existingDoc.id;
    } else {
        const { data: newDoc, error: docErr } = await supabaseAdmin.from('documents')
            .insert({ course_id: courseId, filename, storage_url: storageUrl, uploaded_by: userId })
            .select('id').single();
        if (docErr) throw docErr;
        documentId = newDoc.id;
    }

    // 3. Init Ingestion Job
    await supabaseAdmin.from('ingestion_jobs').upsert({
        course_id: courseId,
        document_id: documentId,
        status: 'processing',
        stage: 'Started',
        created_by: userId
    }, { onConflict: 'id', ignoreDuplicates: false });

    return { courseId, documentId };
}

/**
 * Updates ingestion tracking safely
 */
async function updateIngestionStatus(courseName, status, stage, errorLog = null) {
    try {
        const { data: course } = await supabaseAdmin.from('courses').select('id').eq('name', courseName).single();
        if (!course) return;

        await supabaseAdmin.from('ingestion_jobs')
            .update({ status, stage, error_log: errorLog, updated_at: new Date().toISOString() })
            .eq('course_id', course.id);
    } catch (e) {
        console.error("Failed to update ingestion status:", e);
    }
}

/**
 * Parses C6 pipeline artifacts and uploads securely to PG
 */
async function savePipelineArtifactsToSupabase(courseName, courseId, documentId) {
    try {
        // Chunks
        const chunksPath = path.join(DATA_DIR, `${courseName}_chunks.json`);
        let chunkAliasToId = {};
        if (fs.existsSync(chunksPath)) {
            const chunksData = JSON.parse(fs.readFileSync(chunksPath, 'utf8'));
            for (const chunk of chunksData) {
                const chunkIdRaw = chunk.id || chunk.chunk_id;
                if (!chunkIdRaw) continue;

                const { data: existing } = await supabaseAdmin.from('chunks').select('id').eq('course_id', courseId).eq('chunk_alias', chunkIdRaw).single();

                let dbChunkId;
                if (!existing) {
                    const { data: inserted } = await supabaseAdmin.from('chunks').insert({
                        course_id: courseId, document_id: documentId,
                        chunk_alias: chunkIdRaw, topic: chunk.topic || null, chapter: chunk.chapter || null,
                        section: chunk.section || null, page_start: chunk.page_start || null, page_end: chunk.page_end || null,
                        text_content: chunk.text || ''
                    }).select('id').single();
                    if (inserted) dbChunkId = inserted.id;
                } else {
                    dbChunkId = existing.id;
                }
                if (dbChunkId) chunkAliasToId[chunkIdRaw] = dbChunkId;
            }
        }

        // Concepts
        const conceptsPath = path.join(DATA_DIR, `${courseName}_concepts.json`);
        let conceptAliasToId = {};
        if (fs.existsSync(conceptsPath)) {
            const conceptsData = JSON.parse(fs.readFileSync(conceptsPath, 'utf8'));
            for (const concept of conceptsData.concepts || []) {
                const { data: existing } = await supabaseAdmin.from('concepts').select('id').eq('course_id', courseId).eq('concept_alias', concept.concept_id).single();
                let dbConceptId;
                if (!existing) {
                    const { data: inserted } = await supabaseAdmin.from('concepts').insert({
                        course_id: courseId, concept_alias: concept.concept_id,
                        name: concept.name || 'Unnamed', description: concept.description || null, confidence: concept.confidence || null
                    }).select('id').single();
                    if (inserted) dbConceptId = inserted.id;
                } else {
                    dbConceptId = existing.id;
                }

                if (dbConceptId) {
                    conceptAliasToId[concept.concept_id] = dbConceptId;

                    if (concept.evidence && Array.isArray(concept.evidence)) {
                        for (const ev of concept.evidence) {
                            const mappedChunk = chunkAliasToId[ev.chunk_id];
                            if (mappedChunk) {
                                await supabaseAdmin.from('concept_evidence').upsert({
                                    concept_id: dbConceptId, chunk_id: mappedChunk, classification: ev.classification || null
                                }, { onConflict: 'concept_id, chunk_id' }).catch(() => null);
                            }
                        }
                    }
                }
            }
        }

        // Prerequisites
        const prereqsPath = path.join(DATA_DIR, `${courseName}_prerequisites.json`);
        if (fs.existsSync(prereqsPath)) {
            const prereqsData = JSON.parse(fs.readFileSync(prereqsPath, 'utf8'));
            const relationshipsToProcess = Array.isArray(prereqsData) ? prereqsData : (prereqsData.relationships || []);

            for (const rel of relationshipsToProcess) {
                const sourceId = conceptAliasToId[rel.concept_id || rel.target_concept];
                const prereqId = conceptAliasToId[rel.prerequisite_id || rel.prerequisite_concept];
                if (sourceId && prereqId && sourceId !== prereqId) {
                    await supabaseAdmin.from('prerequisite_relationships').upsert({
                        course_id: courseId,
                        target_concept_id: sourceId,
                        prerequisite_concept_id: prereqId,
                        relationship_type: rel.relationship || rel.relationship_type || null,
                        confidence: rel.confidence || null,
                        reason: rel.reason || null,
                        status: 'candidate'
                    }, { onConflict: 'target_concept_id, prerequisite_concept_id' }).catch(() => null);
                }
            }
        }

    } catch (e) {
        console.error(`PG Persistence Error for ${courseName}:`, e);
    }
}

module.exports = {
    registerUploadRecord,
    updateIngestionStatus,
    savePipelineArtifactsToSupabase
};
