import os
import sys
import json
import re
from collections import defaultdict, deque

# ============================================================
# WINDOWS UTF-8 OUTPUT
# ============================================================
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

mock_val = os.getenv("_MOCK_BEHAVIOR")

if not mock_val:
    try:
        from dotenv import load_dotenv
        
        load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("GEMINI_API_KEY is not configured.", file=sys.stderr)
            sys.exit(1)
    except ImportError:
        print(json.dumps({"error": "Failed to import required libraries."}))
        sys.exit(1)
    except Exception as e:
        print(f"Failed to initialize Gemini client: {e}", file=sys.stderr)
        sys.exit(1)

# ============================================================
# ARGUMENT CHECK
# ============================================================
if len(sys.argv) < 3:
    print(json.dumps({"error": "Usage: python prerequisite_graph.py <concepts.json> <hierarchy.json> <chunks.json>"}, ensure_ascii=False))
    sys.exit(1)

concepts_path = sys.argv[1].strip()
hierarchy_path = sys.argv[2].strip()
chunks_path = sys.argv[3].strip() if len(sys.argv) > 3 else None

# ============================================================
# LOAD INPUTS
# ============================================================
try:
    with open(concepts_path, "r", encoding="utf-8") as f:
        c2_data = json.load(f)
except Exception as e:
    print(json.dumps({"error": f"Failed to load concepts data: {e}"}))
    sys.exit(1)

c2_concepts = c2_data.get("concepts", [])
course_name = c2_data.get("course", "Unknown")

valid_concept_ids = set([str(c.get("concept_id")) for c in c2_concepts if c.get("concept_id")])

hier_data = {}
if hierarchy_path and os.path.exists(hierarchy_path):
    try:
        with open(hierarchy_path, "r", encoding="utf-8") as f:
            hier_data = json.load(f)
    except Exception:
        pass

chunks_data = []
if chunks_path and os.path.exists(chunks_path):
    try:
        with open(chunks_path, "r", encoding="utf-8") as f:
            chunks_data = json.load(f)
    except Exception as e:
        print(f"Failed to load chunks: {e}", file=sys.stderr)
        
class ContextAssembler:
    @staticmethod
    def _bound_text(text, limit=1500):
        if not text:
            return ""
        if len(text) <= limit:
            return text.strip()
        half = limit // 2
        return text[:half].strip() + "\n\n... [TRUNCATED] ...\n\n" + text[-half:].strip()

    @staticmethod
    def assemble(chunks, concepts):
        chunk_map = {c["id"]: c for c in chunks if "id" in c}
        
        # Sort all chunks by explicit chunk_index (or fallback) to allow safe adjacent lookups
        valid_chunks_sorted = []
        for c in chunks:
            idx = int(c.get("chunk_index", 999999))
            valid_chunks_sorted.append((idx, c))
        valid_chunks_sorted.sort(key=lambda x: x[0])

        enriched_concepts = []
        for c in concepts:
            best_chunk_index = 999999
            target_chunk_id = None
            
            # 1. Identify FIRST_INTRODUCTION
            for ev in c.get("evidence", []):
                cid = ev.get("chunk_id")
                if cid and cid in chunk_map:
                    idx = int(chunk_map[cid].get("chunk_index", 999999))
                    if idx < best_chunk_index:
                        best_chunk_index = idx
                        target_chunk_id = cid

            local_context = []
            
            # 2. Extract preceding, current, following if we found a valid injection point
            if target_chunk_id and best_chunk_index != 999999:
                target_pos = -1
                for idx_pos, (ck_idx, ck) in enumerate(valid_chunks_sorted):
                    if ck["id"] == target_chunk_id:
                        target_pos = idx_pos
                        break
                        
                if target_pos != -1:
                    def _format_context(ck, role):
                        return {
                            "role": role,
                            "chunk_id": ck.get("id"),
                            "chunk_index": ck.get("chunk_index"),
                            "chapter": ck.get("chapter", ""),
                            "section": ck.get("section", ""),
                            "page_start": ck.get("page_start"),
                            "page_end": ck.get("page_end"),
                            "text": ContextAssembler._bound_text(ck.get("text", ""), 1500)
                        }

                    # Preceding
                    if target_pos > 0:
                        prev_ck = valid_chunks_sorted[target_pos - 1][1]
                        local_context.append(_format_context(prev_ck, "PRECEDING"))
                    
                    # Current / First Introduction
                    curr_ck = valid_chunks_sorted[target_pos][1]
                    local_context.append(_format_context(curr_ck, "FIRST_INTRODUCTION"))
                    
                    # Following
                    if target_pos < len(valid_chunks_sorted) - 1:
                        next_ck = valid_chunks_sorted[target_pos + 1][1]
                        local_context.append(_format_context(next_ck, "FOLLOWING"))

            enriched = {
                "id": c.get("concept_id"),
                "name": c.get("name"),
                "desc": c.get("description", "")[:200],
                "first_introduced_chunk_index": best_chunk_index if best_chunk_index != 999999 else -1,
                "local_context": local_context
            }
            enriched_concepts.append(enriched)
            
        enriched_concepts.sort(key=lambda x: x["first_introduced_chunk_index"] if x["first_introduced_chunk_index"] >= 0 else 999999)
        return enriched_concepts

# ============================================================
# PASS A: CANDIDATE DEPENDENCY EXTRACTION
# ============================================================
# Assemble chronological chunk context bounds
inputs = ContextAssembler.assemble(chunks_data, c2_concepts)

prompt = f"""
You are an expert curriculum-design assistant.
Analyze the following canonical concepts for "{course_name}".
Your task is to identify logically grounded learning dependencies based exclusively on the provided Chronological Sequence context bounds.

Strict rules for extraction:
1. Output ONLY a chronological JSON array of prerequisite relationships.
2. A relationship means the learner must understand `prerequisite_id` BEFORE learning `concept_id`.
3. READ THE `first_introduced_chunk_index` AND THE LOCAL CONTEXT: Evaluate the PRECEDING, FIRST_INTRODUCTION, and FOLLOWING text natively mapped around its structural chronology to guarantee dependencies (No backward guessing!).
4. Use `concept_id` and `prerequisite_id` values copied EXACTLY from the supplied `id` fields. Do not use placeholders.
5. Only include a relationship when the course material structurally supports it. Do not map everything linearly mechanically, map semantically based on actual required knowledge.
6. Do not create edges just because concepts share a domain, keywords, or close semantic similarity.
7. `relationship` must be one of: "REQUIRED", "SUPPORTING", or "RELATED".
8. `confidence` must be a number between 0.0 and 1.0. Prefer very strong edges logically linking the chunks.
9. `reason` must explicitly state *why* based on the context text.
10. `evidence` array is left empty (managed natively upstream).

Example of format:
[
  {{
   "concept_id": "concept_0007",
   "prerequisite_id": "concept_0003",
   "relationship": "REQUIRED",
   "confidence": 0.87,
   "reason": "Concept 3's definition is natively applied in Concept 7's sequence context.",
   "evidence": []
  }}
]

Chronologically Ordered Course Concept Sequence Context:
{json.dumps(inputs, ensure_ascii=False)}
"""


raw_response = ""
model_status = "MODEL_VALID_OUTPUT"
model_failure_reason = None

if mock_val == "MALFORMED":
    raw_response = "invalid {"
elif mock_val == "NO_OUTPUT":
    raw_response = "[]"
elif mock_val == "SUCCESS":
    raw_response = json.dumps([
        {"concept_id": "c1", "prerequisite_id": "c0", "relationship": "REQUIRED", "confidence": 0.95, "reason": "Test", "evidence": ["e1"]},
        {"concept_id": "c2", "prerequisite_id": "c1", "relationship": "SUPPORTING", "confidence": 0.8, "reason": "Test2", "evidence": []}
    ])
elif mock_val == "SELF_DEP":
    raw_response = json.dumps([
        {"concept_id": "c1", "prerequisite_id": "c1", "relationship": "REQUIRED", "confidence": 0.95, "reason": "Test"}
    ])
elif mock_val == "DUPLICATE":
    raw_response = json.dumps([
        {"concept_id": "c1", "prerequisite_id": "c0", "relationship": "REQUIRED", "confidence": 0.95, "reason": "Test"},
        {"concept_id": "c1", "prerequisite_id": "c0", "relationship": "SUPPORTING", "confidence": 0.6, "reason": "Test Dup"}
    ])
elif mock_val == "CYCLE":
    raw_response = json.dumps([
        {"concept_id": "c1", "prerequisite_id": "c0", "relationship": "REQUIRED", "confidence": 0.95, "reason": "t"},
        {"concept_id": "c2", "prerequisite_id": "c1", "relationship": "REQUIRED", "confidence": 0.90, "reason": "t"},
        {"concept_id": "c0", "prerequisite_id": "c2", "relationship": "REQUIRED", "confidence": 0.60, "reason": "cycle edge"}
    ])
elif mock_val == "HALLUCINATE":
    raw_response = json.dumps([
        {"concept_id": "fake_1", "prerequisite_id": "c0", "relationship": "REQUIRED", "confidence": 0.95, "reason": "t"},
        {"concept_id": "c1", "prerequisite_id": "fake_2", "relationship": "REQUIRED", "confidence": 0.95, "reason": "t"}
    ])
elif mock_val == "LOW_CONFIDENCE":
    raw_response = json.dumps([
        {"concept_id": "c1", "prerequisite_id": "c0", "relationship": "RELATED", "confidence": 0.40, "reason": "t"},
        {"concept_id": "c2", "prerequisite_id": "c1", "relationship": "REQUIRED", "confidence": 0.20, "reason": "t"}
    ])
else:
    try:
        from gemini_rest import generate_content
        raw_response = generate_content(prompt).strip()
        if not raw_response:
            model_status = "MODEL_EMPTY_RESPONSE"
            model_failure_reason = "LLM returned empty content."
    except Exception as e:
        model_status = "MODEL_FAILURE"
        model_failure_reason = str(e)
        print(f"Gemini API call failed: {e}", file=sys.stderr)
        raw_response = "[]"

raw_response = re.sub(r"^```json\s*", "", raw_response, flags=re.IGNORECASE)
raw_response = re.sub(r"^```\s*", "", raw_response)
raw_response = re.sub(r"\s*```$", "", raw_response)
raw_response = raw_response.strip()

try:
    parsed = json.loads(raw_response) if raw_response else []
except json.JSONDecodeError:
    model_status = "MODEL_INVALID_JSON"
    model_failure_reason = "LLM output could not be parsed as JSON."
    parsed = []

if isinstance(parsed, dict):
    for key in ["relationships", "edges", "prerequisites", "data"]:
        if key in parsed and isinstance(parsed[key], list):
            relations = parsed[key]
            break
    else:
        model_status = "MODEL_INVALID_JSON"
        model_failure_reason = "LLM output was an object but did not include a relationships array."
        relations = []
elif isinstance(parsed, list):
    relations = parsed
else:
    model_status = "MODEL_INVALID_JSON"
    model_failure_reason = "LLM output was not a JSON array or object wrapper."
    relations = []

# ============================================================
# PASS B: VALIDATION STRICT CHECKS
# ============================================================
warnings_list = []
status = "healthy"
cycles_removed = []
isolated_count = 0

valid_chunk_map = {str(c["id"]): c for c in chunks_data if "id" in c}

diagnostic_counts = {
    "concepts_supplied": len(c2_concepts),
    "llm_candidates_returned": len(relations),
    "malformed_candidates": 0,
    "unknown_id_candidates": 0,
    "self_loop_candidates": 0,
    "low_confidence_candidates": 0,
    "unsupported_evidence_rejected": 0,
    "cycle_rejected_candidates": 0,
    "final_valid_relationships": 0,
}

filtered_relations = []
seen_edges = {}

for r in relations:
    if not isinstance(r, dict):
        diagnostic_counts["malformed_candidates"] += 1
        continue

    cid = str(r.get("concept_id", "")).strip()
    pid = str(r.get("prerequisite_id", "")).strip()
    rel = str(r.get("relationship", "SUPPORTING")).upper()
    conf = r.get("confidence", 0.0)
    reason = str(r.get("reason", "")).strip()

    if not reason:
        reason = "Implicitly identified by curriculum model."

    try:
        conf = float(conf)
    except:
        conf = 0.0

    if conf < 0.0 or conf > 1.0:
        continue

    if cid not in valid_concept_ids or pid not in valid_concept_ids:
        diagnostic_counts["unknown_id_candidates"] += 1
        continue

    if cid == pid:
        diagnostic_counts["self_loop_candidates"] += 1
        continue

    if conf < 0.60:
        diagnostic_counts["low_confidence_candidates"] += 1
        continue

    if rel not in ["REQUIRED", "SUPPORTING", "RELATED", "INSUFFICIENT_EVIDENCE"]:
        rel = "SUPPORTING"

    raw_ev = r.get("evidence", [])
    ev_list = raw_ev if isinstance(raw_ev, list) else []
    verified_evidence = [str(eid) for eid in ev_list if str(eid) in valid_chunk_map]

    if rel in ["REQUIRED", "SUPPORTING"] and len(verified_evidence) == 0:
        rel = "INSUFFICIENT_EVIDENCE"

    if rel == "INSUFFICIENT_EVIDENCE":
        diagnostic_counts["unsupported_evidence_rejected"] += 1
        continue

    edge_key = f"{pid}->{cid}"
    if edge_key in seen_edges:
        if conf > seen_edges[edge_key]["confidence"]:
            seen_edges[edge_key] = r
            seen_edges[edge_key]["evidence"] = verified_evidence
            seen_edges[edge_key]["relationship"] = rel
    else:
        seen_edges[edge_key] = {
            "concept_id": cid,
            "prerequisite_id": pid,
            "relationship": rel,
            "confidence": conf,
            "reason": reason,
            "evidence": verified_evidence
        }

final_edges = list(seen_edges.values())

# ============================================================
# PASS C: CYCLE DETECTOR & BREAKER (DAG ENFORCEMENT)
# ============================================================

def get_cycles():
    adj = defaultdict(list)
    for i, e in enumerate(final_edges):
        # build inverse mapping adjacency list holding Edge ID reference
        adj[e["prerequisite_id"]].append((e["concept_id"], i))
        
    color = {} # 0 = unvisited, 1 = visiting, 2 = visited
    parent = {}
    found_cycle = []

    def dfs(u):
        color[u] = 1
        for v, edge_i in adj[u]:
            if color.get(v, 0) == 1:
                # Cycle detected
                cycle_edges = [edge_i]
                curr = u
                while curr != v:
                    # Traverse backwards to extract edges
                    p_node, p_edge_i = parent[curr]
                    cycle_edges.append(p_edge_i)
                    curr = p_node
                return cycle_edges
            elif color.get(v, 0) == 0:
                parent[v] = (u, edge_i)
                res = dfs(v)
                if res: return res
        color[u] = 2
        return None

    for node in valid_concept_ids:
        if color.get(node, 0) == 0:
            cycle = dfs(node)
            if cycle: return cycle
    return None

cycles_detected_count = 0

while True:
    cycle_edge_indices = get_cycles()
    if not cycle_edge_indices:
        break
    
    cycles_detected_count += 1
    
    # Find weakest link in cycle
    weakest_conf = 999
    weakest_idx = -1
    
    for idx in cycle_edge_indices:
        c = final_edges[idx]["confidence"]
        if c < weakest_conf:
            weakest_conf = c
            weakest_idx = idx
            
    # Break it
    target = final_edges[weakest_idx]
    diagnostic_counts["cycle_rejected_candidates"] += 1
    cycles_removed.append({
        "relationship": f"{target['prerequisite_id']} -> {target['concept_id']}",
        "reason": "Created a cyclic dependency; lowest-confidence edge in cycle.",
        "confidence": target["confidence"]
    })

    del final_edges[weakest_idx]

if cycles_detected_count > 0:
    status = "warning"
    warnings_list.append({"code": "HIERARCHY_CYCLE", "message": f"Successfully broken {cycles_detected_count} isolated graph cycles."})

# ============================================================
# GRAPH METRICS & STATISTICS
# ============================================================
in_degree = {c: 0 for c in valid_concept_ids}
out_degree = {c: 0 for c in valid_concept_ids}

for e in final_edges:
    in_degree[e["concept_id"]] += 1
    out_degree[e["prerequisite_id"]] += 1

roots = sum(1 for c in valid_concept_ids if in_degree[c] == 0)
leaves = sum(1 for c in valid_concept_ids if out_degree[c] == 0)
isolated = sum(1 for c in valid_concept_ids if in_degree[c] == 0 and out_degree[c] == 0)

max_prereqs = max(in_degree.values()) if dict(in_degree) else 0
avg_prereqs = sum(in_degree.values()) / max(1, len(valid_concept_ids))

if isolated > len(valid_concept_ids) * 0.5 and len(valid_concept_ids) > 10:
    warnings_list.append({"code": "EXCESSIVE_ORPHANS", "message": "Graph is extremely sparse."})

if avg_prereqs > 4.0:
    warnings_list.append({"code": "GRAPH_DENSITY", "message": "Graph structure is suspiciously dense."})

# Traverse max depth natively inside broken DAG
memo_depth = {}
adj_depth = defaultdict(list)
for e in final_edges:
    adj_depth[e["prerequisite_id"]].append(e["concept_id"])
    
def find_depth(u):
    if u in memo_depth: return memo_depth[u]
    max_d = 1
    for v in adj_depth[u]:
        max_d = max(max_d, 1 + find_depth(v))
    memo_depth[u] = max_d
    return max_d

depths = [find_depth(r) for r in valid_concept_ids if in_degree[r] == 0]
max_path_depth = max(depths) if depths else 0

diagnostic_counts["final_valid_relationships"] = len(final_edges)

final_artifact = {
    "course": course_name,
    "source_concepts": len(valid_concept_ids),
    "relationship_count": len(final_edges),
    "relationships": final_edges,
    "diagnostics": {
        **diagnostic_counts,
        "model_status": model_status,
        "model_failure_reason": model_failure_reason,
        "candidate_relationships_seen": len(relations),
    },
    "quality": {
        "status": status,
        "model_status": model_status,
        "model_failure_reason": model_failure_reason,
        "cycles_detected": cycles_detected_count,
        "cycles_removed": len(cycles_removed),
        "removed_cycles_log": cycles_removed,
        "isolated_concepts": isolated,
        "warnings": warnings_list
    },
    "statistics": {
        "root_concepts": roots,
        "leaf_concepts": leaves,
        "average_prerequisites": round(avg_prereqs, 2),
        "max_prerequisites": max_prereqs,
        "max_depth": max_path_depth
    }
}

print(json.dumps(final_artifact, ensure_ascii=False, indent=2), flush=True)
print(json.dumps({"diagnostics": final_artifact["diagnostics"]}, ensure_ascii=False), file=sys.stderr, flush=True)
sys.exit(0)
