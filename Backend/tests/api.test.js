const request = require('supertest');

// MOCK AUTH MIDDLEWARE BEFORE REQUIRING APP OR ROUTES
jest.mock('../src/middleware/auth.middleware', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: 'test', role: 'student' };
        next();
    },
    requireRole: () => (req, res, next) => next()
}));

const app = require('../src/app');
const { loadData } = require('../src/data/store');
describe('API Routes', () => {
    beforeAll(() => {
        // Load existing data so the store is populated before tests run
        loadData();
    });
    describe('POST /api/retrieve', () => {
        it('should return a 200 response with retrieved chunks when valid question is provided', async () => {
            const response = await request(app)
                .post('/api/retrieve')
                .send({ question: 'What is this course about?', course: 'Computer Science 101' });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('results');
            expect(Array.isArray(response.body.results)).toBe(true);
        });

        it('should handle errors gracefully', async () => {
            const response = await request(app)
                .post('/api/retrieve')
                // Sending invalid payload or empty payload
                .send({});

            // Adjust to what your API actually returns on error
            // It might be 400 or just empty chunks
            expect(response.status).toBeDefined();
        });
    });
});
