const request = require('supertest');

// MOCK the authentication middleware
jest.mock('../src/middleware/auth.middleware', () => ({
    authenticate: (req, res, next) => {
        req.user = { id: req.headers['x-mock-user-id'] || 'teacher-123', role: 'teacher' };
        if (req.headers['x-mock-role'] === 'student') req.user.role = 'student';
        next();
    },
    requireRole: (role) => (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    }
}));

// MOCK Supabase globally
let mockRowLevelSelect = {
    data: { id: 'mock-course-id', name: 'Mock_Course' },
    error: null
};

let mockEdgeSelect = {
    data: { id: 'mock-rel', prerequisite_concept_id: 'C1', target_concept_id: 'C2', relationship_type: 'REQUIRED', reason: 'Because' },
    error: null
};

let mockUserCourseSelect = {
    data: { user_id: 'teacher-123', course_id: 'mock-course-id', role: 'author' },
    error: null
};

jest.mock('../src/lib/supabaseAdmin', () => {
    const mockBuilder = {
        from: jest.fn().mockImplementation((table) => {
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                or: jest.fn().mockReturnThis(),
                single: jest.fn().mockImplementation(() => {
                    if (table === 'courses') return Promise.resolve(mockRowLevelSelect);
                    if (table === 'user_courses') return Promise.resolve(mockUserCourseSelect);
                    if (table === 'prerequisite_relationships') return Promise.resolve(mockEdgeSelect);
                    return Promise.resolve({ data: null, error: null });
                }),
                update: jest.fn().mockReturnThis()
            };
        })
    };
    return { supabaseAdmin: mockBuilder };
});

const app = require('../src/app');

describe('Course Prerequisites Update Validations (Phase 2C)', () => {

    beforeEach(() => {
        // Reset mocks to successful defaults
        mockRowLevelSelect = { data: { id: 'mock-course-id', name: 'Mock_Course' }, error: null };
        mockEdgeSelect = { data: { id: 'mock-rel', prerequisite_concept_id: 'C1', target_concept_id: 'C2', relationship_type: 'REQUIRED', reason: 'Because' }, error: null };
        mockUserCourseSelect = { data: { user_id: 'teacher-123', course_id: 'mock-course-id', role: 'author' }, error: null };
    });

    it('1. Valid relationship type update', async () => {
        // Mock the update to return the updated record
        mockEdgeSelect = { data: { id: 'mock-rel', prerequisite_concept_id: 'C1', target_concept_id: 'C2', relationship_type: 'SUPPORTING', reason: 'Because' }, error: null };

        const res = await request(app)
            .patch(`/api/courses/Mock_Course/prerequisites/mock-rel`)
            .set('x-mock-role', 'teacher')
            .send({ relationship_type: 'SUPPORTING' });

        expect(res.status).toBe(200);
        expect(res.body.relationship_type).toBe('SUPPORTING');
    });

    it('2. Invalid relationship type rejected', async () => {
        const res = await request(app)
            .patch(`/api/courses/Mock_Course/prerequisites/mock-rel`)
            .set('x-mock-role', 'teacher')
            .send({ relationship_type: 'INVALID_TYPE_BLAH' });

        expect(res.status).toBe(400); // Because of validation
    });

    it('3. Unauthorized (Student Role) rejected', async () => {
        const res = await request(app)
            .patch(`/api/courses/Mock_Course/prerequisites/mock-rel`)
            .set('x-mock-role', 'student') // Not a teacher
            .send({ relationship_type: 'SUPPORTING' });

        expect(res.status).toBe(403);
    });

    it('4. Relationship bounded to incorrect course URL rejected', async () => {
        // Mock edge select failing because course_id does not match relationship edge
        mockEdgeSelect = { data: null, error: { message: 'Not found' } };

        const res = await request(app)
            .patch(`/api/courses/Mock_Course/prerequisites/mock-rel`)
            .set('x-mock-role', 'teacher')
            .send({ relationship_type: 'SUPPORTING' });

        expect(res.status).toBe(404);
    });

    it('5. Nonexistent relationship rejected', async () => {
        // Mock edge not found
        mockEdgeSelect = { data: null, error: { message: 'Not found' } };

        const res = await request(app)
            .patch(`/api/courses/Mock_Course/prerequisites/nonexistent`)
            .set('x-mock-role', 'teacher')
            .send({ relationship_type: 'SUPPORTING' });

        expect(res.status).toBe(404);
    });
});
