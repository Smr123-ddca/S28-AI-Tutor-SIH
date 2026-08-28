import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Download, CheckCircle, AlertTriangle, AlertCircle, ArrowLeft, RefreshCw, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import './TeacherReview.css';

export default function TeacherReview({ courseName, setView, onPublish }) {

    const [status, setStatus] = useState('loading'); // loading, success, error
    const [artifacts, setArtifacts] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [expanded, setExpanded] = useState({});
    const [selectedNodeId, setSelectedNodeId] = useState(null);

    // Hierarchy computation
    const computeHierarchy = (chunks) => {
        const h = {};
        chunks.forEach(c => {
            const ch = c.chapter || 'Uncategorized';
            const sec = c.section || 'General';
            const top = c.topic || 'Misc';

            if (!h[ch]) h[ch] = { count: 0, sections: {} };
            h[ch].count++;

            if (!h[ch].sections[sec]) h[ch].sections[sec] = { count: 0, topics: {} };
            h[ch].sections[sec].count++;

            if (!h[ch].sections[sec].topics[top]) h[ch].sections[sec].topics[top] = { count: 0, chunks: [] };
            h[ch].sections[sec].topics[top].count++;
            h[ch].sections[sec].topics[top].chunks.push(c);
        });
        return h;
    };

    const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    useEffect(() => {
        fetchArtifacts();
    }, [courseName]);

    const fetchArtifacts = async () => {
        setStatus('loading');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch(`/api/courses/${courseName}/artifacts`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();

            if (res.ok && data.status === 'success') {
                setArtifacts(data);
                setStatus('success');
            } else {
                setErrorMsg(data.error || 'Failed to fetch artifacts.');
                setStatus('error');
            }
        } catch (e) {
            setErrorMsg(e.message);
            setStatus('error');
        }
    };

    if (status === 'loading') {
        return <div className="review-container loading">Loading Artifacts...</div>;
    }

    if (status === 'error') {
        return (
            <div className="review-container error">
                <AlertCircle size={40} className="error-icon" />
                <h2>Failed to Load Review Workspace</h2>
                <p>{errorMsg}</p>
                <button onClick={fetchArtifacts} className="retry-btn">Retry</button>
            </div>
        );
    }

    const { chunks = [], prerequisites = { relationships: [] } } = artifacts || {};
    const rels = prerequisites.relationships || [];

    // Computations
    const totalChunks = chunks.length;
    const uniqueTopics = new Set(chunks.map(c => c.topic)).size;

    // Depth Calculation
    const adj = {};
    const inDegree = {};
    chunks.forEach(c => { adj[c.id] = []; inDegree[c.id] = 0; });
    rels.forEach(r => {
        if (!adj[r.prerequisite_id]) adj[r.prerequisite_id] = [];
        adj[r.prerequisite_id].push(r.concept_id);
        inDegree[r.concept_id] = (inDegree[r.concept_id] || 0) + 1;
    });

    const rootConcepts = chunks.filter(c => !inDegree[c.id]).length;
    let maxDepth = 0;

    // Simple topological max depth
    const memoDepth = {};
    const getDepth = (nodeId) => {
        if (memoDepth[nodeId] !== undefined) return memoDepth[nodeId];
        if (!adj[nodeId] || adj[nodeId].length === 0) return 0;
        let d = 0;
        adj[nodeId].forEach(child => {
            d = Math.max(d, 1 + getDepth(child));
        });
        memoDepth[nodeId] = d;
        return d;
    };

    chunks.forEach(c => {
        if (!inDegree[c.id]) {
            maxDepth = Math.max(maxDepth, getDepth(c.id));
        }
    });

    const hierarchy = computeHierarchy(chunks);

    const topicDistribution = chunks.reduce((acc, c) => {
        acc[c.topic] = (acc[c.topic] || 0) + 1;
        return acc;
    }, {});
    const topicDistArr = Object.entries(topicDistribution).sort((a, b) => b[1] - a[1]);

    const activeNodeId = selectedNodeId || (chunks[0] ? chunks[0].id : null);
    const activeNode = chunks.find(c => c.id === activeNodeId);

    // Compute Focus Columns
    let prereqsOfActive = [];
    let depsOfActive = [];
    if (activeNode) {
        const prereqIds = rels.filter(r => r.concept_id === activeNode.id).map(r => r.prerequisite_id);
        const depIds = rels.filter(r => r.prerequisite_id === activeNode.id).map(r => r.concept_id);
        prereqsOfActive = chunks.filter(c => prereqIds.includes(c.id));
        depsOfActive = chunks.filter(c => depIds.includes(c.id));
    }

    return (
        <div className="review-container">
            <header className="review-header">
                <button className="back-btn" onClick={() => setView('courses')}><ArrowLeft size={16} /> Back to Dashboard</button>
                <div className="title-row">
                    <div>
                        <h1>Review Course: {courseName}</h1>
                        <span className="badge ready">READY FOR REVIEW</span>
                        <p className="subtitle">Visual inspection workspace for generated structural mappings.</p>
                    </div>
                    <div className="actions-row">
                        <button className="download-btn"><Download size={16} /> Download Artifacts</button>
                        <button className="publish-btn" onClick={onPublish}>Publish Course</button>
                    </div>
                </div>
            </header>

            <div className="review-layout">
                {/* Visual Navigation Tabs */}

                <section className="summary-section">
                    <div className="stat-card">
                        <h3>{totalChunks}</h3>
                        <span>Generated chunks</span>
                    </div>
                    <div className="stat-card">
                        <h3>{uniqueTopics}</h3>
                        <span>Unique topics</span>
                    </div>
                    <div className="stat-card">
                        <h3>{rels.length}</h3>
                        <span>DAG validated ✓</span>
                    </div>
                    <div className="stat-card">
                        <h3>{rootConcepts}</h3>
                        <span>No prerequisites</span>
                    </div>
                    <div className="stat-card">
                        <h3>{maxDepth > 0 ? maxDepth : 0}</h3>
                        <span>Graph depth</span>
                    </div>
                </section>


                <div className="main-content-layout">
                    {/* LEFTSIDE: HIERARCHY & DISTRIBUTION */}
                    <div className="left-panel">
                        <section className="dist-section card">
                            <h2>Topic Distribution</h2>
                            <div className="dist-bars">
                                {topicDistArr.map(([name, count]) => {
                                    const percent = ((count / totalChunks) * 100).toFixed(1);
                                    return (
                                        <div key={name} className="dist-row">
                                            <div className="dist-label-row">
                                                <span className="dist-name">{name.replace(/_/g, ' ')}</span>
                                                <span className="dist-val">{count} <span>({percent}%)</span></span>
                                            </div>
                                            <div className="dist-bar-bg">
                                                <div className="dist-bar-fill" style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section className="hierarchy-section card">
                            <h2>Course Structure</h2>
                            <div className="tree-container">
                                {Object.entries(hierarchy).map(([chName, chData], chIdx) => {
                                    const cId = `ch-${chIdx}`;
                                    const isCExp = expanded[cId];
                                    return (
                                        <div key={cId} className="tree-node chapter">
                                            <div className="tree-header" onClick={() => toggleExpand(cId)}>
                                                <span className="tree-icon">{isCExp ? '▾' : '▸'}</span>
                                                <span className="tree-title">{chName}</span>
                                                <span className="tree-count">{chData.count} chunks</span>
                                            </div>
                                            {isCExp && (
                                                <div className="tree-children">
                                                    {Object.entries(chData.sections).map(([secName, secData], sIdx) => {
                                                        const sId = `sec-${chIdx}-${sIdx}`;
                                                        const isSExp = expanded[sId];
                                                        return (
                                                            <div key={sId} className="tree-node section">
                                                                <div className="tree-header" onClick={() => toggleExpand(sId)}>
                                                                    <span className="tree-icon">{isSExp ? '▾' : '▸'}</span>
                                                                    <span className="tree-title">{secName}</span>
                                                                    <span className="tree-count">{secData.count} chunks</span>
                                                                </div>
                                                                {isSExp && (
                                                                    <div className="tree-children">
                                                                        {Object.entries(secData.topics).map(([topName, topData]) => (
                                                                            <div key={topName} className="tree-node topic tree-leaf">
                                                                                <span className="tree-icon">•</span>
                                                                                <span className="tree-title">{topName.replace(/_/g, ' ')}</span>
                                                                                <span className="tree-count">{topData.count} chunks</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    </div>

                    {/* RIGHTSIDE: GRAPH TRIPLE COLUMN (Placeholder) */}
                    <div className="right-panel">
                        <section className="focus-graph-section card">
                            <h2>Interactive Focus Graph</h2>
                            <p className="focus-hint">Click any node to navigate the dependency graph.</p>

                            {!activeNode ? (
                                <div className="focus-empty">No chunks available.</div>
                            ) : (
                                <div className="focus-graph-container">
                                    {/* COLUMN 1: PREREQ */}
                                    <div className="graph-col">
                                        <h4>Prerequisites ({prereqsOfActive.length})</h4>
                                        <div className="graph-nodes">
                                            {prereqsOfActive.length === 0 ? <div className="graph-node-empty">None</div> :
                                                prereqsOfActive.map(p => (
                                                    <div key={p.id} className="graph-node clickable" onClick={() => setSelectedNodeId(p.id)}>
                                                        <span className="gn-topic">{p.topic.replace(/_/g, ' ')}</span>
                                                        <span className="gn-id">Sec {p.section}</span>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>

                                    <div className="graph-arrow">→</div>

                                    {/* COLUMN 2: ACTIVE */}
                                    <div className="graph-col graph-active">
                                        <h4>Selected Concept</h4>
                                        <div className="graph-nodes">
                                            <div className="graph-node selected">
                                                <span className="gn-topic">{activeNode.topic.replace(/_/g, ' ')}</span>
                                                <span className="gn-id">Ch {activeNode.chapter} • Sec {activeNode.section}</span>
                                                <span className="gn-content">{activeNode.text.substring(0, 100)}...</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="graph-arrow">→</div>

                                    {/* COLUMN 3: DEPENDENTS */}
                                    <div className="graph-col">
                                        <h4>Dependents ({depsOfActive.length})</h4>
                                        <div className="graph-nodes">
                                            {depsOfActive.length === 0 ? <div className="graph-node-empty">None</div> :
                                                depsOfActive.map(d => (
                                                    <div key={d.id} className="graph-node clickable" onClick={() => setSelectedNodeId(d.id)}>
                                                        <span className="gn-topic">{d.topic.replace(/_/g, ' ')}</span>
                                                        <span className="gn-id">Sec {d.section}</span>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>

                        {activeNode && (
                            <section className="chunk-inspector-section card">
                                <h2>Chunk Inspector</h2>
                                <div className="inspector-meta">
                                    <span className="badge-inline chapter">CH: {activeNode.chapter}</span>
                                    <span className="badge-inline section">SEC: {activeNode.section}</span>
                                    <span className="badge-inline topic">TOPIC: {activeNode.topic}</span>
                                </div>
                                <div className="inspector-content-box">
                                    {activeNode.text.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                </div>
                            </section>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
