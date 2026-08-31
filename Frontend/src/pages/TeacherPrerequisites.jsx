import React, { useState, useEffect, useMemo } from 'react';
import { LayoutDashboard, AlertCircle, Edit3, Settings, BookOpen, Layers, Link as LinkIcon, Network } from 'lucide-react';
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
    const [relationships, setRelationships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedChunkId, setSelectedChunkId] = useState(null);

    const [documents, setDocuments] = useState([]);
    const [actionLoading, setActionLoading] = useState(false);

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
            try {
                setChunks([]);
                setRelationships([]);
                setSelectedChunkId(null);
                const artifacts = await getCourseArtifacts(selectedCourse, session?.access_token);

                if (artifacts && artifacts.chunks) {
                    setChunks(artifacts.chunks);
                }
                if (artifacts && artifacts.prerequisites && artifacts.prerequisites.relationships) {
                    setRelationships(artifacts.prerequisites.relationships);
                }
            } catch (err) {
                console.error('Error fetching artifacts:', err);
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

    // UI HELPER VARS
    const selectedChunk = chunks.find(c => c.id === selectedChunkId);

    // Dependencies: Things selected concept requires
    const prerequisites = relationships.filter(r => r.concept_id === selectedChunkId);

    // Dependents: Things that require the selected concept
    const dependents = relationships.filter(r => r.prerequisite_id === selectedChunkId);

    // Group chunks by chapter/topic
    const hierarchy = useMemo(() => {
        const groups = {};
        chunks.forEach(chunk => {
            const chap = chunk.chapter || 'Main Curriculum';
            const top = chunk.topic || 'General Topic';

            if (!groups[chap]) groups[chap] = {};
            if (!groups[chap][top]) groups[chap][top] = [];
            groups[chap][top].push(chunk);
        });
        return groups;
    }, [chunks]);

    return (
        <div className="page-container" style={{ paddingBottom: '4rem', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="text-h1">
                        <span style={{ color: 'var(--color-orange)' }}>Artifact</span> Review
                    </h1>
                    <p className="text-body" style={{ maxWidth: '600px', marginTop: '0.5rem' }}>
                        Review the generated concept hierarchies and dependencies before publishing.
                    </p>
                </div>

                {activeDoc && (
                    <div className="card-white" style={{ padding: '0.75rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>PIPELINE STATUS:</span>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                                {activeDoc.status === 'published' ? '🟢 Published (Live)' : activeDoc.status === 'approved' ? '🟡 Approved (Ready to Publish)' : activeDoc.status === 'needs_revision' ? '🔴 Needs Revision' : '🟠 Pending Review'}
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

            {/* Metrics */}
            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <StatCard tag="Layer 1" tagColor="purple" number={chunks.length || '--'} label="Raw Knowledge Chunks" />
                <StatCard tag="Layer 2" tagColor="orange" number={chunks.length || '--'} label="Extracted Concepts" />
                <StatCard tag="Layer 3" tagColor="sky" number={Object.keys(hierarchy).length || '--'} label="Identified Chapters" />
                <StatCard tag="Layer 4" tagColor="green" number={relationships.length || '--'} label="Prerequisite Edges" />
            </section>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    Loading cognitive mappings...
                </div>
            ) : (!chunks.length ? (
                <div className="card-white" style={{ padding: '2rem', textAlign: 'center' }}>
                    <AlertCircle size={32} style={{ color: 'var(--color-orange)', margin: '0 auto 1rem' }} />
                    <p style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>No artifacts identified. This course might not have completed ingestion natively.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '1.5rem', alignItems: 'stretch' }}>

                    {/* HIERARCHY NAVIGATION COLUMN */}
                    <div className="card-white" style={{ padding: '1.25rem', overflowY: 'auto', maxHeight: '700px' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Layers size={18} color="var(--color-purple)" /> Course Structure
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {Object.entries(hierarchy).map(([chapName, topics]) => (
                                <div key={chapName}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                                        {chapName}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--color-border)' }}>
                                        {Object.entries(topics).map(([topicName, topicChunks]) => (
                                            <div key={topicName}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-ink)', marginBottom: '0.25rem' }}>{topicName}</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', paddingLeft: '0.5rem' }}>
                                                    {topicChunks.map(chunk => (
                                                        <button
                                                            key={chunk.id}
                                                            onClick={() => setSelectedChunkId(chunk.id)}
                                                            style={{
                                                                textAlign: 'left',
                                                                padding: '0.35rem 0.5rem',
                                                                fontSize: '0.8rem',
                                                                borderRadius: '4px',
                                                                backgroundColor: selectedChunkId === chunk.id ? 'var(--color-orange-subtle)' : 'transparent',
                                                                color: selectedChunkId === chunk.id ? 'var(--color-orange)' : 'var(--color-text-secondary)',
                                                                fontWeight: selectedChunkId === chunk.id ? 700 : 500,
                                                                cursor: 'pointer',
                                                                border: 'none',
                                                                transition: 'background-color 0.2s',
                                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                            }}>
                                                            📄 {chunk.id}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3-COLUMN INTERACTIVE GRAPH LAYOUT */}
                    <div className="card-white" style={{ padding: '1.5rem', minHeight: '600px', backgroundColor: 'var(--color-offwhite)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Network size={20} color="var(--color-orange)" /> Structural Topology
                        </h3>

                        {!selectedChunk ? (
                            <div style={{ margin: '4rem auto', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                <AlertCircle size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                                <p>Select a concept from the Course Structure to inspect its edges.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr 1fr', gap: '1rem', height: '100%' }}>

                                {/* 1. PREREQUISITES COLUMN */}
                                <div style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', borderBottom: '1.5px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                        Prerequisites
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
                                        {prerequisites.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '2rem' }}>No defined prerequisites.</div> : null}
                                        {prerequisites.map((rel, i) => {
                                            const depChunk = chunks.find(c => c.id === rel.prerequisite_id);
                                            return (
                                                <div key={i} onClick={() => setSelectedChunkId(rel.prerequisite_id)} style={{ cursor: 'pointer', padding: '0.75rem', border: '1px dashed var(--color-purple)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-purple-subtle)' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-purple)', marginBottom: '0.25rem' }}>{depChunk?.topic || rel.prerequisite_id}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-ink)', marginBottom: '0.5rem', fontWeight: 600 }}>{rel.prerequisite_id}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{rel.reason} (Conf: {(rel.confidence * 100).toFixed(0)}%)</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 2. SELECTED CONCEPT CENTER */}
                                <div style={{ backgroundColor: '#fff', border: '2px solid var(--color-orange)', borderRadius: 'var(--radius-md)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 4px 12px rgba(255, 115, 60, 0.15)' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--color-orange)', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center', borderBottom: '2px solid var(--color-orange-subtle)', paddingBottom: '0.5rem' }}>
                                        Target Concept Focus
                                    </h4>
                                    <div style={{ marginTop: '0.5rem' }}>
                                        <Pill size="sm" color="purple">{selectedChunk.chapter || 'Chapter'}</Pill>
                                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-ink)', marginTop: '0.75rem', marginBottom: '0.25rem' }}>
                                            {selectedChunk.topic || 'Definition Node'}
                                        </h2>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '1rem' }}>
                                            ID: {selectedChunk.id}
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, padding: '1rem', backgroundColor: 'var(--color-offwhite)', borderRadius: 'var(--radius-sm)', maxHeight: '300px', overflowY: 'auto' }}>
                                            {selectedChunk.text}
                                        </div>
                                    </div>
                                </div>

                                {/* 3. DEPENDENTS COLUMN */}
                                <div style={{ backgroundColor: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', textAlign: 'center', borderBottom: '1.5px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                                        Dependents
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
                                        {dependents.length === 0 ? <div style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '0.85rem', fontStyle: 'italic', marginTop: '2rem' }}>No child concepts depend on this.</div> : null}
                                        {dependents.map((rel, i) => {
                                            const depChunk = chunks.find(c => c.id === rel.concept_id);
                                            return (
                                                <div key={i} onClick={() => setSelectedChunkId(rel.concept_id)} style={{ cursor: 'pointer', padding: '0.75rem', border: '1px dashed var(--color-sky)', borderRadius: 'var(--radius-sm)', backgroundColor: '#f0f9ff' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0369a1', marginBottom: '0.25rem' }}>{depChunk?.topic || rel.concept_id}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--color-ink)', marginBottom: '0.5rem', fontWeight: 600 }}>{rel.concept_id}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{rel.reason} (Conf: {(rel.confidence * 100).toFixed(0)}%)</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                            </div>
                        )}
                    </div>

                </div>
            ))}
        </div>
    );
}
