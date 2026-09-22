require('dotenv').config({ path: '../.env' });
const { supabaseAdmin } = require('../src/lib/supabaseAdmin');

/**
 * Deterministic PRNG for idempotency
 */
function sfc32(a, b, c, d) {
    return function () {
        a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
        var t = (a + b) | 0;
        a = b ^ b >>> 9;
        b = c + (c << 3) | 0;
        c = (c << 21 | c >>> 11);
        d = d + 1 | 0;
        t = t + d | 0;
        c = c + t | 0;
        return (t >>> 0) / 4294967296;
    }
}

/**
 * Generate a seeded random generator keyed primarily by student_id to ensure idempotency runs
 */
function getSeededRandom(seedStr) {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
        seed = (seed << 5) - seed + seedStr.charCodeAt(i);
        seed |= 0;
    }
    return sfc32(0x9E3779B9, 0x243F6A88, 0xB7E15162, seed);
}

const PATTERNS = {
    STRONG: 'Strong student',
    BFS_WEAK: 'BFS weakness',
    HEAP_WEAK: 'Heap weakness',
    DP_WEAK: 'DP weakness',
    FOUNDATIONAL_WEAK: 'Prerequisite/foundational weakness',
    IMPROVING: 'Improving student',
    MIXED: 'Mixed performance',
    INCONSISTENT: 'Strong but inconsistent student'
};

async function seedHistory() {
    console.log('--- Starting Demo Learning History Seed ---');

    console.log('1. Locating suitable DSA course/class...');
    const { data: courses } = await supabaseAdmin.from('courses').select('id, name');
    const dsaCourse = courses.find(c => c.name && c.name.toLowerCase().includes('dsa')) || courses[0];

    if (!dsaCourse) {
        console.error('No courses found.');
        return;
    }
    console.log(`Targeting Course: ${dsaCourse.name} (${dsaCourse.id})`);

    const { data: classes } = await supabaseAdmin.from('classes').select('id, name').eq('course_id', dsaCourse.id);
    if (!classes || classes.length === 0) {
        console.error('No classes found for this course.');
        return;
    }
    let targetClass = null;
    let students = [];

    for (const cls of classes) {
        const { data: memberships } = await supabaseAdmin
            .from('class_members')
            .select('student_id, profiles(id, display_name)')
            .eq('class_id', cls.id);

        if (memberships && memberships.length > 3) {
            targetClass = cls;
            students = memberships.map(m => m.profiles).slice(0, 12);
            break;
        }
    }

    if (!targetClass || students.length === 0) {
        console.error('No heavily populated class found. Please run the classroom bootstrap first.');
        return;
    }

    console.log(`Targeting Class: ${targetClass.name} (${targetClass.id})`);
    console.log(`Found ${students.length} demo students.`);

    console.log('3. Fetching course concepts...');
    const { data: concepts } = await supabaseAdmin.from('concepts').select('id, name, description').eq('course_id', dsaCourse.id);

    if (!concepts || concepts.length < 5) {
        console.error('Not enough concepts in course to generate rich patterns. Need at least 5.');
        return;
    }

    // Categorize concepts logically to map to weaknesses
    const bfsConcepts = concepts.filter(c => c.name.toLowerCase().includes('bfs') || c.name.toLowerCase().includes('breadth'));
    const heapConcepts = concepts.filter(c => c.name.toLowerCase().includes('heap') || c.name.toLowerCase().includes('priority'));
    const dpConcepts = concepts.filter(c => c.name.toLowerCase().includes('dp') || c.name.toLowerCase().includes('dynamic'));
    const foundationalConcepts = concepts.filter(c => c.name.toLowerCase().includes('array') || c.name.toLowerCase().includes('string') || c.name.toLowerCase().includes('basic'));
    const generalConcepts = concepts.filter(c => !bfsConcepts.includes(c) && !heapConcepts.includes(c) && !dpConcepts.includes(c) && !foundationalConcepts.includes(c));

    // Fallbacks if specific subsets don't match
    const safeBfs = bfsConcepts.length > 0 ? bfsConcepts : concepts.slice(0, Math.min(2, concepts.length));
    const safeHeap = heapConcepts.length > 0 ? heapConcepts : concepts.slice(2, 4);
    const safeDp = dpConcepts.length > 0 ? dpConcepts : concepts.slice(4, 6);
    const safeFoundational = foundationalConcepts.length > 0 ? foundationalConcepts : concepts.slice(0, 2);

    // Assign patterns to students deterministically based on their ID
    const patternKeys = Object.values(PATTERNS);

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        if (!student) continue;

        const pattern = patternKeys[i % patternKeys.length];
        console.log(`\nProcessing Student ${i + 1}: ${student.display_name} -> Assigning pattern: [${pattern}]`);

        // Create deterministic seed for student
        const rand = getSeededRandom(student.id + '_demo_history_gen_1');

        // Define timeframe: 14 days ago up to today
        const now = new Date();
        const baseStart = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

        const attemptCount = 15 + Math.floor(rand() * 15); // 15 to 30 attempts per student

        for (let j = 0; j < attemptCount; j++) {
            // Distribute timestamps linearly over the 14 days with some jitter
            const progress = j / attemptCount;
            const timeOffset = (14 * 24 * 60 * 60 * 1000) * progress + (rand() * 12 * 60 * 60 * 1000); // progressive + jitter
            const attemptDate = new Date(baseStart.getTime() + timeOffset);

            // Pick concept based on pattern
            let conceptSet = concepts;
            let targetEvaluation = 'correct';

            const isEarly = progress < 0.4;
            const isLate = progress > 0.6;

            // Adjust probability based on pattern
            let correctProb = 0.75; // Baseline

            if (pattern === PATTERNS.STRONG) {
                correctProb = 0.90;
            } else if (pattern === PATTERNS.IMPROVING) {
                correctProb = isEarly ? 0.4 : (isLate ? 0.9 : 0.65);
            } else if (pattern === PATTERNS.INCONSISTENT) {
                correctProb = rand() > 0.5 ? 1.0 : 0.3; // Swingy
            } else if (pattern === PATTERNS.MIXED) {
                correctProb = 0.6;
            } else {
                // Weakness specific Patterns
                const targetingWeakness = (rand() < 0.4); // 40% of time they hit their weak topic
                if (targetingWeakness) {
                    if (pattern === PATTERNS.BFS_WEAK) conceptSet = safeBfs;
                    if (pattern === PATTERNS.HEAP_WEAK) conceptSet = safeHeap;
                    if (pattern === PATTERNS.DP_WEAK) conceptSet = safeDp;
                    if (pattern === PATTERNS.FOUNDATIONAL_WEAK) conceptSet = safeFoundational;

                    // They suffer heavily on their weakness
                    correctProb = 0.25;
                } else {
                    correctProb = 0.85; // Normal on other topics
                }
            }

            const targetConcept = conceptSet[Math.floor(rand() * conceptSet.length)];
            const isCorrect = rand() < correctProb;
            const evaluation = isCorrect ? 'correct' : 'incorrect';

            // IDEMPOTENCY LOCK: Check if this specific generated attempt exists
            const pseudoUniqueId = student.id + '_' + targetConcept.id + '_' + attemptDate.getTime().toString();

            // We use the JSON metadata / pseudo identifier natively if possible, but since we insert the exact timestamp...
            // Let's actually check if an attempt in the exact same minute exists, to prevent duplicate runs bleeding
            const minTime = new Date(attemptDate.getTime() - 60000).toISOString();
            const maxTime = new Date(attemptDate.getTime() + 60000).toISOString();

            const { data: existingQuestion } = await supabaseAdmin
                .from('practice_questions')
                .select('id')
                .eq('student_id', student.id)
                .eq('concept', targetConcept.id)
                .gte('created_at', minTime)
                .lte('created_at', maxTime)
                .limit(1);

            if (existingQuestion && existingQuestion.length > 0) {
                // Skip duplicate
                continue;
            }

            // Insert Question Path
            const { data: q, error: qErr } = await supabaseAdmin.from('practice_questions').insert({
                student_id: student.id,
                subject: dsaCourse.id, // Emulating course linkage
                concept: targetConcept.id,
                question: `[Demo] Synthetic historically back-dated question measuring understanding of ${targetConcept.name}?`,
                status: isCorrect ? 'completed' : 'pending',
                created_at: attemptDate.toISOString(),
                completed_at: isCorrect ? attemptDate.toISOString() : null
            }).select('id').single();

            if (qErr) {
                console.error('Error inserting question:', qErr.message);
                continue;
            }

            // Insert Attempt Path
            await supabaseAdmin.from('practice_attempts').insert({
                practice_question_id: q.id,
                student_id: student.id,
                answer: isCorrect ? `A correct derivation demonstrating understanding of ${targetConcept.name}` : `An incorrect logical jump missing properties of ${targetConcept.name}`,
                evaluation: evaluation,
                attempt_number: 1,
                hints_used: isCorrect ? 0 : Math.floor(rand() * 2), // 0 or 1
                answer_revealed: !isCorrect && (rand() > 0.5),
                created_at: new Date(attemptDate.getTime() + (rand() * 120000)).toISOString() // 0-2 mins after question
            });
        }

        console.log(`   -> Generated approximately ${attemptCount} historical attempts.`);
    }

    console.log('\n--- Historical Generation Complete! ---');
}

seedHistory().catch(console.error);
