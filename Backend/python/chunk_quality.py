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
if len(sys.argv) < 2:
    print(json.dumps({"error": "Usage: python chunk_quality.py <chunks_json_path>"}, ensure_ascii=False))
    sys.exit(1)

chunks_path = sys.argv[1].strip()

# ============================================================
# PATHS
# ============================================================
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(BASE_DIR, "src", "data")

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

if not isinstance(chunks, list):
    chunks = []

# Deduplication and ID validation
missing_ids = 0
duplicate_ids = 0
seen_ids = set()

valid_chunks = []
for idx, c in enumerate(chunks):
    cid = c.get("id")
    if not cid:
        missing_ids += 1
        cid = f"missing_id_{idx}"
        c["id"] = cid

    if cid in seen_ids:
        duplicate_ids += 1
        continue
    
    seen_ids.add(cid)
    valid_chunks.append(c)

course_name = valid_chunks[0].get("topic", "Unknown_Course") if valid_chunks else "Unknown_Course"

demo_limit = os.getenv("FAST_DEMO_LIMIT")
if demo_limit and demo_limit.isdigit():
    valid_chunks = valid_chunks[:int(demo_limit)]
    print(f"FAST_DEMO_LIMIT active: Truncating to {demo_limit} chunks.", file=sys.stderr)

CLASSES = [
    "CORE_CONCEPT", "DEFINITION", "EXPLANATION", "PROCEDURE", "EXAMPLE", 
    "CODE", "EXERCISE", "SUMMARY", "REFERENCE", "NAVIGATION", "METADATA", "NOISE"
]

ELIGIBLE = ["CORE_CONCEPT", "DEFINITION", "EXPLANATION", "PROCEDURE", "CODE"]

BATCH_SIZE = 50
results = []

def float_clamp(val):
    try:
        v = float(val)
        if v < 0.0: return 0.0
        if v > 1.0: return 1.0
        return v
    except (ValueError, TypeError):
        return 0.0

def process_batch(batch):
    inputs = [{"id": c["id"], "text": str(c.get("text", ""))[:800]} for c in batch]
    prompt = f"""
You are an expert AI educational content evaluator.
Below is a list of text chunks from an educational course.
For each chunk, determine its primary educational role, assign numerical scores evaluating its quality for conceptual graph construction, and decide if it should be included for concept extraction.

Vocabulary for "classification" MUST BE EXACTLY ONE OF:
{", ".join(CLASSES)}

Scores: Provide floating-point values between 0.0 and 1.0 for:
- educational_value (useful to a student)
- conceptual_density (meaningful concepts within)
- prerequisite_relevance (identifying relationships)
- noise_score (irrelevant/unusable content)

Decision: "include_for_concept_extraction" (true/false)

Return ONLY valid JSON matching this schema exactly:
[
  {{
    "chunk_id": "chunk_XYZ",
    "classification": "CORE_CONCEPT",
    "educational_value": 0.0,
    "conceptual_density": 0.0,
    "prerequisite_relevance": 0.0,
    "noise_score": 0.0,
    "include_for_concept_extraction": true,
    "reason": "Concise reasoning here."
  }}
]

Chunks:
{json.dumps(inputs, ensure_ascii=False)}
"""
    raw_response = ""
    if mock_val == "MALFORMED":
        raw_response = "invalid {"
    elif mock_val == "MALFORMED_CHUNK":
        res = []
        for i, x in enumerate(inputs):
            if i == 0:
                res.append({"chunk_id": x["id"], "wrong_format": True})
            else:
                res.append({
                    "chunk_id": x["id"], "classification": "CORE_CONCEPT",
                    "educational_value": 0.9, "conceptual_density": 0.9,
                    "prerequisite_relevance": 0.9, "noise_score": 0.1,
                    "include_for_concept_extraction": True, "reason": "Mock"
                })
        raw_response = json.dumps(res)
    elif mock_val == "COLLAPSE":
        res = [{"chunk_id": x["id"], "classification": "NOISE", "educational_value": 0.1, "conceptual_density": 0.1, "prerequisite_relevance": 0.0, "noise_score": 0.9, "include_for_concept_extraction": False, "reason": "Collapse mock."} for x in inputs]
        raw_response = json.dumps(res)
    elif mock_val == "SUCCESS":
        res = []
        for x in inputs:
            cid = x["id"]
            txt = x["text"].lower()
            cl = "CORE_CONCEPT"
            inc = True
            if "copyright" in txt: cl, inc = "METADATA", False
            elif "table of contents" in txt: cl, inc = "NAVIGATION", False
            elif "gibberish" in txt: cl, inc = "NOISE", False
            elif "definition:" in txt: cl, inc = "DEFINITION", True
            elif "step 1" in txt: cl, inc = "PROCEDURE", True
            elif "def main():" in txt: cl, inc = "CODE", True
            elif "question 1" in txt: cl, inc = "EXERCISE", True
            elif "for example" in txt: cl, inc = "EXAMPLE", True
            elif "summary:" in txt: cl, inc = "SUMMARY", False
            
            res.append({
               "chunk_id": cid, "classification": cl,
               "educational_value": 0.9 if inc else 0.1, 
               "conceptual_density": 0.9 if inc else 0.1,
               "prerequisite_relevance": 0.9 if inc else 0.1, 
               "noise_score": 0.1 if inc else 0.9,
               "include_for_concept_extraction": inc,
               "reason": "Mock reason"
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

    return data

# Process batches
for i in range(0, len(valid_chunks), BATCH_SIZE):
    batch = valid_chunks[i:i+BATCH_SIZE]
    batch_dict = {c["id"]: c for c in batch}
    
    llm_data = process_batch(batch)
    llm_map = {item.get("chunk_id"): item for item in llm_data if isinstance(item, dict) and "chunk_id" in item}

    for c in batch:
        cid = c["id"]
        llm_item = llm_map.get(cid, {})

        classification = llm_item.get("classification", "NOISE")
        if classification not in CLASSES:
            classification = "NOISE"

        inc_raw = llm_item.get("include_for_concept_extraction", False)
        inc = bool(inc_raw) if isinstance(inc_raw, bool) else (str(inc_raw).lower() == "true")

        results.append({
            "chunk_id": cid,
            "classification": classification,
            "educational_value": float_clamp(llm_item.get("educational_value", 0.0)),
            "conceptual_density": float_clamp(llm_item.get("conceptual_density", 0.0)),
            "prerequisite_relevance": float_clamp(llm_item.get("prerequisite_relevance", 0.0)),
            "noise_score": float_clamp(llm_item.get("noise_score", 1.0)),
            "include_for_concept_extraction": inc,
            "reason": str(llm_item.get("reason", "Fallback/Missing output"))
        })

# Statistics and Quality Warnings
classification_dist = defaultdict(int)
for r in results:
    classification_dist[r["classification"]] += 1

included_chunks = sum(1 for r in results if r["include_for_concept_extraction"])
excluded_chunks = len(results) - included_chunks

warnings = []
status = "healthy"

if len(results) == 0:
    status = "warning"
    warnings.append({"code": "NO_CHUNKS", "message": "No chunks found or processed."})
else:
    if included_chunks == 0:
        status = "warning"
        warnings.append({"code": "NO_EDUCATIONAL_CHUNKS", "message": "No educationally meaningful chunks included."})

    # Check distribution
    max_class_count = max(classification_dist.values()) if classification_dist else 0
    if max_class_count > len(results) * 0.9 and len(results) > 10:
        status = "warning"
        warnings.append({"code": "CLASSIFICATION_COLLAPSE", "message": f"{max_class_count/len(results)*100:.1f}% of chunks received the same classification."})
    
    if classification_dist.get("NOISE", 0) > len(results) * 0.5 and len(results) > 10:
        status = "warning"
        warnings.append({"code": "EXCESSIVE_NOISE", "message": "More than 50% of chunks are classified as NOISE."})
        
    if classification_dist.get("METADATA", 0) > len(results) * 0.3 and len(results) > 10:
        status = "warning"
        warnings.append({"code": "EXCESSIVE_METADATA", "message": "More than 30% of chunks are classified as METADATA."})
        
    core_count = classification_dist.get("CORE_CONCEPT", 0) + classification_dist.get("DEFINITION", 0) + classification_dist.get("EXPLANATION", 0)
    if core_count < len(results) * 0.05 and len(results) > 20:
        status = "warning"
        warnings.append({"code": "LOW_CONCEPTUAL_COVERAGE", "message": "Very few chunks were classified as concepts or explanations."})

if missing_ids > 0:
    status = "warning"
    warnings.append({"code": "MISSING_IDS", "message": f"{missing_ids} chunks were missing IDs."})

if duplicate_ids > 0:
    status = "warning"
    warnings.append({"code": "DUPLICATE_IDS", "message": f"{duplicate_ids} duplicate chunk IDs were found and skipped."})

artifact = {
    "course": course_name,
    "source_chunks": len(chunks),
    "evaluated_chunks": len(results),
    "included_chunks": included_chunks,
    "excluded_chunks": excluded_chunks,
    "chunks": results,
    "classification_distribution": dict(classification_dist),
    "quality": {
        "status": status,
        "warnings": warnings
    }
}

# The stdout must be this clean JSON
print(json.dumps(artifact, ensure_ascii=False, indent=2), flush=True)
sys.exit(0)
