const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

// ======================================================================
// MASTERY THRESHOLDS & ATTENTION CRITERIA
// ======================================================================
const MASTERY_THRESHOLDS = {
    STRONG: 75,       // >= 75%  → 🟢 Strong
    DEVELOPING: 60,   // 60-74%  → 🟡 Developing
    SUPPORT_CUTOFF: 60 // < 60%   → 🔴 Needs Support / Attention
};

const KNOWN_STUDENT_NAMES = {
    '55199574-0473-43cf-9994-6ee252a49342': 'Smruti Pradhan',
    '3d999019-498e-4d72-a4c2-dc194c25948a': 'Smruti Pradhan',
    'e47b1029-7928-4bc2-8a12-fc194c25948b': 'Aarav Sharma',
    'mock-student-uuid-101': 'Alex Rivers',
    'student-test-submission-uuid': 'Alex Rivers'
};

function resolveStudentName(id, profileName, subName) {
    if (profileName && profileName !== 'Student') return profileName;
    if (subName && subName !== 'Student') return subName;
    if (id && KNOWN_STUDENT_NAMES[id]) return KNOWN_STUDENT_NAMES[id];
    return id ? `Student (${id.substring(0, 8)})` : 'Student';
}

function getMasteryStatus(masteryPct, totalActivity) {
    if (totalActivity === 0 || masteryPct === null || masteryPct === undefined) return 'no_data';
    if (masteryPct >= MASTERY_THRESHOLDS.STRONG) return 'strong';
    if (masteryPct >= MASTERY_THRESHOLDS.DEVELOPING) return 'developing';
    return 'needs_attention';
}

function readLocalGradingStore() {
    try {
        const storePath = path.join(__dirname, '../data/grading_store.json');
        if (fs.existsSync(storePath)) {
            return JSON.parse(fs.readFileSync(storePath, 'utf8'));
        }
    } catch (e) {
        console.warn('[analytics] Local grading store read error:', e.message);
    }
    return { assignments: [], submissions: [] };
}

function loadPrerequisites(subject) {
    try {
        const prereqPath = path.join(__dirname, '../data', `${subject}_prerequisites.json`);
        if (!fs.existsSync(prereqPath)) return [];
        const data = JSON.parse(fs.readFileSync(prereqPath, 'utf8'));
        return Array.isArray(data.relationships) ? data.relationships : [];
    } catch (err) {
        return [];
    }
}

/**
 * GET /api/analytics/class?subject=CourseName
 *
 * Synthesizes Coursework Submissions, Teacher Evaluations, and Practice Attempts
 * into real-time Class Analytics.
 */
async function getClassAnalytics(req, res) {
    const { subject } = req.query;

    try {
        // ── 1. Fetch Submissions & Coursework Evaluations ──────────────
        let submissionsList = [];
        try {
            let subQuery = supabaseAdmin
                .from('submissions')
                .select(`
                    *,
                    assignments!inner(id, title, course_name, max_score, rubric, description),
                    profiles:student_id(id, display_name, full_name, email)
                `);

            if (subject) {
                subQuery = subQuery.ilike('assignments.course_name', `%${subject}%`);
            }

            const { data: dbSubs, error: subError } = await subQuery;
            if (!subError && dbSubs && dbSubs.length > 0) {
                submissionsList = dbSubs.map(s => ({
                    id: s.id,
                    assignment_id: s.assignment_id,
                    concept: s.assignments?.title || 'Assignment Concept',
                    course_name: s.assignments?.course_name || '',
                    max_score: s.assignments?.max_score || 100,
                    grade: s.grade,
                    student_id: s.student_id,
                    student_name: resolveStudentName(s.student_id, s.profiles?.display_name || s.profiles?.full_name, s.student_name),
                    status: s.status || (s.grade !== null ? 'graded' : 'ungraded'),
                    submitted_at: s.submitted_at
                }));
            }
        } catch (e) {
            // fallback to store
        }

        // Merge local store submissions if Supabase has zero or for local mode
        const localStore = readLocalGradingStore();
        const localAssignmentsMap = (localStore.assignments || []).reduce((acc, a) => {
            acc[a.id] = a;
            return acc;
        }, {});

        const localSubs = (localStore.submissions || [])
            .map(s => {
                const asg = localAssignmentsMap[s.assignment_id] || {};
                return {
                    id: s.id,
                    assignment_id: s.assignment_id,
                    concept: asg.title || 'Assignment Concept',
                    course_name: asg.course_name || '',
                    max_score: asg.max_score || 100,
                    grade: s.grade,
                    student_id: s.student_id,
                    student_name: resolveStudentName(s.student_id, null, s.student_name),
                    status: s.status || (s.grade !== null ? 'graded' : 'ungraded'),
                    submitted_at: s.submitted_at
                };
            })
            .filter(s => !subject || s.course_name.toLowerCase() === subject.toLowerCase());

        // Merge submissions avoiding duplicates by id
        const existingIds = new Set(submissionsList.map(s => s.id));
        localSubs.forEach(s => {
            if (!existingIds.has(s.id)) {
                submissionsList.push(s);
            }
        });

        // ── 2. Fetch Practice Question Attempts ─────────────────────────
        let practiceAttempts = [];
        try {
            let attemptsQuery = supabaseAdmin
                .from('practice_attempts')
                .select(`
                    id,
                    student_id,
                    evaluation,
                    attempt_number,
                    practice_question_id,
                    practice_questions!inner(id, concept, subject)
                `);

            if (subject) {
                attemptsQuery = attemptsQuery.ilike('practice_questions.subject', `%${subject}%`);
            }

            const { data: dbAttempts, error: attemptsError } = await attemptsQuery;
            if (!attemptsError && dbAttempts) {
                practiceAttempts = dbAttempts;
            }
        } catch (e) {
            // Ignore DB error for practice attempts
        }

        // ── 3. Concept Extraction & Course Syllabus Mapping ───────────
        // Collect all distinct concepts for this subject
        const conceptsMap = {}; // conceptName -> { submissions: [], practice: [], students: Set }

        // Seed concepts from assignments
        (localStore.assignments || [])
            .filter(a => !subject || a.course_name.toLowerCase() === subject.toLowerCase())
            .forEach(a => {
                if (a.title && !conceptsMap[a.title]) {
                    conceptsMap[a.title] = {
                        concept: a.title,
                        submissions: [],
                        practice: [],
                        students: new Set()
                    };
                }
            });

        // Add submissions into conceptsMap
        submissionsList.forEach(sub => {
            const conceptName = sub.concept;
            if (!conceptsMap[conceptName]) {
                conceptsMap[conceptName] = {
                    concept: conceptName,
                    submissions: [],
                    practice: [],
                    students: new Set()
                };
            }
            conceptsMap[conceptName].submissions.push(sub);
            conceptsMap[conceptName].students.add(sub.student_id);
        });

        // Add practice attempts into conceptsMap
        practiceAttempts.forEach(pa => {
            const conceptName = pa.practice_questions?.concept || 'Practice Concept';
            if (!conceptsMap[conceptName]) {
                conceptsMap[conceptName] = {
                    concept: conceptName,
                    submissions: [],
                    practice: [],
                    students: new Set()
                };
            }
            conceptsMap[conceptName].practice.push(pa);
            conceptsMap[conceptName].students.add(pa.student_id);
        });

        // Collect all unique active students
        const allActiveStudentIds = new Set();
        submissionsList.forEach(s => allActiveStudentIds.add(s.student_id));
        practiceAttempts.forEach(pa => allActiveStudentIds.add(pa.student_id));

        // ── 4. Compute Concept-by-Concept Mastery & Metrics ─────────────
        const concepts = Object.values(conceptsMap).map(cItem => {
            const subCount = cItem.submissions.length;
            const practiceCount = cItem.practice.length;
            const totalActivity = subCount + practiceCount;

            // Compute submission score average
            let subScoreSum = 0;
            let subScoreCount = 0;
            cItem.submissions.forEach(s => {
                if (s.grade !== null && s.grade !== undefined) {
                    const pct = Math.min(100, Math.max(0, (s.grade / (s.max_score || 100)) * 100));
                    subScoreSum += pct;
                    subScoreCount += 1;
                }
            });
            const subAvg = subScoreCount > 0 ? subScoreSum / subScoreCount : null;

            // Compute practice accuracy (correct = 100%, partial = 50%, incorrect = 0%)
            let practiceWeightedScore = 0;
            cItem.practice.forEach(pa => {
                if (pa.evaluation === 'correct') practiceWeightedScore += 1;
                else if (pa.evaluation === 'partial') practiceWeightedScore += 0.5;
            });
            const practiceAvg = practiceCount > 0 ? (practiceWeightedScore / practiceCount) * 100 : null;

            // Exact Mastery Formula:
            // If both submissions & practice exist: 70% Submissions + 30% Practice
            // Else: 100% of whichever activity exists
            let masteryPct = null;
            if (subAvg !== null && practiceAvg !== null) {
                masteryPct = Math.round(0.7 * subAvg + 0.3 * practiceAvg);
            } else if (subAvg !== null) {
                masteryPct = Math.round(subAvg);
            } else if (practiceAvg !== null) {
                masteryPct = Math.round(practiceAvg);
            }

            const status = getMasteryStatus(masteryPct, totalActivity);

            return {
                concept: cItem.concept,
                mastery: masteryPct !== null ? masteryPct / 100 : null,
                mastery_pct: masteryPct,
                status,
                total_attempts: totalActivity,
                correct: Math.round(((masteryPct ?? 0) / 100) * totalActivity),
                incorrect: totalActivity - Math.round(((masteryPct ?? 0) / 100) * totalActivity),
                students_active: cItem.students.size
            };
        }).sort((a, b) => {
            // Sort: items with activity first, struggling concepts at the top
            if (a.status === 'no_data' && b.status !== 'no_data') return 1;
            if (b.status === 'no_data' && a.status !== 'no_data') return -1;
            return (a.mastery_pct ?? 100) - (b.mastery_pct ?? 100);
        });

        // ── 5. Per-Student Mastery & Support Detection ───────────────────
        // studentId -> { name, scores: [], concepts: { concept: score } }
        const studentPerformanceMap = {};

        allActiveStudentIds.forEach(stId => {
            studentPerformanceMap[stId] = {
                student_id: stId,
                name: resolveStudentName(stId),
                scores: [],
                conceptScores: {}
            };
        });

        // Populate student submission scores
        submissionsList.forEach(s => {
            const stObj = studentPerformanceMap[s.student_id];
            if (stObj) {
                stObj.name = s.student_name || stObj.name;
                if (s.grade !== null && s.grade !== undefined) {
                    const pct = Math.min(100, Math.max(0, (s.grade / (s.max_score || 100)) * 100));
                    stObj.scores.push(pct);
                    stObj.conceptScores[s.concept] = pct;
                }
            }
        });

        // Populate student practice scores
        practiceAttempts.forEach(pa => {
            const stObj = studentPerformanceMap[pa.student_id];
            if (stObj) {
                const isCorrect = pa.evaluation === 'correct';
                const concept = pa.practice_questions?.concept || 'Practice';
                stObj.scores.push(isCorrect ? 100 : 0);
                stObj.conceptScores[concept] = isCorrect ? 100 : 0;
            }
        });

        // Prerequisites lookup for context
        const prerequisites = subject ? loadPrerequisites(subject) : [];
        const conceptPrereqMap = {};
        prerequisites.forEach(rel => {
            if (!conceptPrereqMap[rel.concept_id]) conceptPrereqMap[rel.concept_id] = [];
            conceptPrereqMap[rel.concept_id].push(rel.prerequisite_id);
        });

        // Single Support Cutoff: overall average < 60% OR any individual concept score < 60%
        const studentsNeedingAttention = [];

        Object.values(studentPerformanceMap).forEach(st => {
            const totalScores = st.scores;
            const avgScore = totalScores.length > 0
                ? Math.round(totalScores.reduce((a, b) => a + b, 0) / totalScores.length)
                : null;

            const flaggedSignals = [];

            Object.entries(st.conceptScores).forEach(([conceptName, cScore]) => {
                if (cScore < MASTERY_THRESHOLDS.SUPPORT_CUTOFF) {
                    const prereqs = conceptPrereqMap[conceptName] || [];
                    flaggedSignals.push({
                        concept: conceptName,
                        accuracy: Math.round(cScore),
                        total_attempts: 1,
                        repeated_mistakes: cScore < 50 ? 1 : 0,
                        prereq_weakness: prereqs.map(p => ({
                            concept: p,
                            mastery_pct: Math.round(cScore)
                        }))
                    });
                }
            });

            const needsSupport = (avgScore !== null && avgScore < MASTERY_THRESHOLDS.SUPPORT_CUTOFF) || flaggedSignals.length > 0;

            if (needsSupport) {
                studentsNeedingAttention.push({
                    student_id: st.student_id,
                    name: st.name,
                    average_score_pct: avgScore,
                    attention_level: (avgScore !== null && avgScore < 50) ? 'high' : 'medium',
                    attention_score: (avgScore !== null && avgScore < 50) ? 3 : 1,
                    signals: flaggedSignals.length > 0 ? flaggedSignals : [{
                        concept: subject ? subject.replace(/_/g, ' ') : 'Coursework',
                        accuracy: avgScore,
                        total_attempts: totalScores.length,
                        repeated_mistakes: 0,
                        prereq_weakness: []
                    }]
                });
            }
        });

        // Sort students needing support by lowest average score first
        studentsNeedingAttention.sort((a, b) => (a.average_score_pct ?? 100) - (b.average_score_pct ?? 100));

        // ── 6. Class-Level Concerns ─────────────────────────────────────
        const classAttentionConcepts = concepts
            .filter(c => c.status === 'needs_attention')
            .map(c => ({
                concept: c.concept,
                class_mastery: c.mastery,
                class_mastery_pct: c.mastery_pct,
                students_struggling: studentsNeedingAttention.filter(st =>
                    st.signals.some(sig => sig.concept === c.concept)
                ).length || 1,
                total_students_active: c.students_active || allActiveStudentIds.size || 1,
                common_prereq_weakness: null
            }));

        // ── 7. KPI Summary Stats ─────────────────────────────────────────
        const conceptsWithData = concepts.filter(c => c.status !== 'no_data');
        const avgClassMasteryPct = conceptsWithData.length > 0
            ? Math.round(conceptsWithData.reduce((sum, c) => sum + (c.mastery_pct || 0), 0) / conceptsWithData.length)
            : null;

        return res.json({
            subject: subject || 'all',
            total_students_active: allActiveStudentIds.size,
            average_class_mastery: avgClassMasteryPct !== null ? avgClassMasteryPct / 100 : null,
            average_class_mastery_pct: avgClassMasteryPct,
            concepts_covered: conceptsWithData.length,
            concepts,
            students_needing_attention: studentsNeedingAttention,
            class_attention_concepts: classAttentionConcepts
        });

    } catch (err) {
        console.error('[analytics] Unexpected error computing class analytics:', err);
        return res.status(500).json({ error: 'Internal server error computing analytics' });
    }
}

module.exports = { getClassAnalytics };
