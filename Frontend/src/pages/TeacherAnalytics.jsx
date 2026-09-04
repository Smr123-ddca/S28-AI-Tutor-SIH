import React, { useState, useEffect, useMemo } from 'react';
import { BarChart2, Users, Brain, AlertTriangle, CheckCircle, TrendingDown, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { Pill } from '../components/common/Pill';
import { StatCard } from '../components/cards/StatCard';
import { fetchLibraryDocuments } from '../services/api';
import { fetchClassAnalytics } from '../services/api';
import { generateTeacherPracticeQuestions, assignTeacherPracticeQuestions } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TeacherCopilotChat } from '../components/tutor/TeacherCopilotChat';

// =====================================================================
// Mastery Bar Component
// =====================================================================
function MasteryBar({ pct, status }) {
    const color = {
        strong: '#16a34a',
        developing: '#d97706',
        needs_attention: '#dc2626',
        no_data: '#9ca3af'
    }[status] || '#9ca3af';

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
                flex: 1, height: '8px', borderRadius: '4px',
                backgroundColor: 'var(--color-offwhite)',
                overflow: 'hidden', minWidth: '80px'
            }}>
                {pct !== null && (
                    <div style={{
                        width: `${Math.max(pct, 2)}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: '4px',
                        transition: 'width 0.6s ease'
                    }} />
                )}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color, minWidth: '38px', textAlign: 'right' }}>
                {pct !== null ? `${pct}%` : '—'}
            </span>
        </div>
    );
}

// =====================================================================
// Status Badge
// =====================================================================
function StatusBadge({ status }) {
    const map = {
        strong: { emoji: '🟢', label: 'Strong', bg: '#f0fdf4', color: '#15803d' },
        developing: { emoji: '🟡', label: 'Developing', bg: '#fffbeb', color: '#92400e' },
        needs_attention: { emoji: '🔴', label: 'Needs Attention', bg: '#fef2f2', color: '#991b1b' },
        no_data: { emoji: '⬜', label: 'No Activity', bg: '#f9fafb', color: '#6b7280' }
    };
    const cfg = map[status] || map.no_data;
    return (
        <span style={{
            fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem',
            borderRadius: '100px', backgroundColor: cfg.bg, color: cfg.color,
            whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
        }}>
            {cfg.emoji} {cfg.label}
        </span>
    );
}

// =====================================================================
// Attention Level Badge
// =====================================================================
function AttentionBadge({ level }) {
    const map = {
        high: { label: 'High Attention', bg: '#fef2f2', color: '#991b1b', border: '1px solid #fca5a5' },
        medium: { label: 'Medium Attention', bg: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d' }
    };
    const cfg = map[level] || map.medium;
    return (
        <span style={{
            fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem',
            borderRadius: '100px', backgroundColor: cfg.bg,
            color: cfg.color, border: cfg.border
        }}>
            {level === 'high' ? '⚠ ' : '⚡ '}{cfg.label}
        </span>
    );
}

// =====================================================================
// Student Attention Card
// =====================================================================
function StudentAttentionCard({ student, onAssignPractice }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={{
            border: student.attention_level === 'high'
                ? '1.5px solid #fca5a5' : '1.5px solid #fcd34d',
            borderRadius: 'var(--radius-md)',
            backgroundColor: '#fff',
            overflow: 'hidden'
        }}>
            {/* Card Header */}
            <div
                onClick={() => setExpanded(e => !e)}
                style={{
                    padding: '1rem 1.25rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer',
                    backgroundColor: student.attention_level === 'high' ? '#fef2f2' : '#fffbeb'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        backgroundColor: student.attention_level === 'high' ? '#fca5a5' : '#fcd34d',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem', fontWeight: 700, color: '#fff',
                        flexShrink: 0
                    }}>
                        {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                            {student.name}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                            {student.signals.length} concept{student.signals.length !== 1 ? 's' : ''} flagged
                            {student.average_score_pct !== null && student.average_score_pct !== undefined ? ` • Avg Mastery: ${student.average_score_pct}%` : ''}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <AttentionBadge level={student.attention_level} />
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
            </div>

            {/* Expanded Detail */}
            {expanded && (
                <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {student.signals.map((sig, i) => (
                        <div key={i} style={{
                            padding: '0.85rem 1rem',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-offwhite)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)' }}>
                                    {sig.concept}
                                </div>
                                <StatusBadge status={sig.accuracy !== null && sig.accuracy < 60 ? 'needs_attention' : 'developing'} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, auto)', gap: '0.5rem 1.5rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                                <span><b>Mastery / Accuracy:</b> {sig.accuracy !== null ? `${sig.accuracy}%` : 'N/A'}</span>
                                <span><b>Activity Count:</b> {sig.total_attempts}</span>
                                <span><b>Struggling Attempts:</b> {sig.repeated_mistakes}</span>
                            </div>
                            {sig.prereq_weakness.length > 0 && (
                                <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', backgroundColor: '#fef3c7', borderRadius: '6px', fontSize: '0.8rem', color: '#92400e' }}>
                                    <span style={{ fontWeight: 700 }}>⚠ Prerequisite weakness: </span>
                                    {sig.prereq_weakness.map(pw => `${pw.concept} (${pw.mastery_pct}%)`).join(', ')}
                                </div>
                            )}
                            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                Reason: {buildReasonText(sig)}
                            </div>
                        </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={() => onAssignPractice?.(student)}
                            style={{
                                border: 'none',
                                backgroundColor: 'var(--color-purple)',
                                color: '#fff',
                                padding: '0.7rem 1rem',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.82rem'
                            }}
                        >
                            Assign Targeted Practice
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function buildReasonText(sig) {
    const parts = [];
    if (sig.accuracy !== null && sig.accuracy < 60) {
        parts.push(`below mastery threshold (${sig.accuracy}%)`);
    }
    if (sig.repeated_mistakes >= 1) {
        parts.push(`${sig.repeated_mistakes} struggling attempt${sig.repeated_mistakes !== 1 ? 's' : ''}`);
    }
    if (sig.prereq_weakness && sig.prereq_weakness.length > 0) {
        parts.push(`weak on prerequisite${sig.prereq_weakness.length > 1 ? 's' : ''}: ${sig.prereq_weakness.map(p => p.concept).join(', ')}`);
    }
    return parts.length > 0 ? parts.join(' and ') + '.' : 'May benefit from additional instructor support.';
}

function PracticeGeneratorModal({ open, onClose, selectedSubject, student, subjects, token, onAssigned }) {
    const defaultConcept = student?.signals?.[0]?.concept || '';
    const [form, setForm] = useState({
        subject: selectedSubject || '',
        concept: defaultConcept,
        count: 3,
        difficulty: 'medium',
        student_id: student?.student_id || ''
    });
    const [questions, setQuestions] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (open) {
            const nextConcept = student?.signals?.[0]?.concept || '';
            setForm({
                subject: selectedSubject || '',
                concept: nextConcept,
                count: 3,
                difficulty: 'medium',
                student_id: student?.student_id || ''
            });
            setQuestions([]);
            setError('');
            setSuccess('');
        }
    }, [open, selectedSubject, student]);

    if (!open) return null;

    const handleGenerate = async () => {
        if (!form.subject || !form.concept) {
            setError('Please choose a subject and concept before generating practice.');
            return;
        }

        setIsGenerating(true);
        setError('');
        setSuccess('');

        try {
            const res = await generateTeacherPracticeQuestions({
                subject: form.subject,
                concept: form.concept,
                student_id: form.student_id,
                count: Number(form.count) || 3,
                difficulty: form.difficulty
            }, token);
            setQuestions(res.questions || []);
            if (!res.questions?.length) {
                setError('No practice questions were returned for this concept.');
            }
        } catch (err) {
            setError(err.message || 'Failed to generate targeted practice.');
            setQuestions([]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAssign = async () => {
        if (!form.student_id || !questions.length) {
            setError('Generate questions before assigning the practice set.');
            return;
        }

        setIsAssigning(true);
        setError('');
        setSuccess('');

        try {
            const res = await assignTeacherPracticeQuestions({
                student_id: form.student_id,
                subject: form.subject,
                concept: form.concept,
                questions
            }, token);
            setSuccess(`Assigned ${res.assigned || questions.length} targeted questions to ${student?.name || 'the student'}.`);
            if (onAssigned) onAssigned();
        } catch (err) {
            setError(err.message || 'Failed to assign the targeted practice set.');
        } finally {
            setIsAssigning(false);
        }
    };

    const removeQuestion = (index) => {
        setQuestions(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.58)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ width: 'min(920px, 100%)', maxHeight: '90vh', overflowY: 'auto', backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', fontWeight: 700 }}>
                            Targeted Support
                        </div>
                        <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.6rem', color: 'var(--color-ink)' }}>
                            Assign targeted practice
                        </h3>
                    </div>
                    <button type="button" onClick={onClose} style={{ border: 'none', background: 'var(--color-offwhite)', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontWeight: 700, color: 'var(--color-ink)', fontSize: '0.82rem' }}>
                        Student
                        <input
                            type="text"
                            value={student?.name || 'Selected student'}
                            readOnly
                            style={{ padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid var(--color-border)', backgroundColor: '#f8fafc' }}
                        />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontWeight: 700, color: 'var(--color-ink)', fontSize: '0.82rem' }}>
                        Subject
                        <select value={form.subject} onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))} style={{ padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid var(--color-border)', backgroundColor: '#fff' }}>
                            {subjects.map(subject => (
                                <option key={subject} value={subject}>{subject.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontWeight: 700, color: 'var(--color-ink)', fontSize: '0.82rem' }}>
                        Number of questions
                        <select value={form.count} onChange={e => setForm(prev => ({ ...prev, count: e.target.value }))} style={{ padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid var(--color-border)', backgroundColor: '#fff' }}>
                            {[1, 2, 3, 4, 5].map(count => <option key={count} value={count}>{count}</option>)}
                        </select>
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontWeight: 700, color: 'var(--color-ink)', fontSize: '0.82rem' }}>
                        Difficulty
                        <select value={form.difficulty} onChange={e => setForm(prev => ({ ...prev, difficulty: e.target.value }))} style={{ padding: '0.75rem 0.9rem', borderRadius: '10px', border: '1px solid var(--color-border)', backgroundColor: '#fff' }}>
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </label>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontWeight: 700, color: 'var(--color-ink)', fontSize: '0.82rem', marginBottom: '1rem' }}>
                    Weak concept to target
                    <input
                        type="text"
                        value={form.concept}
                        onChange={e => setForm(prev => ({ ...prev, concept: e.target.value }))}
                        style={{ padding: '0.8rem 0.9rem', borderRadius: '10px', border: '1px solid var(--color-border)', backgroundColor: '#fff' }}
                    />
                </label>

                {error && (
                    <div style={{ padding: '0.8rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.82rem' }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{ padding: '0.8rem 1rem', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.82rem' }}>
                        {success}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <button type="button" onClick={handleGenerate} disabled={isGenerating || isAssigning} style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: 'none', backgroundColor: 'var(--color-orange)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                        {isGenerating ? 'Generating…' : 'Generate'}
                    </button>
                    <button type="button" onClick={onClose} style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--color-border)', backgroundColor: '#fff', color: 'var(--color-ink)', cursor: 'pointer', fontWeight: 700 }}>
                        Cancel
                    </button>
                </div>

                {questions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-ink)' }}>Review generated questions</h4>
                            <button type="button" onClick={handleAssign} disabled={isAssigning} style={{ padding: '0.7rem 1rem', borderRadius: '10px', border: 'none', backgroundColor: '#16a34a', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
                                {isAssigning ? 'Assigning…' : 'Assign practice'}
                            </button>
                        </div>

                        {questions.map((question, index) => (
                            <div key={`${question.question}-${index}`} style={{ border: '1px solid var(--color-border)', borderRadius: '12px', padding: '1rem', backgroundColor: 'var(--color-offwhite)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.5rem' }}>
                                        Q{index + 1}. {question.question}
                                    </div>
                                    <button type="button" onClick={() => removeQuestion(index)} style={{ border: 'none', background: 'transparent', color: '#991b1b', cursor: 'pointer', fontWeight: 700 }}>Remove</button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                    <div><b>Concept:</b> {question.concept}</div>
                                    <div><b>Difficulty:</b> {question.difficulty}</div>
                                </div>
                                <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                                    <div><b>Hint 1:</b> {question.hint_1}</div>
                                    <div><b>Hint 2:</b> {question.hint_2}</div>
                                    <div><b>Expected answer:</b> {question.expected_answer}</div>
                                </div>
                            </div>
                        ))}
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
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState('');
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingSubjects, setLoadingSubjects] = useState(true);
    const [error, setError] = useState(null);
    const [practiceModalOpen, setPracticeModalOpen] = useState(false);
    const [practiceTargetStudent, setPracticeTargetStudent] = useState(null);

    // Load available subjects
    useEffect(() => {
        async function loadSubjects() {
            setLoadingSubjects(true);
            try {
                const docsData = await fetchLibraryDocuments(session?.access_token);
                const published = (docsData.documents || []).filter(d => d.status === 'published');
                const uniqueSubjects = [...new Set(published.map(d => d.id))].filter(Boolean);
                setSubjects(uniqueSubjects);
                if (uniqueSubjects.length > 0) setSelectedSubject(uniqueSubjects[0]);
            } catch (err) {
                console.error('Error loading subjects:', err);
            } finally {
                setLoadingSubjects(false);
            }
        }
        loadSubjects();
    }, [session?.access_token]);

    // Load analytics when subject changes
    useEffect(() => {
        if (!selectedSubject) return;

        async function loadAnalytics() {
            setLoading(true);
            setError(null);
            setAnalytics(null);
            try {
                const data = await fetchClassAnalytics(selectedSubject, session?.access_token);
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

    const openPracticeGenerator = (student) => {
        const weakestSignal = (student?.signals || []).reduce((best, current) => {
            if (!best) return current;
            if ((current.accuracy ?? 100) < (best.accuracy ?? 100)) return current;
            if ((current.repeated_mistakes ?? 0) > (best.repeated_mistakes ?? 0)) return current;
            return best;
        }, null);

        setPracticeTargetStudent({
            ...student,
            signals: student?.signals || [],
            weakest_signal: weakestSignal || student?.signals?.[0] || null
        });
        setPracticeModalOpen(true);
    };

    // Compute summary strip
    const summaryStats = useMemo(() => {
        if (!analytics) return null;
        return {
            students: analytics.total_students_active,
            avgMastery: analytics.average_class_mastery_pct,
            concepts: analytics.concepts_covered,
            needingAttention: analytics.students_needing_attention?.length || 0
        };
    }, [analytics]);

    return (
        <div className="page-container" style={{ paddingBottom: '4rem' }}>
            {/* ── Header ── */}
            <section style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                    <Pill color="purple" size="sm" icon={BarChart2}>Class Analytics</Pill>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                        {displayName}
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
                {loadingSubjects ? (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading subjects...</span>
                ) : subjects.length === 0 ? (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                        No published subjects found. Publish a course first.
                    </span>
                ) : (
                    <select
                        value={selectedSubject}
                        onChange={e => setSelectedSubject(e.target.value)}
                        style={{
                            padding: '0.6rem 1rem', borderRadius: 'var(--radius-sm)',
                            border: '1.5px solid var(--color-border)', outline: 'none',
                            backgroundColor: '#fff', minWidth: '320px', fontSize: '0.9rem'
                        }}
                    >
                        {subjects.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                )}
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
                    <PracticeGeneratorModal
                        open={practiceModalOpen}
                        onClose={() => setPracticeModalOpen(false)}
                        selectedSubject={selectedSubject}
                        student={practiceTargetStudent}
                        subjects={subjects}
                        token={session?.access_token}
                        onAssigned={() => {
                            setPracticeModalOpen(false);
                            setPracticeTargetStudent(null);
                        }}
                    />
                    {/* ── Summary Stats ── */}
                    <section style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        marginBottom: '2.5rem'
                    }}>
                        <StatCard
                            tag="Students" tagColor="orange"
                            number={summaryStats.students}
                            label="Active Students"
                        />
                        <StatCard
                            tag="Mastery" tagColor="purple"
                            number={summaryStats.avgMastery !== null ? `${summaryStats.avgMastery}%` : '—'}
                            label="Avg Class Mastery"
                        />
                        <StatCard
                            tag="Concepts" tagColor="sky"
                            number={summaryStats.concepts}
                            label="Concepts with Activity"
                        />
                        <StatCard
                            tag="Attention" tagColor="red"
                            number={summaryStats.needingAttention}
                            label="Students Need Support"
                        />
                    </section>

                    {/* ── Teacher Co-pilot Interactive Assistant ── */}
                    <section style={{ marginBottom: '2.5rem' }}>
                        <TeacherCopilotChat />
                    </section>

                    {/* ── Class Learning Heatmap ── */}
                    <section style={{ marginBottom: '2.5rem' }}>
                        <h2 className="text-h2" style={{ fontSize: '1.35rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Brain size={20} style={{ color: 'var(--color-orange)' }} />
                            Class Learning Heatmap
                        </h2>

                        {analytics.concepts.length === 0 ? (
                            <div className="card-white" style={{ padding: '2rem', textAlign: 'center' }}>
                                <p style={{ color: 'var(--color-text-secondary)' }}>
                                    No learning activity available yet for this subject.
                                </p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                                    Students need to attempt practice questions for analytics to appear.
                                </p>
                            </div>
                        ) : (
                            <div className="card-white" style={{ padding: 0, overflow: 'hidden' }}>
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--color-offwhite)', borderBottom: '1px solid var(--color-border)' }}>
                                                <th style={{ padding: '0.9rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Concept</th>
                                                <th style={{ padding: '0.9rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)', minWidth: '180px' }}>Mastery</th>
                                                <th style={{ padding: '0.9rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Status</th>
                                                <th style={{ padding: '0.9rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Attempts</th>
                                                <th style={{ padding: '0.9rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Students</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.concepts.map((c, idx) => (
                                                <tr
                                                    key={idx}
                                                    style={{
                                                        borderBottom: '1px solid var(--color-border)',
                                                        backgroundColor: c.status === 'needs_attention'
                                                            ? 'rgba(239,68,68,0.04)' : 'transparent',
                                                        transition: 'background 0.15s'
                                                    }}
                                                >
                                                    <td style={{ padding: '0.9rem 1.5rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            {c.status === 'needs_attention' && (
                                                                <AlertTriangle size={14} style={{ color: '#dc2626', flexShrink: 0 }} />
                                                            )}
                                                            {c.concept}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.9rem 1.5rem' }}>
                                                        {c.status === 'no_data' ? (
                                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                                                                No attempts yet
                                                            </span>
                                                        ) : (
                                                            <MasteryBar pct={c.mastery_pct} status={c.status} />
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '0.9rem 1.5rem' }}>
                                                        <StatusBadge status={c.status} />
                                                    </td>
                                                    <td style={{ padding: '0.9rem 1.5rem', color: 'var(--color-text-secondary)' }}>
                                                        {c.status === 'no_data' ? '—' : `${c.correct}/${c.total_attempts}`}
                                                    </td>
                                                    <td style={{ padding: '0.9rem 1.5rem', color: 'var(--color-text-secondary)' }}>
                                                        {c.status === 'no_data' ? '—' : c.students_active}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* ── Class Attention Concepts ── */}
                    {analytics.class_attention_concepts.length > 0 && (
                        <section style={{ marginBottom: '2.5rem' }}>
                            <h2 className="text-h2" style={{ fontSize: '1.35rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingDown size={20} style={{ color: '#dc2626' }} />
                                Class-Level Concerns
                            </h2>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                                {analytics.class_attention_concepts.map((c, idx) => (
                                    <div key={idx} className="card-white" style={{
                                        padding: '1.25rem',
                                        borderLeft: '4px solid #dc2626'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-ink)' }}>
                                                🔴 {c.concept}
                                            </span>
                                            <span style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>
                                                {c.class_mastery_pct}% mastery
                                            </span>
                                        </div>
                                        <p style={{ fontSize: '0.83rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                                            <b>{c.students_struggling}</b> of {c.total_students_active} students need support.
                                        </p>
                                        {c.common_prereq_weakness && (
                                            <div style={{ fontSize: '0.8rem', padding: '0.4rem 0.65rem', backgroundColor: '#fef3c7', borderRadius: '6px', color: '#92400e' }}>
                                                Common prerequisite gap: <b>{c.common_prereq_weakness.concept}</b>
                                                {' '}({c.common_prereq_weakness.students_weak} student{c.common_prereq_weakness.students_weak !== 1 ? 's' : ''})
                                            </div>
                                        )}
                                        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.6rem', fontStyle: 'italic' }}>
                                            {c.common_prereq_weakness
                                                ? `Consider revisiting "${c.common_prereq_weakness.concept}" before progressing on "${c.concept}".`
                                                : `Consider providing additional practice material for "${c.concept}".`
                                            }
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* ── Students Needing Attention ── */}
                    <section style={{ marginBottom: '2rem' }}>
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
                            <>
                                <div style={{
                                    padding: '0.75rem 1rem', marginBottom: '1rem',
                                    backgroundColor: '#fffbeb', borderRadius: 'var(--radius-sm)',
                                    border: '1px solid #fcd34d', fontSize: '0.82rem',
                                    color: '#92400e', display: 'flex', alignItems: 'flex-start', gap: '0.5rem'
                                }}>
                                    <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
                                    <span>
                                        These students may benefit from additional attention based on repeated mistakes or low mastery.
                                        This is not a judgment — it is a prompt for compassionate support.
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {analytics.students_needing_attention.map((student, idx) => (
                                        <StudentAttentionCard key={idx} student={student} onAssignPractice={openPracticeGenerator} />
                                    ))}
                                </div>
                            </>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
