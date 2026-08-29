import os
import sys
import json
import re
from collections import defaultdict

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
if len(sys.argv) < 3:
    print(json.dumps({"error": "Usage: python concept_extraction.py <chunks.json> <quality.json>"}, ensure_ascii=False))
    sys.exit(1)

chunks_path = sys.argv[1].strip()
quality_path = sys.argv[2].strip()

# ============================================================
# LOAD INPUTS
# ============================================================
try:
    with open(chunks_path, "r", encoding="utf-8") as f:
        chunks = json.load(f)
    if not isinstance(chunks, list):
        chunks = []
except Exception as e:
    print(f"Failed to load chunks: {e}", file=sys.stderr)
    sys.exit(1)

try:
    with open(quality_path, "r", encoding="utf-8") as f:
        quality = json.load(f)
except Exception as e:
    print(f"Failed to load chunk quality data: {e}", file=sys.stderr)
    sys.exit(1)

# ============================================================
# PREPROCESSING MAPS
# ============================================================
chunk_text_map = {}
for c in chunks:
    if "id" in c:
        chunk_text_map[c["id"]] = c.get("text", "")

quality_chunks = quality.get("chunks", [])
eligible_chunks = []

for q in quality_chunks:
    cid = q.get("chunk_id")
    if not cid or cid not in chunk_text_map:
        continue
    
    inc_raw = q.get("include_for_concept_extraction", False)
    inc = bool(inc_raw) if isinstance(inc_raw, bool) else (str(inc_raw).lower() == "true")
    
    if inc:
        eligible_chunks.append({
            "chunk_id": cid,
            "classification": q.get("classification", "UNKNOWN"),
            "text": chunk_text_map[cid]
        })

course_name = quality.get("course", "Unknown_Course")

def float_clamp(val):
    try:
        v = float(val)
        if v < 0.0: return 0.0
        if v > 1.0: return 1.0
        return v
    except (ValueError, TypeError):
        return 0.0

BATCH_SIZE = 25
all_candidates = []

# ============================================================
# PASS A: CANDIDATE EXTRACTION (GEMINI OR MOCK)
# ============================================================
def process_batch(batch):
    # Formulate inputs strictly constraining text length
    inputs = [{"id": c["chunk_id"], "type": c["classification"], "text": str(c.get("text", ""))[:1200]} for c in batch]
    
    prompt = f"""
You are an expert AI educational concepts extractor.
Below is a list of text chunks from an educational course which have been predetermined to be educationally valid.

Your task is to identify the overarching CANONICAL CONCEPTS discussed in these chunks.
- A chunk can contain ZERO, ONE, OR MULTIPLE concepts. Group concepts naturally.
- A concept should represent a meaningful, teachable unit of knowledge (e.g. "Binary Search", "Process Scheduling").
- Do not create enormous umbrella concepts (e.g. "Computer Science"), but also do not over-split into extreme minutiae unless independently meaningful.
- A concept MUST be strictly supported by one or more provided chunks. Do NOT invent concepts that are not in the text.
- If multiple chunks discuss the EXACT SAME concept, merge them under one concept grouping here in your output.

For each concept, provide:
- "name": The canonical name of the core concept.
- "description": A concise, factual educational description derived strictly from the chunks.
- "confidence": Float between 0.0 and 1.0 assessing your certainty this is a standalone concept supported by the text.
- "evidence_chunk_ids": An array of chunk IDs that support this concept.

Output strictly as a valid JSON array matching this schema:
[
  {{
    "name": "Concept Name",
    "description": "Short factual description.",
    "confidence": 0.95,
    "evidence_chunk_ids": ["chunk_ABC", "chunk_DEF"]
  }}
]

Chunks:
{json.dumps(inputs, ensure_ascii=False)}
"""
    raw_response = ""
    # Mocks for tests
    if mock_val == "MALFORMED":
        raw_response = "invalid {"
    elif mock_val == "NO_CONCEPTS":
        raw_response = "[]"
    elif mock_val == "SINGLE_TO_MULTI":
        res = []
        for x in inputs:
            res.append({"name": f"{x['id']}_Concept_1", "description": "Desc 1", "confidence": 1.0, "evidence_chunk_ids": [x["id"]]})
            res.append({"name": f"{x['id']}_Concept_2", "description": "Desc 2", "confidence": 1.0, "evidence_chunk_ids": [x["id"]]})
        raw_response = json.dumps(res)
    elif mock_val == "INVALID_ID":
        res = [{"name": "Ghost Concept", "description": "Ghost desc", "confidence": 1.0, "evidence_chunk_ids": ["does_not_exist"]}]
        raw_response = json.dumps(res)
    elif mock_val == "SUCCESS" or mock_val == "MERGE" or mock_val == "COLLAPSE":
        # Deterministic mock building based on chunks
        res = []
        for x in inputs:
            txt = x["text"].lower()
            if "no concepts" in txt:
                continue
            
            # Simple keyword mock logic
            name = "Generic Concept"
            if "binary search" in txt: name = "Binary Search"
            elif "linked list" in txt: name = "Linked List"
            elif "duplicate" in txt: name = "Duplicate Concept"
            elif mock_val == "COLLAPSE": name = "Everything Concept"
            else: name = f"Concept from {x['id']}"

            # Create or Merge
            found = False
            for r in res:
                if r["name"] == name:
                    r["evidence_chunk_ids"].append(x["id"])
                    found = True
                    break
            
            if not found:
                res.append({
                    "name": name,
                    "description": "Mock description.",
                    "confidence": 0.99,
                    "evidence_chunk_ids": [x["id"]]
                })
        raw_response = json.dumps(res)
    else:
        try:
            response = model.generate_content(prompt)
            raw_response = response.text.strip()
        except Exception as e:
            print(f"Gemini API call failed for batch: {e}", file=sys.stderr)
            raw_response = "[]"

    raw_response = re.sub(r"^```json\s*", "", raw_response, flags=re.IGNORECASE)
    raw_response = re.sub(r"^```\s*", "", raw_response)
    raw_response = re.sub(r"\s*```$", "", raw_response)
    raw_response = raw_response.strip()

    try:
        data = json.loads(raw_response) if raw_response else []
    except json.JSONDecodeError:
        data = []

    if not isinstance(data, list):
        data = []

    for item in data:
        if isinstance(item, dict) and item.get("name") and item.get("evidence_chunk_ids"):
            item["confidence"] = float_clamp(item.get("confidence", 0.9))
            all_candidates.append(item)

# Iterate to build candidates
if eligible_chunks:
    for i in range(0, len(eligible_chunks), BATCH_SIZE):
        batch = eligible_chunks[i:i+BATCH_SIZE]
        process_batch(batch)

# ============================================================
# PASS B: DETERMINISTIC CANONICALIZATION (PYTHON)
# ============================================================
# Normalizer to catch variations like "Binary Search Algorithm" vs "binary search"
def normalize_name(name):
    # lowercase, alphanumeric
    words = re.findall(r'[a-z0-9]+', str(name).lower())
    ignore = {"algorithm", "the", "a", "an", "of", "and", "in", "concept", "technique"}
    filtered = [w for w in words if w not in ignore]
    if not filtered:
        return re.sub(r'[^a-zA-Z0-9]+', '', str(name).lower())
    # returning sorted token string prevents "Search Binary" != "Binary Search" 
    # but we will just return order-preserved string to prioritize semantic reading natively.
    return " ".join(filtered)

# Global map containing canonical elements
canonical_map = {}
concept_counter = 1

# Maintain lookup for C1 classes
class_map = {c["chunk_id"]: c["classification"] for c in eligible_chunks}

# Filter out dead evidence IDs and perform deduplication
for candidate in all_candidates:
    raw_name = str(candidate.get("name", "")).strip()
    if not raw_name:
        continue
        
    norm = normalize_name(raw_name)
    if not norm:
        continue

    # Clean evidence IDs
    ev_ids = [str(eid) for eid in candidate.get("evidence_chunk_ids", []) if str(eid) in class_map]
    if not ev_ids:
        continue # If zero valid evidence survives, reject concept entirely dynamically per instructions
        
    conf = float_clamp(candidate.get("confidence", 0.0))
    desc = str(candidate.get("description", raw_name)).strip()

    if norm in canonical_map:
        # Merge
        existing = canonical_map[norm]
        existing["confidence"] = max(existing["confidence"], conf) # take highest confidence
        if len(desc) > len(existing["description"]): 
            # take longest/most descriptive
            existing["description"] = desc 
        
        # Merge evidence preserving deduplication
        existing["evidence_pool"].update(ev_ids)
    else:
        # Create new
        concept_id = f"concept_{concept_counter:04d}"
        concept_counter += 1
        
        canonical_map[norm] = {
            "concept_id": concept_id,
            "name": raw_name, # Keep original capitilization styling
            "description": desc,
            "confidence": conf,
            "evidence_pool": set(ev_ids)
        }


# ============================================================
# BUILD FINAL ARTIFACT
# ============================================================
final_concepts = []
duplicate_ids_removed = 0
invalid_evidence_dropped = 0 # Handled in map filtering naturally

for norm, data in canonical_map.items():
    evidence_list = []
    # Build strict evidence structured array
    for eid in sorted(list(data["evidence_pool"])):
        evidence_list.append({
            "chunk_id": eid,
            "classification": class_map[eid]
        })
    
    final_concepts.append({
        "concept_id": data["concept_id"],
        "name": data["name"],
        "description": data["description"],
        "confidence": data["confidence"],
        "evidence_count": len(evidence_list),
        "evidence": evidence_list
    })

# Warning diagnostics
warnings = []
status = "healthy"

if not final_concepts and eligible_chunks:
    status = "warning"
    warnings.append({"code": "NO_CONCEPTS_EXTRACTED", "message": "Failed to extract any usable concepts."})

if len(final_concepts) == 1 and len(eligible_chunks) > 10:
    status = "warning"
    warnings.append({"code": "CONCEPTUAL_COLLAPSE", "message": "All chunks collapsed into exactly one umbrella concept."})

if len(final_concepts) > len(eligible_chunks) and len(eligible_chunks) > 0:
    status = "warning"
    warnings.append({"code": "OVER_SPLITTING", "message": "Detected more concepts generated than valid input chunks."})

artifact = {
    "course": course_name,
    "source_chunks": len(chunks),
    "eligible_chunks": len(eligible_chunks),
    "concept_count": len(final_concepts),
    "concepts": final_concepts,
    "quality": {
        "status": status,
        "warnings": warnings
    }
}

print(json.dumps(artifact, ensure_ascii=False, indent=2), flush=True)
sys.exit(0)
