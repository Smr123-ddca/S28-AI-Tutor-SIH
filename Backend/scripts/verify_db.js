require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');

async function verify() {
    const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: courses } = await s.from('courses').select('id, name');
    console.log(`Courses Total: ${courses.length}`, courses.map(c => c.name));

    if (courses.length > 0) {
        const courseId = courses[0].id;
        const [docs, chunks, concepts, prereqs, jobs] = await Promise.all([
            s.from('documents').select('id').eq('course_id', courseId),
            s.from('chunks').select('id').eq('course_id', courseId),
            s.from('concepts').select('id').eq('course_id', courseId),
            s.from('prerequisite_relationships').select('id').eq('course_id', courseId),
            s.from('ingestion_jobs').select('status, stage').eq('course_id', courseId)
        ]);

        console.log(`\n--- Verification for Course [${courses[0].name}] ---`);
        console.log(`Documents: ${docs.data.length}`);
        console.log(`Chunks: ${chunks.data.length}`);
        console.log(`Concepts: ${concepts.data.length}`);
        console.log(`Prerequisite Relationships: ${prereqs.data.length}`);
        console.log(`Ingestion Jobs Found:`, jobs.data);
    }
}

verify().catch(console.error);
