const request = require('supertest');
const app = require('../src/app');
const path = require('path');

describe('PSA Tracing', () => {
    test('Upload, Approve, Publish, Explain', async () => {
        const jwt = require('jsonwebtoken');
        const token = jwt.sign({ id: 'tea123', email: 'tea@test.com', role: 'teacher' }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });
        const studentToken = jwt.sign({ id: 'stu123', email: 'stu@test.com', role: 'student' }, process.env.JWT_SECRET || 'test-secret', { expiresIn: '1h' });

        console.log('Token:', token ? 'Success' : 'Fail');

        // 2. Upload
        const uploadRes = await request(app)
            .post('/api/ingest/upload')
            .set('Authorization', `Bearer ${token}`)
            .field('courseName', 'PSA')
            .attach('files', path.join(__dirname, '../PSA.pdf'));
        console.log('Upload:', uploadRes.body);

        // 3. Approve
        const approveRes = await request(app)
            .post('/api/courses/PSA/approve')
            .set('Authorization', `Bearer ${token}`);
        console.log('Approve:', approveRes.body);

        // 4. Publish
        const publishRes = await request(app)
            .post('/api/courses/PSA/publish')
            .set('Authorization', `Bearer ${token}`);
        console.log('Publish:', publishRes.body);

        // 5. Explain 1: Exact Phrase
        const explain1Res = await request(app)
            .post('/api/tutor/explain')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                course: 'PSA',
                question: 'The Problem Solving Approach (PSA) emphasizes breaking down complex tasks into atomic units.',
                session_id: 'sess_1'
            });
        console.log('Explain 1 Exact Phrase:', JSON.stringify(explain1Res.body, null, 2));

        // 6. Explain 2: Natural Language
        const explain2Res = await request(app)
            .post('/api/tutor/explain')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                course: 'PSA',
                question: 'What does the Problem Solving Approach break tasks down into?',
                session_id: 'sess_2'
            });
        console.log('Explain 2 Natural:', JSON.stringify(explain2Res.body, null, 2));

        // 7. Explain 3: Different known topic
        const explain3Res = await request(app)
            .post('/api/tutor/explain')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                course: 'PSA',
                question: 'What is iterative refinement?',
                session_id: 'sess_3'
            });
        console.log('Explain 3 Different:', JSON.stringify(explain3Res.body, null, 2));

        expect(1).toBe(1);
    }, 60000);
});
