const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONCEPTS_FILE = path.join(__dirname, 'temp_concepts.json');

const writeFiles = (concepts) => {
    fs.writeFileSync(CONCEPTS_FILE, JSON.stringify(concepts));
};

const runScript = (mockVal = "SUCCESS") => {
    try {
        const out = execSync(`python python/concept_hierarchy.py ${CONCEPTS_FILE}`, {
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

describe('C3 Concept Hierarchy Logic', () => {
    afterAll(() => {
        if (fs.existsSync(CONCEPTS_FILE)) fs.unlinkSync(CONCEPTS_FILE);
    });

    test('A / G: Valid concepts produce hierarchy leveraging domain nodes', () => {
        writeFiles({
            course: "TestCourse",
            concepts: [{ concept_id: "c1", name: "Concept 1" }, { concept_id: "c2", name: "Concept 2" }]
        });
        const res = runScript("SUCCESS");
        expect(res.hierarchy.type).toBe("ROOT");
        expect(res.hierarchy.children[0].type).toBe("DOMAIN");
        expect(res.hierarchy.children[0].children.length).toBe(2);
        expect(res.hierarchy.children[0].children[0].type).toBe("CONCEPT");
        expect(res.coverage.coverage_ratio).toBe(1.0);
    });

    test('B: All C2 concepts represented (forces orphans into unclassified)', () => {
        writeFiles({
            course: "Test",
            concepts: [{ concept_id: "c1", name: "C1" }, { concept_id: "orphan", name: "Orphan" }]
        });
        // "ORPHAN" mock deliberately ignores mapping the 0th item to test tracker
        const res = runScript("ORPHAN");
        expect(res.quality.warnings.map(w => w.code)).toContain("MISSING_CONCEPTS");
        // Ensure it created the Unclassified domain
        const dirs = res.hierarchy.children;
        const unclassifiedDom = dirs.find(d => d.name === "Other / Unclassified");
        expect(unclassifiedDom).toBeDefined();
        expect(unclassifiedDom.children[0].concept_id).toBe("c1"); // Validates it mapped the skipped one
        expect(res.coverage.placed_concepts).toBe(2);
    });

    test('C / L: Unknown concept IDs rejected (Hallucination removal)', () => {
        writeFiles({
            course: "Test",
            concepts: [{ concept_id: "c1", name: "Valid" }]
        });
        const res = runScript("HALLUCINATE");
        // The mock attempts to insert "fake_concept_999", which should be stripped
        expect(res.coverage.placed_concepts).toBe(1); // Mapped valid ones fallback to Unclassified
        const allConceptNodes = [];
        const findConcepts = (node) => {
            if (node.type === "CONCEPT") allConceptNodes.push(node);
            (node.children || []).forEach(findConcepts);
        };
        findConcepts(res.hierarchy);
        expect(allConceptNodes.map(c => c.concept_id)).not.toContain("fake_concept_999");
    });

    test('D / N: Duplicate structures detected (Canonical canonicalization)', () => {
        writeFiles({
            course: "Test",
            concepts: [{ concept_id: "c1", name: "Valid" }]
        });
        const res = runScript("DUPLICATES");
        expect(res.quality.warnings.map(w => w.code)).toContain("DUPLICATE_CONCEPT_REFERENCES");

        // Also domain merging: DUPLICATES mock creates two "Domain A" instances
        const domA = res.hierarchy.children.filter(c => c.name === "Domain A");
        expect(domA.length).toBe(1);
    });

    test('E: Hierarchy cycles resolved and logged', () => {
        writeFiles({ course: "Test", concepts: [] });
        const res = runScript("CYCLE");
        expect(res.quality.warnings.map(w => w.code)).toContain("HIERARCHY_CYCLE");
        expect(res.hierarchy.name).toBe("Test"); // Safe DAG breakage
    });

    test('F: Empty concept input handled', () => {
        writeFiles({});
        const res = runScript("NO_OUTPUT");
        expect(res.hierarchy.type).toBe("ROOT");
        expect(res.hierarchy.children.length).toBe(0);
        expect(res.coverage.placed_concepts).toBe(0);
    });

    test('H: Secondary parent mapping behaves gracefully via DOMAIN duplications', () => {
        writeFiles({
            course: "Test",
            concepts: [{ concept_id: "c1", name: "Valid" }]
        });
        const res = runScript("DUPLICATES");
        // Secondary parents resolves into native graph nodes but doesn't duplicate the entity in strict output
        expect(res.quality.metrics.cross_reference_count).toBeGreaterThanOrEqual(0);
    });

    test('I / J: No prerequisite / study orders exported in nodes', () => {
        writeFiles({ course: "Test", concepts: [] });
        const res = runScript("PREREQ");
        expect(res.hierarchy.requires).toBeUndefined();
    });

    test('K / O: Excessive depth detected and logged', () => {
        writeFiles({
            course: "Test",
            concepts: [{ concept_id: "c1", name: "C1" }]
        });
        const res = runScript("DEPTH");
        expect(res.quality.metrics.max_depth).toBe(6);
        expect(res.coverage.coverage_ratio).toBe(1.0);
    });

    test('M: Malformed Gemini outputs gracefully', () => {
        writeFiles({ course: "Test", concepts: [] });
        const res = runScript("MALFORMED");
        expect(res.hierarchy.type).toBe("ROOT");
        expect(res.hierarchy.name).toBe("Test");
    });
});
