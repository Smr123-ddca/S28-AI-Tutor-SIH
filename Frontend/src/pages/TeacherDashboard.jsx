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
  Search
} from 'lucide-react';
import { Pill } from '../components/common/Pill';
import { ProgressBar } from '../components/common/AvatarStack';
import { Button } from '../components/common/Button';
import { SegmentedControl } from '../components/common/SegmentedControl';
import {
  MOCK_CONCEPT_MASTERY,
  MOCK_STUDENT_GAPS,
  MOCK_INTERVENTIONS
} from '../services/mockData';
import { fetchMisconceptions, fetchLibraryDocuments, uploadCourseDoc } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function TeacherDashboard() {
  const { session, displayName } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'ingestion' | 'cohort'
  const [misconceptions, setMisconceptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ingestion upload state
  const [documents, setDocuments] = useState([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadSubject, setUploadSubject] = useState('Computer Science');
  const [uploadChapter, setUploadChapter] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // Student filter state
  const [cohortFilter, setCohortFilter] = useState('All');
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [misconceptionsData, docsData] = await Promise.all([
          fetchMisconceptions(session?.access_token),
          fetchLibraryDocuments(session?.access_token)
        ]);
        setMisconceptions(misconceptionsData.misconceptions || []);
        setDocuments(docsData.documents || []);
      } catch (err) {
        console.error('Error loading teacher dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [session?.access_token]);

  const sortedMisconceptions = [...misconceptions].sort(
    (a, b) => b.incorrect_rate - a.incorrect_rate
  );

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFileName.trim() || !uploadFile) {
      alert('Please provide a document name and file.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', uploadFile);
      formData.append('courseName', uploadFileName); // used by UI / backend to name course cleanly
      formData.append('subject', uploadSubject);
      formData.append('chapter', uploadChapter);

      await uploadCourseDoc(formData, session?.access_token);

      setUploadSuccess(true);
      setUploadFileName('');
      setUploadChapter('');
      setUploadFile(null);
      setTimeout(() => setUploadSuccess(false), 4000);

      const docsData = await fetchLibraryDocuments(session?.access_token);
      setDocuments(docsData.documents || []);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
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
              + Upload Syllabus Material
            </Button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          TEACHER KPI STATS ROW
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
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-ink)' }}>48</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Across 3 active class sections
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
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>74.5%</div>
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
          onChange={setActiveTab}
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
                    borderLeft: `4px solid ${item.status === 'critical'
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

                          <td style={{ padding: '1.1rem 1.5rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                            {item.total_attempts} checks
                          </td>

                          <td style={{ padding: '1.1rem 1.5rem' }}>
                            {item.most_common_gap ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ fontWeight: 600, color: isHighAlert ? '#991b1b' : 'var(--color-ink)' }}>
                                  {item.most_common_gap.section_label}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    color: isHighAlert ? '#dc2626' : 'var(--color-text-muted)',
                                    fontWeight: 700
                                  }}
                                >
                                  ({item.most_common_gap.frequency} students)
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: 'var(--color-text-muted)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Recommended AI Interventions */}
          <section>
            <div style={{ marginBottom: '1.25rem' }}>
              <h2 className="text-h2" style={{ fontSize: '1.35rem' }}>
                Recommended AI Remediation Plans
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem'
              }}
            >
              {MOCK_INTERVENTIONS.map((inter) => (
                <div
                  key={inter.id}
                  className="card-white"
                  style={{
                    padding: '1.5rem',
                    borderLeft: `4px solid ${inter.priority === 'Urgent' ? '#ef4444' : 'var(--color-purple)'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                      {inter.topic}
                    </h3>
                    <Pill color={inter.priority === 'Urgent' ? 'red' : 'purple'} size="sm">
                      {inter.priority}
                    </Pill>
                  </div>
                  <p style={{ fontSize: '0.86rem', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                    {inter.recommendation}
                  </p>
                  <Button
                    size="sm"
                    variant="ink"
                    onClick={() => alert(`Remediation Plan launched for ${inter.targetStudents} students.`)}
                  >
                    Deploy Automated Refresher ({inter.targetStudents} students)
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* =====================================================================
          TAB 2: SYLLABUS INGESTION & DOCUMENT UPLOADS
          ===================================================================== */}
      {activeTab === 'ingestion' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {/* Upload Form */}
          <div className="card-white" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Pill color="orange" size="sm" icon={UploadCloud}>
                Ingest New Material
              </Pill>
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.35rem' }}>
              Add Approved Course Documents
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
              PDF and PPTX files are automatically chunked, vectorized, and linked to the AI Tutor's grounding knowledge store.
            </p>

            {uploadSuccess && (
              <div
                style={{
                  backgroundColor: 'var(--color-green-light)',
                  color: '#15803d',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <CheckCircle2 size={18} /> Document successfully vectorized and added to curriculum library!
              </div>
            )}

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
                  Document Name / Title
                </label>
                <input
                  type="text"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  placeholder="e.g. Graph_Algorithms_Advanced.pdf"
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
                    Subject
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
                  marginTop: '0.5rem',
                  position: 'relative'
                }}
              >
                <input
                  type="file"
                  accept=".pdf,.pptx"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setUploadFile(f);
                      if (!uploadFileName) {
                        setUploadFileName(f.name.replace(/\.[^/.]+$/, ""));
                      }
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, width: '100%', height: '100%',
                    opacity: 0, cursor: 'pointer'
                  }}
                />
                <UploadCloud size={32} style={{ color: 'var(--color-orange)', marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                  {uploadFile ? uploadFile.name : 'Drag & Drop PDF or PPTX syllabus file'}
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
              {documents.map((doc) => (
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
              ))}
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
            {filteredStudents.map((st, sIdx) => (
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
                    onClick={() => alert(`Viewing full doubt history for ${st.studentName}`)}
                  >
                    View History
                  </Button>
                  <Button
                    size="sm"
                    variant="orange"
                    onClick={() => alert(`Assigned custom prerequisite refresher module to ${st.studentName}`)}
                  >
                    Assign Refresher
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
