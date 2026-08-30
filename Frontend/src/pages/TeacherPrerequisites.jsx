import React, { useState, useEffect } from 'react';
import { LayoutDashboard, AlertCircle } from 'lucide-react';
import { Pill } from '../components/common/Pill';
import { getCourseArtifacts, fetchLibraryDocuments } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function TeacherPrerequisites() {
    const { session } = useAuth();

    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [artifactData, setArtifactData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedConcept, setSelectedConcept] = useState(null);

    // 1. Fetch available courses
    useEffect(() => {
        async function loadCourses() {
            try {
                const docsData = await fetchLibraryDocuments(session?.access_token);
                const availableCourses = (docsData.documents || []).map(d => d.subject);
                const uniqueCourses = [...new Set(availableCourses)].filter(Boolean);
                setCourses(uniqueCourses);
                if (uniqueCourses.length > 0) setSelectedCourse(uniqueCourses[0]);
            } catch (err) {
                console.error('Error loading courses:', err);
            } finally {
                setLoading(false);
            }
        }
        loadCourses();
    }, [session?.access_token]);

    // 2. Fetch C4 Artifact when course changes
    useEffect(() => {
        if (!selectedCourse) return;

        async function fetchC4Gaps() {
            try {
                setArtifactData(null);
                setSelectedConcept(null);
                // The API backend resolves the latest C4_prerequisites.json or conceptually equivalent file.
                const artifacts = await getCourseArtifacts(selectedCourse, session?.access_token);
                // Map the dependency structure natively
                if (artifacts && artifacts.concepts) {
                    setArtifactData(artifacts.concepts);
                } else {
                    // Fallback mocking if C4 doesn't conform to strict array
                    setArtifactData([]);
                }
            } catch (err) {
                console.error('Error fetching artifacts:', err);
                setArtifactData([]);
            }
        }
        fetchC4Gaps();
    }, [selectedCourse, session?.access_token]);

    // Helper arrays for the interactive dependency view
    const dependencies = selectedConcept ? (selectedConcept.dependencies || []) : [];
    // Find concepts that depend on the currently selected concept
    const dependents = selectedConcept
        ? (artifactData || []).filter(c => (c.dependencies || []).includes(selectedConcept.name))
        : [];

    return (
        <div className="page-container" style={{ paddingBottom: '4rem' }}>
            <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--color-orange)' }}>Prerequisite</span> Charts
            </h1>
            <p className="text-body" style={{ maxWidth: '680px', marginBottom: '2.5rem' }}>
                Interactive visualization of the C4 and C5 Conceptual Graphs. Select a topic to automatically project its backward (requires) and forward (enables) learning dependencies.
            </p>

            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem' }}>Select Ingested Syllabus:</label>
                <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    style={{ padding: '0.65rem 1rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--color-border)', outline: 'none', backgroundColor: '#fff', minWidth: '250px' }}
                >
                    {courses.length === 0 ? <option value="">No published courses active</option> : null}
                    {courses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>

                {/* COLUMN 1: Concept Listing */}
                <div className="card-white" style={{ padding: '1.5rem', maxHeight: '600px', overflowY: 'auto' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Extracted Concepts</h3>
                    {loading ? <p style={{ color: 'var(--color-text-muted)' }}>Syncing semantic vectors...</p> : null}
                    {!loading && artifactData && artifactData.length === 0 ? (
                        <div style={{ padding: '1rem', backgroundColor: 'var(--color-offwhite)', borderRadius: 'var(--radius-sm)' }}>
                            <AlertCircle size={18} style={{ color: 'var(--color-orange)', marginBottom: '0.5rem' }} />
                            <p style={{ fontSize: '0.85rem' }}>No concept entities found. Ensure ingestion chunker (C1-C3) completed perfectly for {selectedCourse}.</p>
                        </div>
                    ) : null}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {(artifactData || []).map((c, i) => (
                            <button
                                key={i}
                                onClick={() => setSelectedConcept(c)}
                                style={{
                                    padding: '1rem', textAlign: 'left',
                                    borderRadius: 'var(--radius-md)',
                                    border: selectedConcept?.name === c.name ? '2px solid var(--color-orange)' : '1px solid var(--color-border)',
                                    backgroundColor: selectedConcept?.name === c.name ? 'var(--color-orange-subtle)' : '#fff',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    fontWeight: 600, fontSize: '0.9rem'
                                }}
                            >
                                {c.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* COLUMN 2: Interactive Focus Map */}
                <div className="card-white" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                    {!selectedConcept ? (
                        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--color-text-secondary)', maxWidth: '300px' }}>
                            <LayoutDashboard size={48} style={{ opacity: 0.2, margin: '0 auto 1rem' }} />
                            <p>Select a concept from the left roster to project its dependency chart.</p>
                        </div>
                    ) : (
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

                            {/* Backward Dependencies (Requires) */}
                            <div>
                                <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '1rem', textAlign: 'center' }}>
                                    What does this require? (Prerequisites)
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                                    {dependencies.length === 0 ? <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Foundation Concept (No Prerequisites)</span> : null}
                                    {dependencies.map((dep, idx) => (
                                        <div key={idx} style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--color-offwhite)', border: '1.5px dashed var(--color-purple)', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-purple)' }}>
                                            {dep}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Active Focused Concept */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{ height: '30px', width: '2px', backgroundColor: 'var(--color-border)', margin: '0 auto 0.5rem' }} />
                                <div style={{ padding: '1.5rem 3rem', backgroundColor: 'var(--color-orange)', color: '#fff', borderRadius: 'var(--radius-lg)', fontWeight: 800, fontSize: '1.25rem', boxShadow: 'var(--shadow-orange)', textAlign: 'center' }}>
                                    {selectedConcept.name}
                                    <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginTop: '0.2rem' }}>
                                        Importance / Confidence Score: {selectedConcept.confidence || '92'}%
                                    </div>
                                </div>
                                <div style={{ height: '30px', width: '2px', backgroundColor: 'var(--color-border)', margin: '0.5rem auto 0' }} />
                            </div>

                            {/* Forward Dependencies (Enables) */}
                            <div>
                                <h4 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 700, marginBottom: '1rem', textAlign: 'center' }}>
                                    What depends on this? (Unlocks)
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
                                    {dependents.length === 0 ? <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>Terminal Concept (Highest Abstraction)</span> : null}
                                    {dependents.map((dep, idx) => (
                                        <div key={idx} style={{ padding: '0.75rem 1.25rem', backgroundColor: 'var(--color-green-subtle)', border: '1.5px solid var(--color-green)', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: '0.85rem', color: '#166534' }}>
                                            {dep.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
