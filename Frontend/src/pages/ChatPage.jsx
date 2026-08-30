import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  Plus,
  Edit2,
  Sparkles,
  BookOpen,
  ShieldCheck,
  Lightbulb,
  Clock,
  ArrowRight
} from 'lucide-react';
import { MessageBubble } from '../components/tutor/MessageBubble';
import { ModeSelector } from '../components/tutor/ModeSelector';
import { HintSystem } from '../components/tutor/HintSystem';
import { Button } from '../components/common/Button';
import { Pill } from '../components/common/Pill';
import {
  explainQuestion,
  fetchSessions,
  fetchSessionMessages,
  updateSessionTitle
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSoundManager } from '../services/soundManager';

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { playSound } = useSoundManager();

  // State Management
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState('ask_doubt'); // 'ask_doubt' | 'practice_test' | 'study_plan'
  const [studentId, setStudentId] = useState('');
  const [currentTopic, setCurrentTopic] = useState('Data Structures: Binary Search Trees & Recursion');

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

  const loadSessions = async () => {
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const data = await fetchSessions(session?.access_token);
      setSessions(data.sessions || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setSessionsError('Could not load session history.');
    } finally {
      setLoadingSessions(false);
    }
  };

  // Fetch Session History on Mount
  useEffect(() => {
    loadSessions();
  }, [session?.access_token]);

  // Handle URL deep links (?session_id=... or ?q=...)
  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id');
    const queryParam = searchParams.get('q');

    if (sessionIdParam) {
      handleSelectSession(sessionIdParam);
    } else if (queryParam) {
      setInputQuery(queryParam);
      handleSend(queryParam);
    }
  }, [searchParams]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSelectSession = async (sid) => {
    playSound('click');
    setCurrentSessionId(sid);
    setLoading(true);
    try {
      const data = await fetchSessionMessages(sid, session?.access_token);
      const formatted = (data.messages || []).map((m) => {
        if (m.role === 'user') return { role: 'user', text: m.content };
        return { role: 'bot', ...(m.response_json || { status: 'answered', message: m.content }) };
      });
      setMessages(formatted);
    } catch (e) {
      console.error('Error fetching session messages:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    playSound('click');
    setCurrentSessionId(null);
    setMessages([]);
  };

  const handleRenameTitle = async (sid, oldTitle) => {
    const newTitle = prompt('Enter new session title:', oldTitle);
    if (!newTitle || newTitle === oldTitle) return;
    await updateSessionTitle(sid, newTitle, session?.access_token);
    const data = await fetchSessions(session?.access_token);
    setSessions(data.sessions || []);
  };

  const handleSend = async (customText) => {
    const textToSend = customText || inputQuery;
    if (!textToSend.trim() || loading) return;

    setLastQuestion(textToSend);
    playSound('messageSent');
    const userMsg = { role: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const data = await explainQuestion({
        question: textToSend,
        student_id: studentId,
        session_id: currentSessionId,
        token: session?.access_token
      });

      playSound('responseReady');

      if (data.results && data.results.length > 0 && data.results[0].topic) {
        setCurrentTopic(data.results[0].topic);
      }

      setMessages((prev) => [...prev, { role: 'bot', ...data }]);

      if (data.session_id && data.session_id !== currentSessionId) {
        setCurrentSessionId(data.session_id);
        const refetched = await fetchSessions(session?.access_token);
        setSessions(refetched.sessions || []);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          status: 'error',
          message: 'Could not connect to AI Tutor backend. Please check connection and try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestedDoubts = [
    'Why does BST search degrade to O(n) in worst case?',
    'Walk me through AVL Tree single and double rotations.',
    'Explain Call Stack memory during recursive unwinding.'
  ];

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
          COLUMN 1: HISTORY SIDEBAR
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
        {/* New Session Button */}
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
              letterSpacing: '0.06em',
              marginBottom: '0.65rem',
              paddingLeft: '0.5rem'
            }}
          >
            Recent Sessions
          </div>

          {loadingSessions ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem' }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-offwhite)',
                    animation: 'pulse-subtle 1.5s ease-in-out infinite'
                  }}
                />
              ))}
            </div>
          ) : sessionsError ? (
            <div style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: '#b91c1c', marginBottom: '0.5rem' }}>
                {sessionsError}
              </div>
              <button
                type="button"
                onClick={loadSessions}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
              >
                Retry
              </button>
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: '1.5rem 0.5rem', fontSize: '0.82rem', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              No past sessions yet.<br />Start asking a syllabus doubt!
            </div>
          ) : (
            sessions.map((s) => {
              const isCurrent = currentSessionId === s.id;
              return (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.65rem 0.75rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '0.35rem',
                    cursor: 'pointer',
                    backgroundColor: isCurrent ? 'var(--color-orange-subtle)' : 'transparent',
                    border: isCurrent ? '1.5px solid #fed7aa' : '1.5px solid transparent',
                    transition: 'all var(--transition-fast)'
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
                      opacity: isCurrent ? 1 : 0.35,
                      color: 'var(--color-text-muted)',
                      padding: '0.2rem',
                      cursor: 'pointer'
                    }}
                    title="Rename"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer Info */}
        <div
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-offwhite)',
            fontSize: '0.72rem',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <ShieldCheck size={14} style={{ color: 'var(--color-green)' }} />
          <span>Curriculum Grounded • Zero Hallucinations</span>
        </div>
      </aside>

      {/* =====================================================================
          COLUMN 2: CONTENT PANE (Context Header + 3 Mode Tabs)
          ===================================================================== */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          backgroundColor: 'var(--color-white)',
          overflow: 'hidden'
        }}
      >
        {/* Topic Context Strip */}
        <div
          style={{
            padding: '0.85rem 2rem',
            backgroundColor: 'var(--color-offwhite)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-orange)', textTransform: 'uppercase' }}>
              Active Module:
            </span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)' }}>
              {currentTopic}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Pill color="sky" size="sm" icon={BookOpen}>
              Approved Textbook Chunks
            </Pill>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Cosine Sim &gt; 0.30
            </span>
          </div>
        </div>

        {/* Three Mode Tabs Selector */}
        <div style={{ padding: '1rem 2rem 0.5rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-white)' }}>
          <ModeSelector
            activeMode={activeMode}
            onSelectMode={(mode) => {
              playSound('click');
              setActiveMode(mode);
            }}
          />
        </div>

        {/* Mode Viewport */}
        <div
          className="smooth-scroll"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '1.75rem 2rem',
            scrollBehavior: 'smooth',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* =====================================================================
              TAB 2: SOCRATIC HINTS
              ===================================================================== */}
          {activeMode === 'practice_test' && (
            <HintSystem onComplete={() => setActiveMode('ask_doubt')} />
          )}

          {/* =====================================================================
              TAB 3: STUDY PLAN / MOCK TEST (ROADMAP)
              ===================================================================== */}
          {activeMode === 'study_plan' && (
            <div
              className="card-white"
              style={{
                padding: '2.25rem',
                borderRadius: 'var(--radius-xl)',
                border: '1.5px solid var(--color-border)',
                backgroundColor: 'var(--color-white)',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <Pill color="yellow" size="sm" style={{ marginBottom: '0.65rem' }}>
                    Personalized Syllabus Diagnostic
                  </Pill>
                  <h3 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--color-ink)', lineHeight: 1.2 }}>
                    Diagnostic Study Plan: {currentTopic}
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                  <Clock size={16} /> Total Est. Time: ~45 Mins
                </div>
              </div>

              <p style={{ fontSize: '0.92rem', color: 'var(--color-text-secondary)', marginBottom: '1.75rem', lineHeight: 1.6 }}>
                LearnifyTutor analyzed your practice self-reports and generated a 3-step targeted roadmap to eliminate prerequisite misconceptions before exams:
              </p>

              {/* Numbered Steps */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem', marginBottom: '2rem' }}>
                {/* Step 1 */}
                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-offwhite)',
                    border: '1.5px solid var(--color-border)',
                    borderLeft: '5px solid var(--color-orange)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-orange)', textTransform: 'uppercase' }}>
                        Step 1
                      </span>
                      <Pill color="orange" size="sm">Prerequisite Gap</Pill>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-ink)' }}>
                      Call Stack Memory & Frame Offsets
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                      Review how local activation records are pushed during recursive BST traversals.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-white)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                    ⏱ 15 mins
                  </span>
                </div>

                {/* Step 2 */}
                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-offwhite)',
                    border: '1.5px solid var(--color-border)',
                    borderLeft: '5px solid var(--color-purple)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-purple)', textTransform: 'uppercase' }}>
                        Step 2
                      </span>
                      <Pill color="purple" size="sm">Socratic Clues</Pill>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-ink)' }}>
                      Interactive Degeneracy & Tree Rotations
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                      Work through 3 guided questions with progressive hints to master worst-case O(n) shapes.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-white)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                    ⏱ 20 mins
                  </span>
                </div>

                {/* Step 3 */}
                <div
                  style={{
                    padding: '1.25rem',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-offwhite)',
                    border: '1.5px solid var(--color-border)',
                    borderLeft: '5px solid var(--color-yellow)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#b45309', textTransform: 'uppercase' }}>
                        Step 3
                      </span>
                      <Pill color="yellow" size="sm">Assessment Check</Pill>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-ink)' }}>
                      Timed Syllabus Diagnostic Check
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
                      5-question syllabus checkpoint that updates your professor's mastery analytics.
                    </div>
                  </div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-white)', padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}>
                    ⏱ 10 mins
                  </span>
                </div>
              </div>

              {/* Action CTA */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Button
                  variant="orange"
                  size="lg"
                  onClick={() => {
                    playSound('click');
                    setActiveMode('practice_test');
                  }}
                  icon={ArrowRight}
                  iconPosition="right"
                >
                  Begin Diagnostic Practice
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleSend(`Can you give me a comprehensive overview of ${currentTopic}?`)}
                >
                  Ask Tutor for Concept Overview
                </Button>
              </div>
            </div>
          )}

          {/* =====================================================================
              TAB 1: ASK A DOUBT (DIRECT Q&A)
              ===================================================================== */}
          {activeMode === 'ask_doubt' && (
            <>
              {/* Empty state welcome card */}
              {messages.length === 0 && !loading && (
                <div
                  style={{
                    flex: 1,
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
                      width: '68px',
                      height: '68px',
                      borderRadius: '22px',
                      backgroundColor: 'var(--color-orange-subtle)',
                      color: 'var(--color-orange)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '1.25rem',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <Sparkles size={34} />
                  </div>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.5rem' }}>
                    What doubt can I help you resolve?
                  </h3>
                  <p style={{ fontSize: '0.92rem', maxWidth: '460px', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                    Ask any question from your curriculum. The tutor retrieves verified textbook citations, provides step-by-step explanations, and gives you practice checks.
                  </p>

                  {/* Suggested Doubt Chips */}
                  <div style={{ width: '100%', maxWidth: '600px' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-orange)', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
                      Suggested Doubts for Current Module:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {suggestedDoubts.map((doubt, dIdx) => (
                        <button
                          key={dIdx}
                          type="button"
                          onClick={() => handleSend(doubt)}
                          style={{
                            textAlign: 'left',
                            fontSize: '0.88rem',
                            padding: '0.75rem 1.1rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--color-offwhite)',
                            border: '1.5px solid var(--color-border)',
                            color: 'var(--color-ink)',
                            fontWeight: 500,
                            lineHeight: 1.4,
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem'
                          }}
                        >
                          <Lightbulb size={16} style={{ color: 'var(--color-orange)', flexShrink: 0 }} />
                          <span>{doubt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Message History */}
              {messages.map((msg, idx) => {
                const prevUserMsg = [...messages.slice(0, idx)].reverse().find((m) => m.role === 'user');
                const retryText = prevUserMsg?.text || lastQuestion;

                return (
                  <MessageBubble
                    key={idx}
                    message={msg}
                    msgIndex={idx}
                    studentId={studentId}
                    onAcceptWalkthrough={() => handleSend('Yes, please walk me through the concept step by step.')}
                    onRetryQuestion={retryText ? () => handleSend(retryText) : null}
                  />
                );
              })}

              {/* Loading Indicator */}
              {loading && (
                <div
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 0' }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-purple-light)',
                      color: 'var(--color-purple)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Sparkles size={18} className="animate-float" />
                  </div>
                  <span style={{ fontSize: '0.92rem', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                    Tutor is retrieving verified syllabus citations and grounding explanation...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Suggested Prompts Strip (above input dock in Tab 1) */}
        {activeMode === 'ask_doubt' && messages.length > 0 && (
          <div
            style={{
              padding: '0.5rem 2rem',
              backgroundColor: 'var(--color-offwhite)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              overflowX: 'auto'
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
              💡 Follow-up:
            </span>
            {suggestedDoubts.map((doubt, dIdx) => (
              <button
                key={dIdx}
                type="button"
                onClick={() => handleSend(doubt)}
                style={{
                  fontSize: '0.78rem',
                  padding: '0.25rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-white)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-ink)',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {doubt}
              </button>
            ))}
          </div>
        )}

        {/* Bottom Chat Input Bar for Tab 1 */}
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
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask a doubt (e.g., 'Why does BST worst-case become O(n)?')..."
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '0.95rem 3.5rem 0.95rem 1.4rem',
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
                disabled={loading || !inputQuery.trim()}
                className="btn-orange btn-icon"
                style={{
                  position: 'absolute',
                  right: '6px',
                  width: '42px',
                  height: '42px',
                  opacity: loading || !inputQuery.trim() ? 0.4 : 1,
                  cursor: loading || !inputQuery.trim() ? 'not-allowed' : 'pointer'
                }}
                aria-label="Send Doubt"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
