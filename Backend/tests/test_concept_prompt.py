import sys
import os
import unittest
import json
from unittest.mock import patch, MagicMock

# Base module setup
patcher1 = patch("sys.argv", ["concept_extraction.py", "dummy_chunks.json", "dummy_quality.json"])
patcher2 = patch("builtins.open", return_value=MagicMock())
patcher3 = patch("json.load", return_value={})
patcher4 = patch.dict(os.environ, {"GEMINI_API_KEY": "123"})
patcher5 = patch("sys.exit", return_value=None)

patcher1.start()
patcher2.start()
patcher3.start()
patcher4.start()
patcher5.start()

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "python")))
import concept_extraction

patcher1.stop()
patcher2.stop()
patcher3.stop()
patcher4.stop()
patcher5.stop()

class TestPromptParsing(unittest.TestCase):
    
    def run_parser_test(self, mock_str):
        # We need to stub out Gemini and simulate process_batch parsing safely
        concept_extraction.all_candidates = []
        
        with patch("gemini_rest.generate_content", return_value=mock_str):
            # Pass a fake batch chunk just to trigger parsing logic
            batch = [{"chunk_id": "c1", "classification": "Content", "text": "Mock", "metadata": {}}]
            concept_extraction.process_batch(batch)
            
        return list(concept_extraction.all_candidates)

    def test_case_A_single_meaningful(self):
        json_resp = '''```json
        [
            {"name": "Valid Concept", "description": "Good", "confidence": 0.9, "evidence_chunk_ids": ["c1"]}
        ]
        ```'''
        res = self.run_parser_test(json_resp)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["name"], "Valid Concept")

    def test_case_B_multiple_concepts_per_chunk(self):
        json_resp = '''
        [
            {"name": "Concept 1", "description": "Good", "confidence": 0.9, "evidence_chunk_ids": ["c1"]},
            {"name": "Concept 2", "description": "Also good", "confidence": 0.9, "evidence_chunk_ids": ["c1"]}
        ]
        '''
        res = self.run_parser_test(json_resp)
        self.assertEqual(len(res), 2)
        
    def test_case_C_continuation_chunk(self):
        # If Gemini attaches multiple chunks correctly, the array has multiple chunks.
        json_resp = '[{"name": "Concept 1", "description": "Good", "confidence": 0.9, "evidence_chunk_ids": ["c1", "c2"]}]'
        res = self.run_parser_test(json_resp)
        self.assertEqual(len(res), 1)
        self.assertEqual(len(res[0]["evidence_chunk_ids"]), 2)

    def test_case_D_generic_heading(self):
        # If Gemini outputs 0 concepts
        json_resp = '[]'
        res = self.run_parser_test(json_resp)
        self.assertEqual(len(res), 0)

    def test_case_H_malformed(self):
        # Graceful failure handling
        json_resp = '{ bad json array'
        res = self.run_parser_test(json_resp)
        self.assertEqual(len(res), 0)

if __name__ == '__main__':
    unittest.main()
