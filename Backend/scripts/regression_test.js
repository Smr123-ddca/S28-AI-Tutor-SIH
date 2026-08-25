require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const { createClient } = require('@supabase/supabase-js');
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ybhtpbsxhxftygbqyxsv.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliaHRwYnN4aHhmdHlnYnF5eHN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMjA1NDAsImV4cCI6MjEwMjY5NjU0MH0.WLsLibo80WT7NnDhn7JCHbObIIORxNj6qB3_tNp4fKI'; // Copied from frontend

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function runTest() {
    console.log("Starting Regression Test...");
    let email = `test_student_${Date.now()}@example.com`;
    let password = 'password123';
    let token, userId;

    try {
        console.log(`1. Signing up test user ${email}`);
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });
        if (authError) throw new Error("Auth error: " + authError.message);

        token = authData.session.access_token;
        userId = authData.user.id;
        console.log(`User created. ID: ${userId}`);

        // Wait a second for trigger to create profile, just in case
        await new Promise(r => setTimeout(r, 1000));

        // Ensure profile exists or create it if missing
        const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).single();
        if (!profile) {
            console.log("No profile detected, inserting manually as student...");
            await supabaseAdmin.from('profiles').insert({ id: userId, email: email, role: 'student', full_name: 'Test Student' });
        } else {
            console.log("Profile detected:", profile);
        }

        console.log("\n2. Testing /api/explain");
        const explainRes = await request(app)
            .post('/api/explain')
            .set('Authorization', `Bearer ${token}`)
            .send({
                question: 'Explain this to me',
                context_limit: 6
            });

        if (explainRes.status !== 200) {
            console.error(explainRes.body);
            throw new Error(`Explain API failed with status ${explainRes.status}`);
        }

        const session_id = explainRes.body.session_id;
        console.log(`Explain succeeded. Created session_id: ${session_id}`);

        console.log("\n3. Testing API Context with same session_id");
        const explainRes2 = await request(app)
            .post('/api/explain')
            .set('Authorization', `Bearer ${token}`)
            .send({
                question: 'I have a follow up',
                session_id: session_id
            });

        if (explainRes2.status !== 200) throw new Error("Second Explain failed");
        console.log("Context Explain succeeded.");

        console.log("\n4. Testing Session Events (/api/session-event)");
        const eventRes = await request(app)
            .post('/api/session-event')
            .set('Authorization', `Bearer ${token}`)
            .send({
                chunk_id: 'some_chunk_id',
                correct: true
            });

        if (eventRes.status !== 200) throw new Error("Session Event failed with " + eventRes.status);
        console.log("Session event succeeded.");

        console.log("\n5. Verifying Database Persistence");

        // Profiles
        const { data: p } = await supabaseAdmin.from('profiles').select('id').eq('id', userId);
        if (!p || p.length === 0) throw new Error("Profile not found in DB");
        console.log("✅ verified: profiles");

        // Chat Sessions
        const { data: s } = await supabaseAdmin.from('chat_sessions').select('*').eq('student_id', userId);
        if (!s || s.length !== 1) throw new Error(`chat_sessions not found in DB, got ${s ? s.length : 0}`);
        console.log("✅ verified: chat_sessions");

        // Chat Messages
        const { data: m } = await supabaseAdmin.from('chat_messages').select('*').eq('session_id', session_id);
        if (!m || m.length < 2) throw new Error(`chat_messages not found in DB or insufficient messages. Total: ${m ? m.length : 0}`);
        console.log(`✅ verified: chat_messages (${m.length} messages found)`);

        // Session Events
        const { data: e } = await supabaseAdmin.from('session_events').select('*').eq('student_id', userId);
        if (!e || e.length === 0) throw new Error("session_events not found in DB");
        console.log("✅ verified: session_events");

        console.log("\nAll Regression Tests Passed! ✅");

    } catch (e) {
        console.error("TEST FAILED:", e.message);
        process.exit(1);
    }
}

runTest();
