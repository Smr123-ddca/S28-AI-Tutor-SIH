import os
import subprocess
import json
import tempfile

def run_test(mock_behavior, chunks, test_name):
    # Setup temp file
    with tempfile.NamedTemporaryFile("w+", delete=False, suffix=".json", encoding="utf-8") as f:
        json.dump(chunks, f)
        temp_path = f.name
        
    env = os.environ.copy()
    if mock_behavior:
        env["_MOCK_BEHAVIOR"] = mock_behavior
        
    script_path = os.path.join(os.path.dirname(__file__), "..", "python", "chunk_quality.py")
    
    print(f"\n--- Running {test_name} ---")
    result = subprocess.run(["python", script_path, temp_path], env=env, capture_output=True, text=True)
    
    try:
        output_json = json.loads(result.stdout)
        metrics = output_json.get("telemetry", {})
        chunks_res = output_json.get("chunks", [])
        print(f"Total chunks: {metrics.get('total_chunks')}")
        print(f"Educational: {metrics.get('educational_classified')}, Noise: {metrics.get('noise_classified')}")
        print(f"Failures: {metrics.get('classifier_failures')}, Fallback Included: {metrics.get('fallback_included_chunks')}")
        for c in chunks_res:
            print(f"  Chunk {c['chunk_id']} -> Class: {c['classification']}, Included: {c['include_for_concept_extraction']}")
        
    except json.JSONDecodeError:
        print("Failed to decode JSON from script output. STDOUT was:")
        print(result.stdout)
    finally:
        os.remove(temp_path)

if __name__ == "__main__":
    test_chunks = [
        {"id": "chunk_01", "text": "Definition: A min-heap is a complete binary tree..."},
        {"id": "chunk_02", "text": "Some gibberish noise that does not matter."}
    ]

    run_test("SUCCESS", test_chunks, "Test A & B (Valid Educational & Valid Noise)")
    
    run_test("MALFORMED", test_chunks, "Test C (Malformed LLM Response JSON)")
    
    run_test("MALFORMED_CHUNK", test_chunks, "Test E (Batch with one malformed result)")
