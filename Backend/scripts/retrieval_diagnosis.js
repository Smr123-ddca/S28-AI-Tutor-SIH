const { retrieve } = require('../src/services/retrieval.service');
const { loadData, getChunks } = require('../src/data/store');
const { tokenize, getTermFrequencies, cosineSimilarity } = require('../src/utils/nlp');
const fs = require('fs');

loadData();

function testQuery(query) {
    let out = `\n=== QUERY: "${query}" ===\n`;

    // Low level NLP trace
    const allChunks = getChunks();
    const queryTokens = tokenize(query);
    const queryTF = getTermFrequencies(queryTokens);

    out += `Tokens: ${JSON.stringify(queryTokens)}\n`;

    const scored = allChunks.map(chunk => {
        const chunkContent = `${chunk.topic} ${chunk.section_label} ${chunk.text}`;
        const chunkTokens = tokenize(chunkContent);
        const chunkTF = getTermFrequencies(chunkTokens);
        const score = cosineSimilarity(queryTF, chunkTF);
        return {
            id: chunk.id,
            section: chunk.section_label,
            score: score
        };
    }).sort((a, b) => b.score - a.score);

    out += "\nAll Document Scores:\n";
    scored.forEach(s => {
        if (s.id === 'chunk_7' || s.id === 'chunk_1' || s.id === 'chunk_2' || s.score > 0) {
            out += `[${s.id}] Score: ${s.score.toFixed(4)}\n`;
        }
    });

    const top3 = scored.slice(0, 3);
    const aggChunks = allChunks.filter(c => top3.some(t => t.id === c.id));
    const aggText = aggChunks.map(c => `${c.topic} ${c.section_label} ${c.text}`).join(' ');
    const aggTF = getTermFrequencies(tokenize(aggText));
    const aggScore = cosineSimilarity(queryTF, aggTF);
    out += `\nAggregate Top-3 Chunk Score: ${aggScore.toFixed(4)}\n`;

    out += "\nActual retrieve() Response:\n";
    const retrieved = retrieve(query);
    retrieved.forEach((r, idx) => {
        const passedGate = r.score >= 0.30;
        out += `#${idx + 1} [${r.id}] Score: ${r.score.toFixed(4)} (Passed 0.30 Gate? ${passedGate})\n`;
    });

    const hasGoodEvidence = retrieved && retrieved.length > 0 && retrieved[0].score >= 0.30;
    out += `\nEvidence Gate Decision: ${hasGoodEvidence ? 'PASS' : 'FAIL'} (using >0.30 on index 0: ${retrieved[0]?.score?.toFixed(4) || 'none'})\n`;
    fs.appendFileSync('score_test.txt', out);
}

fs.writeFileSync('score_test.txt', ''); // Reset on boot

testQuery('newtons laws of motion list them');
testQuery('What are Newton\'s first and second laws?');
testQuery('Compare Newton\'s first and third laws.');
testQuery('What is Newton\'s second law?');
testQuery('Who is Charles Babbage?');
