const { getDeterministicDemoName, DEMO_NAMES } = require('./demoIdentities');

const seedRandom = (seed) => {
    let m_w = seed;
    let m_z = 987654321;
    let mask = 0xffffffff;
    return () => {
        m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
        m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
        let result = ((m_z << 16) + m_w) & mask;
        result /= 4294967296;
        return result + 0.5;
    };
};

function getDeterministicDemoData(requestedSubject = 'All') {
    const random = seedRandom(12345);

    const subjects = {
        DSA: [
            { id: "concept_dsa_1", name: "Binary Search", misconception: "Students may be applying binary search without considering whether the search space is ordered.", prerequisite: "Sorting / ordered search space" },
            { id: "concept_dsa_2", name: "Time Complexity", misconception: "Assuming that nested loops always mean O(n^2) without checking the loop iterators.", prerequisite: "Basic Algebra" },
            { id: "concept_dsa_3", name: "Arrays", misconception: "Confusing 0-based indexing algorithms when dealing with length or capacity.", prerequisite: "Memory Allocation" }
        ],
        DBMS: [
            { id: "concept_dbms_1", name: "Joins", misconception: "Students may confuse INNER JOIN with LEFT JOIN when rows are missing from one relation.", prerequisite: "Relational matching" },
            { id: "concept_dbms_2", name: "Normalization", misconception: "Failing to identify transitive dependencies correctly for 3NF.", prerequisite: "Functional Dependencies" },
            { id: "concept_dbms_3", name: "Primary Keys", misconception: "Believing that primary keys can contain NULL values in standard SQL.", prerequisite: "Tables & Columns" }
        ],
        Economics: [
            { id: "concept_eco_1", name: "Opportunity Cost", misconception: "Students may confuse opportunity cost with the direct monetary price of an option.", prerequisite: "Scarcity" },
            { id: "concept_eco_2", name: "Scarcity", misconception: "Assuming scarcity only applies to physical goods and not time or attention.", prerequisite: "Basic Needs" },
            { id: "concept_eco_3", name: "Demand & Supply", misconception: "Confusing a shift in the demand curve with a movement along the curve.", prerequisite: "Price Mechanisms" }
        ],
        IES: [
            { id: "concept_ies_1", name: "Embedded Systems", misconception: "Students may treat any computer based device as an embedded system without considering constraints.", prerequisite: "Hardware-software integration" },
            { id: "concept_ies_2", name: "Hardware-Software Integration", misconception: "Forgetting to configure pin directions before attempting digital reads and writes.", prerequisite: "Digital Logic" },
            { id: "concept_ies_3", name: "Microcontrollers", misconception: "Confusing RAM capacity with ROM/Flash storage limits on small chips.", prerequisite: "Computer Architecture" }
        ]
    };

    const targetCounts = {
        "Binary Search": 18,
        "Time Complexity": 12,
        "Arrays": 9,
        "Joins": 16,
        "Normalization": 11,
        "Primary Keys": 7,
        "Opportunity Cost": 19,
        "Scarcity": 13,
        "Demand & Supply": 8,
        "Embedded Systems": 15,
        "Hardware-Software Integration": 11,
        "Microcontrollers": 7
    };

    const students = [];
    for (let i = 0; i < DEMO_NAMES.length; i++) {
        const studentId = `student_${(i + 1).toString().padStart(3, '0')}`;
        students.push({
            id: studentId,
            name: getDeterministicDemoName(studentId),
            signals: [],
            // for the heatmap
            heatmap: {}
        });
    }

    const currentCounts = {};
    for (const sub in subjects) {
        subjects[sub].forEach(c => currentCounts[c.name] = 0);
    }

    // Distribute attention targets FIRST
    for (const sub in subjects) {
        subjects[sub].forEach(concept => {
            const target = targetCounts[concept.name];
            const availableStudents = [...students];
            for (let k = 0; k < target; k++) {
                if (availableStudents.length === 0) break;
                const rIndex = Math.floor(random() * availableStudents.length);
                const st = availableStudents[rIndex];

                const incorrect = Math.floor(random() * 4) + 2;
                const correct = Math.floor(random() * 2);

                st.signals.push({
                    subject: sub,
                    concept_id: concept.id,
                    concept: concept.name,
                    incorrect_attempts: incorrect,
                    correct_attempts: correct,
                    repeated_mistakes: incorrect,
                    attention_signal: true,
                    possible_misconception: concept.misconception,
                    possible_prerequisite: concept.prerequisite,
                    accuracy: Math.round((correct / (correct + incorrect)) * 100)
                });

                st.heatmap[concept.id] = { status: 'needs_attention', attempts: correct + incorrect, correct, incorrect };
                currentCounts[concept.name]++;
                availableStudents.splice(rIndex, 1);
            }
        });
    }

    // Now backfill organic healthy data for the other cells to make the heatmap realistic
    students.forEach(st => {
        for (const sub in subjects) {
            subjects[sub].forEach(concept => {
                if (!st.heatmap[concept.id]) {
                    // Decide if they practiced it (80% chance)
                    if (random() > 0.2) {
                        const correct = Math.floor(random() * 5) + 3; // mostly successful
                        const incorrect = Math.floor(random() * 2); // 0 or 1 error

                        st.signals.push({
                            subject: sub,
                            concept_id: concept.id,
                            concept: concept.name,
                            incorrect_attempts: incorrect,
                            correct_attempts: correct,
                            repeated_mistakes: incorrect,
                            attention_signal: false,
                            accuracy: Math.round((correct / (correct + incorrect)) * 100)
                        });

                        const status = (correct / (correct + incorrect)) > 0.7 ? 'mastered' : 'practicing';
                        st.heatmap[concept.id] = { status, attempts: correct + incorrect, correct, incorrect };
                    } else {
                        st.heatmap[concept.id] = { status: 'no_data', attempts: 0, correct: 0, incorrect: 0 };
                    }
                }
            });
        }
    });

    // Filtering by Subject (as requested by TeacherAnalytics logic)
    const filteredSubjects = requestedSubject === 'All' ? subjects : { [requestedSubject]: subjects[requestedSubject] || [] };

    let totalAttemptsAll = 0;
    let totalCorrectAll = 0;
    let conceptsCovered = 0;
    const studentsWithActivity = new Set();
    const studentsNeedingAttention = new Set();

    const conceptsAggregated = [];
    const classAttentionConcepts = [];

    for (const sub in filteredSubjects) {
        filteredSubjects[sub].forEach(concept => {
            conceptsCovered++;
            let cTotal = 0;
            let cCorrect = 0;
            let cActive = 0;
            let cStruggling = 0;

            students.forEach(st => {
                const cell = st.heatmap[concept.id];
                if (cell && cell.status !== 'no_data') {
                    studentsWithActivity.add(st.id);
                    cTotal += cell.attempts;
                    cCorrect += cell.correct;
                    cActive++;
                    if (cell.status === 'needs_attention') {
                        cStruggling++;
                        studentsNeedingAttention.add(st);
                    }
                }
            });

            totalAttemptsAll += cTotal;
            totalCorrectAll += cCorrect;

            const mastery = cTotal > 0 ? Math.round((cCorrect / cTotal) * 100) : 0;
            const status = cActive === 0 ? 'no_data' : (cStruggling > cActive * 0.3 ? 'needs_attention' : (mastery > 75 ? 'mastered' : 'practicing'));

            conceptsAggregated.push({
                subject: sub,
                concept_id: concept.id,
                concept: concept.name,
                students_needing_attention: cStruggling, // specifically for the Misconception chart
                total_incorrect_attempts: cTotal - cCorrect,
                affected_students: students.filter(s => s.heatmap[concept.id]?.status === 'needs_attention').map(s => s.name),
                possible_misconception: concept.misconception,
                possible_prerequisite: concept.prerequisite,
                // KPI heatmap expectations
                mastery_pct: mastery,
                status: status,
                correct: cCorrect,
                total_attempts: cTotal,
                students_active: cActive
            });

            if (status === 'needs_attention') {
                classAttentionConcepts.push({
                    concept: concept.name,
                    class_mastery_pct: mastery,
                    students_struggling: cStruggling,
                    total_students_active: cActive,
                    common_prereq_weakness: {
                        concept: concept.prerequisite,
                        students_weak: cStruggling
                    }
                });
            }
        });
    }

    const avgMastery = totalAttemptsAll > 0 ? Math.round((totalCorrectAll / totalAttemptsAll) * 100) : 0;

    // Build the teacher support list strictly from the relevant subject filter
    const weakStudentsList = Array.from(studentsNeedingAttention).map(st => {
        const relevantSignals = st.signals.filter(sig => sig.attention_signal && (requestedSubject === 'All' || sig.subject === requestedSubject));
        if (relevantSignals.length === 0) return null;

        return {
            id: st.id,
            name: st.name,
            signals: relevantSignals,
            weakest_signal: relevantSignals.reduce((a, b) => a.accuracy < b.accuracy ? a : b)
        };
    }).filter(Boolean);

    return {
        is_demo: true,
        summary: {
            total_students: DEMO_NAMES.length,
            tracked_subjects: requestedSubject === 'All' ? 4 : 1,
            tracked_concepts: conceptsCovered,
            students_with_signals: studentsNeedingAttention.size
        },
        // Dashboard KPI bindings
        total_students_active: studentsWithActivity.size > 0 ? students.length : 0, // Fallback to 50
        average_class_mastery_pct: avgMastery,
        concepts_covered: conceptsCovered,

        concepts: conceptsAggregated,
        class_attention_concepts: classAttentionConcepts,
        students_needing_attention: weakStudentsList,
        students: students // useful if Teacher Analytics wants the raw rows for the horizontal heatmap
    };
}

module.exports = {
    getDeterministicDemoData
};
