import sys
import json
import unittest

def exec_graph(script_path, inputs_dict):
    """Dynamically runs PASS B of prerequisite_graph via isolated locals."""
    with open(script_path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    # We strip out everything before PASS B and after its execution
    pass_b_start = code.find("# PASS B: VALIDATION STRICT CHECKS")
    pass_c_start = code.find("# PASS C: CYCLE DETECTOR")
    target_logic = code[pass_b_start:pass_c_start]
    
    ns = inputs_dict.copy()
    exec(target_logic, ns)
    return ns['final_edges'], ns['diagnostic_counts']

class TestEvidenceVerifier(unittest.TestCase):
    def setUp(self):
        self.chunks_data = [
            {"id": "chunk_1", "text": "Real chunk"},
            {"id": "chunk_2", "text": "Another one"}
        ]
        self.c2_concepts = [{"concept_id": "c1"}, {"concept_id": "c2"}]
        self.valid_concept_ids = {"c1", "c2"}
        self.script = '../python/prerequisite_graph.py'
        
    def _run(self, raw_relations):
        inputs = {
            "chunks_data": self.chunks_data,
            "c2_concepts": self.c2_concepts,
            "valid_concept_ids": self.valid_concept_ids,
            "relations": raw_relations
        }
        return exec_graph(self.script, inputs)

    def test_1_valid_evidence(self):
        rels = [{"concept_id": "c2", "prerequisite_id": "c1", "relationship": "REQUIRED", "confidence": 0.8, "evidence": ["chunk_1"]}]
        edges, stats = self._run(rels)
        self.assertEqual(len(edges), 1)
        self.assertEqual(edges[0]["evidence"], ["chunk_1"])
        
    def test_2_nonexistent_evidence(self):
        rels = [{"concept_id": "c2", "prerequisite_id": "c1", "relationship": "REQUIRED", "confidence": 0.8, "evidence": ["chunk_999"]}]
        edges, stats = self._run(rels)
        self.assertEqual(len(edges), 0)
        self.assertEqual(stats["unsupported_evidence_rejected"], 1)
        
    def test_3_mixed_evidence(self):
        rels = [{"concept_id": "c2", "prerequisite_id": "c1", "relationship": "REQUIRED", "confidence": 0.8, "evidence": ["chunk_1", "fake_999", "chunk_2"]}]
        edges, _ = self._run(rels)
        self.assertEqual(len(edges), 1)
        self.assertEqual(len(edges[0]["evidence"]), 2)
        
    def test_4_required_no_evidence(self):
        rels = [{"concept_id": "c2", "prerequisite_id": "c1", "relationship": "REQUIRED", "confidence": 0.8, "evidence": []}]
        edges, _ = self._run(rels)
        self.assertEqual(len(edges), 0)
        
    def test_5_supporting_no_evidence(self):
        rels = [{"concept_id": "c2", "prerequisite_id": "c1", "relationship": "SUPPORTING", "confidence": 0.8, "evidence": []}]
        edges, _ = self._run(rels)
        self.assertEqual(len(edges), 0)
        
    def test_6_related_no_evidence(self):
        rels = [{"concept_id": "c2", "prerequisite_id": "c1", "relationship": "RELATED", "confidence": 0.8, "evidence": []}]
        edges, _ = self._run(rels)
        self.assertEqual(len(edges), 1) 
        self.assertEqual(edges[0]["relationship"], "RELATED")
        
    def test_7_high_confidence_zero_evidence(self):
        rels = [{"concept_id": "c2", "prerequisite_id": "c1", "relationship": "REQUIRED", "confidence": 0.99, "evidence": []}]
        edges, stats = self._run(rels)
        self.assertEqual(len(edges), 0)
        self.assertEqual(stats["unsupported_evidence_rejected"], 1)

    def test_8_fake_evidence_high_confidence(self):
        rels = [{"concept_id": "c2", "prerequisite_id": "c1", "relationship": "REQUIRED", "confidence": 0.99, "evidence": ["ghost_chunk"]}]
        edges, _ = self._run(rels)
        self.assertEqual(len(edges), 0)

    def test_11_direction_preservation(self):
        rels = [{"concept_id": "c2", "prerequisite_id": "c1", "relationship": "REQUIRED", "confidence": 0.8, "evidence": ["chunk_1"]}]
        edges, _ = self._run(rels)
        self.assertEqual(edges[0]["concept_id"], "c2")
        self.assertEqual(edges[0]["prerequisite_id"], "c1")
        
    def test_12_no_evidence_inference(self):
        # Even if chunk_2 mentions 'c2' name, it shouldn't auto-bind if LLM didn't cite it.
        rels = [{"concept_id": "c2", "prerequisite_id": "c1", "relationship": "REQUIRED", "confidence": 0.8, "evidence": ["chunk_1"]}]
        edges, _ = self._run(rels)
        self.assertEqual(edges[0]["evidence"], ["chunk_1"])

if __name__ == '__main__':
    unittest.main()
