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
if len(sys.argv) < 5:
    print(json.dumps({"error": "Usage: python study_plan.py <c2.json> <c3.json> <c4.json> <c5.json>"}, ensure_ascii=False))
    sys.exit(1)

def load_json(p):
    try:
        raw = open(p, "rb").read()
        if raw.startswith(b'\xff\xfe'):
            raw = raw.decode('utf-16le', 'ignore')
        else:
            raw = raw.decode('utf-8', 'ignore')
        idx = raw.find('{')
        if idx != -1:
            # ONLY strip if the { comes before a [ to safely handle arrays
            idx_array = raw.find('[')
            if idx_array == -1 or idx < idx_array:
                raw = raw[idx:]
        return json.loads(raw)
    except Exception as e:
        raise e

c2 = load_json(sys.argv[1].strip())
c3 = load_json(sys.argv[2].strip())
c4 = load_json(sys.argv[3].strip())
c5 = load_json(sys.argv[4].strip())

c2_concepts = c2.get("concepts", [])
course_name = c2.get("course", "Unknown")

valid_cids = {str(c.get("concept_id")) for c in c2_concepts if c.get("concept_id")}

relationships = c4.get("relationships", [])
c5_warnings = c5.get("health", {}).get("warnings", [])
graph_status = c5.get("health", {}).get("status", "healthy")

# Build mapping of Concept -> Evidence Chunks
concept_evidence = {}
for c in c2_concepts:
    concept_evidence[c.get("concept_id")] = c.get("evidence_chunks", [])

# ============================================================
# PASS A: LLM STUDY UNIT CLUSTERING
# ============================================================
# Prompt explicit clustering rules grouping mapped dependencies natively
prompt = f"""
You are an expert Curriculum Designer assembling a highly structured Study Plan for "{course_name}".
You are provided {len(valid_cids)} distinct concepts already mathematically structured and organized into Domains.

Task: Group logically related concepts into "Study Units" representing roughly 30-45 minutes of learning focus.

Rules:
1. Every concept MUST belong to exactly ONE study unit. Do not omit any concepts. Do not invent any concepts.
2. Group them by their Domain and dependency overlap naturally.
3. Determine `difficulty` strictly based on conceptual complexity (BEGINNER, INTERMEDIATE, ADVANCED).
4. Do NOT attempt to output `prerequisite_unit_ids` or orderings yourselves; Python deterministically aggregates topologies securely. Just group them!
5. Output format explicitly:
[
  {{
    "title": "Unit Title",
    "domain": "Domain Name from Hierarchy",
    "concept_ids": ["c1", "c2"],
    "difficulty": "BEGINNER",
    "estimated_minutes": 35,
    "objectives": ["Explain x", "Understand y"]
  }}
]

Concepts Reference Array:
{json.dumps([{"id": c["concept_id"], "name": c.get("name", "Unknown")} for c in c2_concepts], ensure_ascii=False)}
"""

raw_response = ""
if mock_val == "MALFORMED":
    raw_response = "invalid {"
elif mock_val == "SUCCESS":
    raw_response = json.dumps([
        {"title": "Unit 1", "domain": "Dom 1", "concept_ids": ["c0", "c1"], "difficulty": "BEGINNER", "estimated_minutes": 30, "objectives": ["t"]},
        {"title": "Unit 2", "domain": "Dom 2", "concept_ids": ["c2"], "difficulty": "INTERMEDIATE", "estimated_minutes": 30, "objectives": ["t"]}
    ])
elif mock_val == "MISSING_CONCEPTS":
    raw_response = json.dumps([
        {"title": "Unit 1", "domain": "Dom 1", "concept_ids": ["c0"], "difficulty": "BEGINNER", "estimated_minutes": 30, "objectives": ["t"]}
    ]) # c1 left out -> will be bound into Unassigned natively
elif mock_val == "HALLUCINATE":
    raw_response = json.dumps([
        {"title": "Unit 1", "domain": "Dom 1", "concept_ids": ["c0", "fake1", "fake2"], "difficulty": "BEGINNER", "estimated_minutes": 30, "objectives": ["t"]},
        {"title": "Unit 2", "domain": "Dom 2", "concept_ids": ["c2"], "difficulty": "BEGINNER", "estimated_minutes": 30,"objectives": ["t"]}
    ])
elif mock_val == "UNIT_CYCLE":
    # Mocks Unit 1 -> Unit 2 -> Unit 1 cycle structurally (by embedding cyclical dependencies logically across clusters)
    # The math topological checks should merge them or break the dependency logically resolving the DAG locally.
    pass
else:
    try:
            from gemini_rest import generate_content
            raw_response = generate_content(prompt).strip()
        except Exception as e:
        print(f"Gemini API call failed: {e}", file=sys.stderr)
        raw_response = "[]"

if mock_val != "UNIT_CYCLE":
    raw_response = re.sub(r"^```json\s*", "", raw_response, flags=re.IGNORECASE)
    raw_response = re.sub(r"^```\s*", "", raw_response)
    raw_response = re.sub(r"\s*```$", "", raw_response)
    raw_response = raw_response.strip()

    try:
        clusters = json.loads(raw_response) if raw_response else []
    except json.JSONDecodeError:
        clusters = []
    
    if not isinstance(clusters, list):
        clusters = []
else:
    # Build explicit groupings exposing a grouping graph cycle logically assuming C4 edges were C0->C1 and C1->C2, but C2->C0 exists
    clusters = [
        {"title": "U1", "domain": "D1", "concept_ids": ["c0"], "difficulty": "BEGINNER", "estimated_minutes": 30, "objectives": []},
        {"title": "U2", "domain": "D2", "concept_ids": ["c1"], "difficulty": "BEGINNER", "estimated_minutes": 30, "objectives": []},
        {"title": "U3", "domain": "D3", "concept_ids": ["c2"], "difficulty": "BEGINNER", "estimated_minutes": 30, "objectives": []}
    ]

# ============================================================
# PASS B: DETERMINISTIC CONSTRAINT ENFORCEMENT & STRUCTURING
# ============================================================

mapped_cids = set()
units = []

# Validate boundaries organically restricting hallucinations natively
for i, c in enumerate(clusters):
    if not isinstance(c, dict): continue
    u_cids = []
    for cx in c.get("concept_ids", []):
        cx = str(cx)
        if cx in valid_cids and cx not in mapped_cids:
            u_cids.append(cx)
            mapped_cids.add(cx)
            
    if u_cids:
        units.append({
            "unit_id": f"unit_{i+1:03d}",
            "title": str(c.get("title", f"Study Unit {i+1}")).strip(),
            "domain": str(c.get("domain", "General Concepts")).strip(),
            "concept_ids": u_cids,
            "source_chunk_ids": [], # Filled below
            "prerequisite_unit_ids": set(),
            "difficulty": str(c.get("difficulty", "BEGINNER")).upper(),
            "estimated_minutes": int(c.get("estimated_minutes", 30)),
            "objectives": list(c.get("objectives", ["Understand explicit mappings."]))[:3]
        })

# Assign completely missing concepts into structural fallbacks dynamically ensuring perfect 1-to-1 data coverage gracefully
unassigned = valid_cids - mapped_cids
if unassigned:
    units.append({
        "unit_id": f"unit_999",
        "title": "Additional Foundational Elements",
        "domain": "Unclassified Concepts",
        "concept_ids": list(unassigned),
        "source_chunk_ids": [],
        "prerequisite_unit_ids": set(),
        "difficulty": "BEGINNER",
        "estimated_minutes": max(15, len(unassigned) * 10),
        "objectives": ["Gain isolated comprehension."]
    })

# Backfill chunk evidence IDs explicitly dynamically maintaining pipeline traceabilities cleanly mapping 
for u in units:
    chunks = set()
    for cid in u["concept_ids"]:
        chunks.update(concept_evidence.get(cid, []))
    u["source_chunk_ids"] = list(chunks)
    u["difficulty"] = u["difficulty"] if u["difficulty"] in ["BEGINNER", "INTERMEDIATE", "ADVANCED"] else "INTERMEDIATE"
    u["estimated_minutes"] = max(10, min(120, u["estimated_minutes"])) # Restrict times safely

# ============================================================
# PASS C: COMPUTE STUDY UNIT DAG MATHEMATICALLY OVER C4
# ============================================================
# Map concept -> unit_id
cid_to_uid = {}
for u in units:
    for cid in u["concept_ids"]:
        cid_to_uid[cid] = u["unit_id"]

for r in relationships:
    source = r["prerequisite_id"]
    target = r["concept_id"]
    if source in cid_to_uid and target in cid_to_uid:
        su_source = cid_to_uid[source]
        su_target = cid_to_uid[target]
        if su_source != su_target:
            u_tar = next(u for u in units if u["unit_id"] == su_target)
            u_tar["prerequisite_unit_ids"].add(su_source)

# Detect and break UNIT LEVEL CYCLES logically
def break_unit_cycles(unit_list):
    cycles_detected = True
    while cycles_detected:
        cycles_detected = False
        adj = {u["unit_id"]: list(u["prerequisite_unit_ids"]) for u in unit_list}
        color = {u["unit_id"]: 0 for u in unit_list}
        parent = {}
        
        def dfs(u):
            color[u] = 1
            for v in adj[u]: # v is prerequisite
                if color.get(v, 0) == 1:
                    return (u, v) # Found cycle! u relies on v, v relies on u ultimately
                elif color.get(v, 0) == 0:
                    res = dfs(v)
                    if res: return res
            color[u] = 2
            return None
            
        for u in adj.keys():
            if color[u] == 0:
                cycle_edge = dfs(u)
                if cycle_edge:
                    tar, pre = cycle_edge
                    # Break the cycle natively deleting the offending requirement mapping structurally 
                    tar_obj = next(obj for obj in unit_list if obj["unit_id"] == tar)
                    if pre in tar_obj["prerequisite_unit_ids"]:
                        tar_obj["prerequisite_unit_ids"].remove(pre)
                    cycles_detected = True
                    break

break_unit_cycles(units)

# Topologically Sort Units mapping linearly correctly resolving branches
in_degrees = {u["unit_id"]: len(u["prerequisite_unit_ids"]) for u in units}
adj_out = defaultdict(list)
for u in units:
    for pre in u["prerequisite_unit_ids"]:
        adj_out[pre].append(u["unit_id"])

q = deque([u_id for u_id, deg in in_degrees.items() if deg == 0])
order_mapping = []

while q:
    curr = q.popleft()
    order_mapping.append(curr)
    for nbr in adj_out[curr]:
        in_degrees[nbr] -= 1
        if in_degrees[nbr] == 0:
            q.append(nbr)

# Assign ordering sequentially converting independent bounds logically checking boundaries correctly
for idx, uid in enumerate(order_mapping):
    u = next(x for x in units if x["unit_id"] == uid)
    u["order"] = idx + 1
    u["prerequisite_unit_ids"] = list(u["prerequisite_unit_ids"])

# Filter missing ones disconnected dynamically explicitly assigning safely
for u in units:
    if "order" not in u:
        u["order"] = 999
        u["prerequisite_unit_ids"] = list(u["prerequisite_unit_ids"])

units = sorted(units, key=lambda x: x["order"])

# Expose C5 constraints gracefully checking isolated nodes
warnings_payload = c5_warnings
if graph_status != "healthy":
    warnings_payload.insert(0, {
        "type": "C5_NEEDS_REVIEW",
        "message": "Learning sequence possesses sparse constraints. Evaluated structural bounds flag review dependencies accurately."
    })

final_artifact = {
    "course": course_name,
    "source": {
        "concept_count": len(valid_cids),
        "study_unit_count": len(units)
    },
    "graph_status": graph_status,
    "units": units,
    "paths": {
        "recommended": [u["unit_id"] for u in units],
        "alternative": [], # Optional schema placeholder
        "independent": [u["unit_id"] for u in units if not u["prerequisite_unit_ids"]]
    },
    "warnings": warnings_payload
}

print(json.dumps(final_artifact, ensure_ascii=False, indent=2), flush=True)
sys.exit(0)
