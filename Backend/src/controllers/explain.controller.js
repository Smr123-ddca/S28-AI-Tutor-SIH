const { generateWithFallback } = require('../services/llm.router');
const retrievalService = require('../services/retrieval.service');
const { getLikelyGaps } = require('./gap.controller');
const { getChunks } = require('../data/store');
const { recordChatLog } = require('./chatlog.controller');
const { normalizeForRetrieval } = require('../utils/nlp');
const { analyzeQuery } = require('../utils/queryAnalyzer');
const { buildRetrievalQuery } = require('../utils/queryExpander');

// Heuristic function to classify questions
function classifyQuestion(question) {
    const qLower = question.toLowerCase();

    const homeworkPatterns = [
        /solve\s+(?:this|for)/,
        /what\s+is\s+the\s+answer\s+to/,
        /for\s+my\s+(?:assignment|homework|exam|test|quiz)/,
        /calculate\s+(?:the|for)/,
        /find\s+the\s+value\s+of/,
        /^q\d+[\.\\:]\s/i,
        /^\d+[\.\\)]\s/
    ];

    const greetingPatterns = [
        /^(hi|hello|hey|heyyyy|heyyyyy|heyy|what's\s+up|greetings|good\s+morning|good\s+evening|good\s+afternoon|sup|howdy)[\s\p{P}]*$/iu,
        /^(how\s+are\s+you|what's\s+up|how\s+is\s+it\s+going)/iu
    ];

    for (let pattern of greetingPatterns) {
        if (pattern.test(qLower.trim())) {
            return {
                classification: "greeting",
                reason: `Matched phrase pattern: ${pattern.toString()}`
            };
        }
    }

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

// Replaced native callGemini with generic LLM Router

async function explain(req, res) {
    const { performance } = require('perf_hooks');
    const fs = require('fs');
    const tTotal = performance.now();
    const timings = [];
    const recordT = (stage, start) => {
        const dur = (performance.now() - start).toFixed(2);
        const msg = `[EXPLAIN TIMING] stage=${stage} duration=${dur}ms`;
        timings.push(msg);
        if (process.env.DEBUG_TIMING === 'true') fs.appendFileSync('timing.log', msg + '\n');
    };

    let tStart = performance.now();

    const { question, session_id, context_limit, subject } = req.body;
    const student_id = req.user.id;

    if (!question) {
        if (process.env.DEBUG_TIMING === 'true') recordT('Validation', tStart);
        return res.status(400).json({ error: "Missing required field: question" });
    }

    if (!subject) {
        return res.status(400).json({ error: "Missing required field: subject. A valid published subject selection is mandatory." });
    }

    const path = require('path');
    const coursesPath = path.join(__dirname, '../data/courses.json');
    let coursesList = [];
    if (fs.existsSync(coursesPath)) {
        coursesList = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
    }
    const targetCourse = coursesList.find(c => (c.metadata?.domain === subject || c.name === subject) && c.status === 'published');

    if (!targetCourse) {
        return res.status(403).json({ error: "Cannot query an unpublished or non-existent subject." });
    }

    if (process.env.DEBUG_TIMING === 'true') recordT('AuthAndValidation', tStart);

    // Logging context tracker variables
    let metaPrevMessages = 0;
    let metaRetrievedChunks = 0;
    let metaPromptSize = 0;
    let metaGeminiStatus = "pending";

    const respondAndLog = async (statusObj) => {
        if (!statusObj.error && statusObj.status !== 'error') {
            try {
                let pStart = performance.now();

                const isNewSession = !session_id || session_id === 'untracked';

                const logPromise = recordChatLog({
                    student_id,
                    session_id: session_id || 'untracked',
                    question: question,
                    course: subject, // still logging to 'course' field in DB for now
                    response: statusObj
                }).then(loggedData => {
                    if (process.env.DEBUG_TIMING === 'true') recordT('Persistence', pStart);
                    if (isNewSession && loggedData) {
                        statusObj.session_id = loggedData;
                    }
                }).catch(err => console.error("Failed to log chat interaction:", err));

                if (isNewSession) {
                    await logPromise;
                } else {
                    statusObj.session_id = session_id;
                }
            } catch (err) {
                console.error("Failed to start chat logging:", err);
            }
        }

        if (process.env.DEBUG_TIMING === 'true') recordT('Total', tTotal);
        if (process.env.DEBUG_TIMING === 'true') fs.appendFileSync('timing.log', `[EXPLAIN TRACE] session=${statusObj.session_id || session_id || 'untracked'} prev_msgs=${metaPrevMessages} chunks=${metaRetrievedChunks} prompt_size=${metaPromptSize} gen_status=${metaGeminiStatus}\n`);
        if (process.env.DEBUG_TIMING === 'true') fs.appendFileSync('timing.log', `------\n`);
        return res.json(statusObj);
    };

    try {
        // ════════════════════════════════════════════════════════════════
        // STEP 1: Fetch conversation history FIRST (needed for expansion)
        // ════════════════════════════════════════════════════════════════
        let hStart = performance.now();
        let transcript = "";
        let recentMessages = []; // For query expansion

        if (session_id && session_id !== 'untracked' && student_id) {
            const { supabaseAdmin } = require('../lib/supabaseAdmin');
            if (supabaseAdmin) {
                const { data: validSession } = await supabaseAdmin
                    .from('chat_sessions')
                    .select('id, course')
                    .eq('id', session_id)
                    .eq('student_id', student_id)
                    .single();

                if (validSession) {
                    if (validSession.course) {
                        if (validSession.course !== subject) {
                            return res.status(403).json({ error: "Session subject mismatch. This session belongs to another subject." });
                        }
                    } else {
                        // Legacy session where course IS NULL. Establish course association safely.
                        await supabaseAdmin
                            .from('chat_sessions')
                            .update({ course: subject })
                            .eq('id', session_id);
                    }

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

                        // Provide messages in reverse chronological order for expansion
                        recentMessages = [...pastMessages].reverse().map(m => ({
                            role: m.role,
                            content: m.content
                        }));
                    }
                }
            }
        }
        if (process.env.DEBUG_TIMING === 'true') recordT('ChatHistoryRetrieval', hStart);

        // ════════════════════════════════════════════════════════════════
        // STEP 2: Query preprocessing pipeline (normalization + expansion)
        // ════════════════════════════════════════════════════════════════
        let ppStart = performance.now();

        let questionToProcess = question;
        let contextOverride = null;

        if (req.body.clarification_context && req.body.clarification_context.original_question) {
            questionToProcess = req.body.clarification_context.original_question;
            // Provide ONLY the clarification response as context so queryExpander knows exactly which topic to merge
            contextOverride = [{ role: 'user', content: question }];
        }

        const queryResult = buildRetrievalQuery({
            userMessage: questionToProcess,
            recentMessages: contextOverride || recentMessages,
            currentSubject: null // Will be populated when subject tracking exists
        });

        if (queryResult.queryType === 'CONTEXT_DEPENDENT' && session_id && session_id !== 'untracked') {
            const memoryService = require('../services/memory.service');
            const rewrittenQuery = await memoryService.rewriteQueryWithContext(questionToProcess, session_id);
            if (rewrittenQuery && rewrittenQuery !== questionToProcess) {
                const { tokenize } = require('../utils/nlp');
                queryResult.expandedQuery = rewrittenQuery;
                queryResult.expandedTokens = tokenize(rewrittenQuery);
                queryResult.requiresClarification = false; // Defer to OpenAI's judgement
            }
        }

        if (process.env.DEBUG_TIMING === 'true') recordT('QueryPreprocessing', ppStart);

        // ── Diagnostic logging ──
        console.log("--- Query Pipeline ---");
        console.log("Original:", queryResult.originalQuery);
        console.log("Normalized:", queryResult.normalizedQuery);
        console.log("Expanded:", queryResult.expandedQuery);
        console.log("Type:", queryResult.queryType);
        console.log("Tokens:", queryResult.expandedTokens);
        if (queryResult.requiresClarification) {
            console.log("Clarification:", queryResult.clarificationMessage);
            if (queryResult.clarificationOptions) {
                console.log("Options:", queryResult.clarificationOptions);
            }
        }
        console.log("----------------------");

        // ════════════════════════════════════════════════════════════════
        // STEP 2.5: Handle clarification responses (skip Gemini)
        // ════════════════════════════════════════════════════════════════
        if (queryResult.requiresClarification) {
            return await respondAndLog({
                status: "clarification",
                message: queryResult.clarificationMessage,
                clarification: {
                    options: queryResult.clarificationOptions || []
                },
                diagnostics: queryResult.diagnostics
            });
        }

        // ════════════════════════════════════════════════════════════════
        // STEP 3: Retrieval with expanded tokens
        // ════════════════════════════════════════════════════════════════
        let rStart = performance.now();
        const results = retrievalService.retrieve(question, {
            tokens: queryResult.expandedTokens,
            subject: subject
        });
        metaRetrievedChunks = results ? results.length : 0;
        if (process.env.DEBUG_TIMING === 'true') recordT('Retrieval', rStart);

        // ════════════════════════════════════════════════════════════════
        // STEP 4: Heuristic Classification & Greeting Gate
        // ════════════════════════════════════════════════════════════════
        const classificationResult = classifyQuestion(question);

        console.log("--- Classification Audit ---");
        console.log("Question:", question);
        console.log("Classification:", classificationResult.classification);
        console.log("Reason:", classificationResult.reason);
        console.log("----------------------------");

        if (classificationResult.classification === "greeting") {
            return await respondAndLog({
                status: "answered",
                message: "Hello! I am your Learnify syllabus AI. How can I help you with your studies today?",
                explanation_segments: [],
                practice_questions: []
            });
        }

        // ════════════════════════════════════════════════════════════════
        // STEP 5: Evidence gate (unchanged at 0.30)
        // ════════════════════════════════════════════════════════════════
        let eStart = performance.now();
        const hasGoodEvidence = results && results.length > 0 && results[0].score >= 0.30;
        if (process.env.DEBUG_TIMING === 'true') recordT('EvidenceGate', eStart);

        const isGuidedMode = classificationResult.classification === "graded_work_request";
        const isWalkthrough = /walk\s+me\s+through/i.test(questionToProcess);
        const shouldCoach = isGuidedMode || isWalkthrough;

        if (!hasGoodEvidence && !transcript && !shouldCoach) {
            return await respondAndLog({
                status: "insufficient_evidence",
                message: "I don't have approved course material covering this.",
                results: results,
                diagnostics: queryResult.diagnostics
            });
        }

        // ════════════════════════════════════════════════════════════════
        // STEP 6: Gap detection flow (unchanged)
        // ════════════════════════════════════════════════════════════════
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

        // ════════════════════════════════════════════════════════════════
        // STEP 7: Prepare prompt for Gemini (uses ORIGINAL question + ORIGINAL chunk text)
        // ════════════════════════════════════════════════════════════════
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

        if (shouldCoach) {
            systemInstruction += `\n\nCRITICAL INSTRUCTION: The student is asking about graded homework or explicitly requested a walkthrough. DO NOT GIVE THEM THE DIRECT ANSWER or provide complete code solutions. You MUST adopt a Socratic coaching persona. Ask a guiding question to help them figure out the next step. You may use general programming knowledge to coach them through the concept.`;
        }

        let geminiQuestion = question;
        if (req.body.clarification_context && req.body.clarification_context.original_question) {
            geminiQuestion = `${req.body.clarification_context.original_question} (Clarified context: ${question})`;
        }

        let pcStart = performance.now();
        const prompt = `${systemInstruction}\n\nSource Material:\n${contextChunks.length > 0 && hasGoodEvidence ? contextStr : "No matching source material found for this query."}\n\nQuestion: ${geminiQuestion}`;
        metaPromptSize = prompt.length;
        if (process.env.DEBUG_TIMING === 'true') recordT('PromptConstruction', pcStart);

        // ════════════════════════════════════════════════════════════════
        // STEP 8: Call Gemini (Single Attempt, Fast Fail)
        // ════════════════════════════════════════════════════════════════
        let parsedResult = null;

        try {
            let gStart = performance.now();
            const rawResponse = await generateWithFallback(prompt, "EXPLAIN");
            if (process.env.DEBUG_TIMING === 'true') recordT('GeminiNetworkWait', gStart);

            metaGeminiStatus = "success";

            let parseStart = performance.now();
            parsedResult = JSON.parse(rawResponse);
            if (process.env.DEBUG_TIMING === 'true') recordT('GeminiParse', parseStart);
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

        // ════════════════════════════════════════════════════════════════
        // STEP 9: Verify chunk IDs (unchanged)
        // ════════════════════════════════════════════════════════════════
        const validChunkIds = new Set(contextChunks.map(r => r.id));
        if (parsedResult.explanation_segments && Array.isArray(parsedResult.explanation_segments)) {
            parsedResult.explanation_segments.forEach(segment => {
                if (!validChunkIds.has(segment.source_chunk_id)) {
                    segment.unverified = true;
                }
            });
        }

        // ════════════════════════════════════════════════════════════════
        // STEP 10: Asynchronously Store Practice Questions
        // ════════════════════════════════════════════════════════════════
        let practiceMeta = { available: false, count: 0 };

        if (parsedResult.status === 'answered' && classificationResult.classification === 'concept_question' && parsedResult.practice_questions && parsedResult.practice_questions.length > 0) {
            practiceMeta.available = true;
            practiceMeta.count = parsedResult.practice_questions.length;

            const { supabaseAdmin } = require('../lib/supabaseAdmin');
            const chunkId = contextChunks && contextChunks.length > 0 ? contextChunks[0].id : null;
            const targetSession = session_id && session_id !== 'untracked' ? session_id : null;

            // Fire and forget so we don't break the main chat response on failure
            if (supabaseAdmin) {
                Promise.all(parsedResult.practice_questions.map(pq => {
                    return supabaseAdmin.from('practice_questions').insert({
                        student_id,
                        session_id: targetSession,
                        chunk_id: chunkId,
                        subject: 'temporary-subject', // per requirements
                        question: pq.question,
                        concept: pq.concept,
                        hint_1: pq.hint_1,
                        hint_2: pq.hint_2,
                        status: 'pending'
                    });
                })).catch(e => {
                    console.error("Failed to asynchronously store practice questions:", e);
                });
            }
        }

        // Return combined JSON
        return await respondAndLog({
            status: parsedResult.status || "answered",
            ...(gapData || {}),
            is_coaching: shouldCoach,
            explanation_segments: parsedResult.explanation_segments || [],
            practice: practiceMeta,
            results: contextChunks
        });
    } catch (error) {
        console.error("Error in explain endpoint:", error);

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
