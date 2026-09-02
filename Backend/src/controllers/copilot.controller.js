const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { generateWithFallback } = require('../services/llm.router');

const STORE_PATH = path.join(__dirname, '../data/grading_store.json');

const KNOWN_STUDENT_NAMES = {
    '55199574-0473-43cf-9994-6ee252a49342': 'Smruti Pradhan',
    '3d999019-498e-4d72-a4c2-dc194c25948a': 'Smruti Pradhan',
    'e47b1029-7928-4bc2-8a12-fc194c25948b': 'Aarav Sharma',
    '54c1e0a8-cb3b-43dc-9c30-c0faf9617db4': 'Debo',
    'mock-student-uuid-101': 'Alex Rivers',
    'student-test-submission-uuid': 'Alex Rivers'
};

function resolveStudentName(id, profileName) {
    if (profileName && profileName !== 'Student') return profileName;
    if (id && KNOWN_STUDENT_NAMES[id]) return KNOWN_STUDENT_NAMES[id];
    return id ? `Student (${id.substring(0, 8)})` : 'Student';
}

function getLocalTeacherCourses(teacherId) {
    try {
        if (fs.existsSync(STORE_PATH)) {
            const store = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
            const assignments = store.assignments || [];
            return [...new Set(
                assignments
                    .filter(a => a.created_by === teacherId)
                    .map(a => a.course_name)
                    .filter(Boolean)
            )];
        }
    } catch (e) {
        console.warn('[copilot] Could not read local grading store:', e.message);
    }
    return [];
}

async function getTeacherCourses(teacherId) {
    let courses = [];
    try {
        const { data, error } = await supabaseAdmin
            .from('assignments')
            .select('course_name')
            .eq('created_by', teacherId);

        if (!error && data && data.length > 0) {
            courses = [...new Set(data.map(a => a.course_name).filter(Boolean))];
        }
    } catch (err) {
        // Fallback to local store
    }

    if (courses.length === 0) {
        courses = getLocalTeacherCourses(teacherId);
    }

    return courses;
}

/**
 * Identify intent from user message:
 * 1. "Who is struggling with [topic]" -> { intent: 'struggling', topic: '...' }
 * 2. "Weekly summary" -> { intent: 'weekly_summary' }
 * 3. "Top errors this week" -> { intent: 'top_errors' }
 * 4. null if unmatched
 */
function classifyIntent(message) {
    const text = message.trim();

    // 1. Weekly summary
    if (/^(?:weekly\s+summary|week\s+summary|summary\s+(?:for|of)\s+this\s+week|this\s+week(?:'s)?\s+summary|overall\s+weekly\s+summary)$/i.test(text) ||
        /\b(?:weekly\s+summary|summary\s+for\s+this\s+week|this\s+week(?:'s)?\s+summary)\b/i.test(text)) {
        return { intent: 'weekly_summary' };
    }

    // 2. Top errors
    if (/\b(?:top\s+errors|common\s+errors|common\s+mistakes|top\s+mistakes|frequent\s+errors|frequent\s+mistakes|most\s+common\s+errors|errors\s+this\s+week|mistakes\s+this\s+week)\b/i.test(text)) {
        return { intent: 'top_errors' };
    }

    // 3. Who is struggling with [topic]
    const strugglingMatch = text.match(/(?:who(?:'s|\s+is|\s+are)?\s+struggling(?:\s+(?:with|on|in))?|who\s+needs\s+help(?:\s+(?:with|on|in))?|struggling\s+with)\s+([a-zA-Z0-9_\-\s]+?)(?:\?|\.|$)/i);
    if (strugglingMatch && strugglingMatch[1] && strugglingMatch[1].trim().length > 0) {
        return {
            intent: 'struggling',
            topic: strugglingMatch[1].trim().replace(/[?!.,]+$/, '')
        };
    }

    return null;
}

/**
 * Controller: POST /api/teacher-copilot
 */
async function handleTeacherCopilot(req, res) {
    try {
        const { message } = req.body;

        // 1. Input Validation
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ error: 'Message cannot be empty.' });
        }

        const sanitizedMessage = message.trim();
        if (sanitizedMessage.length > 500) {
            return res.status(400).json({ error: 'Message is too long. Please keep it under 500 characters.' });
        }

        const teacherId = req.user.id;

        // 2. Intent Classification
        const intentObj = classifyIntent(sanitizedMessage);
        if (!intentObj) {
            return res.json({
                intent: 'unmatched',
                reply: "I can currently help with: who's struggling with a topic, a weekly summary, or top errors this week — try rephrasing."
            });
        }

        // 3. Scoping: Resolve Teacher's Assigned Courses strictly via assignments.created_by
        const teacherCourses = await getTeacherCourses(teacherId);
        if (!teacherCourses || teacherCourses.length === 0) {
            return res.json({
                intent: intentObj.intent,
                reply: "No course data found for your account yet."
            });
        }

        // 4. Query attempts strictly scoped to teacherCourses and last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        let rawAttempts = [];
        try {
            const { data: dbAttempts, error: dbErr } = await supabaseAdmin
                .from('practice_attempts')
                .select(`
                    id,
                    student_id,
                    evaluation,
                    hints_used,
                    created_at,
                    practice_questions!inner(id, subject, concept, question)
                `)
                .in('practice_questions.subject', teacherCourses)
                .gte('created_at', sevenDaysAgo);

            if (dbErr) {
                console.error('[copilot] DB query error:', dbErr.message);
                return res.json({
                    error: true,
                    reply: "Something went wrong pulling that data — try again."
                });
            }

            rawAttempts = dbAttempts || [];
        } catch (dbEx) {
            console.error('[copilot] DB exception:', dbEx);
            return res.json({
                error: true,
                reply: "Something went wrong pulling that data — try again."
            });
        }

        // Fetch student profiles for display name enrichment
        const studentIdSet = new Set(rawAttempts.map(a => a.student_id));
        const profilesMap = {};
        if (studentIdSet.size > 0) {
            try {
                const { data: profiles } = await supabaseAdmin
                    .from('profiles')
                    .select('id, display_name, full_name')
                    .in('id', Array.from(studentIdSet));
                if (profiles) {
                    profiles.forEach(p => {
                        profilesMap[p.id] = p.display_name || p.full_name;
                    });
                }
            } catch (e) {
                // Ignore profile lookup errors
            }
        }

        // 5. Process Intent-Specific Logic
        if (intentObj.intent === 'struggling') {
            const topic = intentObj.topic;
            const topicNormalized = topic.toLowerCase().trim();

            // Filter attempts matching topic on concept or subject
            const matchingAttempts = rawAttempts.filter(a => {
                const c = (a.practice_questions?.concept || '').toLowerCase();
                const s = (a.practice_questions?.subject || '').toLowerCase();
                return c.includes(topicNormalized) || s.includes(topicNormalized) || topicNormalized.includes(c);
            });

            if (matchingAttempts.length === 0) {
                return res.json({
                    intent: 'struggling',
                    topic,
                    reply: `No students are currently struggling with ${topic} — nice work!`
                });
            }

            // Group by student
            const studentStats = {};
            matchingAttempts.forEach(a => {
                if (!studentStats[a.student_id]) {
                    studentStats[a.student_id] = {
                        student_id: a.student_id,
                        name: resolveStudentName(a.student_id, profilesMap[a.student_id]),
                        total: 0,
                        correct: 0,
                        hints_used: 0,
                        concepts: new Set()
                    };
                }
                const st = studentStats[a.student_id];
                st.total += 1;
                if (a.evaluation === 'correct') st.correct += 1;
                st.hints_used += (a.hints_used || 0);
                if (a.practice_questions?.concept) st.concepts.add(a.practice_questions.concept);
            });

            // Struggling criteria: correctness rate < 60% OR hints_used >= 1 with incorrect/partial attempts
            const strugglingStudents = Object.values(studentStats)
                .map(st => ({
                    name: st.name,
                    accuracy_pct: Math.round((st.correct / st.total) * 100),
                    total_attempts: st.total,
                    hints_used: st.hints_used,
                    concepts: Array.from(st.concepts)
                }))
                .filter(st => st.accuracy_pct < 60 || st.hints_used > 1);

            if (strugglingStudents.length === 0) {
                return res.json({
                    intent: 'struggling',
                    topic,
                    reply: `No students are currently struggling with ${topic} — nice work!`
                });
            }

            // Format data for LLM
            const prompt = `
You are the Teacher Co-pilot in Learnify.
A teacher asked: "${sanitizedMessage}"

DATA GROUNDING (Last 7 days, Course: ${teacherCourses.join(', ')}, Topic: "${topic}"):
${JSON.stringify(strugglingStudents, null, 2)}

INSTRUCTIONS:
- Answer ONLY using the provided data above.
- In plain conversational language, summarize which students are struggling with this topic, their accuracy/hint usage, and specific concepts they missed.
- Never invent student names, numbers, or topics not present in the data.
- Keep the response concise and strictly under 100 words.
`;

            try {
                const llmOutput = await generateWithFallback(prompt, "TEACHER_COPILOT");
                const parsed = JSON.parse(llmOutput);
                return res.json({
                    intent: 'struggling',
                    topic,
                    reply: parsed.answer || parsed.message || parsed.text,
                    data: strugglingStudents
                });
            } catch (llmErr) {
                console.error('[copilot] LLM generation error:', llmErr.message);
                const summaryFallback = strugglingStudents
                    .map(s => `${s.name} (${s.accuracy_pct}% accuracy, ${s.hints_used} hints used)`)
                    .join(', ');
                return res.json({
                    intent: 'struggling',
                    topic,
                    reply: `I found the data but couldn't summarize it right now. Struggling students on ${topic}: ${summaryFallback}.`,
                    data: strugglingStudents
                });
            }

        } else if (intentObj.intent === 'weekly_summary') {
            if (rawAttempts.length === 0) {
                return res.json({
                    intent: 'weekly_summary',
                    reply: "No student tutoring or practice activity recorded in the last 7 days for your courses."
                });
            }

            const totalAttempts = rawAttempts.length;
            const correctAttempts = rawAttempts.filter(a => a.evaluation === 'correct').length;
            const accuracyPct = Math.round((correctAttempts / totalAttempts) * 100);
            const activeStudentIds = new Set(rawAttempts.map(a => a.student_id));

            // Topic frequency
            const conceptCounts = {};
            rawAttempts.forEach(a => {
                const c = a.practice_questions?.concept || 'General';
                conceptCounts[c] = (conceptCounts[c] || 0) + 1;
            });

            const topTopics = Object.entries(conceptCounts)
                .map(([concept, count]) => ({ concept, attempts: count }))
                .sort((a, b) => b.attempts - a.attempts)
                .slice(0, 4);

            const summaryData = {
                courses: teacherCourses,
                total_attempts: totalAttempts,
                overall_correctness_rate: `${accuracyPct}%`,
                active_students: activeStudentIds.size,
                most_attempted_topics: topTopics
            };

            const prompt = `
You are the Teacher Co-pilot in Learnify.
A teacher asked: "${sanitizedMessage}"

DATA GROUNDING (Last 7 days for Teacher's Courses: ${teacherCourses.join(', ')}):
${JSON.stringify(summaryData, null, 2)}

INSTRUCTIONS:
- Answer ONLY using the provided data above.
- Provide a clear, natural weekly summary highlighting the overall correctness rate (${accuracyPct}%), total practice attempts, active student count, and most-attempted topics.
- Never invent numbers, student names, or topics not present in the data.
- Keep the response strictly under 100 words.
`;

            try {
                const llmOutput = await generateWithFallback(prompt, "TEACHER_COPILOT");
                const parsed = JSON.parse(llmOutput);
                return res.json({
                    intent: 'weekly_summary',
                    reply: parsed.answer || parsed.message || parsed.text,
                    data: summaryData
                });
            } catch (llmErr) {
                console.error('[copilot] LLM generation error:', llmErr.message);
                const topicsList = topTopics.map(t => `${t.concept} (${t.attempts} attempts)`).join(', ');
                return res.json({
                    intent: 'weekly_summary',
                    reply: `I found the data but couldn't summarize it right now: Over the last 7 days across ${teacherCourses.join(', ')}, ${activeStudentIds.size} students completed ${totalAttempts} practice attempts with an overall correctness rate of ${accuracyPct}%. Top topics: ${topicsList}.`,
                    data: summaryData
                });
            }

        } else if (intentObj.intent === 'top_errors') {
            const incorrectAttempts = rawAttempts.filter(a => a.evaluation === 'incorrect' || a.evaluation === 'partial');

            if (incorrectAttempts.length === 0) {
                return res.json({
                    intent: 'top_errors',
                    reply: "No concept errors or incorrect attempts recorded in the last 7 days across your courses — great job!"
                });
            }

            // Group by concept and question
            const errorMap = {};
            incorrectAttempts.forEach(a => {
                const concept = a.practice_questions?.concept || 'General';
                const question = a.practice_questions?.question || '';
                const key = `${concept}:::${question}`;
                if (!errorMap[key]) {
                    errorMap[key] = {
                        concept,
                        question,
                        error_count: 0,
                        affected_students: new Set()
                    };
                }
                errorMap[key].error_count += 1;
                errorMap[key].affected_students.add(a.student_id);
            });

            const topErrors = Object.values(errorMap)
                .map(e => ({
                    concept: e.concept,
                    question: e.question,
                    error_count: e.error_count,
                    students_count: e.affected_students.size
                }))
                .sort((a, b) => b.error_count - a.error_count)
                .slice(0, 4);

            const prompt = `
You are the Teacher Co-pilot in Learnify.
A teacher asked: "${sanitizedMessage}"

DATA GROUNDING (Top Errors in Last 7 days for Courses: ${teacherCourses.join(', ')}):
${JSON.stringify(topErrors, null, 2)}

INSTRUCTIONS:
- Answer ONLY using the provided data above.
- In plain conversational language, describe the most frequent incorrect concepts and questions students struggled with this week, including error counts.
- Never invent numbers, student names, or topics not present in the data.
- Keep the response strictly under 100 words.
`;

            try {
                const llmOutput = await generateWithFallback(prompt, "TEACHER_COPILOT");
                const parsed = JSON.parse(llmOutput);
                return res.json({
                    intent: 'top_errors',
                    reply: parsed.answer || parsed.message || parsed.text,
                    data: topErrors
                });
            } catch (llmErr) {
                console.error('[copilot] LLM generation error:', llmErr.message);
                const errorsList = topErrors.map(e => `${e.concept} (${e.error_count} mistakes)`).join(', ');
                return res.json({
                    intent: 'top_errors',
                    reply: `I found the data but couldn't summarize it right now. Top errors this week across your class: ${errorsList}.`,
                    data: topErrors
                });
            }
        }

    } catch (err) {
        console.error('[copilot] Unexpected server error:', err);
        return res.status(500).json({
            error: true,
            reply: "Something went wrong processing your question — please try again."
        });
    }
}

module.exports = {
    handleTeacherCopilot,
    classifyIntent
};
