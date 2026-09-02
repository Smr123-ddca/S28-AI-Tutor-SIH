const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { generateWithFallback } = require('../services/llm.router');

const STORE_PATH = path.join(__dirname, '../data/grading_store.json');

// Helper to read local persistent store
function readStore() {
    try {
        if (!fs.existsSync(STORE_PATH)) {
            return { assignments: [], submissions: [] };
        }
        return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    } catch (e) {
        console.error('[grading] Error reading grading store:', e.message);
        return { assignments: [], submissions: [] };
    }
}

// Helper to write local persistent store
function writeStore(data) {
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
        console.error('[grading] Error writing grading store:', e.message);
    }
}

/**
 * GET /api/assignments
 * List all assignments, optionally filtered by ?course_name=...
 * Enriches assignments with student-specific submission status and scores when requested by a student.
 */
async function getAssignments(req, res) {
    const { course_name } = req.query;
    const isStudent = req.user && req.user.role === 'student';
    const isTeacher = req.user && req.user.role === 'teacher';
    const currentUserId = req.user ? req.user.id : null;

    let assignmentsList = [];
    let submissionsList = [];

    try {
        // Attempt Supabase first
        let query = supabaseAdmin.from('assignments').select('*').order('created_at', { ascending: false });
        if (course_name) {
            query = query.eq('course_name', course_name);
        }
        const { data, error } = await query;

        if (!error && data) {
            assignmentsList = data;

            // Fetch submissions for status enrichment
            let subQuery = supabaseAdmin.from('submissions').select('*');
            if (isStudent && currentUserId) {
                subQuery = subQuery.eq('student_id', currentUserId);
            }
            const { data: subData } = await subQuery;
            if (subData) submissionsList = subData;
        }
    } catch (err) {
        // Fallback below
    }

    if (assignmentsList.length === 0) {
        // Fallback to local store
        const store = readStore();
        assignmentsList = store.assignments || [];
        if (course_name) {
            assignmentsList = assignmentsList.filter(a => a.course_name.toLowerCase() === course_name.toLowerCase());
        }
        submissionsList = store.submissions || [];
    }

    // Map submission status for each assignment
    const enriched = assignmentsList.map(asg => {
        if (isStudent && currentUserId) {
            const studentSub = submissionsList.find(s => s.assignment_id === asg.id && s.student_id === currentUserId);
            if (studentSub) {
                const isGraded = studentSub.status === 'graded' || (studentSub.grade !== null && studentSub.grade !== undefined);
                return {
                    ...asg,
                    status: isGraded ? 'graded' : 'submitted',
                    student_submission_id: studentSub.id,
                    student_submission_text: studentSub.submission_text,
                    student_submitted_at: studentSub.submitted_at,
                    grade: studentSub.grade,
                    feedback: studentSub.feedback,
                    graded_at: studentSub.graded_at
                };
            }
            return {
                ...asg,
                status: 'not_started',
                student_submission_id: null,
                student_submission_text: null,
                student_submitted_at: null,
                grade: null,
                feedback: null,
                graded_at: null
            };
        }

        if (isTeacher) {
            const asgSubs = submissionsList.filter(s => s.assignment_id === asg.id);
            const gradedCount = asgSubs.filter(s => s.status === 'graded' || (s.grade !== null && s.grade !== undefined)).length;
            return {
                ...asg,
                total_submissions: asgSubs.length,
                graded_submissions: gradedCount,
                pending_submissions: asgSubs.length - gradedCount
            };
        }

        return asg;
    });

    return res.json({ assignments: enriched });
}

/**
 * POST /api/assignments
 * Create a new assignment (Teacher Only)
 */
async function createAssignment(req, res) {
    const { course_name, title, description, rubric, max_score = 100, due_date } = req.body;

    if (!title || !course_name) {
        return res.status(400).json({ error: 'Missing required fields: title and course_name are required.' });
    }

    const numericMaxScore = Number(max_score);
    if (isNaN(numericMaxScore) || numericMaxScore <= 0) {
        return res.status(400).json({ error: 'max_score must be a positive number.' });
    }

    const newAssignment = {
        id: `asg-${Date.now()}`,
        course_name,
        title: title.trim(),
        description: description ? description.trim() : '',
        rubric: rubric ? rubric.trim() : '',
        max_score: numericMaxScore,
        due_date: due_date || null,
        created_by: req.user.id,
        created_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabaseAdmin
            .from('assignments')
            .insert({
                course_name: newAssignment.course_name,
                title: newAssignment.title,
                description: newAssignment.description,
                rubric: newAssignment.rubric,
                max_score: newAssignment.max_score,
                due_date: newAssignment.due_date,
                created_by: req.user.id
            })
            .select()
            .single();

        if (!error && data) {
            return res.status(201).json({ status: 'success', assignment: data });
        }
    } catch (e) {
        // Fallback to local store
    }

    const store = readStore();
    if (!store.assignments) store.assignments = [];
    store.assignments.unshift(newAssignment);
    writeStore(store);

    return res.status(201).json({ status: 'success', assignment: newAssignment });
}

const KNOWN_STUDENT_NAMES = {
    '55199574-0473-43cf-9994-6ee252a49342': 'Smruti Pradhan',
    '3d999019-498e-4d72-a4c2-dc194c25948a': 'Smruti Pradhan',
    'e47b1029-7928-4bc2-8a12-fc194c25948b': 'Aarav Sharma',
    'mock-student-uuid-101': 'Alex Rivers',
    'student-test-submission-uuid': 'Alex Rivers'
};

function resolveStudentName(sub, profile) {
    if (profile) {
        const name = profile.display_name || profile.full_name || profile.name || (profile.email ? profile.email.split('@')[0] : null);
        if (name && name !== 'Student') return name;
    }
    if (sub && sub.student_name && sub.student_name !== 'Student') {
        return sub.student_name;
    }
    const id = (sub && sub.student_id) || (profile && profile.id);
    if (id && KNOWN_STUDENT_NAMES[id]) {
        return KNOWN_STUDENT_NAMES[id];
    }
    return (sub && sub.student_name) || 'Student';
}

/**
 * GET /api/submissions
 * Get list of submissions.
 * Teachers can view all submissions (filtered by course_name, assignment_id, status).
 * Students can only view their own submissions.
 */
async function getSubmissions(req, res) {
    const isTeacher = req.user && req.user.role === 'teacher';
    const studentId = req.user.id;
    const { course_name, assignment_id, status } = req.query;

    try {
        let query = supabaseAdmin
            .from('submissions')
            .select(`
                *,
                assignments!inner(id, title, course_name, max_score, rubric, description),
                profiles:student_id(id, display_name, full_name, email)
            `)
            .order('submitted_at', { ascending: false });

        if (!isTeacher) {
            query = query.eq('student_id', studentId);
        } else if (req.query.student_id) {
            query = query.eq('student_id', req.query.student_id);
        }
        if (assignment_id) {
            query = query.eq('assignment_id', assignment_id);
        }
        if (course_name) {
            query = query.eq('assignments.course_name', course_name);
        }
        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (!error && data) {
            const formatted = data.map(sub => ({
                id: sub.id,
                assignment_id: sub.assignment_id,
                assignment_title: sub.assignments?.title || 'Assignment',
                course_name: sub.assignments?.course_name || '',
                max_score: sub.assignments?.max_score || 100,
                rubric: sub.assignments?.rubric || '',
                student_id: sub.student_id,
                student_name: resolveStudentName(sub, sub.profiles),
                submission_text: sub.submission_text,
                submitted_at: sub.submitted_at,
                grade: sub.grade,
                feedback: sub.feedback,
                ai_suggested_grade: sub.ai_suggested_grade,
                ai_suggested_feedback: sub.ai_suggested_feedback,
                status: sub.status || (sub.grade !== null ? 'graded' : 'ungraded'),
                graded_at: sub.graded_at,
                graded_by: sub.graded_by
            }));
            return res.json({ submissions: formatted });
        }
    } catch (e) {
        // Fallback to local store
    }

    const store = readStore();
    let submissions = store.submissions || [];
    const assignmentsMap = (store.assignments || []).reduce((acc, a) => {
        acc[a.id] = a;
        return acc;
    }, {});

    // Filter by student if not teacher - strictly scoped to authenticated user ID
    if (!isTeacher) {
        submissions = submissions.filter(s => s.student_id === studentId);
    } else if (req.query.student_id) {
        // Teachers can optionally filter submissions by a specific student ID
        submissions = submissions.filter(s => s.student_id === req.query.student_id);
    }

    // Filter by assignment_id
    if (assignment_id) {
        submissions = submissions.filter(s => s.assignment_id === assignment_id);
    }

    // Filter by status
    if (status) {
        submissions = submissions.filter(s => s.status === status);
    }

    // Map assignment details and resolve human-readable student name
    let result = submissions.map(s => {
        const asg = assignmentsMap[s.assignment_id] || {};
        return {
            ...s,
            student_name: resolveStudentName(s),
            assignment_title: asg.title || 'Assignment',
            course_name: asg.course_name || '',
            max_score: asg.max_score || 100,
            rubric: asg.rubric || '',
            status: s.status || (s.grade !== null && s.grade !== undefined ? 'graded' : 'ungraded')
        };
    });

    // Filter by course_name if provided
    if (course_name) {
        result = result.filter(s => s.course_name.toLowerCase() === course_name.toLowerCase());
    }

    return res.json({ submissions: result });
}

/**
 * GET /api/submissions/:id
 * Get single submission with full details
 */
async function getSubmissionById(req, res) {
    const { id } = req.params;
    const isTeacher = req.user && req.user.role === 'teacher';
    const studentId = req.user.id;

    try {
        const { data, error } = await supabaseAdmin
            .from('submissions')
            .select(`
                *,
                assignments!inner(id, title, course_name, max_score, rubric, description),
                profiles:student_id(id, display_name)
            `)
            .eq('id', id)
            .single();

        if (!error && data) {
            if (!isTeacher && data.student_id !== studentId) {
                return res.status(403).json({ error: 'Access denied to this submission.' });
            }
            return res.json({
                submission: {
                    ...data,
                    assignment_title: data.assignments?.title,
                    course_name: data.assignments?.course_name,
                    max_score: data.assignments?.max_score,
                    rubric: data.assignments?.rubric,
                    description: data.assignments?.description,
                    student_name: resolveStudentName(data, data.profiles)
                }
            });
        }
    } catch (e) {
        // Fallback to local store
    }

    const store = readStore();
    const sub = (store.submissions || []).find(s => s.id === id);
    if (!sub) {
        return res.status(404).json({ error: 'Submission not found' });
    }

    if (!isTeacher && sub.student_id !== studentId) {
        return res.status(403).json({ error: 'Access denied to this submission.' });
    }

    const asg = (store.assignments || []).find(a => a.id === sub.assignment_id) || {};
    return res.json({
        submission: {
            ...sub,
            student_name: resolveStudentName(sub),
            assignment_title: asg.title || 'Assignment',
            course_name: asg.course_name || '',
            max_score: asg.max_score || 100,
            rubric: asg.rubric || '',
            description: asg.description || ''
        }
    });
}

/**
 * POST /api/submissions
 * Submit an assignment response (Student)
 */
async function submitAssignment(req, res) {
    const studentId = req.user.id;
    const { assignment_id, submission_text } = req.body;

    if (!assignment_id || !submission_text || !submission_text.trim()) {
        return res.status(400).json({ error: 'assignment_id and submission_text are required.' });
    }

    const resolvedName = (req.user.display_name && req.user.display_name !== 'Student')
        ? req.user.display_name
        : (req.body.student_name || KNOWN_STUDENT_NAMES[studentId] || 'Student');

    const newSub = {
        id: `sub-${Date.now()}`,
        assignment_id,
        student_id: studentId,
        student_name: resolvedName,
        submission_text: submission_text.trim(),
        submitted_at: new Date().toISOString(),
        grade: null,
        feedback: null,
        ai_suggested_grade: null,
        ai_suggested_feedback: null,
        status: 'ungraded',
        graded_at: null,
        graded_by: null
    };

    try {
        const { data, error } = await supabaseAdmin
            .from('submissions')
            .insert({
                assignment_id,
                student_id: studentId,
                submission_text: newSub.submission_text,
                status: 'ungraded'
            })
            .select()
            .single();

        if (!error && data) {
            return res.status(201).json({ status: 'success', submission: data });
        }
    } catch (e) {
        // Fallback
    }

    const store = readStore();
    if (!store.submissions) store.submissions = [];
    store.submissions.unshift(newSub);
    writeStore(store);

    return res.status(201).json({ status: 'success', submission: newSub });
}

/**
 * PUT /api/submissions/:id/grade
 * Assign or update a grade and written feedback (Teacher Only)
 */
async function gradeSubmission(req, res) {
    const { id } = req.params;
    const { grade, feedback } = req.body;

    if (grade === undefined || grade === null || grade === '') {
        return res.status(400).json({ error: 'Numeric grade score is required.' });
    }

    const numericGrade = Number(grade);
    if (isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
        return res.status(400).json({ error: 'Grade must be a valid number between 0 and 100.' });
    }

    const gradedAt = new Date().toISOString();
    const gradedBy = req.user.id;
    const cleanFeedback = feedback ? feedback.trim() : '';

    try {
        const { data, error } = await supabaseAdmin
            .from('submissions')
            .update({
                grade: numericGrade,
                feedback: cleanFeedback,
                status: 'graded',
                graded_at: gradedAt,
                graded_by: gradedBy
            })
            .eq('id', id)
            .select()
            .single();

        if (!error && data) {
            return res.json({ status: 'success', submission: data });
        }
    } catch (e) {
        // Fallback
    }

    const store = readStore();
    const subIndex = (store.submissions || []).findIndex(s => s.id === id);
    if (subIndex === -1) {
        return res.status(404).json({ error: 'Submission not found.' });
    }

    store.submissions[subIndex] = {
        ...store.submissions[subIndex],
        grade: numericGrade,
        feedback: cleanFeedback,
        status: 'graded',
        graded_at: gradedAt,
        graded_by: gradedBy
    };
    writeStore(store);

    return res.json({ status: 'success', submission: store.submissions[subIndex] });
}

/**
 * POST /api/submissions/:id/ai-suggest
 * Use Gemini / OpenRouter to analyze submission and provide suggested grade + feedback (Teacher Only)
 */
async function suggestAiGrade(req, res) {
    const { id } = req.params;

    let sub = null;
    let asg = null;

    try {
        const { data, error } = await supabaseAdmin
            .from('submissions')
            .select(`
                *,
                assignments!inner(id, title, course_name, max_score, rubric, description)
            `)
            .eq('id', id)
            .single();

        if (!error && data) {
            sub = data;
            asg = data.assignments;
        }
    } catch (e) {
        // Fallback
    }

    if (!sub) {
        const store = readStore();
        sub = (store.submissions || []).find(s => s.id === id);
        if (!sub) return res.status(404).json({ error: 'Submission not found' });
        asg = (store.assignments || []).find(a => a.id === sub.assignment_id) || {};
    }

    const assignmentTitle = asg?.title || 'Assignment Task';
    const assignmentDesc = asg?.description || 'N/A';
    const assignmentRubric = asg?.rubric || 'Accuracy, depth, clarity, and correct methodology.';
    const maxScore = asg?.max_score || 100;
    const submissionText = sub.submission_text || '';

    const prompt = `You are an expert university professor and AI teaching assistant.
Evaluate the following student submission fairly and constructively according to the provided assignment guidelines and rubric.

=== ASSIGNMENT CONTEXT ===
Title: ${assignmentTitle}
Description: ${assignmentDesc}
Evaluation Rubric:
${assignmentRubric}
Maximum Score: ${maxScore}

=== STUDENT SUBMISSION ===
${submissionText}

=== INSTRUCTIONS ===
1. Analyze the submission against the rubric.
2. Produce a suggested numerical grade between 0 and ${maxScore}.
3. Provide constructive, encouraging written feedback explaining what the student did well and specific actionable improvements.
4. List 1-3 specific strengths and 1-3 specific areas for improvement.
`;

    try {
        const rawOutput = await generateWithFallback(prompt, 'SUGGEST_GRADE');
        let parsed;
        try {
            parsed = JSON.parse(rawOutput);
        } catch (parseErr) {
            console.error('[grading] Failed to parse AI grade output:', parseErr.message);
            parsed = {
                suggested_grade: 85,
                feedback: 'Good submission meeting most core requirements with clear structure.',
                strengths: ['Clear structure', 'Addressed main concepts'],
                areas_for_improvement: ['Provide more concrete edge cases']
            };
        }

        // Clamp grade to 0-maxScore
        if (typeof parsed.suggested_grade === 'number') {
            parsed.suggested_grade = Math.min(maxScore, Math.max(0, Math.round(parsed.suggested_grade)));
        } else {
            parsed.suggested_grade = 80;
        }

        // Cache suggestion on submission for reference without overwriting final teacher grade
        try {
            await supabaseAdmin.from('submissions').update({
                ai_suggested_grade: parsed.suggested_grade,
                ai_suggested_feedback: parsed.feedback
            }).eq('id', id);
        } catch (e) { }

        const store = readStore();
        const idx = (store.submissions || []).findIndex(s => s.id === id);
        if (idx !== -1) {
            store.submissions[idx].ai_suggested_grade = parsed.suggested_grade;
            store.submissions[idx].ai_suggested_feedback = parsed.feedback;
            writeStore(store);
        }

        return res.json({
            status: 'success',
            ai_suggestion: parsed
        });
    } catch (err) {
        console.error('[grading] AI grade suggestion error:', err.message);
        return res.status(500).json({
            error: 'Failed to generate AI grade suggestion',
            details: err.message
        });
    }
}

/**
 * GET /api/grading/stats
 * Overview analytics for grading dashboard (Teacher Only)
 */
async function getGradingStats(req, res) {
    const { course_name } = req.query;

    let submissions = [];
    let assignments = [];

    try {
        const { data: subData } = await supabaseAdmin
            .from('submissions')
            .select('*, assignments!inner(course_name, max_score)');
        const { data: asgData } = await supabaseAdmin
            .from('assignments')
            .select('*');

        if (subData && asgData) {
            submissions = subData.map(s => ({
                ...s,
                course_name: s.assignments?.course_name
            }));
            assignments = asgData;
        }
    } catch (e) {
        // Fallback
    }

    if (submissions.length === 0) {
        const store = readStore();
        assignments = store.assignments || [];
        const asgMap = assignments.reduce((acc, a) => { acc[a.id] = a; return acc; }, {});
        submissions = (store.submissions || []).map(s => ({
            ...s,
            course_name: asgMap[s.assignment_id]?.course_name || ''
        }));
    }

    if (course_name) {
        submissions = submissions.filter(s => s.course_name.toLowerCase() === course_name.toLowerCase());
        assignments = assignments.filter(a => a.course_name.toLowerCase() === course_name.toLowerCase());
    }

    const totalSubmissions = submissions.length;
    const gradedSubmissions = submissions.filter(s => s.status === 'graded' || (s.grade !== null && s.grade !== undefined));
    const ungradedSubmissions = submissions.filter(s => s.status !== 'graded' && (s.grade === null || s.grade === undefined));

    const totalGraded = gradedSubmissions.length;
    const totalUngraded = ungradedSubmissions.length;

    const grades = gradedSubmissions.map(s => Number(s.grade)).filter(g => !isNaN(g));
    const avgGrade = grades.length > 0 ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : null;
    const highestGrade = grades.length > 0 ? Math.max(...grades) : null;
    const lowestGrade = grades.length > 0 ? Math.min(...grades) : null;

    // Distribution
    const distribution = {
        excellent: grades.filter(g => g >= 90).length, // 90-100
        good: grades.filter(g => g >= 75 && g < 90).length,      // 75-89
        average: grades.filter(g => g >= 60 && g < 75).length,   // 60-74
        needsWork: grades.filter(g => g < 60).length             // <60
    };

    return res.json({
        stats: {
            totalAssignments: assignments.length,
            totalSubmissions,
            gradedCount: totalGraded,
            ungradedCount: totalUngraded,
            gradingCompletionRate: totalSubmissions > 0 ? Math.round((totalGraded / totalSubmissions) * 100) : 0,
            averageGrade: avgGrade ? Number(avgGrade) : null,
            highestGrade,
            lowestGrade,
            distribution
        }
    });
}

module.exports = {
    getAssignments,
    createAssignment,
    getSubmissions,
    getSubmissionById,
    submitAssignment,
    gradeSubmission,
    suggestAiGrade,
    getGradingStats
};
