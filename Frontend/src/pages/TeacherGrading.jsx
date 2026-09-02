import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart2,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  UserRound,
  Users
} from 'lucide-react';
import { Pill } from '../components/common/Pill';
import { StatCard } from '../components/cards/StatCard';
import { fetchClassGrading, fetchLibraryDocuments } from '../services/api';
import { useAuth } from '../context/AuthContext';

const distributionColors = {
  '90-100%': '#16a34a',
  '75-89%': '#3b82f6',
  '50-74%': '#f59e0b',
  'Below 50%': '#dc2626'
};

function StatusBadge({ status }) {
  const map = {
    strong: { label: 'Strong', bg: '#f0fdf4', color: '#15803d' },
    developing: { label: 'Developing', bg: '#fffbeb', color: '#92400e' },
    needs_review: { label: 'Needs Review', bg: '#fef2f2', color: '#991b1b' }
  };
  const config = map[status] || map.developing;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      backgroundColor: config.bg,
      color: config.color,
      borderRadius: '999px',
      padding: '0.3rem 0.65rem',
      fontWeight: 700,
      fontSize: '0.72rem'
    }}>
      {status === 'strong' ? '🟢' : status === 'needs_review' ? '🔴' : '🟡'} {config.label}
    </span>
  );
}

function EmptyState({ message, details }) {
  return (
    <div className="card-white" style={{
      padding: '2.25rem',
      borderLeft: '4px solid #f59e0b',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.9rem',
      alignItems: 'flex-start'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <AlertTriangle size={24} style={{ color: '#d97706' }} />
        <strong style={{ fontSize: '1.1rem', color: 'var(--color-ink)' }}>{message}</strong>
      </div>
      <p style={{ margin: 0, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
        {details}
      </p>
    </div>
  );
}

export function TeacherGrading() {
  const { session, displayName } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [grading, setGrading] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [error, setError] = useState(null);

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
        console.error('Error loading grading subjects:', err);
      } finally {
        setLoadingSubjects(false);
      }
    }

    loadSubjects();
  }, [session?.access_token]);

  useEffect(() => {
    if (!selectedSubject) return;

    async function loadGrading() {
      setLoading(true);
      setError(null);
      setGrading(null);
      try {
        const data = await fetchClassGrading(selectedSubject, session?.access_token);
        setGrading(data);
      } catch (err) {
        console.error('Error loading grading data:', err);
        setError('Unable to load class grading data. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadGrading();
  }, [selectedSubject, session?.access_token]);

  useEffect(() => {
    if (!grading || !grading.students || grading.students.length === 0) {
      setSelectedStudentId(null);
      return;
    }

    if (!selectedStudentId || !grading.students.some(student => student.student_id === selectedStudentId)) {
      setSelectedStudentId(grading.students[0].student_id);
    }
  }, [grading, selectedStudentId]);

  const summary = grading?.summary || null;

  const selectedStudent = useMemo(() => {
    if (!grading || !grading.students) return null;
    if (!selectedStudentId) return grading.students[0] || null;
    return grading.students.find(student => student.student_id === selectedStudentId) || grading.students[0] || null;
  }, [grading, selectedStudentId]);

  return (
    <div className="page-container" style={{ paddingBottom: '4rem' }}>
      <section style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
          <Pill color="purple" size="sm" icon={ClipboardCheck}>Class Grading</Pill>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
            {displayName}
          </span>
        </div>
        <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--color-orange)' }}>Class</span> Grading
        </h1>
        <p className="text-body" style={{ maxWidth: '720px', marginBottom: '1.5rem' }}>
          Review how students are performing across practice activity, spot students who need attention, and identify the concepts driving repeated mistakes.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          <Link to="/teacher/analytics" className="btn btn-outline" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={16} style={{ marginRight: '0.5rem' }} /> View Class Analytics
          </Link>
          <Link to="/teacher/dashboard" className="btn btn-outline" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpenCheck size={16} style={{ marginRight: '0.5rem' }} /> View Student Insights
          </Link>
        </div>
      </section>

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
              padding: '0.6rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: '1.5px solid var(--color-border)',
              backgroundColor: '#fff',
              minWidth: '320px',
              fontSize: '0.9rem'
            }}
          >
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject.replace(/_/g, ' ')}</option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <ClipboardCheck size={32} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <p style={{ fontWeight: 600 }}>Loading grading overview...</p>
        </div>
      )}

      {error && !loading && (
        <div className="card-white" style={{ padding: '2rem', textAlign: 'center', borderLeft: '4px solid #dc2626' }}>
          <AlertTriangle size={28} style={{ color: '#dc2626', margin: '0 auto 0.75rem' }} />
          <p style={{ color: '#991b1b', fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {grading && !grading.empty && !loading && (
        <>
          <section style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
            marginBottom: '2.5rem'
          }}>
            <StatCard tag="Students / Attempts" tagColor="orange" number={`${summary.students} / ${summary.attempts}`} label="Class activity" />
            <StatCard tag="Average Score" tagColor="purple" number={`${summary.average_score}%`} label="Overall score" />
            <StatCard tag="Needs Review" tagColor="red" number={summary.students_needing_review} label="Students to follow up" />
            <StatCard tag="Questions" tagColor="sky" number={summary.questions_evaluated} label="Questions evaluated" />
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1.5rem', marginBottom: '2.25rem' }}>
            <div className="card-white" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-ink)' }}>Score Distribution</h2>
                <Users size={18} style={{ color: 'var(--color-text-muted)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                {Object.entries(grading.distribution).map(([range, count]) => (
                  <div key={range}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                      <span>{range}</span>
                      <span>{count} student{count === 1 ? '' : 's'}</span>
                    </div>
                    <div style={{ height: '10px', borderRadius: '999px', overflow: 'hidden', backgroundColor: 'var(--color-offwhite)' }}>
                      <div
                        style={{
                          width: `${Math.max((count / Math.max(summary.students, 1)) * 100, count > 0 ? 12 : 0)}%`,
                          height: '100%',
                          backgroundColor: distributionColors[range] || '#a78bfa',
                          borderRadius: 'inherit'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-white" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-ink)' }}>Common Difficulties</h2>
                <AlertTriangle size={18} style={{ color: '#d97706' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {grading.common_difficulties.length === 0 ? (
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No repeated mistakes yet.</span>
                ) : (
                  grading.common_difficulties.slice(0, 5).map((item) => (
                    <div key={item.concept} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                      padding: '0.75rem 0.85rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-offwhite)',
                      border: '1px solid var(--color-border)'
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>{item.concept}</span>
                      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>{item.incorrect_attempts} incorrect</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.9fr', gap: '1.5rem' }}>
            <div className="card-white" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-ink)' }}>Student Grading</h2>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-offwhite)' }}>
                      <th style={{ textAlign: 'left', padding: '0.9rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Student</th>
                      <th style={{ textAlign: 'left', padding: '0.9rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Score</th>
                      <th style={{ textAlign: 'left', padding: '0.9rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Correct</th>
                      <th style={{ textAlign: 'left', padding: '0.9rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Incorrect</th>
                      <th style={{ textAlign: 'left', padding: '0.9rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grading.students.map(student => (
                      <tr
                        key={student.student_id}
                        onClick={() => setSelectedStudentId(student.student_id)}
                        style={{
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--color-border)',
                          backgroundColor: selectedStudent?.student_id === student.student_id ? '#fff9f3' : '#fff'
                        }}
                      >
                        <td style={{ padding: '0.95rem 1rem', fontWeight: 600, color: 'var(--color-ink)' }}>{student.name}</td>
                        <td style={{ padding: '0.95rem 1rem', fontWeight: 700 }}>{student.score}%</td>
                        <td style={{ padding: '0.95rem 1rem' }}>{student.correct}</td>
                        <td style={{ padding: '0.95rem 1rem' }}>{student.incorrect}</td>
                        <td style={{ padding: '0.95rem 1rem' }}><StatusBadge status={student.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card-white" style={{ padding: '1.5rem' }}>
              {selectedStudent ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <UserRound size={18} style={{ color: '#7c3aed' }} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--color-ink)' }}>{selectedStudent.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Selected student</div>
                      </div>
                    </div>
                    <StatusBadge status={selectedStudent.status} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.9rem', marginBottom: '1.5rem' }}>
                    <div style={{ backgroundColor: 'var(--color-offwhite)', borderRadius: 'var(--radius-sm)', padding: '0.85rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Overall score</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-ink)' }}>{selectedStudent.score}%</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-offwhite)', borderRadius: 'var(--radius-sm)', padding: '0.85rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Questions attempted</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-ink)' }}>{selectedStudent.questions_attempted}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-offwhite)', borderRadius: 'var(--radius-sm)', padding: '0.85rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Correct answers</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-ink)' }}>{selectedStudent.correct}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--color-offwhite)', borderRadius: 'var(--radius-sm)', padding: '0.85rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '0.2rem' }}>Incorrect answers</div>
                      <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-ink)' }}>{selectedStudent.incorrect}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', color: 'var(--color-ink)' }}>Question-Level Performance</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {selectedStudent.questions.length === 0 ? (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>No question-level records available.</span>
                      ) : (
                        selectedStudent.questions.map((question, index) => (
                          <div key={`${question.question_id || index}-${question.concept}`} style={{
                            padding: '0.75rem 0.85rem',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--color-offwhite)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                              <div style={{ fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.5 }}>{question.concept || 'Practice question'}</div>
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: question.result === 'correct' ? '#15803d' : question.result === 'partial' ? '#92400e' : '#991b1b',
                                backgroundColor: question.result === 'correct' ? '#f0fdf4' : question.result === 'partial' ? '#fffbeb' : '#fef2f2',
                                padding: '0.22rem 0.55rem',
                                borderRadius: '999px'
                              }}>
                                {question.result === 'correct' ? 'Correct' : question.result === 'partial' ? 'Partial' : 'Incorrect'}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.4rem' }}>
                              {question.question}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
                              Score: {question.score}%
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {selectedStudent.learning_gap ? (
                    <div style={{
                      marginTop: '1rem',
                      border: '1px solid #fcd34d',
                      backgroundColor: '#fffbeb',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.9rem 1rem'
                    }}>
                      <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '0.35rem' }}>Learning Gap</div>
                      <div style={{ fontSize: '0.82rem', color: '#78350f', lineHeight: 1.5 }}>
                        Weak concept: <strong>{selectedStudent.learning_gap.weak_concept}</strong>
                        <br />
                        Possible prerequisite: <strong>{selectedStudent.learning_gap.prerequisite_concept}</strong>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      No prerequisite relationship is currently associated with this student&apos;s weakest concept.
                    </div>
                  )}
                </>
              ) : (
                <div style={{ color: 'var(--color-text-muted)' }}>No student data available.</div>
              )}
            </div>
          </section>
        </>
      )}

      {grading && grading.empty && !loading && (
        <EmptyState
          message={grading.message || 'No graded activity yet.'}
          details={grading.details || 'Students need to complete practice activity before class grading insights appear.'}
        />
      )}
    </div>
  );
}
