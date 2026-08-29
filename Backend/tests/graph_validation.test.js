const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const C2_FILE = path.join(__dirname, 'temp_c2_v.json');
const C3_FILE = path.join(__dirname, 'temp_c3_v.json');
const C4_FILE = path.join(__dirname, 'temp_c4_v.json');

const writeFiles = (c2, c3, c4) => {
    fs.writeFileSync(C2_FILE, JSON.stringify(c2));
    fs.writeFileSync(C3_FILE, JSON.stringify(c3));
    fs.writeFileSync(C4_FILE, JSON.stringify(c4));
};

const runScript = (mockVal = "SUCCESS") => {
    try {
        const out = execSync(`python python/graph_validation.py ${C2_FILE} ${C3_FILE} ${C4_FILE}`, {
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

describe('C5 Graph Validation Logic', () => {
    afterAll(() => {
        if (fs.existsSync(C2_FILE)) fs.unlinkSync(C2_FILE);
        if (fs.existsSync(C3_FILE)) fs.unlinkSync(C3_FILE);
        if (fs.existsSync(C4_FILE)) fs.unlinkSync(C4_FILE);
    });

    test('Identifies healthy graphs and computes mathematical boundaries exactly (SUCCESS)', () => {
        writeFiles(
            { concepts: [{ concept_id: "c0" }, { concept_id: "c1" }, { concept_id: "c2" }] },
            {},
            { relationships: [{ prerequisite_id: "c0", concept_id: "c1" }, { prerequisite_id: "c1", concept_id: "c2" }] }
        );
        const res = runScript("SUCCESS");
        expect(res.summary.concept_count).toBe(3);
        expect(res.summary.relationship_count).toBe(2);
        expect(res.summary.max_depth).toBe(3);
        expect(res.summary.connected_components).toBe(1);
        expect(res.summary.coverage_ratio).toBe(1.0);
        expect(res.health.status).toBe("healthy");
    });

    test('Automatically assigns LOW_COVERAGE organically when graph dependencies dive beneath acceptable thresholds (EMPTY)', () => {
        writeFiles(
            { concepts: [{ concept_id: "1" }, { concept_id: "2" }, { concept_id: "3" }, { concept_id: "4" }] },
            {},
            { relationships: [] }
        );
        // EMPTY forces Gemini returning no assessments, exposing pure python metrics
        const res = runScript("EMPTY");

        // 4 items, 0 bonds = isolated graphs.
        expect(res.summary.coverage_ratio).toBe(0.0);
        expect(res.summary.connected_components).toBe(0);
        expect(res.health.status).toBe("needs_review");
        expect(res.health.warnings.map(w => w.code)).toContain("LOW_COVERAGE");
    });

    test('Incorporates LLM Semantic Assessments properly adhering safely exclusively mapping Schema (WARNINGS)', () => {
        writeFiles({ concepts: [] }, {}, { relationships: [] });
        const res = runScript("WARNINGS");

        expect(res.suspicious_roots[0].concept_id).toBe("c2");
        expect(res.isolated_concepts[0].status).toBe("POSSIBLY_MISSING_DEPENDENCY");
        expect(res.missing_intermediates[0].type).toBe("MISSING_INTERMEDIATE_CONCEPT");
        expect(res.conceptual_jumps[0].severity).toBe("HIGH");
        expect(res.high_connectivity[0].type).toBe("HIGH_CONNECTIVITY");
        expect(res.learning_paths[0].evaluation).toBe("Pedagogically ok");
        expect(res.recommendations.length).toBeGreaterThan(0);
    });

    test('Fails safely when downstream models collapse entirely (MALFORMED)', () => {
        writeFiles({ concepts: [{ concept_id: "1" }] }, {}, { relationships: [] });
        const res = runScript("MALFORMED");

        expect(res.summary.concept_count).toBe(1);
        expect(res.health.status).toBe("needs_review"); // Triggered via sparse density bounds mathematically
        // Evaluates without crashing NodeJS runner
    });
});
