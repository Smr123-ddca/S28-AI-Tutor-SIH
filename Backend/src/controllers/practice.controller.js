const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { getChunks } = require('../data/store');
const retrievalService = require('../services/retrieval.service');
const { generateWithFallback } = require('../services/llm.router');

async function createQuestion(req, res) {
    const student_id = req.user.id;
    const { session_id, chunk_id, subject, question, concept, hint_1, hint_2, status = 'pending' } = req.body;

    if (!question) {
        return res.status(400).json({ error: "Missing required field: question" });
    }

    const { data, error } = await supabaseAdmin
        .from('practice_questions')
        .insert({
            student_id,
            session_id,
            chunk_id,
            subject,
            question,
            concept,
            hint_1,
            hint_2,
            status
        })
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ question: data });
}

async function getQuestions(req, res) {
    const student_id = req.user.id;
    const session_id = req.query.session_id;

    if (!session_id) {
        return res.status(400).json({ error: "Missing required session_id parameter for course isolation." });
    }

    // Verify session ownership
    const { data: sessionData, error: sessionErr } = await supabaseAdmin
        .from('chat_sessions')
        .select('*')
        .eq('id', session_id)
        .eq('student_id', student_id)
        .single();

    if (sessionErr || !sessionData) {
        return res.status(403).json({ error: "Access denied or session not found" });
    }

    const { data: questions, error } = await supabaseAdmin
        .from('practice_questions')
        .select('*')
        .eq('student_id', student_id)
        .eq('session_id', session_id)
        .order('created_at', { ascending: false });

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    return res.json({ questions: questions || [] });
}

async function getQuestionById(req, res) {
    const { id } = req.params;
    const student_id = req.user.id;

    const { data: question, error } = await supabaseAdmin
        .from('practice_questions')
        .select('*')
        .eq('id', id)
        .eq('student_id', student_id)
        .single();

    if (error || !question) {
        return res.status(403).json({ error: "Access denied or question not found" });
    }

    return res.json({ question });
}

async function createAttempt(req, res) {
    const student_id = req.user.id;
    const { practice_question_id, answer } = req.body;

    if (!practice_question_id || typeof answer !== 'string') {
        return res.status(400).json({ error: "practice_question_id and answer are required." });
    }

    const trimmedAnswer = answer.trim();
    if (!trimmedAnswer || trimmedAnswer.length === 0) {
        return res.status(400).json({ error: "Answer cannot be empty." });
    }

    // Verify ownership of the practice question
    const { data: question, error: questionError } = await supabaseAdmin
        .from('practice_questions')
        .select('*')
        .eq('id', practice_question_id)
        .eq('student_id', student_id)
        .single();

    if (questionError || !question) {
        return res.status(403).json({ error: "Access denied or practice question not found" });
    }

    // Derive Attempt Number
    const { data: pastAttempts, error: attemptsError } = await supabaseAdmin
        .from('practice_attempts')
        .select('id')
        .eq('practice_question_id', practice_question_id);

    if (attemptsError) {
        return res.status(500).json({ error: attemptsError.message });
    }
    const attempt_number = (pastAttempts ? pastAttempts.length : 0) + 1;

    // Retrieve Source Material for Ground-Truth Verification
    let evidenceText = "No matching source material found.";
    if (question.chunk_id) {
        const allChunks = getChunks();
        const chunk = allChunks.find(c => c.id === question.chunk_id);
        if (chunk) {
            evidenceText = chunk.text;
        } else {
            const results = retrievalService.retrieve(question.question, { subject: question.subject, topK: 1 });
            if (results && results.length > 0) evidenceText = results[0].text;
        }
    } else {
        const results = retrievalService.retrieve(question.question, { subject: question.subject, topK: 1 });
        if (results && results.length > 0) evidenceText = results[0].text;
    }

    // Direct Normalized Exact Match against Expected Answer (if available)
    let evaluationResult = null;
    const normalizedStudentAnswer = trimmedAnswer.toLowerCase().replace(/[^a-z0-9]/g, '');
    const expectedAnswer = question.expected_answer ? question.expected_answer.trim() : null;
    const normalizedExpected = expectedAnswer ? expectedAnswer.toLowerCase().replace(/[^a-z0-9]/g, '') : null;

    if (normalizedExpected && normalizedStudentAnswer.length > 0 && normalizedStudentAnswer === normalizedExpected) {
        evaluationResult = {
            evaluation: 'correct',
            reason: 'Exact match with expected factual answer.'
        };
    } else if (trimmedAnswer.length < 2) {
        // Immediate reject for single character / empty gibberish
        evaluationResult = {
            evaluation: 'incorrect',
            reason: 'Answer is too short or incomplete.'
        };
    } else {
        // Strict AI Evaluation
        try {
            const prompt = `
You are an AI Tutor evaluating a student's answer to a practice question.
Evaluate whether the student's answer is factually correct and accurately answers the question based on the Source Material and Expected Concept.

Question:
${question.question}

Core Concept Tested:
${question.concept || 'General'}

${expectedAnswer ? `Expected Ground-Truth Key Facts / Solution:\n${expectedAnswer}\n` : ''}
Source Material:
${evidenceText}

Student's Submitted Answer:
"${trimmedAnswer}"

Evaluation Rules:
1. Categorize as 'correct' ONLY if the student accurately answers the question and demonstrates correct understanding of the core concept.
2. Categorize as 'partial' if the student is on the right track but misses a key detail or gives an incomplete answer.
3. Categorize as 'incorrect' if the answer is factually wrong, off-topic, nonsense/gibberish, contradictory, or fails to answer the question.
4. NEVER mark an answer as 'correct' if it is incorrect, evasive, or unverified.
`;
            const text = await generateWithFallback(prompt, "EVALUATE");
            const parsed = JSON.parse(text);

            if (parsed && ['correct', 'partial', 'incorrect'].includes(parsed.evaluation)) {
                evaluationResult = {
                    evaluation: parsed.evaluation,
                    reason: parsed.reason || ''
                };
            } else {
                evaluationResult = {
                    evaluation: 'incorrect',
                    reason: 'Answer could not be confirmed as correct against source materials.'
                };
            }
        } catch (err) {
            console.error("Evaluation LLM error:", err);
            // Defensively fallback to incorrect - NEVER default to correct on failure!
            evaluationResult = {
                evaluation: 'incorrect',
                reason: 'Unable to verify answer at this time. Please check your solution.'
            };
        }
    }

    // Insert the attempt securely
    const { data: attempt, error: attemptError } = await supabaseAdmin
        .from('practice_attempts')
        .insert({
            practice_question_id,
            student_id,
            answer: trimmedAnswer,
            evaluation: evaluationResult.evaluation,
            attempt_number,
            hints_used: question.hints_requested || 0,
            tutor_response: evaluationResult.reason,
            answer_revealed: false
        })
        .select()
        .single();

    if (attemptError) {
        return res.status(500).json({ error: attemptError.message });
    }

    let completed = false;
    // Update question status ONLY if correct
    if (evaluationResult.evaluation === 'correct') {
        completed = true;
        await supabaseAdmin
            .from('practice_questions')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', practice_question_id)
            .eq('student_id', student_id);
    }

    return res.json({
        success: true,
        evaluation: evaluationResult.evaluation,
        reason: evaluationResult.reason,
        attempt_number,
        hints_used: question.hints_requested || 0,
        completed
    });
}

async function requestHint(req, res) {
    const { id } = req.params;
    const student_id = req.user.id;

    // Verify ownership and get current hints
    const { data: question, error } = await supabaseAdmin
        .from('practice_questions')
        .select('hint_1, hint_2, hints_requested')
        .eq('id', id)
        .eq('student_id', student_id)
        .single();

    if (error || !question) {
        return res.status(403).json({ error: "Access denied or question not found" });
    }

    const currentRequested = question.hints_requested || 0;
    if (currentRequested >= 2) {
        return res.status(400).json({ error: "Maximum hints reached" });
    }

    const nextHintNumber = currentRequested + 1;
    const hintText = nextHintNumber === 1 ? question.hint_1 : question.hint_2;

    // Update hints_requested
    const { error: updateError } = await supabaseAdmin
        .from('practice_questions')
        .update({ hints_requested: nextHintNumber })
        .eq('id', id)
        .eq('student_id', student_id);

    if (updateError) {
        return res.status(500).json({ error: updateError.message });
    }

    return res.json({
        success: true,
        hint: hintText,
        hints_requested: nextHintNumber
    });
}

async function socraticAttempt(req, res) {
    const { id } = req.params;
    const student_id = req.user.id;
    const { message } = req.body;

    if (!message) return res.status(400).json({ error: "Missing message" });

    const { data: question, error: questionError } = await supabaseAdmin
        .from('practice_questions')
        .select('*')
        .eq('id', id)
        .eq('student_id', student_id)
        .single();

    if (questionError || !question) return res.status(403).json({ error: "Access denied" });
    if (question.hints_requested < 2) return res.status(400).json({ error: "Must use standard hints first" });
    if (question.status === 'completed' || question.answer_revealed) return res.status(400).json({ error: "Question already resolved" });

    const { data: pastAttempts } = await supabaseAdmin
        .from('practice_attempts')
        .select('answer, tutor_response, created_at')
        .eq('practice_question_id', id)
        .order('created_at', { ascending: true });

    let evidenceText = "No matching source material found.";
    if (question.chunk_id) {
        const chunk = getChunks().find(c => c.id === question.chunk_id);
        if (chunk) evidenceText = chunk.text;
    }

    let historyStr = (pastAttempts || []).map(a => {
        let str = `Student: ${a.answer}`;
        if (a.tutor_response) str += `\nTutor (You): ${a.tutor_response}`;
        return str;
    }).join("\n\n");

    const prompt = `
You are an AI Tutor guiding a student strictly via the Socratic method.
Use the factual Source Material exclusively. Do NOT give away the final answer.
Identify missing concepts, ask a focused guiding question.

Source Material:
${evidenceText}

Target Question:
${question.question}
Concept: ${question.concept || 'N/A'}

Conversation History:
${historyStr}

New Student Message:
${message}
`;

    let evaluationResult = null;
    try {
        const text = await generateWithFallback(prompt, "SOCRATIC");
        evaluationResult = JSON.parse(text);
        if (!['correct', 'partial', 'incorrect'].includes(evaluationResult.evaluation)) evaluationResult.evaluation = 'incorrect';
    } catch (err) {
        return res.status(500).json({ error: "Failed to evaluate" });
    }

    const attempt_number = (pastAttempts ? pastAttempts.length : 0) + 1;
    await supabaseAdmin
        .from('practice_attempts')
        .insert({
            practice_question_id: id,
            student_id,
            answer: message,
            evaluation: evaluationResult.evaluation,
            attempt_number,
            hints_used: question.hints_requested,
            tutor_response: evaluationResult.message,
            answer_revealed: false
        });

    let completed = false;
    if (evaluationResult.evaluation === 'correct') {
        completed = true;
        await supabaseAdmin.from('practice_questions').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
    }

    return res.json({ success: true, evaluation: evaluationResult.evaluation, message: evaluationResult.message, completed });
}

async function revealAnswer(req, res) {
    const { id } = req.params;
    const student_id = req.user.id;

    const { data: question, error: questionError } = await supabaseAdmin
        .from('practice_questions')
        .select('*')
        .eq('id', id)
        .eq('student_id', student_id)
        .single();

    if (questionError || !question) return res.status(403).json({ error: "Access denied" });
    if (question.status === 'completed' || question.answer_revealed) return res.status(400).json({ error: "Question already resolved" });

    let evidenceText = "No matching source material found.";
    if (question.chunk_id) {
        const chunk = getChunks().find(c => c.id === question.chunk_id);
        if (chunk) evidenceText = chunk.text;
    }

    let answerText = question.expected_answer || "";
    if (!answerText) {
        try {
            const prompt = `Provide a concise, direct answer and brief explanation to the following question, relying ONLY on the Source Material provided.\n\nSource: ${evidenceText}\n\nQuestion: ${question.question}`;
            answerText = await generateWithFallback(prompt, "EVALUATE");
            try {
                const parsed = JSON.parse(answerText);
                if (parsed && parsed.reason) answerText = parsed.reason;
            } catch (e) {
                // Keep raw text if not JSON
            }
        } catch (err) {
            console.error("Failed to generate revealed answer:", err);
            answerText = "Refer to the course study materials for this concept.";
        }
    }

    await supabaseAdmin.from('practice_questions').update({ answer_revealed: true }).eq('id', id);

    // Log explicit escape hatch usage without completing the problem
    const { data: pastAttempts } = await supabaseAdmin.from('practice_attempts').select('id').eq('practice_question_id', id);
    const attempt_number = (pastAttempts ? pastAttempts.length : 0) + 1;
    await supabaseAdmin.from('practice_attempts').insert({
        practice_question_id: id,
        student_id,
        answer: "[REQUESTED SHOW ANSWER]",
        evaluation: 'incorrect',
        attempt_number,
        hints_used: question.hints_requested,
        tutor_response: answerText,
        answer_revealed: true
    });

    return res.json({ success: true, answer: answerText });
}

module.exports = {
    createQuestion,
    getQuestions,
    getQuestionById,
    createAttempt,
    requestHint,
    socraticAttempt,
    revealAnswer
};
