import React from 'react';
import { CitationChip } from './CitationChip';
import { PracticeQuestionCard } from './PracticeQuestionCard';
import { Pill } from '../common/Pill';
import { AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';

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
  onSelectOption,
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
            backgroundColor: 'var(--color-ink)',
            color: '#ffffff',
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
  const { status, explanation_segments, practice_questions, results, addressed_gap, gap_section_label, is_coaching, message: botMessage } = message;

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
          border: '1px solid var(--color-border)',
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
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase' }}>
                Prerequisite Foundation Detected
              </div>
              <div style={{ fontSize: '0.88rem', color: '#713f12', lineHeight: 1.4, marginTop: '0.15rem' }}>
                Quickly covering <strong>{gap_section_label}</strong> first, since it is essential to understand this topic.
              </div>
            </div>
          </div>
        )}

        {/* State 2: Insufficient Evidence State (Distinct honest message) */}
        {status === 'insufficient_evidence' && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'var(--color-yellow-light)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--color-yellow)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}
          >
            <AlertCircle size={20} style={{ color: '#b45309', flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
                Not Covered in Approved Course Syllabus
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {botMessage || "I don't have approved course material covering this. To ensure academic rigor and avoid hallucinations, I can only explain concepts within your official curriculum."}
              </div>
            </div>
          </div>
        )}

        {/* State 3: Guided Mode State (Homework / Exam direct-answer safeguard) */}
        {status === 'guided_mode' && (
          <div
            style={{
              padding: '1.15rem',
              backgroundColor: 'var(--color-purple-light)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--color-purple)',
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

        {/* State 4: Error State */}
        {status === 'error' && (
          <div
            style={{
              padding: '0.85rem 1rem',
              backgroundColor: 'var(--color-red-light)',
              borderRadius: 'var(--radius-md)',
              color: '#b91c1c',
              fontSize: '0.9rem'
            }}
          >
            {botMessage || 'Unable to generate response. Please verify backend connection.'}
          </div>
        )}

        {/* State 6: Clarification State */}
        {status === 'clarification' && (
          <div
            style={{
              padding: '1.15rem',
              backgroundColor: 'var(--color-purple-light)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid #6366f1',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <Sparkles size={22} style={{ color: '#4f46e5', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '0.25rem' }}>
                  Clarification Required
                </div>
                <div style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {botMessage || "I'm not sure what you're referring to. Could you clarify your question?"}
                </div>
              </div>
            </div>
            {message.clarification?.options && message.clarification.options.length > 0 && onSelectOption && (
              <div style={{ alignSelf: 'flex-start', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {message.clarification.options.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => onSelectOption(opt)}
                    className="btn btn-outline btn-sm"
                    style={{ textAlign: 'left', height: 'auto', whiteSpace: 'normal', display: 'block' }}
                  >
                    "{opt}" ?
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* State 5: Answered State (Standard segmented explanations with citations) */}
        {status === 'answered' && (
          <div>
            {is_coaching && (
              <div
                style={{
                  padding: '0.85rem 1.1rem',
                  backgroundColor: 'var(--color-purple-light)',
                  border: '1.5px solid #d8b4fe',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.65rem'
                }}
              >
                <ShieldCheck size={18} style={{ color: '#7e22ce', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-ink)', textTransform: 'uppercase' }}>
                    Guided Coaching Mode
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#5b21b6', lineHeight: 1.4, marginTop: '0.15rem' }}>
                    I can't provide direct answers to graded problems, but I'll guide you step-by-step until you solve it.
                  </div>
                </div>
              </div>
            )}
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
