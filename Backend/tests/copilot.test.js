const request = require('supertest');

// =====================================================================
// Mock dependencies before loading app
// =====================================================================
jest.mock('../src/services/llm.router', () => ({
    generateWithFallback: jest.fn().mockImplementation((prompt, schema) => {
        if (schema === 'TEACHER_COPILOT') {
            return JSON.stringify({
                answer: "Based on the student data, Alex Rivers and Smruti Pradhan had difficulties with array memory allocation and indexing concepts."
            });
        }
        return JSON.stringify({ status: "answered" });
    })
}));

jest.mock('../src/middleware/auth.middleware', () => ({
    authenticate: (req, res, next) => {
        req.user = {
            id: req.headers['x-mock-user-id'] || 'fb0f7bf4-9313-4fe9-a162-b1321b667ad4',
            role: req.headers['x-mock-role'] || 'teacher'
        };
        next();
    },
    requireRole: (role) => (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions for this resource' });
        }
        next();
    }
}));

const app = require('../src/app');

describe('Teacher Co-pilot Chat API (POST /api/teacher-copilot)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Test 1: Forbids student access (403)', async () => {
        const res = await request(app)
            .post('/api/teacher-copilot')
            .set('x-mock-role', 'student')
            .send({ message: 'Weekly summary' });

        expect(res.status).toBe(403);
    });

    it('Test 2: Rejects empty or missing message (400)', async () => {
        const res = await request(app)
            .post('/api/teacher-copilot')
            .set('x-mock-role', 'teacher')
            .send({ message: '   ' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Message cannot be empty/i);
    });

    it('Test 3: Rejects messages exceeding 500 characters (400)', async () => {
        const longMessage = 'a'.repeat(501);
        const res = await request(app)
            .post('/api/teacher-copilot')
            .set('x-mock-role', 'teacher')
            .send({ message: longMessage });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Message is too long/i);
    });

    it('Test 4: Returns fixed friendly fallback message on unmatched intent', async () => {
        const res = await request(app)
            .post('/api/teacher-copilot')
            .set('x-mock-role', 'teacher')
            .send({ message: 'Can you tell me a joke about computers?' });

        expect(res.status).toBe(200);
        expect(res.body.intent).toBe('unmatched');
        expect(res.body.reply).toMatch(/I can currently help with: who's struggling with a topic, a weekly summary, or top errors this week/i);
    });

    it('Test 5: Handles "Weekly summary" intent for teacher', async () => {
        const res = await request(app)
            .post('/api/teacher-copilot')
            .set('x-mock-role', 'teacher')
            .send({ message: 'Can you give me the weekly summary?' });

        expect(res.status).toBe(200);
        expect(res.body.intent).toBe('weekly_summary');
        expect(res.body.reply).toBeDefined();
        expect(typeof res.body.reply).toBe('string');
    });

    it('Test 6: Handles "Top errors this week" intent for teacher', async () => {
        const res = await request(app)
            .post('/api/teacher-copilot')
            .set('x-mock-role', 'teacher')
            .send({ message: 'What are the top errors this week?' });

        expect(res.status).toBe(200);
        expect(res.body.intent).toBe('top_errors');
        expect(res.body.reply).toBeDefined();
        expect(typeof res.body.reply).toBe('string');
    });

    it('Test 7: Handles "Who is struggling with [topic]" intent', async () => {
        const res = await request(app)
            .post('/api/teacher-copilot')
            .set('x-mock-role', 'teacher')
            .send({ message: 'Who is struggling with Arrays?' });

        expect(res.status).toBe(200);
        expect(res.body.intent).toBe('struggling');
        expect(res.body.reply).toBeDefined();
        expect(typeof res.body.reply).toBe('string');
    });

    it('Test 8: Returns clean message for non-existent topic with 0 attempts', async () => {
        const res = await request(app)
            .post('/api/teacher-copilot')
            .set('x-mock-role', 'teacher')
            .send({ message: 'Who is struggling with Quantum Entanglement?' });

        expect(res.status).toBe(200);
        expect(res.body.intent).toBe('struggling');
        expect(res.body.reply).toMatch(/No students are currently struggling with Quantum Entanglement/i);
    });

    it('Test 9: Returns clean notice when teacher has no courses', async () => {
        const res = await request(app)
            .post('/api/teacher-copilot')
            .set('x-mock-user-id', 'unknown-teacher-uuid-with-no-courses')
            .set('x-mock-role', 'teacher')
            .send({ message: 'Weekly summary' });

        expect(res.status).toBe(200);
        expect(res.body.reply).toMatch(/No course data found for your account yet/i);
    });
});
