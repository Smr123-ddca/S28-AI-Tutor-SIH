const { tokenize, getTermFrequencies, cosineSimilarity } = require('../utils/nlp');
const { getChunks } = require('../data/store');

function retrieve(question) {
    const courseContentChunks = getChunks();
    const questionTokens = tokenize(question);
    const questionTF = getTermFrequencies(questionTokens);

    const scoredChunks = courseContentChunks.map(chunk => {
        // Embed the searchable context
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

    // Sort by score descending and take top 3
    scoredChunks.sort((a, b) => b.score - a.score);
    return scoredChunks.slice(0, 3);
}

module.exports = {
    retrieve
};
