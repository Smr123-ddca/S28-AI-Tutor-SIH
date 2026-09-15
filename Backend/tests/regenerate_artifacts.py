import os
import subprocess
import json

base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "data"))
eval_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "eval"))
script_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python"))

os.makedirs(eval_dir, exist_ok=True)

courses = ["DSA_Code_Reference_Annotated", "Economics_Chunking_Reference", "DBMS_Code_Reference_Annotated"]

for course in courses:
    print(f"Processing {course}...")
    
    chunks_path = os.path.join(base_dir, f"{course}_chunks.json")
    
    quality_path = os.path.join(eval_dir, f"{course}_quality.json")
    concepts_path = os.path.join(eval_dir, f"{course}_concepts.json")
    hierarchy_path = os.path.join(eval_dir, f"{course}_hierarchy.json")
    prereq_path = os.path.join(eval_dir, f"{course}_prerequisites.json")
    
    # 1. Quality
    print("  -> Quality")
    res = subprocess.run(["python", os.path.join(script_dir, "chunk_quality.py"), chunks_path], capture_output=True, text=True)
    with open(quality_path, "w", encoding="utf-8") as f:
        f.write(res.stdout)
        
    # 2. Concept Extraction
    print("  -> Concepts")
    res = subprocess.run(["python", os.path.join(script_dir, "concept_extraction.py"), chunks_path, quality_path], capture_output=True, text=True)
    with open(concepts_path, "w", encoding="utf-8") as f:
        f.write(res.stdout)
        
    # 3. Hierarchy
    res = subprocess.run(["python", os.path.join(script_dir, "concept_hierarchy.py"), concepts_path], capture_output=True, text=True)
    with open(hierarchy_path, "w", encoding="utf-8") as f:
        f.write(res.stdout)
        
    # 4. Prerequisites
    res = subprocess.run(["python", os.path.join(script_dir, "prerequisite_graph.py"), concepts_path, hierarchy_path], capture_output=True, text=True)
    with open(prereq_path, "w", encoding="utf-8") as f:
        f.write(res.stdout)
        
    print(f"Finished {course}")
