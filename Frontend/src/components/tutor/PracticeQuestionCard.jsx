import React, { useState } from 'react';
import { Check, X, CheckCircle2, AlertCircle, HelpCircle, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { submitPracticeAttempt, recordPracticeEvent } from '../../services/api';
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

  const isObj = typeof question === 'object' && question !== null;
  const questionText = isObj ? question.question : String(question || '');
  const conceptText = isObj ? question.concept : null;
  const questionId = isObj ? question.id : null;
  const hint1 = isObj ? question.hint_1 : null;
  const hint2 = isObj ? question.hint_2 : null;

  const [studentAnswer, setStudentAnswer] = useState('');
  const [evalResult, setEvalResult] = useState(null); // { evaluation: 'correct'|'partial'|'incorrect', reason: string }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(0); // 0 = none, 1 = hint1, 2 = hint2

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = studentAnswer.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (questionId) {
        // Submit directly to strict practice attempts API
        const data = await submitPracticeAttempt(questionId, trimmed, session?.access_token);
        const evalType = data.evaluation || 'incorrect';
        setEvalResult({
          evaluation: evalType,
          reason: data.reason || (evalType === 'correct' ? 'Great job! Your answer is factually correct.' : 'Your answer needs refinement.')
        });
        playSound(evalType === 'correct' ? 'correct' : 'incorrect');
      } else {
        // Instant strict local validation against expected_answer or fallback recording
        const expected = isObj && question.expected_answer ? question.expected_answer.trim() : null;
        let isCorrect = false;
        let reason = '';

        if (expected) {
          const normStudent = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
          const normExpected = expected.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normStudent.length > 0 && normStudent === normExpected) {
            isCorrect = true;
            reason = 'Spot on! Correct answer.';
          } else if (normStudent.length > 3 && (normExpected.includes(normStudent) || normStudent.includes(normExpected))) {
            isCorrect = true;
            reason = 'Good conceptual match!';
          } else {
            isCorrect = false;
            reason = `Expected concept: ${expected}`;
          }
        } else {
          // If no expected answer and no question ID, check basic length/clarity
          isCorrect = trimmed.length >= 8 && !/^[a-z]{1,5}$/i.test(trimmed);
          reason = isCorrect ? 'Answer recorded for concept practice.' : 'Please provide a more complete explanation.';
        }

        const evalType = isCorrect ? 'correct' : 'incorrect';
        setEvalResult({ evaluation: evalType, reason });
        playSound(isCorrect ? 'correct' : 'incorrect');

        await recordPracticeEvent({
          student_id: studentId || 'student-untracked',
          chunk_id: chunkId || 'chunk-untracked',
          correct: isCorrect,
          token: session?.access_token
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Answer evaluation error:', err);
      setEvalResult({
        evaluation: 'incorrect',
        reason: 'Unable to verify answer. Please check your answer and try again.'
      });
      playSound('incorrect');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setEvalResult(null);
    setStudentAnswer('');
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
      {/* Header & Question */}
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
        <div style={{ flex: 1 }}>
          {conceptText && (
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {conceptText}
            </div>
          )}
          <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-ink)', lineHeight: 1.45, margin: 0 }}>
            {questionText}
          </p>
        </div>
      </div>

      {/* Hints (if available) */}
      {(hint1 || hint2) && !evalResult && (
        <div style={{ fontSize: '0.82rem' }}>
          {showHint === 0 && (
            <button
              type="button"
              onClick={() => setShowHint(1)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-orange)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: 0
              }}
            >
              <HelpCircle size={14} /> Need a hint?
            </button>
          )}
          {showHint >= 1 && hint1 && (
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef3c7', borderRadius: '6px', color: '#92400e', marginBottom: '0.4rem' }}>
              💡 <b>Hint 1:</b> {hint1}
            </div>
          )}
          {showHint === 1 && hint2 && (
            <button
              type="button"
              onClick={() => setShowHint(2)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-orange)',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: 0
              }}
            >
              <HelpCircle size={14} /> Need another hint?
            </button>
          )}
          {showHint >= 2 && hint2 && (
            <div style={{ padding: '0.5rem 0.75rem', backgroundColor: '#fef3c7', borderRadius: '6px', color: '#92400e' }}>
              💡 <b>Hint 2:</b> {hint2}
            </div>
          )}
        </div>
      )}

      {/* Answer Input or Result Display */}
      {!evalResult ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="Type your answer here..."
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--color-border)',
                fontSize: '0.9rem',
                outline: 'none',
                backgroundColor: 'var(--color-offwhite)'
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting || !studentAnswer.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.55rem 1.1rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: studentAnswer.trim() ? 'var(--color-primary, #4f46e5)' : '#9ca3af',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: studentAnswer.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Checking...
                </>
              ) : (
                <>
                  Check <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {/* Evaluation Banner */}
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor:
                evalResult.evaluation === 'correct'
                  ? 'var(--color-green-light, #dcfce7)'
                  : evalResult.evaluation === 'partial'
                  ? '#fef3c7'
                  : 'var(--color-red-light, #fee2e2)',
              border: `1.5px solid ${
                evalResult.evaluation === 'correct'
                  ? '#86efac'
                  : evalResult.evaluation === 'partial'
                  ? '#fcd34d'
                  : '#fca5a5'
              }`,
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: evalResult.evaluation === 'correct' ? '#15803d' : evalResult.evaluation === 'partial' ? '#92400e' : '#b91c1c' }}>
                {evalResult.evaluation === 'correct' && <CheckCircle2 size={18} />}
                {evalResult.evaluation === 'partial' && <AlertCircle size={18} />}
                {evalResult.evaluation === 'incorrect' && <X size={18} />}
                <span>
                  {evalResult.evaluation === 'correct'
                    ? 'Correct! (+10 XP)'
                    : evalResult.evaluation === 'partial'
                    ? 'Partially Correct'
                    : 'Incorrect'}
                </span>
              </div>
              {evalResult.evaluation !== 'correct' && (
                <button
                  type="button"
                  onClick={handleRetry}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  <RefreshCw size={12} /> Try Again
                </button>
              )}
            </div>
            {evalResult.reason && (
              <div style={{ fontSize: '0.82rem', color: 'var(--color-ink)', lineHeight: 1.4 }}>
                {evalResult.reason}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
