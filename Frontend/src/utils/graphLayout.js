import dagre from '@dagrejs/dagre';

export function getLayoutedElements(nodes, edges, direction = 'TB') {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));

    dagreGraph.setGraph({ rankdir: direction, ranksep: 100, nodesep: 60 });

    // Populate dagre with unpositioned nodes
    nodes.forEach((node) => {
        // Approximate width and height of the CustomConceptNode rendered in DOM
        dagreGraph.setNode(node.id, { width: 240, height: 85 });
    });

    // Populate dagre with directional edges
    edges.forEach((edge) => {
        dagreGraph.setEdge(edge.source, edge.target);
    });

    // Apply algorithm
    dagre.layout(dagreGraph);

    // Apply layout positions directly onto React Flow node bounds
    const positionedNodes = nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
            ...node,
            position: {
                x: nodeWithPosition.x - 240 / 2,
                y: nodeWithPosition.y - 85 / 2,
            },
        };
    });

    return { nodes: positionedNodes, edges };
}
