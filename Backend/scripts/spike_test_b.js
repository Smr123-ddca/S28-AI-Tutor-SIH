const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function runTests() {
    try {
        const studentEmail = `student_${Date.now()}@test.com`;
        const password = 'password123';

        let { data: sUser } = await supabaseAdmin.auth.admin.createUser({
            email: studentEmail, password, email_confirm: true, user_metadata: { role: 'student' }
        });
        await supabaseAdmin.from('profiles').insert([{ id: sUser.user.id, role: 'student', display_name: 'Test Student B' }]);
        let { data: sAuth } = await supabaseAdmin.auth.signInWithPassword({ email: studentEmail, password });
        const studentToken = sAuth.session.access_token;

        const student_uuid = crypto.randomUUID();

        // 1. Ask a question returning "answered"
        const explainRes = await fetch('http://localhost:3000/api/explain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
            body: JSON.stringify({ question: 'What are nucleotides?', student_id: student_uuid })
        });
        const explainData = await explainRes.json();

        const chunkId = explainData.results?.[0]?.id || 'nucleic_acids';

        // 2. Click "Got it right" (POST /api/session-event)
        const eventRes = await fetch('http://localhost:3000/api/session-event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
            body: JSON.stringify({ student_id: student_uuid, chunk_id: chunkId, correct: true })
        });
        const eventData = await eventRes.text();
        const eventJson = JSON.parse(eventData || "{}");

        // 3. Confirm in memory
        const memoryRes = await fetch('http://localhost:3000/api/session-events');
        const memoryData = await memoryRes.json();

        // 4. Trigger Prerequisite gap
        const gapRes = await fetch('http://localhost:3000/api/detect-gap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
            body: JSON.stringify({ student_id: student_uuid, chunk_id: 'some_other_chunk' })
        });
        const gapData = await gapRes.json();

        const finalReport = {
            test1_ExplainResponse: explainData.status,
            test2_SessionEventFired: eventJson,
            test3_SessionEventsInMemory: memoryData.events ? memoryData.events.find(e => e.student_id === student_uuid) : memoryData,
            test4_DetectGap: gapData
        };

        fs.writeFileSync(path.join(__dirname, 'results_b.json'), JSON.stringify(finalReport, null, 2));
    } catch (e) {
        fs.writeFileSync(path.join(__dirname, 'results_b.json'), JSON.stringify({ error: e.stack }, null, 2));
    }
}

runTests().catch(console.error);
