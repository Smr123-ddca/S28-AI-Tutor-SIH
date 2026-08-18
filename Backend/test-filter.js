require('dotenv').config();
const { tokenize } = require('./src/utils/nlp');
const retrievalService = require('./src/services/retrieval.service');
const { loadData } = require('./src/data/store');
const { getLikelyGaps, recordSessionEvent } = require('./src/controllers/gap.controller');

loadData();

const questions = [
    "Why does mass affect acceleration?", // s2
    "Explain quantum entanglement",
    "What is momentum?",
    "What's the difference between mass and weight?",
    "What is the syllabus for this subject"
];

console.log("\n=== Tokenization Check ===");
for (let q of questions) {
    console.log(`Q: "${q}"`);
    console.log(`Tokens:`, tokenize(q));
}

console.log("\n=== Retrieval Score Check ===");
for (let q of questions) {
    const results = retrievalService.retrieve(q);
    console.log(`Q: "${q}"`);
    if (results.length > 0) {
        console.log(`  Top Match: ${results[0].id} - Score: ${results[0].score.toFixed(3)}`);
        console.log(`  Threshold Check (>0.30): ${results[0].score > 0.30 ? "PASS" : "FAIL (insufficient_evidence)"}`);
    } else {
        console.log(`  No results (insufficient_evidence)`);
    }
}

console.log("\n=== Gap Detection Check ===");
// Mock req/res for session event
const resMock = { json: () => { }, status: () => resMock };
// Record for s1: recent incorrect answer on chunk_8
recordSessionEvent({ body: { student_id: 's1', chunk_id: 'chunk_8', correct: false } }, resMock);
// Record for s2: mostly correct
recordSessionEvent({ body: { student_id: 's2', chunk_id: 'chunk_8', correct: true } }, resMock);
recordSessionEvent({ body: { student_id: 's2', chunk_id: 'chunk_7', correct: true } }, resMock);

let c = retrievalService.retrieve("Why does mass affect acceleration?");
let topChunk = c[0] ? c[0].id : null;

if (topChunk) {
    const gaps_s1 = getLikelyGaps('s1', topChunk);
    const gaps_s2 = getLikelyGaps('s2', topChunk);
    console.log(`Top chunk for 'Why does mass affect acceleration?': ${topChunk}`);
    console.log(`  Gaps for s1:`, gaps_s1.map(g => g.chunk_id));
    console.log(`  Gaps for s2:`, gaps_s2.map(g => g.chunk_id));
}
