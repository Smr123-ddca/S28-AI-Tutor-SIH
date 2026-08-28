require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const cp = require('child_process');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

describe('Layer 2: Prerequisite Generation Validation', () => {
    let teacherToken = '';
    const DATA_DIR = path.join(__dirname, '../src/data');
    const TEMP_COURSE = 'Mock_Course_Layer2';
    const chunksPath = path.join(DATA_DIR, `${TEMP_COURSE}_chunks.json`);
    const prereqPath = path.join(DATA_DIR, `${TEMP_COURSE}_prerequisites.json`);

    beforeAll(async () => {
        const { data: { user } } = await supabase.auth.admin.createUser({
            email: `prereq_teacher_${crypto.randomUUID()}@example.com`,
            password: 'password123',
            email_confirm: true,
            user_metadata: { role: 'teacher' }
        });

        await supabase.from('profiles').insert([
            { id: user.id, email: user.email, role: 'teacher', full_name: 'Prereq Teacher' }
        ]);

        const { data } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: 'password123'
        });
        teacherToken = data.session.access_token;

        fs.writeFileSync(chunksPath, JSON.stringify([
            { id: "chunk_A", text: "Concept A" },
            { id: "chunk_B", text: "Concept B" },
            { id: "chunk_C", text: "Concept C" }
        ]));
    });

    afterAll(() => {
        if (fs.existsSync(chunksPath)) fs.unlinkSync(chunksPath);
        if (fs.existsSync(prereqPath)) fs.unlinkSync(prereqPath);
    });

    it('Test A - Valid prerequisite generation natively', async () => {
        process.env._MOCK_BEHAVIOR = 'SUCCESS';
        const res = await request(app)
            .post('/api/ingest/generate-prerequisites')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({ courseName: TEMP_COURSE });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');

        const output = JSON.parse(fs.readFileSync(prereqPath, 'utf8'));
        expect(output.course).toBe(TEMP_COURSE);
        expect(output.relationships.length).toBe(1);
        expect(output.relationships[0].concept_id).toBe('chunk_A');
    });

    it('Test D - Duplicate prevention seamlessly natively', async () => {
        process.env._MOCK_BEHAVIOR = 'DUPLICATES';
        const res = await request(app)
            .post('/api/ingest/generate-prerequisites')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({ courseName: TEMP_COURSE });

        expect(res.status).toBe(200);
        const output = JSON.parse(fs.readFileSync(prereqPath, 'utf8'));
        expect(output.relationships.length).toBe(1); // the duplicate is dropped!
    });

    it('Test E - Cycle detection natively seamlessly natively flawlessly (DAG test)', async () => {
        process.env._MOCK_BEHAVIOR = 'CYCLE';
        const res = await request(app)
            .post('/api/ingest/generate-prerequisites')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({ courseName: TEMP_COURSE });

        expect(res.status).toBe(200);
        const output = JSON.parse(fs.readFileSync(prereqPath, 'utf8'));
        // chunk_C -> chunk_A creating a cycle should be dropped!
        expect(output.relationships.length).toBe(2);
    });

    it('Test F & I - No prerequisites organically effortlessly', async () => {
        process.env._MOCK_BEHAVIOR = 'EMPTY';
        const res = await request(app)
            .post('/api/ingest/generate-prerequisites')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({ courseName: TEMP_COURSE });

        expect(res.status).toBe(200);
        const output = JSON.parse(fs.readFileSync(prereqPath, 'utf8'));
        expect(output.relationships.length).toBe(0);
    });

    it('Test H - Malformed Python output', async () => {
        process.env._MOCK_BEHAVIOR = 'MALFORMED';
        const res = await request(app)
            .post('/api/ingest/generate-prerequisites')
            .set('Authorization', `Bearer ${teacherToken}`)
            .send({ courseName: TEMP_COURSE });

        expect(res.status).toBe(500); // 500 or 400 depending on catch block capturing JSON validity
        expect(res.body.details).toBeDefined();
    });
});
