import os
import json
from collections import defaultdict

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "data"))
courses = ["DSA_Code_Reference_Annotated", "Economics_Chunking_Reference", "DBMS_Code_Reference_Annotated"]

for course in courses:
    print(f"=== {course} ===")
    concepts_path = os.path.join(base_dir, f"{course}_concepts.json")
    chunks_path = os.path.join(base_dir, f"{course}_chunks.json")
    
    if not os.path.exists(concepts_path):
        print("  Concepts missing.")
        continue
        
    with open(concepts_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    with open(chunks_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)
        
    concepts = data.get("concepts", [])
    
    total_chunks = len(chunks)
    total_concepts = len(concepts)
    
    chunk_to_concepts = defaultdict(list)
    concept_to_chunks = {}
    
    for c in concepts:
        ev = c.get("evidence", [])
        concept_to_chunks[c["name"]] = len(ev)
        for e in ev:
            chunk_to_concepts[e["chunk_id"]].append(c["name"])
            
    c_1 = sum(1 for c, n in concept_to_chunks.items() if n == 1)
    c_2 = sum(1 for c, n in concept_to_chunks.items() if n == 2)
    c_3 = sum(1 for c, n in concept_to_chunks.items() if n >= 3)
    
    ch_0 = total_chunks - len(chunk_to_concepts)
    ch_1 = sum(1 for ch, ls in chunk_to_concepts.items() if len(ls) == 1)
    ch_2 = sum(1 for ch, ls in chunk_to_concepts.items() if len(ls) == 2)
    ch_3 = sum(1 for ch, ls in chunk_to_concepts.items() if len(ls) >= 3)
    
    print(f"  Total Concepts: {total_concepts}")
    print(f"  Concepts supported by 1 chunk: {c_1}")
    print(f"  Concepts supported by 2 chunks: {c_2}")
    print(f"  Concepts supported by 3+ chunks: {c_3}")
    print()
    print(f"  Chunks supporting 0 concepts: {ch_0}")
    print(f"  Chunks supporting 1 concept: {ch_1}")
    print(f"  Chunks supporting 2 concepts: {ch_2}")
    print(f"  Chunks supporting 3+ concepts: {ch_3}")
    print()
    print("  Sample Concepts:")
    for c in concepts[:5]:
        print(f"    - {c['name']} (Ev map: {len(c.get('evidence', []))})")
