import os
import sys
import json
import ast

def load_assembler():
    with open('prerequisite_graph.py', 'r', encoding='utf-8') as f:
        code = f.read()
    module = ast.parse(code)
    for node in module.body:
        if isinstance(node, ast.ClassDef) and node.name == 'ContextAssembler':
            try:
                class_code = ast.unparse(node)
            except AttributeError:
                import astor
                class_code = astor.to_source(node)
            namespace = {}
            exec(class_code, namespace)
            return namespace['ContextAssembler']
    raise Exception("ContextAssembler not found")

ContextAssembler = load_assembler()

# Provide synthetic DSA textbook chunks logically ordered.
dsa_chunks = [
    {"id": "chunk_0", "chunk_index": 0, "text": "Welcome to Computer Science 101. This course covers Data Structures.", "chapter": "1", "section": "1.0"},
    {"id": "chunk_1", "chunk_index": 1, "text": "A Graph G=(V,E) is a non-linear data structure consisting of vertices and edges.", "chapter": "1", "section": "1.1"},
    {"id": "chunk_2", "chunk_index": 2, "text": "There are different types of graphs: directed, undirected, weighted.", "chapter": "1", "section": "1.2"},
    {"id": "chunk_3", "chunk_index": 3, "text": "Breadth-First Search (BFS) is an algorithm for traversing or searching tree or graph data structures. It starts at the tree root (or some arbitrary node of a graph, sometimes referred to as a 'search key') and explores all of the neighbor nodes at the present depth prior to moving on to the nodes at the next depth level. Since BFS processes nodes level by level, we use a Queue to keep track of visited nodes. Note that to understand BFS over graphs, you MUST first know what a Graph is.", "chapter": "2", "section": "2.1"},
    {"id": "chunk_4", "chunk_index": 4, "text": "Depth-First Search (DFS) uses recursion or a stack. Like BFS, it operates on Graphs.", "chapter": "2", "section": "2.2"},
    {"id": "chunk_5", "chunk_index": 5, "text": "Topological sort or topological ordering of a directed acyclic graph (DAG) is a linear ordering of its vertices. To perform this, one typically uses DFS. Thus, DFS is a prerequisite. Also you must know what a DAG (Graph) is.", "chapter": "3", "section": "3.1"},
    {"id": "chunk_6", "chunk_index": 6, "text": "A Max-Heap is a specialized tree-based data structure which is essentially an almost complete tree that satisfies the heap property: in a max heap, for any given node C, if P is a parent node of C, then the key (the value) of P is greater than or equal to the key of C.", "chapter": "4", "section": "4.1"},
    {"id": "chunk_7", "chunk_index": 7, "text": "The K-th Largest Element problem can be efficiently solved using a Min-Heap. By maintaining a Min-Heap of size K, we process the array iteratively. Thus, knowing the Heap data structure is essential before attempting this pattern.", "chapter": "4", "section": "4.2"},
    {"id": "chunk_8", "chunk_index": 8, "text": "Dynamic Programming (DP) is a method for solving complex problems by breaking them down into simpler subproblems. It is applicable to problems exhibiting the properties of overlapping subproblems.", "chapter": "5", "section": "5.1"},
    {"id": "chunk_9", "chunk_index": 9, "text": "Memoization is an optimization technique used primarily to speed up computer programs by storing the results of expensive function calls. In the context of DP, it is the top-down approach.", "chapter": "5", "section": "5.2"},
    {"id": "chunk_10", "chunk_index": 10, "text": "A Binary Search Tree (BST) is a rooted binary tree.", "chapter": "6", "section": "6.1"}
]

dsa_concepts = [
    {"concept_id": "c_graph", "name": "Graph", "description": "Graph definition", "evidence": [{"chunk_id": "chunk_1"}, {"chunk_id": "chunk_2"}]},
    {"concept_id": "c_bfs", "name": "BFS", "description": "Breadth First Search algorithm", "evidence": [{"chunk_id": "chunk_3"}]},
    {"concept_id": "c_dfs", "name": "DFS", "description": "Depth First Search algorithm", "evidence": [{"chunk_id": "chunk_4"}]},
    {"concept_id": "c_topsort", "name": "Topological Sort", "description": "Ordering of DAG", "evidence": [{"chunk_id": "chunk_5"}]},
    {"concept_id": "c_heap", "name": "Heap", "description": "Heap data structure", "evidence": [{"chunk_id": "chunk_6"}]},
    {"concept_id": "c_kth", "name": "K-th Largest Element", "description": "Algorithm using Heap", "evidence": [{"chunk_id": "chunk_7"}]},
    {"concept_id": "c_dp", "name": "Dynamic Programming", "description": "Optimization strategy", "evidence": [{"chunk_id": "chunk_8"}]},
    {"concept_id": "c_memo", "name": "Memoization", "description": "Top-down memoization mapping", "evidence": [{"chunk_id": "chunk_9"}]},
    {"concept_id": "c_bst", "name": "BST", "description": "Binary search tree", "evidence": [{"chunk_id": "chunk_10"}]}
]

inputs = ContextAssembler.assemble(dsa_chunks, dsa_concepts)

prompt = f"""
You are an expert curriculum-design assistant.
Analyze the following canonical concepts for a Data Structures course.
Your task is to identify logically grounded learning dependencies based EXCLUSIVELY on the provided Local Context arrays (Preceding, First Introduction, Following bounds).

Strict rules for extraction:
1. Output ONLY a chronological JSON array of prerequisite relationships.
2. A relationship means the learner must understand `prerequisite_id` BEFORE learning `concept_id`.
3. READ THE `first_introduced_chunk_index` AND THE LOCAL CONTEXT: Evaluate the PRECEDING, FIRST_INTRODUCTION, and FOLLOWING text natively mapped around its structural chronology to guarantee dependencies.
4. Earlier appearance is evidence, NOT proof. Later appearance is NOT automatically dependent on earlier concepts.
5. Shared vocabulary is NOT sufficient evidence. Concept similarity is NOT sufficient evidence. Chapter proximity is NOT sufficient evidence.
6. Do not infer prerequisites from general CS knowledge when the teacher material does not support them explicitly.
7. `relationship` must be one of: "REQUIRED", "SUPPORTING", "RELATED", or "INSUFFICIENT_EVIDENCE".
8. Prefer `INSUFFICIENT_EVIDENCE` over unsupported edges.
9. Every REQUIRED/SUPPORTING relationship must cite one or more actual chunk IDs in a `cited_chunk_ids` array. Evidence MUST come from the supplied material.
10. `reason` must explicitly state *why* based on extracts from the context text.
11. Test Bidirectional robustness: Determine exactly if 'concept A' requires 'B' or 'B' requires 'A' exclusively through context. Do not guess backwards.

Expected format:
[
  {{
   "concept_id": "c_bfs",
   "prerequisite_id": "c_graph",
   "relationship": "REQUIRED",
   "confidence": 0.95,
   "cited_chunk_ids": ["chunk_3"],
   "reason": "BFS text explicitly states 'to understand BFS over graphs, you MUST first know what a Graph is.'"
  }},
  {{
   "concept_id": "c_bst",
   "prerequisite_id": "c_dp",
   "relationship": "INSUFFICIENT_EVIDENCE",
   "confidence": 0.0,
   "cited_chunk_ids": [],
   "reason": "Supplied material does not establish any link between trees and DP."
  }}
]

Chronologically Ordered Course Concept Context Bounds:
{json.dumps(inputs, ensure_ascii=False)}
"""

def run_experiment():
    from gemini_rest import generate_content
    print("=== STARTING P2C-3 EVIDENCE-GROUNDED EXPERIMENT ===")
    print("Querying Gemini via REST API (this may take 5-15 seconds)...")
    
    try:
        raw = generate_content(prompt)
        print("\n=== RAW GEMINI COMPLETION ===")
        print(raw)
    except Exception as e:
        print("\n=== EXPERIMENT HALTED ===")
        print(f"Error accessing LLM: {str(e)}")
        print("Blocked due to API unavailability / Quota limit.")
        
if __name__ == '__main__':
    run_experiment()
