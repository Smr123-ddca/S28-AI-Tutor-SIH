import React, { useState, useEffect, useMemo } from 'react';
import {
    Award,
    CheckCircle2,
    Clock,
    Sparkles,
    Filter,
    Search,
    Edit3,
    BookOpen,
    Plus,
    X,
    ChevronRight,
    HelpCircle,
    Check,
    AlertCircle,
    User,
    TrendingUp,
    FileText
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import { StatCard } from '../components/cards/StatCard';
import { useAuth } from '../context/AuthContext';
import {
    fetchAssignments,
    createAssignment,
    fetchSubmissions,
    fetchSubmissionDetails,
    submitGrade,
    requestAiGradingSuggestion,
    fetchGradingStats,
    fetchLibraryDocuments
} from '../services/api';

export function TeacherGrading() {
    const { session, displayName } = useAuth();
    const token = session?.access_token;

    // Data states
    const [courses, setCourses] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [selectedCourse, setSelectedCourse] = useState('ALL');
    const [selectedAssignment, setSelectedAssignment] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'ungraded' | 'graded'
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [gradingModalOpen, setGradingModalOpen] = useState(false);
    const [activeSubmission, setActiveSubmission] = useState(null);
    const [gradeInput, setGradeInput] = useState('');
    const [feedbackInput, setFeedbackInput] = useState('');
    const [isSavingGrade, setIsSavingGrade] = useState(false);
    const [gradeSaveSuccess, setGradeSaveSuccess] = useState(false);
    const [gradeError, setGradeError] = useState('');

    // AI suggestion states
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState(null);
    const [aiError, setAiError] = useState('');

    // New Assignment Modal
    const [newAssignmentModalOpen, setNewAssignmentModalOpen] = useState(false);
    const [newAsgCourse, setNewAsgCourse] = useState('');
    const [newAsgTitle, setNewAsgTitle] = useState('');
    const [newAsgDesc, setNewAsgDesc] = useState('');
    const [newAsgRubric, setNewAsgRubric] = useState('');
    const [newAsgMaxScore, setNewAsgMaxScore] = useState(100);
    const [isCreatingAsg, setIsCreatingAsg] = useState(false);

    // Initial Load
    const loadAllData = async () => {
        setLoading(true);
        try {
            const [docsData, asgData, subData, statsData] = await Promise.all([
                fetchLibraryDocuments(token).catch(() => ({ documents: [] })),
                fetchAssignments({ token }).catch(() => ({ assignments: [] })),
                fetchSubmissions({ token }).catch(() => ({ submissions: [] })),
                fetchGradingStats({ token }).catch(() => ({ stats: null }))
            ]);

            const loadedDocs = docsData.documents || [];
            setCourses(loadedDocs);
            if (loadedDocs.length > 0 && !newAsgCourse) {
                setNewAsgCourse(loadedDocs[0].id || loadedDocs[0].subject || '');
            }

            setAssignments(asgData.assignments || []);
            setSubmissions(subData.submissions || []);
            setStats(statsData.stats || null);
        } catch (err) {
            console.error('Error loading grading data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, [token]);

    // Filter Submissions
    const filteredSubmissions = useMemo(() => {
        return submissions.filter((sub) => {
            // Course match
            if (selectedCourse !== 'ALL' && sub.course_name?.toLowerCase() !== selectedCourse.toLowerCase()) {
                return false;
            }
            // Assignment match
            if (selectedAssignment !== 'ALL' && sub.assignment_id !== selectedAssignment) {
                return false;
            }
            // Status match
            if (statusFilter === 'ungraded' && sub.status === 'graded') {
                return false;
            }
            if (statusFilter === 'graded' && sub.status !== 'graded') {
                return false;
            }
            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchName = sub.student_name?.toLowerCase().includes(q);
                const matchTitle = sub.assignment_title?.toLowerCase().includes(q);
                const matchText = sub.submission_text?.toLowerCase().includes(q);
                if (!matchName && !matchTitle && !matchText) return false;
            }
            return true;
        });
    }, [submissions, selectedCourse, selectedAssignment, statusFilter, searchQuery]);

    // Open Grading Modal
    const handleOpenGrading = (sub) => {
        setActiveSubmission(sub);
        setGradeInput(sub.grade !== null && sub.grade !== undefined ? String(sub.grade) : '');
        setFeedbackInput(sub.feedback || '');
        setAiSuggestion(
            sub.ai_suggested_grade !== null && sub.ai_suggested_grade !== undefined
                ? {
                    suggested_grade: sub.ai_suggested_grade,
                    feedback: sub.ai_suggested_feedback
                }
                : null
        );
        setGradeError('');
        setAiError('');
        setGradeSaveSuccess(false);
        setGradingModalOpen(true);
    };

    // Trigger AI Suggestion
    const handleRequestAi = async () => {
        if (!activeSubmission) return;
        setIsGeneratingAi(true);
        setAiError('');
        try {
            const res = await requestAiGradingSuggestion(activeSubmission.id, token);
            if (res.ai_suggestion) {
                setAiSuggestion(res.ai_suggestion);
            }
        } catch (err) {
            setAiError(err.message || 'Failed to generate AI grade suggestion');
        } finally {
            setIsGeneratingAi(false);
        }
    };

    // Apply AI Suggestion to Form
    const handleApplyAiSuggestion = () => {
        if (!aiSuggestion) return;
        if (aiSuggestion.suggested_grade !== undefined) {
            setGradeInput(String(aiSuggestion.suggested_grade));
        }
        if (aiSuggestion.feedback) {
            setFeedbackInput(aiSuggestion.feedback);
        }
    };

    // Save Grade
    const handleSaveGrade = async (e) => {
        e.preventDefault();
        if (!activeSubmission) return;

        const numGrade = Number(gradeInput);
        const maxScore = activeSubmission.max_score || 100;

        if (isNaN(numGrade) || numGrade < 0 || numGrade > maxScore) {
            setGradeError(`Please enter a valid numeric grade between 0 and ${maxScore}.`);
            return;
        }

        setIsSavingGrade(true);
        setGradeError('');

        try {
            const res = await submitGrade({
                submissionId: activeSubmission.id,
                grade: numGrade,
                feedback: feedbackInput,
                token
            });

            // Update in local state
            setSubmissions((prev) =>
                prev.map((s) =>
                    s.id === activeSubmission.id
                        ? {
                            ...s,
                            grade: numGrade,
                            feedback: feedbackInput,
                            status: 'graded',
                            graded_at: new Date().toISOString()
                        }
                        : s
                )
            );

            // Re-fetch stats
            fetchGradingStats({ token })
                .then((s) => setStats(s.stats))
                .catch(() => { });

            setGradeSaveSuccess(true);
            setTimeout(() => {
                setGradingModalOpen(false);
                setGradeSaveSuccess(false);
            }, 1200);
        } catch (err) {
            setGradeError(err.message || 'Failed to save grade');
        } finally {
            setIsSavingGrade(false);
        }
    };

    // Create New Assignment Submit
    const handleCreateAssignmentSubmit = async (e) => {
        e.preventDefault();
        if (!newAsgTitle.trim() || !newAsgCourse) {
            alert('Please provide an assignment title and select a course.');
            return;
        }

        setIsCreatingAsg(true);
        try {
            const res = await createAssignment(
                {
                    course_name: newAsgCourse,
                    title: newAsgTitle.trim(),
                    description: newAsgDesc.trim(),
                    rubric: newAsgRubric.trim(),
                    max_score: Number(newAsgMaxScore) || 100
                },
                token
            );

            if (res.assignment) {
                setAssignments((prev) => [res.assignment, ...prev]);
                setNewAssignmentModalOpen(false);
                setNewAsgTitle('');
                setNewAsgDesc('');
                setNewAsgRubric('');
            }
        } catch (err) {
            alert(err.message || 'Failed to create assignment');
        } finally {
            setIsCreatingAsg(false);
        }
    };

    const gradedCount = submissions.filter((s) => s.status === 'graded').length;
    const ungradedCount = submissions.filter((s) => s.status !== 'graded').length;

    return (
        <div className="page-container" style={{ paddingBottom: '4rem' }}>
            {/* Header Section */}
            <div
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.5rem',
                    marginBottom: '2rem'
                }}
            >
                <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
                        <Pill color="orange" size="sm" icon={Award}>
                            Teacher Grading Suite
                        </Pill>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                            Review • Evaluate • AI-Assisted Feedback
                        </span>
                    </div>
                    <h1 className="text-h1">
                        Student <span style={{ color: 'var(--color-orange)' }}>Submissions & Grading</span>
                    </h1>
                    <p className="text-body" style={{ maxWidth: '650px', marginTop: '0.25rem' }}>
                        Evaluate coursework submissions, assign scores with rubrics, or generate AI-assisted feedback drafts with Gemini for swift and personalized mentorship.
                    </p>
                </div>

                {/* Top Action Button */}
                <div>
                    <Button
                        variant="orange"
                        size="md"
                        icon={Plus}
                        onClick={() => setNewAssignmentModalOpen(true)}
                    >
                        Create Assignment
                    </Button>
                </div>
            </div>

            {/* Metric KPI Cards */}
            <section
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.25rem',
                    marginBottom: '2.5rem'
                }}
            >
                <StatCard
                    tag="Cohort Submissions"
                    tagColor="orange"
                    number={loading ? '--' : `${submissions.length}`}
                    label="Total Submissions Received"
                />
                <StatCard
                    tag="Grading Progress"
                    tagColor="purple"
                    number={loading ? '--' : `${gradedCount} / ${submissions.length}`}
                    label="Graded Submissions"
                />
                <StatCard
                    tag="Needs Attention"
                    tagColor="yellow"
                    number={loading ? '--' : `${ungradedCount}`}
                    label="Pending Teacher Review"
                />
                <StatCard
                    tag="Class Performance"
                    tagColor="sky"
                    number={
                        loading
                            ? '--'
                            : stats?.averageGrade !== null && stats?.averageGrade !== undefined
                                ? `${stats.averageGrade}%`
                                : '88%'
                    }
                    label="Average Assigned Grade"
                />
            </section>

            {/* Filter and Control Bar */}
            <div
                className="card-white"
                style={{
                    padding: '1.25rem 1.5rem',
                    marginBottom: '1.75rem',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.25rem'
                }}
            >
                {/* Left: Filters */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem', flex: 1 }}>
                    {/* Course Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            Course:
                        </span>
                        <select
                            value={selectedCourse}
                            onChange={(e) => {
                                setSelectedCourse(e.target.value);
                                setSelectedAssignment('ALL');
                            }}
                            style={{
                                padding: '0.45rem 0.85rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-offwhite)',
                                fontWeight: 600,
                                fontSize: '0.88rem',
                                color: 'var(--color-ink)',
                                outline: 'none'
                            }}
                        >
                            <option value="ALL">All Courses</option>
                            {courses.map((c) => (
                                <option key={c.id || c.subject} value={c.id || c.subject}>
                                    {c.subject || c.id}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Assignment Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            Assignment:
                        </span>
                        <select
                            value={selectedAssignment}
                            onChange={(e) => setSelectedAssignment(e.target.value)}
                            style={{
                                padding: '0.45rem 0.85rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-border)',
                                backgroundColor: 'var(--color-offwhite)',
                                fontWeight: 600,
                                fontSize: '0.88rem',
                                color: 'var(--color-ink)',
                                outline: 'none',
                                maxWidth: '240px'
                            }}
                        >
                            <option value="ALL">All Assignments</option>
                            {assignments
                                .filter((a) => selectedCourse === 'ALL' || a.course_name === selectedCourse)
                                .map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.title}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {/* Status Pill Filter */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('ALL')}
                            style={{
                                padding: '0.35rem 0.85rem',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                backgroundColor: statusFilter === 'ALL' ? 'var(--color-ink)' : 'var(--color-offwhite)',
                                color: statusFilter === 'ALL' ? '#fff' : 'var(--color-text-secondary)',
                                transition: 'all var(--transition-fast)'
                            }}
                        >
                            All ({submissions.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('ungraded')}
                            style={{
                                padding: '0.35rem 0.85rem',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                backgroundColor: statusFilter === 'ungraded' ? 'var(--color-yellow)' : 'var(--color-offwhite)',
                                color: statusFilter === 'ungraded' ? 'var(--color-ink)' : 'var(--color-text-secondary)',
                                transition: 'all var(--transition-fast)'
                            }}
                        >
                            Pending Review ({ungradedCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('graded')}
                            style={{
                                padding: '0.35rem 0.85rem',
                                borderRadius: 'var(--radius-full)',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                backgroundColor: statusFilter === 'graded' ? '#16a34a' : 'var(--color-offwhite)',
                                color: statusFilter === 'graded' ? '#fff' : 'var(--color-text-secondary)',
                                transition: 'all var(--transition-fast)'
                            }}
                        >
                            Graded ({gradedCount})
                        </button>
                    </div>
                </div>

                {/* Right: Search Box */}
                <div style={{ position: 'relative', minWidth: '220px' }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: '0.75rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--color-text-muted)'
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search student or task..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '0.45rem 0.85rem 0.45rem 2.25rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-offwhite)',
                            fontSize: '0.88rem',
                            outline: 'none'
                        }}
                    />
                </div>
            </div>

            {/* Submissions Table / List */}
            <div className="card-white" style={{ padding: '0', overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>✨</div>
                        <div>Loading Course Submissions & Grading Queue...</div>
                    </div>
                ) : filteredSubmissions.length === 0 ? (
                    <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        <BookOpen size={36} style={{ color: 'var(--color-orange)', margin: '0 auto 1rem', opacity: 0.6 }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.35rem' }}>
                            No submissions found
                        </h3>
                        <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                            There are currently no student submissions matching your selected filter criteria.
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--color-offwhite)', borderBottom: '1px solid var(--color-border)' }}>
                                    <th style={{ padding: '1.1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Student</th>
                                    <th style={{ padding: '1.1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Assignment & Course</th>
                                    <th style={{ padding: '1.1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Submitted On</th>
                                    <th style={{ padding: '1.1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Status / Grade</th>
                                    <th style={{ padding: '1.1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubmissions.map((sub) => {
                                    const isGraded = sub.status === 'graded' || (sub.grade !== null && sub.grade !== undefined);
                                    const formattedDate = sub.submitted_at
                                        ? new Date(sub.submitted_at).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })
                                        : 'Recent';

                                    return (
                                        <tr
                                            key={sub.id}
                                            style={{
                                                borderBottom: '1px solid var(--color-border)',
                                                transition: 'background var(--transition-fast)'
                                            }}
                                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                        >
                                            {/* Student column */}
                                            <td style={{ padding: '1.1rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div
                                                        style={{
                                                            width: '36px',
                                                            height: '36px',
                                                            borderRadius: '50%',
                                                            backgroundColor: isGraded ? 'var(--color-purple-light)' : 'var(--color-yellow-light)',
                                                            color: isGraded ? 'var(--color-purple)' : 'var(--color-ink)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 700,
                                                            fontSize: '0.85rem'
                                                        }}
                                                    >
                                                        {sub.student_name ? sub.student_name[0].toUpperCase() : 'S'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>
                                                            {sub.student_name || 'Student'}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                            ID: {sub.student_id ? sub.student_id.substring(0, 8) : 'Unknown'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Assignment column */}
                                            <td style={{ padding: '1.1rem 1.5rem' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--color-ink)' }}>
                                                    {sub.assignment_title || 'Course Assignment'}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                                                    <span
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            fontWeight: 700,
                                                            padding: '0.15rem 0.5rem',
                                                            borderRadius: 'var(--radius-sm)',
                                                            backgroundColor: 'var(--color-offwhite)',
                                                            color: 'var(--color-text-secondary)',
                                                            border: '1px solid var(--color-border)'
                                                        }}
                                                    >
                                                        {sub.course_name || 'Curriculum'}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                                        Max: {sub.max_score || 100} pts
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Date column */}
                                            <td style={{ padding: '1.1rem 1.5rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                    <Clock size={14} style={{ color: 'var(--color-text-muted)' }} />
                                                    <span>{formattedDate}</span>
                                                </div>
                                            </td>

                                            {/* Status / Grade column */}
                                            <td style={{ padding: '1.1rem 1.5rem' }}>
                                                {isGraded ? (
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span
                                                            style={{
                                                                fontSize: '0.82rem',
                                                                fontWeight: 700,
                                                                padding: '0.25rem 0.75rem',
                                                                borderRadius: '100px',
                                                                backgroundColor: 'var(--color-green-light)',
                                                                color: '#15803d',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.35rem'
                                                            }}
                                                        >
                                                            <CheckCircle2 size={14} />
                                                            {sub.grade} / {sub.max_score || 100} pts
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span
                                                        style={{
                                                            fontSize: '0.78rem',
                                                            fontWeight: 700,
                                                            padding: '0.25rem 0.65rem',
                                                            borderRadius: '100px',
                                                            backgroundColor: 'var(--color-yellow-light)',
                                                            color: '#92400e',
                                                            border: '1px solid #fcd34d',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.35rem'
                                                        }}
                                                    >
                                                        <Clock size={13} />
                                                        Pending Review
                                                    </span>
                                                )}
                                            </td>

                                            {/* Actions column */}
                                            <td style={{ padding: '1.1rem 1.5rem', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <Button
                                                        variant={isGraded ? 'ink' : 'orange'}
                                                        size="sm"
                                                        icon={isGraded ? Edit3 : Award}
                                                        onClick={() => handleOpenGrading(sub)}
                                                    >
                                                        {isGraded ? 'Edit Grade' : 'Grade Submission'}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* =====================================================================
          1. GRADING MODAL / DRAWER
          ===================================================================== */}
            {gradingModalOpen && activeSubmission && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(21, 19, 19, 0.6)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem'
                    }}
                >
                    <div
                        className="card-white"
                        style={{
                            width: '100%',
                            maxWidth: '900px',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '0',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-lg)'
                        }}
                    >
                        {/* Modal Header */}
                        <div
                            style={{
                                padding: '1.25rem 1.75rem',
                                borderBottom: '1px solid var(--color-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'var(--color-offwhite)'
                            }}
                        >
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                    <Pill color="purple" size="sm">
                                        {activeSubmission.course_name || 'Course Module'}
                                    </Pill>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                                        Student: <strong style={{ color: 'var(--color-ink)' }}>{activeSubmission.student_name}</strong>
                                    </span>
                                </div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--color-ink)' }}>
                                    {activeSubmission.assignment_title || 'Assignment Evaluation'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setGradingModalOpen(false)}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'var(--color-white)',
                                    border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-secondary)'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Body: Split Layout */}
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                                gap: '1.5rem',
                                padding: '1.75rem',
                                overflowY: 'auto',
                                flex: 1
                            }}
                        >
                            {/* Left Pane: Student Submission & Rubric */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* Rubric Box */}
                                {activeSubmission.rubric && (
                                    <div
                                        style={{
                                            padding: '1rem',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: 'var(--color-sky-light)',
                                            border: '1px solid var(--color-sky)'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.35rem' }}>
                                            📋 Evaluation Rubric
                                        </div>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', whiteSpace: 'pre-line' }}>
                                            {activeSubmission.rubric}
                                        </div>
                                    </div>
                                )}

                                {/* Student Submission Text */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                                            Student Submission Content:
                                        </label>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            Submitted on {new Date(activeSubmission.submitted_at || Date.now()).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            padding: '1.25rem',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: 'var(--color-offwhite)',
                                            border: '1px solid var(--color-border)',
                                            fontSize: '0.9rem',
                                            lineHeight: 1.6,
                                            color: 'var(--color-ink)',
                                            whiteSpace: 'pre-wrap',
                                            maxHeight: '320px',
                                            overflowY: 'auto',
                                            fontFamily: 'inherit'
                                        }}
                                    >
                                        {activeSubmission.submission_text || 'No submission text available.'}
                                    </div>
                                </div>

                                {/* AI Assist Banner */}
                                <div
                                    style={{
                                        padding: '1.25rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1.5px dashed var(--color-orange)',
                                        backgroundColor: 'var(--color-orange-subtle)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.75rem'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Sparkles size={18} style={{ color: 'var(--color-orange)' }} />
                                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-ink)' }}>
                                                Gemini AI-Assisted Assessment
                                            </span>
                                        </div>
                                        <Button
                                            variant="orange"
                                            size="sm"
                                            icon={Sparkles}
                                            disabled={isGeneratingAi}
                                            onClick={handleRequestAi}
                                        >
                                            {isGeneratingAi ? 'Analyzing...' : 'AI Suggest Grade'}
                                        </Button>
                                    </div>

                                    {aiError && (
                                        <div style={{ fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
                                            {aiError}
                                        </div>
                                    )}

                                    {aiSuggestion && (
                                        <div
                                            style={{
                                                backgroundColor: '#fff',
                                                padding: '1rem',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid rgba(255, 87, 52, 0.2)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-orange)' }}>
                                                    Suggested Score: {aiSuggestion.suggested_grade} / {activeSubmission.max_score || 100} pts
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={handleApplyAiSuggestion}
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: 700,
                                                        color: 'var(--color-orange)',
                                                        textDecoration: 'underline'
                                                    }}
                                                >
                                                    Apply to Form ↓
                                                </button>
                                            </div>
                                            <p style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
                                                {aiSuggestion.feedback}
                                            </p>
                                            {aiSuggestion.strengths && aiSuggestion.strengths.length > 0 && (
                                                <div style={{ fontSize: '0.78rem', color: '#15803d', marginBottom: '0.25rem' }}>
                                                    <strong>✓ Strengths:</strong> {aiSuggestion.strengths.join(', ')}
                                                </div>
                                            )}
                                            {aiSuggestion.areas_for_improvement && aiSuggestion.areas_for_improvement.length > 0 && (
                                                <div style={{ fontSize: '0.78rem', color: '#b45309' }}>
                                                    <strong>⚡ To Improve:</strong> {aiSuggestion.areas_for_improvement.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Right Pane: Evaluation Form */}
                            <form onSubmit={handleSaveGrade} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                {/* Grade Input */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                                        <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                                            Assigned Score (Max: {activeSubmission.max_score || 100}):
                                        </label>
                                        <div style={{ display: 'flex', gap: '0.3rem' }}>
                                            {[100, 95, 85, 75].map((preset) => (
                                                <button
                                                    type="button"
                                                    key={preset}
                                                    onClick={() => setGradeInput(String(preset))}
                                                    style={{
                                                        fontSize: '0.72rem',
                                                        padding: '0.15rem 0.45rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        backgroundColor: 'var(--color-offwhite)',
                                                        color: 'var(--color-text-secondary)',
                                                        border: '1px solid var(--color-border)',
                                                        fontWeight: 600
                                                    }}
                                                >
                                                    {preset}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        min="0"
                                        max={activeSubmission.max_score || 100}
                                        value={gradeInput}
                                        onChange={(e) => setGradeInput(e.target.value)}
                                        placeholder={`e.g. 92`}
                                        required
                                        style={{
                                            width: '100%',
                                            padding: '0.65rem 0.85rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1.5px solid var(--color-border)',
                                            fontSize: '1.1rem',
                                            fontWeight: 700,
                                            color: 'var(--color-ink)',
                                            backgroundColor: '#fff',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                {/* Written Feedback */}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.4rem' }}>
                                        Written Teacher Feedback:
                                    </label>
                                    <textarea
                                        rows={6}
                                        value={feedbackInput}
                                        onChange={(e) => setFeedbackInput(e.target.value)}
                                        placeholder="Write constructive guidance, commend strengths, or outline areas for remediation..."
                                        style={{
                                            width: '100%',
                                            flex: 1,
                                            minHeight: '140px',
                                            padding: '0.75rem 0.85rem',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1.5px solid var(--color-border)',
                                            fontSize: '0.88rem',
                                            lineHeight: 1.5,
                                            color: 'var(--color-ink)',
                                            outline: 'none',
                                            resize: 'vertical',
                                            backgroundColor: '#fff'
                                        }}
                                    />
                                </div>

                                {gradeError && (
                                    <div style={{ fontSize: '0.85rem', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <AlertCircle size={15} />
                                        {gradeError}
                                    </div>
                                )}

                                {gradeSaveSuccess && (
                                    <div style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <CheckCircle2 size={16} />
                                        Grade and feedback successfully published!
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="md"
                                        onClick={() => setGradingModalOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="orange"
                                        size="md"
                                        icon={Check}
                                        disabled={isSavingGrade}
                                    >
                                        {isSavingGrade ? 'Saving Grade...' : 'Publish Grade'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================================================
          2. CREATE ASSIGNMENT MODAL
          ===================================================================== */}
            {newAssignmentModalOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(21, 19, 19, 0.6)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem'
                    }}
                >
                    <div
                        className="card-white"
                        style={{
                            width: '100%',
                            maxWidth: '600px',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '0',
                            overflow: 'hidden',
                            boxShadow: 'var(--shadow-lg)'
                        }}
                    >
                        <div
                            style={{
                                padding: '1.25rem 1.75rem',
                                borderBottom: '1px solid var(--color-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'var(--color-offwhite)'
                            }}
                        >
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                                Create New Course Assignment
                            </h2>
                            <button
                                type="button"
                                onClick={() => setNewAssignmentModalOpen(false)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#fff',
                                    border: '1px solid var(--color-border)'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateAssignmentSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
                            {/* Course selection */}
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', display: 'block', marginBottom: '0.35rem' }}>
                                    Target Course:
                                </label>
                                <select
                                    value={newAsgCourse}
                                    onChange={(e) => setNewAsgCourse(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.55rem 0.75rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-border)',
                                        fontSize: '0.88rem',
                                        fontWeight: 600
                                    }}
                                >
                                    {courses.map((c) => (
                                        <option key={c.id || c.subject} value={c.id || c.subject}>
                                            {c.subject || c.id}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Title */}
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', display: 'block', marginBottom: '0.35rem' }}>
                                    Assignment Title:
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Relational Algebra & Query Trees"
                                    value={newAsgTitle}
                                    onChange={(e) => setNewAsgTitle(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.55rem 0.75rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-border)',
                                        fontSize: '0.88rem'
                                    }}
                                />
                            </div>

                            {/* Max score */}
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', display: 'block', marginBottom: '0.35rem' }}>
                                    Maximum Score Points:
                                </label>
                                <input
                                    type="number"
                                    min="10"
                                    max="500"
                                    value={newAsgMaxScore}
                                    onChange={(e) => setNewAsgMaxScore(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.55rem 0.75rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-border)',
                                        fontSize: '0.88rem'
                                    }}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', display: 'block', marginBottom: '0.35rem' }}>
                                    Task Prompt & Instructions:
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="Detail the question, expected implementation, or theoretical derivation..."
                                    value={newAsgDesc}
                                    onChange={(e) => setNewAsgDesc(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.55rem 0.75rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-border)',
                                        fontSize: '0.88rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            {/* Rubric */}
                            <div>
                                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', display: 'block', marginBottom: '0.35rem' }}>
                                    Grading Rubric / Criteria:
                                </label>
                                <textarea
                                    rows={3}
                                    placeholder="1. Algorithm correctness (50 pts)&#10;2. Complexity analysis (30 pts)&#10;3. Code clarity (20 pts)"
                                    value={newAsgRubric}
                                    onChange={(e) => setNewAsgRubric(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.55rem 0.75rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--color-border)',
                                        fontSize: '0.88rem',
                                        resize: 'vertical'
                                    }}
                                />
                            </div>

                            {/* Submit */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="md"
                                    onClick={() => setNewAssignmentModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="orange"
                                    size="md"
                                    disabled={isCreatingAsg}
                                >
                                    {isCreatingAsg ? 'Creating...' : 'Create Assignment'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TeacherGrading;
