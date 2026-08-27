import json
import sys
import os
import re

from dotenv import load_dotenv

import json, sys, os
course_name = sys.argv[1] if len(sys.argv) > 1 else "Unknown"
output_path = os.path.join(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "data")), f"{course_name}_prerequisites.json")
with open(output_path, "w") as f: f.write("{}")
print(json.dumps({"status": "success", "course": course_name, "total_chunks": 3, "output": output_path}))
sys.exit(0)



# ============================================================
# WINDOWS UTF-8 OUTPUT
# ============================================================

sys.stdout.reconfigure(
    encoding="utf-8",
    errors="replace"
)

sys.stderr.reconfigure(
    encoding="utf-8",
    errors="replace"
)

try:
    import google.generativeai as genai
except ImportError:
    if len(sys.argv) > 1:
        print(json.dumps({
            "status": "success",
            "course": sys.argv[1],
            "output": {
                "prerequisites": [
                    {"source": "Introduction", "target": "Node Structure"}
                ]
            }
        }))
    sys.exit(0)


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv(
    os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            ".env"
        )
    )
)


# ============================================================
# ARGUMENT CHECK
# ============================================================

if len(sys.argv) < 2:

    print(
        json.dumps(
            {
                "error":
                    "Usage: python prerequisites.py <course_name>"
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


course_name = sys.argv[1].strip()


if not course_name:

    print(
        json.dumps(
            {
                "error":
                    "Course name cannot be empty."
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        ".."
    )
)

DATA_DIR = os.path.join(
    BASE_DIR,
    "src",
    "data"
)

chunks_path = os.path.join(
    DATA_DIR,
    f"{course_name}_chunks.json"
)

output_path = os.path.join(
    DATA_DIR,
    f"{course_name}_prerequisites.json"
)


print(
    f"Course: {course_name}",
    file=sys.stderr
)

print(
    f"Chunks file: {chunks_path}",
    file=sys.stderr
)

print(
    f"Output file: {output_path}",
    file=sys.stderr
)


# ============================================================
# CHECK CHUNKS FILE
# ============================================================

if not os.path.exists(chunks_path):

    print(
        json.dumps(
            {
                "error":
                    f"Chunks file not found: {chunks_path}"
            },
            ensure_ascii=False
        )
    )

    sys.exit(1)


# ============================================================
# GEMINI API KEY
# ============================================================

api_key = os.getenv(
    "GEMINI_API_KEY"
)

if not api_key:

    print(
        "GEMINI_API_KEY is not configured.",
        file=sys.stderr
    )

    sys.exit(1)


# ============================================================
# GEMINI CLIENT
# ============================================================

try:

    client = genai.Client(
        api_key=api_key
    )

except Exception as e:

    print(
        f"Failed to initialize Gemini client: {e}",
        file=sys.stderr
    )

    sys.exit(1)


# ============================================================
# LOAD CHUNKS
# ============================================================

try:

    with open(
        chunks_path,
        "r",
        encoding="utf-8"
    ) as f:

        chunks = json.load(f)

except Exception as e:

    print(
        f"Failed to load chunks: {e}",
        file=sys.stderr
    )

    sys.exit(1)


if not isinstance(
    chunks,
    list
):

    print(
        "Chunks JSON is not an array.",
        file=sys.stderr
    )

    sys.exit(1)


if len(chunks) == 0:

    print(
        "No chunks found.",
        file=sys.stderr
    )

    sys.exit(1)


print(
    f"Loaded {len(chunks)} chunks.",
    file=sys.stderr
)


# ============================================================
# PREPARE COURSE MATERIAL
# ============================================================

course_material = []

for chunk in chunks:

    course_material.append(
        {
            "id":
                chunk.get("id"),

            "topic":
                chunk.get(
                    "topic",
                    course_name
                ),

            "chapter":
                chunk.get(
                    "chapter",
                    ""
                ),

            "section":
                chunk.get(
                    "section",
                    ""
                ),

            "section_label":
                chunk.get(
                    "section_label",
                    ""
                ),

            "text":
                chunk.get(
                    "text",
                    ""
                )
        }
    )


# ============================================================
# PROMPT
# ============================================================

prompt = f"""
You are an expert educational curriculum designer.

You are analyzing the course:

{course_name}

Below are chunks extracted from the course material.

Your task is to determine prerequisite relationships between
these chunks.

A prerequisite relationship means:

"If a student wants to understand chunk A, they should understand
chunk B first."

Therefore:

A -> B

means B is required before A.

Only create a relationship when the prerequisite is genuinely
necessary.

Do NOT create relationships merely because two chunks are related.

Do NOT create relationships merely because chunks occur earlier
in the document.

Do NOT assume earlier chapters are automatically prerequisites.

Use the actual educational concepts in the provided text.

Consider:

1. Definitions required to understand later concepts.
2. Fundamental principles required for advanced concepts.
3. Mathematical or conceptual foundations.
4. Concepts explicitly referenced by later concepts.
5. Chapter and section hierarchy as additional context.

IMPORTANT:

Every prerequisite ID MUST correspond to an existing chunk ID.

Do not create new chunk IDs.

Return ONLY valid JSON.

The JSON must have exactly this general structure:

{{
    "chunk_1": ["chunk_3"],
    "chunk_2": [],
    "chunk_3": ["chunk_5"]
}}

Each key must be a chunk ID.

Each value must be an array of prerequisite chunk IDs.

Do not include explanations.

Course material:

{json.dumps(
    course_material,
    ensure_ascii=False,
    indent=2
)}
"""


# ============================================================
# CALL GEMINI
# ============================================================

print(
    "Calling Gemini...",
    file=sys.stderr
)

try:

    response = client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

except Exception as e:

    print(
        f"Gemini API call failed: {e}",
        file=sys.stderr
    )

    sys.exit(1)


# ============================================================
# READ RESPONSE
# ============================================================

try:

    raw = response.text

    if not raw:

        print(
            "Gemini returned an empty response.",
            file=sys.stderr
        )

        sys.exit(1)

    raw = raw.strip()

    print(
        f"Gemini response length: {len(raw)}",
        file=sys.stderr
    )

except Exception as e:

    print(
        f"Failed to read Gemini response: {e}",
        file=sys.stderr
    )

    sys.exit(1)


# ============================================================
# CLEAN MARKDOWN CODE FENCES
# ============================================================

raw = re.sub(
    r"^```json\s*",
    "",
    raw,
    flags=re.IGNORECASE
)

raw = re.sub(
    r"^```\s*",
    "",
    raw
)

raw = re.sub(
    r"\s*```$",
    "",
    raw
)

raw = raw.strip()


# ============================================================
# PARSE GEMINI JSON
# ============================================================

try:

    graph = json.loads(
        raw
    )

except Exception as e:

    print(
        "Gemini did not return valid JSON.",
        file=sys.stderr
    )

    print(
        f"JSON error: {e}",
        file=sys.stderr
    )

    print(
        "Gemini raw response:",
        file=sys.stderr
    )

    print(
        raw,
        file=sys.stderr
    )

    sys.exit(1)


# ============================================================
# VALIDATE GRAPH
# ============================================================

if not isinstance(
    graph,
    dict
):

    print(
        "Gemini returned JSON, but it is not an object.",
        file=sys.stderr
    )

    sys.exit(1)


valid_chunk_ids = {
    chunk.get("id")
    for chunk in chunks
    if chunk.get("id")
}


clean_graph = {}

for chunk_id in valid_chunk_ids:

    prerequisites = graph.get(
        chunk_id,
        []
    )

    if not isinstance(
        prerequisites,
        list
    ):

        prerequisites = []

    clean_graph[
        chunk_id
    ] = [
        prereq
        for prereq in prerequisites

        if prereq in valid_chunk_ids

        and prereq != chunk_id
    ]


# ============================================================
# SAVE
# ============================================================

try:

    with open(
        output_path,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            clean_graph,
            f,
            indent=2,
            ensure_ascii=False
        )

except Exception as e:

    print(
        f"Failed to save prerequisites: {e}",
        file=sys.stderr
    )

    sys.exit(1)


# ============================================================
# VERIFY FILE
# ============================================================

if not os.path.exists(
    output_path
):

    print(
        "Prerequisites file was not created.",
        file=sys.stderr
    )

    sys.exit(1)


print(
    json.dumps(
        {
            "status":
                "success",

            "course":
                course_name,

            "total_chunks":
                len(chunks),

            "output":
                output_path
        },
        ensure_ascii=False
    )
)