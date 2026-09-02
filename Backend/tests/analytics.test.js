const request = require('supertest');

// =====================================================================
// Mock dependencies before loading app
// =====================================================================
jest.mock('../src/lib/supabaseAdmin', () => {
    const mockBuilder = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockReturnThis()
    };
    return { supabaseAdmin: mockBuilder };
});

jest.mock('../src/middleware/auth.middleware', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: req.headers['x-mock-user-id'] || 'teacher-1', role: req.headers['x-mock-role'] || 'teacher' };
        next();
    },
    requireRole: (role) => (req, res, next) => {
        if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
        next();
    }
}));

jest.mock('../src/data/store', () => ({
    getChunks: () => [],
    loadData: jest.fn()
}));

const { supabaseAdmin } = require('../src/lib/supabaseAdmin');
const app = require('../src/app');

// =====================================================================
// Helper: build a mock practice attempt with embedded question
// =====================================================================
function makeAttempt({ studentId, concept, subject, evaluation = 'correct' }) {
    return {
        id: `attempt-${Math.random()}`,
        student_id: studentId,
        evaluation,
        attempt_number: 1,
        practice_question_id: `pq-${Math.random()}`,
        practice_questions: { id: `pq-${Math.random()}`, concept, subject }
    };
}

describe('GET /api/analytics/class', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Default: profiles query returns no profiles (names fallback to ID prefix)
        supabaseAdmin.in = jest.fn().mockResolvedValue({ data: [], error: null });
        supabaseAdmin.select = jest.fn().mockReturnThis();
        supabaseAdmin.from = jest.fn().mockReturnThis();
        supabaseAdmin.eq = jest.fn().mockReturnThis();
    });

    it('should require teacher role — reject student', async () => {
        const res = await request(app)
            .get('/api/analytics/class')
            .set('x-mock-user-id', 'student-1')
            .set('x-mock-role', 'student');
        expect(res.status).toBe(403);
    });

    it('should return empty analytics when no practice attempts exist', async () => {
        // Mock the join query returning no data
        supabaseAdmin.from.mockImplementation(() => supabaseAdmin);
        supabaseAdmin.select.mockReturnThis();
        supabaseAdmin.eq.mockImplementation(() => ({
            ...supabaseAdmin,
            then: undefined
        }));

        // Simulate the full chain resolving with empty data
        const chainEnd = jest.fn().mockResolvedValue({ data: [], error: null });
        supabaseAdmin.select.mockReturnValue({ eq: chainEnd, ...supabaseAdmin });

        // Simplify: just mock the entire from().select().eq() chain
        supabaseAdmin.from.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({ data: [], error: null }),
                then: undefined
            })
        });

        // For the scenario with no subject param, the query does NOT have .eq
        supabaseAdmin.from.mockReturnValueOnce({
            select: jest.fn().mockResolvedValue({ data: [], error: null })
        });

        const res = await request(app)
            .get('/api/analytics/class')
            .set('x-mock-user-id', 'teacher-1')
            .set('x-mock-role', 'teacher');

        expect(res.status).toBe(200);
        expect(res.body.total_students_active).toBe(0);
        expect(res.body.concepts).toHaveLength(0);
        expect(res.body.students_needing_attention).toHaveLength(0);
    });

    it('should correctly compute mastery from correct/incorrect attempts', async () => {
        const mockAttempts = [
            makeAttempt({ studentId: 'stu-A', concept: 'Arrays', subject: 'DSA', evaluation: 'correct' }),
            makeAttempt({ studentId: 'stu-A', concept: 'Arrays', subject: 'DSA', evaluation: 'correct' }),
            makeAttempt({ studentId: 'stu-A', concept: 'Arrays', subject: 'DSA', evaluation: 'incorrect' }),
            makeAttempt({ studentId: 'stu-B', concept: 'Arrays', subject: 'DSA', evaluation: 'incorrect' }),
            makeAttempt({ studentId: 'stu-B', concept: 'Arrays', subject: 'DSA', evaluation: 'incorrect' })
        ];

        supabaseAdmin.from.mockReturnValueOnce({
            select: jest.fn().mockResolvedValue({ data: mockAttempts, error: null })
        });
        supabaseAdmin.from.mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({ data: [], error: null })
            })
        });

        const res = await request(app)
            .get('/api/analytics/class')
            .set('x-mock-user-id', 'teacher-1')
            .set('x-mock-role', 'teacher');

        expect(res.status).toBe(200);
        const arraysConcept = res.body.concepts.find(c => c.concept === 'Arrays');
        expect(arraysConcept).toBeDefined();
        // 2 correct out of 5 total = 40% → needs_attention
        expect(arraysConcept.mastery_pct).toBe(40);
        expect(arraysConcept.status).toBe('needs_attention');
        expect(res.body.total_students_active).toBe(2);
    });

    it('should flag student with repeated mistakes in attention list', async () => {
        // Student with 4 incorrect attempts on same concept → HIGH attention
        const mockAttempts = [
            makeAttempt({ studentId: 'stu-X', concept: 'Normalization', subject: 'DBMS', evaluation: 'incorrect' }),
            makeAttempt({ studentId: 'stu-X', concept: 'Normalization', subject: 'DBMS', evaluation: 'incorrect' }),
            makeAttempt({ studentId: 'stu-X', concept: 'Normalization', subject: 'DBMS', evaluation: 'incorrect' }),
            makeAttempt({ studentId: 'stu-X', concept: 'Normalization', subject: 'DBMS', evaluation: 'incorrect' })
        ];

        supabaseAdmin.from.mockReturnValueOnce({
            select: jest.fn().mockResolvedValue({ data: mockAttempts, error: null })
        });
        supabaseAdmin.from.mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({ data: [], error: null })
            })
        });

        const res = await request(app)
            .get('/api/analytics/class?subject=DBMS')
            .set('x-mock-user-id', 'teacher-1')
            .set('x-mock-role', 'teacher');

        expect(res.status).toBe(200);
        const attn = res.body.students_needing_attention;
        expect(attn.length).toBeGreaterThan(0);
        const student = attn.find(s => s.student_id === 'stu-X');
        expect(student).toBeDefined();
        expect(student.attention_level).toBe('high');
        // Signal shows repeated mistakes
        expect(student.signals[0].repeated_mistakes).toBeGreaterThanOrEqual(3);
    });

    it('should NOT flag a high-performing student', async () => {
        // Student with all correct answers
        const mockAttempts = [
            makeAttempt({ studentId: 'stu-good', concept: 'SQL', subject: 'DBMS', evaluation: 'correct' }),
            makeAttempt({ studentId: 'stu-good', concept: 'SQL', subject: 'DBMS', evaluation: 'correct' }),
            makeAttempt({ studentId: 'stu-good', concept: 'SQL', subject: 'DBMS', evaluation: 'correct' })
        ];

        supabaseAdmin.from.mockReturnValueOnce({
            select: jest.fn().mockResolvedValue({ data: mockAttempts, error: null })
        });
        supabaseAdmin.from.mockReturnValueOnce({
            select: jest.fn().mockReturnValue({
                in: jest.fn().mockResolvedValue({ data: [], error: null })
            })
        });

        const res = await request(app)
            .get('/api/analytics/class?subject=DBMS')
            .set('x-mock-user-id', 'teacher-1')
            .set('x-mock-role', 'teacher');

        expect(res.status).toBe(200);
        expect(res.body.students_needing_attention).toHaveLength(0);
        const sqlConcept = res.body.concepts.find(c => c.concept === 'SQL');
        expect(sqlConcept.status).toBe('strong');
        expect(sqlConcept.mastery_pct).toBe(100);
    });

    it('should return 500 on Supabase error', async () => {
        supabaseAdmin.from.mockReturnValueOnce({
            select: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
        });

        const res = await request(app)
            .get('/api/analytics/class')
            .set('x-mock-user-id', 'teacher-1')
            .set('x-mock-role', 'teacher');

        expect(res.status).toBe(500);
        expect(res.body.error).toBeDefined();
    });
});
