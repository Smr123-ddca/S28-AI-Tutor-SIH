const request = require('supertest');
const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { getCourses } = require('../src/controllers/course.controller');
const { explain } = require('../src/controllers/explain.controller');

// Mock dependencies and constants
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const generateToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

const studentToken = generateToken({ id: 'stu123', email: 'stu@test.com', role: 'student' });
const teacherToken = generateToken({ id: 'tea123', email: 'tea@test.com', role: 'teacher' });

const app = express();
app.use(express.json());

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid Token' });
    }
};

app.get('/api/courses', authenticate, getCourses);
app.post('/api/explain', authenticate, explain);

// Create dummy DB structure
const dbPath = path.join(__dirname, '../src/data/courses.json');
const courseAChunksPath = path.join(__dirname, '../src/data/CourseA_chunks.json');
const courseBChunksPath = path.join(__dirname, '../src/data/CourseB_chunks.json');
const courseCChunksPath = path.join(__dirname, '../src/data/CourseC_chunks.json');

let backupDB = '';
let backupA = '';
let backupB = '';
let backupC = '';

beforeAll(() => {
    if (fs.existsSync(dbPath)) backupDB = fs.readFileSync(dbPath, 'utf8');
    if (fs.existsSync(courseAChunksPath)) backupA = fs.readFileSync(courseAChunksPath, 'utf8');
    if (fs.existsSync(courseBChunksPath)) backupB = fs.readFileSync(courseBChunksPath, 'utf8');
    if (fs.existsSync(courseCChunksPath)) backupC = fs.readFileSync(courseCChunksPath, 'utf8');

    // 1. Create a published course, an approved (unpublished) course, and a pending course
    const mockDB = [
        { name: 'CourseA', status: 'published', chunks: 'CourseA_chunks.json' },
        { name: 'CourseB', status: 'published', chunks: 'CourseB_chunks.json' },
        { name: 'CourseC', status: 'approved', chunks: 'CourseC_chunks.json' }
    ];
    fs.writeFileSync(dbPath, JSON.stringify(mockDB), 'utf8');

    const mockA = [
        { id: 'cA_1', topic: 'Math', section_label: 'Algebra', text: 'Algebra uses equations.' },
        { id: 'cA_2', topic: 'Math', section_label: 'Geometry', text: 'Triangles revolve around shapes.' }
    ];
    fs.writeFileSync(courseAChunksPath, JSON.stringify(mockA), 'utf8');

    const mockB = [
        { id: 'cB_1', topic: 'Science', section_label: 'Biology', text: 'Cells are living things.' }
    ];
    fs.writeFileSync(courseBChunksPath, JSON.stringify(mockB), 'utf8');

    const mockC = [
        { id: 'cC_1', topic: 'History', section_label: 'Ancient', text: 'Rome was big.' }
    ];
    fs.writeFileSync(courseCChunksPath, JSON.stringify(mockC), 'utf8');

    // Reload the store memory map explicitly after disk writes
    const store = require('../src/data/store');
    store.loadData();
});

afterAll(() => {
    if (backupDB) fs.writeFileSync(dbPath, backupDB, 'utf8');
    else if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    if (backupA) fs.writeFileSync(courseAChunksPath, backupA, 'utf8');
    else if (fs.existsSync(courseAChunksPath)) fs.unlinkSync(courseAChunksPath);

    if (backupB) fs.writeFileSync(courseBChunksPath, backupB, 'utf8');
    else if (fs.existsSync(courseBChunksPath)) fs.unlinkSync(courseBChunksPath);

    if (backupC) fs.writeFileSync(courseCChunksPath, backupC, 'utf8');
    else if (fs.existsSync(courseCChunksPath)) fs.unlinkSync(courseCChunksPath);

    // Stop app and re-load store to reset changes
    const store = require('../src/data/store');
    store.loadData();
});

describe('Layer 5: Published Knowledge Integration API Tests', () => {

    test('Students should only be able to view Published courses in Course list', async () => {
        const res = await request(app)
            .get('/api/courses')
            .set('Authorization', `Bearer ${studentToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.courses.length).toBe(2);
        expect(res.body.courses.map(c => c.name)).toContain('CourseA');
        expect(res.body.courses.map(c => c.name)).toContain('CourseB');
        expect(res.body.courses.map(c => c.name)).not.toContain('CourseC');
    });

    test('Teachers should see ALL courses in Course list', async () => {
        const res = await request(app)
            .get('/api/courses')
            .set('Authorization', `Bearer ${teacherToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.courses.length).toBe(3);
        expect(res.body.courses.map(c => c.name)).toContain('CourseC');
    });

    test('Retrieval should return empty set for queries on an Unpublished course (CourseC)', async () => {
        const res = await request(app)
            .post('/api/explain')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                question: 'Tell me about Rome.',
                course: 'CourseC'
            });

        // Because Course C is unpublished, the controller strictly blocks it with 403
        expect(res.statusCode).toEqual(403);
        expect(res.body.error).toContain('Cannot query an unpublished or non-existent course');
    });

    test('Cross-contamination: Course A queries must NOT retrieve Course B facts', async () => {
        const res = await request(app)
            .post('/api/explain')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                question: 'Tell me about living cells.', // This exists ONLY in Course B
                course: 'CourseA' // Student searches within Course A
            });

        // Course A contains math entirely, so requesting biology fails cleanly
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('insufficient_evidence');
    });

    test('Publish visibility: Missing course argument blocks explain controller', async () => {
        const res = await request(app)
            .post('/api/explain')
            .set('Authorization', `Bearer ${studentToken}`)
            .send({
                question: 'Explain algebra.'
            });

        expect(res.statusCode).toEqual(400);
        expect(res.body.error).toContain('course selection is mandatory');
    });
});
