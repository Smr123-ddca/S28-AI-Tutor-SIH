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
        await supabaseAdmin.from('profiles').insert([{ id: sUser.user.id, role: 'student', display_name: 'Test Student C' }]);
        let { data: sAuth } = await supabaseAdmin.auth.signInWithPassword({ email: studentEmail, password });
        const studentToken = sAuth.session.access_token;

        const student_uuid = crypto.randomUUID();
        const session1_uuid = crypto.randomUUID();
        const session2_uuid = crypto.randomUUID();

        const student2_uuid = crypto.randomUUID();
        const session3_uuid = crypto.randomUUID();

        async function askQuestion(question, studentId, sessionId) {
            await fetch('http://localhost:3000/api/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${studentToken}` },
                body: JSON.stringify({ question, student_id: studentId, session_id: sessionId })
            });
        }

        // 1. Ask three questions (answered, insufficient, guided)
        console.log("Asking Q1 (Answerable)...");
        await askQuestion('What are nucleotides?', student_uuid, session1_uuid);
        console.log("Asking Q2 (Insufficient evidence)...");
        await askQuestion('How do cars fly?', student_uuid, session1_uuid);
        console.log("Asking Q3 (Guided / homework)...");
        await askQuestion('solve this exam question: What is 2+2?', student_uuid, session1_uuid);

        // 3. Reload page (new session, same student)
        console.log("Asking Q4 (Reloaded tab - Session 2)...");
        await askQuestion('Tell me about history.', student_uuid, session2_uuid);

        // 4. Second browser (new student, new session)
        console.log("Asking Q5 (Student B)...");
        await askQuestion('What is biology?', student2_uuid, session3_uuid);

        // 2 & 4. Verify endpoints
        console.log("Fetching logs...");
        const res1 = await fetch(`http://localhost:3000/api/chat-logs?student_id=${student_uuid}`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const logs1 = await res1.json();

        const res2 = await fetch(`http://localhost:3000/api/chat-logs`, {
            headers: { 'Authorization': `Bearer ${studentToken}` }
        });
        const logsAll = await res2.json();

        const finalReport = {
            student1Logs: logs1.logs.map(l => ({
                question: l.question,
                session_id: l.session_id,
                status: l.response.status
            })),
            totalLogsInSystem: logsAll.logs.length,
            doesStudent1SeeStudent2: logs1.logs.some(l => l.student_id === student2_uuid)
        };

        fs.writeFileSync(path.join(__dirname, 'results_c.json'), JSON.stringify(finalReport, null, 2));
        console.log("Spike Test C Finished and written to results_c.json");
    } catch (e) {
        fs.writeFileSync(path.join(__dirname, 'results_c.json'), JSON.stringify({ error: e.stack }, null, 2));
    }
}

runTests().catch(console.error);
