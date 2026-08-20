const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function runTests() {
    const teacherEmail = `teacher_${Date.now()}@test.com`;
    const password = 'password123';

    let { data: tUser } = await supabaseAdmin.auth.admin.createUser({
        email: teacherEmail, password, email_confirm: true, user_metadata: { role: 'teacher' }
    });
    await supabaseAdmin.from('profiles').insert([{ id: tUser.user.id, role: 'teacher', display_name: 'Test Teacher' }]);
    let { data: tAuth } = await supabaseAdmin.auth.signInWithPassword({ email: teacherEmail, password });
    const teacherToken = tAuth.session.access_token;

    const studentEmail = `student_${Date.now()}@test.com`;
    let { data: sUser } = await supabaseAdmin.auth.admin.createUser({
        email: studentEmail, password, email_confirm: true, user_metadata: { role: 'student' }
    });
    await supabaseAdmin.from('profiles').insert([{ id: sUser.user.id, role: 'student', display_name: 'Test Student' }]);
    let { data: sAuth } = await supabaseAdmin.auth.signInWithPassword({ email: studentEmail, password });
    const studentToken = sAuth.session.access_token;

    const validPdfPath = path.join(__dirname, 'test_biology.pdf');
    const validPptxPath = path.join(__dirname, 'test_history.pptx');
    const invalidDocxPath = path.join(__dirname, 'test_notes.docx');

    fs.writeFileSync(validPdfPath, '%PDF-1.4 mock content');
    fs.writeFileSync(validPptxPath, 'PK\x03\x04 mock pptx format');
    fs.writeFileSync(invalidDocxPath, 'PK\x03\x04 mock docx format');

    const API_URL = 'http://localhost:3000/api/ingest/upload';

    async function upload(token, filesToUpload) {
        const formData = new FormData();
        for (const f of filesToUpload) {
            const buffer = fs.readFileSync(f.filepath);
            const blob = new Blob([buffer], { type: f.mimetype });
            formData.append('files', blob, path.basename(f.filepath));
        }

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: formData
        });

        return { status: res.status, data: await res.json().catch(e => null) };
    }

    const test1 = await upload(teacherToken, [
        { filepath: validPdfPath, mimetype: 'application/pdf' },
        { filepath: validPptxPath, mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
        { filepath: invalidDocxPath, mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }
    ]);

    const test2 = await upload(teacherToken, [
        { filepath: validPdfPath, mimetype: 'application/pdf' }
    ]);

    const test3Raw = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const test3 = { status: test3Raw.status, data: await test3Raw.json().catch(e => null) };

    const test4 = await upload(studentToken, [
        { filepath: validPdfPath, mimetype: 'application/pdf' }
    ]);

    const batchId2 = test2.data?.batch_id;
    const fetchBatch = await fetch(`http://localhost:3000/api/ingest/batch/${batchId2}`, {
        headers: { 'Authorization': `Bearer ${teacherToken}` }
    });
    const test5 = { status: fetchBatch.status, data: await fetchBatch.json().catch(e => null) };

    fs.unlinkSync(validPdfPath);
    fs.unlinkSync(validPptxPath);
    fs.unlinkSync(invalidDocxPath);

    const finalReport = {
        test1_AllThree: test1,
        test2_SingleValid: test2,
        test3_NoFiles: test3,
        test4_NoTeacher: test4,
        test5_Accessor: test5
    };
    fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(finalReport, null, 2));
}

runTests().catch(e => {
    fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({ error: e.message }));
});
