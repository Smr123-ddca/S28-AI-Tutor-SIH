const path = require('path');
const supabaseAdmin = require('../lib/supabaseAdmin');
const fs = require('fs');

async function getCourseIdByName(courseName) {
    const { data } = await supabaseAdmin.from('courses').select('id').eq('name', courseName).single();
    return data ? data.id : null;
}

async function getCourses(req, res) {
    try {
        let query = supabaseAdmin.from('courses').select('*');

        // Non-teachers only see published courses natively
        if (!req.user || req.user.role !== 'teacher') {
            query = query.eq('status', 'published');
        }

        const { data: courses, error } = await query;

        if (error) throw error;

        // Map to legacy format
        const legacyCourses = courses.map(c => ({
            name: c.name,
            status: c.status,
            pdf: `${c.name}.pdf`, // Synthetic backward compatibility if needed, though they download via Storage now
            audit: {
                approvedBy: c.approved_by,
                approvedAt: c.approved_at
            }
        }));

        res.json({ courses: legacyCourses });
    } catch (error) {
        console.error('Failed to load courses:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load courses.' });
    }
}

async function approveCourse(req, res) {
    try {
        const courseName = req.params.courseName;

        const { data: course, error: fetchErr } = await supabaseAdmin
            .from('courses')
            .select('*')
            .eq('name', courseName)
            .single();

        if (fetchErr) return res.status(404).json({ error: 'Course not found' });

        if (course.status !== 'pending_review' && course.status !== 'needs_revision') {
            return res.status(400).json({ error: `Cannot approve course from state: ${course.status}` });
        }

        const approvedAt = new Date().toISOString();
        const { error: updateErr } = await supabaseAdmin
            .from('courses')
            .update({
                status: 'approved',
                approved_at: approvedAt,
                approved_by: req.user.id
            })
            .eq('id', course.id);

        if (updateErr) throw updateErr;

        res.json({
            status: 'success',
            course: {
                ...course,
                status: 'approved',
                audit: { approvedAt, approvedBy: req.user.id }
            }
        });
    } catch (error) {
        console.error('Failed to approve course:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error while approving course.' });
    }
}

async function reviseCourse(req, res) {
    try {
        const courseName = req.params.courseName;
        // reason is historically nested in audit, we just update status for now or add to string config

        const { data: course, error: fetchErr } = await supabaseAdmin
            .from('courses')
            .select('*')
            .eq('name', courseName)
            .single();

        if (fetchErr) return res.status(404).json({ error: 'Course not found' });

        if (course.status !== 'pending_review' && course.status !== 'approved') {
            return res.status(400).json({ error: `Cannot mark revision for course from state: ${course.status}` });
        }

        const { error: updateErr } = await supabaseAdmin
            .from('courses')
            .update({ status: 'needs_revision' })
            .eq('id', course.id);

        if (updateErr) throw updateErr;

        res.json({
            status: 'success',
            course: { ...course, status: 'needs_revision' }
        });
    } catch (error) {
        console.error('Failed to mark course for revision:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error while marking course for revision.' });
    }
}

async function publishCourse(req, res) {
    try {
        const courseName = req.params.courseName;

        const { data: course, error: fetchErr } = await supabaseAdmin
            .from('courses')
            .select('*')
            .eq('name', courseName)
            .single();

        if (fetchErr) return res.status(404).json({ error: 'Course not found' });

        if (course.status !== 'approved') {
            return res.status(403).json({ error: `Not Authorized: Course must be strictly 'approved' before publication.` });
        }

        // We can just rely on the existing schema and keep it simpler.
        const { error: updateErr } = await supabaseAdmin
            .from('courses')
            .update({ status: 'published' })
            .eq('id', course.id);

        if (updateErr) throw updateErr;

        const store = require('../data/store');
        store.loadData(); // Potentially deprecate later if memory store is fully replaced

        res.json({ status: 'success', course: { ...course, status: 'published' } });
    } catch (error) {
        console.error('Failed to publish course:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error while publishing course.' });
    }
}

async function getPrerequisites(req, res) {
    try {
        const courseId = await getCourseIdByName(req.params.courseName);
        if (!courseId) return res.json({ prerequisites: [] });

        const { data: prereqs, error } = await supabaseAdmin
            .from('prerequisite_relationships')
            .select(`
                reason, confidence, relationship_type, status,
                target:target_concept_id (concept_alias),
                prereq:prerequisite_concept_id (concept_alias)
            `)
            .eq('course_id', courseId);

        if (error) throw error;

        // Map to backwards compatible format expected by frontend gap viewer
        const mapped = prereqs.map(p => ({
            concept_id: p.target?.concept_alias,
            prerequisite_id: p.prereq?.concept_alias,
            relationship: p.relationship_type,
            confidence: p.confidence,
            reason: p.reason,
            status: p.status
        }));

        // Wait, is it { prerequisites: mapped } or flat mapped? The json has either [] or {relationships: []} natively.
        // Assuming array format based on updatePrerequisites mapping:
        res.json({ prerequisites: mapped });
    } catch (error) {
        console.error('Failed to get prerequisites:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
}

async function updatePrerequisites(req, res) {
    try {
        const courseId = await getCourseIdByName(req.params.courseName);
        if (!courseId) return res.status(404).json({ error: 'Course not found' });

        const { prerequisites } = req.body;
        if (!prerequisites) return res.status(400).json({ error: 'Missing prerequisites objects' });

        // Handle teacher overrides. 
        // 1. We should ideally update DB statuses. For backward compatibility, let's process each.
        // The array we get is the full list. We will UPSERT based on unique targets.

        // Lookup concept aliases to UUIDs for mapping
        const { data: concepts } = await supabaseAdmin.from('concepts').select('id, concept_alias').eq('course_id', courseId);
        if (!concepts) return res.status(500).json({ error: 'No concepts found to map' });

        const aliasMap = {};
        for (let c of concepts) aliasMap[c.concept_alias] = c.id;

        const inserts = [];
        for (const p of prerequisites) {
            const targetId = aliasMap[p.concept_id];
            const prereqId = aliasMap[p.prerequisite_id];
            if (targetId && prereqId && targetId !== prereqId) {
                inserts.push({
                    course_id: courseId,
                    target_concept_id: targetId,
                    prerequisite_concept_id: prereqId,
                    status: p.status || 'candidate',
                    reason: p.reason,
                    confidence: p.confidence,
                    relationship_type: p.relationship || p.relationship_type
                });
            }
        }

        if (inserts.length > 0) {
            // Upsert on unique constraint (target_concept_id, prerequisite_concept_id)
            await supabaseAdmin.from('prerequisite_relationships').upsert(inserts, { onConflict: 'target_concept_id, prerequisite_concept_id' });
        }

        res.json({ status: 'success', prerequisites });
    } catch (error) {
        console.error('Failed to update prerequisites:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
}

async function getArtifacts(req, res) {
    try {
        const courseName = req.params.courseName;
        const courseId = await getCourseIdByName(courseName);

        if (!courseId) return res.status(404).json({ error: 'Course not found' });

        const [chunksRes, conceptsRes, prereqsRes] = await Promise.all([
            supabaseAdmin.from('chunks').select('*').eq('course_id', courseId).order('page_start', { ascending: true }),
            supabaseAdmin.from('concepts').select('*, evidence:concept_evidence(chunk_id, classification)').eq('course_id', courseId),
            supabaseAdmin.from('prerequisite_relationships').select('*').eq('course_id', courseId)
        ]);

        // Emulate backward compatible chunk formatting
        const legacyChunks = (chunksRes.data || []).map(c => ({
            id: c.chunk_alias,
            chunk_id: c.chunk_alias,
            text: c.text_content,
            chapter: c.chapter,
            section: c.section,
            page_start: c.page_start,
            page_end: c.page_end
        }));

        // We can optionally add evidence mapping later if required but usually concepts json is enough
        res.json({
            status: 'success',
            course: courseName,
            chunks: legacyChunks,
            concepts: conceptsRes.data || [],
            prerequisites: prereqsRes.data || []
        });
    } catch (error) {
        console.error('Failed to get artifacts:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error resolving artifacts.' });
    }
}

async function deleteCourse(req, res) {
    try {
        const courseName = req.params.courseName;
        const courseId = await getCourseIdByName(courseName);
        if (!courseId) return res.status(404).json({ error: 'Course not found' });

        // Supabase ON DELETE CASCADE handles documents, chunks, concepts, prerequisites natively.
        const { error } = await supabaseAdmin.from('courses').delete().eq('id', courseId);
        if (error) throw error;

        // Leave persistent PDFs in storage or explicitly delete them (often better to tombstone or delete via edge function)
        // We also delete filesystem JSON if it exists for backwards-compat cleanup
        const dataDir = path.join(__dirname, '../data');
        const deletedFiles = [];
        if (fs.existsSync(dataDir)) {
            fs.readdirSync(dataDir).forEach(file => {
                if (file.startsWith(`${courseName}_`) || file === `${courseName}.pdf`) {
                    try { fs.unlinkSync(path.join(dataDir, file)); deletedFiles.push(file); } catch (e) { }
                }
            });
        }

        const store = require('../data/store');
        store.loadData();

        res.json({
            status: 'success',
            message: 'Course deleted permanently',
            deletedFiles
        });
    } catch (error) {
        console.error('Failed to delete course:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error while deleting.' });
    }
}

async function downloadCourseFile(req, res) {
    try {
        const courseName = req.params.courseName;
        const courseId = await getCourseIdByName(courseName);

        if (!courseId) return res.status(404).json({ error: 'Course not found' });

        // Find document in supabase
        const { data: doc } = await supabaseAdmin.from('documents').select('*').eq('course_id', courseId).single();
        if (!doc) {
            // fallback to local fs
            const filePath = path.join(__dirname, '../data', `${courseName}.pdf`);
            if (fs.existsSync(filePath)) return res.download(filePath);
            return res.status(404).json({ error: 'Document not found' });
        }

        // If we strictly rely on storage, we should redirect to supabase storage publicUrl or use download()
        const { data: urlData } = await supabaseAdmin.storage.from('documents').createSignedUrl(doc.storage_url, 60);
        if (urlData && urlData.signedUrl) {
            return res.redirect(urlData.signedUrl);
        }

        res.status(500).json({ error: 'Failed to generate download URL' });
    } catch (error) {
        console.error('Failed to serve download:', error);
        res.status(500).json({ status: 'error', message: 'Internal server error' });
    }
}

module.exports = {
    getCourses,
    approveCourse,
    reviseCourse,
    publishCourse,
    getPrerequisites,
    updatePrerequisites,
    getArtifacts,
    deleteCourse,
    downloadCourseFile
};