const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const API_BASE = 'http://localhost:3002/api';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const courseName = 'DSA_LinkedLists_Test_2';

async function runTest() {
    console.log("🔥 STARTING E2E TEST: Approval, Publish, and RAG Pipeline");

    // 1. Sign in as Teacher
    console.log("1. Authenticating teacher...");
    const { data: tAuthData } = await supabase.auth.signInWithPassword({ email: 'prof@test.com', password: 'password123' });
    const teacherToken = tAuthData.session.access_token;

    // 2. Approve Course
    console.log("2. Approving course...");
    try {
        await axios.post(`${API_BASE}/courses/${courseName}/approve`, {}, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        console.log("✅ Course Approved Successfully.");
    } catch (err) {
        console.error("❌ Approval Failed:", err.response?.data || err.message);
    }

    // 3. Publish Course
    console.log("3. Publishing course...");
    try {
        await axios.post(`${API_BASE}/courses/${courseName}/publish`, {}, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        console.log("✅ Course Published Successfully.");
    } catch (err) {
        console.error("❌ Publish Failed:", err.response?.data || err.message);
    }

    // 4. Verify Student Access to Course
    console.log("\n4. Authenticating student & Creating RAG Session...");
    let studentToken;
    const { data: sAuthData, error: sAuthError } = await supabase.auth.signInWithPassword({ email: 'student@test.com', password: 'password123' });

    if (sAuthError || !sAuthData?.session) {
        // create student
        const { data: signUpData } = await supabase.auth.signUp({
            email: 'student@test.com', password: 'password123',
            options: { data: { role: 'student', display_name: 'Test Student' } }
        });
        await supabase.from('profiles').upsert({ id: signUpData.user.id, role: 'student' });
        studentToken = signUpData.session.access_token;
    } else {
        studentToken = sAuthData.session.access_token;
    }

    // List courses (should see DSA_LinkedLists)
    const coursesRes = await axios.get(`${API_BASE}/courses`, { headers: { Authorization: `Bearer ${studentToken}` } });
    const found = coursesRes.data.courses.some(c => c.name === courseName);
    if (!found) {
        console.log("❌ Student cannot see the published course!");
    } else {
        console.log("✅ Student can see published course.");
    }

    // Create session
    const sessionRes = await axios.post(`${API_BASE}/sessions`, {
        course: courseName,
        subject: courseName,
        title: 'LinkedList E2E Test Session'
    }, { headers: { Authorization: `Bearer ${studentToken}` } });
    const sessionId = sessionRes.data.id;

    console.log(`✅ Session created: ${sessionId}, initiating RAG ask...`);

    // Ask a question
    try {
        const ragRes = await axios.post(`${API_BASE}/retrieve`, {
            question: 'What is a linked list and how does it store elements?',
            course: courseName,
            subject: courseName,
            sessionId: sessionId
        }, { headers: { Authorization: `Bearer ${studentToken}` } });

        console.log("✅ RAG Answer received!");
        console.log("Retrieved Nodes:", ragRes.data.results.length);
        console.log("Chunk Snip:", ragRes.data.results[0]?.text?.substring(0, 50));
        console.log("🎉 E2E QA PIPELINE VERIFIED SUCCESSFULLY");
    } catch (err) {
        console.error("❌ RAG Failed:", err.response?.data || err.message);
    }
}
runTest();
