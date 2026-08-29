const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONCEPTS_FILE = path.join(__dirname, 'temp_c4_concepts.json');

const writeFiles = (concepts) => {
    fs.writeFileSync(CONCEPTS_FILE, JSON.stringify(concepts));
};

const runScript = (mockVal = "SUCCESS") => {
    try {
        const out = execSync(`python python/prerequisite_graph.py ${CONCEPTS_FILE}`, {
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

describe('C4 Prerequisite Graph Logic', () => {
    afterAll(() => {
        if (fs.existsSync(CONCEPTS_FILE)) fs.unlinkSync(CONCEPTS_FILE);
    });

    test('Valid prerequisite logic maps accurately (SUCCESS)', () => {
        writeFiles({
            course: "TestCourse",
            concepts: [{ concept_id: "c0", name: "C0" }, { concept_id: "c1", name: "C1" }, { concept_id: "c2", name: "C2" }]
        });
        const res = runScript("SUCCESS");
        expect(res.relationships.length).toBe(2);
        expect(res.statistics.max_depth).toBe(3); // Route c0 -> c1 -> c2 
        expect(res.quality.status).toBe("healthy");
    });

    test('Rejects structurally isolated mapping traps safely (NO_OUTPUT)', () => {
        writeFiles({
            course: "Test",
            concepts: [{ concept_id: "c1", name: "C1" }, { concept_id: "c2", name: "C2" }]
        });
        const res = runScript("NO_OUTPUT");
        expect(res.relationship_count).toBe(0);
        // We have 2 isolated concepts. If there are >10 concepts, it gets flagged. But here there's <10.
        expect(res.quality.isolated_concepts).toBe(2);
    });

    test('Defends against LLM hallucinating items missing from C2 schema (HALLUCINATE)', () => {
        writeFiles({
            course: "Test",
            concepts: [{ concept_id: "c0", name: "C0" }, { concept_id: "c1", name: "C1" }]
        });
        const res = runScript("HALLUCINATE");
        // fake_1 mapping and fake_2 mapping will be wiped entirely.
        expect(res.relationships.length).toBe(0);
    });

    test('De-duplicates LLM reiterating edges aggressively keeping maximum confidence (DUPLICATE)', () => {
        writeFiles({
            course: "Test",
            concepts: [{ concept_id: "c0", name: "C0" }, { concept_id: "c1", name: "C1" }]
        });
        const res = runScript("DUPLICATE");
        expect(res.relationships.length).toBe(1);
        expect(res.relationships[0].confidence).toBe(0.95);
    });

    test('Silently rejects Self-Dependencies dynamically (SELF_DEP)', () => {
        writeFiles({ concepts: [{ concept_id: "c1", name: "C1" }] });
        const res = runScript("SELF_DEP");
        expect(res.relationships.length).toBe(0);
        expect(res.relationships).not.toContain(expect.objectContaining({ concept_id: "c1", prerequisite_id: "c1" }));
    });

    test('Cuts cycle nodes defensively preserving graph paths exactly (CYCLE)', () => {
        writeFiles({
            course: "Test",
            concepts: [{ concept_id: "c0", name: "C0" }, { concept_id: "c1", name: "C1" }, { concept_id: "c2", name: "C2" }]
        });
        const res = runScript("CYCLE");
        // Cycles are detected: c0 -> c1 -> c2 -> c0.
        // It deletes edge "c0 depends on c2" since confidence = 0.60
        expect(res.quality.cycles_detected).toBeGreaterThan(0);
        expect(res.quality.cycles_removed).toBeGreaterThan(0);
        expect(res.quality.warnings.map(w => w.code)).toContain("HIERARCHY_CYCLE");
        expect(res.relationships.length).toBe(2);

        // Assert DAG
        const edges = res.relationships.map(r => r.prerequisite_id + "->" + r.concept_id);
        expect(edges).toContain("c0->c1");
        expect(edges).toContain("c1->c2");
        expect(edges).not.toContain("c2->c0");
    });

    test('Cuts weak generic relationships scoring beneath 0.60 securely', () => {
        writeFiles({
            course: "Test",
            concepts: [{ concept_id: "c0", name: "C0" }, { concept_id: "c1", name: "C1" }, { concept_id: "c2", name: "C2" }]
        });
        const res = runScript("LOW_CONFIDENCE");
        // Drops both 0.40 and 0.20 relations
        expect(res.relationships.length).toBe(0);
    });
});
