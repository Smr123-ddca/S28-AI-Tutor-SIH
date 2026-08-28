const { tokenize, getTermFrequencies, cosineSimilarity } = require('../utils/nlp');
const { getChunks } = require('../data/store');

/**
 * Retrieve the top-K most relevant course chunks for a query.
 *
 * @param {string} question - the query text (used for tokenization if tokens not provided)
 * @param {{ tokens?: string[], subject?: string, topK?: number }} [options]
 *   - tokens: pre-computed retrieval tokens (skip internal tokenization)
 *   - subject: filter chunks by topic before scoring
 *   - course: filter chunks by isolated published course namespace
 *   - topK: number of results to return (default 5)
 * @returns {Array<{ id: string, topic: string, section_label: string, text: string, score: number }>}
 */
function retrieve(question, options = {}) {
    const { tokens: precomputedTokens, subject, course, topK = 5 } = options;

    let courseContentChunks = getChunks();

    // ── Course isolation filtering ──
    if (course) {
        courseContentChunks = courseContentChunks.filter(c => c.source_course === course);
    }

    // ── Subject filtering ──
    if (subject) {
        const subjectLower = subject.toLowerCase();
        const filtered = courseContentChunks.filter(
            chunk => chunk.topic && chunk.topic.toLowerCase() === subjectLower
        );
        // Only apply filter if it yields results; fall back to all chunks otherwise
        if (filtered.length > 0) {
            courseContentChunks = filtered;
        }
    }

    // ── Tokenize the query ──
    const questionTokens = precomputedTokens || tokenize(question);
    const questionTF = getTermFrequencies(questionTokens);

    const scoredChunks = courseContentChunks.map(chunk => {
        // Build searchable text from chunk metadata + content
        const chunkContent = `${chunk.topic} ${chunk.section_label} ${chunk.text}`;
        const chunkTokens = tokenize(chunkContent);
        const chunkTF = getTermFrequencies(chunkTokens);

        const score = cosineSimilarity(questionTF, chunkTF);

        return {
            id: chunk.id,
            topic: chunk.topic,
            section_label: chunk.section_label,
            text: chunk.text,
            score: score
        };
    });

    // Sort by score descending and take top K
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, topK);
}

module.exports = {
    retrieve
};
