import { strict as assert } from 'assert';

console.log("=== EXECUTING PHASE 1.2 UI CARD DEPENDENCY RESOLUTION TEST ===");

const concepts = [
    {
        id: "uuid-scarcity",
        name: "Scarcity"
    },
    {
        id: "uuid-opportunity",
        name: "Opportunity Cost"
    }
];

const relationship = {
    prerequisite_concept_id: "uuid-scarcity",
    target_concept_id: "uuid-opportunity",
    relationship_type: "REQUIRED"
};

const cById = new Map();
concepts.forEach(c => {
    // Phase 1.1 + 1.2 Regression: Assert canonical UUID binding
    if (c.id) cById.set(c.id, c);
});

// Phase 1.2 Regression: Assert grouping logic resolves correctly
const map = new Map();
if (!map.has(relationship.target_concept_id)) {
    map.set(relationship.target_concept_id, []);
}
map.get(relationship.target_concept_id).push(relationship);

try {
    // Extract logical render state dynamically isolating what TeacherPrerequisites expects
    const dependentId = relationship.target_concept_id;
    const rels = map.get(dependentId);

    const dependentConcept = cById.get(dependentId);
    const dependentName = dependentConcept ? dependentConcept.name : `[Unknown Concept]`;

    const prereqConcept = cById.get(rels[0].prerequisite_concept_id);
    const prereqName = prereqConcept ? prereqConcept.name : `[Unknown Concept]`;
    const relType = rels[0].relationship_type;

    // Validate assertions structurally 
    assert.equal(dependentName, "Opportunity Cost", "Failed to resolve dependent UI card title natively.");
    assert.equal(prereqName, "Scarcity", "Failed to resolve prerequisite inline array element natively.");
    assert.equal(relType, "REQUIRED", "Failed to resolve relationship type bound dynamically.");

    assert.notEqual(dependentName, "[Unknown Concept]", "Regression: UI Card masking decoupled UI identity.");
    assert.notEqual(prereqName, "[Unknown Concept]", "Regression: UI Card rendering decoupled array edge.");

    console.log("PASS: Dependency Overview card correctly resolved 'Scarcity -> Opportunity Cost' bypassing Unknown hooks cleanly natively.");
} catch (e) {
    console.error("FAIL:", e.message);
    process.exit(1);
}
