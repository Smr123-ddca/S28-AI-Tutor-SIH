import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  Send,
  Sparkles,
  BookOpen,
  Filter,
  ChevronRight,
  X,
  Check,
  Search
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import { StatCard } from '../components/cards/StatCard';
import {
  fetchAssignments,
  fetchLibraryDocuments,
  submitStudentAssignment
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSoundManager } from '../services/soundManager';

export function StudentAssignments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const token = session?.access_token;
  const { playSound } = useSoundManager();

  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'not_started' | 'submitted' | 'graded'
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Drawer state
  const [selectedAsg, setSelectedAsg] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [asgData, docsData] = await Promise.all([
        fetchAssignments({ token }).catch(() => ({ assignments: [] })),
        fetchLibraryDocuments(token).catch(() => ({ documents: [] }))
      ]);

      setAssignments(asgData.assignments || []);
      setCourses(docsData.documents || []);
    } catch (err) {
      console.error('Error loading student assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleOpenAssignment = (asg) => {
    playSound('click');
    setSelectedAsg(asg);
    setSubmissionText(asg.student_submission_text || '');
    setSubmitError('');
    setSubmitSuccess(false);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedAsg(null);
    setSubmissionText('');
    setSubmitError('');
    setSubmitSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAsg || !submissionText.trim()) {
      setSubmitError('Please enter your coursework answer or code solution.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await submitStudentAssignment({
        assignment_id: selectedAsg.id,
        submission_text: submissionText.trim(),
        token
      });

      playSound('correct');
      setSubmitSuccess(true);
      setTimeout(() => {
        handleCloseModal();
        loadData();
      }, 1200);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((asg) => {
      if (selectedCourse !== 'ALL' && asg.course_name !== selectedCourse) return false;
      if (statusFilter !== 'ALL' && asg.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = (asg.title || '').toLowerCase().includes(query);
        const descMatch = (asg.description || '').toLowerCase().includes(query);
        const courseMatch = (asg.course_name || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !courseMatch) return false;
      }
      return true;
    });
  }, [assignments, selectedCourse, statusFilter, searchQuery]);

  // Statistics calculation
  const totalCount = assignments.length;
  const notStartedCount = assignments.filter((a) => a.status === 'not_started').length;
  const submittedCount = assignments.filter((a) => a.status === 'submitted').length;
  const gradedList = assignments.filter((a) => a.status === 'graded');
  const gradedCount = gradedList.length;
  const validScores = gradedList.map((a) => Number(a.grade)).filter((g) => !isNaN(g));
  const avgScore = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : null;

  return (
    <div className="page-container" style={{ paddingBottom: '4rem' }}>
      {/* =====================================================================
          1. HEADER & HERO
          ===================================================================== */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <Pill color="orange" size="sm" icon={FileText}>
            Syllabus Coursework & Submissions
          </Pill>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            Curriculum Grounded Assessments
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <h1 className="text-display" style={{ fontSize: '2.1rem', marginBottom: '0.4rem' }}>
              My <span style={{ color: 'var(--color-orange)' }}>Assignments</span> & Tasks
            </h1>
            <p className="text-body" style={{ maxWidth: '620px', color: 'var(--color-text-secondary)' }}>
              Complete course tasks, submit your solutions, and receive verified instructor grades with comprehensive feedback.
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. KPI SUMMARY METRICS ROW
          ===================================================================== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem'
        }}
      >
        <StatCard
          tag="All Tasks"
          tagColor="purple"
          number={loading ? '--' : `${totalCount}`}
          label="Coursework Assigned"
        />
        <StatCard
          tag="To Do"
          tagColor="orange"
          number={loading ? '--' : `${notStartedCount}`}
          label="Pending Submission"
        />
        <StatCard
          tag="Under Review"
          tagColor="yellow"
          number={loading ? '--' : `${submittedCount}`}
          label="Submitted For Grading"
        />
        <StatCard
          tag="Evaluated"
          tagColor="sky"
          number={loading ? '--' : avgScore ? `${avgScore}%` : `${gradedCount}`}
          label={avgScore ? 'Average Grade Score' : 'Graded Submissions'}
        />
      </section>

      {/* =====================================================================
          3. FILTER & SEARCH CONTROLS BAR
          ===================================================================== */}
      <section
        className="card-white"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.25rem'
        }}
      >
        {/* Left: Status Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', marginRight: '0.25rem' }}>
            Status:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: 700,
              backgroundColor: statusFilter === 'ALL' ? 'var(--color-ink)' : 'var(--color-offwhite)',
              color: statusFilter === 'ALL' ? '#fff' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('not_started')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: 700,
              backgroundColor: statusFilter === 'not_started' ? 'var(--color-orange)' : 'var(--color-offwhite)',
              color: statusFilter === 'not_started' ? '#fff' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            To Do ({notStartedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('submitted')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: 700,
              backgroundColor: statusFilter === 'submitted' ? 'var(--color-yellow)' : 'var(--color-offwhite)',
              color: statusFilter === 'submitted' ? 'var(--color-ink)' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Under Review ({submittedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('graded')}
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.82rem',
              fontWeight: 700,
              backgroundColor: statusFilter === 'graded' ? '#16a34a' : 'var(--color-offwhite)',
              color: statusFilter === 'graded' ? '#fff' : 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            Graded ({gradedCount})
          </button>
        </div>

        {/* Right: Course Selector + Search Box */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: 'var(--color-white)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Subjects & Modules</option>
            {courses.map((c) => (
              <option key={c.id || c.subject} value={c.id || c.subject}>
                {c.subject || c.id}
              </option>
            ))}
          </select>

          <div style={{ position: 'relative', width: '220px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              style={{
                width: '100%',
                padding: '0.5rem 2.2rem 0.5rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--color-border)',
                fontSize: '0.85rem',
                backgroundColor: 'var(--color-offwhite)',
                outline: 'none'
              }}
            />
            <Search
              size={15}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-text-muted)'
              }}
            />
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. ASSIGNMENT CARDS GRID
          ===================================================================== */}
      <section>
        {loading ? (
          <div className="card-white" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading coursework assignments and grading status...
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="card-white" style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <FileText size={42} style={{ color: 'var(--color-orange)', margin: '0 auto 1rem', opacity: 0.7 }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.35rem' }}>
              No Assignments Found
            </h3>
            <p style={{ fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
              There are no assignments matching your selected filter criteria.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            {filteredAssignments.map((asg) => {
              const isGraded = asg.status === 'graded';
              const isSubmitted = asg.status === 'submitted';
              const isNotStarted = asg.status === 'not_started';

              let borderColor = 'var(--color-border)';
              if (isGraded) borderColor = '#16a34a';
              else if (isSubmitted) borderColor = 'var(--color-yellow)';
              else if (isNotStarted) borderColor = 'var(--color-orange)';

              return (
                <div
                  key={asg.id}
                  className="card-white"
                  style={{
                    padding: '1.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderLeft: `5px solid ${borderColor}`,
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'transform var(--transition-fast)'
                  }}
                >
                  <div>
                    {/* Header: Course Tag + Status Pill */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-offwhite)',
                          color: 'var(--color-text-secondary)',
                          border: '1px solid var(--color-border)'
                        }}
                      >
                        {asg.course_name}
                      </span>

                      {isGraded ? (
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontWeight: 800,
                            padding: '0.25rem 0.75rem',
                            borderRadius: '100px',
                            backgroundColor: 'var(--color-green-light)',
                            color: '#15803d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <CheckCircle2 size={15} />
                          {asg.grade} / {asg.max_score || 100} pts
                        </span>
                      ) : isSubmitted ? (
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.7rem',
                            borderRadius: '100px',
                            backgroundColor: 'var(--color-yellow-light)',
                            color: '#92400e',
                            border: '1px solid #fcd34d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <Clock size={14} />
                          Under Review
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.7rem',
                            borderRadius: '100px',
                            backgroundColor: 'var(--color-orange-subtle)',
                            color: 'var(--color-orange)',
                            border: '1px solid #fed7aa',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <AlertCircle size={14} />
                          To Do
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '0.5rem' }}>
                      {asg.title}
                    </h3>

                    {/* Description */}
                    <p
                      style={{
                        fontSize: '0.88rem',
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.5,
                        marginBottom: '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}
                    >
                      {asg.description || 'No description provided.'}
                    </p>

                    {/* Rubric snippet if available */}
                    {asg.rubric && (
                      <div
                        style={{
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-offwhite)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.78rem',
                          color: 'var(--color-text-primary)',
                          marginBottom: '1rem',
                          lineHeight: 1.4
                        }}
                      >
                        <strong style={{ color: 'var(--color-ink)', display: 'block', marginBottom: '0.2rem' }}>
                          📋 Rubric Guidelines:
                        </strong>
                        <div style={{ whiteSpace: 'pre-wrap', maxHeight: '60px', overflowY: 'hidden' }}>
                          {asg.rubric}
                        </div>
                      </div>
                    )}

                    {/* Feedback preview if graded */}
                    {isGraded && asg.feedback && (
                      <div
                        style={{
                          padding: '0.85rem',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          fontSize: '0.82rem',
                          lineHeight: 1.4,
                          marginBottom: '1rem'
                        }}
                      >
                        <strong style={{ color: '#15803d', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                          <Award size={14} /> Instructor Feedback:
                        </strong>
                        <p style={{ margin: 0, color: '#166534' }}>{asg.feedback}</p>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Action */}
                  <div
                    style={{
                      paddingTop: '1rem',
                      borderTop: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      Max Score: <strong style={{ color: 'var(--color-ink)' }}>{asg.max_score || 100} pts</strong>
                    </div>

                    <Button
                      variant={isNotStarted ? 'orange' : 'outline'}
                      size="sm"
                      onClick={() => handleOpenAssignment(asg)}
                      icon={isNotStarted ? Send : isGraded ? Award : CheckCircle2}
                    >
                      {isNotStarted ? 'Submit Response' : isGraded ? 'View Grade & Solution' : 'View Submission'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================================
          5. ASSIGNMENT DETAILS & SUBMISSION MODAL
          ===================================================================== */}
      {modalOpen && selectedAsg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem'
          }}
          onClick={handleCloseModal}
        >
          <div
            className="card-white"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '2.25rem',
              boxShadow: 'var(--shadow-lg)',
              borderRadius: 'var(--radius-lg)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseModal}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-muted)'
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Eyebrow */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-offwhite)',
                  color: 'var(--color-text-secondary)',
                  border: '1px solid var(--color-border)'
                }}
              >
                {selectedAsg.course_name}
              </span>

              {selectedAsg.status === 'graded' && (
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '100px',
                    backgroundColor: 'var(--color-green-light)',
                    color: '#15803d'
                  }}
                >
                  Grade: {selectedAsg.grade} / {selectedAsg.max_score || 100} pts
                </span>
              )}
            </div>

            {/* Modal Title */}
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-ink)', marginBottom: '1rem' }}>
              {selectedAsg.title}
            </h2>

            {/* Task Description */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                Instructions
              </h4>
              <p style={{ fontSize: '0.92rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {selectedAsg.description || 'Complete the assignment task according to the syllabus.'}
              </p>
            </div>

            {/* Rubric */}
            {selectedAsg.rubric && (
              <div
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-offwhite)',
                  border: '1px solid var(--color-border)',
                  marginBottom: '1.5rem'
                }}
              >
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.35rem' }}>
                  📋 Evaluation Rubric
                </h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-primary)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {selectedAsg.rubric}
                </div>
              </div>
            )}

            {/* Teacher Feedback Box (If Graded) */}
            {selectedAsg.status === 'graded' && selectedAsg.feedback && (
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  marginBottom: '1.5rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <Award size={18} style={{ color: '#16a34a' }} />
                  <strong style={{ color: '#15803d', fontSize: '0.95rem' }}>
                    Instructor Evaluation & Written Feedback
                  </strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#166534', lineHeight: 1.5 }}>
                  {selectedAsg.feedback}
                </p>
              </div>
            )}

            {/* Submission Form / View */}
            {selectedAsg.status === 'not_started' ? (
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.5rem' }}>
                    Your Solution / Submission Text:
                  </label>
                  <textarea
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Write your explanation, analysis, algorithm, or code solution here..."
                    style={{
                      width: '100%',
                      height: '180px',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--color-border)',
                      fontSize: '0.92rem',
                      lineHeight: 1.5,
                      outline: 'none',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                    required
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>
                    <span>Supports code snippets and markdown formatted text</span>
                    <span>{submissionText.length} characters</span>
                  </div>
                </div>

                {submitError && (
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    {submitError}
                  </div>
                )}

                {submitSuccess && (
                  <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Check size={16} /> Coursework submitted successfully! Updating status...
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <Button variant="outline" size="md" onClick={handleCloseModal} type="button">
                    Cancel
                  </Button>
                  <Button variant="orange" size="md" type="submit" disabled={isSubmitting || !submissionText.trim()} icon={Send}>
                    {isSubmitting ? 'Submitting...' : 'Submit Coursework'}
                  </Button>
                </div>
              </form>
            ) : (
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Your Submitted Work
                </h4>
                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-offwhite)',
                    border: '1px solid var(--color-border)',
                    fontSize: '0.9rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    color: 'var(--color-ink)'
                  }}
                >
                  {selectedAsg.student_submission_text || 'No text content available.'}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                  <Button variant="ink" size="md" onClick={handleCloseModal}>
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentAssignments;
