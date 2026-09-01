import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  Plus,
  Edit2,
  Sparkles
} from 'lucide-react';
import { AvatarTutor } from '../components/tutor/AvatarTutor';
import { MessageBubble } from '../components/tutor/MessageBubble';
import { ModeSelector } from '../components/tutor/ModeSelector';
import { HintSystem } from '../components/tutor/HintSystem';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import {
  explainQuestion,
  fetchSessions,
  fetchSessionMessages,
  updateSessionTitle,
  fetchLibraryDocuments,
  deleteSession
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSoundManager } from '../services/soundManager';

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { playSound } = useSoundManager();

  // State Management
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState('ask_doubt'); // 'ask_doubt' | 'practice_test' | 'study_plan'
  const [tutorState, setTutorState] = useState('idle'); // 'idle' | 'listening' | 'thinking' | 'speaking'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [currentTopic, setCurrentTopic] = useState('Welcome to Learnify');
  const [currentSubject, setCurrentSubject] = useState(searchParams.get('subject') || null);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    async function loadSubjects() {
      try {
        const docsData = await fetchLibraryDocuments(session?.access_token);
        // Ensure students can only talk to published subjects
        const publishedDocs = (docsData.documents || []).filter(d => d.status === 'published');
        const availableSubjects = publishedDocs.map(d => d.subject);
        const uniqueSubjects = [...new Set(availableSubjects)].filter(Boolean);
        setSubjects(uniqueSubjects);
        if (!currentSubject && uniqueSubjects.length > 0) {
          setCurrentSubject(uniqueSubjects[0]);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
      }
    }
    loadSubjects();
  }, [session?.access_token]);

  const messagesEndRef = useRef(null);

  // Initialize unique student ID
  useEffect(() => {
    let sid = localStorage.getItem('ai_tutor_student_id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('ai_tutor_student_id', sid);
    }
    setStudentId(sid);
  }, []);

  // Fetch Session History on Mount
  useEffect(() => {
    async function loadSessions() {
      try {
        const data = await fetchSessions(session?.access_token);
        setSessions(data.sessions || []);
      } catch (err) {
        console.error('Error fetching sessions:', err);
      }
    }
    loadSessions();
  }, [session?.access_token]);

  // Handle URL deep links (?session_id=... or ?q=...)
  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id');
    const queryParam = searchParams.get('q');
    const subjectParam = searchParams.get('subject') || searchParams.get('course'); // maintain legacy link compatibility

    if (subjectParam && !currentSubject) {
      setCurrentSubject(subjectParam);
    }

    if (sessionIdParam) {
      handleSelectSession(sessionIdParam);
    } else if (queryParam) {
      setInputQuery(queryParam);
    }
  }, [searchParams]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSelectSession = async (sid) => {
    playSound('click');
    setCurrentSessionId(sid);

    // Update currentSubject based on the selected session
    const selected = sessions.find(s => s.id === sid);
    if (selected && selected.course) {
      setCurrentSubject(selected.course);
    }

    setLoading(true);
    setTutorState('thinking');
    try {
      const data = await fetchSessionMessages(sid, session?.access_token);
      const formatted = (data.messages || []).map((m) => {
        if (m.role === 'user') return { role: 'user', text: m.content };
        return { role: 'bot', ...(m.response_json || { status: 'answered', message: m.content }) };
      });
      setMessages(formatted);
      setTutorState('idle');
    } catch (e) {
      console.error('Error fetching session messages:', e);
      setTutorState('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    playSound('click');
    setCurrentSessionId(null);
    setMessages([]);
    setTutorState('idle');
    setIsSpeaking(false);
  };

  const handleRenameTitle = async (sid, oldTitle) => {
    const newTitle = prompt('Enter new session title:', oldTitle);
    if (!newTitle || newTitle === oldTitle) return;
    await updateSessionTitle(sid, newTitle, session?.access_token);
    const data = await fetchSessions(session?.access_token);
    setSessions(data.sessions || []);
  };

  const handleContextMenu = async (e, sid) => {
    e.preventDefault();
    if (window.confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteSession(sid, session?.access_token);
        if (currentSessionId === sid) {
          handleNewChat();
        }
        const data = await fetchSessions(session?.access_token);
        setSessions(data.sessions || []);
      } catch (err) {
        console.error('Error deleting session:', err);
      }
    }
  };

  const handleSend = async (customText) => {
    const textToSend = customText || inputQuery;
    if (!textToSend.trim() || loading) return;

    playSound('messageSent');
    const userMsg = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);
    setTutorState('thinking');

    try {
      const data = await explainQuestion({
        question: textToSend,
        student_id: studentId,
        session_id: currentSessionId,
        token: session?.access_token,
        subject: currentSubject
      });

      // Response arrived: switch to speaking state with speech simulation
      playSound('responseReady');
      setTutorState('speaking');
      setIsSpeaking(true);

      if (data.results && data.results.length > 0 && data.results[0].topic) {
        setCurrentTopic(data.results[0].topic);
      }

      setMessages((prev) => [...prev, { role: 'bot', ...data }]);

      if (data.session_id && data.session_id !== currentSessionId) {
        setCurrentSessionId(data.session_id);
        const refetched = await fetchSessions(session?.access_token);
        setSessions(refetched.sessions || []);
      }

      // Simulate tutor vocalization / presence window
      setTimeout(() => {
        setIsSpeaking(false);
        setTutorState('idle');
      }, 4000);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          status: 'error',
          message: err.message || 'Could not connect to Learnify backend. Please check connection.'
        }
      ]);
      setTutorState('idle');
      setIsSpeaking(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="smooth-scroll"
      style={{
        display: 'flex',
        flex: 1,
        height: '100%',
        minHeight: 0,
        backgroundColor: 'var(--color-offwhite)',
        overflow: 'hidden'
      }}
    >
      {/* =====================================================================
          LEFT COLUMN: HISTORY SIDEBAR (Collapsible on Mobile)
          ===================================================================== */}
      <aside
        style={{
          width: '280px',
          height: '100%',
          backgroundColor: 'var(--color-white)',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0
        }}
      >
        {/* New Chat Button */}
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
          <Button
            variant="orange"
            size="md"
            onClick={handleNewChat}
            icon={Plus}
            style={{ width: '100%' }}
          >
            New Tutor Session
          </Button>
        </div>

        {/* Sessions List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.85rem' }}>
          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--color-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.65rem',
              paddingLeft: '0.5rem'
            }}
          >
            Recent History
          </div>

          {sessions.map((s) => {
            const isCurrent = currentSessionId === s.id;
            return (
              <div
                key={s.id}
                onContextMenu={(e) => handleContextMenu(e, s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '0.25rem',
                  cursor: 'pointer',
                  backgroundColor: isCurrent ? 'var(--color-orange-subtle)' : 'transparent',
                  border: isCurrent ? '1px solid #fed7aa' : '1px solid transparent',
                  transition: 'background var(--transition-fast)'
                }}
              >
                <div
                  onClick={() => handleSelectSession(s.id)}
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: '0.85rem',
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? 'var(--color-orange)' : 'var(--color-ink)'
                  }}
                >
                  {s.title || 'Untitled Session'}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRenameTitle(s.id, s.title);
                  }}
                  style={{
                    opacity: isCurrent ? 1 : 0.3,
                    color: 'var(--color-text-muted)',
                    padding: '0.2rem'
                  }}
                  title="Rename"
                >
                  <Edit2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      {/* =====================================================================
          MAIN TUTOR WORKSPACE (Chat Content)
          ===================================================================== */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden'
        }}
      >

        {/* PANE 2: INTERACTION PANE (3 MODES + MESSAGES + INPUT) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            minHeight: 0,
            backgroundColor: 'var(--color-white)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Top Mode Selector Bar */}
          <div style={{ padding: '1.25rem 2rem 0.75rem', borderBottom: '1px solid var(--color-border)' }}>
            <ModeSelector
              activeMode={activeMode}
              onSelectMode={(mode) => {
                playSound('click');
                setActiveMode(mode);
              }}
              hidePracticeTest={messages.length === 0}
            />
          </div>

          {/* Mode Viewport */}
          <div
            className="smooth-scroll"
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              padding: '1.5rem 2rem',
              scrollBehavior: 'smooth'
            }}
          >
            {/* MODE 2: PRACTICE TEST (Socratic Progressive Hints) */}
            {activeMode === 'practice_test' && (
              <HintSystem onComplete={() => setActiveMode('ask_doubt')} sessionId={currentSessionId} />
            )}


            {/* MODE 1: ASK A DOUBT (Main Chat & Q&A) */}
            {activeMode === 'ask_doubt' && (
              <>
                {messages.length === 0 && !loading && (
                  <div
                    style={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      color: 'var(--color-text-muted)',
                      padding: '2rem'
                    }}
                  >
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '20px',
                        backgroundColor: 'var(--color-orange-subtle)',
                        color: 'var(--color-orange)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem'
                      }}
                    >
                      <Sparkles size={32} />
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.4rem' }}>
                      What do you want to learn today?
                    </h3>
                    <p style={{ fontSize: '0.9rem', maxWidth: '420px' }}>
                      Ask any question from your curriculum. The tutor provides syllabus-grounded explanations, source citations, and practice checks.
                    </p>

                    <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-ink)' }}>Query Subject Context:</label>
                      <select
                        value={currentSubject || ''}
                        onChange={(e) => setCurrentSubject(e.target.value)}
                        style={{
                          padding: '0.5rem 1rem',
                          borderRadius: 'var(--radius-sm)',
                          border: '1.5px solid var(--color-border)',
                          backgroundColor: 'var(--color-white)',
                          outline: 'none',
                          fontSize: '0.9rem',
                          fontWeight: 500,
                          cursor: 'pointer'
                        }}
                      >
                        {subjects.length === 0 && <option value="">Loading subjects...</option>}
                        {subjects.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                  </div>
                )}

                {messages.map((msg, idx) => (
                  <MessageBubble
                    key={idx}
                    message={msg}
                    msgIndex={idx}
                    studentId={studentId}
                    onAcceptWalkthrough={() => handleSend('Yes, please walk me through the concept step by step.')}
                    onSelectOption={(option) => handleSend(option)}
                  />
                ))}

                {loading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 0' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-purple-light)',
                        color: 'var(--color-purple)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Sparkles size={16} className="animate-float" />
                    </div>
                    <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                      Tutor is retrieving syllabus material and grounding explanation...
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Bottom Chat Input Bar */}
          {activeMode === 'ask_doubt' && (
            <div
              style={{
                padding: '1.25rem 2rem',
                borderTop: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-white)'
              }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  position: 'relative'
                }}
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => {
                    setInputQuery(e.target.value);
                    if (tutorState === 'idle') setTutorState('listening');
                  }}
                  onBlur={() => {
                    if (tutorState === 'listening') setTutorState('idle');
                  }}
                  placeholder="Ask a doubt (e.g., 'Why does BST worst-case become O(n)?')..."
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '0.9rem 3.5rem 0.9rem 1.4rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1.5px solid var(--color-border)',
                    outline: 'none',
                    fontSize: '0.95rem',
                    backgroundColor: 'var(--color-offwhite)',
                    transition: 'border-color var(--transition-fast)'
                  }}
                />
                <button
                  type="submit"
                  disabled={loading || !inputQuery.trim() || !currentSubject}
                  className="btn-orange btn-icon"
                  style={{
                    position: 'absolute',
                    right: '6px',
                    width: '40px',
                    height: '40px',
                    opacity: loading || !inputQuery.trim() || !currentSubject ? 0.4 : 1,
                    cursor: loading || !inputQuery.trim() || !currentSubject ? 'not-allowed' : 'pointer'
                  }}
                  title={!currentSubject ? "Please select a subject context in the new session screen." : "Send Doubt"}
                  aria-label="Send Doubt"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
