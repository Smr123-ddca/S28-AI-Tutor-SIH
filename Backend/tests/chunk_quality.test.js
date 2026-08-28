const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PYTHON_SCRIPT = path.join(__dirname, '../python/chunk_quality.py');
const TEMP_DIR = path.join(__dirname, 'temp_test_data');

beforeAll(() => {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR);
    }
});

afterAll(() => {
    if (fs.existsSync(TEMP_DIR)) {
        fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
});

function runPython(inputData, mockBehavior = "SUCCESS") {
    const tempFile = path.join(TEMP_DIR, `test_chunks_${Date.now()}_${Math.random()}.json`);
    fs.writeFileSync(tempFile, JSON.stringify(inputData));
    try {
        const env = { ...process.env, _MOCK_BEHAVIOR: mockBehavior };
        const output = execSync(`python "${PYTHON_SCRIPT}" "${tempFile}"`, { env, encoding: 'utf-8' });
        fs.unlinkSync(tempFile);
        return JSON.parse(output.trim());
    } catch (err) {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
        if (err.stdout) console.error("STDOUT:", err.stdout);
        if (err.stderr) console.error("STDERR:", err.stderr);
        throw err;
    }
}

describe('Chunk Educational Value & Quality Assessment (C1)', () => {

    test('Test A — Core concept is included and correctly classified', () => {
        const input = [{ id: "chunk_A", topic: "Test", text: "This explains important dynamic programming concepts." }];
        const result = runPython(input, "SUCCESS");
        expect(result.chunks[0].classification).toBe('CORE_CONCEPT');
        expect(result.chunks[0].include_for_concept_extraction).toBe(true);
    });

    test('Test B — Metadata is identified and excluded', () => {
        const input = [{ id: "chunk_B", topic: "Test", text: "Copyright 2026 Publisher XYZ" }];
        const result = runPython(input, "SUCCESS");
        expect(result.chunks[0].classification).toBe('METADATA');
        expect(result.chunks[0].include_for_concept_extraction).toBe(false);
    });

    test('Test C — Navigation is identified as navigation and excluded', () => {
        const input = [{ id: "chunk_C", topic: "Test", text: "Table of Contents - Chapter 1" }];
        const result = runPython(input, "SUCCESS");
        expect(result.chunks[0].classification).toBe('NAVIGATION');
        expect(result.chunks[0].include_for_concept_extraction).toBe(false);
    });

    test('Test D — Noise is excluded', () => {
        const input = [{ id: "chunk_D", topic: "Test", text: "gibberish asdf qwerty" }];
        const result = runPython(input, "SUCCESS");
        expect(result.chunks[0].classification).toBe('NOISE');
        expect(result.chunks[0].include_for_concept_extraction).toBe(false);
    });

    test('Test E — Definition receives appropriate classification', () => {
        const input = [{ id: "chunk_E", topic: "Test", text: "Definition: An array is a contiguous block of memory." }];
        const result = runPython(input, "SUCCESS");
        expect(result.chunks[0].classification).toBe('DEFINITION');
    });

    test('Test F — Procedure is classified appropriately', () => {
        const input = [{ id: "chunk_F", topic: "Test", text: "Step 1: Initialize the array. Step 2..." }];
        const result = runPython(input, "SUCCESS");
        expect(result.chunks[0].classification).toBe('PROCEDURE');
    });

    test('Test G — Code is recognized and preserved', () => {
        const input = [{ id: "chunk_G", topic: "Test", text: "def main(): print('Hello World')" }];
        const result = runPython(input, "SUCCESS");
        expect(result.chunks[0].classification).toBe('CODE');
        expect(result.chunks[0].include_for_concept_extraction).toBe(true);
    });

    test('Test H — Exercise is retained', () => {
        const input = [{ id: "chunk_H", topic: "Test", text: "question 1: What is the Big O of linear search?" }];
        const result = runPython(input, "SUCCESS");
        expect(result.chunks[0].classification).toBe('EXERCISE');
        expect(result.chunks[0].include_for_concept_extraction).toBe(true);
    });

    test('Test I — Score bounds (0.0 to 1.0)', () => {
        const input = [{ id: "chunk_I", topic: "Test", text: "Some normal text" }];
        const result = runPython(input, "SUCCESS");
        const chunk = result.chunks[0];
        const scores = [chunk.educational_value, chunk.conceptual_density, chunk.prerequisite_relevance, chunk.noise_score];
        scores.forEach(s => {
            expect(typeof s).toBe('number');
            expect(s).toBeGreaterThanOrEqual(0.0);
            expect(s).toBeLessThanOrEqual(1.0);
        });
    });

    test('Test J — Invalid LLM output handled safely', () => {
        const input = [{ id: "chunk_J", topic: "Test", text: "Will cause malformed python parse" }];
        const result = runPython(input, "MALFORMED");
        expect(result.chunks.length).toBe(1);
        expect(result.chunks[0].classification).toBe('NOISE');
    });

    test('Test K — Duplicate chunk IDs detected', () => {
        const input = [
            { id: "same_id", text: "First one" },
            { id: "same_id", text: "Second one" },
            { id: "other_id", text: "Third one" }
        ];
        const result = runPython(input, "SUCCESS");
        expect(result.evaluated_chunks).toBe(2);
        const dupWarning = result.quality.warnings.find(w => w.code === 'DUPLICATE_IDS');
        expect(dupWarning).toBeDefined();
    });

    test('Test L — Missing chunk IDs detected', () => {
        const input = [
            { text: "No ID provided" }
        ];
        const result = runPython(input, "SUCCESS");
        expect(result.evaluated_chunks).toBe(1);
        expect(result.quality.warnings.find(w => w.code === 'MISSING_IDS')).toBeDefined();
    });

    test('Test M — Empty input produces controlled result', () => {
        const result = runPython([], "SUCCESS");
        expect(result.evaluated_chunks).toBe(0);
        expect(result.quality.status).toBe('warning');
        expect(result.quality.warnings.find(w => w.code === 'NO_CHUNKS')).toBeDefined();
    });

    test('Test N — Classification collapse', () => {
        const input = Array(15).fill({}).map((_, i) => ({ id: `chunk_${i}`, text: `collapse text ${i}` }));
        const result = runPython(input, "COLLAPSE");
        const collapseWarning = result.quality.warnings.find(w => w.code === 'CLASSIFICATION_COLLAPSE');
        expect(collapseWarning).toBeDefined();
    });

    test('Test O — Large dataset', () => {
        const input = Array(120).fill({}).map((_, i) => {
            return { id: `chunk_large_${i}`, text: `Sample text for large chunk ${i}. copyright for metadata.` };
        });
        const result = runPython(input, "SUCCESS");
        expect(result.evaluated_chunks).toBe(120);
        expect(result.chunks.length).toBe(120);
        expect(result.quality.warnings.find(w => w.code === 'EXCESSIVE_METADATA')).toBeDefined();
    });

});
