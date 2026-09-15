const { tokenize, getTermFrequencies, cosineSimilarity } = require('../utils/nlp');
const { supabaseAdmin } = require('../lib/supabaseAdmin');

/**
 * Retrieve the top-K most relevant course chunks for a query using Supabase.
 */
async function retrieve(question, options = {}) {
    const { tokens: precomputedTokens, subject, course, topK = 5 } = options;

    let query = supabaseAdmin.from('chunks').select('chunk_alias, topic, chapter, section, text_content, courses!inner(name)');

    if (course) {
        query = query.eq('courses.name', course);
    }

    // We only fetch chunks for the provided subject/course for performance
    if (subject && !course) {
        query = query.eq('courses.name', subject);
        // or by topic matching subject
        // query = query.or(`topic.ilike.${subject},courses.name.ilike.${subject}`);
    }

    const { data: chunksData, error } = await query;
    if (error) {
        console.error('Failed to fetch chunks for RAG:', error);
        return [];
    }

    let courseContentChunks = chunksData || [];

    // The legacy retrieval logic matched exactly on lowercase topic if subject was passed.
    // For safety, we replicate the precise legacy code filter.
    if (subject) {
        const subjectLower = subject.toLowerCase();
        const filtered = courseContentChunks.filter(
            chunk => chunk.topic && chunk.topic.toLowerCase() === subjectLower
        );
        if (filtered.length > 0) {
            courseContentChunks = filtered;
        }
    }

    // ── Tokenize the query ──
    const questionTokens = precomputedTokens || tokenize(question);
    const questionTF = getTermFrequencies(questionTokens);

    const scoredChunks = courseContentChunks.map(chunk => {
        // Build searchable text
        const chunkContent = `${chunk.topic || ''} ${chunk.section || ''} ${chunk.text_content || ''}`;
        const chunkTokens = tokenize(chunkContent);
        const chunkTF = getTermFrequencies(chunkTokens);

        const score = cosineSimilarity(questionTF, chunkTF);

        return {
            id: chunk.chunk_alias,
            topic: chunk.topic,
            section_label: chunk.section,
            text: chunk.text_content,
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
