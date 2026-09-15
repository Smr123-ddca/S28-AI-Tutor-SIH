import json
import os
from collections import defaultdict

DATA_DIR = "src/data"

def load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def run():
    courses = ["Economics_Chunking_Reference", "DSA_Code_Reference_Annotated", "DBMS_Code_Reference_Annotated"]
    results = {}

    for course in courses:
        chunks = load_json(os.path.join(DATA_DIR, f"{course}_chunks.json")) or []
        concepts_obj = load_json(os.path.join(DATA_DIR, f"{course}_concepts.json")) or {}
        prereq_obj = load_json(os.path.join(DATA_DIR, f"{course}_prerequisites.json")) or {}
        
        concepts = concepts_obj.get("concepts", [])
        relationships = prereq_obj.get("relationships", [])

        num_chunks = len(chunks)
        num_concepts = len(concepts)
        
        unique_concept_names = set(c.get("name", "").lower() for c in concepts)
        concepts_with_multiple_evidence = [c for c in concepts if len(c.get("evidence", [])) > 1]
        
        chunks_by_concept_count = defaultdict(int)
        for c in concepts:
            for ev in c.get("evidence", []):
                chk_id = ev.get("chunk_id")
                if chk_id:
                    chunks_by_concept_count[chk_id] += 1
                    
        chunks_with_multiple_concepts = [cid for cid, count in chunks_by_concept_count.items() if count > 1]
        chunk_ids_present = {c["id"] for c in chunks}
        chunks_with_zero_concepts = [cid for cid in chunk_ids_present if chunks_by_concept_count[cid] == 0]
        
        c2c_ratio = num_concepts / num_chunks if num_chunks > 0 else 0
        total_evidence = sum(len(c.get("evidence", [])) for c in concepts)
        avg_evidence_per_concept = total_evidence / num_concepts if num_concepts > 0 else 0
        avg_concepts_per_chunk = total_evidence / num_chunks if num_chunks > 0 else 0

        # Relationships
        num_relationships = len(relationships)
        req_rel = [r for r in relationships if str(r.get("relationship", "")).upper() == "REQUIRED"]
        sup_rel = [r for r in relationships if str(r.get("relationship", "")).upper() == "SUPPORTING"]
        
        confidences = [float(r.get("confidence", 0)) for r in relationships]
        avg_conf = sum(confidences)/len(confidences) if confidences else 0
        min_conf = min(confidences) if confidences else 0
        max_conf = max(confidences) if confidences else 0
        
        rels_per_concept = num_relationships / num_concepts if num_concepts > 0 else 0
        
        adj = defaultdict(list)
        in_degree = defaultdict(int)
        out_degree = defaultdict(int)
        
        for r in relationships:
            p = r["prerequisite_id"]
            d = r["concept_id"]
            adj[p].append(d)
            in_degree[d] += 1
            out_degree[p] += 1
            
        branching_nodes = [n for n, count in out_degree.items() if count >= 2]
        multiple_prereqs = [n for n, count in in_degree.items() if count >= 2]
        
        chains = 0
        for n, count in out_degree.items():
            if count == 1 and in_degree[n] == 1:
                chains += 1
                
        all_nodes_in_edges = set(list(in_degree.keys()) + list(out_degree.keys()))
        visited = set()
        components = 0
        for node in all_nodes_in_edges:
            if node not in visited:
                components += 1
                q = [node]
                while q:
                    curr = q.pop(0)
                    if curr not in visited:
                        visited.add(curr)
                        for d in adj[curr]:
                            if d not in visited:
                                q.append(d)
                        for start, ends in adj.items():
                            if curr in ends and start not in visited:
                                q.append(start)
                                
        self_loops = [r for r in relationships if r["prerequisite_id"] == r["concept_id"]]
        cycles = 0 
        for r in relationships:
            if any(br["prerequisite_id"] == r["concept_id"] and br["concept_id"] == r["prerequisite_id"] for br in relationships):
                cycles += 1
        cycles = cycles // 2 
        
        edge_sets = defaultdict(int)
        for r in relationships:
            edge_sets[(r["prerequisite_id"], r["concept_id"])] += 1
        duplicate_edges = [edge for edge, count in edge_sets.items() if count > 1]
        weak_rels = [r for r in relationships if float(r.get("confidence", 1)) < 0.6]

        results[course] = {
            "chunks": num_chunks,
            "concepts": num_concepts,
            "unique_concept_names": len(unique_concept_names),
            "concepts_with_multiple_evidence_chunks": len(concepts_with_multiple_evidence),
            "chunks_with_multiple_concepts": len(chunks_with_multiple_concepts),
            "chunks_with_zero_concepts": len(chunks_with_zero_concepts),
            "concept_to_chunk_ratio": c2c_ratio,
            "avg_evidence_per_concept": avg_evidence_per_concept,
            "avg_concepts_per_chunk": avg_concepts_per_chunk,
            "relationships": num_relationships,
            "required": len(req_rel),
            "supporting": len(sup_rel),
            "confidence_avg": avg_conf,
            "confidence_min": min_conf,
            "confidence_max": max_conf,
            "rels_per_concept": rels_per_concept,
            "branching_nodes": len(branching_nodes),
            "nodes_with_multiple_prereqs": len(multiple_prereqs),
            "connected_components": components,
            "self_loops": len(self_loops),
            "2_cycles": cycles,
            "duplicate_edges": len(duplicate_edges),
            "weak_edges": len(weak_rels),
            "chains": chains
        }
    
    with open("metrics.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    run()
