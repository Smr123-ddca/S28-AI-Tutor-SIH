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
        import google.generativeai as genai
        load_dotenv(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env")))
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            print("GEMINI_API_KEY is not configured.", file=sys.stderr)
            sys.exit(1)
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-3.5-flash')
    except ImportError:
        print(json.dumps({"error": "Failed to import required libraries."}))
        sys.exit(1)
    except Exception as e:
        print(f"Failed to initialize Gemini client: {e}", file=sys.stderr)
        sys.exit(1)

# ============================================================
# ARGUMENT CHECK
# ============================================================
if len(sys.argv) < 2:
    print(json.dumps({"error": "Usage: python concept_hierarchy.py <concepts.json>"}, ensure_ascii=False))
    sys.exit(1)

concepts_path = sys.argv[1].strip()

# ============================================================
# LOAD INPUTS
# ============================================================
try:
    with open(concepts_path, "r", encoding="utf-8") as f:
        file_data = json.load(f)
except Exception as e:
    print(json.dumps({"error": f"Failed to load concepts data: {e}"}))
    sys.exit(1)

if not isinstance(file_data, dict):
    file_data = {"concepts": [], "course": "Unknown"}

c2_concepts = file_data.get("concepts", [])
course_name = file_data.get("course", "Unknown")

valid_concept_ids = set()
for c in c2_concepts:
    cid = c.get("concept_id")
    if cid:
        valid_concept_ids.add(str(cid))

# ============================================================
# PASS A: CANDIDATE HIERARCHY EXTRACTION
# ============================================================
# Format payload for LLM strictly
inputs = []
for c in c2_concepts:
    inputs.append({
        "id": c.get("concept_id"),
        "name": c.get("name"),
        "desc": str(c.get("description", ""))[:300]
    })

prompt = f"""
You are an expert AI educational content structurer.
Below is a list of ALL canonical concepts extracted from the course "{course_name}".
Your task is to organize these concepts into a meaningful, logical conceptual structure.

Rules:
1. Output a flat array of nodes.
2. The hierarchy starts with ONE ROOT node representing the course.
   - type = "ROOT", name = "{course_name}"
3. Below the ROOT, create organizational DOMAIN nodes to group similar subjects.
   - type = "DOMAIN", name = "Domain Name (e.g. Memory Management)"
4. Map the provided input CONCEPTS directly into those domains by creating CONCEPT nodes.
   - type = "CONCEPT", concept_id = "concept_ABC" (must match input precisely), name = "Concept Name"
5. Link nodes by mapping 'parent_id' to the id of the parent DOMAIN or ROOT.
6. A concept node can specify an array of 'secondary_parents' IF it clearly blends into multiple domains natively. Do not invent prerequisite logic.

Return strictly JSON matching this schema:
[
  {{ "node_id": "root_01", "type": "ROOT", "name": "{course_name}", "parent_id": null }},
  {{ "node_id": "domain_01", "type": "DOMAIN", "name": "Concurrency", "parent_id": "root_01" }},
  {{ "node_id": "concept_node_1", "type": "CONCEPT", "concept_id": "exact_input_id", "name": "Semaphores", "parent_id": "domain_01", "secondary_parents": [] }}
]

Source Concepts:
{json.dumps(inputs, ensure_ascii=False)}
"""

raw_response = ""
if mock_val == "MALFORMED":
    raw_response = "invalid {"
elif mock_val == "NO_OUTPUT":
    raw_response = "[]"
elif mock_val == "HALLUCINATE":
    raw_response = json.dumps([
        {"node_id": "root_1", "type": "ROOT", "name": course_name, "parent_id": None},
        {"node_id": "c1", "type": "CONCEPT", "concept_id": "fake_concept_999", "name": "Fake", "parent_id": "root_1"}
    ])
elif mock_val == "ORPHAN" or mock_val == "SUCCESS":
    res = [
        {"node_id": "root_1", "type": "ROOT", "name": course_name, "parent_id": None},
        {"node_id": "dom_1", "type": "DOMAIN", "name": "Domain A", "parent_id": "root_1"},
    ]
    for i, c in enumerate(inputs):
        if mock_val == "ORPHAN" and i == 0:
            continue
        res.append({
            "node_id": f"cn_{i}", "type": "CONCEPT", "concept_id": c["id"], 
            "name": c["name"], "parent_id": "dom_1", "secondary_parents": []
        })
    raw_response = json.dumps(res)
elif mock_val == "DUPLICATES":
    res = [
        {"node_id": "root_1", "type": "ROOT", "name": course_name, "parent_id": None},
        {"node_id": "dom_1", "type": "DOMAIN", "name": "Domain A", "parent_id": "root_1"},
        {"node_id": "dom_2", "type": "DOMAIN", "name": "Domain A", "parent_id": "root_1"}
    ]
    for i, c in enumerate(inputs):
        res.append({
            "node_id": f"cn_{i}", "type": "CONCEPT", "concept_id": c["id"], 
            "name": c["name"], "parent_id": "dom_1", "secondary_parents": ["dom_2"]
        })
        # Add a duplicate logical concept node mapped identically
        res.append({
            "node_id": f"cn_{i}_dup", "type": "CONCEPT", "concept_id": c["id"], 
            "name": c["name"], "parent_id": "root_1"
        })
    raw_response = json.dumps(res)
elif mock_val == "CYCLE":
    raw_response = json.dumps([
        {"node_id": "root_1", "type": "ROOT", "name": course_name, "parent_id": "dom_1"},
        {"node_id": "dom_1", "type": "DOMAIN", "name": "Domain A", "parent_id": "root_1"}
    ])
elif mock_val == "PREREQ":
    res = [{"node_id": "root_1", "type": "ROOT", "name": course_name, "parent_id": None, "requires": ["dom_1"]}]
    raw_response = json.dumps(res)
elif mock_val == "DEPTH":
    res = [
        {"node_id": "root_1", "type": "ROOT", "name": course_name, "parent_id": None},
        {"node_id": "dom_1", "type": "DOMAIN", "name": "1", "parent_id": "root_1"},
        {"node_id": "dom_2", "type": "DOMAIN", "name": "2", "parent_id": "dom_1"},
        {"node_id": "dom_3", "type": "DOMAIN", "name": "3", "parent_id": "dom_2"},
        {"node_id": "dom_4", "type": "DOMAIN", "name": "4", "parent_id": "dom_3"}
    ]
    for c in inputs:
        res.append({"node_id": f"c_{c['id']}", "type": "CONCEPT", "concept_id": c["id"], "name": c["name"], "parent_id": "dom_4"})
    raw_response = json.dumps(res)
else:
    try:
        response = model.generate_content(prompt)
        raw_response = response.text.strip()
    except Exception as e:
        print(f"Gemini API call failed: {e}", file=sys.stderr)
        raw_response = "[]"

raw_response = re.sub(r"^```json\s*", "", raw_response, flags=re.IGNORECASE)
raw_response = re.sub(r"^```\s*", "", raw_response)
raw_response = re.sub(r"\s*```$", "", raw_response)
raw_response = raw_response.strip()

try:
    nodes = json.loads(raw_response) if raw_response else []
except json.JSONDecodeError:
    nodes = []

if not isinstance(nodes, list):
    nodes = []

# ============================================================
# PASS B: DETERMINISTIC VALIDATION & TREE BUILDING
# ============================================================
warnings = []
status = "healthy"
cross_refs = 0

# 1. Reject Hallucinations
filtered_nodes = []
for n in nodes:
    if not isinstance(n, dict): continue
    
    nm = str(n.get("name", "Unknown Node")).strip()
    nid = str(n.get("node_id", f"gen_{len(filtered_nodes)}")).strip()
    ty = str(n.get("type", "DOMAIN")).upper()
    pid = str(n.get("parent_id", "")) if n.get("parent_id") else None
    cid = str(n.get("concept_id", "")).strip() if n.get("concept_id") else None
    
    if ty == "CONCEPT":
        if cid not in valid_concept_ids:
            continue # Prune hallucinations silently out of graph
            
    filtered_nodes.append({
        "node_id": nid, "type": ty, "name": nm, "parent_id": pid, "concept_id": cid,
        "secondary_parents": n.get("secondary_parents", []),
        "children": [] # prep storage
    })

# 2. Duplicate Domain Merging
# If two domains exist with identical normalized names inside the same parent, merge them.
# We'll just index them by parent_id + name
node_dict = {n["node_id"]: n for n in filtered_nodes}

domain_lookup = {}
for n in list(filtered_nodes):
    if n["type"] == "DOMAIN":
        key = f"{n['parent_id']}__{n['name'].strip().lower()}"
        if key in domain_lookup:
            # Duplicate
            orig_id = domain_lookup[key]
            n["merge_target"] = orig_id
        else:
            domain_lookup[key] = n["node_id"]

# Rewrite parents for merged targets
for n in filtered_nodes:
    if n["parent_id"] and n["parent_id"] in node_dict:
        if "merge_target" in node_dict[n["parent_id"]]:
            n["parent_id"] = node_dict[n["parent_id"]]["merge_target"]
            
    if "secondary_parents" in n:
        new_secs = []
        for spid in n["secondary_parents"]:
            if spid in node_dict and "merge_target" in node_dict[spid]:
                new_secs.append(node_dict[spid]["merge_target"])
            else:
                new_secs.append(spid)
        n["secondary_parents"] = new_secs

filtered_nodes = [n for n in filtered_nodes if "merge_target" not in n]
node_dict = {n["node_id"]: n for n in filtered_nodes}

# 3. Detect Cycles / Root Construction
root_nodes = [n for n in filtered_nodes if n["type"] == "ROOT"]
if not root_nodes:
    root_nodes = [{"node_id": "root_fallback", "type": "ROOT", "name": course_name, "parent_id": None, "children": []}]
    filtered_nodes.append(root_nodes[0])
    node_dict["root_fallback"] = root_nodes[0]
root = root_nodes[0]

adj = defaultdict(list)
for n in filtered_nodes:
    pid = n.get("parent_id")
    if pid and pid in node_dict and n["node_id"] != pid: # Prevent direct self loop
        adj[pid].append(n["node_id"])

# Cycle detection via graph coloring
vis = {}
in_cycle = set()
def dfs_cycle(u):
    vis[u] = 1 # path
    for v in adj[u]:
        if vis.get(v) == 1:
            in_cycle.add(v)
            in_cycle.add(u)
        elif v not in vis:
            dfs_cycle(v)
    vis[u] = 2 # safe

dfs_cycle(root["node_id"])
if in_cycle:
    status = "warning"
    warnings.append({"code": "HIERARCHY_CYCLE", "message": "Cycles were detected and purged within the generated taxonomy."})
    # Break cycles brutally mapping to root
    for u in in_cycle:
        if u in node_dict:
            node_dict[u]["parent_id"] = root["node_id"]

# Rebuild adj cleanly after cycle breaking
adj = defaultdict(list)
for n in filtered_nodes:
    if n["node_id"] != root["node_id"]:
        pid = n.get("parent_id")
        if not pid or pid not in node_dict:
            pid = root["node_id"]
        adj[pid].append(n["node_id"])

# 4. Coverage constraints
placed_cids = set()
duplicates = 0
for n in filtered_nodes:
    if n["type"] == "CONCEPT" and n["concept_id"]:
        if n["concept_id"] in placed_cids:
            duplicates += 1
            n["flagged_delete"] = True
        else:
            placed_cids.add(n["concept_id"])

if duplicates > 0:
    status = "warning"
    warnings.append({"code": "DUPLICATE_CONCEPT_REFERENCES", "message": f"{duplicates} cloned concepts deleted."})

filtered_nodes = [n for n in filtered_nodes if not n.get("flagged_delete")]
node_dict = {n["node_id"]: n for n in filtered_nodes}

# Identify unplaced
missing_cids = valid_concept_ids - placed_cids
if missing_cids:
    status = "warning"
    warnings.append({"code": "MISSING_CONCEPTS", "message": f"{len(missing_cids)} unplaced concepts defaulted to Unclassified pool."})
    
    unc_dom_id = "dom_unclassified_fallback"
    node_dict[unc_dom_id] = {"node_id": unc_dom_id, "type": "DOMAIN", "name": "Other / Unclassified", "parent_id": root["node_id"], "children": []}
    adj[root["node_id"]].append(unc_dom_id)
    filtered_nodes.append(node_dict[unc_dom_id])
    
    # Build maps quickly from full data
    cmap = {str(c["concept_id"]): c for c in c2_concepts}
    for m in missing_cids:
        c_payload = cmap[m]
        nid = f"concept_fallback_{m}"
        nn = {"node_id": nid, "type": "CONCEPT", "concept_id": m, "name": c_payload["name"], "parent_id": unc_dom_id, "children": []}
        node_dict[nid] = nn
        adj[unc_dom_id].append(nid)
        filtered_nodes.append(nn)

# Rebuild adj clean before building tree to ensure no deleted elements exist
adj = defaultdict(list)
for n in filtered_nodes:
    if n["node_id"] != root["node_id"]:
        pid = n.get("parent_id")
        if not pid or pid not in node_dict:
            pid = root["node_id"]
        adj[pid].append(n["node_id"])

# 5. Build Final Tree using DFS avoiding orphaned islands
max_depth = 0
def build_tree(nid, depth):
    global max_depth
    max_depth = max(max_depth, depth)
    node = node_dict[nid]
    out = {
        "node_id": node["node_id"],
        "type": node["type"],
        "name": node["name"]
    }
    if node["type"] == "CONCEPT":
        out["concept_id"] = node["concept_id"]
        
    children = []
    for c in adj[nid]:
        children.append(build_tree(c, depth+1))
        
    # Snip empty domains
    valid_children = [c for c in children if c["type"] == "CONCEPT" or (c["type"] == "DOMAIN" and len(c["children"]) > 0)]
    out["children"] = valid_children
    
    return out

final_tree = build_tree(root["node_id"], 1)

if max_depth > 5:
    status = "warning"
    warnings.append({"code": "EXCESSIVE_DEPTH", "message": "Graph reached sub-optimal recursive depth depths > 5."})

final_artifact = {
    "course": course_name,
    "source_concepts": len(valid_concept_ids),
    "hierarchy": final_tree,
    "coverage": {
        "placed_concepts": len(valid_concept_ids), # Missing gracefully forced 
        "unplaced_concepts": 0,
        "coverage_ratio": 1.0
    },
    "quality": {
        "status": status,
        "warnings": warnings,
        "metrics": {
            "max_depth": max_depth,
            "domain_count": len([n for n in filtered_nodes if n["type"] == "DOMAIN"]),
            "cross_reference_count": sum(len(n.get("secondary_parents", [])) for n in filtered_nodes)
        }
    }
}

print(json.dumps(final_artifact, ensure_ascii=False, indent=2), flush=True)
sys.exit(0)
