import json
import subprocess
import os

TEST_CONCEPTS_PATH = "test_concepts.json"

def setup():
    # Write a test concepts file matching the IDs expected by the internal mocks
    concepts = {
        "course": "Validation 101",
        "concepts": [
            {"concept_id": "c0", "name": "Zero", "description": "000"},
            {"concept_id": "c1", "name": "One", "description": "111"},
            {"concept_id": "c2", "name": "Two", "description": "222"}
        ]
    }
    with open(TEST_CONCEPTS_PATH, "w", encoding="utf-8") as f:
        json.dump(concepts, f)

def run_test(mock_behavior, expected_edges, expected_warnings=0, expected_cycles=0):
    env = os.environ.copy()
    env["_MOCK_BEHAVIOR"] = mock_behavior
    
    script_path = os.path.join(os.path.dirname(__file__), "python", "prerequisite_graph.py")
    result = subprocess.run(
        ["python", script_path, TEST_CONCEPTS_PATH],
        capture_output=True,
        text=True,
        env=env
    )
    
    try:
        data = json.loads(result.stdout.strip())
        edges = len(data.get("relationships", []))
        warnings = len(data.get("quality", {}).get("warnings", []))
        cycles = data.get("quality", {}).get("cycles_removed", 0)
        
        status = "✅ PASS"
        if edges != expected_edges or warnings < expected_warnings or cycles != expected_cycles:
            status = "❌ FAIL"
            print(f"[{mock_behavior}] {status}: Expected {expected_edges} edges, got {edges}. Warn: {warnings}/{expected_warnings}. Cycles: {cycles}/{expected_cycles}.")
            print("Output dump:", json.dumps(data, indent=2))
        else:
            print(f"[{mock_behavior}] {status} - Edges: {edges}")
            
    except json.JSONDecodeError:
        print(f"[{mock_behavior}] ❌ FAIL (JSON Decode Error)")
        print("STDOUT:", result.stdout)
        print("STDERR:", result.stderr)
        
def teardown():
    if os.path.exists(TEST_CONCEPTS_PATH):
        os.remove(TEST_CONCEPTS_PATH)

if __name__ == "__main__":
    setup()
    
    print("--- RUNNING DETERMINISTIC PIPELINE TESTS ---")
    
    # SUCCESS: 2 valid edges
    run_test("SUCCESS", expected_edges=2)
    
    # MALFORMED: Should fail safely, yield 0 edges
    run_test("MALFORMED", expected_edges=0)
    
    # NO_OUTPUT: Should yield 0
    run_test("NO_OUTPUT", expected_edges=0)
    
    # SELF_DEP: A->A, should yield 0
    run_test("SELF_DEP", expected_edges=0)
    
    # HALLUCINATE: fake_1->c0, c1->fake_2 (should reject both, yield 0)
    run_test("HALLUCINATE", expected_edges=0)
    
    # DUPLICATE: c0->c1, c0->c1 (should keep stronger 1, yield 1)
    run_test("DUPLICATE", expected_edges=1)
    
    # CYCLE: c0->c1, c1->c2, c2->c0 (Should break cycle, removing weakest, yield 2 remaining edges, 1 cycle removed)
    run_test("CYCLE", expected_edges=2, expected_cycles=1)
    
    # LOW_CONFIDENCE: Both edges < 0.60 (yielding 0)
    run_test("LOW_CONFIDENCE", expected_edges=0)
    
    teardown()
    print("--- DONE ---")
