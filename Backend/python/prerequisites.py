import os
import sys
import json
import re

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
        print(json.dumps({"error": "Failed to import required libraries. Ensure google-generativeai and python-dotenv are installed."}))
        sys.exit(1)
    except Exception as e:
        print(f"Failed to initialize Gemini client: {e}", file=sys.stderr)
        sys.exit(1)

# ============================================================
# ARGUMENT CHECK
# ============================================================
if len(sys.argv) < 2:
    print(json.dumps({"error": "Usage: python prerequisites.py <course_name>"}, ensure_ascii=False))
    sys.exit(1)

course_name = sys.argv[1].strip()
if not course_name:
    print(json.dumps({"error": "Course name cannot be empty."}, ensure_ascii=False))
    sys.exit(1)

# ============================================================
# PATHS
# ============================================================
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "src", "data")
chunks_path = os.path.join(DATA_DIR, f"{course_name}_chunks.json")
output_path = os.path.join(DATA_DIR, f"{course_name}_prerequisites.json")

# ============================================================
# CHECK CHUNKS FILE
# ============================================================
if not os.path.exists(chunks_path):
    print(json.dumps({"error": f"Chunks file not found: {chunks_path}"}, ensure_ascii=False))
    sys.exit(1)


# ============================================================
# LOAD CHUNKS
# ============================================================
try:
    with open(chunks_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)
except Exception as e:
    print(f"Failed to load chunks: {e}", file=sys.stderr)
    sys.exit(1)

if not isinstance(chunks, list) or len(chunks) == 0:
    print("Chunks JSON is empty or not an array.", file=sys.stderr)
    sys.exit(1)

valid_chunk_ids = {str(chunk.get("id")) for chunk in chunks if chunk.get("id")}

course_material = []
for chunk in chunks:
    course_material.append({
        "id": chunk.get("id"),
        "topic": chunk.get("topic", course_name),
        "chapter": chunk.get("chapter", ""),
        "section": chunk.get("section", ""),
        "section_label": chunk.get("section_label", ""),
        "text": chunk.get("text", "")[:1000] 
    })

# ============================================================
# PROMPT
# ============================================================
prompt = f"""
You are an expert educational curriculum designer.
You are analyzing the course: {course_name}
Below are chunks extracted from the course material.

Your task is to determine strictly REQUIRED prerequisite relationships between these chunks.
Only establish a prerequisite relation if understanding the prerequisite chunk is genuinely, fundamentally necessary before understanding the target chunk.

A prerequisite relationship means: "If a student wants to understand chunk A, they must understand chunk B first. Thus B is a prerequisite for A."
Do not create links merely if chunks are "related", or if they occur sequentially. 
Do not assume earlier chapters are automatically prerequisites. Do not create excessive dependencies.
Some chunks may not have any prerequisites, and that is perfectly acceptable.

IMPORTANT CONSTRAINTS:
1. Every concept_id and prerequisite_id MUST reference an existing ID supplied herein.
2. Return ONLY valid JSON structured exactly as a list of objects exactly matching this format:

[
  {{
    "concept_id": "chunk_X",
    "prerequisite_id": "chunk_Y",
    "relationship": "requires",
    "reason": "String explaining why exactly Y is strictly essential before learning X",
    "confidence": 0.95
  }}
]

Course material mapping:
{json.dumps(course_material, ensure_ascii=False, indent=2)}
"""

# ============================================================
# CALL GEMINI
# ============================================================

if mock_val == "MALFORMED":
    raw = "invalid json {"
elif mock_val == "CYCLE":
    raw = '[{"concept_id":"chunk_A", "prerequisite_id":"chunk_B", "reason":"m1"}, {"concept_id":"chunk_B", "prerequisite_id":"chunk_C", "reason":"m2"}, {"concept_id":"chunk_C", "prerequisite_id":"chunk_A", "reason":"m3"}]'
elif mock_val == "SUCCESS":
    raw = '[{"concept_id":"chunk_A", "prerequisite_id":"chunk_B", "reason":"mock logic"}]'
elif mock_val == "DUPLICATES":
    raw = '[{"concept_id":"chunk_A", "prerequisite_id":"chunk_B", "reason":"mock1"}, {"concept_id":"chunk_A", "prerequisite_id":"chunk_B", "reason":"mock2"}]'
elif mock_val == "EMPTY":
    raw = '[]'
else:
    try:
        response = model.generate_content(prompt)
        raw = response.text.strip()
    except Exception as e:
        print(f"Gemini API call failed: {e}", file=sys.stderr)
        sys.exit(1)

raw = re.sub(r"^```json\s*", "", raw, flags=re.IGNORECASE)
raw = re.sub(r"^```\s*", "", raw)
raw = re.sub(r"\s*```$", "", raw)
raw = raw.strip()

# ============================================================
# PARSE GEMINI JSON
# ============================================================
try:
    relationships_raw = json.loads(raw)
except Exception as e:
    print("Gemini did not return valid JSON.", file=sys.stderr)
    print(f"JSON error: {e}\nRaw Response:\n{raw}", file=sys.stderr)
    sys.exit(1)

if not isinstance(relationships_raw, list):
    print("Gemini generated a non-array root element.", file=sys.stderr)
    sys.exit(1)

# ============================================================
# VALIDATE GRAPH
# ============================================================
validated_relationships = []
seen_pairs = set()

adj = {}

for item in relationships_raw:
    if not isinstance(item, dict):
        continue
    c_id = str(item.get("concept_id", "")).strip()
    p_id = str(item.get("prerequisite_id", "")).strip()
    reason = str(item.get("reason", "")).strip()
    
    try:
        confidence = float(item.get("confidence", 0.0))
    except (ValueError, TypeError):
        confidence = 0.5
        
    if not (0.0 <= confidence <= 1.0):
        confidence = 1.0 if confidence > 1.0 else 0.0

    if not c_id or not p_id or not reason:
        continue
        
    if c_id not in valid_chunk_ids or p_id not in valid_chunk_ids:
        continue
        
    if c_id == p_id:
        continue
        
    pair = (c_id, p_id)
    if pair in seen_pairs:
        continue
        
    seen_pairs.add(pair)
    
    if c_id not in adj:
        adj[c_id] = []
    adj[c_id].append(p_id)
    
    validated_relationships.append({
        "concept_id": c_id,
        "prerequisite_id": p_id,
        "relationship": "requires",
        "reason": reason,
        "confidence": confidence
    })

# 5. Graph Cycle Detection (DFS)
def detect_cycles_and_clean(graph_edges):
    deps = {}
    for edge in graph_edges:
        if edge["concept_id"] not in deps:
            deps[edge["concept_id"]] = []
        deps[edge["concept_id"]].append(edge)

    safe_edges = []
    
    final_clean = []
    current_adj = {}
    
    for edge in graph_edges:
        u = edge["concept_id"]
        v = edge["prerequisite_id"]
        
        if u not in current_adj:
            current_adj[u] = []
        current_adj[u].append(v)
        
        def check_cycle(start, visited, stack):
            visited.add(start)
            stack.add(start)
            for neighbor in current_adj.get(start, []):
                if neighbor not in visited:
                    if check_cycle(neighbor, visited, stack):
                        return True
                elif neighbor in stack:
                    return True
            stack.remove(start)
            return False
            
        cycle_found = False
        v_set = set()
        s_set = set()
        for node in list(current_adj.keys()):
            if node not in v_set:
                if check_cycle(node, v_set, s_set):
                    cycle_found = True
                    break
                    
        if cycle_found:
            current_adj[u].remove(v)
        else:
            final_clean.append(edge)

    return final_clean

final_relationships = detect_cycles_and_clean(validated_relationships)

# ============================================================
# SAVE
# ============================================================
final_schema = {
    "course": course_name,
    "relationships": final_relationships
}

try:
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(final_schema, f, indent=2, ensure_ascii=False)
except Exception as e:
    print(f"Failed to save prerequisites: {e}", file=sys.stderr)
    sys.exit(1)

print(json.dumps({
    "status": "success",
    "course": course_name,
    "total_chunks": len(chunks),
    "output": output_path
}, ensure_ascii=False))
sys.exit(0)