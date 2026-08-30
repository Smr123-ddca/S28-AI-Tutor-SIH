import React, { useState } from 'react';
import { Check, X, CheckCircle2 } from 'lucide-react';
import { recordPracticeEvent } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSoundManager } from '../../services/soundManager';

export function PracticeQuestionCard({
  question,
  index,
  chunkId,
  studentId,
  className = ''
}) {
  const { session } = useAuth();
  const { playSound } = useSoundManager();
  const [recordedStatus, setRecordedStatus] = useState(null); // 'correct' | 'incorrect' | null
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (correct) => {
    setIsSubmitting(true);
    playSound(correct ? 'correct' : 'incorrect');
    try {
      await recordPracticeEvent({
        student_id: studentId || 'student-untracked',
        chunk_id: chunkId || 'chunk-untracked',
        correct,
        token: session?.access_token
      });
      setRecordedStatus(correct ? 'correct' : 'incorrect');
    } catch (e) {
      console.error('Feedback recording failed:', e);
      setRecordedStatus(correct ? 'correct' : 'incorrect');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`card-white ${className}`}
      style={{
        padding: '1.25rem',
        borderRadius: 'var(--radius-lg)',
        border: '1.5px solid var(--color-border)',
        backgroundColor: 'var(--color-white)',
        marginBottom: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}
    >
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-orange-subtle)',
            color: 'var(--color-orange)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: 700,
            flexShrink: 0
          }}
        >
          Q{index + 1}
        </div>
        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.45 }}>
          {question}
        </p>
      </div>

      {/* Action Self-Report Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.65rem' }}>
        {recordedStatus ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: recordedStatus === 'correct' ? 'var(--color-green)' : 'var(--color-red)',
              padding: '0.35rem 0.85rem',
              borderRadius: 'var(--radius-full)',
              backgroundColor: recordedStatus === 'correct' ? 'var(--color-green-light)' : 'var(--color-red-light)'
            }}
          >
            <CheckCircle2 size={16} />
            <span>
              {recordedStatus === 'correct' ? 'Marked Correct (+10 XP)' : 'Logged for Prerequisite Review'}
            </span>
          </div>
        ) : (
          <>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Self-check:</span>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleFeedback(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid #22c55e',
                color: '#15803d',
                backgroundColor: 'var(--color-green-light)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'transform var(--transition-fast)'
              }}
            >
              <Check size={14} /> Got it right
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleFeedback(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                border: '1.5px solid #ef4444',
                color: '#b91c1c',
                backgroundColor: 'var(--color-red-light)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'transform var(--transition-fast)'
              }}
            >
              <X size={14} /> Got it wrong
            </button>
          </>
        )}
      </div>
    </div>
  );
}
