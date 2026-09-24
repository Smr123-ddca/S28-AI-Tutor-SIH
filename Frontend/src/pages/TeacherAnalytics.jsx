import React, { useState, useEffect, useMemo } from 'react';
import { BarChart2, Users, Brain, AlertTriangle, CheckCircle, TrendingDown, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Pill } from '../components/common/Pill';
import { fetchDemoClassAnalytics } from '../services/api';
import { useAuth } from '../context/AuthContext';

// =====================================================================
// Mastery Bar Component
// =====================================================================
function MasteryBar({ pct, status }) {
    let color = '#3b82f6';
    if (status === 'mastered') color = '#15803d';
    if (status === 'needs_attention') color = '#dc2626';

    return (
        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ flex: 1, backgroundColor: 'var(--color-border)', height: '6px', borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color, height: '100%', borderRadius: '100px', transition: 'width 0.4s ease-out' }} />
            </div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-ink)', width: '32px', textAlign: 'right' }}>
                {pct}%
            </span>
        </div>
    );
}

// =====================================================================
// Status Badge
// =====================================================================
function StatusBadge({ status }) {
    switch (status) {
        case 'mastered':
            return <Pill color="green" size="sm">Mastered</Pill>;
        case 'needs_attention':
            return <Pill color="red" size="sm">Action Needed</Pill>;
        case 'practicing':
            return <Pill color="purple" size="sm">Practicing</Pill>;
        case 'no_data':
            return <Pill color="gray" size="sm">No Data</Pill>;
        default:
            return <Pill color="gray" size="sm">Unknown</Pill>;
    }
}

// =====================================================================
// Student Attention Card
// =====================================================================
function StudentAttentionCard({ student }) {
    return (
        <div className="card-white" style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            padding: '1.25rem', borderLeft: '4px solid var(--color-orange)'
        }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-ink)' }}>{student.name}</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {student.signals.map((sig, idx) => (
                        <div key={idx} style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                            <AlertTriangle size={14} style={{ color: '#dc2626', marginTop: '2px', flexShrink: 0 }} />
                            <div>
                                <span style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{sig.concept}</span>
                                <span> · repeated incorrect attempts</span>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                                    {sig.possible_prerequisite && <span>Possible prerequisite: {sig.possible_prerequisite}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// =====================================================================
// Stat Card
// =====================================================================
function StatCard({ tag, tagColor, number, label, style }) {
    return (
        <div className="card-white" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', ...style }}>
            <div style={{ marginBottom: '1rem', alignSelf: 'flex-start' }}>
                <Pill color={tagColor} size="sm">{tag}</Pill>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-ink)', lineHeight: 1 }}>
                {number}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '0.5rem' }}>
                {label}
            </div>
        </div>
    );
}

// =====================================================================
// Misconceptions Bar Chart Component (Ported from standalone page)
// =====================================================================
function ConceptInspector({ concepts, subjectColors }) {
    const [selectedConcept, setSelectedConcept] = useState(null);
    const [showStudents, setShowStudents] = useState(false);

    if (concepts.length === 0) return null;

    const dataMax = Math.max(...concepts.map(c => c.students_needing_attention), 1);
    const maxStudentsAttention = Math.ceil(dataMax / 5) * 5 + 5;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(350px, 420px)', gap: '1.5rem', alignItems: 'start' }}>
            {/* Chart */}
            <div className="card-white" style={{ padding: '2rem', overflowX: 'auto' }}>
                <h2 className="text-h2" style={{ fontSize: '1.25rem', marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Students Needing Attention by Concept</span>
                    <span style={{ fontSize: '1rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>Y-axis: Number of distinct students</span>
                </h2>

                <div style={{ display: 'flex', height: '350px', paddingBottom: '1rem', position: 'relative' }}>
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

                    <div style={{ display: 'flex', gap: '1rem', flex: 1, marginLeft: '40px', alignItems: 'flex-end', zIndex: 1, minWidth: 'min-content' }}>
                        {concepts.map((item) => {
                            const barColor = subjectColors[item.subject] || 'var(--color-ink)';
                            const heightPct = (item.students_needing_attention / maxStudentsAttention) * 100;
                            const isSelected = selectedConcept?.concept_id === item.concept_id;

                            return (
                                <div
                                    key={item.concept_id}
                                    onClick={() => { setSelectedConcept(item); setShowStudents(false); }}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1,
                                        minWidth: '60px', height: '100%', cursor: 'pointer', justifyContent: 'flex-end',
                                    }}
                                >
                                    <div style={{
                                        width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center',
                                        backgroundColor: isSelected ? 'rgba(0,0,0,0.03)' : 'transparent',
                                        borderRadius: '8px 8px 0 0', transition: 'background-color 0.2s', paddingTop: '20px'
                                    }}>
                                        <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 800, color: isSelected ? 'var(--color-ink)' : 'var(--color-text-secondary)' }}>
                                            {item.students_needing_attention}
                                        </div>
                                        <div style={{
                                            width: '40px', height: `${Math.max(heightPct, 2)}%`, backgroundColor: barColor,
                                            borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease-out, filter 0.2s',
                                            filter: isSelected ? 'brightness(0.9) drop-shadow(0 -4px 8px rgba(0,0,0,0.1))' : 'brightness(1)'
                                        }}></div>
                                    </div>
                                    <div title={item.concept} style={{
                                        marginTop: '0.75rem', fontSize: '0.75rem', fontWeight: isSelected ? 800 : 600,
                                        color: isSelected ? 'var(--color-ink)' : 'var(--color-text-secondary)',
                                        textAlign: 'center', width: '100%', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', wordBreak: 'break-word', lineHeight: 1.2
                                    }}>
                                        {item.concept}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Drilldown */}
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
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                                    padding: '0.75rem 1rem', backgroundColor: 'var(--color-offwhite)', borderRadius: '8px',
                                    border: 'none', cursor: 'pointer', fontWeight: 700, color: 'var(--color-ink)', fontSize: '0.9rem'
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
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="card-white" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <Brain size={48} style={{ margin: '0 auto 1.5rem', opacity: 0.3 }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.75rem' }}>Concept Inspector</h3>
                        <p style={{ fontSize: '0.95rem', lineHeight: 1.5 }}>Select any concept from the chart to view evidence, possible misconceptions, and prerequisites.</p>
                    </div>
                )}
            </div>
        </div>
    );
}


// =====================================================================
// Main TeacherAnalytics Page
// =====================================================================
export function TeacherAnalytics() {
    const { session, displayName } = useAuth();

    // Explicit demo subjects instead of the raw pipeline names
    const subjects = ['All', 'DSA', 'DBMS', 'Economics', 'IES'];
    const [selectedSubject, setSelectedSubject] = useState('All');

    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const subjectColors = {
        'DSA': 'var(--color-purple)',
        'DBMS': 'var(--color-orange)',
        'Economics': 'var(--color-yellow)',
        'IES': 'var(--color-teal)'
    };

    // Load analytics when subject changes
    useEffect(() => {
        if (!selectedSubject) return;
        async function loadAnalytics() {
            setLoading(true);
            setError(null);
            setAnalytics(null);
            try {
                // Fetch perfectly synced demo mode analytics across the API
                const data = await fetchDemoClassAnalytics(session?.access_token, selectedSubject);
                setAnalytics(data);
            } catch (err) {
                console.error('Error loading analytics:', err);
                setError('Unable to load class analytics. Please try again.');
            } finally {
                setLoading(false);
            }
        }
        loadAnalytics();
    }, [selectedSubject, session?.access_token]);

    const summaryStats = useMemo(() => {
        if (!analytics) return null;
        return {
            students: analytics.total_students_active || analytics.summary?.total_students || 0,
            avgMastery: analytics.average_class_mastery_pct,
            concepts: analytics.concepts_covered,
            needingAttention: analytics.students_needing_attention?.length || 0
        };
    }, [analytics]);

    return (
        <div className="page-container" style={{ paddingBottom: '4rem' }}>
            {/* ── Header ── */}
            <section style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <Pill color="purple" size="sm" icon={BarChart2}>Class Analytics</Pill>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        {displayName}
                    </span>
                    <span style={{
                        fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#e0e7ff', color: '#4338ca',
                        padding: '0.3rem 0.6rem', borderRadius: '100px', textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                        Demo cohort · 50 students
                    </span>
                </div>
                <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>
                    Class <span style={{ color: 'var(--color-orange)' }}>Analytics</span>
                </h1>
                <p className="text-body" style={{ maxWidth: '640px' }}>
                    Understand how your class is learning. View concept mastery across all students and identify who may benefit from additional support.
                </p>
            </section>

            {/* ── Subject Selector ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <label style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                    Select Subject:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                    {subjects.map(subj => (
                        <button
                            key={subj}
                            onClick={() => setSelectedSubject(subj)}
                            style={{
                                padding: '0.5rem 1.25rem', borderRadius: '100px',
                                border: selectedSubject === subj ? `2px solid var(--color-ink)` : '1px solid var(--color-border)',
                                backgroundColor: selectedSubject === subj ? 'var(--color-ink)' : '#fff',
                                color: selectedSubject === subj ? '#fff' : 'var(--color-ink)',
                                cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', outline: 'none',
                                transition: 'all 0.2s', boxShadow: selectedSubject === subj ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'
                            }}
                        >
                            {subj}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Loading State ── */}
            {loading && (
                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    <BarChart2 size={32} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
                    <p style={{ fontWeight: 600 }}>Loading class analytics...</p>
                </div>
            )}

            {/* ── Error State ── */}
            {error && !loading && (
                <div className="card-white" style={{ padding: '2rem', textAlign: 'center', borderLeft: '4px solid #dc2626' }}>
                    <AlertTriangle size={28} style={{ color: '#dc2626', margin: '0 auto 0.75rem' }} />
                    <p style={{ color: '#991b1b', fontWeight: 600 }}>{error}</p>
                </div>
            )}

            {/* ── Analytics Content ── */}
            {analytics && !loading && (
                <>
                    {/* ── Summary Stats ── */}
                    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
                        <StatCard
                            tag="Students" tagColor="purple"
                            number={summaryStats.students}
                            label="Active Students"
                            style={{ borderTop: '4px solid var(--color-purple)' }}
                        />
                        <StatCard
                            tag="Mastery" tagColor="orange"
                            number={summaryStats.avgMastery !== null ? `${summaryStats.avgMastery}%` : '—'}
                            label="Avg Class Mastery"
                            style={{ borderTop: '4px solid var(--color-orange)' }}
                        />
                        <StatCard
                            tag="Concepts" tagColor="yellow"
                            number={summaryStats.concepts}
                            label="Concepts with Activity"
                            style={{ borderTop: '4px solid var(--color-yellow)' }}
                        />
                        <StatCard
                            tag="Attention" tagColor="teal"
                            number={summaryStats.needingAttention}
                            label="Students Need Support"
                            style={{ borderTop: '4px solid var(--color-teal)' }}
                        />
                    </section>

                    {/* ── Teacher Co-pilot / Class Insights ── */}
                    {analytics.class_attention_concepts.length > 0 && (
                        <section style={{ marginBottom: '2.5rem' }}>
                            <h2 className="text-h2" style={{ fontSize: '1.35rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingDown size={20} style={{ color: '#dc2626' }} />
                                Teacher Co-pilot Insights
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                                {analytics.class_attention_concepts.map((c, idx) => (
                                    <div key={idx} className="card-white" style={{ padding: '1.25rem', borderLeft: '4px solid #dc2626' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                                                🔴 {c.concept}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.9rem', color: 'var(--color-ink)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                                            Evidence suggests <b>{c.students_struggling} students</b> show repeated incorrect-attempt signals for this concept.
                                        </p>
                                        {c.common_prereq_weakness && (
                                            <div style={{ fontSize: '0.85rem', padding: '0.6rem 0.75rem', backgroundColor: '#fef3c7', borderRadius: '6px', color: '#92400e', marginBottom: '0.5rem' }}>
                                                Possible prerequisite to review: <br /><b>{c.common_prereq_weakness.concept}</b>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '1rem' }}>
                                            <button style={{
                                                fontSize: '0.8rem', fontWeight: 700, backgroundColor: 'transparent',
                                                border: '1px solid var(--color-border)', borderRadius: '100px', cursor: 'pointer',
                                                padding: '0.35rem 0.75rem', color: 'var(--color-ink)'
                                            }} onClick={() => {
                                                document.getElementById('misconception-inspector').scrollIntoView({ behavior: 'smooth' });
                                            }}>
                                                Review Evidence
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Class Learning Heatmap (Matrix Layout) ── */}
                    <section style={{ marginBottom: '2.5rem' }}>
                        <h2 className="text-h2" style={{ fontSize: '1.35rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Brain size={20} style={{ color: 'var(--color-orange)' }} />
                            Class Learning Heatmap
                        </h2>
                        <div className="card-white" style={{ padding: 0, overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto', maxHeight: '500px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.85rem' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                                        <tr style={{ backgroundColor: 'var(--color-offwhite)', borderBottom: '1px solid var(--color-border)' }}>
                                            <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: 'var(--color-ink)', position: 'sticky', left: 0, backgroundColor: 'var(--color-offwhite)', zIndex: 11, borderRight: '1px solid var(--color-border)' }}>
                                                Students
                                            </th>
                                            {analytics.concepts.map(c => (
                                                <th key={c.concept_id} style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--color-ink)', minWidth: '100px', borderRight: '1px dotted var(--color-border)' }}>
                                                    {c.concept}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.students && analytics.students.map((st, s_idx) => {
                                            // Only show students who had ANY activity in the requested subjects
                                            const hasActivity = analytics.concepts.some(c => st.heatmap[c.concept_id] && st.heatmap[c.concept_id].status !== 'no_data');
                                            if (!hasActivity) return null;

                                            return (
                                                <tr key={s_idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '0.5rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-ink)', position: 'sticky', left: 0, backgroundColor: '#fff', borderRight: '1px solid var(--color-border)', zIndex: 5 }}>
                                                        {st.name}
                                                    </td>
                                                    {analytics.concepts.map(c => {
                                                        const cell = st.heatmap[c.concept_id];
                                                        let Content = <span style={{ color: 'var(--color-border)' }}>-</span>;
                                                        let title = "No activity";

                                                        if (cell && cell.status !== 'no_data') {
                                                            title = `Attempts: ${cell.attempts} | Correct: ${cell.correct} | Incorrect: ${cell.incorrect}`;
                                                            if (cell.status === 'mastered') {
                                                                Content = <span style={{ color: '#16a34a', fontWeight: 800 }}>●</span>;
                                                            } else if (cell.status === 'needs_attention') {
                                                                Content = <AlertTriangle size={16} strokeWidth={2.5} style={{ color: '#dc2626', margin: '0 auto' }} />;
                                                                title += " (Attention Signal)";
                                                            } else {
                                                                Content = <span style={{ color: '#94a3b8', fontWeight: 800 }}>●</span>;
                                                            }
                                                        }

                                                        return (
                                                            <td key={c.concept_id} title={title} style={{ padding: '0.5rem', borderRight: '1px dotted var(--color-border)', cursor: 'default' }}>
                                                                {Content}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    {/* ── Students Needing Attention ── */}
                    <section style={{ marginBottom: '2.5rem' }}>
                        <h2 className="text-h2" style={{ fontSize: '1.35rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={20} style={{ color: 'var(--color-purple)' }} />
                            Students Who May Need Support
                        </h2>
                        {analytics.students_needing_attention.length === 0 ? (
                            <div className="card-white" style={{ padding: '2rem', textAlign: 'center' }}>
                                <CheckCircle size={32} style={{ color: '#16a34a', margin: '0 auto 0.75rem' }} />
                                <p style={{ fontWeight: 600, color: '#15803d' }}>
                                    {analytics.total_students_active > 0
                                        ? 'No students currently flagged. Class is performing well!'
                                        : 'No student activity recorded yet for this subject.'}
                                </p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                                {analytics.students_needing_attention.map((student, idx) => (
                                    <StudentAttentionCard key={idx} student={student} />
                                ))}
                            </div>
                        )}
                    </section>

                    {/* ── Concept Misconceptions Analyzer ── */}
                    <section id="misconception-inspector">
                        <h2 className="text-h2" style={{ fontSize: '1.35rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <BarChart2 size={20} style={{ color: 'var(--color-teal)' }} />
                            Misconception Analytics
                        </h2>
                        <ConceptInspector concepts={analytics.concepts} subjectColors={subjectColors} />
                    </section>
                </>
            )}
        </div>
    );
}
