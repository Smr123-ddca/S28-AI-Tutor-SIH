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

const app = require('../src/app');

// We must require this after mocking to use the mock
jest.mock('../src/middleware/auth.middleware', () => {
    return {
        authenticate: (req, res, next) => {
            req.user = { id: req.headers['x-mock-user-id'] || 'student-A' };
            next();
        },
        requireRole: (role) => (req, res, next) => next()
    };
});

// Mock Supabase admin builder
jest.mock('../src/lib/supabaseAdmin', () => {
    const mockBuilder = {
        from: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnValue(Promise.resolve({ data: { id: "test-sess-123" }, error: null })),
        then: jest.fn((resolve) => resolve({ data: null, error: null }))
    };
    return { supabaseAdmin: mockBuilder };
});

jest.mock('../src/controllers/chatlog.controller', () => ({
    recordChatLog: jest.fn().mockResolvedValue('test-sess-123'),
    getChatLogs: jest.fn(),
    getSessions: jest.fn(),
    getSessionMessages: jest.fn(),
    createSession: jest.fn(),
    updateSessionTitle: jest.fn(),
    deleteSession: jest.fn()
}));

const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

// Mock Retrieval Service
jest.mock('../src/services/retrieval.service', () => {
    return {
        retrieve: jest.fn().mockReturnValue([{
            id: 'chunk-123',
            topic: 'Physics',
            section_label: 'Newton Laws',
            text: 'Newton Second law says F=ma',
            score: 0.8
        }])
    };
});

// Mock query analyzer to return specific types based on query to bypass true heuristic checking
jest.mock('../src/utils/queryExpander', () => ({
    buildRetrievalQuery: jest.fn((opts) => ({
        originalQuery: opts.userMessage,
        normalizedQuery: opts.userMessage,
        expandedQuery: opts.userMessage,
        queryType: 'COMPLETE',
        expandedTokens: ['test']
    }))
}));

const mockGeminiModel = {
    generateContent: jest.fn()
};

jest.mock('@google/generative-ai', () => {
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => {
            return {
                getGenerativeModel: () => mockGeminiModel
            };
        }),
        SchemaType: {
            OBJECT: "OBJECT",
            ARRAY: "ARRAY",
            STRING: "STRING"
        }
    };
});

jest.mock('../src/data/store', () => ({
    getChunks: jest.fn().mockReturnValue([])
}));

describe('Explain Controller - Practice Generation Phase 2', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGeminiModel.generateContent.mockReset();
        supabaseAdmin.insert.mockClear();
    });

    it('1, 2, 3, 4, 5, 6: Eligible conceptual question generates 2 practice questions and persists them successfully', async () => {
        const mockGeminiResponse = {
            status: 'answered',
            explanation_segments: [{ text: "explanation", source_chunk_id: "chunk-123" }],
            practice_questions: [
                { question: "Q1", concept: "C1", hint_1: "H1", hint_2: "H2" },
                { question: "Q2", concept: "C2", hint_1: "H3", hint_2: "H4" }
            ]
        };

        mockGeminiModel.generateContent.mockResolvedValueOnce({
            response: Promise.resolve({ text: () => JSON.stringify(mockGeminiResponse) })
        });

        const response = await request(app)
            .post('/api/explain')
            .set('x-mock-user-id', 'student-test')
            .send({ question: "Explain Newton's second law", session_id: "sess-123", subject: "DSA" });

        expect(response.status).toBe(200);

        // API Response Modification Check
        expect(response.body.practice).toBeDefined();
        expect(response.body.practice.available).toBe(true);
        expect(response.body.practice.count).toBe(2);

        // Assert they were NOT returned raw
        expect(response.body.practice_questions).toBeUndefined();

        // Check Persistence Call
        expect(supabaseAdmin.insert).toHaveBeenCalledTimes(2);

        // Validate Insertion object
        const insertArg1 = supabaseAdmin.insert.mock.calls[0][0];
        expect(insertArg1).toEqual(expect.objectContaining({
            student_id: 'student-test',
            session_id: 'sess-123',
            chunk_id: 'chunk-123',
            status: 'pending',
            question: 'Q1'
        }));
    });

    it('7, 8, 9: Non-practice-worthy models correctly skip generation', async () => {
        // Mock a homework pattern query that forces `graded_work_request`
        const response = await request(app)
            .post('/api/explain')
            .set('x-mock-user-id', 'student-test')
            .send({ question: "solve this for my homework", subject: "DSA" });

        expect(response.status).toBe(200);
        // Has guided_mode instead, skips Gemini and practice generation entirely
        expect(response.body.status).toBe('guided_mode');
        expect(supabaseAdmin.insert).toHaveBeenCalledTimes(0);
        expect(response.body.practice).toBeUndefined();
    });

    it('10: Practice generation database failure does NOT break chat response', async () => {
        const mockGeminiResponse = {
            status: 'answered',
            explanation_segments: [{ text: "explanation", source_chunk_id: "chunk-123" }],
            practice_questions: [
                { question: "Q1", concept: "C1", hint_1: "H1", hint_2: "H2" }
            ]
        };

        mockGeminiModel.generateContent.mockResolvedValueOnce({
            response: Promise.resolve({ text: () => JSON.stringify(mockGeminiResponse) })
        });

        // Force an error to occur dynamically on insert
        supabaseAdmin.insert.mockRejectedValueOnce(new Error("Supabase internal fault"));

        const response = await request(app)
            .post('/api/explain')
            .set('x-mock-user-id', 'student-test')
            .send({ question: "Explain logic gates", subject: "DSA" });

        expect(response.status).toBe(200); // the response is perfectly uninterrupted
        expect(response.body.practice.available).toBe(true);
        expect(supabaseAdmin.insert).toHaveBeenCalledTimes(1);
    });
});
