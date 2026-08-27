const { execFile } = require("child_process");
const path = require("path");

// ============================================================
// PYTHON RETRIEVAL
// ============================================================

function runPythonRetrieval(question, courseName) {
    return new Promise((resolve, reject) => {
        console.log("\n==========================================");
        console.log("🚀 STARTING PYTHON RETRIEVAL");
        console.log("==========================================");

        const retrievalScript = path.join(
            __dirname,
            "../../python/retrieval.py"
        );

        console.log(
            "Retrieval script:",
            retrievalScript
        );

        console.log(
            "Question:",
            question
        );

        console.log(
            "Course:",
            courseName
        );

        execFile(
            "python",
            [
                retrievalScript,
                question,
                courseName
            ],
            {
                cwd: path.join(
                    __dirname,
                    "../.."
                ),
                encoding: "utf8",
                maxBuffer: 20 * 1024 * 1024,
                windowsHide: true,
                env: {
                    ...process.env,
                    PYTHONIOENCODING: "utf-8"
                }
            },
            (error, stdout, stderr) => {
                console.log(
                    "🐍 PYTHON PROCESS CALLBACK FIRED"
                );

                // ------------------------------------------------
                // PYTHON ERROR
                // ------------------------------------------------

                if (error) {
                    console.error(
                        "❌ Python retrieval failed:"
                    );

                    console.error(error);

                    console.error(
                        "Python stdout:",
                        stdout || "(empty)"
                    );

                    console.error(
                        "Python stderr:",
                        stderr || "(empty)"
                    );

                    return reject(
                        new Error(
                            stderr ||
                            error.message
                        )
                    );
                }

                // ------------------------------------------------
                // EMPTY OUTPUT
                // ------------------------------------------------

                if (
                    !stdout ||
                    !stdout.trim()
                ) {
                    console.error(
                        "❌ Retrieval returned empty output."
                    );

                    return reject(
                        new Error(
                            "Python retrieval returned empty output."
                        )
                    );
                }

                // ------------------------------------------------
                // PARSE JSON
                // ------------------------------------------------

                try {
                    const cleanOutput =
                        stdout
                            .replace(/^\uFEFF/, "")
                            .trim();

                    const result =
                        JSON.parse(
                            cleanOutput
                        );

                    console.log(
                        "✅ RETRIEVAL JSON PARSED"
                    );

                    // ------------------------------------------------
                    // PYTHON REPORTED ERROR
                    // ------------------------------------------------

                    if (
                        result.status === "error"
                    ) {
                        console.error(
                            "❌ Retrieval returned error:"
                        );

                        console.error(
                            result.error
                        );

                        return reject(
                            new Error(
                                result.error ||
                                "Retrieval failed."
                            )
                        );
                    }

                    // ------------------------------------------------
                    // OUT OF SYLLABUS
                    // ------------------------------------------------

                    if (
                        result.status ===
                        "course_not_approved"
                    ) {
                        console.log(
                            "🚫 Question is outside approved course material."
                        );

                        return resolve(
                            result
                        );
                    }

                    // ------------------------------------------------
                    // NORMAL RESULT
                    // ------------------------------------------------

                    console.log(
                        "Retrieved chunks:",
                        result.answer_context
                            ? result.answer_context.map(
                                chunk => chunk.id
                            )
                            : []
                    );

                    return resolve(
                        result
                    );

                } catch (parseError) {
                    console.error(
                        "❌ Failed to parse retrieval JSON."
                    );

                    console.error(
                        parseError
                    );

                    console.error(
                        "Raw Python stdout:"
                    );

                    console.error(
                        stdout
                    );

                    return reject(
                        new Error(
                            "Python retrieval returned invalid JSON."
                        )
                    );
                }
            }
        );
    });
}

// ============================================================
// QUESTION CLASSIFICATION
// ============================================================

function classifyQuestion(question) {
    const q =
        question
            .toLowerCase()
            .trim();

    // --------------------------------------------------------
    // Graded / direct-answer patterns
    // --------------------------------------------------------

    const gradedPatterns = [
        /solve\s+(this|the|question)/i,
        /give\s+me\s+the\s+answer/i,
        /what\s+is\s+the\s+answer/i,
        /write\s+the\s+answer/i,
        /complete\s+this/i,
        /do\s+this\s+question/i,
        /solve\s+this\s+problem/i,
        /answer\s+this/i
    ];

    const isGraded =
        gradedPatterns.some(
            pattern =>
                pattern.test(q)
        );

    const classification =
        isGraded
            ? "graded_work"
            : "concept_question";

    console.log(
        "--- Classification Audit ---"
    );

    console.log(
        "Question:",
        question
    );

    console.log(
        "Classification:",
        classification
    );

    console.log(
        "Reason:",
        isGraded
            ? "Graded-work pattern matched."
            : "No graded-work patterns matched."
    );

    console.log(
        "----------------------------"
    );

    return classification;
}

// ============================================================
// BUILD GEMINI CONTEXT
// ============================================================

function buildGeminiContext(
    retrievalResult
) {
    const chunks =
        retrievalResult.answer_context ||
        [];

    if (
        chunks.length === 0
    ) {
        return "";
    }

    return chunks
        .map(
            chunk => {
                return `
SOURCE CHUNK ID: ${chunk.id}

Topic:
${chunk.topic || ""}

Chapter:
${chunk.chapter || ""}

Section:
${chunk.section || ""}

Course Material:
${chunk.text || ""}
`;
            }
        )
        .join(
            "\n-------------------------\n"
        );
}

// ============================================================
// GEMINI
// ============================================================

async function callGemini(
    question,
    courseName,
    context,
    classification
) {
    const {
        GoogleGenerativeAI
    } = require("@google/generative-ai");

    const apiKey =
        process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error(
            "GEMINI_API_KEY is not configured."
        );
    }

    const genAI =
        new GoogleGenerativeAI(
            apiKey
        );

    const model =
        genAI.getGenerativeModel({
            model: "gemini-3.6-flash"
        });

    const prompt = `
You are an AI tutor.

Course:
${courseName}

The student asked:
${question}

Question classification:
${classification}

IMPORTANT RULES:

1. Answer ONLY using the approved course material below.

2. Do NOT use outside knowledge.

3. Do NOT invent facts.

4. Every explanation segment MUST have a valid
   source_chunk_id from the supplied course material.

5. If the material does not contain enough information,
   clearly say that the approved course material does not
   contain enough information.

6. Do not mention information that is not supported by
   the supplied course material.

Return ONLY valid JSON.

Required format:

{
    "status": "success",
    "explanation_segments": [
        {
            "text": "Explanation here",
            "source_chunk_id": "chunk_1"
        }
    ],
    "practice_questions": [
        "Question 1",
        "Question 2"
    ]
}

Approved course material:

${context}
`;

    console.log(
        "\n🤖 Calling Gemini..."
    );

    const response =
        await model.generateContent(
            prompt
        );

    const raw =
        response.response
            .text()
            .trim();

    console.log(
        "✅ Gemini response received"
    );

    console.log(
        "Raw Gemini response:",
        raw
    );

    return raw;
}

// ============================================================
// EXPLAIN CONTROLLER
// ============================================================

async function explain(req, res) {
    console.log(
        "\n🔥 EXPLAIN CONTROLLER WAS CALLED"
    );

    // ========================================================
    // STEP 1 — READ REQUEST
    // ========================================================

    console.log(
        "STEP 1 — Reading request"
    );

    const question =
        req.body.question
            ? req.body.question.trim()
            : "";

    const studentId =
        req.body.studentId ||
        "unknown";

    const courseName =
        req.body.courseName
            ? req.body.courseName.trim()
            : "";

    console.log(
        "Question:",
        question
    );

    console.log(
        "Student ID:",
        studentId
    );

    console.log(
        "Course:",
        courseName
    );

    // ========================================================
    // VALIDATION
    // ========================================================

    if (!question) {
        return res.status(400).json({
            status: "error",
            message:
                "Question is required."
        });
    }

    if (!courseName) {
        return res.status(400).json({
            status: "error",
            message:
                "Course is required."
        });
    }

    try {
        // ====================================================
        // STEP 2 — RETRIEVAL
        // ====================================================

        console.log(
            "STEP 4 — About to run Python retrieval"
        );

        const retrievalResult =
            await runPythonRetrieval(
                question,
                courseName
            );

        console.log(
            "✅ STEP 5 — Python retrieval completed"
        );

        // ====================================================
        // OUT-OF-SYLLABUS CHECK
        // ====================================================

        if (
            retrievalResult.status ===
            "course_not_approved"
        ) {
            console.log(
                "🚫 STOPPING REQUEST — OUTSIDE APPROVED COURSE"
            );

            return res.json({
                status:
                    "course_not_approved",

                message:
                    "This question is outside the approved course material.",

                explanation_segments: [],

                practice_questions: [],

                learning_path: []
            });
        }

        // ====================================================
        // GET CONTEXT CHUNKS
        // ====================================================

        const contextChunks =
            retrievalResult.answer_context ||
            [];

        console.log(
            "Context chunks:",
            contextChunks.map(
                chunk => chunk.id
            )
        );

        // ====================================================
        // SECOND SAFETY CHECK
        // ====================================================

        if (
            contextChunks.length === 0
        ) {
            console.log(
                "🚫 No approved material found."
            );

            return res.json({
                status:
                    "course_not_approved",

                message:
                    "This question is outside the approved course material.",

                explanation_segments: [],

                practice_questions: [],

                learning_path: []
            });
        }

        // ====================================================
        // STEP 6 — CLASSIFICATION
        // ====================================================

        console.log(
            "STEP 6 — Classifying question"
        );

        const classification =
            classifyQuestion(
                question
            );

        // ====================================================
        // STEP 7 — BUILD GEMINI CONTEXT
        // ====================================================

        console.log(
            "STEP 7 — Building Gemini context"
        );

        const context =
            buildGeminiContext(
                retrievalResult
            );

        console.log(
            "Context length:",
            context.length
        );

        // ====================================================
        // STEP 8 — SEND TO GEMINI
        // ====================================================

        console.log(
            "STEP 8 — Sending request to Gemini"
        );

        let geminiRaw;

        let geminiSuccess =
            false;

        let lastError =
            null;

        // Retry twice
        for (
            let attempt = 1;
            attempt <= 2;
            attempt++
        ) {
            try {
                console.log(
                    `Gemini attempt ${attempt}/2`
                );

                geminiRaw =
                    await callGemini(
                        question,
                        courseName,
                        context,
                        classification
                    );

                geminiSuccess =
                    true;

                break;

            } catch (geminiError) {
                lastError =
                    geminiError;

                console.error(
                    `❌ Gemini attempt ${attempt} failed:`,
                    geminiError
                );

                if (
                    attempt < 2
                ) {
                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                1000
                            )
                    );
                }
            }
        }

        // ====================================================
        // GEMINI FAILED
        // ====================================================

        if (!geminiSuccess) {
            throw new Error(
                lastError
                    ? lastError.message
                    : "Gemini request failed."
            );
        }

        // ====================================================
        // STEP 9 — PARSE GEMINI JSON
        // ====================================================

        let geminiResult;

        try {
            let cleanResponse =
                geminiRaw
                    .replace(
                        /^\uFEFF/,
                        ""
                    )
                    .trim();

            // Remove ```json
            cleanResponse =
                cleanResponse.replace(
                    /^```json\s*/i,
                    ""
                );

            // Remove ```
            cleanResponse =
                cleanResponse.replace(
                    /^```\s*/,
                    ""
                );

            cleanResponse =
                cleanResponse.replace(
                    /\s*```$/,
                    ""
                );

            cleanResponse =
                cleanResponse.trim();

            geminiResult =
                JSON.parse(
                    cleanResponse
                );

            console.log(
                "✅ Gemini JSON parsed"
            );

        } catch (parseError) {
            console.error(
                "❌ Gemini JSON parse failed"
            );

            console.error(
                parseError
            );

            console.error(
                "Gemini raw response:",
                geminiRaw
            );

            throw new Error(
                "Gemini returned invalid JSON."
            );
        }

        // ====================================================
        // VALIDATE GEMINI RESPONSE
        // ====================================================

        if (
            !geminiResult ||
            typeof geminiResult !== "object"
        ) {
            throw new Error(
                "Gemini returned an invalid response."
            );
        }

        if (
            !Array.isArray(
                geminiResult.explanation_segments
            )
        ) {
            geminiResult.explanation_segments =
                [];
        }

        if (
            !Array.isArray(
                geminiResult.practice_questions
            )
        ) {
            geminiResult.practice_questions =
                [];
        }

        // ====================================================
        // VALIDATE SOURCE CHUNK IDS
        // ====================================================

        const validChunkIds =
            new Set(
                contextChunks.map(
                    chunk => chunk.id
                )
            );

        geminiResult.explanation_segments =
            geminiResult.explanation_segments
                .filter(
                    segment => {
                        if (
                            !segment ||
                            typeof segment !==
                            "object"
                        ) {
                            return false;
                        }

                        if (
                            !segment.text
                        ) {
                            return false;
                        }

                        /*
                         * Prevent Gemini from citing a chunk
                         * that wasn't actually retrieved.
                         */

                        if (
                            segment.source_chunk_id &&
                            !validChunkIds.has(
                                segment.source_chunk_id
                            )
                        ) {
                            console.warn(
                                "⚠️ Invalid source chunk:",
                                segment.source_chunk_id
                            );

                            return false;
                        }

                        return true;
                    }
                );

        // ====================================================
        // STEP 10 — SEND RESPONSE
        // ====================================================

        console.log(
            "STEP 9 — Sending response to frontend"
        );

        return res.json({
            status:
                "success",

            course:
                courseName,

            question:
                question,

            classification:
                classification,

            explanation_segments:
                geminiResult.explanation_segments,

            practice_questions:
                geminiResult.practice_questions,

            learning_path:
                retrievalResult.learning_path ||
                [],

            source_chunks:
                contextChunks.map(
                    chunk => ({
                        id:
                            chunk.id,

                        topic:
                            chunk.topic,

                        section:
                            chunk.section,

                        page_start:
                            chunk.page_start,

                        page_end:
                            chunk.page_end
                    })
                )
        });

    } catch (error) {
        // ====================================================
        // GLOBAL ERROR HANDLER
        // ====================================================

        console.error(
            "\n❌ ERROR IN EXPLAIN CONTROLLER"
        );

        console.error(
            error
        );

        return res.status(
            500
        ).json({
            status:
                "error",

            message:
                error.message ||
                "Internal server error."
        });
    }
}

// ============================================================
// EXPORT
// ============================================================

module.exports = {
    explain
};