import os
import json

from google import genai
from google.genai import types
from PIL import Image


class BoardReader:

    def __init__(self):

        self.api_key = os.getenv("GEMINI_API_KEY")

        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set.")

        self.client = genai.Client(
            api_key=self.api_key
        )

        # DO NOT CHANGE THIS MODEL
        self.model = "gemini-3.5-flash"

    def read_frames(self, image_paths):

        if not image_paths:
            return {
                "heading": "Class Notes",
                "sections": [],
                "diagrams": [],
                "key_takeaways": [],
                "questions": []
            }

        contents = []

        prompt = """
You are digitizing a teacher's whiteboard.

Analyze all provided whiteboard images together.

Your job is TRANSCRIPTION and STRUCTURAL EXTRACTION.

IMPORTANT RULES:

1. Only report information that is visibly written or clearly represented.
2. DO NOT complete unfinished sentences.
3. DO NOT invent missing words.
4. DO NOT add explanations.
5. Preserve the teacher's wording as closely as possible.
6. If something says "What is an", write exactly "What is an".
7. Do not turn fragments into complete sentences.
8. Preserve mathematical notation and examples.

Return ONLY valid JSON.

Use exactly this structure:

{
  "heading": "string",
  "sections": [
    {
      "title": "string",
      "content": [
        {
          "type": "text",
          "text": "exact text from board"
        },
        {
          "type": "example",
          "text": "exact example from board"
        },
        {
          "type": "definition",
          "text": "exact definition from board"
        },
        {
          "type": "equation",
          "text": "exact equation from board"
        },
        {
          "type": "bullet",
          "text": "exact bullet text from board"
        },
        {
          "type": "question",
          "text": "exact question from board"
        }
      ]
    }
  ],

  "diagrams": [],

  "key_takeaways": [],

  "questions": []
}

DIAGRAM RULES:

If a diagram is a conceptual tree/hierarchy, use:

{
  "type": "hierarchy",
  "title": "optional title",
  "root": "root label",
  "children": [
    {
      "label": "child label",
      "children": []
    }
  ]
}

If a diagram is an actual graph with vertices and edges, use:

{
  "type": "graph",
  "title": "Weighted Graph",
  "directed": false,
  "vertices": ["a", "b", "c", "d"],
  "edges": [
    {
      "from": "d",
      "to": "a",
      "weight": "4"
    }
  ]
}

For an unweighted graph, omit the weight:

{
  "type": "graph",
  "title": "Non-weighted Graph",
  "directed": false,
  "vertices": ["a", "b", "c"],
  "edges": [
    {
      "from": "a",
      "to": "b"
    }
  ]
}

IMPORTANT:

Do NOT describe a graph as a hierarchy.

If you can identify vertices and edges, it MUST be returned as:

"type": "graph"

For graph edges:
- Preserve vertex names exactly.
- Preserve edge weights exactly.
- Do not invent edges.
- Do not invent vertices.

For hierarchy diagrams:
- Preserve the parent-child relationships visible on the board.

If a diagram cannot be confidently interpreted, do not invent its structure.

Return ONLY JSON.
"""

        contents.append(prompt)

        # Add every board image to the SAME Gemini request.
        for image_path in image_paths:

            if not os.path.exists(image_path):
                continue

            try:

                image = Image.open(image_path)

                contents.append(
                    image
                )

            except Exception as error:

                print(
                    f"Could not open image {image_path}: {error}"
                )

        print(
            f"Sending {len(image_paths)} board images "
            f"in ONE Gemini request..."
        )

        try:

            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=0,
                    response_mime_type="application/json"
                )
            )

            raw_text = response.text.strip()

            # Remove accidental markdown fences.
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]

            if raw_text.startswith("```"):
                raw_text = raw_text[3:]

            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]

            raw_text = raw_text.strip()

            result = json.loads(raw_text)

            return self.normalize_result(result)

        except Exception as error:

            print(
                f"Gemini board reading failed: {error}"
            )

            raise

    def normalize_result(self, result):

        if not isinstance(result, dict):
            result = {}

        if not isinstance(
            result.get("sections"),
            list
        ):
            result["sections"] = []

        if not isinstance(
            result.get("diagrams"),
            list
        ):
            result["diagrams"] = []

        if not isinstance(
            result.get("key_takeaways"),
            list
        ):
            result["key_takeaways"] = []

        if not isinstance(
            result.get("questions"),
            list
        ):
            result["questions"] = []

        if not result.get("heading"):
            result["heading"] = "Class Notes"

        # Clean diagram objects.
        cleaned_diagrams = []

        for diagram in result["diagrams"]:

            if not isinstance(diagram, dict):
                continue

            diagram_type = diagram.get("type")

            if diagram_type == "graph":

                vertices = diagram.get(
                    "vertices",
                    []
                )

                edges = diagram.get(
                    "edges",
                    []
                )

                if not isinstance(vertices, list):
                    vertices = []

                if not isinstance(edges, list):
                    edges = []

                diagram["vertices"] = vertices
                diagram["edges"] = edges

                cleaned_edges = []

                for edge in edges:

                    if not isinstance(edge, dict):
                        continue

                    if (
                        edge.get("from") is None
                        or edge.get("to") is None
                    ):
                        continue

                    cleaned_edges.append(edge)

                diagram["edges"] = cleaned_edges

                cleaned_diagrams.append(diagram)

            elif diagram_type == "hierarchy":

                cleaned_diagrams.append(diagram)

        result["diagrams"] = cleaned_diagrams

        return result