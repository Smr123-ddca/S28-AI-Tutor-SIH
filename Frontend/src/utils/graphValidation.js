/**
 * Validates whether introducing a directed edge from source -> target 
 * would create a cyclic loop within the knowledge graph.
 * 
 * Logic: A -> B creates a cycle ONLY if B can already reach A upstream.
 */
export function createsCycle(source, target, existingEdges) {
    if (source === target) return true;

    // Standard Adjacency List Mapping
    const adj = new Map();
    existingEdges.forEach(edge => {
        if (!adj.has(edge.source)) adj.set(edge.source, []);
        adj.get(edge.source).push(edge.target);
    });

    // Standard BFS Traverse originating FROM Target attempting to hit Source
    const visited = new Set();
    const queue = [target];

    while (queue.length > 0) {
        const curr = queue.shift();

        // If the downstream path eventually wraps back up to the origin source -> Reject!
        if (curr === source) return true;

        if (!visited.has(curr)) {
            visited.add(curr);
            const children = adj.get(curr) || [];
            children.forEach(child => queue.push(child));
        }
    }

    return false;
}
