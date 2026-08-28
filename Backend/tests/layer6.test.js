const request = require('supertest');

// MOCK AUTH MIDDLEWARE BEFORE REQUIRING APP OR ROUTES
jest.mock('../src/middleware/auth.middleware', () => ({
    authenticate: (req, res, next) => {
        req.user = req.headers['authorization'] === 'Bearer student2'
            ? { id: 'student_another', role: 'student' }
            : { id: 'student_tester', role: 'student' };
        next();
    },
    requireRole: () => (req, res, next) => next()
}));

// Mock Supabase DB internally for the test
jest.mock('../src/lib/supabaseAdmin', () => ({
    supabaseAdmin: {
        from: jest.fn()
    }
}));

const { supabaseAdmin } = require('../src/lib/supabaseAdmin');
const app = require('../src/app');
const { loadData } = require('../src/data/store');

describe('Layer 6: Student Context Switching & Course-Aware Sessions', () => {
    beforeAll(() => {
        loadData();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('Test C: Student cannot create a session for an unpublished course', async () => {
        const response = await request(app)
            .post('/api/sessions')
            .send({ course: 'Unpublished_Course_Name' });

        console.log("TEST C RESPONSE:", response.status, response.body);
        expect([400, 403, 404]).toContain(response.status);
    });

    it('Test F: Course mismatch between session and request is rejected', async () => {
        // Mock a DB lookup where the session says it belongs to "DSA", 
        // but the query tries to submit with "Python".
        supabaseAdmin.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: { id: 'session123', course: 'DSA Coding Practice' },
                error: null
            })
        });

        const response = await request(app)
            .post('/api/explain')
            .send({
                question: 'What is python?',
                session_id: 'session123',
                course: 'Python Programming'
            });

        expect(response.status).toBe(403);
        expect(response.body.error).toContain('course mismatch');
    });

    it('should successfully isolate queries strictly correctly', async () => {
        // Verify valid flow
        supabaseAdmin.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: { id: 'session123', course: 'DSA Coding Practice' },
                error: null
            }),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({
                data: [{ role: 'user', content: 'test' }],
                error: null
            })
        });

        const response = await request(app)
            .post('/api/explain')
            .send({
                question: 'What is an array?',
                session_id: 'session123',
                course: 'DSA Coding Practice'
            });

        // TFIDF might fail to find matching source data for "What is an array" depending on store,
        // but it should NOT return 403.
        expect(response.status).not.toBe(403);
    });
});
