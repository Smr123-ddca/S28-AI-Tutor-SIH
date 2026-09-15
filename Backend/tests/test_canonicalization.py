import sys
import os
import unittest
from unittest.mock import patch, MagicMock

# Patch argv to prevent script early exit during import
patcher1 = patch("sys.argv", ["concept_extraction.py", "dummy_chunks.json", "dummy_quality.json"])
patcher2 = patch("builtins.open", return_value=MagicMock())
patcher3 = patch("json.load", return_value={})
patcher4 = patch.dict(os.environ, {"_MOCK_BEHAVIOR": "SUCCESS", "GEMINI_API_KEY": "123"})
patcher5 = patch("sys.exit", return_value=None)

patcher1.start()
patcher2.start()
patcher3.start()
patcher4.start()
patcher5.start()

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python")))

from concept_extraction import Canonicalizer, compute_normalization_key, extract_aliases_from_name

patcher1.stop()
patcher2.stop()
patcher3.stop()
patcher4.stop()
patcher5.stop()

class TestCanonicalization(unittest.TestCase):
    
    def run_merge(self, pairs):
        c = Canonicalizer()
        class_map = {"c1": "UNKNOWN", "c2": "UNKNOWN"}
        for name in pairs:
            c.merge_candidate({"name": name, "evidence_chunk_ids": ["c1"]}, class_map)
        return c.concepts

    def test_case_A_exact_duplicate(self):
        res = self.run_merge(["Binary Search Tree", "Binary Search Tree"])
        self.assertEqual(len(res), 1)
        
    def test_case_B_case_format(self):
        res = self.run_merge(["binary search tree", "Binary Search Tree", "Binary Search Trees"])
        self.assertEqual(len(res), 1)
        
    def test_case_C_abbreviation(self):
        # We need alias logic handling: e.g. "Binary Search Tree (BST)" sets up the alias "BST", so a later candidate "BST" will merge!
        res = self.run_merge(["Binary Search Tree (BST)", "BST"])
        self.assertEqual(len(res), 1)
        self.assertIn("BST", res[0]["aliases"])

    def test_case_D_distinct(self):
        res = self.run_merge(["Binary Tree", "Binary Search Tree"])
        self.assertEqual(len(res), 2)
        
    def test_case_E_batches(self):
        # Already proven by A and B merging into 1 index
        res = self.run_merge(["candidate from batch 1", "candidate from batch 1", "candidate from batch 1"])
        self.assertEqual(len(res), 1)
        
    def test_case_F_ambiguous(self):
        # Similar names, distinct properties
        res = self.run_merge(["Tree Traversal", "Tree Search"])
        self.assertEqual(len(res), 2)
        
    def test_QA_4_false_merges(self):
        res = self.run_merge(["Binary Tree", "Binary Search Tree"])
        self.assertEqual(len(res), 2)
        
        res = self.run_merge(["Database", "Database Management System"])
        self.assertEqual(len(res), 2)
        
        res = self.run_merge(["Graph", "Graph Traversal"])
        self.assertEqual(len(res), 2)
        
        res = self.run_merge(["Sorting", "Sorting Algorithm"])
        self.assertEqual(len(res), 2)
        
        res = self.run_merge(["Tree", "Decision Tree"])
        self.assertEqual(len(res), 2)
        
    def test_QA_5_word_permutation(self):
        # Must not merge just because words are the same
        res = self.run_merge(["Tree Traversal", "Traversal Tree"])
        self.assertEqual(len(res), 2)
        
    def test_QA_6_technical_terminology(self):
        res = self.run_merge(["Stack", "Stack Overflow"])
        self.assertEqual(len(res), 2)
        
        res = self.run_merge(["Heap", "Heap Sort"])
        self.assertEqual(len(res), 2)
        
        res = self.run_merge(["Queue", "Priority Queue"])
        self.assertEqual(len(res), 2)
        
    def test_QA_7_evidence_preservation(self):
        c = Canonicalizer()
        class_map = {"chunk_10": "UNKNOWN", "chunk_11": "UNKNOWN", "chunk_31": "UNKNOWN"}
        c.merge_candidate({"name": "Concept A", "evidence_chunk_ids": ["chunk_10", "chunk_11"]}, class_map)
        c.merge_candidate({"name": "Concept A", "evidence_chunk_ids": ["chunk_31"]}, class_map)
        
        self.assertEqual(len(c.concepts), 1)
        ev_pool = c.concepts[0]["evidence_pool"]
        self.assertIn("chunk_10", ev_pool)
        self.assertIn("chunk_11", ev_pool)
        self.assertIn("chunk_31", ev_pool)
        self.assertEqual(len(ev_pool), 3)
        
    def test_QA_8_many_to_many(self):
        c = Canonicalizer()
        class_map = {"chunk_1": "UNKNOWN", "chunk_2": "UNKNOWN", "chunk_3": "UNKNOWN"}
        c.merge_candidate({"name": "Concept A", "evidence_chunk_ids": ["chunk_1"]}, class_map)
        c.merge_candidate({"name": "Concept B", "evidence_chunk_ids": ["chunk_1"]}, class_map)
        c.merge_candidate({"name": "Concept A", "evidence_chunk_ids": ["chunk_2"]}, class_map)
        c.merge_candidate({"name": "Concept B", "evidence_chunk_ids": ["chunk_3"]}, class_map)
        
        self.assertEqual(len(c.concepts), 2)
        ca = next(x for x in c.concepts if x["name"] == "Concept A")
        cb = next(x for x in c.concepts if x["name"] == "Concept B")
        self.assertEqual(len(ca["evidence_pool"]), 2)
        self.assertEqual(len(cb["evidence_pool"]), 2)
        self.assertIn("chunk_1", ca["evidence_pool"])
        self.assertIn("chunk_2", ca["evidence_pool"])
        self.assertIn("chunk_1", cb["evidence_pool"])
        self.assertIn("chunk_3", cb["evidence_pool"])

if __name__ == '__main__':
    unittest.main()
