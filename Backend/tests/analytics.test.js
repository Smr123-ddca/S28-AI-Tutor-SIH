const request = require('supertest');

// =====================================================================
// Mock dependencies before loading app
// =====================================================================
jest.mock('../src/lib/supabaseAdmin', () => {
    const mockBuilder = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis()
    };
    return { supabaseAdmin: mockBuilder };
});

jest.mock('../src/middleware/auth.middleware', () => ({
    authenticate: (req, res, next) => {
        req.user = {
            id: req.headers['x-mock-user-id'] || 'teacher-123',
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

describe('Class Analytics API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/analytics/class', () => {
        it('forbids students from accessing class analytics', async () => {
            const res = await request(app)
                .get('/api/analytics/class')
                .set('x-mock-role', 'student');

            expect(res.status).toBe(403);
        });

        it('returns comprehensive class analytics for teachers', async () => {
            const res = await request(app)
                .get('/api/analytics/class')
                .set('x-mock-role', 'teacher');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('total_students_active');
            expect(res.body).toHaveProperty('average_class_mastery_pct');
            expect(res.body).toHaveProperty('concepts_covered');
            expect(res.body).toHaveProperty('concepts');
            expect(res.body).toHaveProperty('students_needing_attention');
            expect(Array.isArray(res.body.concepts)).toBe(true);
            expect(Array.isArray(res.body.students_needing_attention)).toBe(true);
            expect(res.body.total_students_active).toBeGreaterThan(0);
        });

        it('filters analytics dynamically by subject (DBMS)', async () => {
            const res = await request(app)
                .get('/api/analytics/class?subject=DBMS_Code_Reference_Annotated')
                .set('x-mock-role', 'teacher');

            expect(res.status).toBe(200);
            expect(res.body.subject).toBe('DBMS_Code_Reference_Annotated');
            expect(res.body.total_students_active).toBeGreaterThan(0);
            expect(res.body.concepts.length).toBeGreaterThan(0);
            const concept = res.body.concepts.find(c => c.concept.includes('Join') || c.concept.includes('SQL'));
            expect(concept).toBeDefined();
            expect(concept.mastery_pct).toBeGreaterThan(0);
        });

        it('filters analytics dynamically by subject (TaskSync)', async () => {
            const res = await request(app)
                .get('/api/analytics/class?subject=TaskSync_FullStack_Structure_Guide__1_')
                .set('x-mock-role', 'teacher');

            expect(res.status).toBe(200);
            expect(res.body.subject).toBe('TaskSync_FullStack_Structure_Guide__1_');
            expect(res.body.concepts.length).toBeGreaterThan(0);
        });
    });
});
