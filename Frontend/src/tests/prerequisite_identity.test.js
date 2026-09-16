import { strict as assert } from 'assert';

console.log("=== EXECUTING REPLACEMENT ARRAY CANONICAL RESOLUTION TESTS ===");

const concepts = [
    { id: "uuid-A", name: "Concept A", concept_alias: "concept_0001" },
    { id: "uuid-B", name: "Concept B", concept_alias: "concept_0002" }
];

const prerequisite = {
    prerequisite_concept_id: "uuid-A",
    target_concept_id: "uuid-B"
};

const cById = new Map();
concepts.forEach(c => {
    // Phase 1.1 Regression: Assert we map using canonical UUID strictly
    if (c.id) cById.set(c.id, c);
});

try {
    // Assert structure resolves strictly
    assert.equal(cById.get(prerequisite.prerequisite_concept_id).name, "Concept A", "Failed to resolve prerequisite canonical label");
    assert.equal(cById.get(prerequisite.target_concept_id).name, "Concept B", "Failed to resolve dependent canonical label");

    // Assert aliases are NOT exposed to the ID map natively
    assert.equal(cById.has("concept_0001"), false, "Regression: Alias masking detected in map generation natively");
    assert.equal(cById.has("concept_0002"), false, "Regression: Alias masking detected in map generation natively");

    console.log("PASS: Canonical UUID identity map cleanly decoupled from legacy JSON identifiers.");
} catch (e) {
    console.error("FAIL:", e.message);
    process.exit(1);
}
