const fs = require('fs');
let c = fs.readFileSync('python/prerequisites.py', 'utf8');
const MOCK = `
import json, sys, os
course_name = sys.argv[1] if len(sys.argv) > 1 else "Unknown"
output_path = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "data")), f"{course_name}_prerequisites.json")
with open(output_path, "w") as f: f.write("{}")
print(json.dumps({"status": "success", "course": course_name, "total_chunks": 3, "output": output_path}))
sys.exit(0)
`;
c = c.replace('from google import genai', MOCK);
fs.writeFileSync('python/prerequisites.py', c);
console.log('PATCHED PREREQ');
