import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Users, BookOpen, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchDemoClassAnalytics } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/cards/StatCard';

export function TeacherMisconceptions() {
    const { session } = useAuth();
    const [demoData, setDemoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subjectFilter, setSubjectFilter] = useState('All');
    const [selectedConcept, setSelectedConcept] = useState(null);
    const [showStudents, setShowStudents] = useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await fetchDemoClassAnalytics(session?.access_token);
                setDemoData(data);
            } catch (err) {
                console.error('Error fetching class analytics demo:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, [session?.access_token]);

    const displayConcepts = useMemo(() => {
        if (!demoData) return [];
        let list = demoData.concepts;
        if (subjectFilter !== 'All') {
            list = list.filter(c => c.subject === subjectFilter);
        }
        // No sorting, keep the natural curriculum order for a better overview, or sort by attention? The prompt didn't specify. Natural order is better for subject consistency.
        return list;
    }, [demoData, subjectFilter]);

    useEffect(() => {
        // Change selected concept if it gets filtered out, or keep it if it's still there
        setShowStudents(false);
    }, [selectedConcept]);

    if (loading) {
        return (
            <div className="page-container" style={{ paddingBottom: '4rem' }}>
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '1.2rem', fontWeight: 600 }}>
                    Loading Demo Analytics...
                </div>
            </div>
        );
    }

    if (!demoData) {
        return (
            <div className="page-container" style={{ paddingBottom: '4rem' }}>
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-red)' }}>
                    Failed to load demo analytics data.
                </div>
            </div>
        );
    }

    const { summary } = demoData;
    // max chart Y value based on target range max (e.g. 25)
    // we want the Y axis to easily scale above the max students
    const dataMax = Math.max(...demoData.concepts.map(c => c.students_needing_attention), 1);
    const maxStudentsAttention = Math.ceil(dataMax / 5) * 5 + 5; // e.g. if 19 -> 20 -> 25

    const subjectColors = {
        'DSA': 'var(--color-purple)',
        'DBMS': 'var(--color-orange)',
        'Economics': 'var(--color-yellow)',
        'IES': 'var(--color-teal)'
    };

    return (
        <div className="page-container" style={{ paddingBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h1 className="text-h1" style={{ margin: 0, textTransform: 'uppercase' }}>
                    MISCONCEPTIONS
                </h1>
                <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '100px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                }}>
                    Demo cohort · 50 students
                </span>
            </div>
            <p className="text-body" style={{ maxWidth: '680px', marginBottom: '2.5rem', fontSize: '1.1rem' }}>
                Class attention signals across concepts
                <br />
                <span style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{summary.total_students} students · {summary.tracked_subjects} subjects · {summary.tracked_concepts} concepts</span>
            </p>

            <section style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '2rem', alignItems: 'center' }}>
                    {['All', 'DSA', 'DBMS', 'Economics', 'IES'].map(subj => (
                        <button
                            key={subj}
                            onClick={() => { setSubjectFilter(subj); setSelectedConcept(null); }}
                            style={{
                                padding: '0.5rem 1.25rem',
                                borderRadius: '100px',
                                border: subjectFilter === subj ? `2px solid var(--color-ink)` : '1px solid var(--color-border)',
                                backgroundColor: subjectFilter === subj ? 'var(--color-ink)' : '#fff',
                                color: subjectFilter === subj ? '#fff' : 'var(--color-ink)',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'all 0.2s',
                                boxShadow: subjectFilter === subj ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            {subj}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(350px, 420px)', gap: '1.5rem', alignItems: 'start' }}>

                    {/* Main Chart Column (Vertical Bar Graph) */}
                    <div className="card-white" style={{ padding: '2rem', overflowX: 'auto' }}>
                        <h2 className="text-h2" style={{ fontSize: '1.25rem', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Students Needing Attention by Concept</span>
                            <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Y-axis: Number of distinct students</span>
                        </h2>

                        <div style={{ display: 'flex', height: '350px', paddingBottom: '1rem', position: 'relative' }}>
                            {/* Y-Axis lines and labels */}
                            <div style={{ position: 'absolute', top: 0, bottom: '3rem', left: 0, width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 0 }}>
                                {[...Array(6)].map((_, i) => {
                                    const val = Math.round(maxStudentsAttention - (maxStudentsAttention * i / 5));
                                    return (
                                        <div key={i} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{ width: '25px', textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{val}</span>
                                            <div style={{ flex: 1, borderTop: i === 5 ? '2px solid var(--color-border)' : '1px dashed var(--color-offwhite)' }}></div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Bars */}
                            <div style={{ display: 'flex', gap: '1rem', flex: 1, marginLeft: '40px', alignItems: 'flex-end', zIndex: 1, minWidth: 'min-content' }}>
                                {displayConcepts.map((item) => {
                                    const barColor = subjectColors[item.subject] || 'var(--color-ink)';
                                    const heightPct = (item.students_needing_attention / maxStudentsAttention) * 100;
                                    const isSelected = selectedConcept?.concept_id === item.concept_id;

                                    return (
                                        <div
                                            key={item.concept_id}
                                            onClick={() => setSelectedConcept(item)}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                flex: 1,
                                                minWidth: '60px',
                                                height: '100%',
                                                cursor: 'pointer',
                                                justifyContent: 'flex-end',
                                                group: 'barGrp'
                                            }}
                                            className="chart-bar"
                                        >
                                            <div style={{
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'flex-end',
                                                alignItems: 'center',
                                                backgroundColor: isSelected ? 'rgba(0,0,0,0.03)' : 'transparent',
                                                borderRadius: '8px 8px 0 0',
                                                transition: 'background-color 0.2s',
                                                paddingTop: '20px'
                                            }}>
                                                <div style={{
                                                    marginBottom: '0.5rem',
                                                    fontSize: '0.9rem',
                                                    fontWeight: 800,
                                                    color: isSelected ? 'var(--color-ink)' : 'var(--color-text-secondary)'
                                                }}>
                                                    {item.students_needing_attention}
                                                </div>
                                                <div style={{
                                                    width: '40px',
                                                    height: `${Math.max(heightPct, 2)}%`,
                                                    backgroundColor: barColor,
                                                    borderRadius: '4px 4px 0 0',
                                                    transition: 'height 0.4s ease-out, filter 0.2s',
                                                    filter: isSelected ? 'brightness(0.9) drop-shadow(0 -4px 8px rgba(0,0,0,0.1))' : 'brightness(1)'
                                                }}></div>
                                            </div>

                                            <div
                                                title={item.concept}
                                                style={{
                                                    marginTop: '0.75rem',
                                                    fontSize: '0.75rem',
                                                    fontWeight: isSelected ? 800 : 600,
                                                    color: isSelected ? 'var(--color-ink)' : 'var(--color-text-secondary)',
                                                    textAlign: 'center',
                                                    width: '100%',
                                                    height: '40px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    wordBreak: 'break-word',
                                                    lineHeight: 1.2
                                                }}
                                            >
                                                {item.concept}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Drilldown Panel */}
                    <div style={{ position: 'sticky', top: '1.5rem' }}>
                        {selectedConcept ? (
                            <div className="card-white" style={{ padding: '0', overflow: 'hidden', borderLeft: `6px solid ${subjectColors[selectedConcept.subject] || 'var(--color-ink)'}` }}>

                                <div style={{ padding: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                                        {selectedConcept.concept}
                                    </h3>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginBottom: '1.5rem' }}>
                                        {selectedConcept.students_needing_attention} students showing an attention signal
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <AlertTriangle size={18} style={{ color: '#dc2626' }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#dc2626', letterSpacing: '0.05em' }}>ATTENTION SIGNAL</span>
                                    </div>
                                    <div style={{ fontSize: '0.95rem', color: 'var(--color-ink)', lineHeight: 1.5, marginBottom: '1.5rem', paddingLeft: '1.75rem' }}>
                                        Repeated incorrect attempts were observed<br />
                                        across practice activity for this concept.
                                    </div>

                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                                        WHY MIGHT THIS BE HAPPENING?
                                    </div>
                                    <div style={{ fontSize: '0.95rem', color: 'var(--color-ink)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                                        {selectedConcept.possible_misconception}
                                    </div>

                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                                        POSSIBLE PREREQUISITE
                                    </div>
                                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: subjectColors[selectedConcept.subject], marginBottom: '1.5rem' }}>
                                        {selectedConcept.possible_prerequisite}
                                    </div>

                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>
                                        EVIDENCE
                                    </div>
                                    <div style={{ fontSize: '0.95rem', color: 'var(--color-ink)', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                                        {selectedConcept.students_needing_attention} distinct students generated repeated<br />
                                        incorrect-attempt signals associated with<br />
                                        {selectedConcept.concept}.
                                    </div>

                                    <button
                                        onClick={() => setShowStudents(!showStudents)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            width: '100%',
                                            padding: '0.75rem 1rem',
                                            backgroundColor: 'var(--color-offwhite)',
                                            borderRadius: '8px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontWeight: 700,
                                            color: 'var(--color-ink)',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        <span>[ View Affected Students ]</span>
                                        {showStudents ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </button>
                                </div>

                                {showStudents && (
                                    <div style={{ backgroundColor: '#fafafa', padding: '1.5rem', borderTop: '1px solid var(--color-border)' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                            Students showing an attention signal:
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                            {selectedConcept.affected_students && selectedConcept.affected_students.map((studentName, idx) => (
                                                <div key={idx} style={{ fontSize: '0.85rem', color: 'var(--color-ink)', fontWeight: 500, padding: '0.25rem 0' }}>
                                                    {studentName}
                                                </div>
                                            ))}
                                        </div>
                                        {(!selectedConcept.affected_students || selectedConcept.affected_students.length === 0) && (
                                            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                No affected students tracked for this concept.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="card-white" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                <Layers size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.75rem' }}>Concept Inspector</h3>
                                <p style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>Select any concept from the chart to view evidence, possible misconceptions, and prerequisites.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}
