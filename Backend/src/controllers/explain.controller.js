const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const retrievalService = require('../services/retrieval.service');
const { getLikelyGaps } = require('./gap.controller');
const { getChunks } = require('../data/store');
const { recordChatLog } = require('./chatlog.controller');

// Initialize Gemini
// In a real app we'd want to handle missing env keys more robustly, 
// but it's assumed GEMINI_API_KEY is available.
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
        status: { type: SchemaType.STRING, description: "Must be 'answered'" },
        explanation_segments: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    text: { type: SchemaType.STRING, description: "The explanation text" },
                    source_chunk_id: { type: SchemaType.STRING, description: "The ID of the source chunk used" }
                },
                required: ["text", "source_chunk_id"]
            }
        },
        practice_questions: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING, description: "A practice question" }
        }
    },
    required: ["status", "explanation_segments", "practice_questions"]
};

// Heuristic function to classify questions
function classifyQuestion(question) {
    const qLower = question.toLowerCase();

    // Patterns that strongly indicate a homework, exam, or direct-answer request
    const homeworkPatterns = [
        /solve\s+(?:this|for)/,
        /what\s+is\s+the\s+answer\s+to/,
        /for\s+my\s+(?:assignment|homework|exam|test|quiz)/,
        /calculate\s+(?:the|for)/,
        /find\s+the\s+value\s+of/,
        /^q\d+[\.\:]\s/i, // Matches "Q3. ", "Q12: ", etc at the start
        /^\d+[\.\)]\s/    // Matches "1. ", "3) ", etc at the start
    ];

    for (let pattern of homeworkPatterns) {
        if (pattern.test(qLower)) {
            return {
                classification: "graded_work_request",
                reason: `Matched phrase pattern: ${pattern.toString()}`
            };
        }
    }

    return {
        classification: "concept_question",
        reason: "No graded-work patterns matched."
    };
}

async function callGemini(promptText) {
    const model = genAI.getGenerativeModel({
        model: "gemini-3.6-flash",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    const result = await model.generateContent(promptText);
    const response = await result.response;
    return response.text();
}

async function explain(req, res) {
    const { question, student_id, session_id } = req.body;

    if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: 'Please provide a valid "question" string in the JSON payload.' });
    }

    // Helper to log and respond
    const respondAndLog = (statusObj) => {
        if (student_id || session_id) {
            recordChatLog({
                student_id,
                session_id: session_id || 'untracked',
                question,
                response: statusObj
            });
        }
        return res.json(statusObj);
    };

    try {
        // a. Call existing retrieval logic
        const results = retrievalService.retrieve(question);

        // b. Fallback if no sufficient evidence
        if (!results || results.length === 0 || results[0].score < 0.30) {
            return respondAndLog({
                status: "insufficient_evidence",
                message: "I don't have approved course material covering this.",
                results: results
            });
        }

        // c. Run heuristic pre-check
        const classificationResult = classifyQuestion(question);

        // Log classification for auditing
        console.log("--- Classification Audit ---");
        console.log("Question:", question);
        console.log("Classification:", classificationResult.classification);
        console.log("Reason:", classificationResult.reason);
        console.log("----------------------------");

        if (classificationResult.classification === "graded_work_request") {
            return respondAndLog({
                status: "guided_mode",
                message: "I can't give you the direct answer to what looks like a graded question, but I can help you understand the concept behind it. Would you like a walkthrough of the relevant concept instead?",
                top_topic: results[0].topic,
                top_section: results[0].section_label,
                results: results
            });
        }

        // Gap detection flow
        let contextChunks = results;
        let gapData = null;

        if (classificationResult.classification === "concept_question" && student_id) {
            const topChunkId = results[0].id;
            const likelyGaps = getLikelyGaps(student_id, topChunkId);

            if (likelyGaps.length > 0) {
                const firstGap = likelyGaps[0];
                const allChunks = getChunks();
                const gapChunk = allChunks.find(c => c.id === firstGap.chunk_id);

                if (gapChunk) {
                    contextChunks = [{
                        id: gapChunk.id,
                        topic: gapChunk.topic,
                        section_label: gapChunk.section_label,
                        text: gapChunk.text,
                        score: 1.0
                    }];

                    gapData = {
                        addressed_gap: true,
                        gap_chunk_id: gapChunk.id,
                        gap_section_label: gapChunk.section_label,
                        original_target_chunk_id: topChunkId
                    };
                }
            }
        }

        // d. Prepare prompt for Gemini
        const contextStr = contextChunks.map(r => `Chunk ID: ${r.id}\nSection: ${r.section_label}\nContent: ${r.text}\n`).join('\n---\n');

        let systemInstruction = `
You are an AI Tutor.
You must explain the user's question using ONLY the provided source material. 
Never use outside knowledge.
Break the explanation into 2-4 short segments. Each segment must be tagged with the source_chunk_id from which that information was derived.
Generate exactly 2 short practice questions based on the same material.
`;
        if (gapData) {
            systemInstruction += `\nSince the user seems to have a gap in prerequisite knowledge, briefly note at the beginning of your explanation that this is prerequisite material relevant to what they originally asked about, before diving into the explanation.`;
        }

        const prompt = `${systemInstruction}\n\nSource Material:\n${contextStr}\n\nQuestion: ${question}`;

        // e. Call Gemini with retry mechanism
        let parsedResult = null;
        let attempts = 0;
        const maxAttempts = 2; // 1 initial + 1 retry

        while (attempts < maxAttempts) {
            try {
                const rawResponse = await callGemini(prompt);
                parsedResult = JSON.parse(rawResponse);
                break; // Parsing successful, exit loop
            } catch (err) {
                console.error("Gemini call or parse failed:", err);
                attempts++;
                if (attempts >= maxAttempts) {
                    const errorObj = {
                        status: "error",
                        message: "Could not generate a response.",
                        results: contextChunks
                    };
                    if (student_id || session_id) {
                        // Use raw return and manually record since it's a 500
                        recordChatLog({
                            student_id,
                            session_id: session_id || 'untracked',
                            question,
                            response: errorObj
                        });
                    }
                    return res.status(500).json(errorObj);
                }
            }
        }

        // f. Verify chunk IDs
        const validChunkIds = new Set(contextChunks.map(r => r.id));
        if (parsedResult.explanation_segments && Array.isArray(parsedResult.explanation_segments)) {
            parsedResult.explanation_segments.forEach(segment => {
                if (!validChunkIds.has(segment.source_chunk_id)) {
                    segment.unverified = true;
                }
            });
        }

        // Return combined JSON
        return respondAndLog({
            status: parsedResult.status || "answered",
            ...(gapData || {}),
            explanation_segments: parsedResult.explanation_segments || [],
            practice_questions: parsedResult.practice_questions || [],
            results: contextChunks
        });
    } catch (error) {
        console.error("Error in explain endpoint:", error);

        // Log the catastropic error as well
        if (student_id || session_id) {
            recordChatLog({
                student_id,
                session_id: session_id || 'untracked',
                question,
                response: { status: "error", message: "Internal Server Error" }
            });
        }

        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = { explain };
