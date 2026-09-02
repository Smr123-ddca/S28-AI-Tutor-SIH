const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

// ======================================================================
// MASTERY THRESHOLDS (configurable)
// ======================================================================
const MASTERY_THRESHOLDS = {
    STRONG: 0.75,     // >= 75% → 🟢 Strong
    DEVELOPING: 0.50  // >= 50% → 🟡 Developing, < 50% → 🔴 Needs Attention
};

// ATTENTION SIGNALS / WEIGHTS
const ATTENTION_WEIGHTS = {
    REPEATED_MISTAKES: 2,  // >= 3 incorrect attempts on the same concept
    LOW_MASTERY: 1         // mastery < 0.50 with >= 3 total attempts
};

const REPEATED_MISTAKE_THRESHOLD = 3;
const MIN_ATTEMPTS_FOR_LOW_MASTERY = 3;

/**
 * Determine concept mastery status label.
 * Distinct from "0%": if no attempts → 'no_data', not 'needs_attention'
 */
function getMasteryStatus(mastery, totalAttempts) {
    if (totalAttempts === 0) return 'no_data';
    if (mastery >= MASTERY_THRESHOLDS.STRONG) return 'strong';
    if (mastery >= MASTERY_THRESHOLDS.DEVELOPING) return 'developing';
    return 'needs_attention';
}

/**
 * Load prerequisite relationships for a given subject from the JSON artifact.
 * Returns an array of { concept_id, prerequisite_id, reason, confidence }
 */
function loadPrerequisites(subject) {
    try {
        const prereqPath = path.join(__dirname, '../data', `${subject}_prerequisites.json`);
        if (!fs.existsSync(prereqPath)) return [];
        const data = JSON.parse(fs.readFileSync(prereqPath, 'utf8'));
        return Array.isArray(data.relationships) ? data.relationships : [];
    } catch (err) {
        console.warn(`[analytics] Could not load prerequisites for ${subject}:`, err.message);
        return [];
    }
}

/**
 * GET /api/analytics/class?subject=CourseName
 *
 * Returns class-level analytics for a subject.
 * - concept mastery heatmap
 * - students needing attention (deterministic signals)
 * - class-level attention summary
 *
 * Authorization: teacher role required (enforced by requireRole middleware).
 */
async function getClassAnalytics(req, res) {
    const { subject } = req.query;

    try {
        // ——————————————————————————————————————————————
        // STEP 1: Single efficient query — fetch all practice attempts
        // joined with their parent practice_questions for concept + subject info.
        // We use Supabase's select with embedded resource to avoid N+1.
        // ——————————————————————————————————————————————
        let attemptsQuery = supabaseAdmin.from('practice_attempts');
        let attemptsSelection = attemptsQuery.select(`
            id,
            student_id,
            evaluation,
            attempt_number,
            practice_question_id,
            practice_questions!inner(
                id,
                concept,
                subject
            )
        `);

        if (subject && attemptsSelection && typeof attemptsSelection.eq === 'function') {
            // Filter by subject via the joined practice_questions table.
            attemptsSelection = attemptsSelection.eq('practice_questions.subject', subject);
        }

        const attemptsResponse = attemptsSelection && typeof attemptsSelection.then === 'function'
            ? await attemptsSelection
            : attemptsSelection;
        const { data: attempts, error: attemptsError } = attemptsResponse || {};

        if (attemptsError) {
            console.error('[analytics] Failed to fetch attempts:', attemptsError);
            return res.status(500).json({ error: 'Failed to fetch practice data', details: attemptsError.message });
        }

        const allAttempts = attempts || [];

        // ——————————————————————————————————————————————
        // STEP 2: Collect all unique student IDs to fetch profile names
        // ——————————————————————————————————————————————
        const uniqueStudentIds = [...new Set(allAttempts.map(a => a.student_id))];

        let profilesMap = {};
        if (uniqueStudentIds.length > 0) {
            let profilesQuery = supabaseAdmin.from('profiles');
            let profilesSelection = profilesQuery.select('id, full_name, email');

            if (profilesSelection && typeof profilesSelection.in === 'function') {
                profilesSelection = profilesSelection.in('id', uniqueStudentIds);
            }

            const profilesResponse = profilesSelection && typeof profilesSelection.then === 'function'
                ? await profilesSelection
                : profilesSelection;
            const { data: profiles } = profilesResponse || {};

            (profiles || []).forEach(p => {
                profilesMap[p.id] = p.full_name || p.email || `Student (${p.id.slice(0, 8)})`;
            });
        }

        // ——————————————————————————————————————————————
        // STEP 3: Load prerequisite relationships for context
        // ——————————————————————————————————————————————
        const prerequisites = subject ? loadPrerequisites(subject) : [];

        // Build a lookup: concept_id → [prerequisite_concept_ids]
        const conceptPrereqMap = {};
        prerequisites.forEach(rel => {
            if (!conceptPrereqMap[rel.concept_id]) conceptPrereqMap[rel.concept_id] = [];
            conceptPrereqMap[rel.concept_id].push(rel.prerequisite_id);
        });

        // ——————————————————————————————————————————————
        // STEP 4: Aggregate by CONCEPT (class-level)
        // ——————————————————————————————————————————————
        const conceptStats = {}; // concept → { total, correct, incorrect, students: Set }

        allAttempts.forEach(attempt => {
            const concept = attempt.practice_questions?.concept;
            if (!concept) return;

            if (!conceptStats[concept]) {
                conceptStats[concept] = {
                    concept,
                    total_attempts: 0,
                    correct_count: 0,
                    incorrect_count: 0,
                    students_active: new Set()
                };
            }

            const stat = conceptStats[concept];
            stat.total_attempts += 1;
            stat.students_active.add(attempt.student_id);

            if (attempt.evaluation === 'correct') stat.correct_count += 1;
            else if (attempt.evaluation === 'incorrect') stat.incorrect_count += 1;
            // 'partial' counts as neither correct nor incorrect for mastery (neutral)
        });

        // Build concepts array with mastery computed
        const concepts = Object.values(conceptStats).map(stat => {
            const mastery = stat.total_attempts > 0
                ? stat.correct_count / stat.total_attempts
                : null;

            return {
                concept: stat.concept,
                mastery: mastery !== null ? Math.round(mastery * 100) / 100 : null,
                mastery_pct: mastery !== null ? Math.round(mastery * 100) : null,
                status: getMasteryStatus(mastery ?? 0, stat.total_attempts),
                total_attempts: stat.total_attempts,
                correct: stat.correct_count,
                incorrect: stat.incorrect_count,
                students_active: stat.students_active.size
            };
        }).sort((a, b) => {
            // Sort: no_data last, then by mastery ascending (worst first)
            if (a.status === 'no_data' && b.status !== 'no_data') return 1;
            if (b.status === 'no_data' && a.status !== 'no_data') return -1;
            return (a.mastery ?? 1) - (b.mastery ?? 1);
        });

        // ——————————————————————————————————————————————
        // STEP 5: Aggregate by STUDENT
        // ——————————————————————————————————————————————
        const studentConceptMap = {}; // student_id → { concept → { total, correct, incorrect } }

        allAttempts.forEach(attempt => {
            const concept = attempt.practice_questions?.concept;
            if (!concept) return;

            if (!studentConceptMap[attempt.student_id]) {
                studentConceptMap[attempt.student_id] = {};
            }

            const sc = studentConceptMap[attempt.student_id];
            if (!sc[concept]) {
                sc[concept] = { total: 0, correct: 0, incorrect: 0 };
            }

            sc[concept].total += 1;
            if (attempt.evaluation === 'correct') sc[concept].correct += 1;
            else if (attempt.evaluation === 'incorrect') sc[concept].incorrect += 1;
        });

        // ——————————————————————————————————————————————
        // STEP 6: Compute student mastery map (for prereq weakness lookup)
        // ——————————————————————————————————————————————
        // studentMasteryMap: student_id → { concept → mastery (0-1 or null) }
        const studentMasteryMap = {};
        Object.entries(studentConceptMap).forEach(([studentId, concepts]) => {
            studentMasteryMap[studentId] = {};
            Object.entries(concepts).forEach(([concept, stats]) => {
                studentMasteryMap[studentId][concept] = stats.total > 0
                    ? stats.correct / stats.total
                    : null;
            });
        });

        // ——————————————————————————————————————————————
        // STEP 7: Compute attention score per student
        // ——————————————————————————————————————————————
        const studentsNeedingAttention = [];

        Object.entries(studentConceptMap).forEach(([studentId, conceptData]) => {
            const signals = [];
            let totalScore = 0;

            Object.entries(conceptData).forEach(([concept, stats]) => {
                const mastery = stats.total > 0 ? stats.correct / stats.total : null;
                const conceptSignal = {
                    concept,
                    accuracy: mastery !== null ? Math.round(mastery * 100) : null,
                    total_attempts: stats.total,
                    repeated_mistakes: stats.incorrect,
                    prereq_weakness: []
                };

                let signalScore = 0;

                // Signal 1: Repeated mistakes on the same concept
                if (stats.incorrect >= REPEATED_MISTAKE_THRESHOLD) {
                    signalScore += ATTENTION_WEIGHTS.REPEATED_MISTAKES;
                }

                // Signal 2: Low mastery with enough attempts to be meaningful
                if (mastery !== null && mastery < MASTERY_THRESHOLDS.DEVELOPING && stats.total >= MIN_ATTEMPTS_FOR_LOW_MASTERY) {
                    signalScore += ATTENTION_WEIGHTS.LOW_MASTERY;
                }

                // Signal 3: Prerequisite weakness (check if any prereqs have low mastery too)
                const prereqIds = conceptPrereqMap[concept] || [];
                prereqIds.forEach(prereqId => {
                    const prereqMastery = studentMasteryMap[studentId]?.[prereqId];
                    // Only flag if we have data AND it's below developing threshold
                    if (prereqMastery !== undefined && prereqMastery !== null && prereqMastery < MASTERY_THRESHOLDS.DEVELOPING) {
                        conceptSignal.prereq_weakness.push({
                            concept: prereqId,
                            mastery_pct: Math.round(prereqMastery * 100)
                        });
                    }
                });

                totalScore += signalScore;

                // Only include concepts with at least one signal or a meaningful attempt count
                if (signalScore > 0) {
                    signals.push(conceptSignal);
                }
            });

            // Classify attention level
            let attentionLevel = 'normal';
            if (totalScore >= 3) attentionLevel = 'high';
            else if (totalScore >= 1) attentionLevel = 'medium';

            if (attentionLevel !== 'normal') {
                // Sort signals by most repeated mistakes first
                signals.sort((a, b) => b.repeated_mistakes - a.repeated_mistakes);

                studentsNeedingAttention.push({
                    student_id: studentId,
                    name: profilesMap[studentId] || `Student (${studentId.slice(0, 8)})`,
                    attention_level: attentionLevel,
                    attention_score: totalScore,
                    signals
                });
            }
        });

        // Sort by attention score descending (highest need first)
        studentsNeedingAttention.sort((a, b) => b.attention_score - a.attention_score);

        // ——————————————————————————————————————————————
        // STEP 8: Class-level attention concepts
        // (concepts where the most students are struggling)
        // ——————————————————————————————————————————————
        const classAttentionConcepts = concepts
            .filter(c => c.status === 'needs_attention')
            .map(c => {
                // Count students struggling (mastery < developing threshold)
                let studentStruggling = 0;
                Object.values(studentConceptMap).forEach(studentConcepts => {
                    const sc = studentConcepts[c.concept];
                    if (sc && sc.total >= 1) {
                        const m = sc.correct / sc.total;
                        if (m < MASTERY_THRESHOLDS.DEVELOPING) studentStruggling += 1;
                    }
                });

                // Find the most common prerequisite weakness for this concept
                const prereqIds = conceptPrereqMap[c.concept] || [];
                let commonPrereqWeakness = null;
                if (prereqIds.length > 0) {
                    // Count how many students have weakness for each prereq
                    const prereqWeakCounts = {};
                    prereqIds.forEach(pid => { prereqWeakCounts[pid] = 0; });

                    Object.entries(studentMasteryMap).forEach(([, conceptMasteries]) => {
                        prereqIds.forEach(pid => {
                            const m = conceptMasteries[pid];
                            if (m !== undefined && m !== null && m < MASTERY_THRESHOLDS.DEVELOPING) {
                                prereqWeakCounts[pid] += 1;
                            }
                        });
                    });

                    const topPrereq = Object.entries(prereqWeakCounts)
                        .filter(([, count]) => count > 0)
                        .sort((a, b) => b[1] - a[1])[0];

                    if (topPrereq) {
                        commonPrereqWeakness = {
                            concept: topPrereq[0],
                            students_weak: topPrereq[1]
                        };
                    }
                }

                return {
                    concept: c.concept,
                    class_mastery: c.mastery,
                    class_mastery_pct: c.mastery_pct,
                    students_struggling: studentStruggling,
                    total_students_active: c.students_active,
                    common_prereq_weakness: commonPrereqWeakness
                };
            })
            .sort((a, b) => b.students_struggling - a.students_struggling);

        // ——————————————————————————————————————————————
        // STEP 9: Summary stats
        // ——————————————————————————————————————————————
        const totalStudentsActive = uniqueStudentIds.length;
        const conceptsWithData = concepts.filter(c => c.status !== 'no_data');
        const avgClassMastery = conceptsWithData.length > 0
            ? conceptsWithData.reduce((sum, c) => sum + (c.mastery ?? 0), 0) / conceptsWithData.length
            : null;

        return res.json({
            subject: subject || 'all',
            total_students_active: totalStudentsActive,
            average_class_mastery: avgClassMastery !== null ? Math.round(avgClassMastery * 100) / 100 : null,
            average_class_mastery_pct: avgClassMastery !== null ? Math.round(avgClassMastery * 100) : null,
            concepts_covered: conceptsWithData.length,
            concepts,
            students_needing_attention: studentsNeedingAttention,
            class_attention_concepts: classAttentionConcepts
        });

    } catch (err) {
        console.error('[analytics] Unexpected error:', err);
        return res.status(500).json({ error: 'Internal server error computing analytics' });
    }
}

function getGradingStatus(score) {
    if (score >= 75) return 'strong';
    if (score >= 50) return 'developing';
    return 'needs_review';
}

function getDistributionBucket(score) {
    if (score >= 90) return '90-100%';
    if (score >= 75) return '75-89%';
    if (score >= 50) return '50-74%';
    return 'Below 50%';
}

async function getClassGrading(req, res) {
    const { subject } = req.query;

    try {
        let attemptsQuery = supabaseAdmin.from('practice_attempts');
        let attemptsSelection = attemptsQuery.select(`
            id,
            student_id,
            evaluation,
            attempt_number,
            practice_question_id,
            practice_questions!inner(
                id,
                question,
                concept,
                subject
            )
        `);

        if (subject && typeof attemptsSelection.eq === 'function') {
            attemptsSelection = attemptsSelection.eq('practice_questions.subject', subject);
        }

        const attemptsResponse = attemptsSelection && typeof attemptsSelection.then === 'function'
            ? await attemptsSelection
            : attemptsSelection;
        const { data: attempts, error: attemptsError } = attemptsResponse || {};

        if (attemptsError) {
            console.error('[analytics] Failed to fetch grading attempts:', attemptsError);
            return res.status(500).json({ error: 'Failed to fetch practice data', details: attemptsError.message });
        }

        const allAttempts = attempts || [];
        if (allAttempts.length === 0) {
            return res.json({
                subject: subject || 'all',
                empty: true,
                message: 'No graded activity yet.',
                details: 'Students need to complete practice activity before class grading insights appear.',
                summary: {
                    students: 0,
                    attempts: 0,
                    average_score: 0,
                    students_needing_review: 0,
                    questions_evaluated: 0
                },
                distribution: {
                    '90-100%': 0,
                    '75-89%': 0,
                    '50-74%': 0,
                    'Below 50%': 0
                },
                students: [],
                common_difficulties: []
            });
        }

        const uniqueStudentIds = [...new Set(allAttempts.map(a => a.student_id))];

        let profilesMap = {};
        if (uniqueStudentIds.length > 0) {
            let profilesQuery = supabaseAdmin.from('profiles');
            let profilesSelection = profilesQuery.select('id, full_name, email');
            if (profilesSelection && typeof profilesSelection.in === 'function') {
                profilesSelection = profilesSelection.in('id', uniqueStudentIds);
            }

            const profilesResponse = profilesSelection && typeof profilesSelection.then === 'function'
                ? await profilesSelection
                : profilesSelection;
            const { data: profiles } = profilesResponse || {};

            (profiles || []).forEach(profile => {
                profilesMap[profile.id] = profile.full_name || profile.email || `Student (${profile.id.slice(0, 8)})`;
            });
        }

        const studentMap = {};
        const issueCounts = {};
        const questionsSeen = new Set();

        allAttempts.forEach((attempt) => {
            const studentId = attempt.student_id;
            const question = attempt.practice_questions;
            const concept = question?.concept || 'Uncategorized';
            const questionId = attempt.practice_question_id;

            if (questionId) questionsSeen.add(questionId);

            if (!studentMap[studentId]) {
                studentMap[studentId] = {
                    student_id: studentId,
                    name: profilesMap[studentId] || `Student (${studentId.slice(0, 8)})`,
                    total_attempts: 0,
                    correct: 0,
                    incorrect: 0,
                    questions: {}
                };
            }

            const student = studentMap[studentId];
            student.total_attempts += 1;

            if (attempt.evaluation === 'correct') student.correct += 1;
            if (attempt.evaluation === 'incorrect') student.incorrect += 1;

            const qKey = questionId || `${concept}-${student.total_attempts}`;
            if (!student.questions[qKey]) {
                student.questions[qKey] = {
                    question_id: questionId,
                    question: question?.question || 'Practice question',
                    concept,
                    attempts: 0,
                    correct: 0,
                    incorrect: 0,
                    latest_result: 'incorrect',
                    latest_score: 0,
                    latest_attempt_number: 0
                };
            }

            const questionSummary = student.questions[qKey];
            questionSummary.attempts += 1;

            if (attempt.evaluation === 'correct') {
                questionSummary.correct += 1;
            } else if (attempt.evaluation === 'incorrect') {
                questionSummary.incorrect += 1;
            }

            if ((attempt.attempt_number || 0) >= (questionSummary.latest_attempt_number || 0)) {
                questionSummary.latest_result = attempt.evaluation || 'incorrect';
                questionSummary.latest_score = attempt.evaluation === 'correct' ? 100 : attempt.evaluation === 'partial' ? 50 : 0;
                questionSummary.latest_attempt_number = attempt.attempt_number || 0;
            }

            if (!issueCounts[concept]) {
                issueCounts[concept] = {
                    concept,
                    incorrect_attempts: 0,
                    students_affected: new Set()
                };
            }

            if (attempt.evaluation === 'incorrect') {
                issueCounts[concept].incorrect_attempts += 1;
                issueCounts[concept].students_affected.add(studentId);
            }
        });

        const prereqRelationships = subject ? loadPrerequisites(subject) : [];
        const conceptPrereqMap = {};
        prereqRelationships.forEach((relationship) => {
            if (!relationship.concept_id) return;
            if (!conceptPrereqMap[relationship.concept_id]) {
                conceptPrereqMap[relationship.concept_id] = [];
            }
            conceptPrereqMap[relationship.concept_id].push(relationship.prerequisite_id);
        });

        const students = Object.values(studentMap).map((student) => {
            const questionList = Object.values(student.questions)
                .map((item) => ({
                    question_id: item.question_id,
                    question: item.question,
                    concept: item.concept,
                    result: item.latest_result,
                    score: item.latest_score
                }))
                .sort((a, b) => {
                    const order = { incorrect: 0, partial: 1, correct: 2 };
                    return (order[a.result] ?? 99) - (order[b.result] ?? 99);
                });

            const score = student.total_attempts > 0 ? (student.correct / student.total_attempts) * 100 : 0;
            const status = getGradingStatus(score);
            const conceptCounts = {};
            questionList.forEach((item) => {
                if (!item.concept) return;
                conceptCounts[item.concept] = (conceptCounts[item.concept] || 0) + (item.result === 'incorrect' ? 1 : 0);
            });

            const weakConcepts = Object.entries(conceptCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([concept]) => concept);

            const learningGap = weakConcepts
                .map((concept) => {
                    const prereqs = conceptPrereqMap[concept] || [];
                    if (!prereqs.length) return null;
                    return {
                        weak_concept: concept,
                        prerequisite_concept: prereqs[0]
                    };
                })
                .filter(Boolean)[0] || null;

            return {
                student_id: student.student_id,
                name: student.name,
                score: Math.round(score),
                status,
                correct: student.correct,
                incorrect: student.incorrect,
                questions_attempted: questionList.length,
                questions: questionList,
                learning_gap: learningGap
            };
        }).sort((a, b) => b.score - a.score);

        const summary = {
            students: students.length,
            attempts: allAttempts.length,
            average_score: students.length > 0
                ? Math.round((students.reduce((sum, student) => sum + student.score, 0) / students.length))
                : 0,
            students_needing_review: students.filter((student) => student.status === 'needs_review').length,
            questions_evaluated: questionsSeen.size
        };

        const distribution = {
            '90-100%': 0,
            '75-89%': 0,
            '50-74%': 0,
            'Below 50%': 0
        };

        students.forEach((student) => {
            const bucket = getDistributionBucket(student.score);
            distribution[bucket] += 1;
        });

        const commonDifficulties = Object.values(issueCounts)
            .map((item) => ({
                concept: item.concept,
                incorrect_attempts: item.incorrect_attempts,
                students_affected: item.students_affected.size
            }))
            .sort((a, b) => b.incorrect_attempts - a.incorrect_attempts);

        return res.json({
            subject: subject || 'all',
            empty: false,
            summary,
            distribution,
            students,
            common_difficulties: commonDifficulties,
            students_needing_review: summary.students_needing_review
        });
    } catch (err) {
        console.error('[analytics] Unexpected error computing class grading:', err);
        return res.status(500).json({ error: 'Internal server error computing grading' });
    }
}

module.exports = { getClassAnalytics, getClassGrading };
