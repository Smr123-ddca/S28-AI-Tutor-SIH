import sys
import os
import unittest
import json
from unittest.mock import patch, MagicMock

# We need to simulate the execution of prerequisite_graph's PASS B & C
# and graph_validation's metrics blocks.

def validate_edges_via_prerequisite_graph(concepts, raw_edges):
    # Rip the exact edge validation logic from prerequisite_graph.py PASS B & C
    valid_concept_ids = set([c["concept_id"] for c in concepts])
    
    diagnostic_counts = {
        "unknown_id_candidates": 0,
        "self_loop_candidates": 0,
        "low_confidence_candidates": 0,
        "cycle_rejected_candidates": 0,
    }
    
    seen_edges = {}
    for r in raw_edges:
        cid = str(r.get("concept_id", "")).strip()
        pid = str(r.get("prerequisite_id", "")).strip()
        conf = float(r.get("confidence", 0.0))
        
        if cid not in valid_concept_ids or pid not in valid_concept_ids:
            diagnostic_counts["unknown_id_candidates"] += 1
            continue
        if cid == pid:
            diagnostic_counts["self_loop_candidates"] += 1
            continue
        if conf < 0.60:
            diagnostic_counts["low_confidence_candidates"] += 1
            continue
            
        edge_key = f"{pid}->{cid}"
        if edge_key in seen_edges:
            if conf > seen_edges[edge_key]["confidence"]:
                seen_edges[edge_key] = r
        else:
            seen_edges[edge_key] = r
            
    final_edges = list(seen_edges.values())
    
    # PASS C: Cycle Detection ripped directly
    from collections import defaultdict
    def get_cycles():
        adj = defaultdict(list)
        for i, e in enumerate(final_edges):
            adj[e["prerequisite_id"]].append((e["concept_id"], i))
        color = {}
        parent = {}
        def dfs(u):
            color[u] = 1
            for v, edge_i in adj[u]:
                if color.get(v, 0) == 1:
                    cycle_edges = [edge_i]
                    curr = u
                    while curr != v:
                        p_node, p_edge_i = parent[curr]
                        cycle_edges.append(p_edge_i)
                        curr = p_node
                    return cycle_edges
                elif color.get(v, 0) == 0:
                    parent[v] = (u, edge_i)
                    res = dfs(v)
                    if res: return res
            color[u] = 2
            return None
        for node in valid_concept_ids:
            if color.get(node, 0) == 0:
                c = dfs(node)
                if c: return c
        return None
        
    while True:
        cycle_edge_indices = get_cycles()
        if not cycle_edge_indices:
            break
        weakest_conf = 999
        weakest_idx = -1
        for idx in cycle_edge_indices:
            c = final_edges[idx]["confidence"]
            if c < weakest_conf:
                weakest_conf = c
                weakest_idx = idx
        del final_edges[weakest_idx]
        diagnostic_counts["cycle_rejected_candidates"] += 1
        
    return final_edges, diagnostic_counts

class TestPrerequisiteValidator(unittest.TestCase):
    def setUp(self):
        self.concepts = [
            {"concept_id": "Graph", "name": "Graph"},
            {"concept_id": "BFS", "name": "Breadth First Search"},
            {"concept_id": "Heap", "name": "Heap"},
            {"concept_id": "Kth", "name": "K-th Largest Element"},
            {"concept_id": "Sorting", "name": "Sorting"},
            {"concept_id": "BinarySearch", "name": "Binary Search"},
            {"concept_id": "A", "name": "A"},
            {"concept_id": "B", "name": "B"},
            {"concept_id": "C", "name": "C"}
        ]

    # 1. Valid prerequisite: Graph -> BFS
    def test_01_valid_prereq(self):
        edges = [{"concept_id": "BFS", "prerequisite_id": "Graph", "confidence": 0.9}]
        v_edges, d = validate_edges_via_prerequisite_graph(self.concepts, edges)
        self.assertEqual(len(v_edges), 1)

    # 2. Valid prerequisite: Heap -> K-th
    def test_02_valid_prereq_heap(self):
        edges = [{"concept_id": "Kth", "prerequisite_id": "Heap", "confidence": 0.9}]
        v_edges, d = validate_edges_via_prerequisite_graph(self.concepts, edges)
        self.assertEqual(len(v_edges), 1)

    # 3. Suspicious reverse: BFS -> Graph
    def test_03_suspicious_reverse(self):
        edges = [{"concept_id": "Graph", "prerequisite_id": "BFS", "confidence": 0.9}]
        v_edges, d = validate_edges_via_prerequisite_graph(self.concepts, edges)
        # Structural parser natively ACCEPTS this because it has no intrinsic semantic logic.
        # graph_validation.py LLM prompt is meant to catch this.
        self.assertEqual(len(v_edges), 1)

    # 5. Self-loop: Graph -> Graph
    def test_05_self_loop(self):
        edges = [{"concept_id": "Graph", "prerequisite_id": "Graph", "confidence": 0.9}]
        v_edges, d = validate_edges_via_prerequisite_graph(self.concepts, edges)
        self.assertEqual(len(v_edges), 0)
        self.assertEqual(d["self_loop_candidates"], 1)

    # 6. Simple cycle: Graph -> BFS, BFS -> Graph
    def test_06_simple_cycle(self):
        edges = [
            {"concept_id": "BFS", "prerequisite_id": "Graph", "confidence": 0.9},
            {"concept_id": "Graph", "prerequisite_id": "BFS", "confidence": 0.7} # Weaker edge
        ]
        v_edges, d = validate_edges_via_prerequisite_graph(self.concepts, edges)
        self.assertEqual(len(v_edges), 1)
        self.assertEqual(v_edges[0]["prerequisite_id"], "Graph") # The weaker edge got destroyed
        self.assertEqual(d["cycle_rejected_candidates"], 1)
        
    # 7. Longer cycle: A->B, B->C, C->A
    def test_07_triple_cycle(self):
        edges = [
            {"concept_id": "B", "prerequisite_id": "A", "confidence": 0.9},
            {"concept_id": "C", "prerequisite_id": "B", "confidence": 0.8},
            {"concept_id": "A", "prerequisite_id": "C", "confidence": 0.7}
        ]
        v_edges, d = validate_edges_via_prerequisite_graph(self.concepts, edges)
        self.assertEqual(len(v_edges), 2)
        
    # 8. Duplicate edge mapping
    def test_08_duplicate(self):
        edges = [
            {"concept_id": "BFS", "prerequisite_id": "Graph", "confidence": 0.7},
            {"concept_id": "BFS", "prerequisite_id": "Graph", "confidence": 0.9}
        ]
        v_edges, d = validate_edges_via_prerequisite_graph(self.concepts, edges)
        self.assertEqual(len(v_edges), 1)
        self.assertEqual(v_edges[0]["confidence"], 0.9) # Maintains best boundary
        
    # 9. Missing Node
    def test_09_missing_node(self):
        edges = [{"concept_id": "BFS", "prerequisite_id": "UnknownNode", "confidence": 0.9}]
        v_edges, d = validate_edges_via_prerequisite_graph(self.concepts, edges)
        self.assertEqual(len(v_edges), 0)
        self.assertEqual(d["unknown_id_candidates"], 1)
        
    # 10. Low Confidence (Related but not proven)
    def test_10_low_confidence(self):
        edges = [{"concept_id": "BinarySearch", "prerequisite_id": "Sorting", "confidence": 0.4}]
        v_edges, d = validate_edges_via_prerequisite_graph(self.concepts, edges)
        self.assertEqual(len(v_edges), 0)
        self.assertEqual(d["low_confidence_candidates"], 1)

if __name__ == '__main__':
    unittest.main()
