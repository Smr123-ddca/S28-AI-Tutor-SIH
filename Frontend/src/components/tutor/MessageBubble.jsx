import React from 'react';
import { CitationChip } from './CitationChip';
import { PracticeQuestionCard } from './PracticeQuestionCard';
import { Pill } from '../common/Pill';
import { AlertCircle, Sparkles, ShieldCheck, RotateCw } from 'lucide-react';

/**
 * =====================================================================
 * [DOMAIN RESTRICTION & SYLLABUS SAFETY ARCHITECTURE NOTE]
 * =====================================================================
 * The frontend's responsibility is solely to faithfully render the backend's
 * `insufficient_evidence` and `guided_mode` states per the `/api/explain` contract.
 *
 * The actual syllabus-only anti-hallucination constraint is enforced on the
 * backend through vector retrieval cosine thresholds (< 0.30) and Gemini
 * system prompt boundary constraints. Client-side regexes or content blocks
 * are deliberately omitted to avoid deceptive pseudo-safety.
 * =====================================================================
 */

export function MessageBubble({
  message,
  msgIndex,
  studentId,
  onAcceptWalkthrough,
  onRetryQuestion,
  className = ''
}) {
  // User message
  if (message.role === 'user') {
    return (
      <div
        className={`message-user-row ${className}`}
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '1.5rem',
          width: '100%'
        }}
      >
        <div
          style={{
            maxWidth: '75%',
            backgroundColor: 'var(--color-user-bubble)',
            color: 'var(--color-user-bubble-text)',
            border: '1px solid var(--color-border)',
            padding: '1rem 1.4rem',
            borderRadius: '20px 20px 4px 20px',
            boxShadow: 'var(--shadow-sm)',
            fontSize: '0.96rem',
            lineHeight: 1.55,
            fontWeight: 500
          }}
        >
          {message.text || message.content}
        </div>
      </div>
    );
  }

  // Bot message states
  const { status, explanation_segments, practice_questions, results, addressed_gap, gap_section_label, message: botMessage } = message;

  return (
    <div
      className={`message-bot-row ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: '1.75rem',
        width: '100%'
      }}
    >
      <div
        className="card-white"
        style={{
          width: '100%',
          maxWidth: '850px',
          padding: '1.5rem',
          borderRadius: '22px',
          border: status === 'error' ? '1.5px solid #fecaca' : '1px solid var(--color-border)',
          backgroundColor: 'var(--color-white)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {/* State 1: Prerequisite Gap Alert Banner */}
        {addressed_gap && (
          <div
            style={{
              padding: '0.85rem 1.1rem',
              backgroundColor: 'var(--color-yellow-light)',
              border: '1.5px solid #fae39a',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}
          >
            <Sparkles size={18} style={{ color: 'var(--color-orange)', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-ink)' }}>
                Targeted Prerequisite Refresher Activated
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', marginTop: '0.15rem' }}>
                Grounding in: <strong>{gap_section_label || 'Foundational Invariant'}</strong>
              </div>
            </div>
          </div>
        )}

        {/* State 2: Insufficient Evidence */}
        {status === 'insufficient_evidence' && (
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--color-offwhite)',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <AlertCircle size={22} style={{ color: 'var(--color-orange)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
                  Outside Approved Syllabus Material
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {botMessage || "I don't have approved course material covering this topic in the syllabus."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State 3: Guided Learning Mode */}
        {status === 'guided_mode' && (
          <div
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--color-yellow-light)',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid #fde047',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <ShieldCheck size={22} style={{ color: 'var(--color-ink)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
                  Guided Learning Mode Activated
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {botMessage || "I can't give you the direct answer to what looks like a graded question, but I can help you understand the concept behind it. Would you like a walkthrough of the relevant concept instead?"}
                </div>
              </div>
            </div>
            {onAcceptWalkthrough && (
              <div style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={onAcceptWalkthrough}
                  className="btn btn-orange btn-sm"
                >
                  Yes, Walk Me Through The Concept →
                </button>
              </div>
            )}
          </div>
        )}

        {/* State 4: Error State with Retry Action */}
        {status === 'error' && (
          <div
            role="alert"
            style={{
              padding: '1.25rem',
              backgroundColor: 'var(--color-red-light)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #fca5a5',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
              <AlertCircle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#991b1b' }}>
                  Response Generation Failed
                </div>
                <div style={{ fontSize: '0.85rem', color: '#b91c1c', marginTop: '0.2rem', lineHeight: 1.5 }}>
                  {botMessage || 'Could not connect to AI Tutor backend service. Please check connection and try again.'}
                </div>
              </div>
            </div>
            {onRetryQuestion && (
              <div style={{ alignSelf: 'flex-start' }}>
                <button
                  type="button"
                  onClick={onRetryQuestion}
                  className="btn btn-outline btn-sm"
                  style={{
                    borderColor: '#fca5a5',
                    color: '#991b1b',
                    backgroundColor: 'var(--color-white)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <RotateCw size={14} /> Retry Question
                </button>
              </div>
            )}
          </div>
        )}

        {/* State 5: Answered State (Standard segmented explanations with citations) */}
        {status === 'answered' && (
          <div>
            {/* Explanation Segments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {explanation_segments && explanation_segments.length > 0 ? (
                explanation_segments.map((seg, segIdx) => (
                  <div
                    key={segIdx}
                    style={{
                      fontSize: '0.95rem',
                      lineHeight: 1.65,
                      color: 'var(--color-text-primary)'
                    }}
                  >
                    <span>{seg.text}</span>
                    {seg.source_chunk_id && (
                      <CitationChip
                        sourceChunkId={seg.source_chunk_id}
                        results={results || []}
                      />
                    )}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'var(--color-text-primary)' }}>
                  {botMessage || message.content}
                </div>
              )}
            </div>

            {/* Practice Questions Check Section */}
            {practice_questions && practice_questions.length > 0 && (
              <div
                style={{
                  marginTop: '1.5rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--color-border)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.85rem'
                  }}
                >
                  <Pill color="yellow" size="sm">
                    Practice Check
                  </Pill>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Test your understanding before moving forward:
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {practice_questions.map((pq, pqIdx) => {
                    const defaultChunkId = results && results.length > 0 ? results[0].id : 'chunk_bst_01';
                    return (
                      <PracticeQuestionCard
                        key={pqIdx}
                        question={pq}
                        index={pqIdx}
                        chunkId={defaultChunkId}
                        studentId={studentId}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
