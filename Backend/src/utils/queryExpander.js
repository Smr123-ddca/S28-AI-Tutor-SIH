const { normalizeForRetrieval, tokenize } = require('./nlp');
const { analyzeQuery, ORDINAL_PATTERN } = require('./queryAnalyzer');

// Ordinal word → number mapping for reference resolution
const ORDINAL_MAP = {
    'first': 1, '1st': 1,
    'second': 2, '2nd': 2,
    'third': 3, '3rd': 3,
    'fourth': 4, '4th': 4,
    'fifth': 5, '5th': 5,
    'last': -1, 'other': -1
};

/**
 * Extract the primary topic tokens from a conversation message.
 * Returns the content tokens from the message, excluding common
 * conversational filler.
 *
 * @param {string} message
 * @returns {string[]}
 */
function extractTopicTokens(message) {
    const { tokens } = normalizeForRetrieval(message);
    return tokens;
}

/**
 * Extract all distinct topic clusters from recent messages.
 * A "topic cluster" is a set of related content tokens from a single message.
 *
 * @param {{ role: string, content: string }[]} recentMessages - most recent first
 * @returns {{ tokens: string[], raw: string }[]}
 */
function extractTopicClusters(recentMessages) {
    if (!recentMessages || recentMessages.length === 0) return [];

    const clusters = [];
    const seen = new Set();

    for (const msg of recentMessages) {
        if (!msg.content) continue;
        const tokens = extractTopicTokens(msg.content);
        if (tokens.length === 0) continue;

        const key = tokens.sort().join('|');
        if (!seen.has(key)) {
            seen.add(key);
            clusters.push({ tokens, raw: msg.content });
        }
    }

    return clusters;
}

/**
 * Build a retrieval query by combining normalized user input with
 * conversation context when needed.
 *
 * @param {{ userMessage: string, recentMessages?: { role: string, content: string }[], currentSubject?: string }} params
 * @returns {{
 *   originalQuery: string,
 *   normalizedQuery: string,
 *   expandedQuery: string,
 *   expandedTokens: string[],
 *   queryType: string,
 *   requiresClarification: boolean,
 *   clarificationMessage: string | null,
 *   subject: string | null,
 *   diagnostics: object
 * }}
 */
function buildRetrievalQuery({ userMessage, recentMessages = [], currentSubject = null }) {
    const analysis = analyzeQuery(userMessage);
    const { type: queryType, contentTokens, normalized, signals } = analysis;

    const result = {
        originalQuery: userMessage,
        normalizedQuery: normalized.normalized,
        expandedQuery: normalized.normalized,
        expandedTokens: [...contentTokens],
        queryType,
        requiresClarification: false,
        clarificationMessage: null,
        subject: currentSubject || null,
        diagnostics: {
            queryType,
            signals,
            contentTokens,
            contextUsed: false,
            contextTopics: [],
            expansionApplied: false
        }
    };

    // ── EMPTY queries ──
    if (queryType === 'EMPTY') {
        result.requiresClarification = true;
        result.clarificationMessage = "Could you please provide more details about what you'd like to learn?";
        return result;
    }

    // ── COMPLETE queries ──
    if (queryType === 'COMPLETE') {
        // Already has enough content tokens, no expansion needed
        return result;
    }

    // ── CONTEXT_DEPENDENT queries ──
    // Need to resolve from conversation context
    if (!recentMessages || recentMessages.length === 0) {
        // No context available
        result.requiresClarification = true;
        result.clarificationMessage = "I'm not sure what you're referring to. Could you provide more detail?";
        return result;
    }

    // Get recent user messages only (last 3), most recent first
    const recentUserMessages = recentMessages
        .filter(m => m.role === 'user')
        .slice(0, 3);

    const clusters = extractTopicClusters(recentUserMessages);
    result.diagnostics.contextTopics = clusters.map(c => c.tokens);

    if (clusters.length === 0) {
        result.requiresClarification = true;
        result.clarificationMessage = "I'm not sure what you're referring to. Could you be more specific?";
        return result;
    }

    // Check for ordinal references (e.g. "the third one")
    const rawLower = userMessage.toLowerCase();
    const ordinalMatch = rawLower.match(ORDINAL_PATTERN);

    if (ordinalMatch) {
        const ordinalWord = ordinalMatch[1].toLowerCase();
        const ordinalNum = ORDINAL_MAP[ordinalWord];

        // Look for numbered/listed items in recent context
        // If we have exactly one clear topic cluster, the ordinal likely
        // refers to an item within that topic
        if (clusters.length === 1) {
            // Single topic context — ordinal is within that topic
            // Strip ordinal words from context to avoid e.g. "second" from
            // "Newton's second law" competing with "third" from the query
            const ORDINAL_WORDS = new Set(Object.keys(ORDINAL_MAP));
            const contextTokens = clusters[0].tokens.filter(t => !ORDINAL_WORDS.has(t));

            // Merge: context topic nouns + query content tokens (which include the ordinal)
            const merged = [...new Set([...contextTokens, ...contentTokens])];
            result.expandedTokens = merged;
            result.expandedQuery = merged.join(' ');
            result.diagnostics.contextUsed = true;
            result.diagnostics.expansionApplied = true;
            return result;
        }

        // Multiple distinct topics in context — ordinal is ambiguous
        if (clusters.length > 1) {
            result.requiresClarification = true;
            const topicDescriptions = clusters
                .slice(0, 3)
                .map(c => c.tokens.join(' '));
            result.clarificationMessage =
                `I want to make sure I answer the right question. Are you referring to: ${topicDescriptions.map((t, i) => `(${i + 1}) ${t}`).join(', ')}?`;
            return result;
        }
    }

    // Non-ordinal context-dependent query (e.g. "explain this", "why?")
    // Use the most recent topic cluster
    if (clusters.length === 1) {
        const contextTokens = clusters[0].tokens;
        const merged = [...new Set([...contextTokens, ...contentTokens])];
        result.expandedTokens = merged;
        result.expandedQuery = merged.join(' ');
        result.diagnostics.contextUsed = true;
        result.diagnostics.expansionApplied = true;
        return result;
    }

    // Multiple topics — for non-ordinal vague references, use the MOST RECENT topic
    // This is a reasonable heuristic: "explain this" likely refers to the last thing discussed
    if (signals.includes('vague_pattern') || signals.includes('followup_indicator')) {
        const mostRecentTopicTokens = clusters[0].tokens;
        const merged = [...new Set([...mostRecentTopicTokens, ...contentTokens])];
        result.expandedTokens = merged;
        result.expandedQuery = merged.join(' ');
        result.diagnostics.contextUsed = true;
        result.diagnostics.expansionApplied = true;
        return result;
    }

    // Multiple topics, deictic reference, not obviously vague — ask for clarification
    result.requiresClarification = true;
    const topicDescriptions = clusters
        .slice(0, 3)
        .map(c => c.tokens.join(' '));
    result.clarificationMessage =
        `Could you clarify what you're referring to? Recent topics include: ${topicDescriptions.join(', ')}.`;
    return result;
}

module.exports = { buildRetrievalQuery, extractTopicTokens, extractTopicClusters };
