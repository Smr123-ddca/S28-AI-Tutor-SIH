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
if len(sys.argv) < 4:
    print(json.dumps({"error": "Usage: python graph_validation.py <c2.json> <c3.json> <c4.json>"}, ensure_ascii=False))
    sys.exit(1)

c2_path = sys.argv[1].strip()
c3_path = sys.argv[2].strip()
c4_path = sys.argv[3].strip()

# ============================================================
# LOAD INPUTS
# ============================================================
def load_json(p):
    try:
        raw = open(p, "rb").read()
        if raw.startswith(b'\xff\xfe'):
            raw = raw.decode('utf-16le', 'ignore')
        else:
            raw = raw.decode('utf-8', 'ignore')
        if raw.find('{') != -1:
            raw = raw[raw.find('{'):]
        return json.loads(raw)
    except Exception as e:
        print(json.dumps({"error": f"Failed to load {p}: {e}"}))
        sys.exit(1)

c2 = load_json(c2_path)
c3 = load_json(c3_path)
c4 = load_json(c4_path)

c2_concepts = c2.get("concepts", [])
course_name = c2.get("course", "Unknown")

c4_rels = c4.get("relationships", [])
valid_cids = {str(c.get("concept_id")) for c in c2_concepts if c.get("concept_id")}

# ============================================================
# PASS A: DETERMINISTIC GRAPH METRICS (PYTHON)
# ============================================================
adj_out = defaultdict(list)
adj_in = defaultdict(list)

for r in c4_rels:
    u = r["prerequisite_id"]
    v = r["concept_id"]
    if u in valid_cids and v in valid_cids:
        adj_out[u].append(v)
        adj_in[v].append(u)

# 1. Roots & Leaves & Isolated
roots = [c for c in valid_cids if len(adj_in[c]) == 0 and len(adj_out[c]) > 0]
leaves = [c for c in valid_cids if len(adj_out[c]) == 0 and len(adj_in[c]) > 0]
isolated = [c for c in valid_cids if len(adj_in[c]) == 0 and len(adj_out[c]) == 0]
connected = len(valid_cids) - len(isolated)

# 2. Components
vis = set()
components = 0
for node in valid_cids:
    if node not in vis:
        if node in isolated:
            vis.add(node)
            continue
        components += 1
        q = deque([node])
        vis.add(node)
        while q:
            curr = q.popleft()
            neighbors = adj_out[curr] + adj_in[curr]
            for nbr in neighbors:
                if nbr not in vis:
                    vis.add(nbr)
                    q.append(nbr)

# 3. Depth
memo_depth = {}
def get_depth(u):
    if u in memo_depth: return memo_depth[u]
    md = 1
    for v in adj_out[u]:
        md = max(md, 1 + get_depth(v))
    memo_depth[u] = md
    return md

max_depth = max([get_depth(r) for r in roots]) if roots else 0

# 4. Learning Paths (Topological subset generation)
# Grab some linear path trajectories
paths = []
def dfs_path(u, current_path):
    if len(current_path) >= 5 or not adj_out[u]:
        paths.append(list(current_path))
        return
    # Select arbitrary branch to prevent exponential tree dumping
    dfs_path(adj_out[u][0], current_path + [adj_out[u][0]])

for idx, r in enumerate(roots):
    if idx < 5: # bound traversal seeds selectively
        dfs_path(r, [r])

# ============================================================
# PASS B: GENERATIVE SEMANTIC DIAGNOSTICS
# ============================================================

prompt = f"""
You are an expert Educational Data Scientist analyzing an established DAG topology of prerequisites.
Evaluate the dependency mapping to test whether this constitutes a logically cohesive learning strategy without arbitrarily modifying or outputting structural redesigns natively.

Course: "{course_name}"
Concepts Provided: {len(valid_cids)}
Relationships: {len(c4_rels)}
Roots: {len(roots)}
Leaves: {len(leaves)}
Isolated: {len(isolated)}
Coverage: {connected}/{len(valid_cids)}

Graph Details:
{json.dumps(c4_rels[:150], ensure_ascii=False)}

Isolated Concepts Sample:
{json.dumps(isolated[:30], ensure_ascii=False)}

Simulated Linear Trajectories:
{json.dumps(paths[:5], ensure_ascii=False)}

Given this mathematical structure, identify weaknesses organically generating a strict JSON response adhering identically to this schema bounding requirements:
{{
  "health": {{"status": "healthy_or_needs_review", "warnings": [ {{"code": "warning_code", "message": "msg"}} ]}},
  "suspicious_roots": [ {{"concept_id": "c_id", "severity": "MEDIUM", "reason": "...", "possible_missing_prerequisites": [], "confidence": 0.8}} ],
  "isolated_concepts": [ {{"concept_id": "c_id", "status": "POSSIBLY_MISSING_DEPENDENCY", "reason": "...", "confidence": 0.5}} ],
  "suspicious_relationships": [ {{"concept_id": "target", "prerequisite_id": "source", "issue": "WEAK_PREREQUISITE", "severity": "LOW", "reason": "...", "confidence": 0.6}} ],
  "missing_intermediates": [ {{"type": "MISSING_INTERMEDIATE_CONCEPT", "before": "c_1", "after": "c_2", "suggested_existing_concept": "c_3", "reason": "...", "confidence": 0.8}} ],
  "conceptual_jumps": [ {{"prerequisite_id": "c_1", "concept_id": "c_2", "type": "LARGE_CONCEPTUAL_JUMP", "severity": "HIGH", "reason": "..."}} ],
  "high_connectivity": [ {{"concept_id": "c_1", "type": "HIGH_CONNECTIVITY", "incoming": 2, "outgoing": 10, "severity": "MEDIUM"}} ],
  "learning_paths": [ {{"path": ["c1", "c2", "c3"], "evaluation": "Cohesive."}} ],
  "recommendations": [ "General recommendation text" ]
}}
"""

raw_response = ""
if mock_val == "MALFORMED":
    raw_response = "invalid {"
elif mock_val == "EMPTY":
    raw_response = "{}"
elif mock_val == "SUCCESS":
    raw_response = json.dumps({
        "health": {"status": "healthy", "warnings": []},
        "suspicious_roots": [],
        "isolated_concepts": [],
        "suspicious_relationships": [],
        "missing_intermediates": [],
        "conceptual_jumps": [],
        "high_connectivity": [],
        "learning_paths": [],
        "recommendations": []
    })
elif mock_val == "WARNINGS":
    raw_response = json.dumps({
        "health": {"status": "needs_review", "warnings": [{"code": "SPARSE", "message": "Too isolated"}]},
        "suspicious_roots": [{"concept_id": "c2", "severity": "HIGH", "reason": "Should not be root", "confidence": 0.9}],
        "isolated_concepts": [{"concept_id": "iso1", "status": "POSSIBLY_MISSING_DEPENDENCY", "reason": "Orphan", "confidence": 0.8}],
        "suspicious_relationships": [{"concept_id": "c1", "prerequisite_id": "c3", "issue": "WEAK_PREREQUISITE", "severity": "MEDIUM", "reason": "Unrelated", "confidence": 0.7}],
        "missing_intermediates": [{"type": "MISSING_INTERMEDIATE_CONCEPT", "before": "c1", "after": "c9", "suggested_existing_concept": "c5", "reason": "Jump", "confidence": 0.9}],
        "conceptual_jumps": [{"prerequisite_id": "c1", "concept_id": "c9", "type": "LARGE_CONCEPTUAL_JUMP", "severity": "HIGH", "reason": "Huge bound"}],
        "high_connectivity": [{"concept_id": "c4", "type": "HIGH_CONNECTIVITY", "incoming": 8, "outgoing": 8, "severity": "MEDIUM"}],
        "learning_paths": [{"path": ["c1", "c2"], "evaluation": "Pedagogically ok"}],
        "recommendations": ["Review c9 limits"]
    })
else:
    try:
            from gemini_rest import generate_content
            raw_response = generate_content(prompt).strip()
        except Exception as e:
        print(f"Gemini API call failed: {e}", file=sys.stderr)
        raw_response = "{}"

raw_response = re.sub(r"^```json\s*", "", raw_response, flags=re.IGNORECASE)
raw_response = re.sub(r"^```\s*", "", raw_response)
raw_response = re.sub(r"\s*```$", "", raw_response)
raw_response = raw_response.strip()

try:
    evals = json.loads(raw_response) if raw_response else {}
except json.JSONDecodeError:
    evals = {}

if not isinstance(evals, dict):
    evals = {}

# ============================================================
# ASSEMBLE C5 OUTPUT
# ============================================================
coverage_ratio = connected / len(valid_cids) if valid_cids else 0

health = evals.get("health", {"status": "needs_review", "warnings": []})
if coverage_ratio < 0.40:
    health["status"] = "needs_review"
    health["warnings"].append({"code": "LOW_COVERAGE", "message": f"Graph density bounds extremely loose. ({coverage_ratio:.2f})"})

final_artifact = {
    "course": course_name,
    "summary": {
        "concept_count": len(valid_cids),
        "relationship_count": len(c4_rels),
        "connected_concepts": connected,
        "isolated_concepts": len(isolated),
        "coverage_ratio": round(coverage_ratio, 2),
        "root_concepts": len(roots),
        "leaf_concepts": len(leaves),
        "max_depth": max_depth,
        "connected_components": components
    },
    "health": health,
    "suspicious_roots": evals.get("suspicious_roots", []),
    "isolated_concepts": evals.get("isolated_concepts", []),
    "suspicious_relationships": evals.get("suspicious_relationships", []),
    "missing_intermediates": evals.get("missing_intermediates", []),
    "conceptual_jumps": evals.get("conceptual_jumps", []),
    "high_connectivity": evals.get("high_connectivity", []),
    "learning_paths": evals.get("learning_paths", []),
    "recommendations": evals.get("recommendations", [])
}

print(json.dumps(final_artifact, ensure_ascii=False, indent=2), flush=True)
sys.exit(0)
