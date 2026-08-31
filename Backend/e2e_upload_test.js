const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const API_BASE = 'http://localhost:3002/api';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest() {
    console.log("🔥 STARTING E2E TEST: Upload Pipeline");

    // 1. Sign in as Teacher
    console.log("1. Authenticating teacher...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'prof@test.com', // Use a standard dummy or signup if needed
        password: 'password123'
    });

    let token = authData?.session?.access_token;

    if (authError || !token) {
        console.log("Teacher prof@test.com not found, creating one...");
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: 'prof@test.com',
            password: 'password123',
            options: { data: { role: 'teacher', display_name: 'Dr. Test' } }
        });
        if (signUpError) {
            console.error("Signup failed:", signUpError);
            return;
        }
        await supabase.from('profiles').upsert({ id: signUpData.user.id, role: 'teacher', display_name: 'Dr. Test' });
        token = signUpData.session.access_token;
    }

    console.log("✅ Authenticated successfully.");

    // 2. Upload file
    console.log("\n2. Uploading DSA_LinkedLists_Test_2.pdf...");
    const formData = new FormData();
    formData.append('files', fs.createReadStream('DSA_LinkedLists_Test_2.pdf'));

    try {
        const uploadRes = await axios.post(`${API_BASE}/ingest/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });
        const courseName = uploadRes.data.courses[0].name;
        console.log("✅ Upload successful, assigned course name:", courseName);

        // 3. Trigger Prerequisite Generation
        console.log("\n3. Triggering Prerequisite Generation...");
        axios.post(`${API_BASE}/ingest/generate-prerequisites`, { courseName }, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            console.log("✅ Python Prerequisite completed:", res.data.message);
        }).catch(err => {
            console.error("❌ Python Prerequisite execution failed:", err.response?.data || err.message);
        });

        // 4. Simulate SSE Connection
        console.log("4. Listening to SSE stream for progress (emulating frontend)...");
        // Give the background event a few seconds to run and stabilize
        setTimeout(async () => {
            console.log("\n5. Checking generated artifacts natively...");
            try {
                const res = await axios.get(`${API_BASE}/courses/${courseName}/artifacts`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log(`✅ Loaded Artifacts: ${res.data.chunks?.length || 0} chunks, ${res.data.prerequisites?.relationships?.length || 0} pre-reqs`);
                if (res.data.chunks?.length > 0 && res.data.prerequisites) {
                    console.log("🎉 E2E UPLOAD PIPELINE VERIFIED SUCCESSFULLY");
                } else {
                    console.log("⚠️ Pipeline reported success, but artifacts are empty.");
                }
            } catch (artifactErr) {
                console.log("❌ Failed to fetch artifacts:", artifactErr.response?.data || artifactErr.message);
            }
        }, 8000);

    } catch (uploadErr) {
        console.error("❌ Upload Failed:", uploadErr.response?.data || uploadErr.message);
    }
}

runTest();
