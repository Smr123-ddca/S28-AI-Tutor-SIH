import json
import subprocess
import os

inputs = [
    {
        "id": "concept_0001",
        "name": "Arrays",
        "desc": "Contiguous memory elements"
    },
    {
        "id": "concept_0002",
        "name": "Pointers",
        "desc": "Memory address references"
    },
    {
        "id": "concept_0003",
        "name": "Linked Lists",
        "desc": "Nodes connected by pointers"
    }
]

prompt = f"""
You are an AI specializing in curriculum design and learning science.
Analyze the following canonical concepts for "Diagnostics 101".
Determine actual **learning dependencies** between these concepts.

Rules:
1. Output an array of relationship objects strictly identifying what concepts require other concepts to be understood.
2. A relationship means the learner strongly depends on understanding `prerequisite_id` BEFORE learning `concept_id`.
3. Use relationship types: "REQUIRED", "SUPPORTING", or "RELATED".
4. Provide a scalar `confidence` score (0.0 to 1.0). (0.90+ for very strong prereqs).
5. Specify a concise educational `reason` for the dependency.
6. List `evidence` chunk IDs supporting this (borrow from the concept definitions if appropriate).
7. Do NOT connect concepts simply because they are in the same domain.
8. Output schema:
[
  {{ "concept_id": "concept_B", "prerequisite_id": "concept_A", "relationship": "REQUIRED", "confidence": 0.95, "reason": "B builds entirely on A", "evidence": ["chunk_X"] }}
]

Source Concepts:
{json.dumps(inputs, ensure_ascii=False)}
"""

from dotenv import load_dotenv
load_dotenv(".env")

sys_path = os.path.join(os.path.dirname(__file__), "python")
import sys
sys.path.append(sys_path)
import gemini_rest

try:
    gemini_rest.generate_content("hello")
except Exception as e:
    print(f"Exception: {e}")

raw = generate_content(prompt)
with open("raw_gemini.json", "w") as f:
    f.write(raw)
