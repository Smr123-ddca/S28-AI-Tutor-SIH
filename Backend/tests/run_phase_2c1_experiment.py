import os
import sys
import json
import logging
from collections import defaultdict

data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "data"))
chunks_file = os.path.join(data_dir, "DSA_Code_Reference_Annotated_chunks.json")
concepts_file = os.path.join(data_dir, "DSA_Code_Reference_Annotated_concepts.json")

sys.argv = ["prerequisite_graph.py", concepts_file, "dummy2", chunks_file]
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python")))
from prerequisite_graph import ContextAssembler

# Setup
exp_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "experiments", "prerequisite_2c1"))
os.makedirs(exp_dir, exist_ok=True)
logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

if not os.path.exists(chunks_file) or not os.path.exists(concepts_file):
    logging.error("Missing required DSA JSON files. Cannot run experiment.")
    sys.exit(1)

with open(chunks_file, "r", encoding="utf-8") as f:
    chunks = json.load(f)
with open(concepts_file, "r", encoding="utf-8") as f:
    concepts_data = json.load(f)
    concepts = concepts_data.get("concepts", [])

# Target nodes
targets = [
    "Graph", "Breadth-First Search (BFS)", "Depth-First Search (DFS)", 
    "Heap", "K-th Largest Element", "Dynamic Programming", "Memoization",
    "Topological Sort", "Binary Search Tree (BST)"
]
# Select the exact concepts from the payload mechanically matching names softly
selected_concepts = []
for c in concepts:
    n = c.get("name", "").lower()
    for t in targets:
        if t.lower() in n or n in t.lower():
            selected_concepts.append(c)
            break
            
if not selected_concepts:
    logging.error("Failed to extract targeted DSA concepts.")
    sys.exit(1)

logging.info(f"Selected {len(selected_concepts)} concepts for evaluation.")

# Build Chronological Context natively
inputs = ContextAssembler.assemble(chunks, selected_concepts)

prompt = f"""
You are an expert curriculum-design assistant evaluating chronological pedagogical relationships.
Your task is to identify logically grounded prerequisite dependencies strictly based on the text.

CHRONOLOGY RULES (CRITICAL):
1. 'first_introduced_chunk_index' serves as a chronological structural timeline.
2. Chronology is a SIGNAL, NOT PROOF. Earlier introduction may support a prerequisite relationship, but ONLY classify a concept as REQUIRED when the provided instructional text specifically supports it. 
3. You are explicitly authorized to abstain returning INSUFFICIENT_EVIDENCE if the relation is missing.

RELATIONSHIP CATEGORIES (Choose ONE per mapping):
- REQUIRED: The learner strictly needs to understand A before they can reasonably understand/use B according to the provided material text context.
- SUPPORTING: A helps B but is not clearly structurally required.
- RELATED: A and B are meaningfully related but there is no demonstrated timeline dependency.
- INSUFFICIENT_EVIDENCE: The supplied material is insufficient to establish any relationship. Do not fill missing evidence with general world knowledge!

OUTPUT SCHEMA REQUIREMENT:
For every Candidate evaluation, explicitly map it directionally (PREREQUISITE -> DEPENDENT) and output a JSON array of dicts:
[
  {{
    "prerequisite_id": "concept_A",
    "concept_id": "concept_B",
    "relationship": "REQUIRED/SUPPORTING/RELATED/INSUFFICIENT_EVIDENCE",
    "reason": "Specific textbook causality...",
    "evidence_chunk_ids": ["c123"]
  }}
]
Do NOT invent chunk IDs! Only use chunk IDs mapped explicitly in the input evidence pool per concept!

Evaluate the following chronological concept sequence:
{json.dumps(inputs, ensure_ascii=False, indent=2)}
"""

logging.info("Requesting generation from Gemini API...")
try:
    from gemini_rest import generate_content
    raw_response = generate_content(prompt)
except Exception as e:
    logging.error(f"Execution Halt: Gemini API quota failure or connection bound: {e}")
    with open(os.path.join(exp_dir, "failure_log.txt"), "w") as f:
        f.write(f"Experiment halted. Error: {e}\n")
    sys.exit(0)

# Write output safely
out_file = os.path.join(exp_dir, "experiment_results.json")
with open(out_file, "w", encoding="utf-8") as f:
    f.write(raw_response)
logging.info(f"Experiment succeeded natively. Wrote {out_file}.")
sys.exit(0)
