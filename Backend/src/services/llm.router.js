const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const OpenAI = require('openai');

// Initialize Gemini (Primary)
const geminiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(geminiKey);

// Initialize OpenRouter (Fallback)
const openRouterKey = process.env.OPENROUTER_API_KEY;
const openRouterFallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || 'openrouter/free';
let openai = null;
if (openRouterKey) {
    openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterKey,
        defaultHeaders: {
            "HTTP-Referer": "https://learning-app.local", // Required by OpenRouter rankers
            "X-Title": "AI Tutor S28",
        }
    });
}

// ------------------------------------------------------------------
// 1. SCHEMAS
// ------------------------------------------------------------------

const schemas = {
    "EXPLAIN": {
        gemini: {
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
                            source_chunk_id: { type: SchemaType.STRING, description: "The ID of the source chunk used, or 'none'." }
                        },
                        required: ["text", "source_chunk_id"]
                    }
                },
                practice_questions: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            question: { type: SchemaType.STRING, description: "The practice question text" },
                            concept: { type: SchemaType.STRING, description: "The core concept being tested" },
                            hint_1: { type: SchemaType.STRING, description: "A simple hint to guide the student" },
                            hint_2: { type: SchemaType.STRING, description: "A more detailed hint or conceptual clue" },
                            expected_answer: { type: SchemaType.STRING, description: "The ground truth factual answer / expected solution" }
                        },
                        required: ["question", "concept", "hint_1", "hint_2", "expected_answer"]
                    }
                }
            },
            required: ["status", "explanation_segments", "practice_questions"]
        },
        jsonSchema: {
            name: "explanation_response",
            schema: {
                type: "object",
                properties: {
                    status: { type: "string", description: "Must be 'answered' or 'insufficient_evidence'" },
                    message: { type: "string" },
                    explanation_segments: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                text: { type: "string" },
                                source_chunk_id: { type: "string" }
                            },
                            required: ["text", "source_chunk_id"],
                            additionalProperties: false
                        }
                    },
                    practice_questions: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                question: { type: "string" },
                                concept: { type: "string" },
                                hint_1: { type: "string" },
                                hint_2: { type: "string" },
                                expected_answer: { type: "string" }
                            },
                            required: ["question", "concept", "hint_1", "hint_2", "expected_answer"],
                            additionalProperties: false
                        }
                    }
                },
                required: ["status", "explanation_segments", "practice_questions"],
                additionalProperties: false
            }
        }
    },
    "EVALUATE": {
        gemini: {
            type: SchemaType.OBJECT,
            properties: {
                evaluation: { type: SchemaType.STRING, description: "Must be exactly 'correct', 'partial', or 'incorrect'" },
                reason: { type: SchemaType.STRING, description: "Brief explanation of the evaluation" }
            },
            required: ["evaluation", "reason"]
        },
        jsonSchema: {
            name: "evaluation_response",
            schema: {
                type: "object",
                properties: {
                    evaluation: { type: "string", description: "Must be exactly 'correct', 'partial', or 'incorrect'" },
                    reason: { type: "string" }
                },
                required: ["evaluation", "reason"],
                additionalProperties: false
            }
        }
    },
    "SOCRATIC": {
        gemini: {
            type: SchemaType.OBJECT,
            properties: {
                evaluation: { type: SchemaType.STRING, description: "Must be exactly 'correct', 'partial', or 'incorrect'" },
                message: { type: SchemaType.STRING, description: "The guiding question, or a confirmation of success. Do not state the final answer unless they just got it correct." }
            },
            required: ["evaluation", "message"]
        },
        jsonSchema: {
            name: "socratic_response",
            schema: {
                type: "object",
                properties: {
                    evaluation: { type: "string", description: "Must be exactly 'correct', 'partial', or 'incorrect'" },
                    message: { type: "string" }
                },
                required: ["evaluation", "message"],
                additionalProperties: false
            }
        }
    },
    "SUGGEST_GRADE": {
        gemini: {
            type: SchemaType.OBJECT,
            properties: {
                suggested_grade: { type: SchemaType.NUMBER, description: "Numeric grade score between 0 and 100" },
                feedback: { type: SchemaType.STRING, description: "Actionable, constructive feedback for the student" },
                strengths: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    description: "Key strengths identified in the student's submission"
                },
                areas_for_improvement: {
                    type: SchemaType.ARRAY,
                    items: { type: SchemaType.STRING },
                    description: "Specific areas where the student can improve"
                }
            },
            required: ["suggested_grade", "feedback"]
        },
        jsonSchema: {
            name: "suggest_grade_response",
            schema: {
                type: "object",
                properties: {
                    suggested_grade: { type: "number", description: "Numeric grade score between 0 and 100" },
                    feedback: { type: "string", description: "Constructive feedback text" },
                    strengths: {
                        type: "array",
                        items: { type: "string" }
                    },
                    areas_for_improvement: {
                        type: "array",
                        items: { type: "string" }
                    }
                },
                required: ["suggested_grade", "feedback"],
                additionalProperties: false
            }
        }
    },
    "TEACHER_COPILOT": {
        gemini: {
            type: SchemaType.OBJECT,
            properties: {
                answer: { type: SchemaType.STRING, description: "Conversational answer strictly grounded in data under 100 words." }
            },
            required: ["answer"]
        },
        jsonSchema: {
            name: "teacher_copilot_response",
            schema: {
                type: "object",
                properties: {
                    answer: { type: "string", description: "Conversational answer strictly grounded in data under 100 words." }
                },
                required: ["answer"],
                additionalProperties: false
            }
        }
    }
};

// ------------------------------------------------------------------
// 2. PROVIDERS
// ------------------------------------------------------------------

async function callGeminiPrimary(prompt, schemaName) {
    const start = Date.now();

    // Safety fallback for tests using fake gemini model string originally explicitly inside practice eval
    const modelString = 'gemini-3.5-flash';

    const config = schemas[schemaName].gemini;
    const model = genAI.getGenerativeModel({
        model: process.env.NODE_ENV === 'test' ? "gemini-3.5-flash" : modelString, // Mock overrides logic gracefully mapping tests
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: config
        }
    });

    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Gemini API Request Timeout")), 45000);
    });

    try {
        const result = await Promise.race([model.generateContent(prompt), timeoutPromise]);
        clearTimeout(timeoutId);
        const response = await result.response;
        console.log(`[LLM] Gemini success (${Date.now() - start}ms)`);
        return response.text();
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function callOpenRouterFallback(prompt, schemaName) {
    if (!openai) {
        throw new Error("OpenRouter API key is missing. Skipping fallback.");
    }

    const start = Date.now();
    const config = schemas[schemaName].jsonSchema;

    try {
        const structuralPrompt = prompt + "\n\nCRITICAL INSTRUCTION: You MUST return strictly valid JSON. Do not output any conversational text, markdown formatting, or preamble. Return ONLY a single raw JSON object matching the following structure exactly:\n" + JSON.stringify(config.schema, null, 2);

        const response = await openai.chat.completions.create({
            model: openRouterFallbackModel,
            messages: [{ role: "user", content: structuralPrompt }],
            response_format: {
                type: "json_object"
            }
        });

        console.log(`[LLM] OpenRouter success (${Date.now() - start}ms)`);

        let output = response.choices[0].message.content;

        // Aggressively extract JSON substring bypassing injected proxy text (e.g., User Safety blocks)
        const jsonMatch = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            output = jsonMatch[0];
        }
        return output;
    } catch (err) {
        console.error(`[LLM] OpenRouter fallback failed:`, err.message);
        throw err;
    }
}

// ------------------------------------------------------------------
// 3. ROUTER ABSTRACTION
// ------------------------------------------------------------------

async function generateWithFallback(prompt, schemaName) {
    // 1. Development Bypass override
    if (process.env.FORCE_LLM_FALLBACK === 'true') {
        console.log("[LLM] FORCE_LLM_FALLBACK is true. Bypassing Gemini.");
        return await callOpenRouterFallback(prompt, schemaName);
    }

    // 2. Primary Execution
    try {
        console.log("[LLM] Attempting Provider: Gemini");
        let output = await callGeminiPrimary(prompt, schemaName);

        // Globally extract JSON to bypass proxy injection warnings from cloud providers
        const jsonMatch = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            output = jsonMatch[0];
        }

        // Proactively test parse. If this throws, it seamlessly triggers fallback.
        JSON.parse(output);

        return output;
    } catch (geminiError) {
        let errStr = geminiError.toString() + (geminiError.message || "");
        console.error(`[LLM] Gemini failed (${errStr}). Falling back to OpenRouter...`);

        // 3. Sensible Exclusions (Do not retry if request itself is definitively broken)
        if (errStr.includes("400") && !errStr.includes("429")) {
            // E.g. prompt is maliciously large, bad schema configuration, etc.
            throw geminiError;
        }

        // 4. Fallback Execution
        try {
            console.log("[LLM] Attempting Provider: OpenRouter");
            let output = await callOpenRouterFallback(prompt, schemaName);
            const jsonMatch = output.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
            if (jsonMatch) output = jsonMatch[0];

            try {
                JSON.parse(output);
                return output;
            } catch (parseErr) {
                console.log("[LLM] OpenRouter returned malformed JSON. Attempting native repair...");
                let repaired = output;
                const openBraces = (repaired.match(/\{/g) || []).length;
                const closeBraces = (repaired.match(/\}/g) || []).length;
                const openBrackets = (repaired.match(/\[/g) || []).length;
                const closeBrackets = (repaired.match(/\]/g) || []).length;

                if (!repaired.endsWith('"') && !repaired.endsWith('}') && !repaired.endsWith(']')) {
                    repaired += '"';
                }
                for (let i = 0; i < (openBrackets - closeBrackets); i++) repaired += "]";
                for (let i = 0; i < (openBraces - closeBraces); i++) repaired += "}";

                // Test repair
                JSON.parse(repaired);
                console.log("[LLM] OpenRouter JSON successfully repaired.");
                return repaired;
            }
        } catch (fallbackError) {
            console.error("[LLM] Both Gemini and OpenRouter failed conclusively.");
            // Pass the original Gemini format up so existing logic blocks process the safe-fallbacks identically
            throw geminiError;
        }
    }
}

module.exports = {
    generateWithFallback
};
