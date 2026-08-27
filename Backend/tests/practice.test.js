const request = require('supertest');
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

// Mock generative-ai
jest.mock('@google/generative-ai', () => {
    const fn = jest.fn().mockResolvedValue({
        response: {
            text: jest.fn().mockReturnValue(JSON.stringify({
                evaluation: 'incorrect',
                reason: 'Mock reason'
            }))
        }
    });
    return {
        _mockGenerateContent: fn,
        GoogleGenerativeAI: jest.fn().mockImplementation(() => {
            return {
                getGenerativeModel: jest.fn().mockReturnValue({
                    generateContent: fn
                })
            };
        }),
        SchemaType: { OBJECT: 'OBJECT', STRING: 'STRING', ARRAY: 'ARRAY' }
    };
});

const { _mockGenerateContent } = require('@google/generative-ai');
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

    describe('POST /api/practice-questions/:id/hint', () => {
        it('should allow owner to request hint 1 and increment hints_requested', async () => {
            supabaseAdmin.single.mockImplementationOnce(() => Promise.resolve({
                data: { id: 'pq-1', hints_requested: 0, hint_1: 'First hint', hint_2: 'Second hint' },
                error: null
            }));

            const response = await request(app)
                .post('/api/practice-questions/pq-1/hint')
                .set('x-mock-user-id', 'student-A');

            expect(response.status).toBe(200);
            expect(response.body.hint).toBe('First hint');
            expect(response.body.hints_requested).toBe(1);
            expect(supabaseAdmin.update).toHaveBeenCalledWith({ hints_requested: 1 });
        });

        it('should allow owner to request hint 2 and increment hints_requested', async () => {
            supabaseAdmin.single.mockImplementationOnce(() => Promise.resolve({
                data: { id: 'pq-1', hints_requested: 1, hint_1: 'First hint', hint_2: 'Second hint' },
                error: null
            }));

            const response = await request(app)
                .post('/api/practice-questions/pq-1/hint')
                .set('x-mock-user-id', 'student-A');

            expect(response.status).toBe(200);
            expect(response.body.hint).toBe('Second hint');
            expect(response.body.hints_requested).toBe(2);
            expect(supabaseAdmin.update).toHaveBeenCalledWith({ hints_requested: 2 });
        });

        it('should reject a third hint request', async () => {
            supabaseAdmin.single.mockImplementationOnce(() => Promise.resolve({
                data: { id: 'pq-1', hints_requested: 2, hint_1: 'First hint', hint_2: 'Second hint' },
                error: null
            }));

            const response = await request(app)
                .post('/api/practice-questions/pq-1/hint')
                .set('x-mock-user-id', 'student-A');

            expect(response.status).toBe(400);
            expect(supabaseAdmin.update).not.toHaveBeenCalled();
        });

        it('should prevent another student from requesting hints', async () => {
            supabaseAdmin.single.mockImplementationOnce(() => Promise.resolve({
                data: null,
                error: new Error('Forbidden')
            }));

            const response = await request(app)
                .post('/api/practice-questions/pq-1/hint')
                .set('x-mock-user-id', 'student-B');

            expect(response.status).toBe(403);
            expect(supabaseAdmin.update).not.toHaveBeenCalled();
        });
    });

    describe('POST /api/practice-attempts', () => {
        beforeEach(() => {
            _mockGenerateContent.mockClear();
            _mockGenerateContent.mockResolvedValue({
                response: {
                    text: jest.fn().mockReturnValue(JSON.stringify({
                        evaluation: 'incorrect',
                        reason: 'Mock reason'
                    }))
                }
            });
        });

        it('should evaluate an incorrect attempt against an owned question without changing completed status', async () => {
            supabaseAdmin.single
                // 1) Verify ownership 
                .mockImplementationOnce(() => Promise.resolve({
                    data: { id: 'pq-1', chunk_id: 'c-1', question: 'Q', concept: 'C', subject: 'S' },
                    error: null
                }))
                // 2) Insert attempt returns inserted row
                .mockImplementationOnce(() => Promise.resolve({
                    data: { id: 'attempt-1', evaluation: 'incorrect' },
                    error: null
                }));

            // 3) Eq logic returns arrays for past attempts, let's mock the select call chain that doesn't use single()
            // This is handled by default via mockReturnThis in jest for `.eq`
            supabaseAdmin.select.mockImplementationOnce(() => supabaseAdmin);

            const response = await request(app)
                .post('/api/practice-attempts')
                .set('x-mock-user-id', 'student-A')
                .send({
                    practice_question_id: 'pq-1',
                    answer: 'Wrong answer'
                });

            expect(response.status).toBe(200);
            expect(response.body.evaluation).toBe('incorrect');
            expect(response.body.completed).toBe(false);

            expect(supabaseAdmin.insert).toHaveBeenCalledWith(expect.objectContaining({
                student_id: 'student-A',
                practice_question_id: 'pq-1',
                evaluation: 'incorrect'
            }));

            // Should NOT have called update status to completed
            expect(supabaseAdmin.update).not.toHaveBeenCalled();
        });

        it('should evaluate a correct attempt and change question status to completed', async () => {
            _mockGenerateContent.mockResolvedValueOnce({
                response: {
                    text: jest.fn().mockReturnValue(JSON.stringify({
                        evaluation: 'correct',
                        reason: 'Mock precise reason'
                    }))
                }
            });

            supabaseAdmin.single
                // 1) Verify ownership 
                .mockImplementationOnce(() => Promise.resolve({
                    data: { id: 'pq-1', chunk_id: 'c-1', question: 'Q', concept: 'C', subject: 'S' },
                    error: null
                }))
                // 2) Insert attempt returns inserted row
                .mockImplementationOnce(() => Promise.resolve({
                    data: { id: 'attempt-2', evaluation: 'correct' },
                    error: null
                }));

            const response = await request(app)
                .post('/api/practice-attempts')
                .set('x-mock-user-id', 'student-A')
                .send({
                    practice_question_id: 'pq-1',
                    answer: 'Correc Answer'
                });

            expect(response.status).toBe(200);
            expect(response.body.evaluation).toBe('correct');
            expect(response.body.completed).toBe(true);

            expect(supabaseAdmin.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
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
                    answer: 'Some answer'
                });

            expect(response.status).toBe(403);
            expect(supabaseAdmin.insert).not.toHaveBeenCalled();
        });
    });

    describe('POST /api/practice-questions/:id/socratic', () => {
        it('should block if hints < 2', async () => {
            supabaseAdmin.single.mockImplementationOnce(() => Promise.resolve({
                data: { id: 'pq-1', hints_requested: 1 },
                error: null
            }));

            const response = await request(app)
                .post('/api/practice-questions/pq-1/socratic')
                .set('x-mock-user-id', 'student-A')
                .send({ message: 'Help' });

            expect(response.status).toBe(400);
        });
    });

    describe('POST /api/practice-questions/:id/reveal', () => {
        it('should update answer_revealed and log attempt', async () => {
            supabaseAdmin.single.mockImplementationOnce(() => Promise.resolve({
                data: { id: 'pq-1', status: 'pending', answer_revealed: false },
                error: null
            }));
            _mockGenerateContent.mockResolvedValueOnce({
                response: { text: jest.fn().mockReturnValue('Revealed') }
            });

            const response = await request(app)
                .post('/api/practice-questions/pq-1/reveal')
                .set('x-mock-user-id', 'student-A');

            expect(response.status).toBe(200);
            expect(supabaseAdmin.update).toHaveBeenCalledWith(expect.objectContaining({ answer_revealed: true }));
            expect(supabaseAdmin.insert).toHaveBeenCalledWith(expect.objectContaining({ answer_revealed: true }));
        });
    });
});
