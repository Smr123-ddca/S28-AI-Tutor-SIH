import os
import sys
import json
from collections import defaultdict

data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "data"))
chunks_file = os.path.join(data_dir, "DSA_Code_Reference_Annotated_chunks.json")
concepts_file = os.path.join(data_dir, "DSA_Code_Reference_Annotated_concepts.json")

class ContextAssembler:
    @staticmethod
    def assemble(chunks, concepts):
        chunk_map = {c["id"]: c for c in chunks if "id" in c}
        enriched_concepts = []
        for c in concepts:
            best_chunk_index = 999999
            first_context = ""
            for ev in c.get("evidence", []):
                cid = ev.get("chunk_id")
                if cid and cid in chunk_map:
                    ck = chunk_map[cid]
                    idx = ck.get("chunk_index", 999999)
                    if idx < best_chunk_index:
                        best_chunk_index = idx
                        first_context = ck.get("text", "")[:400]
            enriched = {
                "id": c.get("concept_id"),
                "name": c.get("name"),
                "desc": c.get("description", "")[:200],
                "first_introduced_chunk_index": best_chunk_index if best_chunk_index != 999999 else -1,
                "first_introduced_context": first_context
            }
            enriched_concepts.append(enriched)
        enriched_concepts.sort(key=lambda x: x["first_introduced_chunk_index"] if x["first_introduced_chunk_index"] >= 0 else 999999)
        return enriched_concepts

with open(chunks_file, "r", encoding="utf-8") as f:
    chunks = json.load(f)
with open(concepts_file, "r", encoding="utf-8") as f:
    concepts_data = json.load(f)
    concepts = concepts_data.get("concepts", [])

targets = [
    "graph", "bfs", "heap", "k-th", "topological", "dynamic program", "memoization"
]

selected_concepts = []
for c in concepts:
    n = c.get("name", "").lower()
    if any(t in n for t in targets):
        selected_concepts.append(c)

# We want exactly what ContextAssembler prints out + maybe extra info to audit
output_path = os.path.join(os.path.dirname(__file__), "context_audit_output.txt")

inputs = ContextAssembler.assemble(chunks, selected_concepts)

with open(output_path, "w", encoding="utf-8") as f:
    f.write(json.dumps(inputs, indent=2))
    
    f.write("\n\n=================================\n")
    f.write("EXTENDED RAW CHUNK INVESTIGATION FOR THESE NODES\n")
    f.write("=================================\n\n")
    
    chunk_map = {c["id"]: c for c in chunks if "id" in c}
    
    for c in selected_concepts:
        f.write(f"--- CONCEPT: {c.get('name')} ---\n")
        evs = c.get("evidence", [])
        f.write(f"Evidence chunks linked: {[e.get('chunk_id') for e in evs]}\n")
        
        for e in evs:
            cid = e.get("chunk_id")
            if cid in chunk_map:
                ch = chunk_map[cid]
                f.write(f"  Chunk ID: {cid}\n")
                f.write(f"  Index: {ch.get('chunk_index')}\n")
                f.write(f"  Chapter: {ch.get('chapter', 'N/A')}\n")
                f.write(f"  Text: {ch.get('text', '')[:600]}...\n")
                f.write(f"  ---\n")
        f.write("\n")

print(f"Dumped context to {output_path}")
