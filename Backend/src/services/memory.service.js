const { supabaseAdmin } = require('../lib/supabaseAdmin');
const OpenAI = require('openai');

const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
let openai = null;
let defaultModel = process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : (process.env.OPENROUTER_FALLBACK_MODEL || 'meta-llama/llama-3-8b-instruct:free');

if (openaiKey) {
    const config = {
        apiKey: openaiKey
    };
    if (!process.env.OPENAI_API_KEY && process.env.OPENROUTER_API_KEY) {
        config.baseURL = "https://openrouter.ai/api/v1";
        config.defaultHeaders = {
            "HTTP-Referer": "https://learning-app.local",
            "X-Title": "AI Tutor S28",
        };
    }
    openai = new OpenAI(config);
}

/**
 * Fetch the past N messages of a session to use as conversational context.
 */
async function getRecentContext(sessionId, limit = 5) {
    if (!supabaseAdmin || !sessionId) return [];

    const { data: messages, error } = await supabaseAdmin
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Error fetching context for memory service:", error.message);
        return [];
    }

    // Return chronological order
    return messages.reverse();
}

/**
 * Uses OpenAI (or OpenRouter) to rewrite a context-dependent query into a standalone query.
 */
async function rewriteQueryWithContext(query, sessionId, limit = 5) {
    if (!openai) {
        console.warn("No OpenAI or OpenRouter key provided. Skipping query contextualization.");
        return query;
    }

    const messages = await getRecentContext(sessionId, limit);
    if (messages.length === 0) {
        return query;
    }

    const conversationHistory = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

    const prompt = `Given the following conversation history and a follow-up query, rewrite the follow-up query to be a standalone, fully-contextualized search query. 
If it is already standalone, return it as is. Do not answer it, just rewrite it.
Do not wrap it in quotes. Keep it concise, focused on the educational concept.

Conversation History:
${conversationHistory}

Follow-up Query: ${query}

Rewritten Standalone Query:`;

    try {
        const response = await openai.chat.completions.create({
            model: defaultModel,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.0,
            max_tokens: 60
        });

        let rewritten = response.choices[0].message.content.trim();
        // Remove surrounding quotes if model added them
        if (rewritten.startsWith('"') && rewritten.endsWith('"')) {
            rewritten = rewritten.slice(1, -1);
        }
        return rewritten;
    } catch (err) {
        console.error("OpenAI Query Rewrite Failed: ", err.message);
        // Fallback to original query safely so system doesn't crash on network failure
        return query;
    }
}

module.exports = {
    getRecentContext,
    rewriteQueryWithContext
};
