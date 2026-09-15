import json
import os

data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "data"))
chunks_file = os.path.join(data_dir, "DSA_Code_Reference_Annotated_chunks.json")

with open(chunks_file, "r", encoding="utf-8") as f:
    chunks = json.load(f)

targets = ["graph", "bfs", "heap", "k-th", "topological", "dynamic programming", "memoization"]
found_chunks = []

for c in chunks:
    text = c.get("text", "").lower()
    if any(t in text for t in targets):
        found_chunks.append(c)

out_file = os.path.join(os.path.dirname(__file__), "extracted_chunks.json")
with open(out_file, "w") as f:
    json.dump(found_chunks, f, indent=2)

print(f"Extracted {len(found_chunks)} chunks.")
