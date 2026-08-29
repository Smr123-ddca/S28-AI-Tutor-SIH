const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const C2_FILE = path.join(__dirname, 'temp_c6_2.json');
const C3_FILE = path.join(__dirname, 'temp_c6_3.json');
const C4_FILE = path.join(__dirname, 'temp_c6_4.json');
const C5_FILE = path.join(__dirname, 'temp_c6_5.json');

const writeFiles = (c2, c3, c4, c5) => {
    fs.writeFileSync(C2_FILE, JSON.stringify(c2));
    fs.writeFileSync(C3_FILE, JSON.stringify(c3));
    fs.writeFileSync(C4_FILE, JSON.stringify(c4));
    fs.writeFileSync(C5_FILE, JSON.stringify(c5));
};

const runScript = (mockVal = "SUCCESS") => {
    try {
        const out = execSync(`python python/study_plan.py ${C2_FILE} ${C3_FILE} ${C4_FILE} ${C5_FILE}`, {
            env: { ...process.env, _MOCK_BEHAVIOR: mockVal },
            encoding: 'utf8'
        });
        return JSON.parse(out);
    } catch (e) {
        if (e.stdout) {
            console.log(e.stdout.toString());
            try { return JSON.parse(e.stdout.toString()); } catch (err) { }
        }
        return { error: e.message };
    }
};

describe('C6 Study Plan Generator', () => {
    afterAll(() => {
        if (fs.existsSync(C2_FILE)) fs.unlinkSync(C2_FILE);
        if (fs.existsSync(C3_FILE)) fs.unlinkSync(C3_FILE);
        if (fs.existsSync(C4_FILE)) fs.unlinkSync(C4_FILE);
        if (fs.existsSync(C5_FILE)) fs.unlinkSync(C5_FILE);
    });

    test('Validates complete grouped curriculum structures maintaining chronological boundaries dynamically (SUCCESS)', () => {
        writeFiles(
            { concepts: [{ concept_id: "c0", evidence_chunks: ["chunkA"] }, { concept_id: "c1" }, { concept_id: "c2" }] },
            {},
            { relationships: [{ prerequisite_id: "c1", concept_id: "c2" }] }, // c1 -> c2 
            { health: { status: "healthy", warnings: [] } }
        );
        const res = runScript("SUCCESS");
        // SUCCESS Mock puts Unit 1 = [c0, c1]. Unit 2 = [c2].
        // So Unit 1 owns c1, Unit 2 owns c2. Because c1 -> c2 exists organically, Unit 2 depends on Unit 1 algebraically.
        expect(res.units.length).toBe(2);
        const u2 = res.units.find(u => u.title === "Unit 2");
        const u1 = res.units.find(u => u.title === "Unit 1");

        expect(u2.prerequisite_unit_ids).toContain(u1.unit_id);
        expect(u2.order).toBeGreaterThan(u1.order);
        expect(u1.source_chunk_ids).toContain("chunkA");
    });

    test('Assigns orphaned fallback assignments capturing completely unmapped nodes predictably (MISSING_CONCEPTS)', () => {
        writeFiles(
            { concepts: [{ concept_id: "c0" }, { concept_id: "c1", evidence_chunks: ["chunkB"] }] },
            {},
            { relationships: [] },
            { health: {} }
        );
        const res = runScript("MISSING_CONCEPTS");
        // MISSING_CONCEPTS mock ONLY groups c0. It drops c1 dynamically!
        // The script MUST catch this identically forcing c1 into Unit_999 gracefully.

        const fallback = res.units.find(u => u.unit_id === "unit_999");
        expect(fallback).toBeDefined();
        expect(fallback.concept_ids).toContain("c1");
        expect(fallback.source_chunk_ids).toContain("chunkB");
    });

    test('Safely scrubs and rejects hallucinated node arrays blocking corrupt limits mathematically (HALLUCINATE)', () => {
        writeFiles(
            { concepts: [{ concept_id: "c0" }, { concept_id: "c2" }] },
            {},
            { relationships: [] },
            { health: {} }
        );
        const res = runScript("HALLUCINATE");
        // Mock injects fake1, fake2 inside unit boundary 1 dynamically explicitly.
        const u1 = res.units.find(u => u.title === "Unit 1");
        expect(u1.concept_ids).toContain("c0");
        expect(u1.concept_ids).not.toContain("fake1"); // Stripped!
    });

    test('Handles organically constructed cyclic nodes by splitting edges mathematically maintaining DAG logic (UNIT_CYCLE)', () => {
        // UNIT_CYCLE Mock maps c0->U1, c1->U2, c2->U3 structurally.
        writeFiles(
            { concepts: [{ concept_id: "c0" }, { concept_id: "c1" }, { concept_id: "c2" }] },
            {},
            // C4 array forces c0->c1, c1->c2, c2->c0 mathematically simulating a pipeline cycle explicitly overriding dependencies intelligently natively
            {
                relationships: [
                    { prerequisite_id: "c0", concept_id: "c1" },
                    { prerequisite_id: "c1", concept_id: "c2" },
                    { prerequisite_id: "c2", concept_id: "c0" }
                ]
            },
            { health: {} }
        );
        const res = runScript("UNIT_CYCLE");
        // Must topological sort exactly correctly breaking 1 edge algorithmically!
        expect(res.units.length).toBe(3);
        // Assert sorting is structurally strict globally
        const orders = res.units.map(u => u.order);
        expect(orders).toEqual([1, 2, 3]);
    });

    test('Propagates C5 warnings transparently into output dynamically', () => {
        writeFiles({ concepts: [{ concept_id: "c0" }] }, {}, { relationships: [] }, { health: { status: "needs_review", warnings: [] } });
        const res = runScript("SUCCESS");
        expect(res.graph_status).toBe("needs_review");
        expect(res.warnings[0].type).toBe("C5_NEEDS_REVIEW");
    });
});
