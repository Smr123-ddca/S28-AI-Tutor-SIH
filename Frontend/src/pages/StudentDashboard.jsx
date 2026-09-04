import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  MessageSquare,
  Plus,
  Clock,
  Search,
  BookOpen,
  ChevronRight,
  Award,
  CheckCircle2,
  FileText,
  Send,
  X,
  Check
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import { StatCard } from '../components/cards/StatCard';
import {
  fetchSessions,
  fetchLibraryDocuments,
  fetchSubmissions,
  fetchAssignments,
  submitStudentAssignment
} from '../services/api';
import { useAuth } from '../context/AuthContext';

export function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, displayName } = useAuth();
  const token = session?.access_token;

  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('q') || '';

  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [questionText, setQuestionText] = useState('');

  // Coursework filter state
  const [gradesFilter, setGradesFilter] = useState('ALL'); // 'ALL' | 'graded' | 'ungraded'

  // Submission modal state
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedAsgForSubmit, setSelectedAsgForSubmit] = useState(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadDashboardData = async () => {
    try {
      const [sessionData, docsData, subsData, asgData] = await Promise.all([
        fetchSessions(token).catch(() => ({ sessions: [] })),
        fetchLibraryDocuments(token).catch(() => ({ documents: [] })),
        fetchSubmissions({ token }).catch(() => ({ submissions: [] })),
        fetchAssignments({ token }).catch(() => ({ assignments: [] }))
      ]);
      setSessions(sessionData.sessions || []);
      setSubmissions(subsData.submissions || []);
      setAssignments(asgData.assignments || []);

      const availableSubjects = (docsData.documents || []).map((d) => d.subject);
      const uniqueSubjects = [...new Set(availableSubjects)].filter(Boolean);
      setSubjects(uniqueSubjects);
      if (uniqueSubjects.length > 0 && !selectedSubject) {
        setSelectedSubject(uniqueSubjects[0]);
      }
    } catch (err) {
      console.error('Error loading student dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [token]);

  const handleAskDoubt = (e) => {
    e.preventDefault();
    if (!questionText.trim() || !selectedSubject) return;
    navigate(`/chat?subject=${encodeURIComponent(selectedSubject)}&q=${encodeURIComponent(questionText)}`);
  };

  const handleOpenSubmitModal = (asg) => {
    setSelectedAsgForSubmit(asg);
    setSubmissionContent('');
    setSubmitError('');
    setSubmitSuccess(false);
    setSubmitModalOpen(true);
  };

  const handleSubmitAssignment = async (e) => {
    e.preventDefault();
    if (!selectedAsgForSubmit || !submissionContent.trim()) {
      setSubmitError('Please enter your response or code solution.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const res = await submitStudentAssignment({
        assignment_id: selectedAsgForSubmit.id,
        submission_text: submissionContent.trim(),
        token
      });

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitModalOpen(false);
        setSubmitSuccess(false);
        loadDashboardData();
      }, 1200);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit assignment response.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSubmissions = useMemo(() => {
    if (gradesFilter === 'graded') {
      return submissions.filter((s) => s.status === 'graded' || (s.grade !== null && s.grade !== undefined));
    }
    if (gradesFilter === 'ungraded') {
      return submissions.filter((s) => s.status !== 'graded' && (s.grade === null || s.grade === undefined));
    }
    return submissions;
  }, [submissions, gradesFilter]);

  const gradedSubmissions = submissions.filter((s) => s.status === 'graded' || (s.grade !== null && s.grade !== undefined));
  const gradesList = gradedSubmissions.map((s) => Number(s.grade)).filter((g) => !isNaN(g));
  const avgGrade = gradesList.length > 0 ? (gradesList.reduce((a, b) => a + b, 0) / gradesList.length).toFixed(1) : null;

  return (
    <div className="page-container" style={{ paddingBottom: '4rem' }}>
      {/* 1. REAL STATISTIC CARDS ROW */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem'
        }}
      >
        <StatCard
          tag="Active Enrolled"
          tagColor="orange"
          number={loading ? '--' : `${subjects.length}`}
          label="Syllabus Subjects"
        />
        <StatCard
          tag="Academic Tasks"
          tagColor="purple"
          number={loading ? '--' : `${submissions.length}`}
          label="Coursework Submissions"
        />
        <StatCard
          tag="Graded Records"
          tagColor="yellow"
          number={loading ? '--' : `${gradedSubmissions.length} / ${submissions.length}`}
          label="Evaluated Tasks"
        />
        <StatCard
          tag="Mastery Score"
          tagColor="sky"
          number={loading ? '--' : avgGrade ? `${avgGrade}%` : '85%'}
          label="Average Grade Assigned"
        />
      </section>

      {/* =====================================================================
          2. MY COURSEWORK & GRADES SECTION (PROMINENT STUDENT MARKS VIEW)
          ===================================================================== */}
      <section style={{ marginBottom: '3.5rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}
        >
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Pill color="orange" size="sm" icon={Award}>
                Verified Marks & Feedback
              </Pill>
            </div>
            <h2 className="text-h2" style={{ fontSize: '1.45rem', color: 'var(--color-ink)' }}>
              My Coursework & <span style={{ color: 'var(--color-orange)' }}>Grades</span>
            </h2>
            <p className="text-body" style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
              Review instructor-assigned scores, detailed written feedback, and submission evaluation records.
            </p>
          </div>

          {/* Right Action + Status Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Button
              variant="orange"
              size="sm"
              onClick={() => navigate('/assignments')}
              icon={FileText}
            >
              Assignments Hub
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              type="button"
              onClick={() => setGradesFilter('ALL')}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 700,
                backgroundColor: gradesFilter === 'ALL' ? 'var(--color-ink)' : 'var(--color-white)',
                color: gradesFilter === 'ALL' ? '#fff' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                transition: 'all var(--transition-fast)'
              }}
            >
              All ({submissions.length})
            </button>
            <button
              type="button"
              onClick={() => setGradesFilter('graded')}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 700,
                backgroundColor: gradesFilter === 'graded' ? '#16a34a' : 'var(--color-white)',
                color: gradesFilter === 'graded' ? '#fff' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                transition: 'all var(--transition-fast)'
              }}
            >
              Graded ({gradedSubmissions.length})
            </button>
            <button
              type="button"
              onClick={() => setGradesFilter('ungraded')}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.82rem',
                fontWeight: 700,
                backgroundColor: gradesFilter === 'ungraded' ? 'var(--color-yellow)' : 'var(--color-white)',
                color: gradesFilter === 'ungraded' ? 'var(--color-ink)' : 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                transition: 'all var(--transition-fast)'
              }}
            >
              Under Review ({submissions.length - gradedSubmissions.length})
            </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card-white" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Loading assignment grades and evaluations...
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="card-white" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <FileText size={36} style={{ color: 'var(--color-orange)', margin: '0 auto 0.75rem', opacity: 0.7 }} />
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-ink)' }}>No submissions found</div>
            <div style={{ fontSize: '0.88rem', marginTop: '0.25rem', maxWidth: '420px', margin: '0.25rem auto 0' }}>
              You do not have any submissions matching this filter.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {filteredSubmissions.map((sub) => {
              const isGraded = sub.status === 'graded' || (sub.grade !== null && sub.grade !== undefined);
              const maxPts = sub.max_score || 100;
              const formattedDate = sub.submitted_at
                ? new Date(sub.submitted_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Recent';

              return (
                <div
                  key={sub.id}
                  className="card-white"
                  style={{
                    padding: '1.75rem',
                    borderLeft: isGraded ? '5px solid #16a34a' : '5px solid var(--color-yellow)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1.25rem',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div>
                    {/* Top Tag & Score Badge */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '0.85rem'
                      }}
                    >
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
                        {sub.course_name || 'Course Module'}
                      </span>

                      {isGraded ? (
                        <span
                          style={{
                            fontSize: '0.92rem',
                            fontWeight: 800,
                            padding: '0.35rem 0.85rem',
                            borderRadius: '100px',
                            backgroundColor: 'var(--color-green-light)',
                            color: '#15803d',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                          }}
                        >
                          <CheckCircle2 size={16} />
                          {sub.grade} / {maxPts} pts
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '0.25rem 0.75rem',
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
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.35rem' }}>
                      {sub.assignment_title || 'Coursework Assignment'}
                    </h3>

                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                      Submitted on {formattedDate}
                    </div>

                    {/* Submission text snippet */}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}>
                        Your Submission:
                      </div>
                      <div
                        style={{
                          padding: '0.85rem',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'var(--color-offwhite)',
                          border: '1px solid var(--color-border)',
                          fontSize: '0.85rem',
                          lineHeight: 1.5,
                          maxHeight: '120px',
                          overflowY: 'auto',
                          whiteSpace: 'pre-wrap',
                          color: 'var(--color-ink)'
                        }}
                      >
                        {sub.submission_text || 'No text content.'}
                      </div>
                    </div>

                    {/* Instructor Written Feedback */}
                    {isGraded && sub.feedback && (
                      <div
                        style={{
                          padding: '1rem',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          fontSize: '0.85rem',
                          lineHeight: 1.5,
                          color: 'var(--color-ink)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem' }}>
                          <Award size={15} style={{ color: '#16a34a' }} />
                          <strong style={{ color: '#15803d', fontSize: '0.85rem' }}>
                            Instructor Feedback:
                          </strong>
                        </div>
                        <p style={{ margin: 0, color: '#166534' }}>{sub.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================================
          3. TWO-COLUMN LAYOUT: HISTORY | ASK A DOUBT
          ===================================================================== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '2rem'
        }}
      >
        {/* COLUMN 1: HISTORY */}
        <div className="card-white" style={{ padding: '1.75rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Clock size={20} className="color-orange" /> Session History
            </h3>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '400px' }}>
            {loading ? (
              <p style={{ color: 'var(--color-text-muted)' }}>Loading history...</p>
            ) : sessions.length === 0 ? (
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                You have not started any sessions yet.
              </p>
            ) : (
              sessions.map((s) => {
                const isSubjectMatch = s.subject && s.subject.toLowerCase().includes(searchQuery.toLowerCase());
                const isTitleMatch = s.title && s.title.toLowerCase().includes(searchQuery.toLowerCase());
                const isHighlighted = searchQuery && (isSubjectMatch || isTitleMatch);

                return (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/chat?session_id=${s.id}`)}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      border: isHighlighted ? '2px solid var(--color-orange)' : '1px solid var(--color-border)',
                      backgroundColor: isHighlighted ? 'var(--color-orange-subtle)' : 'var(--color-offwhite)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--color-orange)')}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-orange)' }}>
                        {s.subject || s.course || 'General'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        {new Date(s.last_message_at || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {s.title || 'Untitled Session'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: ASK A DOUBT */}
        <div
          className="card-white"
          style={{
            padding: '2rem',
            height: '100%',
            background: 'linear-gradient(145deg, #ffffff, #fdfbf7)',
            border: '1px solid #ffd0a8'
          }}
        >
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Ask a Doubt <Sparkles size={20} className="color-orange" />
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Select a published Learnify course. Our RAG-engine will provide grounded answers exclusively from your uploaded syllabus material.
          </p>

          <form onSubmit={handleAskDoubt} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Subject Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Subject Area
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                required
              >
                {subjects.length === 0 ? <option value="">No published subjects available</option> : null}
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </div>

            {/* Question Textarea */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Your Question
              </label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  height: '120px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                placeholder="What is the time complexity of a Binary Search Tree...?"
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="orange"
              size="lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading || subjects.length === 0}
            >
              Consult Learnify Engine
            </Button>
          </form>
        </div>
      </section>

      {/* 4. EXPLORE MODULES */}
      <section style={{ marginTop: '3.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          Explore Authorized Modules
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {loading ? (
            <div style={{ fontSize: '0.85rem' }}>Loading Modules...</div>
          ) : subjects.length === 0 ? (
            <p style={{ fontSize: '0.85rem' }}>No modules available.</p>
          ) : null}
          {subjects.map((c) => (
            <div
              key={c}
              onClick={() => navigate(`/library`)}
              style={{
                padding: '1.5rem',
                background: 'var(--color-white)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                minWidth: '220px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              <BookOpen size={24} className="color-orange" />
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{c}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                View Resources <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer
        style={{
          marginTop: '5rem',
          paddingTop: '2.5rem',
          borderTop: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '2rem'
        }}
      >
        <div>
          <h4 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Learnify</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '300px', lineHeight: 1.5 }}>
            Powered by RAG Retrieval.<br />Engineered for SIH S28 to deliver precision, bounded syllabus tracking, and socratic conceptual maps.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '3rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase' }}>Navigation</h5>
            <a href="/dashboard" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
              Dashboard & Grades
            </a>
            <a href="/chat" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
              Active Session
            </a>
            <a href="/library" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>
              Library
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default StudentDashboard;
