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
        status: { type: SchemaType.STRING, description: "Must be 'answered' or 'insufficient_evidence'" },
        message: { type: SchemaType.STRING, description: "Only used if status is 'insufficient_evidence' or 'answered' without source chunks." },
        explanation_segments: {
            type: SchemaType.ARRAY,
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    text: { type: SchemaType.STRING, description: "The explanation text" },
                    source_chunk_id: { type: SchemaType.STRING, description: "The ID of the source chunk used, or 'none' if answering from conversational context." }
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
        model: "gemini-3.5-flash-lite",
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini API Request Timeout")), 12000)
    );

    // Race the API call against the timeout
    const result = await Promise.race([model.generateContent(promptText), timeoutPromise]);
    const response = await result.response;
    return response.text();
}

async function explain(req, res) {
    const { performance } = require('perf_hooks');
    const fs = require('fs');
    const tTotal = performance.now();
    const timings = [];
    const recordT = (stage, start) => {
        const dur = (performance.now() - start).toFixed(2);
        const msg = `[EXPLAIN TIMING] stage=${stage} duration=${dur}ms`;
        timings.push(msg);
        fs.appendFileSync('timing.log', msg + '\n');
    };

    let tStart = performance.now();

    const { question, session_id, context_limit } = req.body;
    const student_id = req.user.id;

    if (!question) {
        recordT('Validation', tStart);
        return res.status(400).json({ error: "Missing required field: question" });
    }

    // Auth & Validation passed
    recordT('AuthAndValidation', tStart);

    // Logging context tracker variables
    let metaPrevMessages = 0;
    let metaRetrievedChunks = 0;
    let metaPromptSize = 0;
    let metaGeminiStatus = "pending";

    const respondAndLog = async (statusObj) => {
        if (!statusObj.error && statusObj.status !== 'error') {
            try {
                let pStart = performance.now();

                // Optimize: If session_id is known, we don't need to await logging to respond to user!
                const isNewSession = !session_id || session_id === 'untracked';

                const logPromise = recordChatLog({
                    student_id,
                    session_id: session_id || 'untracked',
                    question: question,
                    response: statusObj
                }).then(loggedData => {
                    recordT('Persistence', pStart);
                    if (isNewSession && loggedData) {
                        statusObj.session_id = loggedData;
                    }
                }).catch(err => console.error("Failed to log chat interaction:", err));

                if (isNewSession) {
                    await logPromise; // Wait for the ID so we can return it
                } else {
                    // Fire and forget
                    statusObj.session_id = session_id;
                }
            } catch (err) {
                console.error("Failed to start chat logging:", err);
            }
        }

        recordT('Total', tTotal);
        fs.appendFileSync('timing.log', `[EXPLAIN TRACE] session=${statusObj.session_id || session_id || 'untracked'} prev_msgs=${metaPrevMessages} chunks=${metaRetrievedChunks} prompt_size=${metaPromptSize} gen_status=${metaGeminiStatus}\n`);
        fs.appendFileSync('timing.log', `------\n`);
        return res.json(statusObj);
    };

    try {
        // a. Call existing retrieval logic
        let rStart = performance.now();
        const results = retrievalService.retrieve(question);
        metaRetrievedChunks = results ? results.length : 0;
        recordT('Retrieval', rStart);

        let hStart = performance.now();
        let transcript = "";
        if (session_id && session_id !== 'untracked' && student_id) {
            const { supabaseAdmin } = require('../lib/supabaseAdmin');
            if (supabaseAdmin) {
                const { data: validSession } = await supabaseAdmin
                    .from('chat_sessions')
                    .select('id')
                    .eq('id', session_id)
                    .eq('student_id', student_id)
                    .single();

                if (validSession) {
                    const { data: pastMessages } = await supabaseAdmin
                        .from('chat_messages')
                        .select('role, content, created_at')
                        .eq('session_id', session_id)
                        .order('created_at', { ascending: false })
                        .limit(parseInt(context_limit, 10) || 6);

                    if (pastMessages && pastMessages.length > 0) {
                        pastMessages.reverse();
                        metaPrevMessages = pastMessages.length;
                        transcript = pastMessages.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.content}`).join('\n');
                    }
                }
            }
        }
        recordT('ChatHistoryRetrieval', hStart);

        // b. Fallback if no sufficient evidence AND no transcript context
        let eStart = performance.now();
        const hasGoodEvidence = results && results.length > 0 && results[0].score >= 0.30;
        recordT('EvidenceGate', eStart);

        if (!hasGoodEvidence && !transcript) {
            return await respondAndLog({
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
            return await respondAndLog({
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

        if (classificationResult.classification === "concept_question" && student_id && results && results.length > 0) {
            const topChunkId = results[0].id;
            const likelyGaps = await getLikelyGaps(student_id, topChunkId);

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

        // Fetch Transcript for Context Injection


        // d. Prepare prompt for Gemini
        const contextStr = contextChunks.map(r => `Chunk ID: ${r.id}\nSection: ${r.section_label}\nContent: ${r.text}\n`).join('\n---\n');

        let systemInstruction = `
You are an AI Tutor.
You must use ONLY the provided source material to answer factual course questions. Never use outside knowledge for factual claims.
Distinction explicit:
- "Source Material" is the evidence for factual claims.
- "Recent conversation" provides conversational context.
- Previous conversation must NOT be treated as course evidence.

If the user asks a question about the conversation history (e.g. "What did I ask you previously?"), answer it using the conversational context.
If they ask a factual question that is not covered by the Source Material, explain that you don't have approved course material covering it.
Otherwise, break your factual explanation into 2-4 short segments. Each segment must be tagged with the source_chunk_id from which that information was derived.
Generate exactly 2 short practice questions based on the factual material.
`;
        if (gapData) {
            systemInstruction += `\nSince the user seems to have a gap in prerequisite knowledge, briefly note at the beginning of your explanation that this is prerequisite material relevant to what they originally asked about, before diving into the explanation.`;
        }

        if (transcript) {
            systemInstruction += `\n\nRecent conversation:\n${transcript}`;
        }

        let pcStart = performance.now();
        const prompt = `${systemInstruction}\n\nSource Material:\n${contextChunks.length > 0 && hasGoodEvidence ? contextStr : "No matching source material found for this query."}\n\nQuestion: ${question}`;
        metaPromptSize = prompt.length;
        recordT('PromptConstruction', pcStart);

        // e. Call Gemini (Single Attempt, Fast Fail)
        let parsedResult = null;

        try {
            let gStart = performance.now();
            const rawResponse = await callGemini(prompt);
            recordT('GeminiNetworkWait', gStart);

            metaGeminiStatus = "success";

            let parseStart = performance.now();
            parsedResult = JSON.parse(rawResponse);
            recordT('GeminiParse', parseStart);
        } catch (err) {
            metaGeminiStatus = "failure_aborted";
            console.error("Gemini call or parse failed:", err);

            const errStr = err.toString() + (err.message || "");
            let safeMsg = "The AI service is temporarily unavailable.";
            if (errStr.includes("429")) {
                safeMsg = "The AI service is temporarily busy. Please try again in a moment.";
            } else if (errStr.includes("Timeout") || errStr.includes("timeout") || errStr.includes("504")) {
                safeMsg = "The AI took too long to respond. Please try again.";
            }

            const errorObj = {
                status: "error",
                message: safeMsg,
                results: contextChunks
            };
            return await respondAndLog(errorObj);
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
        return await respondAndLog({
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
            }).catch(e => console.error("Error logging catastrophic fail:", e));
        }

        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = { explain };
