/**
 * Retrieval Test Suite
 * ────────────────────
 * Tests the full normalization → query analysis → expansion → retrieval → evidence gate pipeline.
 * Run: node scripts/retrieval_test_suite.js
 * No auth/Supabase needed — tests are offline against in-memory chunks.
 */

const { loadData } = require('../src/data/store');
const { retrieve } = require('../src/services/retrieval.service');
const { tokenize, normalizeForRetrieval, normalizeUnicode, safeStem, STEM_EXCEPTIONS } = require('../src/utils/nlp');
const { analyzeQuery } = require('../src/utils/queryAnalyzer');
const { buildRetrievalQuery } = require('../src/utils/queryExpander');
const { performance } = require('perf_hooks');

// Load chunks into memory
loadData();

let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, testName, detail = '') {
    if (condition) {
        passed++;
        console.log(`  ✅ ${testName}`);
    } else {
        failed++;
        const msg = `  ❌ ${testName}${detail ? ' — ' + detail : ''}`;
        console.log(msg);
        failures.push(msg);
    }
}

function section(name) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${name}`);
    console.log('═'.repeat(60));
}

// ═══════════════════════════════════════════════════════════════
//  1. LEXICAL VARIATION
// ═══════════════════════════════════════════════════════════════
section('1. Lexical Variation');

const lexicalQueries = [
    "Newton's second law",
    "Newtons second law",
    "NEWTON'S SECOND LAW",
    "newton second law"
];

const lexicalResults = lexicalQueries.map(q => {
    const r = retrieve(q);
    return { query: q, topId: r[0]?.id, topScore: r[0]?.score };
});

// All should retrieve chunk_1 as top result
for (const lr of lexicalResults) {
    assert(lr.topId === 'chunk_1', `"${lr.query}" → top result is chunk_1`, `got ${lr.topId}`);
}

// Scores should be within 10% of each other
const scores = lexicalResults.map(r => r.topScore);
const maxScore = Math.max(...scores);
const minScore = Math.min(...scores);
assert(maxScore - minScore < 0.10, 'Lexical score variance < 0.10', `range: ${minScore.toFixed(4)} - ${maxScore.toFixed(4)}`);

// ═══════════════════════════════════════════════════════════════
//  2. UNICODE NORMALIZATION
// ═══════════════════════════════════════════════════════════════
section('2. Unicode Normalization');

const curlyQuery = "Newton\u2019s laws";   // curly apostrophe
const straightQuery = "Newton's laws";

const curlyResult = retrieve(curlyQuery);
const straightResult = retrieve(straightQuery);

assert(curlyResult[0]?.id === straightResult[0]?.id,
    'Curly vs straight apostrophe → same top result',
    `curly=${curlyResult[0]?.id}, straight=${straightResult[0]?.id}`);

const scoreDiff = Math.abs((curlyResult[0]?.score || 0) - (straightResult[0]?.score || 0));
assert(scoreDiff < 0.01, 'Curly vs straight score difference < 0.01', `diff=${scoreDiff.toFixed(4)}`);

// Unicode cleanup function
const cleaned = normalizeUnicode("Newton\u2019s \u201Claws\u201D of\u00A0motion");
assert(!cleaned.includes('\u2019'), 'normalizeUnicode removes curly apostrophe');
assert(!cleaned.includes('\u201C'), 'normalizeUnicode removes left double quote');
assert(!cleaned.includes('\u00A0'), 'normalizeUnicode removes non-breaking space');

// ═══════════════════════════════════════════════════════════════
//  3. MORPHOLOGICAL STEMMING — CORRECT CASES
// ═══════════════════════════════════════════════════════════════
section('3. Morphological Stemming — Correct Cases');

const stemTests = [
    ['laws', 'law'],
    ['vectors', 'vector'],
    ['algorithms', 'algorithm'],
    ['forces', 'force'],
    ['objects', 'object'],
    ['planets', 'planet'],
    ['velocities', 'velocity'],
    ['quantities', 'quantity'],
    ['molecules', 'molecule'],
    ['calculations', 'calculation'],
];

for (const [input, expected] of stemTests) {
    const result = safeStem(input);
    assert(result === expected, `safeStem("${input}") → "${expected}"`, `got "${result}"`);
}

// ═══════════════════════════════════════════════════════════════
//  4. MORPHOLOGICAL STEMMING — PROTECTION
// ═══════════════════════════════════════════════════════════════
section('4. Morphological Stemming — Protection');

const protectedWords = [
    'class', 'physics', 'process', 'mass', 'gas', 'bus',
    'lens', 'axis', 'basis', 'status', 'radius',
    'analysis', 'synthesis', 'hypothesis', 'thesis',
    'dynamics', 'mechanics', 'optics',
    'stress', 'progress', 'access', 'success'
];

for (const word of protectedWords) {
    const result = safeStem(word);
    assert(result === word, `safeStem("${word}") → "${word}" (protected)`, `got "${result}"`);
}

// ═══════════════════════════════════════════════════════════════
//  5. RETRIEVAL EQUIVALENCE (morphology)
// ═══════════════════════════════════════════════════════════════
section('5. Retrieval Equivalence (Morphology)');

const morphPairs = [
    ['law', 'laws'],
    ['vector', 'vectors'],
    ['algorithm', 'algorithms'],
];

for (const [singular, plural] of morphPairs) {
    const r1 = retrieve(singular);
    const r2 = retrieve(plural);
    assert(r1[0]?.id === r2[0]?.id,
        `"${singular}" vs "${plural}" → same top result`,
        `singular=${r1[0]?.id}, plural=${r2[0]?.id}`);
}

// ═══════════════════════════════════════════════════════════════
//  6. QUERY ANALYSIS
// ═══════════════════════════════════════════════════════════════
section('6. Query Analysis');

const qaTests = [
    { q: "What is Newton's second law?", type: 'COMPLETE' },
    { q: "Explain photosynthesis", type: 'COMPLETE' },
    { q: "newtons?", type: 'COMPLETE' },
    { q: "What about the third one?", type: 'CONTEXT_DEPENDENT' },
    { q: "Explain this", type: 'CONTEXT_DEPENDENT' },
    { q: "Why?", type: 'CONTEXT_DEPENDENT' },
    { q: "What about that?", type: 'CONTEXT_DEPENDENT' },
    { q: "", type: 'EMPTY' },
    { q: "   ", type: 'EMPTY' },
    { q: "is the a", type: 'EMPTY' },
];

for (const t of qaTests) {
    const result = analyzeQuery(t.q);
    assert(result.type === t.type,
        `analyzeQuery("${t.q}") → ${t.type}`,
        `got ${result.type}`);
}

// ═══════════════════════════════════════════════════════════════
//  6b. EXPLICIT CONTEXT CLASSIFICATION REGRESSIONS
// ═══════════════════════════════════════════════════════════════
section('6b. Explicit Context Classification Regressions');

const contextRegressions = [
    { q: "Whats the third one?", type: 'CONTEXT_DEPENDENT' },
    { q: "What about the second one?", type: 'CONTEXT_DEPENDENT' },
    { q: "What about the first one?", type: 'CONTEXT_DEPENDENT' },
    { q: "What about it?", type: 'CONTEXT_DEPENDENT' },
    { q: "What about that?", type: 'CONTEXT_DEPENDENT' },
    { q: "That one", type: 'CONTEXT_DEPENDENT' },
    { q: "This one", type: 'CONTEXT_DEPENDENT' },
    { q: "The last one", type: 'CONTEXT_DEPENDENT' },
    { q: "The previous one", type: 'CONTEXT_DEPENDENT' },
    // Expected COMPLETE (no explicit context and sufficient tokens)
    { q: "Newton's second law", type: 'COMPLETE' },
    { q: "Newton laws of motion", type: 'COMPLETE' },
    { q: "What is acceleration?", type: 'COMPLETE' },
    { q: "Explain Newton's second law", type: 'COMPLETE' },
];

for (const t of contextRegressions) {
    const result = analyzeQuery(t.q);
    assert(result.type === t.type,
        `Regression analyzeQuery("${t.q}") → ${t.type}`,
        `got ${result.type}`);
}

// ═══════════════════════════════════════════════════════════════
//  7. CONTEXTUAL EXPANSION — ORDINAL RESOLUTION
// ═══════════════════════════════════════════════════════════════
section('7. Contextual Expansion — Ordinal Resolution');

const ordinalResult = buildRetrievalQuery({
    userMessage: "What about the third one?",
    recentMessages: [
        { role: 'user', content: "What is Newton's second law?" },
        { role: 'assistant', content: "Newton's second law states that F=ma..." }
    ]
});

assert(!ordinalResult.requiresClarification,
    'Ordinal with single context → no clarification needed');
assert(ordinalResult.expandedTokens.some(t => t === 'newton' || t === 'newton'),
    'Expanded tokens include "newton"',
    `tokens: ${JSON.stringify(ordinalResult.expandedTokens)}`);
assert(ordinalResult.expandedTokens.some(t => t === 'third'),
    'Expanded tokens include "third"',
    `tokens: ${JSON.stringify(ordinalResult.expandedTokens)}`);

// Now retrieve with the expanded tokens
const expandedRetrievalResult = retrieve("", { tokens: ordinalResult.expandedTokens });
assert(expandedRetrievalResult[0]?.id === 'chunk_2',
    'Expanded "third one" retrieves Newton\'s Third Law (chunk_2)',
    `got ${expandedRetrievalResult[0]?.id}`);

// ═══════════════════════════════════════════════════════════════
//  7b. CONTEXT INTEGRATION TEST (Newton -> Whats the third one?)
// ═══════════════════════════════════════════════════════════════
section('7b. Context Integration Test');

const newtonQuery = "Newton laws of motion?";
const newtonRetrieve = retrieve(newtonQuery);
assert(newtonRetrieve[0]?.id === 'chunk_7' || newtonRetrieve[0]?.id === 'chunk_1',
    'Turn 1: "Newton laws of motion?" returns Newton chunks');

const turn2Result = buildRetrievalQuery({
    userMessage: "Whats the third one?",
    recentMessages: [
        { role: 'user', content: newtonQuery },
        { role: 'assistant', content: "Newton's laws of motion are..." }
    ]
});

assert(turn2Result.queryType === 'CONTEXT_DEPENDENT',
    'Turn 2: "Whats the third one?" → CONTEXT_DEPENDENT');
assert(turn2Result.expandedTokens.includes('third') && turn2Result.expandedTokens.includes('law'),
    'Turn 2: expanded tokens include "third" and "law"');

const turn2Retrieve = retrieve("", { tokens: turn2Result.expandedTokens });
const hasChunk2 = turn2Retrieve.some(c => c.id === 'chunk_2' && c.score >= 0.30);
assert(hasChunk2, `Turn 2: retrieves Newton third law (chunk_2) above threshold`);

// ═══════════════════════════════════════════════════════════════
//  8. AMBIGUITY DETECTION
// ═══════════════════════════════════════════════════════════════
section('8. Ambiguity Detection');

const ambiguousResult = buildRetrievalQuery({
    userMessage: "What about the second one?",
    recentMessages: [
        { role: 'user', content: "What is Newton's second law?" },
        { role: 'user', content: "Tell me about vectors and scalars" }
    ]
});

assert(ambiguousResult.requiresClarification,
    'Ordinal with multiple distinct topics → requires clarification');
assert(ambiguousResult.clarificationMessage !== null,
    'Clarification message is provided',
    ambiguousResult.clarificationMessage);
assert(Array.isArray(ambiguousResult.clarificationOptions) && ambiguousResult.clarificationOptions.length === 2,
    'Clarification options are returned for multi-topic ambiguity',
    JSON.stringify(ambiguousResult.clarificationOptions));
assert(ambiguousResult.clarificationOptions.includes("What is Newton's second law?") && ambiguousResult.clarificationOptions.includes("Tell me about vectors and scalars"),
    'Options correctly map to the raw user messages that formed the topics');

// ═══════════════════════════════════════════════════════════════
//  8b. AMBIGUITY RESOLUTION TEST (Controller Simulation)
// ═══════════════════════════════════════════════════════════════
section('8b. Ambiguity Resolution (Controller Override)');

// Stage 1: The backend controller intercepts `req.body.clarification_context`
// which contains `original_question: "What about the second one?"`.
// The `userMessage` fed to `buildRetrievalQuery` is this original question.
// The `recentMessages` override focuses purely on the clarification response:
const resolutionStage = buildRetrievalQuery({
    userMessage: "What about the second one?", // original intent restored
    recentMessages: [
        { role: 'user', content: "What is Newton's second law?" } // isolated clarification topic response
    ]
});

assert(!resolutionStage.requiresClarification,
    'Resolution stage bypasses ambiguity because context is now exactly 1 topic');
assert(resolutionStage.expandedTokens.includes('second') && resolutionStage.expandedTokens.includes('newton'),
    'Resolution merges ordinal with specific clarified topic');

const resolutionRetrieve = retrieve("", { tokens: resolutionStage.expandedTokens });
const hasOverrideChunk1 = resolutionRetrieve.some(c => c.id === 'chunk_1' && c.score >= 0.30);
assert(hasOverrideChunk1, 'Clarification effectively retrieves Newton second law securely');

// ═══════════════════════════════════════════════════════════════
//  9. VAGUE QUERY HANDLING
// ═══════════════════════════════════════════════════════════════
section('9. Vague Query Handling');

// Vague with no context → clarification
const vagueNoContext = buildRetrievalQuery({
    userMessage: "Explain this.",
    recentMessages: []
});
assert(vagueNoContext.requiresClarification,
    '"Explain this." with no context → requires clarification');

// Vague with context → expansion
const vagueWithContext = buildRetrievalQuery({
    userMessage: "Explain this.",
    recentMessages: [
        { role: 'user', content: "What is Newton's first law?" }
    ]
});
assert(!vagueWithContext.requiresClarification,
    '"Explain this." with Newton context → no clarification');
assert(vagueWithContext.expandedTokens.length > 0,
    'Expanded tokens are populated',
    `tokens: ${JSON.stringify(vagueWithContext.expandedTokens)}`);

// ═══════════════════════════════════════════════════════════════
//  10. MULTI-CHUNK RETRIEVAL
// ═══════════════════════════════════════════════════════════════
section('10. Multi-Chunk Retrieval');

const multiResult = retrieve("newtons laws of motion list them");
const multiIds = multiResult.map(r => r.id);
assert(multiResult[0].score >= 0.30, 'Multi-chunk: top score >= 0.30',
    `score: ${multiResult[0].score.toFixed(4)}`);
assert(multiIds.includes('chunk_7'), 'Contains First Law (chunk_7)', `ids: ${multiIds}`);
assert(multiIds.includes('chunk_1'), 'Contains Second Law (chunk_1)', `ids: ${multiIds}`);
assert(multiIds.includes('chunk_2'), 'Contains Third Law (chunk_2)', `ids: ${multiIds}`);

// ═══════════════════════════════════════════════════════════════
//  11. UNSUPPORTED QUESTION (Evidence Gate)
// ═══════════════════════════════════════════════════════════════
section('11. Unsupported Question — Evidence Gate');

const unsupportedResult = retrieve("Who is Charles Babbage?");
assert(unsupportedResult[0].score < 0.30,
    '"Charles Babbage" → top score < 0.30 (evidence gate FAIL)',
    `score: ${unsupportedResult[0].score.toFixed(4)}`);

const unsupported2 = retrieve("What is quantum entanglement?");
assert(unsupported2[0].score < 0.30,
    '"Quantum entanglement" → top score < 0.30',
    `score: ${unsupported2[0].score.toFixed(4)}`);

// ═══════════════════════════════════════════════════════════════
//  12. SUBJECT ISOLATION
// ═══════════════════════════════════════════════════════════════
section('12. Subject Isolation');

const physicsOnly = retrieve("force", { subject: 'Physics' });
const allResults = retrieve("force");

// All results from physics-filtered query should be Physics
const allPhysics = physicsOnly.every(r => r.topic === 'Physics');
assert(allPhysics, 'Subject=Physics → all results are Physics chunks',
    `topics: ${physicsOnly.map(r => r.topic)}`);

// Physics-filtered top score should be >= all-chunk top score for a physics query
assert(physicsOnly[0].score >= allResults[0].score - 0.01,
    'Physics filter does not reduce relevant scores',
    `filtered=${physicsOnly[0].score.toFixed(4)}, all=${allResults[0].score.toFixed(4)}`);

// ═══════════════════════════════════════════════════════════════
//  13. SHORT QUERIES
// ═══════════════════════════════════════════════════════════════
section('13. Short Queries');

const shortResult = retrieve("newtons?");
assert(shortResult[0].topic === 'Physics',
    '"newtons?" → retrieves Physics content',
    `topic: ${shortResult[0].topic}`);

const shortResult2 = retrieve("photosynthesis");
assert(shortResult2[0].id === 'chunk_4',
    '"photosynthesis" → retrieves chunk_4 (Biology)',
    `id: ${shortResult2[0].id}`);

// ═══════════════════════════════════════════════════════════════
//  14. PERFORMANCE / LATENCY
// ═══════════════════════════════════════════════════════════════
section('14. Performance / Latency');

const perfQueries = [
    "Newton's second law",
    "What about the third one?",
    "Explain photosynthesis in detail",
    "Who is Charles Babbage?",
    "newtons laws of motion list them",
    "vectors?"
];

const timings = [];
for (const q of perfQueries) {
    const start = performance.now();

    // Full pipeline: normalize → analyze → expand → retrieve
    const nr = normalizeForRetrieval(q);
    const analysis = analyzeQuery(q);
    const expanded = buildRetrievalQuery({
        userMessage: q,
        recentMessages: [{ role: 'user', content: "Newton's second law" }]
    });
    const results = retrieve(q, { tokens: expanded.expandedTokens });

    const elapsed = performance.now() - start;
    timings.push({ query: q, ms: elapsed });
}

const avgMs = timings.reduce((sum, t) => sum + t.ms, 0) / timings.length;
const maxMs = Math.max(...timings.map(t => t.ms));

console.log(`\n  Latency results:`);
for (const t of timings) {
    console.log(`    "${t.query}" → ${t.ms.toFixed(2)}ms`);
}
console.log(`    Average: ${avgMs.toFixed(2)}ms`);
console.log(`    Max: ${maxMs.toFixed(2)}ms`);

assert(avgMs < 10, `Average preprocessing+retrieval < 10ms`, `avg: ${avgMs.toFixed(2)}ms`);
assert(maxMs < 20, `Max preprocessing+retrieval < 20ms`, `max: ${maxMs.toFixed(2)}ms`);

// ═══════════════════════════════════════════════════════════════
//  NORMALIZEFORRETRIEVAL API
// ═══════════════════════════════════════════════════════════════
section('15. normalizeForRetrieval API Contract');

const nfr = normalizeForRetrieval("Can you explain Newton's laws?");
assert(nfr.original === "Can you explain Newton's laws?",
    'original is preserved exactly');
assert(typeof nfr.normalized === 'string',
    'normalized is a string');
assert(Array.isArray(nfr.tokens),
    'tokens is an array');
assert(nfr.tokens.includes('newton'),
    'tokens contain "newton"', `tokens: ${nfr.tokens}`);
assert(nfr.tokens.includes('law'),
    'tokens contain "law" (stemmed from "laws")', `tokens: ${nfr.tokens}`);
assert(!nfr.tokens.includes('you'),
    '"you" (stopword) is filtered out');

// ═══════════════════════════════════════════════════════════════
//  SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(60));

if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(f));
}

process.exit(failed > 0 ? 1 : 0);
