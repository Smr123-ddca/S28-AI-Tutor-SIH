const { normalizeForRetrieval, STOP_WORDS } = require('./nlp');

// ─── Deictic / Pronominal Patterns ──────────────────────────────────────────
// These words signal that a query depends on conversation context
const DEICTIC_WORDS = new Set([
    'this', 'that', 'these', 'those', 'it', 'them', 'they',
    'here', 'there', 'above', 'below', 'previous', 'next',
    'former', 'latter', 'same', 'one', 'ones'
]);

// Patterns that indicate ordinal/numbered references
const ORDINAL_PATTERN = /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|last|other)\b/i;

// Patterns that indicate "explain more" / follow-up
const FOLLOWUP_PATTERN = /\b(more|again|further|else|another|also|too|continue|repeat|elaborate)\b/i;

// Very vague query patterns (just a question word + maybe filler)
const VAGUE_PATTERNS = [
    /^(explain|tell|describe|show|give)\s+(this|that|it|me)\.?$/i,
    /^(what|why|how|when|where)\s*\??$/i,
    /^(what|why|how)\s+(about|is|are|does|do)\s+(this|that|it)\s*\??$/i,
    /^(and|but|so|ok|okay)\s*\??$/i,
    /^(yes|no|yeah|nah|yep|nope)\s*\??$/i
];

// Explicit context references that override all content-token rules
const EXPLICIT_CONTEXT_PATTERNS = [
    /\b(the\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\s+one)\b/i,
    /\b((first|second|third|last|previous|next|that|this)\s+one)\b/i,
    /\b(those|these)\b/i,
    /\b(what\s+about\s+(it|that|this))\b/i,
    /\b(how\s+about\s+(it|that))\b/i,
    /\b(why\s+does\s+it)\b/i,
    /\b(how\s+does\s+it)\b/i,
    // Add variations for "what about the [ordinal] one" where stop words might be stripped
    /\b(what\s+about\s+the\s+(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last|previous|next)\s+one)\b/i,
    /^(yes,?\s*please\s*walk\s*me\s*through\b)/i,
    /\b(walk\s+me\s+through\s+(the|this|that)\s+concept)\b/i
];

/**
 * @typedef {'COMPLETE' | 'CONTEXT_DEPENDENT' | 'EMPTY'} QueryType
 */

/**
 * Deterministic query quality analysis.
 * Does NOT use an LLM. Uses token counts, deictic detection, and pattern matching.
 *
 * @param {string} query - the raw student query
 * @returns {{ type: QueryType, signals: string[], contentTokens: string[], normalized: object }}
 */
function analyzeQuery(query) {
    const signals = [];

    // Normalize for analysis
    const normalized = normalizeForRetrieval(query);
    const contentTokens = normalized.tokens;
    const rawTrimmed = (query || '').trim();

    // ── EMPTY detection ──
    if (!rawTrimmed || rawTrimmed.length === 0) {
        return { type: 'EMPTY', signals: ['blank_input'], contentTokens: [], normalized };
    }

    if (contentTokens.length === 0) {
        // Before marking EMPTY, check if the raw input has deictic/question words
        // e.g. "Why?" "What about that?" have no content tokens but are context-dependent
        const rawLower = rawTrimmed.toLowerCase();
        const rawWords = rawLower.match(/\b[a-z]+\b/g) || [];
        const hasDeictic = rawWords.some(w => DEICTIC_WORDS.has(w));
        const isVague = VAGUE_PATTERNS.some(p => p.test(rawTrimmed));
        const isQuestionWord = /^(what|why|how|when|where)/i.test(rawTrimmed);

        if (hasDeictic || isVague || isQuestionWord) {
            signals.push('no_content_tokens');
            signals.push('deictic_or_question_word');
            return { type: 'CONTEXT_DEPENDENT', signals, contentTokens: [], normalized };
        }

        signals.push('all_stopwords');
        return { type: 'EMPTY', signals, contentTokens: [], normalized };
    }

    // ── Check for deictic references ──
    const rawLower = rawTrimmed.toLowerCase();
    const rawWords = rawLower.match(/\b[a-z]+\b/g) || [];

    const hasDeictic = rawWords.some(w => DEICTIC_WORDS.has(w));
    if (hasDeictic) signals.push('deictic_reference');

    const hasOrdinal = ORDINAL_PATTERN.test(rawLower);
    if (hasOrdinal) signals.push('ordinal_reference');

    const hasFollowup = FOLLOWUP_PATTERN.test(rawLower);
    if (hasFollowup) signals.push('followup_indicator');

    const isVague = VAGUE_PATTERNS.some(p => p.test(rawTrimmed));
    if (isVague) signals.push('vague_pattern');

    // ── CONTEXT_DEPENDENT detection ──
    // Ordinal references usually need context ("the third one")
    // BUT: if the query has ≥3 content tokens, the ordinal is likely part of a
    // proper name like "Newton's second law" — classify as COMPLETE
    if (hasOrdinal && contentTokens.length < 3) {
        return { type: 'CONTEXT_DEPENDENT', signals, contentTokens, normalized };
    }

    // Vague patterns or deictic with few content tokens
    if (isVague || (hasDeictic && contentTokens.length <= 2)) {
        return { type: 'CONTEXT_DEPENDENT', signals, contentTokens, normalized };
    }

    // Short queries with follow-up indicators
    if (hasFollowup && contentTokens.length <= 1) {
        return { type: 'CONTEXT_DEPENDENT', signals, contentTokens, normalized };
    }

    // ── EXPLICIT CONTEXTUAL PATTERNS (Overrides token count) ──
    const hasExplicitContext = EXPLICIT_CONTEXT_PATTERNS.some(p => p.test(rawLower)) ||
        (hasDeictic && rawWords.length < 5 && !contentTokens.length);
    // If the query explicitly references prior items or is just a deictic pointer
    if (hasExplicitContext || (rawLower === 'it' || rawLower === 'that' || rawLower === 'this')) {
        signals.push('explicit_context_reference');
        return { type: 'CONTEXT_DEPENDENT', signals, contentTokens, normalized };
    }

    // ── COMPLETE ──
    // Has enough content tokens to stand on its own
    if (contentTokens.length >= 2) {
        signals.push('sufficient_content');
        return { type: 'COMPLETE', signals, contentTokens, normalized };
    }

    // Single content token — could go either way.
    // If it has deictic references, it's context-dependent.
    // Otherwise treat as complete (e.g. "newtons?" or "photosynthesis")
    if (hasDeictic || hasOrdinal || hasFollowup) {
        return { type: 'CONTEXT_DEPENDENT', signals, contentTokens, normalized };
    }

    signals.push('single_content_token');
    return { type: 'COMPLETE', signals, contentTokens, normalized };
}

module.exports = { analyzeQuery, DEICTIC_WORDS, ORDINAL_PATTERN };
