import json
import subprocess
import os

# Create a mock concepts.json
mock_concepts = {
    "course": "Diagnostics 101",
    "concepts": [
        {
            "concept_id": "c_001",
            "name": "Arrays",
            "description": "Contiguous memory elements"
        },
        {
            "concept_id": "c_002",
            "name": "Pointers",
            "description": "Memory address references"
        },
        {
            "concept_id": "c_003",
            "name": "Linked Lists",
            "description": "Nodes with pointers"
        }
    ]
}

with open("DiagnosticConcepts.json", "w") as f:
    json.dump(mock_concepts, f)

# Run prerequisite_graph.py explicitly
result = subprocess.run(
    ["python", "python/prerequisite_graph.py", "DiagnosticConcepts.json"],
    capture_output=True,
    text=True,
    env={**os.environ}
)

print("=== STDOUT ===")
print(result.stdout)
print("=== STDERR ===")
print(result.stderr)
