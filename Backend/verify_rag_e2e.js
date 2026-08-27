require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_URL = 'http://localhost:3002/api';

async function runE2E() {
    try {
        console.log('1. Authenticating as Teacher...');
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'teacher_e2e@example.com',
            password: 'password123'
        });

        if (authError) throw new Error('Auth failed: ' + authError.message);
        const token = authData.session.access_token;
        console.log('✅ Authenticated successfully');

        console.log('\n2. Uploading PDF...');
        const formData = new FormData();
        formData.append('files', fs.createReadStream(path.join(__dirname, 'DSA_LinkedLists.pdf')));

        const uploadRes = await axios.post(`${BASE_URL}/ingest/upload`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        const batch = uploadRes.data;
        console.log('✅ Upload successful. Batch ID:', batch.batch_id);

        console.log('\n3. Checking Generated Chunks JSON...');
        const courseChunkPath = path.join(__dirname, 'src/data/DSA_LinkedLists_chunks.json');
        if (!fs.existsSync(courseChunkPath)) throw new Error('Chunks JSON not found!');

        const chunks = JSON.parse(fs.readFileSync(courseChunkPath, 'utf8'));
        console.log(`✅ Verified chunks exist. Count: ${chunks.length}`);

        console.log('\n4. Generating Prerequisites...');
        const prereqRes = await axios.post(`${BASE_URL}/ingest/generate-prerequisites`,
            { courseName: 'DSA_LinkedLists' },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('✅ Prerequisites generated:', prereqRes.data.status);

        console.log('\n5. Publishing Course...');
        const pubRes = await axios.put(`${BASE_URL}/courses/DSA_LinkedLists/status`,
            { status: 'published' },
            { headers: { 'Authorization': `Bearer ${token}` } }
        );
        console.log('✅ Publish successful:', pubRes.data.course.status);

        console.log('\n6. Checking Retrieval...');
        const { data: studentData, error: studentError } = await supabase.auth.signInWithPassword({
            email: 'student_e2e@example.com',
            password: 'password123'
        });
        if (studentError) throw new Error('Student auth failed: ' + studentError.message);

        const studentToken = studentData.session.access_token;

        const retrieveRes = await axios.post(`${BASE_URL}/retrieve`, {
            question: "What is a linked list and how does insertion at the beginning differ from arrays?"
        }, { headers: { 'Authorization': `Bearer ${studentToken}` } });

        console.log('✅ Retrieval successful. Returned chunks:', retrieveRes.data.results.length);
        const topChunk = retrieveRes.data.results[0];
        console.log('Top Chunk snippet:', topChunk.text.substring(0, 50));

        console.log('\n🎉 END-TO-END RAG PIPELINE COMPLETE AND VERIFIED!');

    } catch (e) {
        console.error('❌ E2E Failed:', e.response ? e.response.data : e.message);
    }
}

runE2E();
