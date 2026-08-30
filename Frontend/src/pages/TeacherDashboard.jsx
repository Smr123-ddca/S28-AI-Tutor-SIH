import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  AlertTriangle,
  UploadCloud,
  FileText,
  Users,
  CheckCircle2,
  BookOpen,
  TrendingUp,
  Search,
  Sparkles,
  X,
  Send
} from 'lucide-react';
import { Pill } from '../components/common/Pill';
import { ProgressBar } from '../components/common/AvatarStack';
import { Button } from '../components/common/Button';
import { SegmentedControl } from '../components/common/SegmentedControl';
import { LoadingState } from '../components/common/LoadingState';
import { EmptyState } from '../components/common/EmptyState';
import { NoResultsState } from '../components/common/NoResultsState';
import { ErrorState } from '../components/common/ErrorState';
import {
  MOCK_CONCEPT_MASTERY,
  MOCK_STUDENT_GAPS,
  MOCK_INTERVENTIONS,
  MOCK_DOCUMENTS
} from '../services/mockData';
import { fetchMisconceptions } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSoundManager } from '../services/soundManager';

export function TeacherDashboard() {
  const { session, displayName } = useAuth();
  const { playSound } = useSoundManager();
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'ingestion' | 'cohort'
  const [misconceptions, setMisconceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Ingestion upload state
  const [documents, setDocuments] = useState(MOCK_DOCUMENTS);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadSubject, setUploadSubject] = useState('Computer Science');
  const [uploadChapter, setUploadChapter] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Student filter state
  const [cohortFilter, setCohortFilter] = useState('All');
  const [studentSearch, setStudentSearch] = useState('');

  // Modals state
  const [historyStudent, setHistoryStudent] = useState(null);
  const [refresherStudent, setRefresherStudent] = useState(null);
  const [selectedRefresherTopic, setSelectedRefresherTopic] = useState('Recursion Call Stack');
  const [assignmentNote, setAssignmentNote] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMisconceptions(session?.access_token);
      setMisconceptions(data.misconceptions || []);
    } catch (err) {
      console.error('Error loading teacher misconceptions:', err);
      setError(err.message || 'Failed to retrieve real-time student misconceptions data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [session?.access_token]);

  const sortedMisconceptions = [...misconceptions].sort(
    (a, b) => b.incorrect_rate - a.incorrect_rate
  );

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!uploadFileName.trim()) return;

    setIsUploading(true);
    playSound('click');
    setTimeout(() => {
      const newDoc = {
        id: `doc-${Date.now()}`,
        filename: uploadFileName.endsWith('.pdf') || uploadFileName.endsWith('.pptx') ? uploadFileName : `${uploadFileName}.pdf`,
        subject: uploadSubject,
        chapter: uploadChapter || 'New Module',
        fileSize: '5.4 MB',
        fileType: uploadFileName.endsWith('.pptx') ? 'pptx' : 'pdf',
        uploadDate: new Date().toISOString().split('T')[0],
        uploadedBy: displayName || 'Prof. Sharma',
        totalChunks: 38
      };
      setDocuments((prev) => [newDoc, ...prev]);
      setIsUploading(false);
      setUploadSuccess(true);
      setUploadFileName('');
      setUploadChapter('');
      playSound('correct');
      setTimeout(() => setUploadSuccess(false), 4000);
    }, 1200);
  };

  const handleConfirmRefresher = (e) => {
    e.preventDefault();
    playSound('correct');
    setToastMessage(`Assigned "${selectedRefresherTopic}" refresher to ${refresherStudent.studentName}. Prompt pushed to next student session.`);
    setRefresherStudent(null);
    setAssignmentNote('');
    setTimeout(() => setToastMessage(''), 5000);
  };

  const filteredStudents = MOCK_STUDENT_GAPS.filter((st) => {
    const matchesRisk = cohortFilter === 'All' || st.riskLevel === cohortFilter;
    const matchesQuery =
      st.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      st.failingConcepts.some((c) => c.toLowerCase().includes(studentSearch.toLowerCase()));
    return matchesRisk && matchesQuery;
  });

  const tabOptions = [
    { id: 'analytics', label: 'Class Diagnostics & Misconceptions' },
    { id: 'ingestion', label: 'Syllabus Ingestion & Uploads' },
    { id: 'cohort', label: 'Student Cohort & Remediation' }
  ];

  return (
    <div className="page-container" style={{ paddingBottom: '4rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: 'var(--color-ink)',
            color: '#ffffff',
            padding: '1rem 1.5rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            zIndex: 100,
            animation: 'float-subtle 0.3s ease'
          }}
        >
          <Sparkles size={18} style={{ color: 'var(--color-orange)' }} />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage('')}
            style={{ color: 'rgba(255, 255, 255, 0.7)', marginLeft: '0.5rem', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* =====================================================================
          TEACHER DASHBOARD HEADER
          ===================================================================== */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <Pill color="purple" size="sm" icon={GraduationCap}>
                Educator Hub & Command Center
              </Pill>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                Logged in as {displayName}
              </span>
            </div>
            <h1 className="text-h1" style={{ marginBottom: '0.5rem' }}>
              Teacher <span style={{ color: 'var(--color-orange)' }}>Dashboard</span>
            </h1>
            <p className="text-body" style={{ maxWidth: '680px' }}>
              Monitor student mastery in real time, upload new syllabus textbooks, inspect detected prerequisite gaps, and trigger automated remedial workflows.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              variant="orange"
              size="md"
              onClick={() => setActiveTab('ingestion')}
              icon={UploadCloud}
            >
              + Ingest New Syllabus File
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          TEACHER KPI STATS ROW (4 STAT CARDS)
          ===================================================================== */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '2.5rem'
        }}
      >
        <div className="card-white" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Enrolled Students
            </span>
            <Users size={18} style={{ color: 'var(--color-purple)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-ink)' }}>142</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Across 4 active syllabus sections
          </div>
        </div>

        <div className="card-white" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Ingested Sources
            </span>
            <BookOpen size={18} style={{ color: 'var(--color-orange)' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-orange)' }}>
            {documents.length} Files
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            160 vector chunks active in store
          </div>
        </div>

        <div className="card-white" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Critical Gaps
            </span>
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#dc2626' }}>2 Topics</div>
          <div style={{ fontSize: '0.78rem', color: '#b91c1c', marginTop: '0.25rem' }}>
            &gt; 40% student failure rate
          </div>
        </div>

        <div className="card-white" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
              Avg Comprehension
            </span>
            <TrendingUp size={18} style={{ color: '#22c55e' }} />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>88.4%</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            +8.2% after AI gap refreshers
          </div>
        </div>
      </section>

      {/* =====================================================================
          TAB NAVIGATION BAR
          ===================================================================== */}
      <section style={{ marginBottom: '2rem' }}>
        <SegmentedControl
          options={tabOptions}
          value={activeTab}
          onChange={(tab) => {
            playSound('click');
            setActiveTab(tab);
          }}
        />
      </section>

      {/* =====================================================================
          TAB 1: DIAGNOSTIC ANALYTICS & MISCONCEPTIONS
          ===================================================================== */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {/* Concept Mastery Across Class */}
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 className="text-h2" style={{ fontSize: '1.35rem' }}>
                Concept Mastery Across Modules
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                Diagnostic Accuracy: 96%
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.25rem'
              }}
            >
              {MOCK_CONCEPT_MASTERY.map((item, i) => (
                <div
                  key={i}
                  className="card-white"
                  style={{
                    padding: '1.25rem',
                    borderLeft: `4px solid ${
                      item.status === 'critical'
                        ? '#ef4444'
                        : item.status === 'warning'
                        ? '#f59e0b'
                        : '#22c55e'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                      {item.module}
                    </span>
                    <span
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        color:
                          item.status === 'critical'
                            ? '#dc2626'
                            : item.status === 'warning'
                            ? '#d97706'
                            : '#16a34a'
                      }}
                    >
                      {item.masteryPct}%
                    </span>
                  </div>
                  <ProgressBar
                    current={item.masteryPct}
                    total={100}
                    color={item.status === 'critical' ? 'orange' : item.status === 'warning' ? 'yellow' : 'purple'}
                    height={6}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span>Status: {item.status.toUpperCase()}</span>
                    <span>{item.studentCount} Students</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Misconceptions Table (>40% Alert Highlights) */}
          <section>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 className="text-h2" style={{ fontSize: '1.35rem' }}>
                Class Misconceptions Table
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>
                Rows with &gt;40% fail rate are highlighted along with detected root-cause prerequisite gaps.
              </p>
            </div>

            {loading ? (
              <div className="card-white" style={{ padding: '1rem' }}>
                <LoadingState
                  variant="skeleton-table"
                  rows={4}
                  message="Analyzing student attempt logs and detecting prerequisite misconceptions..."
                />
              </div>
            ) : error ? (
              <ErrorState
                title="Diagnostics Retrieval Error"
                message={error}
                onRetry={loadData}
                retryLabel="Retry Loading Diagnostics"
              />
            ) : sortedMisconceptions.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                badge="High Mastery"
                badgeColor="green"
                title="No Class Misconceptions Detected"
                description="All syllabus modules currently maintain healthy student mastery scores, or no student practice sessions have been logged yet."
                actionText="Ingest Course Document"
                onAction={() => setActiveTab('ingestion')}
              />
            ) : (
              <div className="card-white" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      textAlign: 'left',
                      fontSize: '0.88rem'
                    }}
                  >
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-offwhite)', borderBottom: '1px solid var(--color-border)' }}>
                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Syllabus Topic</th>
                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Incorrect Rate</th>
                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Total Attempts</th>
                        <th style={{ padding: '1rem 1.5rem', fontWeight: 700, color: 'var(--color-ink)' }}>Most Common Prerequisite Gap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedMisconceptions.map((item) => {
                        const isHighAlert = item.incorrect_rate > 0.4;

                        return (
                          <tr
                            key={item.chunk_id}
                            style={{
                              borderBottom: '1px solid var(--color-border)',
                              backgroundColor: isHighAlert ? 'var(--color-red-light)' : 'transparent',
                              transition: 'background var(--transition-fast)'
                            }}
                          >
                            <td style={{ padding: '1.1rem 1.5rem', fontWeight: 600, color: 'var(--color-ink)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {isHighAlert && <AlertTriangle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />}
                                <span>{item.section_label}</span>
                              </div>
                            </td>

                            <td style={{ padding: '1.1rem 1.5rem' }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: isHighAlert ? '#dc2626' : 'var(--color-ink)',
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: isHighAlert ? 'rgba(239, 68, 68, 0.15)' : 'var(--color-offwhite)'
                                }}
                              >
                                {(item.incorrect_rate * 100).toFixed(1)}%
                              </span>
                            </td>

                            <td style={{ padding: '1.1rem 1.5rem', color: 'var(--color-text-secondary)' }}>
                              {item.total_attempts} student checks
                            </td>

                            <td style={{ padding: '1.1rem 1.5rem' }}>
                              {item.most_common_gap ? (
                                <Pill color="orange" size="sm">
                                  {item.most_common_gap.section_label}
                                </Pill>
                              ) : (
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                  No prerequisite gap detected
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* AI Recommended Interventions */}
          <section>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 className="text-h2" style={{ fontSize: '1.35rem' }}>
                AI Recommended Class Remediation
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {MOCK_INTERVENTIONS.map((int) => (
                <div
                  key={int.id}
                  className="card-white"
                  style={{
                    padding: '1.5rem',
                    borderLeft: `4px solid ${int.priority === 'Urgent' ? 'var(--color-orange)' : 'var(--color-purple)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <Pill color={int.priority === 'Urgent' ? 'orange' : 'purple'} size="sm">
                        {int.priority} Priority
                      </Pill>
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                        {int.targetStudents} Affected Students
                      </span>
                    </div>

                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--color-ink)' }}>
                      {int.topic}
                    </h4>

                    <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      {int.recommendation}
                    </p>
                  </div>

                  <div style={{ marginTop: '1.25rem' }}>
                    <Button
                      variant={int.priority === 'Urgent' ? 'orange' : 'outline'}
                      size="sm"
                      onClick={() => {
                        playSound('correct');
                        setToastMessage(`Dispatched targeted remediation for "${int.topic}" across ${int.targetStudents} students.`);
                      }}
                      icon={Sparkles}
                    >
                      Deploy Automated Remediation
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 2: SYLLABUS INGESTION & UPLOADS
          ===================================================================== */}
      {activeTab === 'ingestion' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {/* Upload Form */}
          <div className="card-white" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-orange-subtle)',
                  color: 'var(--color-orange)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <UploadCloud size={20} />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                Upload Syllabus Document
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              Upload official textbooks, lecture notes, or slides. Documents are vectorized into 500-token chunks for grounded zero-hallucination student retrieval.
            </p>

            {uploadSuccess && (
              <div
                style={{
                  padding: '1rem',
                  backgroundColor: 'var(--color-green-light)',
                  border: '1.5px solid #86efac',
                  borderRadius: 'var(--radius-md)',
                  color: '#15803d',
                  fontSize: '0.88rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <CheckCircle2 size={18} />
                <span>Document successfully ingested and indexed into knowledge base!</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Document Name / Title
                </label>
                <input
                  type="text"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  placeholder="e.g. Graph_Algorithms_CLRS_Notes.pdf"
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-border)',
                    outline: 'none',
                    fontSize: '0.9rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Subject Area
                  </label>
                  <select
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--color-border)',
                      outline: 'none',
                      fontSize: '0.9rem',
                      backgroundColor: 'var(--color-white)'
                    }}
                  >
                    <option>Computer Science</option>
                    <option>Mathematics</option>
                    <option>Physics</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                    Chapter / Unit
                  </label>
                  <input
                    type="text"
                    value={uploadChapter}
                    onChange={(e) => setUploadChapter(e.target.value)}
                    placeholder="e.g. Shortest Paths & Dijkstra"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid var(--color-border)',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  border: '2px dashed var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem 1.5rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--color-offwhite)',
                  marginTop: '0.5rem'
                }}
              >
                <UploadCloud size={32} style={{ color: 'var(--color-orange)', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                  Drag & Drop PDF or PPTX syllabus file
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                  Max 20MB per document • Auto-chunking & cosine indexation
                </div>
              </div>

              <Button
                type="submit"
                variant="orange"
                size="md"
                disabled={isUploading}
                style={{ marginTop: '0.5rem' }}
              >
                {isUploading ? 'Chunking & Vectorizing Document...' : 'Ingest into Knowledge Base'}
              </Button>
            </form>
          </div>

          {/* Active Knowledge Store Documents */}
          <div className="card-white" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1.25rem' }}>
              Active Grounded Documents ({documents.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {documents.length === 0 ? (
                <EmptyState
                  icon={UploadCloud}
                  badge="Empty Knowledge Store"
                  badgeColor="yellow"
                  title="No Ingested Documents Yet"
                  description="Use the upload form above to ingest and vectorize your first course syllabus material."
                />
              ) : (
                documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-offwhite)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--color-white)',
                        color: 'var(--color-orange)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                        {doc.filename}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                        {doc.subject} • {doc.chapter} • {doc.totalChunks} Chunks
                      </div>
                    </div>
                  </div>

                  <Pill color="green" size="sm">
                    Verified
                  </Pill>
                </div>
              )))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: STUDENT COHORT & REMEDIATION
          ===================================================================== */}
      {activeTab === 'cohort' && (
        <div className="card-white" style={{ padding: '2rem' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              gap: '1rem'
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                Student Cohort Diagnostic Roster
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Target individual students with tailored prerequisite refreshers.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ width: '220px' }}>
                <div className="search-pill-container">
                  <input
                    type="text"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    placeholder="Search student or gap..."
                    className="search-pill-input"
                    style={{ padding: '0.45rem 2.5rem 0.45rem 1rem', fontSize: '0.8rem' }}
                  />
                  <div className="search-pill-btn" style={{ width: '28px', height: '28px', right: '4px' }}>
                    <Search size={14} />
                  </div>
                </div>
              </div>

              <SegmentedControl
                options={['All', 'High', 'Medium', 'Low']}
                value={cohortFilter}
                onChange={setCohortFilter}
                size="sm"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredStudents.length === 0 ? (
              <NoResultsState
                query={studentSearch}
                filter={cohortFilter}
                onReset={() => {
                  setCohortFilter('All');
                  setStudentSearch('');
                }}
                resetLabel="Reset Cohort Filters"
              />
            ) : (
              filteredStudents.map((st, sIdx) => (
              <div
                key={sIdx}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: st.riskLevel === 'High' ? 'var(--color-red-light)' : 'var(--color-offwhite)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                      {st.studentName}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                      {st.email}
                    </span>
                    <Pill color={st.riskLevel === 'High' ? 'red' : 'yellow'} size="sm">
                      {st.riskLevel} Risk
                    </Pill>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                    Failing prerequisite concepts:{' '}
                    <strong style={{ color: 'var(--color-ink)' }}>{st.failingConcepts.join(', ')}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem' }}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      playSound('click');
                      setHistoryStudent(st);
                    }}
                  >
                    View History
                  </Button>
                  <Button
                    size="sm"
                    variant="orange"
                    onClick={() => {
                      playSound('click');
                      setRefresherStudent(st);
                      if (st.failingConcepts.length > 0) {
                        setSelectedRefresherTopic(st.failingConcepts[0]);
                      }
                    }}
                  >
                    Assign Refresher
                  </Button>
                </div>
              </div>
            )))}
          </div>
        </div>
      )}

      {/* =====================================================================
          VIEW HISTORY MODAL
          ===================================================================== */}
      {historyStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(21, 19, 19, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem'
          }}
        >
          <div
            className="card-white"
            style={{
              width: '100%',
              maxWidth: '620px',
              padding: '2rem',
              borderRadius: 'var(--radius-xl)',
              maxHeight: '85vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <Pill color={historyStudent.riskLevel === 'High' ? 'red' : 'yellow'} size="sm" style={{ marginBottom: '0.4rem' }}>
                  {historyStudent.riskLevel} Risk Profile
                </Pill>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                  {historyStudent.studentName} — Doubt & Practice Record
                </h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                  {historyStudent.email} • Last active: {historyStudent.lastActive}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryStudent(null)}
                className="btn-icon btn-ghost"
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--color-offwhite)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
                  Identified Prerequisite Gaps:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.4rem' }}>
                  {historyStudent.failingConcepts.map((c, cIdx) => (
                    <Pill key={cIdx} color="orange" size="sm">
                      ⚠️ {c}
                    </Pill>
                  ))}
                </div>
              </div>

              <div style={{ padding: '1rem', backgroundColor: 'var(--color-offwhite)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.4rem' }}>
                  Recent Tutor Practice Checks:
                </div>
                <ul style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', paddingLeft: '1.25rem', lineHeight: 1.6 }}>
                  <li>Q: "Binary Search Tree worst-case height" — <strong style={{ color: '#dc2626' }}>Marked Incorrect</strong></li>
                  <li>Q: "Recursive Stack Frame allocation" — <strong style={{ color: '#dc2626' }}>Marked Incorrect</strong></li>
                  <li>Q: "Asymptotic Big-O comparisons" — <strong style={{ color: '#16a34a' }}>Marked Correct (+10 XP)</strong></li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <Button variant="outline" size="md" onClick={() => setHistoryStudent(null)}>
                Close
              </Button>
              <Button
                variant="orange"
                size="md"
                onClick={() => {
                  const target = historyStudent;
                  setHistoryStudent(null);
                  setRefresherStudent(target);
                }}
              >
                Assign Refresher Module
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ASSIGN REFRESHER MODAL
          ===================================================================== */}
      {refresherStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(21, 19, 19, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1.5rem'
          }}
        >
          <div
            className="card-white"
            style={{
              width: '100%',
              maxWidth: '540px',
              padding: '2rem',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <Pill color="orange" size="sm" style={{ marginBottom: '0.4rem' }}>
                  Targeted Remediation
                </Pill>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                  Assign Refresher to {refresherStudent.studentName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRefresherStudent(null)}
                className="btn-icon btn-ghost"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmRefresher} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Select Prerequisite Remediation Module
                </label>
                <select
                  value={selectedRefresherTopic}
                  onChange={(e) => setSelectedRefresherTopic(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-border)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    backgroundColor: 'var(--color-white)'
                  }}
                >
                  <option value="Recursion Call Stack">Recursion & Call Stack Memory Frames (15 mins)</option>
                  <option value="BST Tree Rotations">BST Worst-Case Degeneracy & AVL Rotations (20 mins)</option>
                  <option value="Base Pointer Offsets">Memory Offset & Pointer Arithmetic (10 mins)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Instructor Note for Student (Optional)
                </label>
                <textarea
                  value={assignmentNote}
                  onChange={(e) => setAssignmentNote(e.target.value)}
                  placeholder="e.g., Please complete this 3-step Socratic walkthrough before Friday's quiz."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-border)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <Button variant="outline" size="md" type="button" onClick={() => setRefresherStudent(null)}>
                  Cancel
                </Button>
                <Button variant="orange" size="md" type="submit" icon={Send}>
                  Dispatch Refresher to Student
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
