import unittest

class ContextAssembler:
    @staticmethod
    def assemble(chunks, concepts):
        # Build map for fast chunk lookup
        chunk_map = {c["id"]: c for c in chunks if "id" in c}
        
        enriched_concepts = []
        for c in concepts:
            best_chunk_index = 999999
            first_context = ""
            
            # Find earliest evidence chunk
            for ev in c.get("evidence", []):
                cid = ev.get("chunk_id")
                if cid and cid in chunk_map:
                    ck = chunk_map[cid]
                    idx = ck.get("chunk_index", 999999)
                    if idx < best_chunk_index:
                        best_chunk_index = idx
                        first_context = ck.get("text", "")[:400] # Limit tokens
                        
            enriched = {
                "id": c.get("concept_id"),
                "name": c.get("name"),
                "desc": c.get("description", ""),
                "first_introduced_chunk_index": best_chunk_index if best_chunk_index != 999999 else -1,
                "first_introduced_context": first_context
            }
            enriched_concepts.append(enriched)
            
        # Sort chronologically so LLM natively understands sequence!
        enriched_concepts.sort(key=lambda x: x["first_introduced_chunk_index"] if x["first_introduced_chunk_index"] >= 0 else 999999)
        return enriched_concepts

class TestContextAssembler(unittest.TestCase):
    def setUp(self):
        self.chunks = [
            {"id": "c10", "chunk_index": 10, "text": "This introduces Heaps generally."},
            {"id": "c15", "chunk_index": 15, "text": "This explains K-th largest element using a Heap."},
            {"id": "c5", "chunk_index": 5, "text": "Binary tree basics."}
        ]
        
        self.concepts = [
            {
                "concept_id": "c_kth", 
                "name": "K-th Largest Element", 
                "evidence": [{"chunk_id": "c15"}]
            },
            {
                "concept_id": "c_heap", 
                "name": "Heap", 
                "evidence": [{"chunk_id": "c10"}]
            },
            {
                "concept_id": "c_tree", 
                "name": "Binary Tree", 
                "evidence": [{"chunk_id": "c5"}]
            },
            {
                "concept_id": "c_ghost", 
                "name": "Ghost Concept", 
                "evidence": [{"chunk_id": "missing"}]
            }
        ]

    def test_chronological_ordering(self):
        res = ContextAssembler.assemble(self.chunks, self.concepts)
        self.assertEqual(len(res), 4)
        
        # Expected sequence based on chunk bounds:
        # Binary Tree (5) -> Heap (10) -> Kth (15) -> Ghost (-1 at end)
        self.assertEqual(res[0]["id"], "c_tree")
        self.assertEqual(res[1]["id"], "c_heap")
        self.assertEqual(res[2]["id"], "c_kth")
        self.assertEqual(res[3]["id"], "c_ghost")
        
    def test_context_truncation(self):
        ch = [{"id": "long", "chunk_index": 1, "text": "A" * 1000}]
        co = [{"concept_id": "c1", "evidence": [{"chunk_id": "long"}]}]
        res = ContextAssembler.assemble(ch, co)
        self.assertEqual(len(res[0]["first_introduced_context"]), 400) # strict boundary

if __name__ == '__main__':
    unittest.main()
