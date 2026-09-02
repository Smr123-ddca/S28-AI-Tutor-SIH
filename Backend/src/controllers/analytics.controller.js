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
        let attemptsQuery = supabaseAdmin
            .from('practice_attempts')
            .select(`
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

        if (subject) {
            // Filter by subject via the joined practice_questions table
            attemptsQuery = attemptsQuery.eq('practice_questions.subject', subject);
        }

        const { data: attempts, error: attemptsError } = await attemptsQuery;

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
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, email')
                .in('id', uniqueStudentIds);

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

module.exports = { getClassAnalytics };
