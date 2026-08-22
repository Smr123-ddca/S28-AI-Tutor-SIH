const { supabaseAdmin } = require('../lib/supabaseAdmin');

async function recordChatLog(entry) {
    const { student_id, session_id, question, response } = entry;
    if (!supabaseAdmin) {
        console.warn("Skipping external chat log record: Supabase not configured.");
        return null;
    }

    let currentSessionId = session_id;

    try {
        if (!currentSessionId || currentSessionId === 'untracked') {
            const title = question.substring(0, 50) + (question.length > 50 ? '...' : '');
            const { data: sessionData, error: sessionError } = await supabaseAdmin
                .from('chat_sessions')
                .insert({ student_id, title })
                .select()
                .single();

            if (sessionError || !sessionData) {
                console.error('Session creation failed:', sessionError);
                return null;
            }
            currentSessionId = sessionData.id;
        } else {
            await supabaseAdmin.from('chat_sessions')
                .update({ last_message_at: new Date().toISOString() })
                .eq('id', currentSessionId);
        }

        // Insert User message
        await supabaseAdmin.from('chat_messages').insert({
            session_id: currentSessionId,
            role: 'user',
            content: question,
            response_json: null
        });

        // Parse assistant content for context window
        let assistantContent = response.status;
        if (response.explanation_segments) {
            assistantContent = response.explanation_segments.map(s => s.text).join('\n');
        } else if (response.message) {
            assistantContent = response.message;
        }

        // Insert Assistant message
        await supabaseAdmin.from('chat_messages').insert({
            session_id: currentSessionId,
            role: 'assistant',
            content: assistantContent,
            response_json: response
        });

        return currentSessionId;
    } catch (error) {
        console.error("Failed to record chat log externally:", error);
        return null;
    }
}

// Ensure old function remains backwards compatible (even though frontend will stop using it soon)
async function getChatLogs(req, res) {
    // Left empty for compatibility if anything hits it before full transition, 
    // but the plan moves to getSessions / getSessionMessages
    return res.json({ logs: [] });
}

// Session Endpoints
async function getSessions(req, res) {
    const student_id = req.user.id;
    const { data: sessions, error } = await supabaseAdmin
        .from('chat_sessions')
        .select('id, title, last_message_at')
        .eq('student_id', student_id)
        .order('last_message_at', { ascending: false })
        .limit(5);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ sessions });
}

async function getSessionMessages(req, res) {
    const { sessionId } = req.params;
    const student_id = req.user.id;

    // Optional: could manually verify student ownership, but RLS on Supabase would do it 
    // if using authenticated client. We are using supabaseAdmin, so we must enforce it strictly here.
    const { data: session, error: sessionError } = await supabaseAdmin
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('student_id', student_id)
        .single();

    if (sessionError || !session) {
        return res.status(403).json({ error: "Access denied or session not found" });
    }

    const { data: messages, error } = await supabaseAdmin
        .from('chat_messages')
        .select('id, role, content, response_json, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ messages });
}

async function createSession(req, res) {
    const student_id = req.user.id;
    const { data, error } = await supabaseAdmin
        .from('chat_sessions')
        .insert({ student_id, title: 'New Chat' })
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ id: data.id, title: data.title });
}

async function updateSessionTitle(req, res) {
    const { sessionId } = req.params;
    const { title } = req.body;
    const student_id = req.user.id;

    const { data, error } = await supabaseAdmin
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId)
        .eq('student_id', student_id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ id: data.id, title: data.title });
}

module.exports = {
    recordChatLog,
    getChatLogs,
    getSessions,
    getSessionMessages,
    createSession,
    updateSessionTitle
};
