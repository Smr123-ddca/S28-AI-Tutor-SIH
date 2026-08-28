const request = require('supertest');

jest.mock('fs', () => {
    const originalFs = jest.requireActual('fs');
    return {
        ...originalFs,
        existsSync: jest.fn((pathStr) => {
            if (pathStr && pathStr.includes('courses.json')) return true;
            return originalFs.existsSync(pathStr);
        }),
        readFileSync: jest.fn((pathStr, enc) => {
            if (pathStr && pathStr.includes('courses.json')) {
                return JSON.stringify([
                    { name: "DSA", status: "published" },
                    { name: "DSA_Coding_Practice", status: "published" },
                    { name: "test_mock", status: "pending_review" }
                ]);
            }
            return originalFs.readFileSync(pathStr, enc);
        }),
        appendFileSync: jest.fn()
    };
});

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
            .send({ course: 'test_mock' }); // test_mock is pending_review

        expect([400, 403, 404]).toContain(response.status);
    });

    it('Test F: Course mismatch between session and request is rejected', async () => {
        // Mock a DB lookup where the session says it belongs to "DSA_Coding_Practice", 
        // but the query tries to submit with "DSA".
        supabaseAdmin.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: { id: 'session123', course: 'DSA_Coding_Practice' },
                error: null
            })
        });

        const response = await request(app)
            .post('/api/explain')
            .send({
                question: 'What is an array?',
                session_id: 'session123',
                course: 'DSA'
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
                data: { id: 'session123', course: 'DSA_Coding_Practice' },
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
                course: 'DSA_Coding_Practice'
            });

        expect(response.status).not.toBe(403);
    });

    it('Legacy NULL session becomes associated with a valid published course', async () => {
        const updateMock = jest.fn().mockReturnThis();

        supabaseAdmin.from.mockReturnValue({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
                data: { id: 'session_legacy' }, // No course field! (undefined/NULL)
                error: null
            }),
            update: updateMock,
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue({ data: [], error: null })
        });

        const response = await request(app)
            .post('/api/explain')
            .send({
                question: 'Linked Lists?',
                session_id: 'session_legacy',
                course: 'DSA'
            });

        expect(response.status).not.toBe(403);
        // Ensure update was called with the course
        expect(updateMock).toHaveBeenCalledWith({ course: 'DSA' });
    });
});
