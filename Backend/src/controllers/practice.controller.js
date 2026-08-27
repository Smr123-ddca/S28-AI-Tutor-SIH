const { supabaseAdmin } = require('../lib/supabaseAdmin');

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

    const { data: questions, error } = await supabaseAdmin
        .from('practice_questions')
        .select('*')
        .eq('student_id', student_id)
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
    const { practice_question_id, answer, evaluation, attempt_number, hints_used = 0, answer_revealed = false } = req.body;

    if (!practice_question_id || !answer || !evaluation || attempt_number === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify ownership of the practice question first
    const { data: question, error: questionError } = await supabaseAdmin
        .from('practice_questions')
        .select('id')
        .eq('id', practice_question_id)
        .eq('student_id', student_id)
        .single();

    if (questionError || !question) {
        return res.status(403).json({ error: "Access denied or practice question not found" });
    }

    // Insert the attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
        .from('practice_attempts')
        .insert({
            practice_question_id,
            student_id,
            answer,
            evaluation,
            attempt_number,
            hints_used,
            answer_revealed
        })
        .select()
        .single();

    if (attemptError) {
        return res.status(500).json({ error: attemptError.message });
    }

    // If correct, update the practice_questions status to 'completed'
    if (evaluation === 'correct') {
        await supabaseAdmin
            .from('practice_questions')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', practice_question_id)
            .eq('student_id', student_id);
    } else {
        await supabaseAdmin
            .from('practice_questions')
            .update({ status: 'in_progress' })
            .eq('id', practice_question_id)
            .eq('student_id', student_id);
    }

    return res.json({ attempt });
}

module.exports = {
    createQuestion,
    getQuestions,
    getQuestionById,
    createAttempt
};
