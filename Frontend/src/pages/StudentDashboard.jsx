import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, MessageSquare, Plus, Clock, Search, BookOpen, ChevronRight } from 'lucide-react';
import { Button } from '../components/common/Button';
import { fetchSessions, fetchLibraryDocuments } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, displayName } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('q') || '';

  const [sessions, setSessions] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [questionText, setQuestionText] = useState('');

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [sessionData, docsData] = await Promise.all([
          fetchSessions(session?.access_token),
          fetchLibraryDocuments(session?.access_token)
        ]);
        setSessions(sessionData.sessions || []);

        const availableSubjects = (docsData.documents || []).map(d => d.subject);
        // unique subjects
        const uniqueSubjects = [...new Set(availableSubjects)];
        setSubjects(uniqueSubjects.filter(Boolean));
        if (uniqueSubjects.length > 0) setSelectedSubject(uniqueSubjects[0]);
      } catch (err) {
        console.error('Error loading student dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [session?.access_token]);

  const handleAskDoubt = (e) => {
    e.preventDefault();
    if (!questionText.trim() || !selectedSubject) return;

    // Redirect to RAG chat with the query and subject parameters securely attached
    navigate(`/chat?subject=${encodeURIComponent(selectedSubject)}&q=${encodeURIComponent(questionText)}`);
  };

  const totalQuestionsOffered = sessions.length; // Basic estimation from session length

  return (
    <div className="page-container" style={{ paddingBottom: '3.5rem' }}>

      {/* 1. REAL STATISTIC CARDS ROW */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem'
      }}>
        <div className="card-white" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-orange)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Active Subjects</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-ink)', marginTop: '0.2rem' }}>{loading ? '--' : subjects.length}</div>
        </div>
        <div className="card-white" style={{ padding: '1.5rem', borderLeft: '4px solid var(--color-purple)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>RAG Chat Sessions</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-ink)', marginTop: '0.2rem' }}>{loading ? '--' : sessions.length}</div>
        </div>
        <div className="card-white" style={{ padding: '1.5rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Library Artifacts</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-ink)', marginTop: '0.2rem' }}>{loading ? '--' : 'Syncing...'}</div>
        </div>
      </section>

      {/* 2. TWO-COLUMN LAYOUT: HISTORY | ASK A DOUBT */}
      <section style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
        gap: '2rem'
      }}>

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
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--color-orange)'}
                    onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
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
                )
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: ASK A DOUBT */}
        <div className="card-white" style={{
          padding: '2rem', height: '100%',
          background: 'linear-gradient(145deg, #ffffff, #fdfbf7)', border: '1px solid #ffd0a8'
        }}>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Ask a Doubt <Sparkles size={20} className="color-orange" />
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginBottom: '2rem' }}>
            Select a published Learnify course. Our RAG-engine will provide grounded answers exclusively from your uploaded syllabus material.
          </p>

          <form onSubmit={handleAskDoubt} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Subject Selector */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Subject Area</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none' }}
                required
              >
                {subjects.length === 0 ? <option value="">No published subjects available</option> : null}
                {subjects.map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>

            {/* Question Textarea */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>Your Question</label>
              <textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                style={{ width: '100%', padding: '1rem', height: '120px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
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

      {/* 3. EXPLORE MODULES */}
      <section style={{ marginTop: '3.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Explore Authorized Modules</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {loading ? <div style={{ fontSize: '0.85rem' }}>Loading Modules...</div> : subjects.length === 0 ? <p style={{ fontSize: '0.85rem' }}>No modules available.</p> : null}
          {subjects.map(c => (
            <div
              key={c}
              onClick={() => navigate(`/library`)}
              style={{ padding: '1.5rem', background: 'var(--color-white)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', minWidth: '220px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'transform 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <BookOpen size={24} className="color-orange" />
              <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{c}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>View Resources <ChevronRight size={14} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. TEAM / FOOTER AREA */}
      <footer style={{ marginTop: '5rem', paddingTop: '2.5rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
        <div>
          <h4 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Learnify</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', maxWidth: '300px', lineHeight: 1.5 }}>
            Powered by RAG Retrieval.<br />Engineered for SIH S28 to deliver precision, bounded syllabus tracking, and socratic conceptual maps.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '3rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase' }}>Navigation</h5>
            <a href="/dashboard" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Home</a>
            <a href="/chat" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Active Session</a>
            <a href="/library" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Library</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase' }}>Support</h5>
            <a href="#" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Architecture Docs</a>
            <a href="#" style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', textDecoration: 'none' }}>Team Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
