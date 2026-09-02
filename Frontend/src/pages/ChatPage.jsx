import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Send,
  Plus,
  Edit2,
  Sparkles,
  Trash2
} from 'lucide-react';
import { MessageBubble } from '../components/tutor/MessageBubble';
import { ModeSelector } from '../components/tutor/ModeSelector';
import { HintSystem } from '../components/tutor/HintSystem';
import { Button } from '../components/common/Button';
import { useChatStream } from '../context/ChatStreamContext';

export function ChatPage() {
  const [searchParams] = useSearchParams();
  const {
    sessions,
    currentSessionId,
    currentSubject,
    setCurrentSubject,
    subjects,
    tutorState,
    studentId,
    activeMessages,
    isCurrentGenerating,
    selectSession,
    newChat,
    sendMessage,
    renameSession,
    deleteSession
  } = useChatStream();

  const [inputQuery, setInputQuery] = useState('');
  const [activeMode, setActiveMode] = useState('ask_doubt'); // 'ask_doubt' | 'practice_test' | 'study_plan'
  const messagesEndRef = useRef(null);

  // Handle URL deep links (?session_id=... or ?q=...)
  useEffect(() => {
    const sessionIdParam = searchParams.get('session_id');
    const queryParam = searchParams.get('q');
    const subjectParam = searchParams.get('subject') || searchParams.get('course');

    if (subjectParam && (!currentSubject || currentSubject !== subjectParam)) {
      setCurrentSubject(subjectParam);
    }

    if (sessionIdParam && sessionIdParam !== currentSessionId) {
      selectSession(sessionIdParam);
    } else if (queryParam) {
      setInputQuery(queryParam);
    }
  }, [searchParams, selectSession, currentSubject, setCurrentSubject, currentSessionId]);

  // Scroll to bottom when messages change or generation starts
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages, isCurrentGenerating]);

  const handleSend = (customText, originalVagueQuestion = null) => {
    const textToSend = customText || inputQuery;
    if (!textToSend.trim() || isCurrentGenerating) return;

    sendMessage({
      question: textToSend,
      customSubject: currentSubject,
      originalVagueQuestion
    });
    setInputQuery('');
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
          LEFT COLUMN: HISTORY SIDEBAR
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
            onClick={newChat}
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  deleteSession(s.id);
                }}
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
                  onClick={() => selectSession(s.id)}
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      renameSession(s.id, s.title);
                    }}
                    style={{
                      opacity: isCurrent ? 1 : 0.3,
                      color: 'var(--color-text-muted)',
                      padding: '0.2rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Rename"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(s.id);
                    }}
                    style={{
                      opacity: isCurrent ? 0.7 : 0.2,
                      color: '#dc2626',
                      padding: '0.2rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                    title="Delete session"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
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
        {/* INTERACTION PANE */}
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
              onSelectMode={(mode) => setActiveMode(mode)}
              hidePracticeTest={activeMessages.length === 0}
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
            {/* MODE 2: PRACTICE TEST */}
            {activeMode === 'practice_test' && (
              <HintSystem onComplete={() => setActiveMode('ask_doubt')} sessionId={currentSessionId} />
            )}

            {/* MODE 1: ASK A DOUBT */}
            {activeMode === 'ask_doubt' && (
              <>
                {activeMessages.length === 0 && !isCurrentGenerating && (
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
                        {subjects.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {activeMessages.map((msg, idx) => (
                  <MessageBubble
                    key={idx}
                    message={msg}
                    msgIndex={idx}
                    studentId={studentId}
                    onAcceptWalkthrough={() => handleSend('Yes, please walk me through the concept step by step.')}
                    onSelectOption={(option) => {
                      const originalQ = activeMessages[idx - 1]?.text || activeMessages[idx - 1]?.content;
                      handleSend(option, originalQ);
                    }}
                  />
                ))}

                {isCurrentGenerating && (
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
                      Tutor is retrieving syllabus material and generating grounded explanation...
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
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask a doubt (e.g., 'Why does BST worst-case become O(n)?')..."
                  disabled={isCurrentGenerating}
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
                  disabled={isCurrentGenerating || !inputQuery.trim() || !currentSubject}
                  className="btn-orange btn-icon"
                  style={{
                    position: 'absolute',
                    right: '6px',
                    width: '40px',
                    height: '40px',
                    opacity: isCurrentGenerating || !inputQuery.trim() || !currentSubject ? 0.4 : 1,
                    cursor: isCurrentGenerating || !inputQuery.trim() || !currentSubject ? 'not-allowed' : 'pointer'
                  }}
                  title={!currentSubject ? 'Please select a subject context in the new session screen.' : 'Send Doubt'}
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

export default ChatPage;
