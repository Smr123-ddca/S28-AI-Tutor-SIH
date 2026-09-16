import sys
import json
import unittest

def load_assembler():
    import ast
    with open('../python/prerequisite_graph.py', 'r', encoding='utf-8') as f:
        code = f.read()
    
    module = ast.parse(code)
    for node in module.body:
        if isinstance(node, ast.ClassDef) and node.name == 'ContextAssembler':
            # Unparse and execute the class definition
            # ast.unparse is available in Python 3.9+
            try:
                class_code = ast.unparse(node)
                namespace = {}
                exec(class_code, namespace)
                return namespace['ContextAssembler']
            except AttributeError:
                # Fallback for Python 3.8
                import astor
                class_code = astor.to_source(node)
                namespace = {}
                exec(class_code, namespace)
                return namespace['ContextAssembler']

ContextAssembler = load_assembler()

class TestContextAssembler(unittest.TestCase):
    def setUp(self):
        self.long_text = "A" * 1000 + " MIDDLE TEXT " + "B" * 1000
        
        self.mock_chunks = [
            {"id": "chunk_0", "chunk_index": 0, "chapter": "1", "section": "1.1", "page_start": 1, "page_end": 1, "text": "Noise chunk before."},
            {"id": "chunk_1", "chunk_index": 1, "chapter": "1", "section": "1.2", "page_start": 2, "page_end": 2, "text": "Preceding chunk."},
            {"id": "chunk_2", "chunk_index": 2, "chapter": "2", "section": "2.1", "page_start": 3, "page_end": 4, "text": "This introduces Graphs."},
            {"id": "chunk_3", "chunk_index": 3, "chapter": "2", "section": "2.1", "page_start": 4, "page_end": 5, "text": "Following chunk after graphs."},
            {"id": "chunk_4", "chunk_index": 4, "chapter": "3", "section": "3.1", "page_start": 6, "page_end": 7, "text": self.long_text} # Long chunk for bounds
        ]
        
        self.mock_concepts = [
            {
                "concept_id": "c1",
                "name": "Graph",
                "description": "Graph definition",
                "evidence": [
                    {"chunk_id": "chunk_2"},
                    {"chunk_id": "chunk_3"} # Deduplication/Lowest index check
                ]
            },
            {
                "concept_id": "c2",
                "name": "Long Concept",
                "description": "Bounds test",
                "evidence": [
                    {"chunk_id": "chunk_4"}
                ]
            },
            {
                "concept_id": "c3",
                "name": "Missing Neighbors",
                "description": "Test edge cases",
                "evidence": [
                    {"chunk_id": "chunk_0"}
                ]
            },
             {
                "concept_id": "c4",
                "name": "No Info",
                "evidence": []
            }
        ]

    def test_text_bounding(self):
        # 7. Very long chunks do not lose their transition/end context
        # 9. No arbitrary 400-char truncation remains
        bounded = ContextAssembler._bound_text(self.long_text, 1500)
        self.assertTrue(len(bounded) <= 1550) # 1500 + truncation strings
        self.assertTrue("AAAA" in bounded)
        self.assertTrue("BBBB" in bounded)
        self.assertFalse("MIDDLE TEXT" in bounded)

    def test_roles_and_neighbors(self):
        # 1. Preceding/current/following chunks are included correctly
        # 3. Chunk IDs remain attached
        # 4. Chapter/section/page metadata survives
        # 5. Roles correctly assigned
        # 6. Shared chunks are deduplicated (best chunk index takes priority)
        res = ContextAssembler.assemble(self.mock_chunks, self.mock_concepts)
        
        graph_concept = next(c for c in res if c["id"] == "c1")
        self.assertEqual(graph_concept["first_introduced_chunk_index"], 2)
        
        ctx = graph_concept["local_context"]
        self.assertEqual(len(ctx), 3)
        self.assertEqual(ctx[0]["role"], "PRECEDING")
        self.assertEqual(ctx[0]["chunk_id"], "chunk_1")
        self.assertEqual(ctx[0]["chapter"], "1")
        
        self.assertEqual(ctx[1]["role"], "FIRST_INTRODUCTION")
        self.assertEqual(ctx[1]["chunk_id"], "chunk_2")
        self.assertEqual(ctx[1]["chapter"], "2")
        
        self.assertEqual(ctx[2]["role"], "FOLLOWING")
        self.assertEqual(ctx[2]["chunk_id"], "chunk_3")
        self.assertEqual(ctx[2]["text"], "Following chunk after graphs.")
        
    def test_missing_neighbors(self):
        # 8. Missing neighboring chunks are handled gracefully
        res = ContextAssembler.assemble(self.mock_chunks, self.mock_concepts)
        missing_concept = next(c for c in res if c["id"] == "c3")
        
        ctx = missing_concept["local_context"]
        self.assertEqual(len(ctx), 2) # Only FIRST and FOLLOWING, no PRECEDING (since index 0)
        self.assertEqual(ctx[0]["role"], "FIRST_INTRODUCTION")
        self.assertEqual(ctx[0]["chunk_id"], "chunk_0")
        
    def test_no_edges_inferred(self):
        # 10. Context assembly does not infer or create prerequisite edges itself
        res = ContextAssembler.assemble(self.mock_chunks, self.mock_concepts)
        for c in res:
            self.assertTrue("prerequisites" not in c)
            self.assertTrue("edges" not in c)
            
    def test_chronological_order(self):
        # 2. Chronological order is preserved natively in the array
        res = ContextAssembler.assemble(self.mock_chunks, self.mock_concepts)
        c2 = next(c for c in res if c["id"] == "c2")
        roles = [x["role"] for x in c2["local_context"]]
        self.assertEqual(roles, ["PRECEDING", "FIRST_INTRODUCTION"]) # It's the last chunk, so no following
        
        # Test main array ordering
        indexes = [c["first_introduced_chunk_index"] for c in res]
        self.assertEqual(indexes, [0, 2, 4, -1]) # -1 is the empty concept c4

if __name__ == '__main__':
    unittest.main()
