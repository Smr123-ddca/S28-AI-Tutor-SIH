const request = require('supertest');
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');
const app = require('../src/app');

// Mock authentication middleware so we can inject a mock user ID
jest.mock('../src/middleware/auth.middleware', () => {
    return {
        authenticate: (req, res, next) => {
            req.user = { id: req.headers['x-mock-user-id'] || 'student-A' };
            next();
        },
        requireRole: (role) => (req, res, next) => next()
    };
});

// Mock Supabase admin
jest.mock('../src/lib/supabaseAdmin', () => {
    const builder = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve({ data: null, error: null }))
    };
    // Initialize methods used for mock implementations
    builder.single = jest.fn().mockImplementation(() => Promise.resolve({ data: null, error: null }));
    builder.order = jest.fn().mockImplementation(() => Promise.resolve({ data: null, error: null }));
    return {
        supabaseAdmin: builder
    };
});

describe('Practice Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        supabaseAdmin.single.mockImplementation(() => Promise.resolve({ data: null, error: null }));
        supabaseAdmin.order.mockImplementation(() => Promise.resolve({ data: [], error: null }));
    });

    describe('POST /api/practice-questions', () => {
        it('should allow student to create a practice question', async () => {
            supabaseAdmin.single.mockImplementationOnce(() => Promise.resolve({
                data: { id: 'pq-1', question: 'Test?', status: 'pending' },
                error: null
            }));

            const response = await request(app)
                .post('/api/practice-questions')
                .set('x-mock-user-id', 'student-A')
                .send({ question: 'Test?' });

            expect(response.status).toBe(200);
            expect(response.body.question.id).toBe('pq-1');
            expect(supabaseAdmin.insert).toHaveBeenCalledWith(expect.objectContaining({
                student_id: 'student-A',
                question: 'Test?'
            }));
        });
    });

    describe('GET /api/practice-questions', () => {
        it('should return owned practice questions', async () => {
            supabaseAdmin.order.mockImplementationOnce(() => Promise.resolve({
                data: [{ id: 'pq-1' }],
                error: null
            }));

            const response = await request(app)
                .get('/api/practice-questions')
                .set('x-mock-user-id', 'student-A');

            expect(response.status).toBe(200);
            expect(supabaseAdmin.eq).toHaveBeenCalledWith('student_id', 'student-A');
        });
    });

    describe('GET /api/practice-questions/:id', () => {
        it('should prevent cross-student access', async () => {
            supabaseAdmin.single.mockImplementationOnce(() => Promise.resolve({
                data: null,
                error: new Error('Not found')
            }));

            const response = await request(app)
                .get('/api/practice-questions/pq-1')
                .set('x-mock-user-id', 'student-B');

            expect(response.status).toBe(403);
            expect(supabaseAdmin.eq).toHaveBeenCalledWith('student_id', 'student-B');
        });
    });

    describe('POST /api/practice-attempts', () => {
        it('should allow attempt creation for an owned question and maintain status logic', async () => {
            supabaseAdmin.single
                .mockImplementationOnce(() => Promise.resolve({
                    data: { id: 'pq-1' },
                    error: null
                }))
                .mockImplementationOnce(() => Promise.resolve({
                    data: { id: 'attempt-1', evaluation: 'incorrect' },
                    error: null
                }));

            const response = await request(app)
                .post('/api/practice-attempts')
                .set('x-mock-user-id', 'student-A')
                .send({
                    practice_question_id: 'pq-1',
                    answer: 'Wrong answer',
                    evaluation: 'incorrect',
                    attempt_number: 1,
                    hints_used: 1,
                    answer_revealed: false
                });

            expect(response.status).toBe(200);
            expect(supabaseAdmin.insert).toHaveBeenCalledWith(expect.objectContaining({
                student_id: 'student-A',
                practice_question_id: 'pq-1',
                evaluation: 'incorrect'
            }));

            expect(supabaseAdmin.update).toHaveBeenCalledWith({ status: 'in_progress' });
        });

        it('should prevent attempt creation for another student question', async () => {
            supabaseAdmin.single.mockImplementationOnce(() => Promise.resolve({
                data: null,
                error: new Error('Forbidden')
            }));

            const response = await request(app)
                .post('/api/practice-attempts')
                .set('x-mock-user-id', 'student-B')
                .send({
                    practice_question_id: 'pq-studentA',
                    answer: 'Some answer',
                    evaluation: 'correct',
                    attempt_number: 1
                });

            expect(response.status).toBe(403);
            expect(supabaseAdmin.insert).not.toHaveBeenCalled();
        });
    });
});
