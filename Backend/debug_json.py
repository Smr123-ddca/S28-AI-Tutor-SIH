import json
import sys

with open("src/data/Silberschatz_concepts.json", "r", encoding="utf-8") as f:
    text = f.read()

try:
    data = json.loads(text)
    print("Concepts:", len(data.get("concepts", [])))
    print("Eligible:", data.get("eligible_chunks", 0))
    for c in data.get("concepts", [])[:5]:
        print("-", c["name"], c["evidence_count"])
except json.JSONDecodeError as e:
    print(f"JSON Error at Line {e.lineno}, Col {e.colno}")
    lines = text.split("\n")
    if 0 <= e.lineno - 1 < len(lines):
        print(lines[e.lineno - 1])
        print(" " * (e.colno - 1) + "^")
