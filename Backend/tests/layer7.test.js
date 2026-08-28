const request = require('supertest');
const fs = require('fs');
const path = require('path');

// MOCK AUTH MIDDLEWARE BEFORE REQUIRING APP
jest.mock('../src/middleware/auth.middleware', () => ({
    authenticate: (req, res, next) => {
        if (!req.headers.authorization) return res.status(401).json({ error: 'Missing token' });

        if (req.headers.authorization === 'Bearer mock-teacher-token') {
            req.user = { id: 'teacher_1', role: 'teacher' };
        } else if (req.headers.authorization === 'Bearer mock-student-token') {
            req.user = { id: 'student_1', role: 'student' };
        } else {
            return res.status(401).json({ error: 'Invalid token' });
        }
        next();
    },
    requireRole: (role) => (req, res, next) => {
        if (req.user && req.user.role === role) {
            next();
        } else {
            res.status(403).json({ error: 'Requires role: ' + role });
        }
    }
}));

jest.mock('fs', () => {
    const originalModule = jest.requireActual('fs');
    return {
        ...originalModule,
        existsSync: jest.fn(),
        readFileSync: jest.fn(),
        writeFileSync: jest.fn(),
        unlinkSync: jest.fn()
    };
});

// Mock Supabase DB internally for the test to prevent errors when endpoints auto-invoke DB loggers
jest.mock('../src/lib/supabaseAdmin', () => ({
    supabaseAdmin: {
        from: jest.fn()
    }
}));

const app = require('../src/app');
const store = require('../src/data/store');

describe('Layer 7: Secure Course Deletion API (Teacher Feature)', () => {
    let _mockCourses = [];
    let _unlinkedFiles = [];

    beforeAll(() => {
        jest.spyOn(console, 'log').mockImplementation(() => { });
        jest.spyOn(console, 'warn').mockImplementation(() => { });
        jest.spyOn(console, 'error').mockImplementation(() => { });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        _unlinkedFiles = [];

        _mockCourses = [
            { name: 'PendingAuth', status: 'pending_review', pdf: 'PendingAuth.pdf', chunks: 'PendingAuth_chunks.json', prerequisites: 'PendingAuth_prerequisites.json' },
            { name: 'ApprovedMath', status: 'approved', pdf: 'Math.pdf' },
            { name: 'PublishedDSA', status: 'published', pdf: 'DSA.pdf', chunks: 'DSA_chunks.json' }
        ];

        fs.existsSync.mockImplementation((filePath) => {
            if (typeof filePath === 'string' && (filePath.endsWith('.pdf') || filePath.endsWith('.json'))) return true;
            return false;
        });

        fs.readFileSync.mockImplementation((filePath, encoding) => {
            if (filePath.includes('courses.json')) {
                return JSON.stringify(_mockCourses);
            }
            if (filePath.includes('_chunks.json')) {
                return JSON.stringify([{ id: 'c1', text: 'chunk 1 data' }]);
            }
            return '{}';
        });

        fs.writeFileSync.mockImplementation((filePath, data) => {
            if (filePath.includes('courses.json')) {
                _mockCourses = JSON.parse(data);
            }
        });

        fs.unlinkSync.mockImplementation((filePath) => {
            _unlinkedFiles.push(path.basename(filePath));
        });
    });

    it('Test 1: Student receives 403 Forbidden attempting to delete a course', async () => {
        const res = await request(app)
            .delete('/api/courses/PublishedDSA')
            .set('Authorization', 'Bearer mock-student-token');

        expect(res.status).toBe(403);
        expect(res.body.error).toMatch(/Requires role: teacher/i);
    });

    it('Test 2: Unauthenticated user receives 401 Unauthorized', async () => {
        const res = await request(app)
            .delete('/api/courses/PublishedDSA');

        expect(res.status).toBe(401);
    });

    it('Test 3: Non-existent course returns 404', async () => {
        const res = await request(app)
            .delete('/api/courses/DoesNotExist')
            .set('Authorization', 'Bearer mock-teacher-token');

        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/Course not found/i);
    });

    it('Test 4: Cannot path-traverse via course parameter', async () => {
        const res = await request(app)
            .delete('/api/courses/..%2F..%2Fconfig')
            .set('Authorization', 'Bearer mock-teacher-token');

        // We explicitly block this securely natively now.
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('Invalid course name format');
    });

    it('Test 5: Teacher can successfully delete a published course and artifacts unlink', async () => {
        const res = await request(app)
            .delete('/api/courses/PublishedDSA')
            .set('Authorization', 'Bearer mock-teacher-token');

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('success');

        // Assert courses.json was updated
        expect(_mockCourses.length).toBe(2);
        expect(_mockCourses.find(c => c.name === 'PublishedDSA')).toBeUndefined();

        // Assert files unlinked safely utilizing paths. It should target precisely basenames requested
        expect(_unlinkedFiles).toContain('DSA.pdf');
        expect(_unlinkedFiles).toContain('DSA_chunks.json');

        // Expected synthesized fallbacks we auto-unlink just in case they exist:
        expect(_unlinkedFiles).toContain('PublishedDSA.pdf');
    });

    it('Test 6: Teacher can successfully delete a pending-review course securely', async () => {
        const res = await request(app)
            .delete('/api/courses/PendingAuth')
            .set('Authorization', 'Bearer mock-teacher-token');

        expect(res.status).toBe(200);
        expect(_mockCourses.find(c => c.name === 'PendingAuth')).toBeUndefined();
        expect(_unlinkedFiles).toContain('PendingAuth.pdf');
        expect(_unlinkedFiles).toContain('PendingAuth_chunks.json');
        expect(_unlinkedFiles).toContain('PendingAuth_prerequisites.json');
    });
});
