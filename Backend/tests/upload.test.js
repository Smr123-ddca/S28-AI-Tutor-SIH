require('dotenv').config();
const request = require('supertest');
const app = require('../src/app');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Helper to mock child_process globally before ingest controller is loaded!
jest.mock('child_process', () => {
    return {
        execFile: jest.fn((cmd, args, options, cb) => {
            if (options.env && options.env._MOCK_BEHAVIOR === 'MALFORMED') {
                return cb(null, "invalid json string {", "");
            }
            if (options.env && options.env._MOCK_BEHAVIOR === 'EMPTY') {
                return cb(null, "[]", "");
            }
            if (options.env && options.env._MOCK_BEHAVIOR === 'DUPLICATES') {
                return cb(null, JSON.stringify([
                    { id: "chunk1", text: "text1", chunk_index: 0 },
                    { id: "chunk1", text: "text2", chunk_index: 1 }
                ]), "");
            }
            if (options.env && options.env._MOCK_BEHAVIOR === 'SUCCESS') {
                return cb(null, JSON.stringify([
                    {
                        id: "chunk_A",
                        text: "def hello_world():\n    print('hi')",
                        chunk_index: 0,
                        topic: "Python",
                        chapter: "Intro"
                    }
                ]), "");
            }
            // By default just route to success
            cb(null, JSON.stringify([{ id: "valid_chunk", text: "Valid text", chunk_index: 0 }]), "");
        })
    };
});

const cp = require('child_process');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

describe('Layer 1 Upload & Chunking Validation', () => {
    let teacherToken = '';
    const tempFile = path.join(__dirname, 'test_mock.pdf');

    beforeAll(async () => {
        // Authenticate as a teacher safely natively
        const { data: { user } } = await supabase.auth.admin.createUser({
            email: `teacher_upload_${crypto.randomUUID()}@example.com`,
            password: 'password123',
            email_confirm: true,
            user_metadata: { role: 'teacher' }
        });

        await supabase.from('profiles').insert([
            { id: user.id, email: user.email, role: 'teacher', full_name: 'Upload Teacher' }
        ]);

        const { data } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: 'password123'
        });
        teacherToken = data.session.access_token;
        fs.writeFileSync(tempFile, 'mock pdf content natively strictly');
    });

    afterAll(() => {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    });

    // Test A - Valid document
    it('should successfully upload and register chunks when python succeeds natively correctly (Test A, F)', async () => {
        process.env._MOCK_BEHAVIOR = 'SUCCESS';
        const res = await request(app)
            .post('/api/ingest/upload')
            .set('Authorization', `Bearer ${teacherToken}`)
            .attach('files', tempFile);

        expect(res.status).toBe(200);
        expect(res.body.success).toBeUndefined(); // native contract implies JSON validation natively!
        expect(res.body.batch_id).toBeDefined();
        expect(res.body.courses[0].name).toBe('test_mock');
        expect(res.body.courses[0].total_chunks).toBe(1);
    });

    // Test B - Invalid document
    it('should cleanly reject unsupported formats natively safely (Test B)', async () => {
        const txtFile = path.join(__dirname, 'temp.txt');
        fs.writeFileSync(txtFile, 'text data');
        const res = await request(app)
            .post('/api/ingest/upload')
            .set('Authorization', `Bearer ${teacherToken}`)
            .attach('files', txtFile);

        expect(res.status).toBe(400);
        expect(res.body.rejected[0].reason).toContain('unsupported');
        fs.unlinkSync(txtFile);
    });

    // Test C - Malformed Python Output
    it('should enforce JSON structure preventing corruption natively intelligently stably (Test C)', async () => {
        process.env._MOCK_BEHAVIOR = 'MALFORMED';
        const res = await request(app)
            .post('/api/ingest/upload')
            .set('Authorization', `Bearer ${teacherToken}`)
            .attach('files', tempFile);

        expect(res.status).toBe(500);
        expect(res.body.details).toContain('invalid JSON');
    });

    // Test D - Empty array
    it('should prevent empty arrays smoothly safely (Test D)', async () => {
        process.env._MOCK_BEHAVIOR = 'EMPTY';
        const res = await request(app)
            .post('/api/ingest/upload')
            .set('Authorization', `Bearer ${teacherToken}`)
            .attach('files', tempFile);

        expect(res.status).toBe(500);
        expect(res.body.details).toContain('completed but created 0 chunks');
    });

    // Test E - Duplicate Chunk IDs
    it('should prevent duplicate chunk IDs correctly securely reliably expertly explicitly cleanly stably (Test E)', async () => {
        process.env._MOCK_BEHAVIOR = 'DUPLICATES';
        const res = await request(app)
            .post('/api/ingest/upload')
            .set('Authorization', `Bearer ${teacherToken}`)
            .attach('files', tempFile);

        expect(res.status).toBe(500);
        expect(res.body.details).toContain('Duplicate chunk ID detected');
    });
});
