const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHUNKS_FILE = path.join(__dirname, 'temp_chunks.json');
const QUALITY_FILE = path.join(__dirname, 'temp_quality.json');

const writeFiles = (chunks, quality) => {
    fs.writeFileSync(CHUNKS_FILE, JSON.stringify(chunks));
    fs.writeFileSync(QUALITY_FILE, JSON.stringify(quality));
};

const runScript = (mockVal = "SUCCESS") => {
    try {
        const out = execSync(`python python/concept_extraction.py ${CHUNKS_FILE} ${QUALITY_FILE}`, {
            env: { ...process.env, _MOCK_BEHAVIOR: mockVal },
            encoding: 'utf8'
        });
        return JSON.parse(out);
    } catch (e) {
        if (e.stdout) {
            try { return JSON.parse(e.stdout.toString()); } catch (err) { }
        }
        return { error: 'Execution failed', details: e.stderr?.toString() };
    }
};

describe('C2 Concept Extraction Logic', () => {
    afterAll(() => {
        if (fs.existsSync(CHUNKS_FILE)) fs.unlinkSync(CHUNKS_FILE);
        if (fs.existsSync(QUALITY_FILE)) fs.unlinkSync(QUALITY_FILE);
    });

    test('A. Single chunk -> single concept', () => {
        writeFiles(
            [{ id: "c1", text: "Binary search algorithm is fast." }],
            { course: "TestCourse", chunks: [{ chunk_id: "c1", classification: "CORE_CONCEPT", include_for_concept_extraction: true }] }
        );
        const res = runScript("SUCCESS");
        expect(res.concept_count).toBe(1);
        expect(res.concepts[0].name).toBe("Binary Search");
        expect(res.concepts[0].evidence[0].classification).toBe("CORE_CONCEPT");
    });

    test('B. Single chunk -> multiple concepts', () => {
        writeFiles(
            [{ id: "c1", text: "Multiconcept text." }],
            { course: "Test", chunks: [{ chunk_id: "c1", classification: "EXPLANATION", include_for_concept_extraction: true }] }
        );
        const res = runScript("SINGLE_TO_MULTI");
        expect(res.concept_count).toBe(2);
        expect(res.concepts[0].name).toContain("Concept_1");
        expect(res.concepts[1].name).toContain("Concept_2");
    });

    test('C. Chunk -> zero concepts', () => {
        writeFiles(
            [{ id: "c1", text: "Random content." }],
            { course: "Test", chunks: [{ chunk_id: "c1", classification: "CORE_CONCEPT", include_for_concept_extraction: true }] }
        );
        const res = runScript("NO_CONCEPTS");
        expect(res.concept_count).toBe(0);
        expect(res.quality.warnings[0].code).toBe("NO_CONCEPTS_EXTRACTED");
    });

    test('D & F. Multiple chunks describing the same concept -> deduplicated, evidence merged', () => {
        writeFiles(
            [
                { id: "c1", text: "Duplicate text." },
                { id: "c2", text: "Duplicate text." }
            ],
            {
                course: "Test", chunks: [
                    { chunk_id: "c1", classification: "DEFINITION", include_for_concept_extraction: true },
                    { chunk_id: "c2", classification: "EXPLANATION", include_for_concept_extraction: true }
                ]
            }
        );
        const res = runScript("MERGE");
        expect(res.concept_count).toBe(1); // One concept
        expect(res.concepts[0].name).toBe("Duplicate Concept");
        expect(res.concepts[0].evidence_count).toBe(2); // Two chunks merged
    });

    test('E. Related but distinct concepts remain separate', () => {
        // "Binary Search" vs "Linked List"
        writeFiles(
            [
                { id: "c1", text: "Binary search." },
                { id: "c2", text: "Linked list." }
            ],
            {
                course: "Test", chunks: [
                    { chunk_id: "c1", classification: "CORE_CONCEPT", include_for_concept_extraction: true },
                    { chunk_id: "c2", classification: "CORE_CONCEPT", include_for_concept_extraction: true }
                ]
            }
        );
        const res = runScript("SUCCESS");
        expect(res.concept_count).toBe(2);
        expect(res.concepts.map(c => c.name)).toContain("Binary Search");
        expect(res.concepts.map(c => c.name)).toContain("Linked List");
    });

    test('G. Unknown evidence chunk IDs are rejected', () => {
        writeFiles(
            [{ id: "c1", text: "Valid chunk." }],
            { course: "Test", chunks: [{ chunk_id: "c1", classification: "CORE_CONCEPT", include_for_concept_extraction: true }] }
        );
        const res = runScript("INVALID_ID");
        // Concept claims an invalid chunk ID. The python script should throw it out.
        expect(res.concept_count).toBe(0);
    });

    test('H & I. Confidence bounds are enforced and duplicate concepts merge securely', () => {
        // Validation of bounds happens inherently due to float_clamp logic
        // We evaluate merging here mostly
        writeFiles(
            [
                { id: "c1", text: "Binary search." },
                { id: "c2", text: "Binary search." }
            ],
            {
                course: "Test", chunks: [
                    { chunk_id: "c1", classification: "CORE_CONCEPT", include_for_concept_extraction: true },
                    { chunk_id: "c2", classification: "CORE_CONCEPT", include_for_concept_extraction: true }
                ]
            }
        );
        const res = runScript("SUCCESS");
        expect(res.concept_count).toBe(1); // It normalized both "Binary search." -> "Binary Search"
        // Since conf maxes at 1.0 conventionally
        expect(res.concepts[0].confidence).toBeLessThanOrEqual(1.0);
        expect(res.concepts[0].confidence).toBeGreaterThanOrEqual(0.0);
    });

    test('J. Malformed Gemini output robust fallback', () => {
        writeFiles(
            [{ id: "c1", text: "Data" }],
            { course: "Test", chunks: [{ chunk_id: "c1", classification: "CORE_CONCEPT", include_for_concept_extraction: true }] }
        );
        const res = runScript("MALFORMED");
        expect(res.concept_count).toBe(0);
        expect(res.quality.warnings[0].code).toBe("NO_CONCEPTS_EXTRACTED");
    });

    test('K. Metadata/navigation chunks ignored entirely by filtering', () => {
        writeFiles(
            [{ id: "c1", text: "Metadata section" }],
            { course: "Test", chunks: [{ chunk_id: "c1", classification: "METADATA", include_for_concept_extraction: false }] }
        );
        const res = runScript("SUCCESS");
        expect(res.eligible_chunks).toBe(0); // Never reached Gemini
        expect(res.concept_count).toBe(0);
    });

    test('L. Code chunks can provide conceptual evidence distinctly', () => {
        writeFiles(
            [{ id: "c1", text: "def main():" }],
            { course: "Test", chunks: [{ chunk_id: "c1", classification: "CODE", include_for_concept_extraction: true }] }
        );
        const res = runScript("SUCCESS");
        expect(res.concepts[0].evidence[0].classification).toBe("CODE");
    });

    test('M. Exercises can provide evidence for concept', () => {
        writeFiles(
            [{ id: "c1", text: "Question 1:" }],
            { course: "Test", chunks: [{ chunk_id: "c1", classification: "EXERCISE", include_for_concept_extraction: true }] }
        );
        const res = runScript("SUCCESS");
        expect(res.concepts[0].evidence[0].classification).toBe("EXERCISE");
    });

    test('N. Empty input handles safely', () => {
        writeFiles([], { course: "Test", chunks: [] });
        const res = runScript("SUCCESS");
        expect(res.source_chunks).toBe(0);
        expect(res.concept_count).toBe(0);
    });

    test('O. Conceptual collapse outputs warning accurately', () => {
        // Feed 15 items but have them strictly merge into "Everything Concept"
        const chunks = Array(15).fill().map((_, i) => ({ id: `c${i}`, text: `Collapse body ${i}` }));
        const quality = { course: "Test", chunks: chunks.map(c => ({ chunk_id: c.id, classification: "CORE_CONCEPT", include_for_concept_extraction: true })) };
        writeFiles(chunks, quality);
        const res = runScript("COLLAPSE");
        expect(res.concept_count).toBe(1);
        expect(res.quality.warnings.map(w => w.code)).toContain("CONCEPTUAL_COLLAPSE");
    });
});
