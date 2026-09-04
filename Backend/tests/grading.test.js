const request = require('supertest');

// =====================================================================
// Mock dependencies before loading app
// =====================================================================
jest.mock('../src/lib/supabaseAdmin', () => {
    const mockBuilder = {
        from: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
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

jest.mock('../src/services/llm.router', () => ({
    generateWithFallback: jest.fn().mockResolvedValue(JSON.stringify({
        suggested_grade: 92,
        feedback: 'Excellent explanation of join algorithms with accurate complexity details.',
        strengths: ['Correct B+ tree index explanation', 'Well formatted SQL examples'],
        areas_for_improvement: ['Discuss memory bounds for hash join partitioned tables']
    }))
}));

const app = require('../src/app');

describe('Grading System API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/assignments', () => {
        it('returns assignments list successfully', async () => {
            const res = await request(app)
                .get('/api/assignments')
                .set('x-mock-role', 'teacher');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('assignments');
            expect(Array.isArray(res.body.assignments)).toBe(true);
            expect(res.body.assignments.length).toBeGreaterThan(0);
        });

        it('filters assignments by course_name', async () => {
            const res = await request(app)
                .get('/api/assignments?course_name=DBMS_Code_Reference_Annotated')
                .set('x-mock-role', 'teacher');

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.assignments)).toBe(true);
            res.body.assignments.forEach(a => {
                expect(a.course_name.toLowerCase()).toBe('dbms_code_reference_annotated'.toLowerCase());
            });
        });

        it('enriches assignments with student-specific status for student user', async () => {
            const studentId = '3d999019-498e-4d72-a4c2-dc194c25948a';
            const res = await request(app)
                .get('/api/assignments')
                .set('x-mock-role', 'student')
                .set('x-mock-user-id', studentId);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body.assignments)).toBe(true);
            const asg101 = res.body.assignments.find(a => a.id === 'asg-101');
            expect(asg101).toBeDefined();
            expect(asg101.status).toBe('graded');
            expect(asg101.grade).toBe(94);
        });

        it('allows students to submit coursework and updates assignment status', async () => {
            const studentId = 'student-test-submission-uuid';
            const submitRes = await request(app)
                .post('/api/submissions')
                .set('x-mock-role', 'student')
                .set('x-mock-user-id', studentId)
                .send({
                    assignment_id: 'asg-103',
                    submission_text: 'Student solution explaining Express auth middleware.'
                });

            expect(submitRes.status).toBe(201);
            expect(submitRes.body.submission).toHaveProperty('id');
            expect(submitRes.body.submission.student_id).toBe(studentId);

            // Re-query assignments as this student
            const asgRes = await request(app)
                .get('/api/assignments')
                .set('x-mock-role', 'student')
                .set('x-mock-user-id', studentId);

            const asg103 = asgRes.body.assignments.find(a => a.id === 'asg-103');
            expect(asg103).toBeDefined();
            expect(asg103.status).toBe('submitted');
        });
    });

    describe('POST /api/assignments', () => {
        it('forbids students from creating assignments', async () => {
            const res = await request(app)
                .post('/api/assignments')
                .set('x-mock-role', 'student')
                .send({
                    course_name: 'DBMS_Code_Reference_Annotated',
                    title: 'Student Attempt Assignment',
                    max_score: 100
                });

            expect(res.status).toBe(403);
        });

        it('allows teachers to create assignments with validation', async () => {
            const res = await request(app)
                .post('/api/assignments')
                .set('x-mock-role', 'teacher')
                .send({
                    course_name: 'DBMS_Code_Reference_Annotated',
                    title: 'Transactions & ACID Properties',
                    description: 'Analyze serializability and 2-phase locking protocol.',
                    rubric: 'Correctness: 50, Isolation levels: 50',
                    max_score: 100
                });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('assignment');
            expect(res.body.assignment.title).toBe('Transactions & ACID Properties');
        });

        it('rejects assignment creation with missing required fields', async () => {
            const res = await request(app)
                .post('/api/assignments')
                .set('x-mock-role', 'teacher')
                .send({
                    description: 'No title or course provided'
                });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /api/submissions', () => {
        it('returns all submissions for teachers', async () => {
            const res = await request(app)
                .get('/api/submissions')
                .set('x-mock-role', 'teacher');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('submissions');
            expect(Array.isArray(res.body.submissions)).toBe(true);
        });

        it('returns only Student A submissions when requested by Student A', async () => {
            const studentAId = '3d999019-498e-4d72-a4c2-dc194c25948a';
            const res = await request(app)
                .get('/api/submissions')
                .set('x-mock-role', 'student')
                .set('x-mock-user-id', studentAId);

            expect(res.status).toBe(200);
            expect(res.body.submissions.length).toBeGreaterThan(0);
            res.body.submissions.forEach(s => {
                expect(s.student_id).toBe(studentAId);
                expect(s.student_id).not.toBe('e47b1029-7928-4bc2-8a12-fc194c25948b');
            });
        });

        it('returns only Student B submissions when requested by Student B and none from Student A', async () => {
            const studentBId = 'e47b1029-7928-4bc2-8a12-fc194c25948b';
            const res = await request(app)
                .get('/api/submissions')
                .set('x-mock-role', 'student')
                .set('x-mock-user-id', studentBId);

            expect(res.status).toBe(200);
            expect(res.body.submissions.length).toBeGreaterThan(0);
            res.body.submissions.forEach(s => {
                expect(s.student_id).toBe(studentBId);
                expect(s.student_id).not.toBe('3d999019-498e-4d72-a4c2-dc194c25948a');
            });
        });

        it('returns an empty list for a newly registered student with zero submissions', async () => {
            const newStudentId = 'brand-new-student-uuid-999';
            const res = await request(app)
                .get('/api/submissions')
                .set('x-mock-role', 'student')
                .set('x-mock-user-id', newStudentId);

            expect(res.status).toBe(200);
            expect(res.body.submissions).toEqual([]);
        });

        it('ignores client-sent student_id query param for students and derives identity only from verified token', async () => {
            const studentBId = 'e47b1029-7928-4bc2-8a12-fc194c25948b';
            const victimStudentAId = '3d999019-498e-4d72-a4c2-dc194c25948a';

            // Student B attempts to tamper with query param to see Student A's work
            const res = await request(app)
                .get(`/api/submissions?student_id=${victimStudentAId}`)
                .set('x-mock-role', 'student')
                .set('x-mock-user-id', studentBId);

            expect(res.status).toBe(200);
            res.body.submissions.forEach(s => {
                // Must strictly return Student B's submissions, completely ignoring victimStudentAId
                expect(s.student_id).toBe(studentBId);
                expect(s.student_id).not.toBe(victimStudentAId);
            });
        });

        it('filters submissions by status=graded', async () => {
            const res = await request(app)
                .get('/api/submissions?status=graded')
                .set('x-mock-role', 'teacher');

            expect(res.status).toBe(200);
            res.body.submissions.forEach(s => {
                expect(s.status).toBe('graded');
                expect(s.grade).not.toBeNull();
            });
        });
    });

    describe('PUT /api/submissions/:id/grade', () => {
        it('forbids students from grading submissions', async () => {
            const res = await request(app)
                .put('/api/submissions/sub-202/grade')
                .set('x-mock-role', 'student')
                .send({ grade: 90, feedback: 'Self-grading not allowed' });

            expect(res.status).toBe(403);
        });

        it('validates score range (rejects negative or > 100 values)', async () => {
            const resNegative = await request(app)
                .put('/api/submissions/sub-202/grade')
                .set('x-mock-role', 'teacher')
                .send({ grade: -10, feedback: 'Invalid score' });
            expect(resNegative.status).toBe(400);

            const resOver = await request(app)
                .put('/api/submissions/sub-202/grade')
                .set('x-mock-role', 'teacher')
                .send({ grade: 150, feedback: 'Invalid score' });
            expect(resOver.status).toBe(400);
        });

        it('allows teachers to assign and update grades with feedback', async () => {
            const res = await request(app)
                .put('/api/submissions/sub-202/grade')
                .set('x-mock-role', 'teacher')
                .send({
                    grade: 88,
                    feedback: 'Great pointer reversal logic and Floyd proof.'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('submission');
            expect(res.body.submission.grade).toBe(88);
            expect(res.body.submission.status).toBe('graded');
            expect(res.body.submission.feedback).toContain('Great pointer reversal');
        });
    });

    describe('POST /api/submissions/:id/ai-suggest', () => {
        it('forbids students from triggering teacher AI suggestion', async () => {
            const res = await request(app)
                .post('/api/submissions/sub-202/ai-suggest')
                .set('x-mock-role', 'student');

            expect(res.status).toBe(403);
        });

        it('returns structured AI grade suggestion for teacher review', async () => {
            const res = await request(app)
                .post('/api/submissions/sub-202/ai-suggest')
                .set('x-mock-role', 'teacher');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('ai_suggestion');
            expect(res.body.ai_suggestion).toHaveProperty('suggested_grade', 92);
            expect(res.body.ai_suggestion).toHaveProperty('feedback');
            expect(res.body.ai_suggestion.strengths).toBeDefined();
        });
    });

    describe('GET /api/grading/stats', () => {
        it('forbids students from accessing class grading statistics', async () => {
            const res = await request(app)
                .get('/api/grading/stats')
                .set('x-mock-role', 'student');

            expect(res.status).toBe(403);
        });

        it('returns comprehensive grading stats for teachers', async () => {
            const res = await request(app)
                .get('/api/grading/stats')
                .set('x-mock-role', 'teacher');

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('stats');
            expect(res.body.stats).toHaveProperty('totalSubmissions');
            expect(res.body.stats).toHaveProperty('gradedCount');
            expect(res.body.stats).toHaveProperty('ungradedCount');
            expect(res.body.stats).toHaveProperty('distribution');
        });
    });
});
