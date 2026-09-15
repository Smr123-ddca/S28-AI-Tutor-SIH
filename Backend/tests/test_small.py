import sys
import json
import subprocess
import os

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "data"))
script_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python"))

# Load Econ chunks and slice a small batch of 10
with open(os.path.join(base_dir, "Economics_Chunking_Reference_chunks.json"), "r") as f:
    chunks = json.load(f)[:10]
    
small_chunks = os.path.join(base_dir, "small_chunks.json")
small_quality = os.path.join(base_dir, "small_quality.json")
small_concepts = os.path.join(base_dir, "small_concepts.json")

with open(small_chunks, "w") as f:
    json.dump(chunks, f, indent=2)
    
print("--- Running Quality ---")
res = subprocess.run(["python", os.path.join(script_dir, "chunk_quality.py"), small_chunks], capture_output=True, text=True)
with open(small_quality, "w") as f:
    f.write(res.stdout)
sys.stderr.write(res.stderr)

print("--- Running Concepts ---")
res2 = subprocess.run(["python", os.path.join(script_dir, "concept_extraction.py"), small_chunks, small_quality], capture_output=True, text=True)
with open(small_concepts, "w") as f:
    f.write(res2.stdout)
sys.stderr.write(res2.stderr)

print("Done. Check small_concepts.json.")
