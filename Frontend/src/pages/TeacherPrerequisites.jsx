import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, AlertCircle, Edit3, Settings, BookOpen, Layers, Link as LinkIcon, Network, ArrowDown, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { Pill } from '../components/common/Pill';
import { StatCard } from '../components/cards/StatCard';
import { getCourseArtifacts, fetchLibraryDocuments, approveCourse, reviseCourse, publishCourse } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

export function TeacherPrerequisites() {
    const { session } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [chunks, setChunks] = useState([]);
    const [concepts, setConcepts] = useState([]);
    const [relationships, setRelationships] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [documents, setDocuments] = useState([]);

    // generalized selection state: { type: 'chunk' | 'concept' | 'relationship', data?: any, id?: string }
    const [selectedItem, setSelectedItem] = useState(null);

    // UI states for expanding chapters
    const [expandedChapters, setExpandedChapters] = useState({});

    // 1. Fetch available courses
    const loadCourses = async () => {
        try {
            const docsData = await fetchLibraryDocuments(session?.access_token);
            const availableDocuments = docsData.documents || [];
            // Remove duplicates
            const uniqueCourses = [...new Set(availableDocuments.map(d => d.subject || d.id))].filter(Boolean);

            setDocuments(availableDocuments);
            setCourses(uniqueCourses);

            const queryParams = new URLSearchParams(location.search);
            const courseFromQuery = queryParams.get('course');

            if (courseFromQuery && uniqueCourses.includes(courseFromQuery)) {
                setSelectedCourse(courseFromQuery);
            } else if (!selectedCourse && uniqueCourses.length > 0) {
                setSelectedCourse(uniqueCourses[0]);
            }
        } catch (err) {
            console.error('Error loading courses:', err);
            setError("Unable to load the available courses workspace.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCourses();
    }, [session?.access_token, location.search]);

    // 2. Fetch Artifacts when course changes
    useEffect(() => {
        if (!selectedCourse) return;

        async function fetchArtifacts() {
            setLoading(true);
            setError(null);
            try {
                setChunks([]);
                setConcepts([]);
                setRelationships([]);
                setSelectedItem(null);

                const artifacts = await getCourseArtifacts(selectedCourse, session?.access_token);

                if (artifacts && artifacts.chunks) {
                    setChunks(artifacts.chunks);
                }
                const fetchedConcepts =
                    Array.isArray(artifacts?.concepts?.concepts)
                        ? artifacts.concepts.concepts
                        : Array.isArray(artifacts?.concepts)
                            ? artifacts.concepts
                            : [];
                setConcepts(fetchedConcepts);
                const fetchedRelationships =
                    Array.isArray(artifacts?.prerequisites?.relationships)
                        ? artifacts.prerequisites.relationships
                        : Array.isArray(artifacts?.prerequisites)
                            ? artifacts.prerequisites
                            : [];
                setRelationships(fetchedRelationships);
            } catch (err) {
                console.error('Error fetching artifacts:', err);
                setError("Unable to load the course knowledge map.");
            } finally {
                setLoading(false);
            }
        }
        fetchArtifacts();
    }, [selectedCourse, session?.access_token]);

    const handleApprove = async () => {
        if (!window.confirm("Approve these extracted concepts for publication?")) return;
        setActionLoading(true);
        try {
            await approveCourse(selectedCourse, session?.access_token);
            await loadCourses();
            alert("Course approved! You may now Publish it.");
        } catch (e) {
            alert('Approval failed: ' + e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!window.confirm("Publish this course to all students?")) return;
        setActionLoading(true);
        try {
            await publishCourse(selectedCourse, session?.access_token);
            await loadCourses();
            alert("Course published successfully! It is now active for students.");
        } catch (e) {
            alert('Publishing failed: ' + e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevise = async () => {
        const reason = window.prompt("Enter revision reason:");
        if (!reason) return;
        setActionLoading(true);
        try {
            await reviseCourse(selectedCourse, reason, session?.access_token);
            await loadCourses();
        } catch (e) {
            alert('Revision update failed: ' + e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const activeDoc = documents.find(d => (d.subject === selectedCourse || d.id === selectedCourse));

    // ==========================================
    // 3. CORE MANY-TO-MANY DATA TRANSFORMATIONS
    // ==========================================
    const { conceptById, conceptsByChunkId, chunksByConceptId } = useMemo(() => {
        const cById = new Map();
        const cByChunk = new Map();
        const chByConcept = new Map();

        // Register all concepts
        concepts.forEach(c => {
            if (c.concept_id) cById.set(c.concept_id, c);
        });

        // Initialize helper map for chunks to grab objects quickly
        const chunkMap = new Map();
        chunks.forEach(ch => chunkMap.set(ch.id, ch));

        // Safely project N:M mapping (Concepts -> Chunks -> Concepts)
        concepts.forEach(concept => {
            chByConcept.set(concept.concept_id, []);
            if (concept.evidence && Array.isArray(concept.evidence)) {
                concept.evidence.forEach(ev => {
                    const chunkId = ev.chunk_id;
                    if (!chunkId) return;

                    // Add concept to chunk map
                    if (!cByChunk.has(chunkId)) cByChunk.set(chunkId, []);
                    if (!cByChunk.get(chunkId).some(c => c.concept_id === concept.concept_id)) {
                        cByChunk.get(chunkId).push(concept);
                    }

                    // Add chunk to concept map
                    if (chunkMap.has(chunkId)) {
                        const chunkObj = chunkMap.get(chunkId);
                        if (!chByConcept.get(concept.concept_id).some(c => c.id === chunkId)) {
                            chByConcept.get(concept.concept_id).push(chunkObj);
                        }
                    }
                });
            }
        });

        return { conceptById: cById, conceptsByChunkId: cByChunk, chunksByConceptId: chByConcept };
    }, [concepts, chunks]);

    // ==========================================
    // 4. HIERARCHICAL COURSE STRUCTURE
    // ==========================================
    const courseStructure = useMemo(() => {
        const structure = [];
        const sortedChunks = [...chunks].sort((a, b) => (a.chunk_index || 0) - (b.chunk_index || 0));

        const chapterMap = new Map();

        sortedChunks.forEach(chunk => {
            const chap = chunk.chapter || 'Main Curriculum';
            const sec = chunk.section_label || chunk.section || chunk.topic || 'General Topic';

            if (!chapterMap.has(chap)) {
                chapterMap.set(chap, new Map());
            }

            const sectionMap = chapterMap.get(chap);
            if (!sectionMap.has(sec)) {
                sectionMap.set(sec, []);
            }

            sectionMap.get(sec).push(chunk);
        });

        chapterMap.forEach((sections, chapterName) => {
            const secs = [];
            sections.forEach((chks, sectionName) => {
                secs.push({ name: sectionName, chunks: chks });
            });
            structure.push({ chapter: chapterName, sections: secs });
        });

        return structure;
    }, [chunks]);

    // Initialize all chapters as expanded
    useEffect(() => {
        if (courseStructure.length > 0 && Object.keys(expandedChapters).length === 0) {
            const initialExpanded = {};
            courseStructure.forEach((c, i) => initialExpanded[i] = true);
            setExpandedChapters(initialExpanded);
        }
    }, [courseStructure]);

    const toggleChapter = (index) => {
        setExpandedChapters(prev => ({ ...prev, [index]: !prev[index] }));
    };

    // ==========================================
    // 5. PREREQUISITE SUMMARIES & GROUPING
    // ==========================================
    const prereqSummary = useMemo(() => {
        let req = 0; let sup = 0;
        relationships.forEach(r => {
            if (r.relationship?.toUpperCase() === 'REQUIRED') req++;
            else sup++;
        });
        return { total: relationships.length, required: req, supporting: sup };
    }, [relationships]);

    // Group dependencies cleanly (concept C requires A, B)
    const prerequisitesByDependent = useMemo(() => {
        const map = new Map();
        relationships.forEach(r => {
            if (!map.has(r.concept_id)) map.set(r.concept_id, []);
            map.get(r.concept_id).push(r);
        });
        return map;
    }, [relationships]);

    // ==========================================
    // INSPECTOR RENDERING HELPERS
    // ==========================================
    const renderInspector = () => {
        if (!selectedItem) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    <Info size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                    <p style={{ fontWeight: 600 }}>Select a Concept, Chunk, or Relationship to inspect details.</p>
                </div>
            );
        }

        if (selectedItem.type === 'concept') {
            const concept = conceptById.get(selectedItem.id);
            if (!concept) return <div style={{ color: 'red' }}>Unknown concept.</div>;

            const relatedChunks = chunksByConceptId.get(concept.concept_id) || [];

            // Find its structural Prereqs & Dependents globally
            const conceptPrereqs = relationships.filter(r => r.concept_id === concept.concept_id);
            const conceptDependents = relationships.filter(r => r.prerequisite_id === concept.concept_id);

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Pill size="sm" color="orange">Concept</Pill>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>{concept.name}</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{concept.description}</p>

                    {concept.confidence !== undefined && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Confidence: {(concept.confidence * 100).toFixed(0)}%</div>
                    )}

                    <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

                    <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Source Evidence ({relatedChunks.length})</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {relatedChunks.length === 0 ? <span style={{ fontSize: '0.85rem', color: 'gray' }}>No source chunks associated.</span> : null}
                            {relatedChunks.map(ch => (
                                <div key={ch.id}
                                    onClick={() => setSelectedItem({ type: 'chunk', id: ch.id })}
                                    style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', backgroundColor: 'var(--color-offwhite)', borderRadius: '4px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--color-purple)' }}>{ch.topic || ch.id}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>{ch.chapter} → {ch.section_label || 'Section'}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                        <div>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Prerequisites</h4>
                            {conceptPrereqs.length === 0 ? <div style={{ fontSize: '0.8rem', color: 'gray' }}>None</div> : null}
                            {conceptPrereqs.map((r, i) => (
                                <div key={i} onClick={() => setSelectedItem({ type: 'concept', id: r.prerequisite_id })} style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-purple)', textDecoration: 'underline', marginBottom: '0.25rem' }}>
                                    {conceptById.get(r.prerequisite_id)?.name || r.prerequisite_id}
                                </div>
                            ))}
                        </div>
                        <div>
                            <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Dependents</h4>
                            {conceptDependents.length === 0 ? <div style={{ fontSize: '0.8rem', color: 'gray' }}>None</div> : null}
                            {conceptDependents.map((r, i) => (
                                <div key={i} onClick={() => setSelectedItem({ type: 'concept', id: r.concept_id })} style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#0ea5e9', textDecoration: 'underline', marginBottom: '0.25rem' }}>
                                    {conceptById.get(r.concept_id)?.name || r.concept_id}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (selectedItem.type === 'relationship') {
            const rel = selectedItem.data;
            const prereq = conceptById.get(rel.prerequisite_id);
            const dependent = conceptById.get(rel.concept_id);

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Pill size="sm" color={rel.relationship?.toUpperCase() === 'REQUIRED' ? 'orange' : 'sky'}>{rel.relationship}</Pill>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Dependency</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--color-offwhite)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                        <div onClick={() => prereq && setSelectedItem({ type: 'concept', id: prereq.concept_id })} style={{ cursor: prereq ? 'pointer' : 'default', fontWeight: 700, color: 'var(--color-ink)' }}>
                            {prereq?.name || `[Unknown: ${rel.prerequisite_id}]`}
                        </div>
                        <div style={{ paddingLeft: '1rem', color: 'var(--color-text-muted)' }}>
                            <ArrowDown size={14} />
                        </div>
                        <div onClick={() => dependent && setSelectedItem({ type: 'concept', id: dependent.concept_id })} style={{ cursor: dependent ? 'pointer' : 'default', fontWeight: 700, color: 'var(--color-purple)' }}>
                            {dependent?.name || `[Unknown: ${rel.concept_id}]`}
                        </div>
                    </div>

                    <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)' }}>Reason</h4>
                        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>{rel.reason}</p>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Edge Confidence: {(rel.confidence * 100).toFixed(0)}%
                    </div>

                    {rel.evidence && rel.evidence.length > 0 && (
                        <div>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.5rem' }}>Edge Source Evidence</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                {rel.evidence.map((eid, idx) => (
                                    <div key={idx} onClick={() => setSelectedItem({ type: 'chunk', id: eid })} style={{ cursor: 'pointer', padding: '0.25rem 0.5rem', backgroundColor: '#e2e8f0', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                                        Source Material
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (selectedItem.type === 'chunk') {
            const chunk = chunks.find(c => c.id === selectedItem.id);
            if (!chunk) return <div style={{ color: 'red' }}>Source chunk unavailable.</div>;

            const relatedConcepts = conceptsByChunkId.get(chunk.id) || [];

            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Pill size="sm" color="purple">Source Material</Pill>
                    </div>

                    <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-ink)' }}>{chunk.topic || 'Untitled Source'}</h3>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                            {chunk.chapter} → {chunk.section_label || chunk.section}
                            {chunk.page_start && ` (Pages ${chunk.page_start}-${chunk.page_end})`}
                        </div>
                    </div>

                    <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Concepts In This Chunk</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {relatedConcepts.length === 0 ? <span style={{ fontSize: '0.85rem', fontStyle: 'italic', color: 'gray' }}>No concepts</span> : null}
                            {relatedConcepts.map(c => (
                                <Pill key={c.concept_id} size="sm" color="orange" onClick={() => setSelectedItem({ type: 'concept', id: c.concept_id })} style={{ cursor: 'pointer' }}>
                                    {c.name}
                                </Pill>
                            ))}
                        </div>
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

                    <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Source Material</h4>
                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, padding: '1rem', backgroundColor: 'var(--color-offwhite)', borderRadius: 'var(--radius-sm)', maxHeight: '350px', overflowY: 'auto' }}>
                            {chunk.text}
                        </div>
                    </div>
                </div>
            );
        }
    };

    return (
        <div className="page-container" style={{ paddingBottom: '4rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="text-h1">
                        <span style={{ color: 'var(--color-orange)' }}>Knowledge</span> Map
                    </h1>
                    <p className="text-body" style={{ maxWidth: '600px', marginTop: '0.5rem' }}>
                        Review the generated cognitive structure and prerequisite dependencies before publishing to students.
                    </p>
                </div>

                {activeDoc && (
                    <div className="card-white" style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>PIPELINE STATUS:</span>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                                {activeDoc.status === 'published' ? '🟢 Published (Live)'
                                    : activeDoc.status === 'approved' ? '🟡 Approved (Ready to Publish)'
                                        : activeDoc.status === 'needs_revision' ? '🔴 Needs Revision'
                                            : '🟠 Pending Review'}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', borderLeft: '1px solid var(--color-border)', paddingLeft: '1rem' }}>
                            {(activeDoc.status === 'pending_review' || activeDoc.status === 'needs_revision') && (
                                <button onClick={handleApprove} disabled={actionLoading} className="btn btn-purple" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                                    Approve Course
                                </button>
                            )}
                            {(activeDoc.status === 'pending_review' || activeDoc.status === 'approved') && (
                                <button onClick={handleRevise} disabled={actionLoading} className="btn btn-outline" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderColor: '#ef4444', color: '#ef4444' }}>
                                    Reject / Revise
                                </button>
                            )}
                            {activeDoc.status === 'approved' && (
                                <button onClick={handlePublish} disabled={actionLoading} className="btn btn-orange" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                                    Publish Course Live
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Course Selector */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Select Assessed Subject:</label>
                <select
                    value={selectedCourse}
                    onChange={(e) => {
                        setSelectedCourse(e.target.value);
                        window.history.replaceState(null, '', `/teacher/review?course=${encodeURIComponent(e.target.value)}`);
                    }}
                    style={{ padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', outline: 'none', backgroundColor: '#fff', minWidth: '350px' }}
                >
                    {courses.length === 0 ? <option value="">No subjects found</option> : null}
                    {courses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => navigate('/teacher')} className="btn btn-outline" style={{ padding: '0.6rem 1rem', fontSize: '0.85rem' }}>Back to Courses Workspace</button>
            </div>

            {/* Error State */}
            {error && (
                <div style={{ padding: '1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', color: '#dc2626', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={20} />
                    <span style={{ fontWeight: 600 }}>{error}</span>
                    <button onClick={() => window.location.reload()} style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid #fca5a5', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', color: '#b91c1c' }}>Retry Request</button>
                </div>
            )}

            {/* Content Loading & State Management */}
            {loading ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Loading knowledge map...</div>
                </div>
            ) : (!chunks.length ? (
                <div className="card-white" style={{ padding: '4rem', textAlign: 'center' }}>
                    <AlertCircle size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>Course source material is not available.</p>
                </div>
            ) : (!concepts.length ? (
                <div className="card-white" style={{ padding: '4rem', textAlign: 'center' }}>
                    <AlertCircle size={48} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem', opacity: 0.5 }} />
                    <p style={{ color: 'var(--color-text-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>Concept information is not available for this course.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* TOP SUMMARY BAR */}
                    <div className="card-white" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--color-orange)' }}>
                        <div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-ink)' }}>Prerequisite Relationships</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                                {prereqSummary.total === 0 ? "No prerequisite relationships were detected for this course." : `${prereqSummary.total} relationships detected in total.`}
                            </p>
                        </div>
                        {prereqSummary.total > 0 && (
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-orange)' }}>{prereqSummary.required}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Required</div>
                                </div>
                                <div style={{ width: '1px', backgroundColor: 'var(--color-border)' }}></div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-sky)' }}>{prereqSummary.supporting}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Supporting</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MAIN TWO-COLUMN STRUCTURE */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2fr 1.25fr', gap: '1.5rem', alignItems: 'stretch' }}>

                        {/* LEFT: COURSE STRUCTURE */}
                        <div className="card-white" style={{ padding: '1.25rem', maxHeight: '800px', overflowY: 'auto' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-ink)' }}>
                                <Layers size={20} color="var(--color-purple)" /> Course Structure
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {courseStructure.map((chap, i) => (
                                    <div key={i} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                                        {/* Chapter Header */}
                                        <div
                                            onClick={() => toggleChapter(i)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--color-offwhite)', cursor: 'pointer', borderBottom: expandedChapters[i] ? '1px solid var(--color-border)' : 'none' }}>
                                            {expandedChapters[i] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)' }}>{chap.chapter}</span>
                                        </div>

                                        {/* Chapter Content */}
                                        {expandedChapters[i] && (
                                            <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                {chap.sections.map((sec, j) => (
                                                    <div key={j}>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-purple)', marginBottom: '0.5rem' }}>{sec.name}</div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--color-border)' }}>
                                                            {sec.chunks.map(chunk => {
                                                                const chunkConcepts = conceptsByChunkId.get(chunk.id) || [];
                                                                const isSelected = selectedItem?.type === 'chunk' && selectedItem?.id === chunk.id;

                                                                return (
                                                                    <div key={chunk.id}
                                                                        style={{ padding: '0.5rem', borderRadius: '4px', backgroundColor: isSelected ? 'var(--color-orange-subtle)' : 'transparent', border: isSelected ? '1px solid var(--color-orange)' : '1px solid var(--color-border)', cursor: 'pointer', transition: 'all 0.2s' }}
                                                                        onClick={() => setSelectedItem({ type: 'chunk', id: chunk.id })}>

                                                                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? 'var(--color-orange)' : 'var(--color-ink)' }}>
                                                                            {chunk.topic || `Source Material`}
                                                                        </div>

                                                                        {chunkConcepts.length > 0 && (
                                                                            <div style={{ marginTop: '0.5rem' }}>
                                                                                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', fontWeight: 700 }}>Concepts</div>
                                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                                                    {chunkConcepts.map(c => (
                                                                                        <span key={c.concept_id}
                                                                                            onClick={(e) => { e.stopPropagation(); setSelectedItem({ type: 'concept', id: c.concept_id }); }}
                                                                                            style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', backgroundColor: 'var(--color-offwhite)', borderRadius: '4px', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                                                                                            {c.name}
                                                                                        </span>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* MIDDLE: PREREQUISITE DEPENDENCY GRAPH OVERVIEW */}
                        <div className="card-white" style={{ padding: '1.25rem', maxHeight: '800px', overflowY: 'auto', backgroundColor: '#fafafa' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-ink)' }}>
                                <Network size={20} color="var(--color-orange)" /> Dependency Overview
                            </h3>

                            {relationships.length === 0 ? (
                                <div style={{ margin: '4rem auto', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                    <AlertCircle size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                                    <p>No prerequisite relationships exist.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {Array.from(prerequisitesByDependent.entries()).map(([dependentId, rels]) => {
                                        const dependentConcept = conceptById.get(dependentId);
                                        // Gracefully handle unresolved concepts instead of crashing
                                        const dependentName = dependentConcept ? dependentConcept.name : `[Unknown Concept]`;

                                        return (
                                            <div key={dependentId} style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                                <div
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-purple)' }}>{dependentName}</h4>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    requires <ArrowDown size={12} />
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid var(--color-purple-subtle)' }}>
                                                    {rels.map((rel, idx) => {
                                                        const prereqConcept = conceptById.get(rel.prerequisite_id);
                                                        const prereqName = prereqConcept ? prereqConcept.name : `[Unknown Concept]`;

                                                        const isSelectedEdge = selectedItem?.type === 'relationship' && selectedItem?.data === rel;

                                                        return (
                                                            <div key={idx}
                                                                onClick={() => setSelectedItem({ type: 'relationship', data: rel })}
                                                                style={{
                                                                    padding: '0.75rem',
                                                                    backgroundColor: isSelectedEdge ? '#fff7ed' : 'var(--color-offwhite)',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    cursor: 'pointer',
                                                                    border: isSelectedEdge ? '1px solid var(--color-orange)' : '1px solid transparent',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                <div style={{ fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                                                                    {prereqName}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.75rem' }}>
                                                                    <Pill size="sm" color={rel.relationship?.toUpperCase() === 'REQUIRED' ? 'orange' : 'sky'}>{rel.relationship}</Pill>
                                                                    <span style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Confidence: {(rel.confidence * 100).toFixed(0)}%</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* RIGHT: DYNAMIC INSPECTOR PANEL */}
                        <div className="card-white" style={{ padding: '1.25rem', maxHeight: '800px', overflowY: 'auto' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-ink)', borderBottom: '1.5px solid var(--color-border)', paddingBottom: '0.75rem' }}>
                                <AlertCircle size={20} color="var(--color-purple)" /> Inspector
                            </h3>

                            {renderInspector()}
                        </div>

                    </div>
                </div>
            )))}
        </div>
    );
}
