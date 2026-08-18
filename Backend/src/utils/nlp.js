const STOP_WORDS = new Set([
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "if",
    "in", "into", "is", "it", "no", "not", "of", "on", "or", "such",
    "that", "the", "their", "then", "there", "these", "they", "this",
    "to", "was", "will", "with", "what", "which", "who", "why", "how", "subject", "syllabus",
    "does", "do", "explain", "s", "difference", "between", "affect"
]);

function tokenize(text) {
    if (!text) return [];
    // Lowercase and extract alphanumeric token matches
    const tokens = text.toLowerCase().match(/\b[a-z0-9]+\b/gi) || [];
    return tokens.filter(t => !STOP_WORDS.has(t));
}
function getTermFrequencies(tokens) {
    const tf = {};
    for (const token of tokens) {
        tf[token] = (tf[token] || 0) + 1;
    }
    return tf;
}

function cosineSimilarity(tf1, tf2) {
    const termSet = new Set([...Object.keys(tf1), ...Object.keys(tf2)]);
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const term of termSet) {
        const val1 = tf1[term] || 0;
        const val2 = tf2[term] || 0;
        dotProduct += val1 * val2;
        norm1 += val1 * val1;
        norm2 += val2 * val2;
    }

    if (norm1 === 0 || norm2 === 0) return 0;
    // Both text blocks are normalized before computing score 0-1
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

module.exports = {
    tokenize,
    getTermFrequencies,
    cosineSimilarity
};
