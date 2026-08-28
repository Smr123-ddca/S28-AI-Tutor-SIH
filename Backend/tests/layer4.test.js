const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { approveCourse, reviseCourse, publishCourse } = require('../src/controllers/course.controller');

// Mock Auth Middlewares
// Inject a specific user role dynamically per test
let mockUser = { id: 'test-user-id', role: 'teacher' };
const authenticate = (req, res, next) => {
    if (!mockUser) return res.status(401).json({ error: 'Auth failed' });
    req.user = mockUser;
    next();
};
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
};

const app = express();
app.use(express.json());
app.post('/api/courses/:courseName/approve', authenticate, requireRole('teacher'), approveCourse);
app.post('/api/courses/:courseName/revision', authenticate, requireRole('teacher'), reviseCourse);
app.post('/api/courses/:courseName/publish', authenticate, requireRole('teacher'), publishCourse);

// Mock DB
const dbPath = path.join(__dirname, '../src/data/courses.json');
let backupDB = '';

describe('Layer 4: Teacher Approval & Publishing APIs', () => {
    beforeAll(() => {
        if (fs.existsSync(dbPath)) backupDB = fs.readFileSync(dbPath, 'utf8');

        // Setup initial dummy db
        fs.writeFileSync(dbPath, JSON.stringify([
            { name: "Test_Course", status: "pending_review" }
        ]), 'utf8');
    });

    afterAll(() => {
        // Restore db
        if (backupDB) fs.writeFileSync(dbPath, backupDB, 'utf8');
    });

    beforeEach(() => {
        // reset DB per test
        fs.writeFileSync(dbPath, JSON.stringify([
            { name: "Test_Course", status: "pending_review" }
        ]), 'utf8');
        // default teacher
        mockUser = { id: 'teacher-123', role: 'teacher' };
    });

    it('Student cannot approve (receives 403)', async () => {
        mockUser = { id: 'student-123', role: 'student' };
        const res = await request(app).post('/api/courses/Test_Course/approve');
        expect(res.status).toBe(403);
    });

    it('Unauthenticated request cannot approve (receives 401)', async () => {
        mockUser = null;
        const res = await request(app).post('/api/courses/Test_Course/approve');
        expect(res.status).toBe(401);
    });

    it('Teacher can mark a batch for revision', async () => {
        const res = await request(app)
            .post('/api/courses/Test_Course/revision')
            .send({ reason: "Needs more info" });
        expect(res.status).toBe(200);
        expect(res.body.course.status).toBe("needs_revision");
        expect(res.body.course.audit.revisionReason).toBe("Needs more info");
    });

    it('Teacher can approve a READY_FOR_REVIEW batch', async () => {
        const res = await request(app).post('/api/courses/Test_Course/approve');
        expect(res.status).toBe(200);
        expect(res.body.course.status).toBe("approved");
        expect(res.body.course.audit.approvedBy).toBe('teacher-123');
    });

    it('Unapproved batch cannot be published', async () => {
        // test_course is pending_review
        const res = await request(app).post('/api/courses/Test_Course/publish');
        expect(res.status).toBe(403);
        expect(res.body.error).toContain("must be strictly 'approved'");
    });

    it('Approved batch can be published', async () => {
        // First approve
        await request(app).post('/api/courses/Test_Course/approve');
        // Then publish
        const res = await request(app).post('/api/courses/Test_Course/publish');

        expect(res.status).toBe(200);
        expect(res.body.course.status).toBe("published");
        expect(res.body.course.audit.publishedBy).toBe('teacher-123');
    });

});
