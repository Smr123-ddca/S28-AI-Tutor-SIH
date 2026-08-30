const { supabaseAdmin } = require('../lib/supabaseAdmin');
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const { getChunks } = require('../data/store');
const retrievalService = require('../services/retrieval.service');

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const evaluationSchema = {
    type: SchemaType.OBJECT,
    properties: {
        evaluation: { type: SchemaType.STRING, description: "Must be exactly 'correct', 'partial', or 'incorrect'" },
        reason: { type: SchemaType.STRING, description: "Brief explanation of the evaluation" }
    },
    required: ["evaluation", "reason"]
};

const socraticSchema = {
    type: SchemaType.OBJECT,
    properties: {
        evaluation: { type: SchemaType.STRING, description: "Must be exactly 'correct', 'partial', or 'incorrect'" },
        message: { type: SchemaType.STRING, description: "The guiding question, or a confirmation of success. Do not state the final answer unless they just got it correct." }
    },
    required: ["evaluation", "message"]
};
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

    if (!practice_question_id || !answer) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify ownership of the practice question first
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

    // Retrieve Evidence
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

    // Call Gemini
    let evaluationResult = null;
    try {
        const prompt = `
You are an AI Tutor evaluating a student's answer to a practice question.
Evaluate the student's answer against the factual Source Material exclusively. 
Categorize the answer as exactly 'correct', 'partial', or 'incorrect'.
Do not penalize exact wording if the core concept is understood.

Source Material:
${evidenceText}

Question:
${question.question}

Core Concept:
${question.concept}

Student's Answer:
${answer}
`;
        const model = genAI.getGenerativeModel({
            model: "gemini-3.6-flash",
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: evaluationSchema
            }
        });

        const result = await model.generateContent(prompt);
        const text = await result.response.text();
        evaluationResult = JSON.parse(text);

        if (!['correct', 'partial', 'incorrect'].includes(evaluationResult.evaluation)) {
            evaluationResult.evaluation = 'incorrect';
        }
    } catch (err) {
        console.error("Gemini evaluation error:", err);
        return res.status(500).json({ error: "Failed to evaluate answer. Please try again." });
    }

    // Insert the attempt securely
    const { data: attempt, error: attemptError } = await supabaseAdmin
        .from('practice_attempts')
        .insert({
            practice_question_id,
            student_id,
            answer,
            evaluation: evaluationResult.evaluation,
            attempt_number,
            hints_used: question.hints_requested || 0,
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
    // Do NOT move it backwards or flag it as anything other than pending per requirement.

    return res.json({
        success: true,
        evaluation: evaluationResult.evaluation,
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
        const model = genAI.getGenerativeModel({
            model: "gemini-3.6-flash",
            generationConfig: { responseMimeType: "application/json", responseSchema: socraticSchema }
        });
        const result = await model.generateContent(prompt);
        evaluationResult = JSON.parse(await result.response.text());
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

    let answerText = "";
    try {
        const prompt = `Provide a concise, direct answer and brief explanation to the following question, relying ONLY on the Source Material provided.\n\nSource: ${evidenceText}\n\nQuestion: ${question.question}`;
        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        const result = await model.generateContent(prompt);
        answerText = await result.response.text();
    } catch (err) {
        return res.status(500).json({ error: "Failed to generate answer" });
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
